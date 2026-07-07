/** Stripe Checkout — creator site only (no secrets here). */

import { normalizeEmail } from './programApi.js';

export async function fetchCheckoutStatus() {
  try {
    const res = await fetch('/api/checkout/status');
    const data = await res.json();
    return data;
  } catch {
    return { ok: false, configured: false };
  }
}

export async function createCheckoutSession(email, programId) {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizeEmail(email),
        programId: programId || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not start checkout.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error starting checkout.' };
  }
}

export async function verifyCheckoutSession(sessionId) {
  try {
    const res = await fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Could not verify payment.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error verifying payment.' };
  }
}

export async function completeCheckoutForTest(email) {
  try {
    const res = await fetch('/api/checkout/test-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'Test checkout failed.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error completing test checkout.' };
  }
}
