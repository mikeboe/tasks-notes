import { Router } from 'express';
import {
  createCollection,
  getCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addCollectionItem,
  removeCollectionItem,
  generateItemEmbeddings,
  getItemEmbeddingsStatus,
  createTask,
  getTasks,
  getTask,
  deleteTask,
} from '../controllers/collections-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Collections CRUD
router.post('/', createCollection);
router.get('/', getCollections);
router.get('/:id', getCollection);
router.patch('/:id', updateCollection);
router.delete('/:id', deleteCollection);

// Collection Items
router.post('/:id/items', addCollectionItem);
router.delete('/:id/items/:itemId', removeCollectionItem);
router.post('/:id/items/:itemId/embeddings', generateItemEmbeddings);
router.get('/:id/items/:itemId/embeddings/status', getItemEmbeddingsStatus);

// Collection Tasks
router.post('/:id/tasks', createTask);
router.get('/:id/tasks', getTasks);
router.get('/:id/tasks/:taskId', getTask);
router.delete('/:id/tasks/:taskId', deleteTask);

export default router;
