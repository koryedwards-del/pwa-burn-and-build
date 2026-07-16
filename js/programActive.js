/** Tracks which purchased program is active across report + menu planner. */

const ACTIVE_PROGRAM_KEY = 'bnb_active_program_id';

export function getActiveProgramId() {
  return localStorage.getItem(ACTIVE_PROGRAM_KEY) || '';
}

export function setActiveProgramId(programId) {
  const id = String(programId || '').trim();
  if (id) localStorage.setItem(ACTIVE_PROGRAM_KEY, id);
  else localStorage.removeItem(ACTIVE_PROGRAM_KEY);
}

export function activeProgramIdFromPackage(pkg) {
  return String(pkg?.program?.id || '').trim();
}
