/** Client API — save/load food plan by email (Creator → DB → Shell PWA) */

import { apiUrl } from './apiConfig.js';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function persistAppEmail(email) {
  const key = normalizeEmail(email);
  if (!key) return '';
  localStorage.setItem('bnb_app_email', key);
  sessionStorage.setItem('bnb_app_email', key);
  if (typeof document !== 'undefined') {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `bnb_app_email=${encodeURIComponent(key)}; path=/; max-age=31536000; SameSite=Lax${secure}`;
  }
  return key;
}

export function getAppEmail() {
  return localStorage.getItem('bnb_app_email')
    || sessionStorage.getItem('bnb_app_email')
    || readCookie('bnb_app_email')
    || '';
}

export async function saveProgramToServer(email, pkg) {
  try {
    const res = await fetch(apiUrl('/api/programs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeEmail(email), package: pkg }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not save your plan.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error saving your plan.' };
  }
}

export async function fetchProgramFromServer(email) {
  try {
    const res = await fetch(apiUrl(`/api/programs?email=${encodeURIComponent(normalizeEmail(email))}`));
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'No plan found for this email.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error loading your plan.' };
  }
}

export async function fetchProgramHistoryFromServer(email) {
  try {
    const res = await fetch(apiUrl(`/api/programs/history?email=${encodeURIComponent(normalizeEmail(email))}`));
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not load food plan history.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error loading food plan history.' };
  }
}

export async function fetchProgramByIdFromServer(email, programId) {
  try {
    const res = await fetch(apiUrl(`/api/programs/${encodeURIComponent(programId)}?email=${encodeURIComponent(normalizeEmail(email))}`));
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not load that food plan.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error loading food plan.' };
  }
}
