import { ASSET_VERSION } from '../../js/assetVersion.js';
import { plannerStateFromPackage } from '../../js/menuPlannerState.js';
import { setActiveProgramId } from '../../js/programActive.js';
import {
  state,
  initMealSlotsFromProgram,
  applyPlannerState,
  persistPlannerToProgram,
} from './plannerState.js';
import {
  renderPlannerMeta,
  renderPlannerWorkspace,
  initWeekGrid,
  initWeekGridCollapse,
  initSaveMealDialog,
  initClearDayMenu,
  initClearWeekMenu,
  initFoodSearch,
  initFoodDropTargets,
} from './plannerViews.js';
import { initPrintShop } from './plannerPrint.js';

let plannerShellReady = false;
let plannerBootPromise = null;

function applyProgramPackage(pkg) {
  state.programPackage = pkg;
  if (state.programPackage?.program?.id) {
    setActiveProgramId(state.programPackage.program.id);
  }
  applyPlannerState(plannerStateFromPackage(state.programPackage));
  initMealSlotsFromProgram(state.programPackage);
  renderPlannerMeta();
  if (plannerShellReady) {
    renderPlannerWorkspace();
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
    initWeekGrid();
    initWeekGridCollapse();
    initSaveMealDialog();
    initClearDayMenu();
    initClearWeekMenu();
    initFoodSearch();
    initPrintShop();
    initFoodDropTargets();
    plannerShellReady = true;
  })();

  await plannerBootPromise;
}

window.addEventListener('beforeunload', () => {
  persistPlannerToProgram({ immediate: true });
});
