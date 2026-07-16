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

/** @deprecated Use revokeContactAccess — access cannot be granted manually. */
export async function setContactBurnAndBuild(email, burnAndBuild) {
  if (burnAndBuild) {
    return {
      ok: false,
      message: 'Access is granted through Stripe checkout only. Create a coupon in Stripe for complimentary access.',
    };
  }
  return revokeContactAccess(email);
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
  return 'Complete Stripe checkout to unlock your program. If you have a coupon, enter it at checkout.';
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
