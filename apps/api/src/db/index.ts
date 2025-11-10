import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as authSchema from '../schema/auth-schema';
import * as notesSchema from '../schema/notes-schema';
import * as teamsSchema from '../schema/teams-schema';
import * as assetsSchema from '../schema/assets-schema';
import * as recordingsSchema from '../schema/recordings-schema';
import * as chatSchema from '../schema/chat-schema';
import * as collectionsSchema from '../schema/collections-schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = { ...authSchema, ...notesSchema, ...teamsSchema, ...assetsSchema, ...recordingsSchema, ...chatSchema, ...collectionsSchema };
export const db = drizzle(pool, { schema });