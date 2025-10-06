import { pgTable, uuid, varchar, text, timestamp, integer, type PgTableWithColumns } from 'drizzle-orm/pg-core';
import { users } from './auth-schema';
import { z } from 'zod';

export const assets: PgTableWithColumns<any> = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploaderId: uuid('uploader_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  s3Bucket: varchar('s3_bucket', { length: 255 }).notNull(),
  s3Url: text('s3_url').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(), // 'video', 'image', 'document', etc.
  uploadStatus: varchar('upload_status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  metadata: text('metadata'), // JSON string for additional metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const createAssetSchema = z.object({
  uploaderId: z.string().uuid(),
  originalFileName: z.string().min(1).max(255),
  fileName: z.string().min(1).max(255),
  s3Key: z.string().min(1).max(500),
  s3Bucket: z.string().min(1).max(255),
  s3Url: z.string().url(),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
  fileType: z.enum(['video', 'image', 'document', 'audio', 'other']),
  uploadStatus: z.enum(['pending', 'processing', 'completed', 'failed']).default('completed'),
  metadata: z.string().optional(),
});

export const assetSearchSchema = z.object({
  fileType: z.enum(['video', 'image', 'document', 'audio', 'other']).optional(),
  uploadStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
