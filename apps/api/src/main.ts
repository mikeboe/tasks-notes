import "dotenv/config";
import { createApp } from "./app";
import dotenv from "dotenv"
import { runMigrations } from "./db/migrate";
import { initializeMeilisearch } from "./utils/meilisearch";

console.log("Loading environment variables...");
dotenv.config();

console.log("Environment variables loaded.");
const port = process.env.PORT || 3000;
(async () => {

  console.log("Running migrations and initializing Meilisearch...");  
  // create admin user
  await runMigrations();

  // Initialize Meilisearch
  console.log("Initializing Meilisearch...");
  await initializeMeilisearch();

  console.log("Starting the API server...");
  const app = createApp();

  app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
  });
})()

