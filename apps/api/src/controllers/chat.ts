import { Request, Response } from 'express';
import { chatService } from '../services/chat-service';
import {
  sendMessageSchema,
  createConversationSchema,
  getConversationsSchema,
  getMessagesSchema,
} from '../schema/chat-schema';
import { z } from 'zod';

/**
 * POST /api/chat/ask
 * Simple Q&A mode (no tools, direct LLM)
 */
export const sendAskMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate request body
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: validation.error.errors,
      });
    }

    const { conversationId, message, model, context } = validation.data;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Stream response
    await chatService.streamAskResponse(
      req.user.id,
      conversationId || null,
      message,
      model,
      context,
      res
    );
  } catch (error) {
    console.error('Error in sendAskMessage:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Internal server error' })}\n\n`);
      res.end();
    }
  }
};

/**
 * POST /api/chat/agent
 * Agent mode with tool calling
 */
export const sendAgentMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate request body
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: validation.error.errors,
      });
    }

    const { conversationId, message, model, context } = validation.data;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Stream response
    await chatService.streamAgentResponse(
      req.user.id,
      conversationId || null,
      message,
      model,
      context,
      res
    );
  } catch (error) {
    console.error('Error in sendAgentMessage:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Internal server error' })}\n\n`);
      res.end();
    }
  }
};

/**
 * GET /api/chat/conversations
 * Get all conversations for user
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate query params
    const validation = getConversationsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validation.error.errors,
      });
    }

    const { teamId, limit, offset } = validation.data;

    const result = await chatService.getConversations(
      req.user.id,
      teamId || null,
      limit,
      offset
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in getConversations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * GET /api/chat/conversations/:id
 * Get a specific conversation with messages
 */
export const getConversation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const conversationId = req.params.id;

    // Validate UUID
    if (!z.string().uuid().safeParse(conversationId).success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const result = await chatService.getConversation(conversationId, req.user.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in getConversation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * POST /api/chat/conversations
 * Create a new conversation
 */
export const createConversation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate request body
    const validation = createConversationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: validation.error.errors,
      });
    }

    const { title, teamId } = validation.data;

    const conversation = await chatService.createConversation(
      req.user.id,
      teamId || null,
      title
    );

    res.status(201).json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    console.error('Error in createConversation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation
 */
export const deleteConversation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const conversationId = req.params.id;

    // Validate UUID
    if (!z.string().uuid().safeParse(conversationId).success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const deleted = await chatService.deleteConversation(conversationId, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted',
    });
  } catch (error) {
    console.error('Error in deleteConversation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * GET /api/chat/conversations/:id/messages
 * Get messages for a conversation (paginated)
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const conversationId = req.params.id;

    // Validate UUID
    if (!z.string().uuid().safeParse(conversationId).success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    // Validate query params
    const validation = getMessagesSchema.safeParse({
      conversationId,
      ...req.query,
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validation.error.errors,
      });
    }

    const { limit, offset } = validation.data;

    const result = await chatService.getMessages(
      conversationId,
      req.user.id,
      limit,
      offset
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in getMessages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      return res.status(404).json({
        success: false,
        message: errorMessage,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
