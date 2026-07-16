/** Session handoff — creator / questionnaire → program-report → mealplanner */

import { CREATOR_HOST_ORIGIN } from './siteUrls.js';

export const MEALPLANNER_PROGRAM_KEY = 'bnb_mealplanner_program';
export const BUILT_PROGRAM_KEY = 'bnb_built_package';

export function persistProgramBridge(pkg) {
  if (!pkg) return;
  const raw = JSON.stringify(pkg);
  try {
    sessionStorage.setItem(MEALPLANNER_PROGRAM_KEY, raw);
    sessionStorage.setItem(BUILT_PROGRAM_KEY, raw);
  } catch (err) {
    console.error(err);
  }
}

export function loadProgramBridge() {
  for (const key of [MEALPLANNER_PROGRAM_KEY, BUILT_PROGRAM_KEY]) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      return JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(key);
    }
  }
  return null;
}

export function programReportHref({ preview = false, page } = {}) {
  const url = new URL('/program-report/', CREATOR_HOST_ORIGIN);
  if (preview) url.searchParams.set('preview', '1');
  if (page) url.searchParams.set('page', page);
  return `${url.pathname}${url.search}`;
}

export function myplanAppHref(email = '') {
  const url = new URL('/myplan/', CREATOR_HOST_ORIGIN);
  const normalized = String(email || '').trim().toLowerCase();
  if (normalized) url.searchParams.set('email', normalized);
  return `${url.pathname}${url.search}`;
}

export const INTAKE_ENTRY_PATH = '/questionnaire/?browse=1';
export const CREATOR_CHECKOUT_PATH = '/createyourfoodplan/?browse=1';
export { INTAKE_ENTRY_URL, CREATOR_CHECKOUT_URL, CREATOR_ENTRY_URL } from './siteUrls.js';
