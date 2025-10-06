
import { pgTable, uuid, varchar, text, timestamp, integer, boolean, type PgTableWithColumns, unique } from 'drizzle-orm/pg-core';
import { users } from './auth-schema';
import { teams } from './teams-schema';
import { z } from 'zod';

export const notes: PgTableWithColumns<any> = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  searchableContent: text('searchable_content'), // Plain text version for searching
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references(() => notes.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userNoteUnique: unique().on(table.userId, table.noteId),
}));


export const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  parentId: z.string().uuid().optional(),
  order: z.number().int().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  parentId: z.string().uuid().optional(),
  order: z.number().int().optional(),
});

export const reorderNoteSchema = z.object({
  order: z.number().int(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
