import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './auth-schema';
import { assets } from './assets-schema';
import { teams } from './teams-schema';
import { z } from 'zod';

export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration').notNull(), // Duration in seconds
  isPublic: boolean('is_public').default(false).notNull(),
  shareToken: varchar('share_token', { length: 255 }).unique(),
  settings: jsonb('settings'), // Recording settings: webcam position, shape, audio/video enabled
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Recording settings type
const recordingSettingsSchema = z.object({
  hasWebcam: z.boolean().default(false),
  webcamPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
  webcamShape: z.enum(['circle', 'rounded']).optional(),
  hasMicrophone: z.boolean().default(false),
  hasSystemAudio: z.boolean().default(false),
});

// Schema for creating a recording (from request body - userId comes from auth)
export const createRecordingRequestSchema = z.object({
  assetId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  duration: z.number().int().positive(),
  isPublic: z.boolean().default(false),
  settings: recordingSettingsSchema.optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
});

// Schema for creating a recording in the database (includes userId)
export const createRecordingSchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid().optional().nullable(),
  assetId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  duration: z.number().int().positive(),
  isPublic: z.boolean().default(false),
  shareToken: z.string().max(255).optional().nullable(),
  settings: recordingSettingsSchema.optional().nullable(),
});

export const updateRecordingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  isPublic: z.boolean().optional(),
  settings: recordingSettingsSchema.optional().nullable(),
});

export const recordingSearchSchema = z.object({
  teamId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;
export type RecordingSettings = z.infer<typeof recordingSettingsSchema>;
