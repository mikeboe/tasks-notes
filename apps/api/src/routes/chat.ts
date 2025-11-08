import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  sendAskMessage,
  sendAgentMessage,
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  getMessages,
} from '../controllers/chat';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

// Chat message routes
router.post('/ask', sendAskMessage);
router.post('/agent', sendAgentMessage);

// Conversation management routes
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);
router.get('/conversations/:id/messages', getMessages);

export default router;
