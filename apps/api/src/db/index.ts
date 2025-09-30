import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as authSchema from '../schema/auth-schema';
import * as notesSchema from '../schema/notes-schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = { ...authSchema, ...notesSchema };
export const db = drizzle(pool, { schema });