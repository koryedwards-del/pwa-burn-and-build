/** Sidebar — purchased diet plans; switch active program. */

import {
  fetchProgramByIdFromServer,
  fetchProgramHistoryFromServer,
  getAppEmail,
  isValidEmail,
  persistAppEmail,
  normalizeEmail,
} from './programApi.js';
import { getActiveProgramId, setActiveProgramId } from './programActive.js';
import { summarizeProgram, sortProgramHistory } from './programHistory.js';
import { renderSidebarProgramCard } from './programHistoryUi.js';
import { persistProgramBridge } from './programBridgeHandoff.js';
import { flushProgramPersist } from './menuPlannerState.js';

function libraryEl() {
  return document.getElementById('program-library');
}

function resolveProgramEmail(programPackage) {
  const fromPackage = normalizeEmail(programPackage?.intake?.email);
  if (isValidEmail(fromPackage)) {
    persistAppEmail(fromPackage);
    return fromPackage;
  }
  return getAppEmail();
}

function syncProgramEmail(programPackage) {
  resolveProgramEmail(programPackage);
}

function summarizePaidPrograms(programRows = []) {
  return programRows
    .filter((row) => row?.package)
    .map((row) => summarizeProgram(row.package, {
      id: row.id,
      createdAt: row.createdAt,
      label: row.label,
    }));
}

let openingProgramId = null;
let switchHandler = null;
let beforeSwitchHandler = null;
let getProgramPackageHandler = null;
const expandedProgramCards = new Set();
const LIBRARY_CACHE_KEY = 'bnb_sidebar_library';
let lastRenderedSignature = '';

function libraryCacheKey(email) {
  return `${LIBRARY_CACHE_KEY}:${email}`;
}

function readLibraryCache(email) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(libraryCacheKey(email)) || 'null');
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLibraryCache(email, rows, activeId) {
  try {
    sessionStorage.setItem(libraryCacheKey(email), JSON.stringify({ rows, activeId }));
  } catch {
    /* ignore quota errors */
  }
}

function rowsSignature(rows, activeId) {
  return `${activeId || ''}:${openingProgramId || ''}:${rows.map((row) => row.id).join(',')}`;
}

function isProgramCardCollapsed(programId) {
  return !expandedProgramCards.has(programId);
}

function setProgramCardCollapsed(programId, collapsed) {
  if (!programId) return;
  if (collapsed) expandedProgramCards.delete(programId);
  else expandedProgramCards.add(programId);
}

function toggleProgramCard(card) {
  const programId = card?.getAttribute('data-program-card');
  if (!programId || !card) return;
  const collapsed = card.classList.toggle('is-collapsed');
  setProgramCardCollapsed(programId, !collapsed);
  const top = card.querySelector('[data-toggle-program-card]');
  if (top) {
    top.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    top.setAttribute('aria-label', collapsed ? 'Show diet details' : 'Hide diet details');
  }
}

function bindLibraryEvents() {
  const library = libraryEl();
  if (!library || library.dataset.bound === '1') return;
  library.dataset.bound = '1';

  library.addEventListener('click', (event) => {
    const top = event.target.closest('[data-toggle-program-card]');
    if (top) {
      event.preventDefault();
      const card = top.closest('[data-program-card]');
      if (!card) return;
      toggleProgramCard(card);
      return;
    }

    const body = event.target.closest('.pb-program-card__body[data-switch-program]');
    if (!body) return;
    const card = body.closest('[data-program-card]');
    if (!card || card.classList.contains('is-active') || card.classList.contains('is-collapsed')) return;
    const programId = body.getAttribute('data-switch-program');
    if (!programId) return;
    switchProgram(programId).catch((err) => console.error(err));
  });
}

function renderLibraryRows(rows, activeId) {
  const library = libraryEl();
  if (!library) return;

  const signature = rowsSignature(rows, activeId);
  if (signature === lastRenderedSignature && library.querySelector('.pb-program-list, .pb-side-card__empty')) {
    library.hidden = false;
    return;
  }
  lastRenderedSignature = signature;

  if (!rows.length) {
    library.hidden = false;
    library.innerHTML = `
      <h2 class="pb-side-card__title">Your diet plans</h2>
      <p class="pb-side-card__empty">No purchased plans yet.</p>`;
    return;
  }

  library.hidden = false;
  library.innerHTML = `
    <h2 class="pb-side-card__title">Your diet plans</h2>
    <div class="pb-program-list">
      ${rows.map((row) => renderSidebarProgramCard(row, {
        isActive: row.id === activeId,
        isOpening: row.id === openingProgramId,
        isCollapsed: isProgramCardCollapsed(row.id),
      })).join('')}
    </div>`;
}

export async function refreshProgramLibrary({
  activeProgramId = getActiveProgramId(),
  programPackage = null,
} = {}) {
  bindLibraryEvents();

  const email = resolveProgramEmail(programPackage);
  if (!isValidEmail(email)) {
    const library = libraryEl();
    if (library) library.hidden = true;
    lastRenderedSignature = '';
    return [];
  }

  const cached = readLibraryCache(email);
  if (cached?.rows?.length) {
    renderLibraryRows(cached.rows, activeProgramId);
  }

  const result = await fetchProgramHistoryFromServer(email);
  if (!result.ok) {
    const library = libraryEl();
    if (library) {
      if (!library.querySelector('.pb-program-list, .pb-program-card')) {
        library.hidden = false;
        library.innerHTML = `
          <h2 class="pb-side-card__title">Your diet plans</h2>
          <p class="pb-side-card__error">${result.message || 'Could not load your plans.'}</p>`;
      }
    }
    return [];
  }

  const rows = sortProgramHistory(summarizePaidPrograms(result.programs), activeProgramId);
  renderLibraryRows(rows, activeProgramId);
  writeLibraryCache(email, rows, activeProgramId);
  return rows;
}

export function initProgramLibrary({ onSwitch, beforeSwitch, getProgramPackage } = {}) {
  switchHandler = onSwitch || null;
  beforeSwitchHandler = beforeSwitch || null;
  getProgramPackageHandler = getProgramPackage || null;
  bindLibraryEvents();
}

export async function switchProgram(programId, { programPackage = null } = {}) {
  const activeId = getActiveProgramId();
  if (!programId || programId === activeId) return { ok: true, switched: false };

  const pkg = programPackage
    || (typeof getProgramPackageHandler === 'function' ? getProgramPackageHandler() : null);
  const email = resolveProgramEmail(pkg);
  if (!isValidEmail(email)) {
    return { ok: false, message: 'Sign in with your program email first.' };
  }

  openingProgramId = programId;
  await refreshProgramLibrary({ activeProgramId: activeId, programPackage: pkg });

  if (beforeSwitchHandler) {
    await beforeSwitchHandler();
  }

  const result = await fetchProgramByIdFromServer(email, programId);
  if (!result.ok || !result.package) {
    openingProgramId = null;
    await refreshProgramLibrary({ activeProgramId: activeId, programPackage: pkg });
    return { ok: false, message: result.message || 'Could not load that plan.' };
  }

  setActiveProgramId(programId);
  persistProgramBridge(result.package);
  await flushProgramPersist(result.package);

  openingProgramId = null;

  if (switchHandler) {
    await switchHandler(result.package);
  }

  await refreshProgramLibrary({ activeProgramId: programId, programPackage: result.package });
  return { ok: true, switched: true, package: result.package };
}

/** Shared sidebar boot — program report (pages 1–3) and menu planner (page 4). */
export function bootProgramBridgeAside({
  getProgramPackage,
  onSwitch,
  beforeSwitch,
  openAccessGate,
} = {}) {
  if (typeof openAccessGate === 'function') {
    window.__bnbOpenAccessGate = openAccessGate;
  }

  initProgramLibrary({ onSwitch, beforeSwitch, getProgramPackage });

  const pkg = typeof getProgramPackage === 'function' ? getProgramPackage() : null;
  syncProgramEmail(pkg);

  return refreshProgramLibrary({
    activeProgramId: pkg?.program?.id || getActiveProgramId(),
    programPackage: pkg,
  });
}
