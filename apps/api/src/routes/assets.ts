import { Router } from 'express';
import multer from 'multer';
import { uploadVideo, getAssets, getAsset, deleteAsset } from '../controllers/assets';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// Upload video
router.post('/upload/video', upload.single('video'), uploadVideo);

// Get all assets for authenticated user
router.get('/', getAssets);

// Get specific asset
router.get('/:id', getAsset);

// Delete asset
router.delete('/:id', deleteAsset);

export default router;