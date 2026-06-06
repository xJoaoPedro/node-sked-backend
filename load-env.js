import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);

dotenv.config({
  path: resolve(currentDirectory, ".env"),
});
