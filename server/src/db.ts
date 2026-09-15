import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "salon.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    employeeId TEXT,
    passwordHash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS collections (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );

  CREATE TABLE IF NOT EXISTS singletons (
    name TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
`);

export function isFirstRun(): boolean {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count === 0;
}
