/** On-device backup — protects plan, logs, and settings from accidental loss. */

const BACKUP_KEY = 'bnb_local_backup';

const STORAGE_KEYS = {
  program: 'bnb_program',
  entries: 'bnb_entries',
  settings: 'bnb_settings',
  profile: 'bnb_profile',
  pickCounts: 'bnb_pick_counts',
  coachProgress: 'bnb_coach_progress',
  groceryChecked: 'bnb_grocery_checked',
  groceryRemoved: 'bnb_grocery_removed',
  groceryExtras: 'bnb_grocery_extras',
  appEmail: 'bnb_app_email',
  onboardingComplete: 'bnb_onboarding_complete',
};

export function backupLocalAppData() {
  try {
    const snapshot = { savedAt: new Date().toISOString() };
    for (const [field, key] of Object.entries(STORAGE_KEYS)) {
      snapshot[field] = localStorage.getItem(key);
    }
    localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function hasLocalBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    return !!snap.program;
  } catch {
    return false;
  }
}

export function getLocalBackupDate() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw).savedAt || null;
  } catch {
    return null;
  }
}

export function restoreLocalAppData() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return { ok: false, message: 'No backup found on this device.' };
    const snap = JSON.parse(raw);
    if (!snap.program) return { ok: false, message: 'Backup has no food plan.' };

    for (const [field, key] of Object.entries(STORAGE_KEYS)) {
      const value = snap[field];
      if (value != null) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    }

    return { ok: true, savedAt: snap.savedAt };
  } catch {
    return { ok: false, message: 'Could not read backup.' };
  }
}

export function exportLocalAppData() {
  try {
    const payload = { exportedAt: new Date().toISOString() };
    for (const [field, key] of Object.entries(STORAGE_KEYS)) {
      const raw = localStorage.getItem(key);
      payload[field] = raw ? JSON.parse(raw) : null;
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, message: 'Could not export data.' };
  }
}

export function downloadLocalAppData(filename) {
  const result = exportLocalAppData();
  if (!result.ok) return result;

  const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `burn-and-build-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}
