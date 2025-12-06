import {
  s3,
  mongoose,
  BUCKET_NAME,
  OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL,
} from './config.js';
import Document from './dbModel.js';
import { uploadToS3, extractTextFromPDF, analyzeWithLLM } from './util.js';

export const statusCheck = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb:
        mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      s3: 'configured',
      openrouter: OPENROUTER_API_KEY ? 'configured' : 'not configured',
    },
  });
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a PDF file',
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 5MB',
      });
    }

    // Upload to S3/MinIO
    const storage = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Extract text from PDF
    let extractedText;
    try {
      extractedText = await extractTextFromPDF(req.file.buffer);
    } catch (error) {
      // Continue even if text extraction fails
      extractedText = null;
    }

    // Save document to database
    const document = new Document({
      filename: req.file.originalname,
      originalName: req.file.originalname,
      filesize: req.file.size,
      mimeType: req.file.mimetype,
      storageKey: storage.key,
      storageUrl: storage.url,
      extractedText: extractedText,
      status: extractedText ? 'text_extracted' : 'uploaded',
    });

    await document.save();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document._id,
        filename: document.filename,
        filesize: document.filesize,
        storageUrl: document.storageUrl,
        status: document.status,
        uploadedAt: document.uploadedAt,
        hasText: !!extractedText,
      },
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
};

export const analyzeDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `No document found with ID: ${req.params.id}`,
      });
    }

    if (!document.extractedText) {
      return res.status(400).json({
        error: 'No text extracted',
        message: 'Document text extraction failed or is pending',
      });
    }

    if (document.status === 'analyzed') {
      return res.status(200).json({
        success: true,
        message: 'Document already analyzed',
        document: {
          id: document._id,
          filename: document.filename,
          status: document.status,
          analysis: document.analysis,
        },
      });
    }

    // Update status to analyzing
    document.status = 'analyzing';
    await document.save();

    try {
      // Analyze with LLM
      const analysis = await analyzeWithLLM(document.extractedText);

      // Update document with analysis
      document.analysis = {
        summary: analysis.summary,
        documentType: analysis.documentType,
        metadata: analysis.metadata,
        analyzedAt: new Date(),
      };
      document.status = 'analyzed';
      document.updatedAt = new Date();
      await document.save();

      res.status(200).json({
        success: true,
        message: 'Document analyzed successfully',
        document: {
          id: document._id,
          filename: document.filename,
          status: document.status,
          analysis: document.analysis,
        },
      });
    } catch (analysisError) {
      // Mark as failed if analysis fails
      document.status = 'failed';
      await document.save();
      throw analysisError;
    }
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
    });
  }
};

export const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `No document found with ID: ${req.params.id}`,
      });
    }

    // Build response with all document data
    const response = {
      id: document._id,
      filename: document.filename,
      filesize: document.filesize,
      mimeType: document.mimeType,
      storageUrl: document.storageUrl,
      status: document.status,
      uploadedAt: document.uploadedAt,
      updatedAt: document.updatedAt,
      extractedText: document.extractedText,
      analysis: document.analysis || null,
    };

    res.status(200).json({
      success: true,
      document: response,
    });
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({
      error: 'Failed to fetch document',
      message: error.message,
    });
  }
};

export const listDocuments = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const query = status ? { status } : {};

    const documents = await Document.find(query)
      .sort({ uploadedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('-extractedText'); // Exclude text for list view

    const total = await Document.countDocuments(query);

    res.status(200).json({
      success: true,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      documents: documents.map((doc) => ({
        id: doc._id,
        filename: doc.filename,
        filesize: doc.filesize,
        status: doc.status,
        documentType: doc.analysis?.documentType,
        uploadedAt: doc.uploadedAt,
        analyzedAt: doc.analysis?.analyzedAt,
      })),
    });
  } catch (error) {
    console.error('List Error:', error);
    res.status(500).json({
      error: 'Failed to fetch documents',
      message: error.message,
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `No document found with ID: ${req.params.id}`,
      });
    }

    // Delete from S3/MinIO
    try {
      await s3
        .deleteObject({
          Bucket: BUCKET_NAME,
          Key: document.storageKey,
        })
        .promise();
    } catch (s3Error) {
      console.error('S3 Delete Error:', s3Error);
      // Continue even if S3 delete fails
    }

    // Delete from database
    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({
      error: 'Failed to delete document',
      message: error.message,
    });
  }
};
