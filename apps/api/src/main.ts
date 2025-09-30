import "dotenv/config";
import { createApp } from "./app";
import dotenv from "dotenv"

dotenv.config();


const port = process.env.PORT || 3000;
(async () => {

  // create admin user 

  const app = createApp();

  app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
  });
})()

