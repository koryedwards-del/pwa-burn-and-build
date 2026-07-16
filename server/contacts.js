import crypto from 'crypto';
import Database from 'better-sqlite3';
import { countPrograms, getLatestProgram, getLatestProgramMeta, getLatestPaidProgramMeta, getProgramById, isProgramPaid, normalizeEmail } from './db.js';
import { prepareDatabasePath, resolveDatabasePath } from './dbPath.js';

const dbPath = resolveDatabasePath();
prepareDatabasePath(dbPath);
const db = new Database(dbPath);

function createContactsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      email TEXT PRIMARY KEY,
      display_name TEXT,
      burn_and_build INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_bnb ON contacts(burn_and_build);
  `);
}

/** Ensure a contact row exists for every program email — never auto-grants paid access. */
function backfillContactsFromPrograms() {
  const rows = db.prepare('SELECT DISTINCT email FROM programs').all();
  const now = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO contacts (email, display_name, burn_and_build, created_at, updated_at)
    VALUES (?, NULL, 0, ?, ?)
    ON CONFLICT(email) DO UPDATE SET updated_at = excluded.updated_at
  `);

  for (const row of rows) {
    upsert.run(normalizeEmail(row.email), now, now);
  }
}

createContactsTable();
backfillContactsFromPrograms();

function rowToContact(row) {
  if (!row) return null;
  return {
    email: row.email,
    displayName: row.display_name || '',
    burnAndBuild: row.burn_and_build === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    programCount: countPrograms(row.email),
  };
}

export function getContact(email) {
  const row = db.prepare('SELECT * FROM contacts WHERE email = ?').get(normalizeEmail(email));
  return rowToContact(row);
}

export function listContacts() {
  const rows = db.prepare('SELECT * FROM contacts ORDER BY updated_at DESC, email ASC').all();
  return rows.map(rowToContact);
}

export function upsertContact({ email, displayName, burnAndBuild }) {
  const key = normalizeEmail(email);
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT email FROM contacts WHERE email = ?').get(key);

  if (existing) {
    db.prepare(`
      UPDATE contacts
      SET display_name = COALESCE(?, display_name),
          burn_and_build = COALESCE(?, burn_and_build),
          updated_at = ?
      WHERE email = ?
    `).run(
      displayName ?? null,
      burnAndBuild == null ? null : (burnAndBuild ? 1 : 0),
      now,
      key
    );
  } else {
    db.prepare(`
      INSERT INTO contacts (email, display_name, burn_and_build, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      key,
      displayName || null,
      burnAndBuild ? 1 : 0,
      now,
      now
    );
  }

  return getContact(key);
}

export function setBurnAndBuild(email, enabled) {
  const key = normalizeEmail(email);
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT email FROM contacts WHERE email = ?').get(key);

  if (!existing) {
    db.prepare(`
      INSERT INTO contacts (email, display_name, burn_and_build, created_at, updated_at)
      VALUES (?, NULL, ?, ?, ?)
    `).run(key, enabled ? 1 : 0, now, now);
  } else {
    db.prepare(`
      UPDATE contacts SET burn_and_build = ?, updated_at = ? WHERE email = ?
    `).run(enabled ? 1 : 0, now, key);
  }

  return getContact(key);
}

export function ensureBurnAndBuildAccess(email) {
  const contact = getContact(email);
  if (!contact) {
    return { ok: false, message: 'This email is not in the contact list yet.' };
  }
  if (!contact.burnAndBuild) {
    return { ok: false, message: 'Complete Stripe checkout to unlock your program.' };
  }
  return { ok: true, contact };
}

/** Diet creation adds or updates contact; access unlocks after payment. */
export function enrollContactFromProgramCreation(email, displayName) {
  const name = String(displayName || '').trim();
  const existing = getContact(email);
  return upsertContact({
    email,
    displayName: name || undefined,
    burnAndBuild: existing?.burnAndBuild ? true : false,
  });
}

export function programSavedForEmail(email) {
  const meta = getLatestProgramMeta(email);
  if (!meta) {
    return { saved: false, programCount: 0, programPaid: false };
  }
  return {
    saved: true,
    programId: meta.id,
    programCount: countPrograms(email),
    programPaid: isProgramPaid(email, meta.id),
  };
}

export function resolveProgramLoad(email, { getLatestProgram: getLatest, countPrograms: count }) {
  const key = normalizeEmail(email);
  const paidMeta = getLatestPaidProgramMeta(key);
  if (paidMeta) {
    const pkg = getProgramById(key, paidMeta.id);
    if (pkg) {
      return { ok: true, package: pkg, programCount: count(key), programId: paidMeta.id };
    }
  }

  const meta = getLatestProgramMeta(key);
  if (!meta) {
    return { ok: false, status: 404, message: 'No diet saved for this email yet.' };
  }

  if (!isProgramPaid(key, meta.id)) {
    return {
      ok: false,
      status: 403,
      saved: true,
      message: 'Complete Stripe checkout to unlock this program.',
      programCount: count(key),
      programId: meta.id,
    };
  }

  const pkg = getLatest(key);
  if (!pkg) {
    return { ok: false, status: 404, message: 'No diet saved for this email yet.' };
  }

  return { ok: true, package: pkg, programCount: count(key), programId: meta.id };
}

export function deleteContact(email) {
  const key = normalizeEmail(email);
  const result = db.prepare('DELETE FROM contacts WHERE email = ?').run(key);
  return result.changes > 0;
}
