import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as authSchema from '../schema/auth-schema';
import * as notesSchema from '../schema/notes-schema';
import * as teamsSchema from '../schema/teams-schema';
import * as assetsSchema from '../schema/assets-schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = { ...authSchema, ...notesSchema, ...teamsSchema, ...assetsSchema };
export const db = drizzle(pool, { schema });