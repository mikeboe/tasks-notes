import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '.';
import { taskStages } from '../schema/tasks-schema';
import { eq } from 'drizzle-orm';
import path from 'path';

export const runMigrations = async () => {
    console.log("Running migrations...");
    try {
        // Use absolute path for Docker compatibility
        // In Docker: /app/src/db/drizzle
        // In development: ./src/db/drizzle (relative to project root)
        const migrationsFolder = process.env.NODE_ENV === 'production'
            ? '/app/src/db/drizzle'
            : path.join(process.cwd(), 'src/db/drizzle');

        console.log(`Migration folder: ${migrationsFolder}`);
        await migrate(db, { migrationsFolder });
        await createTaskStages();
        console.log("Migrations completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

const createTaskStages = async () => {
    const stages = [
        { name: 'To Do', order: 1 },
        { name: 'In Progress', order: 2 },
        { name: 'Completed', order: 3 },
    ];

    for (const stage of stages) {
        const existing = await db.select().from(taskStages).where(eq(taskStages.name, stage.name));
        if (existing.length === 0) {
            await db.insert(taskStages).values(stage);
        }
    }
}