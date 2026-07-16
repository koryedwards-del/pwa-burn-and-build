/** Stripe Checkout — creator site only (no secrets here). */

import { apiUrl } from './apiConfig.js';
import { fetchJson } from './apiFetch.js';
import { normalizeEmail } from './programApi.js';

export async function fetchCheckoutStatus() {
  try {
    const { res, data } = await fetchJson(apiUrl('/api/checkout/status'));
    return { ...data, reachable: res.ok };
  } catch {
    return { ok: false, configured: false, reachable: false };
  }
}

export async function createCheckoutSession(email, programId) {
  try {
    const { res, data } = await fetchJson(apiUrl('/api/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizeEmail(email),
        programId: programId || undefined,
      }),
    });
    if (!res.ok) return { ok: false, message: data.message || 'Could not start checkout.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error starting checkout.' };
  }
}

export async function verifyCheckoutSession(sessionId) {
  try {
    const { res, data } = await fetchJson(
      apiUrl(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
    );
    if (!res.ok) return { ok: false, message: data.message || 'Could not verify payment.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error verifying payment.' };
  }
}

export async function completeCheckoutForTest(email, programId) {
  try {
    const { res, data } = await fetchJson(apiUrl('/api/checkout/test-complete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeEmail(email), programId: programId || undefined }),
    });
    if (!res.ok) return { ok: false, message: data.message || 'Test checkout failed.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error completing test checkout.' };
  }
}
