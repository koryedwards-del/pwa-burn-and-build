import crypto from 'crypto';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { countPrograms, normalizeEmail } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'programs.db');
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

function seedContacts() {
  const now = new Date().toISOString();
  const seeds = [
    { email: 'koryedwards@me.com', displayName: 'Kory Edwards', burnAndBuild: true },
  ];

  const insert = db.prepare(`
    INSERT INTO contacts (email, display_name, burn_and_build, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO NOTHING
  `);

  for (const seed of seeds) {
    insert.run(
      normalizeEmail(seed.email),
      seed.displayName,
      seed.burnAndBuild ? 1 : 0,
      now,
      now
    );
  }
}

function backfillContactsFromPrograms() {
  const rows = db.prepare('SELECT DISTINCT email FROM programs').all();
  const now = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO contacts (email, display_name, burn_and_build, created_at, updated_at)
    VALUES (?, NULL, 1, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      burn_and_build = MAX(contacts.burn_and_build, excluded.burn_and_build),
      updated_at = excluded.updated_at
  `);

  for (const row of rows) {
    upsert.run(normalizeEmail(row.email), now, now);
  }
}

createContactsTable();
seedContacts();
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

function migrateTypoSeedContact() {
  const typo = getContact('me.koryedwards@me.com');
  if (!typo?.burnAndBuild) return;
  upsertContact({
    email: 'koryedwards@me.com',
    displayName: typo.displayName || 'Kory Edwards',
    burnAndBuild: true,
  });
}

migrateTypoSeedContact();

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
    return { ok: false, message: 'Burn & Build is not enabled for this contact yet.' };
  }
  return { ok: true, contact };
}

/** Food plan creation adds or updates Admin contact; access unlocks after payment. */
export function enrollContactFromProgramCreation(email, displayName) {
  const name = String(displayName || '').trim();
  const existing = getContact(email);
  return upsertContact({
    email,
    displayName: name || undefined,
    burnAndBuild: existing?.burnAndBuild ? true : false,
  });
}

export function resolveProgramLoad(email, { getLatestProgram, countPrograms }) {
  const pkg = getLatestProgram(email);
  if (!pkg) {
    return { ok: false, status: 404, message: 'No food plan saved for this email yet.' };
  }

  enrollContactFromProgramCreation(email, pkg?.intake?.preferredName);

  const access = ensureBurnAndBuildAccess(email);
  if (!access.ok) {
    const message = access.message.includes('not enabled')
      ? 'Your plan is saved. Complete purchase to open it in the app.'
      : access.message;
    return { ok: false, status: 403, message };
  }

  return { ok: true, package: pkg, programCount: countPrograms(email) };
}

export function deleteContact(email) {
  const key = normalizeEmail(email);
  const result = db.prepare('DELETE FROM contacts WHERE email = ?').run(key);
  return result.changes > 0;
}
