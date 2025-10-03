import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '.';
import { taskStages } from '../schema/tasks-schema';
import { eq } from 'drizzle-orm';

export const runMigrations = async () => {
    console.log("Running migrations...");
    try {
        await migrate(db, { migrationsFolder: "./src/db/drizzle" });
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