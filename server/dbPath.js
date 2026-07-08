import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGACY_PATH = path.join(__dirname, 'data', 'programs.db');
const RENDER_PERSISTENT_PATH = '/var/data/programs.db';

export function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured) return configured;

  if (process.env.RENDER && process.env.NODE_ENV === 'production') {
    return RENDER_PERSISTENT_PATH;
  }

  return LEGACY_PATH;
}

/** Ensure parent dir exists; on Render, copy legacy DB into persistent path once. */
export function prepareDatabasePath(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (dbPath === LEGACY_PATH || fs.existsSync(dbPath)) return;

  if (!fs.existsSync(LEGACY_PATH)) return;

  try {
    fs.copyFileSync(LEGACY_PATH, dbPath);
    for (const suffix of ['-wal', '-shm']) {
      const legacySidecar = LEGACY_PATH + suffix;
      if (fs.existsSync(legacySidecar)) {
        fs.copyFileSync(legacySidecar, dbPath + suffix);
      }
    }
    console.log('[db] migrated legacy database to', dbPath);
  } catch (err) {
    console.warn('[db] legacy migration skipped:', err.message);
  }
}
