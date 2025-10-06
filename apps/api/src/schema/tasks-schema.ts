import { pgTable, uuid, varchar, text, timestamp, integer, boolean, type PgTableWithColumns } from 'drizzle-orm/pg-core';
import { users } from './auth-schema';
import { notes } from './notes-schema';
import { teams } from './teams-schema';
import { z } from 'zod';

// Task Stages (Columns in Kanban board)
export const taskStages: PgTableWithColumns<any> = pgTable('task_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  order: integer('order').notNull().default(0),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }), // Can be null for user-specific stages
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tasks
export const tasks: PgTableWithColumns<any> = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'), // low, medium, high
  statusId: uuid('status_id').references(() => taskStages.id, { onDelete: 'restrict' }).notNull(),
  notes: text('notes'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }), // Can be null for personal tasks
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tags
export const tags: PgTableWithColumns<any> = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }), // Can be null for personal tags
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Task Checklist Items
export const taskChecklistItems: PgTableWithColumns<any> = pgTable('task_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  text: varchar('text', { length: 255 }).notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Task Comments
export const taskComments: PgTableWithColumns<any> = pgTable('task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Junction Tables for Many-to-Many relationships

// Task Assignees
export const taskAssignees: PgTableWithColumns<any> = pgTable('task_assignees', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Task Tags
export const taskTags: PgTableWithColumns<any> = pgTable('task_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Task Linked Notes
export const taskLinkedNotes: PgTableWithColumns<any> = pgTable('task_linked_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zod Validation Schemas

export const createTaskStageSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateTaskStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const updateTaskStageOrderSchema = z.object({
  stage_ids: z.array(z.string().uuid()),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  status_id: z.string().uuid(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  assigned_to_ids: z.array(z.string().uuid()).optional().default([]),
  tag_ids: z.array(z.string().uuid()).optional().default([]),
  notes: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  linked_note_ids: z.array(z.string().uuid()).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status_id: z.string().uuid().optional(),
  assigned_to_ids: z.array(z.string().uuid()).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  is_completed: z.boolean().optional(),
  linked_note_ids: z.array(z.string().uuid()).optional(),
});

export const getTasksQuerySchema = z.object({
  assignee_id: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status_id: z.string().uuid().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export const createTaskCommentSchema = z.object({
  content: z.string().min(1),
});

export const updateChecklistItemSchema = z.object({
  text: z.string().min(1).max(255).optional(),
  is_completed: z.boolean().optional(),
});

// Type exports
export type TaskStage = typeof taskStages.$inferSelect;
export type NewTaskStage = typeof taskStages.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type TaskChecklistItem = typeof taskChecklistItems.$inferSelect;
export type NewTaskChecklistItem = typeof taskChecklistItems.$inferInsert;

export type TaskComment = typeof taskComments.$inferSelect;
export type NewTaskComment = typeof taskComments.$inferInsert;

export type TaskAssignee = typeof taskAssignees.$inferSelect;
export type NewTaskAssignee = typeof taskAssignees.$inferInsert;

export type TaskTag = typeof taskTags.$inferSelect;
export type NewTaskTag = typeof taskTags.$inferInsert;

export type TaskLinkedNote = typeof taskLinkedNotes.$inferSelect;
export type NewTaskLinkedNote = typeof taskLinkedNotes.$inferInsert;