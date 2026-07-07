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

export async function lookupContact(email) {
  try {
    const res = await fetch(apiUrl(`/api/contacts/lookup?email=${encodeURIComponent(normalizeEmail(email))}`));
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Contact not found.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error checking contact.' };
  }
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

export async function saveContact({ email, displayName, burnAndBuild }) {
  try {
    const res = await fetch(apiUrl('/api/contacts'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ email: normalizeEmail(email), displayName, burnAndBuild }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not save contact.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error saving contact.' };
  }
}

export async function setContactBurnAndBuild(email, burnAndBuild) {
  try {
    const res = await fetch(apiUrl('/api/contacts'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ email: normalizeEmail(email), burnAndBuild }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not update contact.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error updating contact.' };
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

export function burnAndBuildAccessMessage() {
  return 'Create your food plan first, or ask Coach Kory to enable Burn & Build on your contact.';
}

export async function ensureBurnAndBuildContact(email) {
  const result = await lookupContact(email);
  if (!result.ok || !result.contact) {
    return { ok: false, message: burnAndBuildAccessMessage() };
  }
  if (!result.contact.burnAndBuild) {
    return { ok: false, message: burnAndBuildAccessMessage() };
  }
  return { ok: true, contact: result.contact };
}
