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
import { flushProgramPersist, scheduleProgramPersist } from './menuPlannerState.js';
import { programSettingsHtml } from './programBridgeUi.js';
import { generateMealSlots } from './burnEngine.js';
import { planFromPackage } from './programPackage.js';
import { formatWakeDisplay, wakeTimeFromParts } from './onboardingEngine.js';

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
let settingsChangeHandler = null;
let getProgramPackageHandler = null;
const expandedProgramCards = new Set();

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

function readWakeSettingsFromPanel(panel) {
  const hour = panel.querySelector('[data-wake-part="hour"]')?.value || '6';
  const minute = panel.querySelector('[data-wake-part="minute"]')?.value || '00';
  const ampm = panel.querySelector('[data-wake-part="ampm"]')?.value || 'AM';
  return wakeTimeFromParts(hour, minute, ampm);
}

function packageWithWakeSettings(pkg, { wakeTime, wakeEnabled }) {
  if (!pkg?.intake) return pkg;
  const nextWakeTime = wakeTime || pkg.intake.wakeTime || pkg.intake.defaultWakeTime || '06:00';
  const next = {
    ...pkg,
    intake: {
      ...pkg.intake,
      wakeTimeEnabled: wakeEnabled,
      wakeTime: nextWakeTime,
      defaultWakeTime: nextWakeTime,
    },
  };
  const plan = planFromPackage(next);
  if (plan) {
    const [wh, wm] = nextWakeTime.split(':').map(Number);
    next.plan = {
      ...next.plan,
      mealSlots: generateMealSlots(wh, wm, plan.servings),
    };
  }
  return next;
}

function updateWakePanelState(panel, { wakeEnabled, wakeTime }) {
  const toggle = panel.querySelector('[data-pb-wake-enabled]');
  const wakePanel = panel.querySelector('[data-pb-wake-panel]');
  const display = panel.querySelector('[data-pb-wake-display]');
  if (toggle) {
    toggle.classList.toggle('is-on', wakeEnabled);
    toggle.setAttribute('aria-pressed', wakeEnabled ? 'true' : 'false');
  }
  if (wakePanel) wakePanel.classList.toggle('is-disabled', !wakeEnabled);
  wakePanel?.querySelectorAll('[data-wake-part]').forEach((select) => {
    select.disabled = !wakeEnabled;
  });
  if (display && wakeTime) display.textContent = formatWakeDisplay(wakeTime);
}

async function applyWakeSettings(nextPkg) {
  persistProgramBridge(nextPkg);
  scheduleProgramPersist(nextPkg);
  if (settingsChangeHandler) {
    await settingsChangeHandler(nextPkg);
  }
  renderSettings(nextPkg);
}

function bindSettingsEvents() {
  const panel = linksEl();
  if (!panel || panel.dataset.bound === '1') return;
  panel.dataset.bound = '1';

  panel.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-pb-wake-enabled]');
    if (!toggle) return;
    event.preventDefault();
    const pkg = typeof getProgramPackageHandler === 'function' ? getProgramPackageHandler() : null;
    if (!pkg?.intake) return;
    const wakeEnabled = !toggle.classList.contains('is-on');
    const wakeTime = readWakeSettingsFromPanel(panel);
    applyWakeSettings(packageWithWakeSettings(pkg, { wakeTime, wakeEnabled }))
      .catch((err) => console.error(err));
  });

  panel.addEventListener('change', (event) => {
    const select = event.target.closest('[data-wake-part]');
    if (!select || select.disabled) return;
    const pkg = typeof getProgramPackageHandler === 'function' ? getProgramPackageHandler() : null;
    if (!pkg?.intake || pkg.intake.wakeTimeEnabled === false) return;
    const wakeTime = readWakeSettingsFromPanel(panel);
    updateWakePanelState(panel, { wakeEnabled: true, wakeTime });
    applyWakeSettings(packageWithWakeSettings(pkg, { wakeTime, wakeEnabled: true }))
      .catch((err) => console.error(err));
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
        isCollapsed: isProgramCardCollapsed(row.id),
      })).join('')}
    </div>`;
}

function renderSettings(programPackage = null) {
  const links = linksEl();
  if (!links) return;
  const pkg = programPackage
    || (typeof getProgramPackageHandler === 'function' ? getProgramPackageHandler() : null);
  links.hidden = false;
  links.innerHTML = programSettingsHtml(pkg);
}

export async function refreshProgramLibrary({
  activeProgramId = getActiveProgramId(),
  programPackage = null,
} = {}) {
  bindLibraryEvents();
  bindSettingsEvents();
  renderSettings(programPackage);

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

export function initProgramLibrary({ onSwitch, beforeSwitch, onSettingsChange, getProgramPackage } = {}) {
  switchHandler = onSwitch || null;
  beforeSwitchHandler = beforeSwitch || null;
  settingsChangeHandler = onSettingsChange || null;
  getProgramPackageHandler = getProgramPackage || null;
  bindLibraryEvents();
  bindSettingsEvents();
  renderSettings(typeof getProgramPackage === 'function' ? getProgramPackage() : null);
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
  onSettingsChange,
  openAccessGate,
} = {}) {
  if (typeof openAccessGate === 'function') {
    window.__bnbOpenAccessGate = openAccessGate;
  }

  initProgramLibrary({ onSwitch, beforeSwitch, onSettingsChange, getProgramPackage });

  const pkg = typeof getProgramPackage === 'function' ? getProgramPackage() : null;
  syncProgramEmail(pkg);

  return refreshProgramLibrary({
    activeProgramId: pkg?.program?.id || getActiveProgramId(),
    programPackage: pkg,
  });
}
