import { pgTable, uuid, varchar, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { users } from './auth-schema';
import { teams } from './teams-schema';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid('parent_id').references((): any => messages.id, { onDelete: 'set null' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 20 }).default('content').notNull(), // 'content', 'tool_call', 'tool_result'
  metadata: jsonb('metadata'), // Stores: model, reasoning, sources, tool_name, tool_args, tool_result, error
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zod schemas for validation
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(10000),
  model: z.enum(['o3-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini']),
  context: z.object({
    route: z.string().optional(),
    noteIds: z.array(z.string().uuid()).optional(),
    teamId: z.string().uuid().optional(),
    collectionId: z.string().uuid().optional(),
  }).optional(),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  teamId: z.string().uuid().optional(),
});

export const getConversationsSchema = z.object({
  teamId: z.string().uuid().optional(),
  limit: z
    .string()
    .optional()
    .default('50')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .default('0')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0)),
});

export const getMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  limit: z
    .string()
    .optional()
    .default('50')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(200)),
  offset: z
    .string()
    .optional()
    .default('0')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0)),
});

// Type exports
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// Additional types for API
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'content' | 'tool_call' | 'tool_result';

export interface MessageMetadata {
  model?: string;
  reasoning?: string;
  sources?: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  tool_name?: string;
  tool_args?: Record<string, any>;
  tool_result?: any;
  error?: string;
}

export interface ChatContext {
  route?: string;
  noteIds?: string[];
  teamId?: string;
  collectionId?: string;
}

export interface ConversationWithPreview extends Conversation {
  messageCount: number;
  lastMessagePreview: string;
}
