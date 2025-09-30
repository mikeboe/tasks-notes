import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { 
  getTaskStages, 
  createTaskStage, 
  updateTaskStageOrder, 
  updateTaskStage, 
  deleteTaskStage 
} from '../controllers/task-stages';

const router = Router();

router.use(authMiddleware);

router.get('/', getTaskStages);
router.post('/', createTaskStage);
router.put('/order', updateTaskStageOrder);
router.put('/:id', updateTaskStage);
router.delete('/:id', deleteTaskStage);

export default router;