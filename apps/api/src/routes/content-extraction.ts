import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { extractContent } from '../controllers/content-extraction';

const router = Router();

// Configure multer for file uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDFs and images
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'));
    }
  },
});

router.use(authMiddleware);

// Single route for content extraction
// Accepts both URL (via body) and file upload (via multipart)
router.post('/extract', upload.single('file'), extractContent);

export default router;
