import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getTags, createTag } from '../controllers/tags';

const router = Router();

router.use(authMiddleware);

router.get('/', getTags);
router.post('/', createTag);

export default router;