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

function migratePaidAtColumn() {
  const cols = db.prepare('PRAGMA table_info(programs)').all();
  if (!cols.some((c) => c.name === 'paid_at')) {
    db.exec('ALTER TABLE programs ADD COLUMN paid_at TEXT');
  }
}

migrateLegacyTable();
migratePaidAtColumn();

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

function mapProgramRow(row) {
  const pkg = parsePackage(row);
  if (!pkg) return null;
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    paidAt: row.paid_at || null,
    paid: !!row.paid_at,
    package: pkg,
  };
}

function packageForSave(email, programId, pkg) {
  const key = normalizeEmail(email);
  const id = programId || pkg.program?.id;
  if (!id || !pkg?.menuPlanner) return pkg;
  if (isProgramPaid(key, id)) return pkg;
  const { menuPlanner, ...rest } = pkg;
  return rest;
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

  const storedPkg = packageForSave(key, id, pkg);

  if (existing) {
    const existingPkg = parsePackage(existing);
    if (existingPkg?.program?.firstSavedAtLocalDate && !storedPkg.program?.firstSavedAtLocalDate) {
      storedPkg.program = { ...storedPkg.program, firstSavedAtLocalDate: existingPkg.program.firstSavedAtLocalDate };
    }
    if (existingPkg?.program?.foodPlanCreatedDate && !storedPkg.program?.foodPlanCreatedDate) {
      storedPkg.program = { ...storedPkg.program, foodPlanCreatedDate: existingPkg.program.foodPlanCreatedDate };
    }
    db.prepare(`
      UPDATE programs
      SET label = ?, package_json = ?
      WHERE id = ? AND email = ?
    `).run(label, JSON.stringify(storedPkg), id, key);
  } else {
    if (storedPkg.program && !storedPkg.program.firstSavedAtLocalDate) {
      storedPkg.program.firstSavedAtLocalDate = storedPkg.program.foodPlanCreatedDate || storedPkg.program.issuedAtLocalDate || null;
    }
    if (storedPkg.program && !storedPkg.program.foodPlanCreatedDate) {
      storedPkg.program.foodPlanCreatedDate = storedPkg.program.firstSavedAtLocalDate || storedPkg.program.issuedAtLocalDate || null;
    }
    db.prepare(`
      INSERT INTO programs (id, email, label, package_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, key, label, JSON.stringify(storedPkg), now);
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

export function getLatestPaidProgramMeta(email) {
  const row = db.prepare(`
    SELECT id, created_at FROM programs
    WHERE email = ? AND paid_at IS NOT NULL
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
    SELECT id, label, package_json, created_at, paid_at FROM programs
    WHERE email = ?
    ORDER BY created_at DESC
  `).all(normalizeEmail(email));

  return rows.map(mapProgramRow).filter(Boolean);
}

/** Purchased or coupon-unlocked programs only — for diet history and sidebar. */
export function listPaidPrograms(email) {
  const rows = db.prepare(`
    SELECT id, label, package_json, created_at, paid_at FROM programs
    WHERE email = ? AND paid_at IS NOT NULL
    ORDER BY created_at DESC
  `).all(normalizeEmail(email));

  return rows.map(mapProgramRow).filter(Boolean);
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

export function isProgramPaid(email, programId) {
  const key = normalizeEmail(email);
  let id = programId;
  if (!id) {
    const meta = getLatestProgramMeta(key);
    id = meta?.id;
  }
  if (!id) return false;
  const row = db.prepare('SELECT paid_at FROM programs WHERE id = ? AND email = ?').get(id, key);
  return !!(row?.paid_at);
}

export function markProgramPaid(email, programId) {
  const key = normalizeEmail(email);
  const id = String(programId || '').trim();
  if (!id) return false;
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE programs SET paid_at = ? WHERE id = ? AND email = ?
  `).run(now, id, key);
  return result.changes > 0;
}

export function dbPathForHealth() {
  return dbPath;
}
