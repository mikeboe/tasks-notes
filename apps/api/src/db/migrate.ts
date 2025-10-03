import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '.';

export const runMigrations = async () => {
    console.log("Running migrations...");
    try {
        await migrate(db, { migrationsFolder: "./src/db/drizzle" });
        console.log("Migrations completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}