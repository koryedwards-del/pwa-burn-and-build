import crypto from 'crypto';
import Database from 'better-sqlite3';
import { prepareDatabasePath, resolveDatabasePath } from './dbPath.js';

const dbPath = resolveDatabasePath();
prepareDatabasePath(dbPath);
const db = new Database(dbPath);

function createCollectionTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      label TEXT,
      package_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_programs_email_created ON programs(email, created_at DESC);
  `);
}

function migrateLegacyTable() {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='programs'").get();
  if (!table) {
    createCollectionTable();
    return;
  }

  const cols = db.prepare('PRAGMA table_info(programs)').all();
  if (cols.some((c) => c.name === 'id')) return;

  db.exec('ALTER TABLE programs RENAME TO programs_legacy');
  createCollectionTable();

  const rows = db.prepare('SELECT email, package_json, updated_at FROM programs_legacy').all();
  const insert = db.prepare(`
    INSERT INTO programs (id, email, label, package_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const row of rows) {
    let pkg;
    try {
      pkg = JSON.parse(row.package_json);
    } catch {
      continue;
    }
    insert.run(
      pkg.program?.id || crypto.randomUUID(),
      row.email,
      pkg.program?.label || null,
      row.package_json,
      row.updated_at
    );
  }

  db.exec('DROP TABLE programs_legacy');
}

migrateLegacyTable();

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parsePackage(row) {
  if (!row?.package_json) return null;
  try {
    return JSON.parse(row.package_json);
  } catch {
    return null;
  }
}

/** Add or update a program for this email — same id updates in place. */
export function saveProgram(email, pkg) {
  const key = normalizeEmail(email);
  const id = pkg.program?.id || crypto.randomUUID();
  const label = pkg.program?.label || null;
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT email, package_json FROM programs WHERE id = ?').get(id);

  if (existing && normalizeEmail(existing.email) !== key) {
    throw new Error('This diet belongs to another account.');
  }

  if (existing) {
    const existingPkg = parsePackage(existing);
    if (existingPkg?.program?.firstSavedAtLocalDate && !pkg.program?.firstSavedAtLocalDate) {
      pkg.program = { ...pkg.program, firstSavedAtLocalDate: existingPkg.program.firstSavedAtLocalDate };
    }
    if (existingPkg?.program?.foodPlanCreatedDate && !pkg.program?.foodPlanCreatedDate) {
      pkg.program = { ...pkg.program, foodPlanCreatedDate: existingPkg.program.foodPlanCreatedDate };
    }
    db.prepare(`
      UPDATE programs
      SET label = ?, package_json = ?
      WHERE id = ? AND email = ?
    `).run(label, JSON.stringify(pkg), id, key);
  } else {
    if (pkg.program && !pkg.program.firstSavedAtLocalDate) {
      pkg.program.firstSavedAtLocalDate = pkg.program.foodPlanCreatedDate || pkg.program.issuedAtLocalDate || null;
    }
    if (pkg.program && !pkg.program.foodPlanCreatedDate) {
      pkg.program.foodPlanCreatedDate = pkg.program.firstSavedAtLocalDate || pkg.program.issuedAtLocalDate || null;
    }
    db.prepare(`
      INSERT INTO programs (id, email, label, package_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, key, label, JSON.stringify(pkg), now);
  }

  return id;
}

/** Most recent program for this email — used by the shell until program picker exists. */
export function getLatestProgram(email) {
  const row = db.prepare(`
    SELECT package_json FROM programs
    WHERE email = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(normalizeEmail(email));
  return parsePackage(row);
}

export function getLatestProgramMeta(email) {
  const row = db.prepare(`
    SELECT id, created_at FROM programs
    WHERE email = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(normalizeEmail(email));
  if (!row) return null;
  return { id: row.id, createdAt: row.created_at };
}

export function countPrograms(email) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM programs WHERE email = ?').get(normalizeEmail(email));
  return row?.n || 0;
}

export function listPrograms(email) {
  const rows = db.prepare(`
    SELECT id, label, package_json, created_at FROM programs
    WHERE email = ?
    ORDER BY created_at DESC
  `).all(normalizeEmail(email));

  return rows.map((row) => {
    const pkg = parsePackage(row);
    if (!pkg) return null;
    return {
      id: row.id,
      label: row.label,
      createdAt: row.created_at,
      package: pkg,
    };
  }).filter(Boolean);
}

export function getProgramById(email, programId) {
  const row = db.prepare(`
    SELECT package_json FROM programs
    WHERE email = ? AND id = ?
  `).get(normalizeEmail(email), programId);
  return parsePackage(row);
}

/** Delete one diet for this email. Returns true if a row was removed. */
export function deleteProgram(email, programId) {
  const result = db.prepare(`
    DELETE FROM programs
    WHERE email = ? AND id = ?
  `).run(normalizeEmail(email), programId);
  return result.changes > 0;
}

export function dbPathForHealth() {
  return dbPath;
}
