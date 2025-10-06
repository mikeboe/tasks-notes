import { Router } from 'express';
import multer from 'multer';
import { uploadFile, getAssets, getAsset, deleteAsset } from '../controllers/assets';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
  },
});

// All routes require authentication
router.use(authMiddleware);

// Upload file (images, videos, documents, etc.)
router.post('/upload', upload.single('file'), uploadFile);

// Get all assets for authenticated user
router.get('/', getAssets);

// Get specific asset
router.get('/:id', getAsset);

// Delete asset
router.delete('/:id', deleteAsset);

export default router;