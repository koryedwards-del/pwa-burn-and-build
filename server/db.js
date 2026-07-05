import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'programs.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS programs (
    email TEXT PRIMARY KEY,
    package_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function saveProgram(email, pkg) {
  const key = normalizeEmail(email);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO programs (email, package_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      package_json = excluded.package_json,
      updated_at = excluded.updated_at
  `).run(key, JSON.stringify(pkg), now);
}

export function getProgram(email) {
  const row = db.prepare('SELECT package_json FROM programs WHERE email = ?').get(normalizeEmail(email));
  if (!row) return null;
  return JSON.parse(row.package_json);
}

export function dbPathForHealth() {
  return dbPath;
}
