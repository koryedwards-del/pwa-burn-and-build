import { ASSET_VERSION as FALLBACK_ASSET_VERSION } from '../../js/assetVersion.js';
import { plannerStateFromPackage } from '../../js/menuPlannerState.js';
import { setActiveProgramId } from '../../js/programActive.js';
import {
  state,
  initMealSlotsFromProgram,
  applyPlannerState,
  persistPlannerToProgram,
} from './plannerState.js';

const ASSET_VERSION = new URL(import.meta.url).searchParams.get('v') || FALLBACK_ASSET_VERSION;

let plannerShellReady = false;
let plannerBootPromise = null;
let views = null;

async function loadViews() {
  if (!views) {
    views = await import(`./plannerViews.js?v=${ASSET_VERSION}`);
  }
  return views;
}

function applyProgramPackage(pkg) {
  state.programPackage = pkg;
  if (state.programPackage?.program?.id) {
    setActiveProgramId(state.programPackage.program.id);
  }
  applyPlannerState(plannerStateFromPackage(state.programPackage));
  initMealSlotsFromProgram(state.programPackage);
  if (!views) return;
  views.renderPlannerMeta();
  if (plannerShellReady) {
    views.renderPlannerWorkspace();
  }
}

export function applyMenuPlannerProgram(pkg) {
  applyProgramPackage(pkg);
}

export function persistMenuPlannerState() {
  persistPlannerToProgram({ immediate: true });
}

export async function bootMenuPlannerPage() {
  if (plannerShellReady) return;
  if (plannerBootPromise) {
    await plannerBootPromise;
    return;
  }

  plannerBootPromise = (async () => {
    const response = await fetch(`../data/foods.json?v=${ASSET_VERSION}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Could not load foods catalog.');
    }
    state.foods = await response.json();
    const plannerViews = await loadViews();
    plannerViews.initWeekGrid();
    plannerViews.initWeekGridCollapse();
    plannerViews.initSaveMealDialog();
    plannerViews.initClearDayMenu();
    plannerViews.initClearWeekMenu();
    plannerViews.initFoodSearch();
    const { initPrintShop } = await import(`./plannerPrint.js?v=${ASSET_VERSION}`);
    initPrintShop();
    plannerViews.initFoodDropTargets();
    plannerShellReady = true;
  })();

  await plannerBootPromise;
}

window.addEventListener('beforeunload', () => {
  persistPlannerToProgram({ immediate: true });
});
