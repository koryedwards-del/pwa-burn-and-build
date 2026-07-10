#!/usr/bin/env node
/** Ops helper — list or delete diets in SQLite (run on Render shell or locally). */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.join(__dirname, '../server/data/programs.db');
const dbPath = process.env.DATABASE_PATH?.trim()
  || (process.env.RENDER && process.env.NODE_ENV === 'production' ? '/var/data/programs.db' : defaultPath);

function parsePackage(row) {
  try {
    return JSON.parse(row.package_json);
  } catch {
    return null;
  }
}

function listPrograms(db, emailFilter) {
  const rows = emailFilter
    ? db.prepare('SELECT id, email, label, package_json, created_at FROM programs WHERE email = ? ORDER BY created_at DESC').all(emailFilter)
    : db.prepare('SELECT id, email, label, package_json, created_at FROM programs ORDER BY created_at DESC').all();

  return rows.map((row) => {
    const pkg = parsePackage(row);
    const fat = pkg?.intake?.fatPercent;
    const planDate = pkg?.program?.foodPlanCreatedDate || '—';
    return {
      id: row.id,
      email: row.email,
      createdAt: row.created_at,
      planDate,
      fatPercent: fat != null ? `${fat}%` : '—',
      label: row.label || pkg?.program?.label || '—',
    };
  });
}

function usage() {
  console.log(`Usage:
  node scripts/delete-program.mjs list [email]
  node scripts/delete-program.mjs delete <program-id> <email>

Database: ${dbPath}`);
}

const [,, command, arg1, arg2] = process.argv;

let db;
try {
  db = new Database(dbPath, { readonly: command === 'list' });
} catch (err) {
  console.error('Could not open database:', dbPath, err.message);
  process.exit(1);
}

if (command === 'list') {
  const email = arg1?.includes('@') ? arg1.trim().toLowerCase() : null;
  const rows = listPrograms(db, email);
  if (!rows.length) {
    console.log(email ? `No programs for ${email}.` : 'No programs in database.');
  } else {
    for (const row of rows) {
      console.log(`${row.id}  ${row.email}  ${row.planDate}  ${row.fatPercent}  ${row.createdAt}`);
    }
  }
  db.close();
  process.exit(0);
}

if (command === 'delete') {
  const programId = arg1;
  const email = arg2?.trim().toLowerCase();
  if (!programId || !email?.includes('@')) {
    usage();
    process.exit(1);
  }
  db.close();
  db = new Database(dbPath);
  const result = db.prepare('DELETE FROM programs WHERE id = ? AND email = ?').run(programId, email);
  db.close();
  if (!result.changes) {
    console.error('No matching program found.');
    process.exit(1);
  }
  console.log(`Deleted program ${programId} for ${email}.`);
  process.exit(0);
}

usage();
process.exit(1);
