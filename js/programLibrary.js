/** Sidebar — purchased diet plans + quick links; switch active program. */

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
import { programLinksHtml } from './programBridgeUi.js';

function libraryEl() {
  return document.getElementById('program-library');
}

function linksEl() {
  return document.getElementById('program-links');
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

function bindLibraryEvents() {
  const library = libraryEl();
  if (!library || library.dataset.bound === '1') return;
  library.dataset.bound = '1';

  library.addEventListener('click', (event) => {
    const button = event.target.closest('[data-switch-program]');
    if (!button || button.disabled) return;
    const programId = button.getAttribute('data-switch-program');
    switchProgram(programId).catch((err) => console.error(err));
  });
}

function bindLinksEvents() {
  const links = linksEl();
  if (!links || links.dataset.bound === '1') return;
  links.dataset.bound = '1';

  links.addEventListener('click', (event) => {
    const button = event.target.closest('[data-open-access-gate]');
    if (!button) return;
    event.preventDefault();
    if (typeof window.__bnbOpenAccessGate === 'function') {
      window.__bnbOpenAccessGate();
    } else {
      window.location.href = '/menuplanner/';
    }
  });
}

function renderLibraryLoading() {
  const library = libraryEl();
  if (!library) return;
  library.hidden = false;
  library.innerHTML = `
    <h2 class="pb-side-card__title">Your diet plans</h2>
    <p class="pb-side-card__loading">Loading plans…</p>`;
}

function renderLibraryRows(rows, activeId) {
  const library = libraryEl();
  if (!library) return;

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
      })).join('')}
    </div>`;
}

function renderLinks() {
  const links = linksEl();
  if (!links) return;
  links.hidden = false;
  links.innerHTML = programLinksHtml();
}

export async function refreshProgramLibrary({
  activeProgramId = getActiveProgramId(),
  programPackage = null,
} = {}) {
  bindLibraryEvents();
  bindLinksEvents();
  renderLinks();

  const email = resolveProgramEmail(programPackage);
  if (!isValidEmail(email)) {
    const library = libraryEl();
    if (library) library.hidden = true;
    return [];
  }

  renderLibraryLoading();

  const result = await fetchProgramHistoryFromServer(email);
  if (!result.ok) {
    const library = libraryEl();
    if (library) {
      library.innerHTML = `
        <h2 class="pb-side-card__title">Your diet plans</h2>
        <p class="pb-side-card__error">${result.message || 'Could not load your plans.'}</p>`;
    }
    return [];
  }

  const rows = sortProgramHistory(summarizePaidPrograms(result.programs), activeProgramId);
  renderLibraryRows(rows, activeProgramId);
  return rows;
}

export function initProgramLibrary({ onSwitch, beforeSwitch, getProgramPackage } = {}) {
  switchHandler = onSwitch || null;
  beforeSwitchHandler = beforeSwitch || null;
  getProgramPackageHandler = getProgramPackage || null;
  bindLibraryEvents();
  bindLinksEvents();
  renderLinks();
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
