/** Session handoff — creator / questionnaire → unified program-report shell */

import { setActiveProgramId, activeProgramIdFromPackage } from './programActive.js';
import { CREATOR_HOST_ORIGIN } from './siteUrls.js';

export const MENUPLANNER_PROGRAM_KEY = 'bnb_menuplanner_program';
export const BUILT_PROGRAM_KEY = 'bnb_built_package';

export function persistProgramBridge(pkg) {
  if (!pkg) return;
  const raw = JSON.stringify(pkg);
  const activeId = activeProgramIdFromPackage(pkg);
  if (activeId) setActiveProgramId(activeId);
  try {
    sessionStorage.setItem(MENUPLANNER_PROGRAM_KEY, raw);
    sessionStorage.setItem(BUILT_PROGRAM_KEY, raw);
  } catch (err) {
    console.error(err);
  }
}

export function loadProgramBridge() {
  for (const key of [MENUPLANNER_PROGRAM_KEY, BUILT_PROGRAM_KEY]) {
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
