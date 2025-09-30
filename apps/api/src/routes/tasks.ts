import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { 
  getTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  getTaskById,
  addTaskComment,
  getAssignableUsers,
  getAssignedTasks
} from '../controllers/tasks';

const router = Router();

router.use(authMiddleware);

router.get('/', getTasks);
router.get('/assigned', getAssignedTasks);
router.get('/assignable-users', getAssignableUsers);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/comments', addTaskComment);

export default router;