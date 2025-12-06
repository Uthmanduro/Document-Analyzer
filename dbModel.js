import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  filesize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  storageKey: { type: String, required: true },
  storageUrl: { type: String, required: true },
  extractedText: { type: String },
  status: {
    type: String,
    enum: ['uploaded', 'text_extracted', 'analyzing', 'analyzed', 'failed'],
    default: 'uploaded',
  },
  analysis: {
    summary: String,
    documentType: String,
    metadata: mongoose.Schema.Types.Mixed,
    analyzedAt: Date,
  },
  uploadedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Document = mongoose.model('Document', documentSchema);

export default Document;
