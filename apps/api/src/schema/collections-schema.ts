import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './auth-schema';
import { teams } from './teams-schema';
import { notes } from './notes-schema';
import { z } from 'zod';

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const collectionItems = pgTable('collection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),

  // Reference to existing note OR content-only item
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'cascade' }),

  // For uploaded documents/external content (when noteId is null)
  title: varchar('title', { length: 255 }),
  content: text('content'), // Extracted markdown content
  searchableContent: text('searchable_content'), // Plain text for search
  sourceType: varchar('source_type', { length: 50 }), // 'pdf', 'image', 'url', 'note'
  sourceUrl: text('source_url'), // Original URL if from web

  // Metadata
  metadata: text('metadata'), // JSON string for additional info

  // Embeddings status
  hasEmbeddings: boolean('has_embeddings').notNull().default(false),
  embeddingsGeneratedAt: timestamp('embeddings_generated_at'),
  embeddingsError: text('embeddings_error'),

  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const collectionTasks = pgTable('collection_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),

  taskType: varchar('task_type', { length: 50 }).notNull(), // 'summary', 'podcast', 'research', etc.
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'

  // Input/Output
  input: text('input'), // JSON string with task parameters
  result: text('result'), // JSON string with task results
  resultNoteId: uuid('result_note_id').references(() => notes.id, { onDelete: 'set null' }),

  error: text('error'),
  progress: integer('progress').default(0), // 0-100

  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

// Zod validation schemas
export const createCollectionSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const updateCollectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export const addCollectionItemSchema = z.object({
  noteId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  searchableContent: z.string().optional(),
  sourceType: z.enum(['pdf', 'image', 'url', 'note']),
  sourceUrl: z.string().optional(),
  metadata: z.string().optional(),
});

export const createCollectionTaskSchema = z.object({
  taskType: z.enum(['summary', 'podcast', 'research', 'common_themes', 'outline']),
  title: z.string().min(1).max(255),
  input: z.string().optional(),
});

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type NewCollectionItem = typeof collectionItems.$inferInsert;
export type CollectionTask = typeof collectionTasks.$inferSelect;
export type NewCollectionTask = typeof collectionTasks.$inferInsert;

// Constants
export const MAX_COLLECTION_ITEMS = 20;
