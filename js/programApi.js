/** Client API — save/load food plan by email (Creator → DB → Shell PWA) */

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function persistAppEmail(email) {
  const key = normalizeEmail(email);
  localStorage.setItem('bnb_app_email', key);
  sessionStorage.setItem('bnb_app_email', key);
  return key;
}

export function getAppEmail() {
  return localStorage.getItem('bnb_app_email') || sessionStorage.getItem('bnb_app_email') || '';
}

export async function saveProgramToServer(email, pkg) {
  try {
    const res = await fetch('/api/programs', {
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
    const res = await fetch(`/api/programs?email=${encodeURIComponent(normalizeEmail(email))}`);
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || 'No plan found for this email.' };
    return data;
  } catch {
    return { ok: false, message: 'Network error loading your plan.' };
  }
}
