import mongoose from 'mongoose';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB Configuration
const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
connectDb();
// S3/MinIO Configuration
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000', // MinIO endpoint
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  s3ForcePathStyle: true, // Required for MinIO
  signatureVersion: 'v4',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// OpenRouter Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export { mongoose, s3, BUCKET_NAME, OPENROUTER_API_KEY, OPENROUTER_BASE_URL };
