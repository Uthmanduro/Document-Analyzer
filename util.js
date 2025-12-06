// import * as pdfParse from 'pdf-parse';
import axios from 'axios';
import {
  BUCKET_NAME,
  s3,
  OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL,
} from './config.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Upload file to S3/MinIO
export async function uploadToS3(buffer, filename, mimeType) {
  const key = `documents/${Date.now()}-${filename}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'private',
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      key: key,
      url: result.Location,
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to storage');
  }
}

// Extract text from PDF
export async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF Parsing Error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Analyze document with OpenRouter LLM
export async function analyzeWithLLM(text) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const prompt = `You are a document analysis expert. Analyze the provided document and return a JSON object with:
1. summary: A concise 2-3 sentence summary
2. documentType: The type (invoice, cv, resume, report, letter, contract, proposal, memo, etc.)
3. metadata: An object with extracted information such as:
   - date: any dates found
   - sender: sender/from information
   - recipient: recipient/to information
   - totalAmount: any monetary amounts
   - dueDate: due dates if applicable
   - invoiceNumber: invoice/document numbers
   - company: company names
   - email: email addresses
   - phone: phone numbers
   - any other relevant fields based on document type

Return ONLY valid JSON, no markdown or explanation.`;

  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `Analyze this document:\n\n${text.substring(0, 10000)}`, // Limit to 10k chars
          },
        ],
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Document Analyzer API',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('LLM Analysis Error:', error.response?.data || error.message);
    throw new Error('Failed to analyze document with LLM');
  }
}
