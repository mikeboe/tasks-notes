import { Response } from 'express';
import { db } from '../db';
import { conversations, messages, Conversation, Message, MessageRole, MessageType, MessageMetadata, ChatContext } from '../schema/chat-schema';
import { notes } from '../schema/notes-schema';
import { LlmModelName, useLlm } from '../agent/llm/llm';
import { createDeepAgent } from 'deepagents';
import {
  createGetNoteByIdTool,
  createSearchNotesTool,
  createListNotesTool,
  createGetNotesByTagTool,
  createGetRecentNotesTool,
  createGetNoteHierarchyTool,
} from '../agent/tools/notes-tools';
import { createSearchCollectionTool } from '../agent/tools/collection-tools';
import { eq, and, desc, sql } from 'drizzle-orm';
import { HumanMessage, AIMessage } from 'langchain';
import { agentPrompt } from '../agent/prompt';
import { internetSearchTool } from '../agent/tools';

export class ChatService {
  /**
   * Stream an "ask" mode response (direct LLM, no tools)
   */
  async streamAskResponse(
    userId: string,
    conversationId: string | null,
    message: string,
    model: LlmModelName,
    context: ChatContext | undefined,
    res: Response
  ): Promise<void> {
    let conversation: Conversation;

    try {
      // Create or load conversation
      if (!conversationId) {
        conversation = await this.createConversation(userId, context?.teamId || null);
        // Send conversation ID first
        res.write(`data: ${JSON.stringify({ type: 'conversation', conversationId: conversation.id })}\n\n`);
      } else {
        const conv = await this.getConversationById(conversationId, userId);
        if (!conv) {
          throw new Error('Conversation not found');
        }
        conversation = conv;
      }

      // Fetch context notes if provided
      let contextContent = '';
      if (context?.noteIds && context.noteIds.length > 0) {
        const contextNotes = await db
          .select()
          .from(notes)
          .where(sql`${notes.id} = ANY(${context.noteIds})`);

        if (contextNotes.length > 0) {
          contextContent = '\n\nContext notes:\n\n';
          for (const note of contextNotes) {
            contextContent += `### ${note.title}\n${note.searchableContent || note.content || ''}\n\n`;
          }
        }
      }

      // Build conversation history
      const history = await this.getConversationHistory(conversation.id);
      const chatHistory = history.map((msg) => {
        if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else {
          return new AIMessage(msg.content);
        }
      });

      // Save user message
      const userMessageOrder = await this.getNextMessageOrder(conversation.id);
      await this.saveMessage(
        conversation.id,
        'user',
        message,
        'content',
        {},
        userMessageOrder
      );

      // Prepare prompt
      const fullPrompt = `${message}${contextContent}`;

      // Get LLM
      const llm = useLlm(model);

      // Stream response
      let assistantResponse = '';
      const stream = await llm.stream([...chatHistory, new HumanMessage(fullPrompt)]);

      for await (const chunk of stream) {
        const content = chunk.content as string;
        if (content) {
          assistantResponse += content;
          res.write(`data: ${JSON.stringify({ type: 'content', delta: content })}\n\n`);
        }
      }

      // Save assistant message
      const assistantMessageOrder = await this.getNextMessageOrder(conversation.id);
      await this.saveMessage(
        conversation.id,
        'assistant',
        assistantResponse,
        'content',
        { model },
        assistantMessageOrder
      );

      // Auto-generate title if this is the first exchange
      if (!conversation.title) {
        await this.updateConversationTitle(conversation.id, message);
      }

      // Send done event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Error in streamAskResponse:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
      res.end();
    }
  }

  /**
   * Stream an "agent" mode response (with tool calling)
   */
  async streamAgentResponse(
    userId: string,
    conversationId: string | null,
    message: string,
    model: LlmModelName,
    context: ChatContext | undefined,
    res: Response
  ): Promise<void> {
    let conversation: Conversation;

    try {
      // Create or load conversation
      if (!conversationId) {
        conversation = await this.createConversation(userId, context?.teamId || null);
        res.write(`data: ${JSON.stringify({ type: 'conversation', conversationId: conversation.id })}\n\n`);
      } else {
        const conv = await this.getConversationById(conversationId, userId);
        if (!conv) {
          throw new Error('Conversation not found');
        }
        conversation = conv;
      }

      // Fetch context notes if provided
      let contextContent = '';
      if (context?.noteIds && context.noteIds.length > 0) {
        const contextNotes = await db
          .select()
          .from(notes)
          .where(sql`${notes.id} = ANY(${context.noteIds})`);

        if (contextNotes.length > 0) {
          contextContent = '\n\nContext notes:\n\n';
          for (const note of contextNotes) {
            contextContent += `### ${note.title}\n${note.searchableContent || note.content || ''}\n\n`;
          }
        }
      }

      // Add current route context
      let routeContext = '';
      if (context?.route) {
        routeContext = `\n\nUser is currently viewing: ${context.route}\n`;
      }

      // Save user message
      const userMessageOrder = await this.getNextMessageOrder(conversation.id);
      await this.saveMessage(
        conversation.id,
        'user',
        message,
        'content',
        {},
        userMessageOrder
      );

      // Create agent with notes tools
      const toolContext = { userId, teamId: context?.teamId };

      // Build tools array - add collection tool if in collection context
      const tools: any[] = [
        createGetNoteByIdTool(toolContext),
        createSearchNotesTool(toolContext),
        createListNotesTool(toolContext),
        createGetNotesByTagTool(toolContext),
        createGetRecentNotesTool(toolContext),
        createGetNoteHierarchyTool(toolContext),
        internetSearchTool,
      ];

      let collectionPrompt = '';
      if (context?.collectionId) {
        // Add collection search tool
        tools.push(createSearchCollectionTool({
          ...toolContext,
          collectionId: context.collectionId,
        }));
        collectionPrompt = `\n\nYou are currently in a COLLECTION context. Use the search_collection tool to search within this specific collection's content using semantic/vector search. This tool will find the most relevant content chunks based on the user's query.\n`;
      }

      let prompt = agentPrompt

      prompt += `### Additional Context
${routeContext}${collectionPrompt}`

      const agent = createDeepAgent({
        tools,
        // @ts-ignore incomplete types
        model: useLlm(model),
        systemPrompt: prompt
      });
      // Build conversation history
      const history = await this.getConversationHistory(conversation.id);
      const chatHistory = history
        .filter(msg => msg.messageType === 'content')
        .map((msg) => {
          if (msg.role === 'user') {
            return new HumanMessage(msg.content);
          } else {
            return new AIMessage(msg.content);
          }
        });

      // Stream agent response
      let assistantResponse = '';
      let currentMessageOrder = await this.getNextMessageOrder(conversation.id);
      const sources: Array<{ id: string; title: string; type: string }> = [];

      // Track tool calls and their results
      const toolCallsMap = new Map<string, { name: string; args: any; result?: string }>();

      const stream = await agent.stream({
        messages: [...chatHistory, new HumanMessage(message)],
      }, {
        streamMode: "messages"
      });

      for await (const event of stream) {
        // Handle different event types from the agent
        // console.log('Agent event:', event);

        // With streamMode: "messages", events are [message, metadata] tuples
        if (Array.isArray(event) && event.length === 2) {
          const [message, metadata] = event;

          // Handle AI message chunks (content streaming)
          if (message && typeof message === 'object' && 'content' in message) {
            const content = message.content;

            // Check if this is a ToolMessage (tool result) - don't stream as content
            const isToolMessage = message.constructor?.name === 'ToolMessage' || (metadata && metadata.langgraph_node === 'tools');

            // Stream content chunks (but NOT for tool messages)
            if (!isToolMessage && content && typeof content === 'string' && content.length > 0) {
              assistantResponse += content;
              res.write(`data: ${JSON.stringify({ type: 'content', delta: content })}\n\n`);
            }

            // Handle tool call chunks
            if (message.tool_call_chunks && Array.isArray(message.tool_call_chunks) && message.tool_call_chunks.length > 0) {
              for (const toolCallChunk of message.tool_call_chunks) {
                if (toolCallChunk.name) {
                  // Stream tool call initiation
                  res.write(`data: ${JSON.stringify({
                    type: 'tool_call_start',
                    name: toolCallChunk.name,
                    id: toolCallChunk.id,
                  })}\n\n`);
                }
              }
            }

            // Handle complete tool calls (when fully assembled)
            if (message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
              for (const toolCall of message.tool_calls) {
                // Stream complete tool call info
                res.write(`data: ${JSON.stringify({
                  type: 'tool_call',
                  name: toolCall.name,
                  args: toolCall.args,
                  id: toolCall.id,
                })}\n\n`);

                // Track tool call
                toolCallsMap.set(toolCall.id || toolCall.name, {
                  name: toolCall.name,
                  args: toolCall.args,
                });
              }
            }

            // Handle tool results (ToolMessage type)
            if (message.constructor?.name === 'ToolMessage' || (metadata && metadata.langgraph_node === 'tools')) {
              const toolContent = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
              const toolName = message.name || 'unknown';

              // Stream tool result (for debugging/logging in frontend console)
              res.write(`data: ${JSON.stringify({
                type: 'tool_result',
                name: toolName,
                result: toolContent,
              })}\n\n`);

              // Store result with the corresponding tool call
              // Try to find by tool_call_id first, then by name
              const toolCallId = (message as any).tool_call_id;
              let toolCall = toolCallId ? toolCallsMap.get(toolCallId) : null;

              if (!toolCall) {
                // Fallback: find by name
                for (const tc of toolCallsMap.values()) {
                  if (tc.name === toolName && !tc.result) {
                    toolCall = tc;
                    break;
                  }
                }
              }

              if (toolCall) {
                toolCall.result = toolContent;
              }

              // Extract note IDs from tool results for sources
              if (toolName && toolName.includes('note')) {
                // Try to extract note IDs from the result
                const noteIdMatches = toolContent.match(/ID: ([a-f0-9-]{36})/gi);
                if (noteIdMatches) {
                  for (const match of noteIdMatches) {
                    const id = match.replace('ID: ', '');
                    const titleMatch = toolContent.match(new RegExp(`##? ([^\\n]+)\\n.*ID: ${id}`, 'i'));
                    if (titleMatch) {
                      sources.push({ id, title: titleMatch[1].trim(), type: 'note' });
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Save all tool calls with their results as individual messages
      for (const toolCall of toolCallsMap.values()) {
        await this.saveMessage(
          conversation.id,
          'assistant',
          `Tool: ${toolCall.name}`,
          'tool_call',
          {
            tool_name: toolCall.name,
            tool_args: toolCall.args,
            tool_result: toolCall.result,
          },
          currentMessageOrder++
        );
      }

      // Save final assistant message
      const metadata: MessageMetadata = {
        model,
        sources: sources.length > 0 ? sources : undefined,
      };

      await this.saveMessage(
        conversation.id,
        'assistant',
        assistantResponse,
        'content',
        metadata,
        currentMessageOrder
      );

      // Send sources if any
      if (sources.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
      }

      // Auto-generate title if this is the first exchange
      if (!conversation.title) {
        await this.updateConversationTitle(conversation.id, message);
      }

      // Send done event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Error in streamAgentResponse:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
      res.end();
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, teamId: string | null, title?: string): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
        teamId,
        title,
      })
      .returning();

    return conversation;
  }

  /**
   * Get conversation by ID with access check
   */
  async getConversationById(conversationId: string, userId: string): Promise<Conversation | null> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);

    return conversation || null;
  }

  /**
   * Get conversations for a user
   */
  async getConversations(
    userId: string,
    teamId: string | null,
    limit: number,
    offset: number
  ): Promise<{ conversations: any[]; total: number }> {
    const whereConditions = [eq(conversations.userId, userId)];

    if (teamId) {
      whereConditions.push(eq(conversations.teamId, teamId));
    } else {
      whereConditions.push(sql`${conversations.teamId} IS NULL`);
    }

    // Get conversations with message count and preview
    const results = await db
      .select({
        id: conversations.id,
        userId: conversations.userId,
        teamId: conversations.teamId,
        title: conversations.title,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        messageCount: sql<number>`COUNT(${messages.id})`.as('message_count'),
        lastMessagePreview: sql<string>`
          COALESCE(
            (SELECT ${messages.content} FROM ${messages}
             WHERE ${messages.conversationId} = ${conversations.id}
             AND ${messages.messageType} = 'content'
             ORDER BY ${messages.order} DESC LIMIT 1),
            ''
          )
        `.as('last_message_preview'),
      })
      .from(conversations)
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(and(...whereConditions))
      .groupBy(conversations.id)
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(conversations)
      .where(and(...whereConditions));

    return {
      conversations: results,
      total: Number(count),
    };
  }

  /**
   * Get conversation with messages
   */
  async getConversation(conversationId: string, userId: string): Promise<{ conversation: Conversation; messages: Message[] } | null> {
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) {
      return null;
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.order);

    return {
      conversation,
      messages: conversationMessages,
    };
  }

  /**
   * Get conversation history for context
   */
  async getConversationHistory(conversationId: string, limit = 20): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.order)
      .limit(limit);
  }

  /**
   * Get next message order number
   */
  async getNextMessageOrder(conversationId: string): Promise<number> {
    const [result] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${messages.order}), -1)` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    return (result?.maxOrder ?? -1) + 1;
  }

  /**
   * Save a message
   */
  async saveMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    messageType: MessageType,
    metadata: MessageMetadata,
    order: number,
    parentId?: string
  ): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        parentId,
        role,
        content,
        messageType,
        metadata,
        order,
      })
      .returning();

    // Update conversation updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return message;
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Auto-generate conversation title from first message
   */
  async updateConversationTitle(conversationId: string, firstMessage: string): Promise<void> {
    // Create a simple title from the first message (max 50 chars)
    let title = firstMessage.substring(0, 50);
    if (firstMessage.length > 50) {
      title += '...';
    }

    await db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  /**
   * Get messages for a conversation (paginated)
   */
  async getMessages(
    conversationId: string,
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    // Verify access
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    const total = Number(count);

    // Get messages
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.order)
      .limit(limit)
      .offset(offset);

    return {
      messages: conversationMessages,
      total,
      hasMore: offset + limit < total,
    };
  }
}

export const chatService = new ChatService();
