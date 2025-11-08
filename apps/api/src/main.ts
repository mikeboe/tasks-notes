import "dotenv/config";
import { createApp } from "./app";
import dotenv from "dotenv"
import { runMigrations } from "./db/migrate";
import { initializeMeilisearch } from "./utils/meilisearch";

dotenv.config();


const port = process.env.PORT || 3000;
(async () => {

  // create admin user
  await runMigrations();

  // Initialize Meilisearch
  await initializeMeilisearch();

  const app = createApp();

  app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
  });
})()

