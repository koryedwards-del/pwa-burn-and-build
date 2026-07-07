/** My Plan PWA — daily food plan app at /myplan/ */

import { computePlan, generateMealSlots } from './burnEngine.js';
import { getCoachDay } from './coachEngine.js';
import {
  buildGroceryFromEntries,
  createManualGroceryItem,
  entriesLast7Days,
  formatGroceryQuantity,
  groceryDateRangeLabel,
  groceryDisplayName,
  groupGroceryItems,
} from './groceryEngine.js';
import { bindOnboardingEvents, initOnboardingForm, renderOnboarding } from './onboardingUI.js';
import {
  formatWakeDisplay,
  parseWakeTime,
  totalOnboardingPages,
  wakeTimeFromParts,
} from './onboardingEngine.js';
import { computeWhatsPossible } from './previewCalculator.js';
import {
  getProgramDay,
  importProgramPackage,
  mealSlotsFromProgram,
  parseImportFromUrl,
  parseProgramPackageJson,
  planFromPackage,
  wakeTimeFromProgram,
} from './programPackage.js';
import {
  fetchProgramByIdFromServer,
  fetchProgramFromServer,
  fetchProgramHistoryFromServer,
  getAppEmail,
  isValidEmail,
  persistAppEmail,
} from './programApi.js';

const store = {
  profile: null,
  program: null,
  settings: null,
  entries: [],
  foods: [],
  pickCounts: {},
  screen: 'loading',
  expandedMeal: null,
  expandedSections: {},
  sectionTabs: {},
  foodSearch: {},
  coachCardIndex: 0,
  coachProgress: { day1Complete: false },
  groceryItems: [],
  groceryChecked: {},
  groceryRemoved: {},
  groceryExtras: [],
  showGroceryAdd: false,
  groceryAddTab: 'protein',
  groceryAddSearch: '',
  onboardingPage: 0,
  onboardingEditMode: false,
  onboardingForm: null,
  importError: null,
  programHistory: [],
  programHistoryLoading: false,
  programHistoryError: null,
  programHistoryOpenId: null,
  expandedNavButton: null,
};

function hasActiveProgram() {
  return !!store.program?.plan?.servings;
}

function hasCompletedOnboarding() {
  return hasActiveProgram() || localStorage.getItem('bnb_onboarding_complete') === 'true';
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sectionKey(slotLabel, sectionId) {
  return `${slotLabel}|${sectionId}`;
}

function load() {
  try {
    const prog = localStorage.getItem('bnb_program');
    if (prog) store.program = JSON.parse(prog);
    const settings = localStorage.getItem('bnb_settings');
    if (settings) store.settings = JSON.parse(settings);
    ensureSettings();
    const p = localStorage.getItem('bnb_profile');
    if (p) store.profile = JSON.parse(p);
    const e = localStorage.getItem('bnb_entries');
    if (e) store.entries = JSON.parse(e);
    const c = localStorage.getItem('bnb_pick_counts');
    if (c) store.pickCounts = JSON.parse(c);
    const cp = localStorage.getItem('bnb_coach_progress');
    if (cp) store.coachProgress = JSON.parse(cp);
    const gc = localStorage.getItem('bnb_grocery_checked');
    if (gc) store.groceryChecked = JSON.parse(gc);
    const gr = localStorage.getItem('bnb_grocery_removed');
    if (gr) store.groceryRemoved = JSON.parse(gr);
    const ge = localStorage.getItem('bnb_grocery_extras');
    if (ge) store.groceryExtras = JSON.parse(ge);
  } catch (err) {
    console.error(err);
  }
}

function saveGroceryState() {
  localStorage.setItem('bnb_grocery_checked', JSON.stringify(store.groceryChecked));
  localStorage.setItem('bnb_grocery_removed', JSON.stringify(store.groceryRemoved));
  localStorage.setItem('bnb_grocery_extras', JSON.stringify(store.groceryExtras));
}

function saveProgram() {
  if (store.program) localStorage.setItem('bnb_program', JSON.stringify(store.program));
}

function saveSettings() {
  if (store.settings) localStorage.setItem('bnb_settings', JSON.stringify(store.settings));
}

function ensureSettings() {
  if (!store.settings || typeof store.settings !== 'object') {
    store.settings = {};
  }
}

function canEditWakeTime() {
  return hasActiveProgram() || !!getPlan();
}

function currentWakeTime() {
  ensureSettings();
  if (store.program) return wakeTimeFromProgram(store.program, store.settings);
  return store.settings.wakeTime || store.profile?.wakeTime || '08:00';
}

function displayName() {
  return store.program?.intake?.preferredName || store.profile?.preferredName || '';
}

function saveProfile() {
  localStorage.setItem('bnb_profile', JSON.stringify(store.profile));
}

function saveEntries() {
  localStorage.setItem('bnb_entries', JSON.stringify(store.entries));
}

function savePickCounts() {
  localStorage.setItem('bnb_pick_counts', JSON.stringify(store.pickCounts));
}

function saveCoachProgress() {
  localStorage.setItem('bnb_coach_progress', JSON.stringify(store.coachProgress));
}

function currentProgramDay() {
  if (store.program) return getProgramDay(store.program);
  return 1;
}

function markCoachDayComplete(dayNumber) {
  if (dayNumber === 1 && !store.coachProgress.day1Complete) {
    store.coachProgress.day1Complete = true;
    saveCoachProgress();
  }
}

function refreshGroceryList() {
  const fromLogs = buildGroceryFromEntries(entriesLast7Days(store.entries), store.foods);
  const logNames = new Set(fromLogs.map((i) => i.foodName));
  const extras = store.groceryExtras.filter((e) => !logNames.has(e.foodName));
  store.groceryItems = [...fromLogs, ...extras]
    .filter((i) => !store.groceryRemoved[i.id])
    .map((i) => ({ ...i, isChecked: !!store.groceryChecked[i.id] }));
}

function toggleGroceryCheck(id) {
  store.groceryChecked[id] = !store.groceryChecked[id];
  const item = store.groceryItems.find((i) => i.id === id);
  if (item) item.isChecked = store.groceryChecked[id];
  saveGroceryState();
  render();
}

function removeGroceryItem(id) {
  store.groceryRemoved[id] = true;
  store.groceryItems = store.groceryItems.filter((i) => i.id !== id);
  saveGroceryState();
  render();
}

function addGroceryFood(foodName) {
  const food = store.foods.find((f) => f.name === foodName);
  if (!food) return;
  const names = new Set(store.groceryItems.map((i) => i.foodName));
  if (names.has(food.name)) return;
  const item = { ...createManualGroceryItem(food), isChecked: false };
  store.groceryExtras.push(item);
  store.groceryItems.push(item);
  saveGroceryState();
  render();
}

function uncheckAllGrocery() {
  store.groceryChecked = {};
  store.groceryItems.forEach((i) => { i.isChecked = false; });
  saveGroceryState();
  render();
}

function bumpPickCount(foodName) {
  store.pickCounts[foodName] = (store.pickCounts[foodName] || 0) + 1;
  savePickCounts();
}

function fmtServings(n) {
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  return n.toFixed(1);
}

function scaledLabel(food, servings) {
  if (food.unitsPerServing > 0) {
    const count = Math.ceil(food.unitsPerServing * servings);
    return `${count} ${food.servingDescription}`;
  }
  return `${Math.round(food.gramWeight * servings)} g`;
}

function foodsForCategories(cats) {
  return store.foods.filter((f) => cats.includes(f.category));
}

function topPicks(foods, limit = 5) {
  return foods
    .filter((f) => (store.pickCounts[f.name] || 0) > 0)
    .sort((a, b) => (store.pickCounts[b.name] || 0) - (store.pickCounts[a.name] || 0))
    .slice(0, limit);
}

function todayEntries() {
  const key = todayKey();
  return store.entries.filter((e) => e.date === key);
}

function getPlan() {
  if (store.program) return planFromPackage(store.program);
  if (!store.profile?.leanBodyMass) return null;
  const p = store.profile;
  return computePlan({
    lbm: p.leanBodyMass,
    intensity: p.workIntensity,
    weightTrainingHours: p.weightTrainingHours,
    cardioHours: p.cardioHours,
    fatBurningHours: p.fatBurningHours,
  });
}

function getMealSlots(plan) {
  if (store.program) return mealSlotsFromProgram(store.program, store.settings);
  const wake = store.settings?.wakeTime || store.profile?.wakeTime || '08:00';
  const [wh, wm] = wake.split(':').map(Number);
  return generateMealSlots(wh, wm, plan.servings);
}

function applyImportedProgram(pkg) {
  const result = importProgramPackage(pkg);
  if (!result.ok) {
    store.importError = result.errors.join(' ');
    return false;
  }
  store.program = result.program;
  store.settings = JSON.parse(localStorage.getItem('bnb_settings') || '{}');
  store.importError = null;
  store.expandedNavButton = null;
  const email = pkg?.intake?.email || getAppEmail();
  if (isValidEmail(email)) persistAppEmail(email);
  saveProgram();
  return true;
}

async function syncProgramFromServer() {
  const email = getAppEmail();
  if (!isValidEmail(email)) return false;
  const result = await fetchProgramFromServer(email);
  if (result.ok && result.package) {
    return applyImportedProgram(result.package);
  }
  return false;
}

function fatPointsConsumed() {
  return todayEntries()
    .filter((e) => e.category === 'Fats')
    .reduce((s, e) => s + (e.fatPoints || 1), 0);
}

function logFood(slotLabel, category, food, servings, { collapseSection } = {}) {
  const key = todayKey();
  if (category !== 'Fats') {
    store.entries = store.entries.filter(
      (e) => !(e.date === key && e.mealSlotLabel === slotLabel && e.category === category)
    );
  }
  store.entries.unshift({
    id: crypto.randomUUID(),
    date: key,
    mealSlotLabel: slotLabel,
    category,
    foodName: food.name,
    servingLabel: category === 'Fats' ? food.servingDescription : scaledLabel(food, servings),
    fatPoints: category === 'Fats' ? 1 : 0,
    loggedAt: Date.now(),
  });
  bumpPickCount(food.name);
  saveEntries();
  if (collapseSection) {
    store.expandedSections[collapseSection] = false;
  }
  render();
}

function removeEntry(id) {
  store.entries = store.entries.filter((e) => e.id !== id);
  saveEntries();
  render();
}

function removeCategoryEntry(slotLabel, category) {
  const key = todayKey();
  store.entries = store.entries.filter(
    (e) => !(e.date === key && e.mealSlotLabel === slotLabel && e.category === category)
  );
  saveEntries();
  render();
}

function removeOneFat(slotLabel, foodName) {
  const key = todayKey();
  const idx = store.entries.findIndex(
    (e) => e.date === key && e.mealSlotLabel === slotLabel && e.category === 'Fats' && e.foodName === foodName
  );
  if (idx >= 0) {
    store.entries.splice(idx, 1);
    saveEntries();
    render();
  }
}

function entryFor(slotLabel, category) {
  return todayEntries().find((e) => e.mealSlotLabel === slotLabel && e.category === category);
}

function entriesFor(slotLabel, category) {
  return todayEntries().filter((e) => e.mealSlotLabel === slotLabel && e.category === category);
}

function isSectionOpen(slotLabel, sectionId) {
  return !!store.expandedSections[sectionKey(slotLabel, sectionId)];
}

function filterFoods(foods, searchKey) {
  const q = (store.foodSearch[searchKey] || '').trim().toLowerCase();
  if (!q) return foods;
  return foods.filter((f) => f.name.toLowerCase().includes(q));
}

function renderFoodRows(slotLabel, category, servings, foods, loggedName, sk) {
  const picks = topPicks(foods);
  const pickNames = new Set(picks.map((f) => f.name));
  const rest = foods.filter((f) => !pickNames.has(f.name));
  const filteredPicks = filterFoods(picks, sk);
  const filteredRest = filterFoods(rest, sk);

  const row = (food) => {
    const logged = food.name === loggedName;
    const label = category === 'Fats' ? food.servingDescription : scaledLabel(food, servings || 1);
    return `
      <button type="button" class="food-row ${logged ? 'logged' : ''}"
        data-log-slot="${slotLabel}" data-log-category="${category}" data-log-servings="${servings || 1}"
        data-log-food="${encodeURIComponent(food.name)}" data-collapse="${sk}">
        <span class="food-row-indicator" aria-hidden="true"></span>
        <span class="food-row-name">${food.name}</span>
        <span class="food-row-label">${label}</span>
      </button>`;
  };

  let html = '';
  if (filteredPicks.length) {
    html += `<div class="top-picks-label">★ Your Top Picks</div>`;
    html += filteredPicks.map(row).join('');
    if (filteredRest.length) html += `<div class="food-divider"></div>`;
  }
  html += filteredRest.map(row).join('');
  if (!filteredPicks.length && !filteredRest.length) {
    html += `<div class="food-empty">No foods match your search</div>`;
  }
  return html;
}

function renderCategorySection(slotLabel, sectionId, title, category, servings, foodCats) {
  const sk = sectionKey(slotLabel, sectionId);
  const open = isSectionOpen(slotLabel, sectionId);
  const logged = entryFor(slotLabel, category);
  const foods = foodsForCategories(foodCats).sort((a, b) => a.name.localeCompare(b.name));

  return `
    <div class="cat-section ${logged ? 'has-logged' : ''}">
      <button type="button" class="cat-header" data-toggle-section="${sk}">
        <div class="cat-header-main">
          <span class="cat-header-title">${title}</span>
          <span class="cat-header-servings">${fmtServings(servings)} Servings</span>
          <span class="cat-chevron">${open ? '▲' : '▼'}</span>
        </div>
        ${logged ? `<div class="cat-header-logged">${logged.foodName} · ${logged.servingLabel}</div>` : ''}
      </button>
      ${open ? `
      <div class="cat-body">
        ${logged ? `
          <button type="button" class="none-btn" data-clear-slot="${slotLabel}" data-clear-category="${category}" data-collapse="${sk}">None — clear selection</button>
          <div class="food-divider"></div>` : ''}
        <input type="search" class="food-search" placeholder="Search foods…" data-search="${sk}" value="${store.foodSearch[sk] || ''}" />
        <div class="food-hint">Tap a food to log it</div>
        <div class="food-list">${renderFoodRows(slotLabel, category, servings, foods, logged?.foodName, sk)}</div>
      </div>` : ''}
    </div>`;
}

function renderProteinSection(slotLabel, servings) {
  const sectionId = 'Protein';
  const sk = sectionKey(slotLabel, sectionId);
  const open = isSectionOpen(slotLabel, sectionId);
  const tab = store.sectionTabs[sk] || 'protein';
  const logged = entryFor(slotLabel, 'Protein');
  const proteins = foodsForCategories(['protein']).sort((a, b) => a.name.localeCompare(b.name));
  const dairy = foodsForCategories(['dairy']).sort((a, b) => a.name.localeCompare(b.name));
  const activeFoods = tab === 'protein' ? proteins : dairy;

  return `
    <div class="cat-section ${logged ? 'has-logged' : ''}">
      <button type="button" class="cat-header" data-toggle-section="${sk}">
        <div class="cat-header-main">
          <span class="cat-header-title">Protein</span>
          <span class="cat-header-servings">${fmtServings(servings)} Servings</span>
          <span class="cat-chevron">${open ? '▲' : '▼'}</span>
        </div>
        ${logged ? `<div class="cat-header-logged">${logged.foodName} · ${logged.servingLabel}</div>` : ''}
      </button>
      ${open ? `
      <div class="cat-body">
        ${logged ? `
          <button type="button" class="none-btn" data-clear-slot="${slotLabel}" data-clear-category="Protein" data-collapse="${sk}">None — clear selection</button>
          <div class="food-divider"></div>` : ''}
        <div class="cat-tabs">
          <button type="button" class="${tab === 'protein' ? 'active' : ''}" data-tab-key="${sk}" data-tab-val="protein">Protein</button>
          <button type="button" class="${tab === 'dairy' ? 'active' : ''}" data-tab-key="${sk}" data-tab-val="dairy">Dairy</button>
        </div>
        <input type="search" class="food-search" placeholder="Search ${tab === 'protein' ? 'proteins' : 'dairy'}…" data-search="${sk}" value="${store.foodSearch[sk] || ''}" />
        <div class="food-hint">Tap a food to log it</div>
        <div class="food-list">${renderFoodRows(slotLabel, 'Protein', servings, activeFoods, logged?.foodName, sk)}</div>
      </div>` : ''}
    </div>`;
}

function renderGrainSection(slotLabel, servings) {
  const sectionId = 'Grains';
  const sk = sectionKey(slotLabel, sectionId);
  const open = isSectionOpen(slotLabel, sectionId);
  const tab = store.sectionTabs[sk] || 'starch';
  const logged = entryFor(slotLabel, 'Grains / Starches');
  const starches = foodsForCategories(['starch']).sort((a, b) => a.name.localeCompare(b.name));
  const grains = foodsForCategories(['grain']).sort((a, b) => a.name.localeCompare(b.name));
  const activeFoods = tab === 'starch' ? starches : grains;

  return `
    <div class="cat-section ${logged ? 'has-logged' : ''}">
      <button type="button" class="cat-header" data-toggle-section="${sk}">
        <div class="cat-header-main">
          <span class="cat-header-title">Grains / Starches</span>
          <span class="cat-header-servings">${fmtServings(servings)} Servings</span>
          <span class="cat-chevron">${open ? '▲' : '▼'}</span>
        </div>
        ${logged ? `<div class="cat-header-logged">${logged.foodName} · ${logged.servingLabel}</div>` : ''}
      </button>
      ${open ? `
      <div class="cat-body">
        ${logged ? `
          <button type="button" class="none-btn" data-clear-slot="${slotLabel}" data-clear-category="Grains / Starches" data-collapse="${sk}">None — clear selection</button>
          <div class="food-divider"></div>` : ''}
        <div class="cat-tabs">
          <button type="button" class="${tab === 'starch' ? 'active' : ''}" data-tab-key="${sk}" data-tab-val="starch">Starches</button>
          <button type="button" class="${tab === 'grain' ? 'active' : ''}" data-tab-key="${sk}" data-tab-val="grain">Grains</button>
        </div>
        <input type="search" class="food-search" placeholder="Search ${tab === 'starch' ? 'starches' : 'grains'}…" data-search="${sk}" value="${store.foodSearch[sk] || ''}" />
        <div class="food-hint">Tap a food to log it</div>
        <div class="food-list">${renderFoodRows(slotLabel, 'Grains / Starches', servings, activeFoods, logged?.foodName, sk)}</div>
      </div>` : ''}
    </div>`;
}

function groupedFatEntries(slotLabel) {
  const entries = entriesFor(slotLabel, 'Fats');
  const map = {};
  for (const e of entries) {
    if (map[e.foodName]) map[e.foodName].count += 1;
    else map[e.foodName] = { serving: e.servingLabel, count: 1 };
  }
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderExtraFatsSection(slotLabel) {
  const sectionId = 'Fats';
  const sk = sectionKey(slotLabel, sectionId);
  const open = isSectionOpen(slotLabel, sectionId);
  const grouped = groupedFatEntries(slotLabel);
  const totalPts = grouped.reduce((s, g) => s + g.count, 0);
  const foods = foodsForCategories(['fat']).sort((a, b) => a.name.localeCompare(b.name));

  return `
    <div class="cat-section fats-section ${grouped.length ? 'has-logged' : ''}">
      <button type="button" class="cat-header" data-toggle-section="${sk}">
        <div class="cat-header-main">
          <span class="cat-header-title">Extra Fats</span>
          ${totalPts ? `<span class="fat-pts-badge">${totalPts.toFixed(1)} Servings</span>` : ''}
          <span class="cat-chevron">${open ? '▲' : '▼'}</span>
        </div>
        ${grouped.length
          ? grouped.map((g) => `<div class="cat-header-logged">${g.name} · ${g.serving}${g.count > 1 ? ` ×${g.count}` : ''}</div>`).join('')
          : `<div class="cat-header-hint">slows your fat loss</div>`}
      </button>
      ${open ? `
      <div class="cat-body">
        ${grouped.map((g) => `
          <button type="button" class="remove-fat-btn" data-remove-fat-slot="${slotLabel}" data-remove-fat-name="${encodeURIComponent(g.name)}">
            − Remove one ${g.name}${g.count > 1 ? ` (×${g.count})` : ''}
          </button>`).join('')}
        ${grouped.length ? `<div class="food-divider"></div>` : ''}
        <input type="search" class="food-search" placeholder="Search fats…" data-search="${sk}" value="${store.foodSearch[sk] || ''}" />
        <div class="food-hint">Tap to add a fat serving</div>
        <div class="food-list">${renderFatRows(slotLabel, foods, grouped, sk)}</div>
      </div>` : ''}
    </div>`;
}

function renderFatRows(slotLabel, foods, grouped, sk) {
  const counts = Object.fromEntries(grouped.map((g) => [g.name, g.count]));
  const picks = topPicks(foods);
  const pickNames = new Set(picks.map((f) => f.name));
  const rest = foods.filter((f) => !pickNames.has(f.name));
  const filteredPicks = filterFoods(picks, sk);
  const filteredRest = filterFoods(rest, sk);

  const row = (food) => {
    const count = counts[food.name] || 0;
    return `
      <button type="button" class="food-row ${count ? 'logged' : ''}"
        data-log-slot="${slotLabel}" data-log-category="Fats" data-log-servings="1"
        data-log-food="${encodeURIComponent(food.name)}">
        <span class="food-row-indicator" aria-hidden="true"></span>
        <span class="food-row-name">${food.name}${count > 1 ? ` ×${count}` : ''}</span>
        <span class="food-row-label">${food.servingDescription}</span>
      </button>`;
  };

  let html = '';
  if (filteredPicks.length) {
    html += `<div class="top-picks-label">★ Your Top Picks</div>`;
    html += filteredPicks.map(row).join('');
    if (filteredRest.length) html += `<div class="food-divider"></div>`;
  }
  html += filteredRest.map(row).join('');
  if (!filteredPicks.length && !filteredRest.length) {
    html += `<div class="food-empty">No foods match your search</div>`;
  }
  return html;
}

function mealProgress(slot) {
  const required = [];
  if (slot.proteinServings > 0) required.push('Protein');
  if (slot.grainStarchServings > 0) required.push('Grains / Starches');
  if (slot.vegetableServings > 0) required.push('Vegetables');
  if (slot.fruitServings > 0) required.push('Fruits');
  const logged = required.filter((cat) => entryFor(slot.label, cat));
  return { required: required.length, logged: logged.length };
}

const NAV_MENU_LABELS = {
  plan: 'Your Custom Food Plan',
  grocery: 'Grocery List',
  projections: 'Projections',
  'previous-plans': 'Previous Food Plans',
};

function canOpenNav(nav) {
  if (nav === 'plan') return !!getPlan();
  if (nav === 'projections') return !!getUserIntake();
  return true;
}

function renderHomeNavButton(nav) {
  const label = NAV_MENU_LABELS[nav];
  if (store.expandedNavButton === nav && !canOpenNav(nav)) {
    return `<a href="../createyourfoodplan/" class="btn-home btn-home-build">Tap here to create your custom food plan</a>`;
  }
  if (canOpenNav(nav)) {
    return `<button type="button" class="btn-home" data-nav="${nav}">${label}</button>`;
  }
  return `<button type="button" class="btn-home" data-expand-nav="${nav}">${label}</button>`;
}

function renderWakePickerSettings(wakeTime) {
  const { hour12, minute, ampm } = parseWakeTime(wakeTime);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const hourOpts = hours.map((h) => `<option value="${h}" ${h === hour12 ? 'selected' : ''}>${h}</option>`).join('');
  const minOpts = minutes.map((m) => `<option value="${m}" ${m === minute ? 'selected' : ''}>${m}</option>`).join('');
  return `
    <div class="settings-wake-block">
      <div class="settings-field-label">Wake time</div>
      <p class="settings-field-desc">Sets breakfast, lunch, dinner, and snack times on your daily food plan.</p>
      <div class="ob-wake-picker">
        <select class="ob-select" data-wake-part="hour" aria-label="Wake hour">${hourOpts}</select>
        <span class="ob-wake-colon">:</span>
        <select class="ob-select" data-wake-part="minute" aria-label="Wake minute">${minOpts}</select>
        <select class="ob-select" data-wake-part="ampm" aria-label="AM or PM">
          <option value="AM" ${ampm === 'AM' ? 'selected' : ''}>AM</option>
          <option value="PM" ${ampm === 'PM' ? 'selected' : ''}>PM</option>
        </select>
      </div>
      <div class="ob-wake-display settings-wake-display">${formatWakeDisplay(wakeTime)}</div>
    </div>`;
}

function renderSettings() {
  const canEdit = canEditWakeTime();
  const wakeTime = currentWakeTime();
  return `
    <div class="screen settings-screen">
      <div class="plan-header settings-header">
        <button type="button" class="back-btn settings-back" data-nav="home" aria-label="Back">←</button>
        <h1>Settings</h1>
      </div>
      <div class="settings-body">
        ${canEdit ? `
          ${renderWakePickerSettings(wakeTime)}
          <button type="button" class="btn-primary settings-save" data-save-wake>Save wake time</button>
          <p class="settings-note">Wake time is the only setting you can change here. To update servings or activity, create a new food plan.</p>
        ` : `
          <p class="settings-empty">Open or create a food plan first — wake time controls when your meals are scheduled each day.</p>
          <a href="../createyourfoodplan/" class="btn-primary settings-create-link">Create your food plan</a>
        `}
      </div>
    </div>`;
}

function renderHome() {
  return `
    <div class="screen home-dashboard">
      <button type="button" class="home-settings" data-nav="settings" aria-label="Settings">⚙</button>
      <div class="home-logo-wrap">
        <img class="home-logo" src="../img/shell/B%26Blogo.png" alt="Burn &amp; Build" width="280" height="245" />
      </div>
      <div class="home-btn-stack">
        ${renderHomeNavButton('plan')}
        ${renderHomeNavButton('grocery')}
        ${renderHomeNavButton('projections')}
        ${renderHomeNavButton('previous-plans')}
      </div>
      <p class="home-site-link"><a href="https://gettheburnandbuildapp.com/">Burn &amp; Build website</a></p>
      <p class="home-footer">Stay consistent. Eat on time.</p>
    </div>`;
}

function renderStubScreen(title, lead) {
  return `
    <div class="screen home-stub">
      <div class="plan-header">
        <button type="button" class="back-btn" data-nav="home">←</button>
        <h1>${title}</h1>
      </div>
      <p class="home-stub-lead">${lead}</p>
    </div>`;
}

function getUserIntake() {
  const intake = store.program?.intake || store.profile;
  if (!intake?.leanBodyMass || !intake?.totalWeight || !intake?.fatPercent) return null;
  return intake;
}

function intakeGender(intake) {
  const s = String(intake.sex || 'male').toLowerCase();
  return s.startsWith('f') ? 'female' : 'male';
}

function renderProjectionsHeader() {
  return `
    <div class="plan-header">
      <button type="button" class="back-btn projections-back" data-nav="home">←</button>
      <h1>Projections</h1>
    </div>`;
}

function renderProjections() {
  const intake = getUserIntake();
  if (!intake) {
    return `
      <div class="screen projections-screen">
        ${renderProjectionsHeader()}
        <div class="projections-empty">
          <p>No program data yet.</p>
        </div>
      </div>`;
  }

  const result = computeWhatsPossible({
    gender: intakeGender(intake),
    weightLbs: intake.totalWeight,
    bodyFatPercent: intake.fatPercent,
  });

  if (!result.valid) {
    return `
      <div class="screen projections-screen">
        ${renderProjectionsHeader()}
        <div class="projections-empty">
          <p>${result.error}</p>
        </div>
      </div>`;
  }

  const name = displayName();
  return `
    <div class="screen projections-screen">
      ${renderProjectionsHeader()}

      <p class="projections-lead">Lean body analysis${name ? ` for ${name}` : ''} — based on your program intake.</p>

      <div class="lbm-card">
        <div class="lbm-card-label">Lean body mass</div>
        <div class="lbm-card-value">${intake.leanBodyMass.toFixed(1)} lbs</div>
        <div class="lbm-card-sub">Current ${intake.totalWeight.toFixed(0)} lbs · ${intake.fatPercent.toFixed(0)}% body fat</div>
      </div>

      <div class="projections-table-wrap">
        <table class="projections-table">
          <thead>
            <tr>
              <th>Timeline</th>
              <th>Body Fat %</th>
              <th>Bodyweight</th>
            </tr>
          </thead>
          <tbody>
            ${result.rows.map((row) => `
              <tr class="${row.isCurrent ? 'row-current' : ''}">
                <td>${row.timeline}</td>
                <td>${row.bodyFatDisplay}${row.badge ? `<span class="ace-badge">${row.badge}</span>` : ''}</td>
                <td>${row.weightDisplay}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="projections-narrative">${result.narrative}</div>

      <p class="projections-disclaimer">Results may vary. For informational purposes only — not medical advice. Individual results depend on adherence, diet, exercise, and other factors.</p>
    </div>`;
}

function renderProTips() {
  return renderStubScreen('Pro Tips', 'Coming next in the rebuild.');
}

function renderPreviousPlansHeader() {
  return `
    <div class="plan-header">
      <button type="button" class="back-btn history-back" data-nav="home">←</button>
      <h1>Previous Food Plans</h1>
    </div>`;
}

async function loadProgramHistory() {
  store.programHistoryLoading = true;
  store.programHistoryError = null;
  render();

  const email = getAppEmail();
  if (!email) {
    store.programHistoryLoading = false;
    store.programHistory = [];
    render();
    return;
  }

  const result = await fetchProgramHistoryFromServer(email);
  store.programHistoryLoading = false;
  if (!result.ok) {
    store.programHistory = [];
  } else {
    store.programHistory = result.programs || [];
  }
  render();
}

async function openHistoryProgram(programId) {
  const email = getAppEmail();
  if (!email || !programId) return;

  store.programHistoryOpenId = programId;
  store.programHistoryError = null;
  render();

  const result = await fetchProgramByIdFromServer(email, programId);
  store.programHistoryOpenId = null;

  if (!result.ok) {
    store.programHistoryError = result.message;
    render();
    return;
  }

  if (applyImportedProgram(result.package)) {
    store.expandedNavButton = null;
    store.screen = 'home';
    render();
  }
}

function renderPreviousPlans() {
  const activeId = store.program?.program?.id;

  if (store.programHistoryLoading) {
    return `
      <div class="screen previous-plans-screen">
        ${renderPreviousPlansHeader()}
        <div class="history-loading">Loading food plan history…</div>
      </div>`;
  }

  if (!store.programHistory.length) {
    return `
      <div class="screen previous-plans-screen">
        ${renderPreviousPlansHeader()}
        <div class="history-empty">
          <p>You haven't created a food plan.</p>
        </div>
      </div>`;
  }

  return `
    <div class="screen previous-plans-screen">
      ${renderPreviousPlansHeader()}

      <p class="history-intro">Body composition history — tap a row to open that food plan.</p>

      <div class="history-legend">Activity = weight training / cardio / fat burning hrs per week (e.g. 3/4/3)</div>

      ${store.programHistoryError ? `<div class="history-error">${store.programHistoryError}</div>` : ''}

      <div class="history-list">
        ${store.programHistory.map((row) => {
          const isActive = row.id === activeId;
          const isOpening = row.id === store.programHistoryOpenId;
          return `
          <button type="button" class="history-card ${isActive ? 'active' : ''} ${isOpening ? 'opening' : ''}" data-open-history="${row.id}">
            <div class="history-card-top">
              <span class="history-date">${row.testDateDisplay}</span>
              ${isActive ? '<span class="history-active-tag">Active</span>' : ''}
              <span class="history-chevron">›</span>
            </div>
            <div class="history-metrics">
              <div class="history-metric">
                <span class="history-metric-label">Fat %</span>
                <span class="history-metric-value accent">${row.fatPercentDisplay}</span>
              </div>
              <div class="history-metric">
                <span class="history-metric-label">Weight</span>
                <span class="history-metric-value">${row.weightDisplay}</span>
              </div>
              <div class="history-metric">
                <span class="history-metric-label">Lean</span>
                <span class="history-metric-value">${row.leanDisplay}</span>
              </div>
              <div class="history-metric">
                <span class="history-metric-label">Fat</span>
                <span class="history-metric-value">${row.fatLbsDisplay}</span>
              </div>
            </div>
            <div class="history-activity">Activity<strong>${row.activity}</strong></div>
          </button>`;
        }).join('')}
      </div>

      <p class="history-footer-note">Check in every 6–8 weeks and create a new plan when your body composition changes.</p>
    </div>`;
}

function openEditPlan() {
  if (!hasActiveProgram() && !store.profile?.leanBodyMass) {
    store.screen = 'plan';
    render();
    return;
  }
  initOnboardingForm(store);
  store.onboardingEditMode = true;
  store.onboardingPage = totalOnboardingPages() - 2;
  store.screen = 'onboarding';
  render();
}

function renderImport() {
  return `
    <div class="screen">
      <div class="plan-header">
        <button type="button" class="back-btn" data-nav="home">← Home</button>
        <h1>Open Program</h1>
      </div>
      <div class="import-block">
        <p class="import-lead">Create your program on the website — it opens here. Or load a saved program file.</p>
        ${store.importError ? `<div class="import-error">${store.importError}</div>` : ''}
        <label class="import-label">Program file (.bnbprogram.json)</label>
        <input type="file" accept=".json,.bnbprogram.json,application/json" data-import-file />
        <div class="import-divider">or paste JSON</div>
        <textarea class="import-paste" data-import-paste placeholder='{"schemaVersion":"1.0.0","packageType":"burn-and-build-program",...}'></textarea>
        <button type="button" class="btn-primary" data-import-submit style="margin-top:16px">OPEN PROGRAM</button>
        <p class="import-note">Need a new program? <a href="../createyourfoodplan/">Create one on the website →</a></p>
      </div>
    </div>`;
}

function renderMealFatPoints(fatTarget, fatUsed, fatPct) {
  return `
    <div class="fat-bar-wrap plan-fat-points">
      <div class="fat-bar"><div class="fat-bar-fill ${fatUsed >= fatTarget ? 'over' : ''}" style="width:${fatPct * 100}%"></div></div>
      <div class="fat-bar-meta">
        <span>Fat Servings</span>
        <span>${fatUsed.toFixed(1)} / ${fatTarget} Servings</span>
      </div>
    </div>`;
}

function renderPlan() {
  const plan = getPlan();
  if (!plan) {
    store.expandedNavButton = 'plan';
    store.screen = 'home';
    return renderHome();
  }

  const slots = getMealSlots(plan);
  const fatTarget = plan.servings.fatMaintain;
  const fatUsed = fatPointsConsumed();
  const fatPct = fatTarget ? Math.min(fatUsed / fatTarget, 1) : 0;

  return `
    <div class="screen food-plan-screen">
      <div class="plan-header">
        <button type="button" class="back-btn plan-back" data-nav="home" aria-label="Back">‹</button>
        <h1>Custom Food Plan</h1>
      </div>

      <button type="button" class="plan-fat-hint" data-reveal-fats>Tap here to reveal the Extra Fats list.</button>

      ${renderMealFatPoints(fatTarget, fatUsed, fatPct)}

      ${slots.map((slot) => {
        const expanded = store.expandedMeal === slot.label;
        const progress = mealProgress(slot);
        const complete = progress.required > 0 && progress.logged === progress.required;
        const logged = todayEntries()
          .filter((e) => e.mealSlotLabel === slot.label)
          .map((e) => `${e.foodName} ${e.servingLabel}`);
        return `
        <div class="meal-card ${complete ? 'meal-complete' : ''}">
          <button type="button" class="meal-card-header" data-toggle="${slot.label}">
            <div>
              <div class="label-row">
                <span class="label">${slot.label}</span>
                ${complete ? '<span class="meal-check">✓</span>' : ''}
              </div>
              ${!expanded && logged.length ? logged.map((l) => `<div class="logged">${l}</div>`).join('') : ''}
              ${!expanded && progress.required ? `<div class="meal-progress">${progress.logged}/${progress.required} logged</div>` : ''}
            </div>
            <div class="meta">
              <div>${slot.time}</div>
              <div class="expand">${expanded ? 'Close' : 'Expand'}</div>
            </div>
          </button>
          ${expanded ? `
          <div class="meal-body">
            ${slot.proteinServings > 0 ? renderProteinSection(slot.label, slot.proteinServings) : ''}
            ${slot.grainStarchServings > 0 ? renderGrainSection(slot.label, slot.grainStarchServings) : ''}
            ${slot.vegetableServings > 0 ? renderCategorySection(slot.label, 'Vegetables', 'Vegetables', 'Vegetables', slot.vegetableServings, ['vegetable']) : ''}
            ${slot.fruitServings > 0 ? renderCategorySection(slot.label, 'Fruits', 'Fruits', 'Fruits', slot.fruitServings, ['fruit']) : ''}
            ${renderExtraFatsSection(slot.label)}
          </div>` : ''}
        </div>`;
      }).join('')}
      <div style="height:32px"></div>
    </div>`;
}

function formatCoachParagraphs(text) {
  return text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function renderCoach() {
  const day = getCoachDay(currentProgramDay());
  if (!day) {
    return `
      <div class="screen coach-screen">
        <div class="plan-header">
          <button type="button" class="back-btn" data-nav="home">← Home</button>
          <h1>Coach Kory</h1>
        </div>
        <div class="coach-empty">
          <div class="coach-empty-icon">🔥</div>
          <p>New content coming soon.</p>
        </div>
      </div>`;
  }

  const idx = store.coachCardIndex;
  return `
    <div class="screen coach-screen">
      <div class="plan-header">
        <button type="button" class="back-btn" data-nav="home">← Home</button>
        <h1>Coach Kory</h1>
        <span class="coach-counter">${idx + 1} / ${day.cards.length}</span>
      </div>

      <div class="coach-carousel" id="coachCarousel">
        ${day.cards.map((card, i) => `
          <div class="coach-slide" data-slide="${i}">
            <div class="coach-text-card">
              <h2>${card.title}</h2>
              <div class="coach-body">${formatCoachParagraphs(card.text)}</div>
            </div>
            <img class="coach-screenshot" src="../${card.image}" alt="Coach Kory day ${day.dayNumber} — card ${i + 1}" loading="lazy" />
          </div>`).join('')}
      </div>

      <div class="coach-footer">
        <div class="coach-dots">
          ${day.cards.map((_, i) => `<span class="coach-dot ${i === idx ? 'active' : ''}" data-coach-dot="${i}"></span>`).join('')}
        </div>
        <p class="coach-swipe-hint">Swipe for next card</p>
      </div>
    </div>`;
}

function renderGroceryAddSheet() {
  if (!store.showGroceryAdd) return '';

  const tabCats = {
    protein: ['protein'],
    dairy: ['dairy'],
    grains: ['grain'],
    starches: ['starch'],
    vegetables: ['vegetable'],
    fruits: ['fruit'],
    fats: ['fat'],
  };
  const tabLabels = {
    protein: 'Protein', dairy: 'Dairy', grains: 'Grains', starches: 'Starches',
    vegetables: 'Vegetables', fruits: 'Fruits', fats: 'Fats',
  };
  const cats = tabCats[store.groceryAddTab] || ['protein'];
  const onList = new Set(store.groceryItems.map((i) => i.foodName));
  let foods = store.foods.filter((f) => cats.includes(f.category)).sort((a, b) => a.name.localeCompare(b.name));
  const q = store.groceryAddSearch.trim().toLowerCase();
  if (q) foods = foods.filter((f) => f.name.toLowerCase().includes(q));
  const picks = foods.filter((f) => (store.pickCounts[f.name] || 0) > 0)
    .sort((a, b) => (store.pickCounts[b.name] || 0) - (store.pickCounts[a.name] || 0));
  const pickNames = new Set(picks.map((f) => f.name));
  const rest = foods.filter((f) => !pickNames.has(f.name));

  const row = (food) => {
    const on = onList.has(food.name);
    return `
      <button type="button" class="grocery-add-row ${on ? 'on-list' : ''}" data-grocery-add-food="${encodeURIComponent(food.name)}" ${on ? 'disabled' : ''}>
        <span class="grocery-add-check">${on ? '✓' : '○'}</span>
        <span class="grocery-add-name">${food.name}</span>
        ${on ? '<span class="grocery-add-tag">On list</span>' : `<span class="grocery-add-serving">${food.servingDescription}</span>`}
      </button>`;
  };

  return `
    <div class="sheet-backdrop" data-close-grocery-add>
      <div class="sheet-panel" role="dialog">
        <div class="sheet-header">
          <button type="button" class="back-btn" data-close-grocery-add>Close</button>
          <h2>Select Additional Foods</h2>
        </div>
        <div class="grocery-add-tabs">
          ${Object.keys(tabCats).map((tab) => `
            <button type="button" class="${store.groceryAddTab === tab ? 'active' : ''}" data-grocery-add-tab="${tab}">${tabLabels[tab]}</button>
          `).join('')}
        </div>
        <input type="search" class="food-search" placeholder="Search foods…" data-grocery-add-search value="${store.groceryAddSearch}" />
        <div class="grocery-add-list">
          ${picks.length ? `<div class="top-picks-label">★ Your Top Picks</div>${picks.map(row).join('')}${rest.length ? '<div class="food-divider"></div>' : ''}` : ''}
          ${rest.length ? `<div class="food-hint">All ${tabLabels[store.groceryAddTab]}</div>${rest.map(row).join('')}` : ''}
          ${!foods.length ? '<div class="food-empty">No foods match your search</div>' : ''}
        </div>
      </div>
    </div>`;
}

function renderGrocery() {
  const groups = groupGroceryItems(store.groceryItems);
  const checkedCount = store.groceryItems.filter((i) => i.isChecked).length;

  return `
    <div class="screen grocery-screen">
      <div class="plan-header">
        <button type="button" class="back-btn grocery-back" data-nav="home">←</button>
        <h1>Grocery List</h1>
      </div>

      <div class="grocery-header">
        <div class="grocery-header-title">last 7 days food choices</div>
        <div class="grocery-header-range">${groceryDateRangeLabel()}</div>
        ${store.groceryItems.length ? `<div class="grocery-header-count">${store.groceryItems.length} items</div>` : ''}
      </div>

      <button type="button" class="grocery-add-btn" data-open-grocery-add>
        <span>+</span> Select Additional Foods
      </button>

      ${!store.groceryItems.length ? `
      <div class="grocery-empty">
        <h2>No items yet</h2>
        <p>Start logging meals in your Custom Food Plan. Your grocery list builds from what you actually eat.</p>
      </div>` : ''}

      ${groups.map(({ section, items }) => `
        <div class="grocery-section">
          <div class="grocery-section-header">
            <span class="grocery-section-icon">${section.icon}</span>
            <span class="grocery-section-label">${section.label}</span>
            <span class="grocery-section-count">${items.length}</span>
          </div>
          ${items.map((item) => `
            <div class="grocery-row ${item.isChecked ? 'checked' : ''}">
              <button type="button" class="grocery-check" data-grocery-check="${item.id}" aria-label="Check off ${item.foodName}">
                ${item.isChecked ? '✓' : '○'}
              </button>
              <div class="grocery-row-body">
                <div class="grocery-row-name">${groceryDisplayName(item.foodName)}</div>
                <div class="grocery-row-qty">${formatGroceryQuantity(item)}</div>
              </div>
              <button type="button" class="grocery-remove" data-grocery-remove="${item.id}" aria-label="Remove ${item.foodName}">×</button>
            </div>`).join('')}
        </div>`).join('')}

      ${checkedCount > 0 ? `
        <button type="button" class="grocery-uncheck-all" data-grocery-uncheck-all>Uncheck All</button>` : ''}

      <div style="height:32px"></div>
      ${renderGroceryAddSheet()}
    </div>`;
}

function render() {
  const root = document.getElementById('app');
  if (store.screen === 'loading') {
    root.innerHTML = '<div class="screen home-loading"><img class="home-logo" src="../img/shell/B%26Blogo.png" alt="Burn &amp; Build" width="240" height="210" /></div>';
    return;
  }
  if (store.screen === 'onboarding') root.innerHTML = renderOnboarding(store);
  else if (store.screen === 'import') root.innerHTML = renderImport();
  else if (store.screen === 'plan') root.innerHTML = renderPlan();
  else if (store.screen === 'coach') root.innerHTML = renderCoach();
  else if (store.screen === 'grocery') root.innerHTML = renderGrocery();
  else if (store.screen === 'projections') root.innerHTML = renderProjections();
  else if (store.screen === 'pro-tips') root.innerHTML = renderProTips();
  else if (store.screen === 'previous-plans') root.innerHTML = renderPreviousPlans();
  else if (store.screen === 'settings') root.innerHTML = renderSettings();
  else root.innerHTML = renderHome();
  bindEvents();
  if (store.screen === 'onboarding') {
    bindOnboardingEvents(store, {
      render,
      onComplete: () => {
        const edit = store.onboardingEditMode;
        store.onboardingEditMode = false;
        store.screen = edit ? 'home' : 'plan';
        render();
      },
    });
  }
}

function updateCoachDots(idx, total) {
  document.querySelectorAll('.coach-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });
  const counter = document.querySelector('.coach-counter');
  if (counter) counter.textContent = `${idx + 1} / ${total}`;
}

let coachScrollHandler = null;

function bindCoachCarousel() {
  const carousel = document.getElementById('coachCarousel');
  if (!carousel) return;

  const day = getCoachDay(currentProgramDay());
  if (!day) return;

  const total = day.cards.length;

  if (coachScrollHandler) {
    carousel.removeEventListener('scroll', coachScrollHandler);
  }

  coachScrollHandler = () => {
    const width = carousel.clientWidth || 1;
    const next = Math.min(Math.round(carousel.scrollLeft / width), total - 1);
    if (next !== store.coachCardIndex) {
      store.coachCardIndex = next;
      updateCoachDots(next, total);
      if (next === total - 1) markCoachDayComplete(day.dayNumber);
    }
  };

  carousel.addEventListener('scroll', coachScrollHandler, { passive: true });

  requestAnimationFrame(() => {
    carousel.scrollLeft = store.coachCardIndex * carousel.clientWidth;
  });

  document.querySelectorAll('[data-coach-dot]').forEach((dot) => {
    dot.addEventListener('click', () => {
      const i = Number(dot.dataset.coachDot);
      store.coachCardIndex = i;
      carousel.scrollTo({ left: i * carousel.clientWidth, behavior: 'smooth' });
      updateCoachDots(i, total);
      if (i === total - 1) markCoachDayComplete(day.dayNumber);
    });
  });
}

function bindEvents() {
  document.querySelectorAll('[data-expand-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.expandedNavButton = btn.dataset.expandNav;
      render();
    });
  });

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      if (nav === 'home') store.expandedNavButton = null;
      if (nav === 'setup') {
        openEditPlan();
        return;
      }
      if (nav === 'plan') store.expandedMeal = null;
      if (nav === 'coach') store.coachCardIndex = 0;
      if (nav === 'grocery') {
        refreshGroceryList();
        store.showGroceryAdd = false;
      }
      if (nav === 'previous-plans') {
        loadProgramHistory();
      }
      if (nav === 'import') store.importError = null;
      store.screen = nav;
      store.expandedMeal = null;
      render();
    });
  });

  document.querySelectorAll('[data-seg]').forEach((row) => {
    row.querySelectorAll('button[data-val]').forEach((btn) => {
      btn.addEventListener('click', () => {
        row.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        row.parentElement.querySelector('input[type=hidden]').value = btn.dataset.val;
      });
    });
  });

  document.querySelectorAll('[data-wake-part]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const hour = document.querySelector('[data-wake-part="hour"]')?.value;
      const minute = document.querySelector('[data-wake-part="minute"]')?.value;
      const ampm = document.querySelector('[data-wake-part="ampm"]')?.value;
      if (!hour || !minute || !ampm) return;
      const display = document.querySelector('.settings-wake-display');
      if (display) display.textContent = formatWakeDisplay(wakeTimeFromParts(hour, minute, ampm));
    });
  });

  document.querySelector('[data-save-wake]')?.addEventListener('click', () => {
    const hour = document.querySelector('[data-wake-part="hour"]')?.value;
    const minute = document.querySelector('[data-wake-part="minute"]')?.value;
    const ampm = document.querySelector('[data-wake-part="ampm"]')?.value;
    if (!hour || !minute || !ampm) return;
    ensureSettings();
    store.settings.wakeTime = wakeTimeFromParts(hour, minute, ampm);
    saveSettings();
    store.expandedMeal = null;
    store.screen = 'home';
    render();
  });

  document.querySelectorAll('[data-reveal-fats]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const plan = getPlan();
      if (!plan) return;
      const slots = getMealSlots(plan);
      const first = slots[0];
      if (!first) return;
      store.expandedMeal = first.label;
      store.expandedSections[sectionKey(first.label, 'Fats')] = true;
      render();
    });
  });

  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const label = btn.dataset.toggle;
      store.expandedMeal = store.expandedMeal === label ? null : label;
      render();
    });
  });

  document.querySelectorAll('[data-toggle-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sk = btn.dataset.toggleSection;
      store.expandedSections[sk] = !store.expandedSections[sk];
      render();
    });
  });

  document.querySelectorAll('[data-tab-key]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      store.sectionTabs[btn.dataset.tabKey] = btn.dataset.tabVal;
      render();
    });
  });

  document.querySelectorAll('[data-search]').forEach((input) => {
    input.addEventListener('input', () => {
      store.foodSearch[input.dataset.search] = input.value;
      render();
      const next = document.querySelector(`[data-search="${input.dataset.search}"]`);
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  });

  document.querySelectorAll('[data-log-food]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slotLabel = btn.dataset.logSlot;
      const category = btn.dataset.logCategory;
      const servings = Number(btn.dataset.logServings) || 1;
      const food = store.foods.find((f) => f.name === decodeURIComponent(btn.dataset.logFood));
      if (!food) return;
      logFood(slotLabel, category, food, servings, {
        collapseSection: btn.dataset.collapse || null,
      });
    });
  });

  document.querySelectorAll('[data-clear-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.expandedSections[btn.dataset.collapse] = false;
      removeCategoryEntry(btn.dataset.clearSlot, btn.dataset.clearCategory);
    });
  });

  document.querySelectorAll('[data-remove-fat-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeOneFat(btn.dataset.removeFatSlot, decodeURIComponent(btn.dataset.removeFatName));
    });
  });

  bindCoachCarousel();

  document.querySelectorAll('[data-open-history]').forEach((btn) => {
    btn.addEventListener('click', () => openHistoryProgram(btn.dataset.openHistory));
  });

  document.querySelector('[data-open-grocery-add]')?.addEventListener('click', () => {
    store.showGroceryAdd = true;
    render();
  });

  document.querySelectorAll('[data-close-grocery-add]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (el.classList.contains('sheet-backdrop') && e.target !== el) return;
      store.showGroceryAdd = false;
      render();
    });
  });

  document.querySelector('.sheet-panel')?.addEventListener('click', (e) => e.stopPropagation());

  document.querySelectorAll('[data-grocery-add-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.groceryAddTab = btn.dataset.groceryAddTab;
      render();
      requestAnimationFrame(() => {
        const list = document.querySelector('.grocery-add-list');
        if (list) {
          list.scrollTop = 0;
          list.scrollLeft = 0;
        }
        document.querySelector('[data-grocery-add-tab].active')
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });
  });

  document.querySelector('[data-grocery-add-search]')?.addEventListener('input', (e) => {
    store.groceryAddSearch = e.target.value;
    render();
    const next = document.querySelector('[data-grocery-add-search]');
    if (next) {
      next.focus();
      next.setSelectionRange(next.value.length, next.value.length);
    }
  });

  document.querySelectorAll('[data-grocery-add-food]').forEach((btn) => {
    btn.addEventListener('click', () => {
      addGroceryFood(decodeURIComponent(btn.dataset.groceryAddFood));
    });
  });

  document.querySelectorAll('[data-grocery-check]').forEach((btn) => {
    btn.addEventListener('click', () => toggleGroceryCheck(btn.dataset.groceryCheck));
  });

  document.querySelectorAll('[data-grocery-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeGroceryItem(btn.dataset.groceryRemove));
  });

  document.querySelector('[data-grocery-uncheck-all]')?.addEventListener('click', uncheckAllGrocery);

  document.querySelector('[data-import-submit]')?.addEventListener('click', async () => {
    const fileInput = document.querySelector('[data-import-file]');
    const pasteEl = document.querySelector('[data-import-paste]');
    let text = pasteEl?.value.trim() || '';
    if (fileInput?.files?.[0]) {
      try {
        text = await fileInput.files[0].text();
      } catch {
        store.importError = 'Could not read the selected file.';
        render();
        return;
      }
    }
    if (!text) {
      store.importError = 'Choose a program file or paste the JSON.';
      render();
      return;
    }
    const parsed = parseProgramPackageJson(text);
    if (!parsed.ok) {
      store.importError = parsed.errors.join(' ');
      render();
      return;
    }
    if (!applyImportedProgram(parsed.pkg)) {
      render();
      return;
    }
    store.screen = 'home';
    render();
  });
}

async function init() {
  load();
  store.screen = 'loading';
  render();
  try {
    const res = await fetch('../data/foods.json');
    store.foods = await res.json();
  } catch (err) {
    console.error('Food database failed to load', err);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');

  try {
    const pendingImport = sessionStorage.getItem('bnb_pending_import');
    if (pendingImport) {
      sessionStorage.removeItem('bnb_pending_import');
      const pkg = JSON.parse(pendingImport);
      if (applyImportedProgram(pkg)) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  } catch (err) {
    console.error(err);
  }

  if (emailParam && isValidEmail(emailParam)) {
    persistAppEmail(emailParam);
  }

  const urlImport = parseImportFromUrl(window.location.search);
  if (urlImport) {
    if (applyImportedProgram(urlImport)) {
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      store.screen = 'import';
      render();
      registerServiceWorker();
      return;
    }
  } else if (emailParam && isValidEmail(emailParam)) {
    urlParams.delete('email');
    const rest = urlParams.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
  }

  if (!hasActiveProgram() && getAppEmail()) {
    await syncProgramFromServer();
  }

  const hasLegacyPlan = store.profile?.leanBodyMass > 0 && localStorage.getItem('bnb_onboarding_complete') === 'true';
  if (hasLegacyPlan && !hasActiveProgram()) {
    localStorage.setItem('bnb_onboarding_complete', 'true');
  }
  store.screen = hasActiveProgram() || hasLegacyPlan ? 'home' : 'home';
  render();
  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      if (!reg.scope.includes('/myplan/')) reg.unregister();
    });
  }).catch(() => {});
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
}

init();
