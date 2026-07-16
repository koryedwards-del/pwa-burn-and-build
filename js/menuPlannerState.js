/** Menu planner state — stored on each program package and cached locally per plan. */

import {
  fetchProgramPaymentStatus,
  getAppEmail,
  isValidEmail,
  saveProgramToServer,
} from './programApi.js';
import { persistProgramBridge } from './programBridgeHandoff.js';

export const MENU_PLANNER_STATE_VERSION = 1;

function cacheKey(programId) {
  return `bnb_menu_planner_${programId}`;
}

export function readPlannerCache(programId) {
  if (!programId) return null;
  try {
    const raw = localStorage.getItem(cacheKey(programId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writePlannerCache(programId, state) {
  if (!programId || !state) return;
  try {
    localStorage.setItem(cacheKey(programId), JSON.stringify(state));
  } catch (err) {
    console.error(err);
  }
}

export function plannerStateFromPackage(pkg) {
  const embedded = pkg?.menuPlanner;
  if (embedded && typeof embedded === 'object') return embedded;
  const id = pkg?.program?.id;
  return id ? readPlannerCache(id) : null;
}

export function attachPlannerStateToPackage(pkg, state) {
  if (!pkg) return pkg;
  const next = { ...pkg, menuPlanner: state };
  const id = pkg?.program?.id;
  if (id && state) writePlannerCache(id, state);
  return next;
}

let saveTimer = null;
let pendingSave = null;

export function scheduleProgramPersist(pkg, { delayMs = 1200 } = {}) {
  if (!pkg?.program?.id) return;
  pendingSave = pkg;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushProgramPersist(pendingSave).catch((err) => console.error(err));
    pendingSave = null;
  }, delayMs);
}

export async function flushProgramPersist(pkg) {
  const target = pkg || pendingSave;
  if (!target?.program?.id) return false;

  persistProgramBridge(target);

  const email = getAppEmail();
  if (!isValidEmail(email)) return false;

  const payment = await fetchProgramPaymentStatus(email, target.program.id);
  if (!payment.ok || !payment.paid) {
    return false;
  }

  const result = await saveProgramToServer(email, target);
  if (!result.ok) {
    console.error('Could not save program:', result.message);
    return false;
  }
  return true;
}
