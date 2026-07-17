import { ASSET_VERSION as FALLBACK_ASSET_VERSION } from '../../js/assetVersion.js';
import { plannerStateFromPackage } from '../../js/menuPlannerState.js';
import { setActiveProgramId } from '../../js/programActive.js';
import {
  state,
  initMealSlotsFromProgram,
  applyPlannerState,
  persistPlannerToProgram,
  normalizeMealMakerDraft,
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
  applyPlannerState(plannerStateFromPackage(state.programPackage), {
    preserveSessionUi: plannerShellReady,
  });
  normalizeMealMakerDraft();
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

export function refreshMenuPlannerDisplay() {
  if (!views || !plannerShellReady) return;
  views.renderPlannerMeta();
  views.renderPlannerWorkspace();
}

export function isMenuPlannerHydrated() {
  return plannerShellReady && Boolean(state.programPackage?.program?.id);
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
    let foodsLoadError = null;
    try {
      const response = await fetch(`../data/foods.json?v=${ASSET_VERSION}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Could not load foods catalog.');
      }
      state.foods = await response.json();
    } catch (err) {
      foodsLoadError = err;
      state.foods = Array.isArray(state.foods) ? state.foods : [];
      console.error(err);
    }

    const plannerViews = await loadViews();
    plannerViews.initWeekGrid();
    plannerViews.initWeekGridCollapse();
    plannerViews.initSaveMealDialog();
    plannerViews.initClearMealMaker();
    plannerViews.initClearWeekMenu();
    plannerViews.initFoodSearch();
    plannerViews.initSavedMealsPanel();
    const { initPrintShop } = await import(`./plannerPrint.js?v=${ASSET_VERSION}`);
    initPrintShop();
    plannerViews.initFoodDropTargets();
    plannerShellReady = true;

    if (foodsLoadError) {
      plannerViews.showPlannerToast('Could not load foods. Refresh the page to try again.', {
        variant: 'error',
      });
    }
  })();

  try {
    await plannerBootPromise;
  } catch (err) {
    plannerBootPromise = null;
    throw err;
  }
}

window.addEventListener('beforeunload', () => {
  persistPlannerToProgram({ immediate: true });
});
