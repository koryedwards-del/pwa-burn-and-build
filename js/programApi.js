/** Client API — save/load diet by email (Creator → DB → Shell PWA) */

import { apiUrl } from './apiConfig.js';
import { fetchJson } from './apiFetch.js';

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

function apiFailure(res, data, fallback) {
  return {
    ok: false,
    status: res.status,
    saved: !!data.saved,
    programId: data.programId || null,
    message: data.message || fallback,
  };
}

export async function saveProgramToServer(email, pkg) {
  try {
    const { res, data } = await fetchJson(apiUrl('/api/programs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeEmail(email), package: pkg }),
    });
    if (!res.ok) return apiFailure(res, data, 'Could not save your plan.');
    return data;
  } catch {
    return { ok: false, message: 'Network error saving your plan.' };
  }
}

export async function fetchProgramSavedStatus(email) {
  try {
    const { res, data } = await fetchJson(
      apiUrl(`/api/programs/saved?email=${encodeURIComponent(normalizeEmail(email))}`)
    );
    if (!res.ok) return apiFailure(res, data, 'Could not check saved plan status.');
    return data;
  } catch {
    return { ok: false, message: 'Network error checking saved plan.' };
  }
}

export async function fetchProgramPaymentStatus(email, programId) {
  try {
    const { res, data } = await fetchJson(
      apiUrl(`/api/programs/payment-status?email=${encodeURIComponent(normalizeEmail(email))}&programId=${encodeURIComponent(programId)}`)
    );
    if (!res.ok) return { ok: false, paid: false, message: data.message || 'Could not check payment status.' };
    return data;
  } catch {
    return { ok: false, paid: false, message: 'Network error checking payment status.' };
  }
}

export async function fetchProgramResumeCheckout(email) {
  try {
    const { res, data } = await fetchJson(
      apiUrl(`/api/programs/resume-checkout?email=${encodeURIComponent(normalizeEmail(email))}`)
    );
    if (!res.ok) return apiFailure(res, data, 'Could not load your program for checkout.');
    return data;
  } catch {
    return { ok: false, message: 'Network error loading checkout.' };
  }
}

export async function fetchProgramFromServer(email) {
  try {
    const { res, data } = await fetchJson(
      apiUrl(`/api/programs?email=${encodeURIComponent(normalizeEmail(email))}`)
    );
    if (!res.ok) return apiFailure(res, data, 'No plan found for this email.');
    return data;
  } catch {
    return { ok: false, message: 'Network error loading your plan.' };
  }
}

export async function fetchProgramHistoryFromServer(email) {
  try {
    const { res, data } = await fetchJson(
      apiUrl(`/api/programs/history?email=${encodeURIComponent(normalizeEmail(email))}`)
    );
    if (!res.ok) return apiFailure(res, data, 'Could not load diet history.');
    return data;
  } catch {
    return { ok: false, message: 'Network error loading diet history.' };
  }
}

export async function fetchProgramByIdFromServer(email, programId) {
  try {
    const { res, data } = await fetchJson(
      apiUrl(`/api/programs/${encodeURIComponent(programId)}?email=${encodeURIComponent(normalizeEmail(email))}`)
    );
    if (!res.ok) return apiFailure(res, data, 'Could not load that diet.');
    return data;
  } catch {
    return { ok: false, message: 'Network error loading diet.' };
  }
}
