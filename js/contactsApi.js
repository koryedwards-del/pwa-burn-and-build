/** Admin contact list API — one list for all apps */

import { apiUrl } from './apiConfig.js';
import { normalizeEmail } from './programApi.js';

const ADMIN_KEY_STORAGE = 'bnb_contacts_admin_key';

export function getContactsAdminKey() {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE) || localStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

export function persistContactsAdminKey(key) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
}

function adminHeaders() {
  const key = getContactsAdminKey();
  return key ? { 'X-Contacts-Admin-Key': key } : {};
}

export async function fetchContacts() {
  try {
    const res = await fetch(apiUrl('/api/contacts'), { headers: adminHeaders() });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not load contacts.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error loading contacts.' };
  }
}

export async function saveContact({ email, displayName }) {
  try {
    const res = await fetch(apiUrl('/api/contacts'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ email: normalizeEmail(email), displayName }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not save contact.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error saving contact.' };
  }
}

export async function revokeContactAccess(email) {
  try {
    const res = await fetch(apiUrl('/api/contacts'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ email: normalizeEmail(email), burnAndBuild: false }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not revoke access.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error revoking access.' };
  }
}

export async function deleteContact(email) {
  try {
    const res = await fetch(apiUrl('/api/contacts'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not delete contact.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error deleting contact.' };
  }
}

