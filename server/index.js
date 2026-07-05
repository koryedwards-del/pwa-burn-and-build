import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import {
  deleteContact,
  ensureBurnAndBuildAccess,
  enrollContactFromProgramCreation,
  getContact,
  listContacts,
  setBurnAndBuild,
  upsertContact,
} from './contacts.js';
import { countPrograms, dbPathForHealth, getLatestProgram, normalizeEmail, saveProgram } from './db.js';
import { validateProgramPackage } from '../js/programPackage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const app = express();
const port = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';

const blockedPrefixes = [
  '/server',
  '/.env',
  '/.git',
  '/node_modules',
  '/package.json',
  '/package-lock.json',
  '/render.yaml',
];

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use((req, res, next) => {
  if (blockedPrefixes.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
    res.sendStatus(404);
    return;
  }
  next();
});

app.use(express.json({ limit: '512kb' }));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function requireContactsAdmin(req, res, next) {
  const configured = process.env.CONTACTS_ADMIN_KEY;
  if (!configured) {
    next();
    return;
  }
  const key = req.get('x-contacts-admin-key') || req.query.adminKey;
  if (key !== configured) {
    res.status(401).json({ ok: false, message: 'Admin key required.' });
    return;
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'program-creator',
    env: isProd ? 'production' : 'development',
    database: dbPathForHealth(),
  });
});

app.get('/api/contacts/lookup', (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, message: 'Enter a valid email address.' });
    return;
  }

  const contact = getContact(email);
  if (!contact) {
    res.status(404).json({ ok: false, message: 'This email is not in the contact list yet.' });
    return;
  }

  res.json({ ok: true, contact });
});

app.get('/api/contacts', requireContactsAdmin, (_req, res) => {
  res.json({ ok: true, contacts: listContacts() });
});

app.put('/api/contacts', requireContactsAdmin, (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, message: 'Enter a valid email address.' });
    return;
  }

  const contact = upsertContact({
    email,
    displayName: String(req.body?.displayName || '').trim(),
    burnAndBuild: !!req.body?.burnAndBuild,
  });
  res.json({ ok: true, contact });
});

app.patch('/api/contacts', requireContactsAdmin, (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, message: 'Enter a valid email address.' });
    return;
  }

  if (typeof req.body?.burnAndBuild !== 'boolean') {
    res.status(400).json({ ok: false, message: 'burnAndBuild must be true or false.' });
    return;
  }

  const contact = setBurnAndBuild(email, req.body.burnAndBuild);
  res.json({ ok: true, contact });
});

app.delete('/api/contacts', requireContactsAdmin, (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, message: 'Enter a valid email address.' });
    return;
  }

  if (!deleteContact(email)) {
    res.status(404).json({ ok: false, message: 'Contact not found.' });
    return;
  }

  res.json({ ok: true, email });
});

app.post('/api/programs', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const pkg = req.body?.package;

  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, message: 'Enter a valid email address.' });
    return;
  }

  const validation = validateProgramPackage(pkg);
  if (!validation.ok) {
    res.status(400).json({ ok: false, message: validation.errors.join(' ') });
    return;
  }

  const programId = saveProgram(email, pkg);
  const contact = enrollContactFromProgramCreation(email, pkg?.intake?.preferredName);
  res.json({ ok: true, email, programId, programCount: countPrograms(email), contact });
});

app.get('/api/programs', (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, message: 'Enter a valid email address.' });
    return;
  }

  const access = ensureBurnAndBuildAccess(email);
  if (!access.ok) {
    res.status(403).json({ ok: false, message: access.message });
    return;
  }

  const pkg = getLatestProgram(email);
  if (!pkg) {
    res.status(404).json({ ok: false, message: 'No food plan found for this email yet.' });
    return;
  }

  res.json({
    ok: true,
    email,
    package: pkg,
    programCount: countPrograms(email),
  });
});

/** Public config for client — never put secrets here. */
app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`window.BNB_CONFIG=${JSON.stringify({
    creatorBaseUrl: process.env.CREATOR_BASE_URL || '',
    webpageUrl: process.env.WEBPAGE_URL || '',
    paywallEnabled: process.env.PAYWALL_ENABLED === 'true',
  })};`);
});

app.get('/', (_req, res) => {
  res.redirect('/start/');
});

app.use((req, res, next) => {
  const isHtml = req.path.endsWith('.html') || req.path.endsWith('/');
  const isAsset = /\.(css|js|mjs)$/i.test(req.path);
  if (isHtml) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (isAsset) {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  }
  next();
});

app.use(express.static(root, {
  dotfiles: 'deny',
  index: ['index.html'],
}));

app.listen(port, () => {
  console.log(`Program creator listening on port ${port}`);
});
