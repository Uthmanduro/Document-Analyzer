import { Router } from 'express';
import {
  statusCheck,
  uploadDocument,
  analyzeDocument,
  getDocument,
  listDocuments,
  deleteDocument,
} from './fileController.js';
import upload from './multer.js';

const router = Router();

router.get('/health', statusCheck);

router.post('/documents/upload', upload.single('file'), uploadDocument);
router.post('/documents/:id/analyze', analyzeDocument);
router.get('/documents/:id', getDocument);
router.get('/documents', listDocuments);
router.delete('/documents/:id', deleteDocument);

export default router;
