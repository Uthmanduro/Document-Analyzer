import express from 'express';
import router from './routes.js';

const app = express();
app.use(express.json());

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 5MB',
      });
    }
  }

  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
});

app.use('/api', router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Document Analyzer API running on port ${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST   /documents/upload`);
  console.log(`   POST   /documents/:id/analyze`);
  console.log(`   GET    /documents/:id`);
  console.log(`   GET    /documents`);
  console.log(`   DELETE /documents/:id`);
  console.log(`   GET    /health`);
});

// module.exports = app;
