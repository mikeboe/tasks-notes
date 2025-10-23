import { Router } from 'express';
import {
  createRecording,
  getRecordings,
  getRecording,
  getPublicRecording,
  updateRecording,
  deleteRecording,
  incrementViewCount,
} from '../controllers/recordings';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.get('/public/:shareToken', getPublicRecording);

// Authenticated routes
router.use(authMiddleware);

// Create a new recording
router.post('/', createRecording);

// Get all recordings for authenticated user
router.get('/', getRecordings);

// Get specific recording
router.get('/:id', getRecording);

// Update recording
router.patch('/:id', updateRecording);

// Delete recording
router.delete('/:id', deleteRecording);

// Increment view count
router.post('/:id/view', incrementViewCount);

export default router;
