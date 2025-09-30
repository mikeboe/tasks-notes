import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { search } from '../controllers/search';

const router = Router();

router.use(authMiddleware);

router.get('/', search);

export default router;