import { formatGroceryQuantity } from '../../js/groceryEngine.js';
import {
  programClientName,
  programMetaHtml,
  programNavHtml,
} from '../../js/programBridgeUi.js';
import { loadProgramBridge } from '../../js/programBridgeHandoff.js';
import {
  attachPlannerStateToPackage,
  flushProgramPersist,
  plannerStateFromPackage,
  scheduleProgramPersist,
} from '../../js/menuPlannerState.js';
import { bootProgramBridgeAside } from '../../js/programLibrary.js';
import { getActiveProgramId, setActiveProgramId } from '../../js/programActive.js';
import { bootMenuPlannerAccess, openAccessGate } from './access.js?v=8';

const SLOT_LABEL_TO_ID = {
  Breakfast: 'breakfast',
  'Morning Snack': 'morning-snack',
  Lunch: 'lunch',
  'Afternoon Snack': 'afternoon-snack',
  Dinner: 'dinner',
  'Evening Snack': 'evening-snack',
};

const FOOD_CATEGORIES = [
  { id: 'protein', label: 'Protein' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'grain', label: 'Grains' },
  { id: 'starch', label: 'Starches' },
  { id: 'vegetable', label: 'Vegetables' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'fat', label: 'Fats' },
  { id: 'sugar', label: 'Sugar' },
  { id: 'alcohol', label: 'Alcohol' },
];

const SLOT_META = {
  protein: { label: 'Protein', categories: ['protein'] },
  gs: { label: 'Grains/Starches', categories: ['grain', 'starch'] },
  vegetable: { label: 'Veggie', categories: ['vegetable'], optional: true },
  fat: { label: 'Fat Points', categories: ['fat', 'sugar', 'alcohol'], optional: true },
  fruit: { label: 'Fruit', categories: ['fruit'] },
};

const FAT_LANE_SLOT_LABELS = {
  fat: 'Fat',
  sugar: 'Sugar',
  alcohol: 'Alcohol',
};

const DAY_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', template: 'meal' },
  { id: 'morning-snack', label: 'Morning Snack', template: 'snack' },
  { id: 'lunch', label: 'Lunch', template: 'meal' },
  { id: 'afternoon-snack', label: 'Afternoon Snack', template: 'snack' },
  { id: 'dinner', label: 'Dinner', template: 'meal' },
  { id: 'evening-snack', label: 'Evening Snack', template: 'snack' },
];

const TEMPLATE_SLOTS = {
  meal: ['protein', 'gs', 'vegetable', 'fat'],
  snack: ['fruit', 'fat'],
};

let savedMeals = [];

const FOODS_DATA_VERSION = '2';

const WEEK_DAYS = [
  { id: 'sun', label: 'Sun', fullLabel: 'Sunday' },
  { id: 'mon', label: 'Mon', fullLabel: 'Monday' },
  { id: 'tue', label: 'Tue', fullLabel: 'Tuesday' },
  { id: 'wed', label: 'Wed', fullLabel: 'Wednesday' },
  { id: 'thu', label: 'Thu', fullLabel: 'Thursday' },
  { id: 'fri', label: 'Fri', fullLabel: 'Friday' },
  { id: 'sat', label: 'Sat', fullLabel: 'Saturday' },
];

const WEEK_GRID_MEALS = ['breakfast', 'lunch', 'dinner'];

const WEEK_MEAL_EMPTY_LABEL = {
  breakfast: 'Breakfast —',
  lunch: 'Lunch —',
  dinner: 'Dinner —',
};

let foods = [];
let programPackage = null;
const mealSlotsById = {};
let activeSlot = null;
let activeFoodCategory = null;
let foodSearchQuery = '';
let weekPlan = {};
const expandedMeals = new Set();
let pendingSaveDaySlotId = null;

function createEmptyDayState() {
  const selections = {};
  const meta = {};
  DAY_SLOTS.forEach((daySlot) => {
    selections[daySlot.id] = {};
    meta[daySlot.id] = { mealName: null, savedMealId: null };
    templateSlots(daySlot.template).forEach((slot) => {
      selections[daySlot.id][slot] = null;
    });
  });
  return { selections, meta };
}

function createFreshWeekPlan() {
  const plan = {};
  WEEK_DAYS.forEach((day) => {
    plan[day.id] = createEmptyDayState();
  });
  return plan;
}

function ensureWeekPlanShape(plan = weekPlan) {
  WEEK_DAYS.forEach((day) => {
    if (!plan[day.id]) {
      plan[day.id] = createEmptyDayState();
      return;
    }
    DAY_SLOTS.forEach((daySlot) => {
      if (!plan[day.id].selections[daySlot.id]) {
        plan[day.id].selections[daySlot.id] = {};
      }
      if (!plan[day.id].meta[daySlot.id]) {
        plan[day.id].meta[daySlot.id] = { mealName: null, savedMealId: null };
      }
      templateSlots(daySlot.template).forEach((slot) => {
        if (!(slot in plan[day.id].selections[daySlot.id])) {
          plan[day.id].selections[daySlot.id][slot] = null;
        }
      });
    });
  });
}

function resetPlannerState() {
  weekPlan = createFreshWeekPlan();
  savedMeals = [];
  activeWeekDay = todayWeekDayId();
  expandedMeals.clear();
  activeSlot = null;
  activeFoodCategory = null;
}

function collectPlannerState() {
  return {
    version: 1,
    activeWeekDay,
    weekPlan,
    savedMeals,
    expandedMeals: [...expandedMeals],
  };
}

function applyPlannerState(state) {
  resetPlannerState();
  if (!state || typeof state !== 'object') return;
  if (state.weekPlan && typeof state.weekPlan === 'object') {
    weekPlan = state.weekPlan;
    ensureWeekPlanShape();
  }
  if (Array.isArray(state.savedMeals)) {
    savedMeals = state.savedMeals;
  }
  if (state.activeWeekDay && WEEK_DAYS.some((day) => day.id === state.activeWeekDay)) {
    activeWeekDay = state.activeWeekDay;
  }
  if (Array.isArray(state.expandedMeals)) {
    state.expandedMeals.forEach((id) => expandedMeals.add(id));
  }
}

function persistPlannerToProgram({ immediate = false } = {}) {
  if (!programPackage?.program?.id) return;
  programPackage = attachPlannerStateToPackage(programPackage, collectPlannerState());
  if (immediate) {
    flushProgramPersist(programPackage).catch((err) => console.error(err));
    return;
  }
  scheduleProgramPersist(programPackage);
}

function todayWeekDayId() {
  return WEEK_DAYS[new Date().getDay()].id;
}

weekPlan = createFreshWeekPlan();
let activeWeekDay = todayWeekDayId();

function categorySelections(mealSlotId, weekDay = activeWeekDay) {
  return weekPlan[weekDay].selections[mealSlotId];
}

function mealSlotMeta(mealSlotId, weekDay = activeWeekDay) {
  return weekPlan[weekDay].meta[mealSlotId];
}

function templateSlots(template) {
  return TEMPLATE_SLOTS[template];
}

function loadProgramPackage() {
  return loadProgramBridge();
}

function initMealSlotsFromProgram(pkg) {
  if (!pkg?.plan?.mealSlots) return;
  pkg.plan.mealSlots.forEach((slot) => {
    const id = SLOT_LABEL_TO_ID[slot.label];
    if (id) mealSlotsById[id] = slot;
  });
}

function fmtServings(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value - Math.round(value)) < 0.05) return String(Math.round(value));
  return value.toFixed(1);
}

function requiredServings(daySlotId, categorySlot) {
  const slot = mealSlotsById[daySlotId];
  if (!slot) return 1;
  switch (categorySlot) {
    case 'protein':
      return slot.proteinServings || 1;
    case 'gs':
      return slot.grainStarchServings || 1;
    case 'vegetable':
      return slot.vegetableServings || 1;
    case 'fruit':
      return slot.fruitServings || 1;
    default:
      return 1;
  }
}

function servingHint(daySlotId, categorySlot) {
  const required = requiredServings(daySlotId, categorySlot);
  if (!programPackage) return 'Tap or drag food';
  if (required <= 0 && SLOT_META[categorySlot]?.optional) return 'Optional';
  return `${fmtServings(required)} serving${Math.abs(required - 1) < 0.05 ? '' : 's'}`;
}

function reportBackHref(page) {
  const href = `../program-report/?page=${page}`;
  if (new URLSearchParams(location.search).has('preview')) {
    return `${href}&preview=1`;
  }
  return href;
}

function renderProgramChrome() {
  const nav = document.getElementById('program-nav');
  if (nav) {
    nav.innerHTML = programNavHtml('menuplanner', { reportHref: '../program-report/' });
  }

  const back = document.getElementById('planner-back');
  if (back) back.href = reportBackHref('servings');

  const meta = document.getElementById('planner-meta');
  if (!meta) return;

  if (!programPackage?.intake) {
    meta.innerHTML = '';
    return;
  }

  const servings = programPackage.plan?.servings;
  const servingsLine = servings
    ? `Protein ${fmtServings(servings.protein)}, G/S ${fmtServings(servings.grainsStarches)}, Fruit ${fmtServings(servings.fruits)}, Veg ${fmtServings(servings.vegetables)}, Fat pts ${fmtServings(servings.fatMaintain)}`
    : '';

  meta.innerHTML = `
    ${programMetaHtml(programPackage)}
    ${servingsLine ? `<p class="pb-servings-note">${escapeHtml(programClientName(programPackage))} — ${escapeHtml(servingsLine)}</p>` : ''}`;
}

function savedMealById(id) {
  return savedMeals.find((meal) => meal.id === id);
}

function scaledLabel(food, servings) {
  if (food.unitsPerServing > 0) {
    const count = Math.ceil(food.unitsPerServing * servings);
    return `${count} ${food.servingDescription}`;
  }
  if (!food.gramWeight && food.servingDescription) {
    if (servings === 1) return food.servingDescription;
    return `${servings} × ${food.servingDescription}`;
  }
  return `${Math.round(food.gramWeight * servings)} g`;
}

function servingAmountLabel(food, servings) {
  const count = Number(servings);
  if (!food || !Number.isFinite(count)) return '';
  return `${fmtServings(count)} × ${scaledLabel(food, 1)} = ${scaledLabel(food, count)}`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slotFoodCategories() {
  if (!activeSlot) return [];
  return SLOT_META[activeSlot.categorySlot].categories;
}

function ensureActiveFoodCategory() {
  const categories = slotFoodCategories();
  if (!categories.length) {
    activeFoodCategory = null;
    return;
  }
  if (categories.length === 1) {
    activeFoodCategory = categories[0];
    return;
  }
  if (!activeFoodCategory || !categories.includes(activeFoodCategory)) {
    activeFoodCategory = categories[0];
  }
}

function isCategorySlotActive(daySlotId, categorySlot) {
  return activeSlot?.daySlotId === daySlotId && activeSlot?.categorySlot === categorySlot;
}

function isFatSlot(categorySlot) {
  return categorySlot === 'fat';
}

function getFatSelections(mealSlotId, weekDay = activeWeekDay) {
  const fat = categorySelections(mealSlotId, weekDay)?.fat;
  if (!fat) return [];
  return Array.isArray(fat) ? fat : [fat];
}

function setFatSelections(mealSlotId, items, weekDay = activeWeekDay) {
  categorySelections(mealSlotId, weekDay).fat = items.length ? items : null;
}

function isFruitOnlySnack(mealSlotId, weekDay = activeWeekDay) {
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  if (daySlot.template !== 'snack') return false;
  const selections = categorySelections(mealSlotId, weekDay);
  return selections.fruit != null && getFatSelections(mealSlotId, weekDay).length === 0;
}

function acceptsSavedMealDrop(daySlotId) {
  const daySlot = DAY_SLOTS.find((item) => item.id === daySlotId);
  return daySlot.template !== 'snack';
}

function isDaySlotSaveable(mealSlotId, weekDay = activeWeekDay) {
  if (isFruitOnlySnack(mealSlotId, weekDay)) return false;
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  return templateSlots(daySlot.template).every((slotKey) => {
    const meta = SLOT_META[slotKey];
    if (meta.optional) return true;
    return categorySelections(mealSlotId, weekDay)[slotKey] != null;
  });
}

function showSaveMealButton(mealSlotId) {
  return isDaySlotSaveable(mealSlotId) && !mealSlotMeta(mealSlotId).savedMealId;
}

function clearDaySlotMeta(mealSlotId, weekDay = activeWeekDay) {
  mealSlotMeta(mealSlotId, weekDay).mealName = null;
  mealSlotMeta(mealSlotId, weekDay).savedMealId = null;
}

function itemSlotLabel(categorySlot, foodName) {
  if (categorySlot !== 'fat') return SLOT_META[categorySlot].label;
  const food = foods.find((item) => item.name === foodName);
  return FAT_LANE_SLOT_LABELS[food?.category] || SLOT_META.fat.label;
}

function daySlotToMealItems(mealSlotId, weekDay = activeWeekDay) {
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  return templateSlots(daySlot.template).flatMap((slotKey) => {
    if (isFatSlot(slotKey)) {
      return getFatSelections(mealSlotId, weekDay).map((selected) => ({
        slot: itemSlotLabel(slotKey, selected.foodName),
        foodName: selected.foodName,
        servings: selected.servings,
      }));
    }
    const selected = categorySelections(mealSlotId, weekDay)[slotKey];
    if (!selected) return [];
    return [{
      slot: itemSlotLabel(slotKey, selected.foodName),
      foodName: selected.foodName,
      servings: selected.servings,
    }];
  });
}

function mealIdFromName(name) {
  let base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'meal';
  let id = base;
  let suffix = 2;
  while (savedMeals.some((meal) => meal.id === id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function saveMealFromDay(mealSlotId, name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const meal = {
    id: mealIdFromName(trimmed),
    name: trimmed,
    pickCount: 1,
    items: daySlotToMealItems(mealSlotId),
  };

  savedMeals.push(meal);
  mealSlotMeta(mealSlotId).mealName = trimmed;
  mealSlotMeta(mealSlotId).savedMealId = meal.id;
  renderWeekGrid();
  renderDayColumn();
  renderSavedMeals();
  persistPlannerToProgram();
}

function openSaveMealDialog(mealSlotId) {
  const dialog = document.getElementById('save-meal-dialog');
  const input = document.getElementById('save-meal-name');
  pendingSaveDaySlotId = mealSlotId;
  input.value = mealSlotMeta(mealSlotId).mealName || '';
  dialog.showModal();
  input.focus();
  input.select();
}

function renderDaySlotHeader(daySlot) {
  const meta = mealSlotMeta(daySlot.id);
  let nameHtml = '';
  if (meta.mealName) {
    nameHtml = `<span class="slot__meal-name"> · ${escapeHtml(meta.mealName)}</span>`;
  } else if (isFruitOnlySnack(daySlot.id)) {
    const fruit = categorySelections(daySlot.id).fruit;
    nameHtml = `<span class="slot__food-choice"> · ${escapeHtml(fruit.foodName)}</span>`;
  }
  const saveButtonHtml = showSaveMealButton(daySlot.id)
    ? `<button type="button" class="slot__save" data-save-meal="${daySlot.id}">Save Meal</button>`
    : '';

  return `
    <div class="slot-header">
      <p class="slot__label"><span class="slot__time">${daySlot.label}</span>${nameHtml}</p>
      ${saveButtonHtml}
    </div>
  `;
}

function renderFatItemCard({ item, daySlotId, index }) {
  const food = foods.find((entry) => entry.name === item.foodName);
  const categoryLabel = FAT_LANE_SLOT_LABELS[food?.category];
  const detail = food
    ? servingAmountLabel(food, item.servings)
    : '';
  const typeTag = categoryLabel
    ? `<span class="fat-points__type">${categoryLabel}</span>`
    : '';

  return `
    <div class="fat-points__item">
      <button
        type="button"
        class="fat-points__remove"
        data-fat-remove
        data-day-slot-id="${daySlotId}"
        data-fat-index="${index}"
        aria-label="Remove ${escapeHtml(item.foodName)}"
      >×</button>
      ${typeTag}
      <p class="card__title">${escapeHtml(item.foodName)}</p>
      ${detail ? `<p class="card__detail">${detail}</p>` : ''}
    </div>
  `;
}

function renderFatPointsLane({ daySlotId }) {
  const meta = SLOT_META.fat;
  const active = isCategorySlotActive(daySlotId, 'fat');
  const items = getFatSelections(daySlotId);
  const optionalTag = ' <span class="card__slot-optional">(optional)</span>';

  if (!items.length) {
    return `
      <button
        type="button"
        class="card card--slot card--empty card--slot-optional${active ? ' card--slot-active' : ''}"
        data-day-category
        data-day-slot-id="${daySlotId}"
        data-category-slot="fat"
      >
        <span class="card__slot-label">${meta.label}${optionalTag}</span>
        <span class="card__slot-hint">Tap or drag food</span>
      </button>
    `;
  }

  const stackHtml = items
    .map((item, index) => renderFatItemCard({ item, daySlotId, index }))
    .join('');

  return `
    <div
      class="fat-points-lane card card--slot card--filled card--slot-optional${active ? ' card--slot-active' : ''}"
      data-day-category
      data-day-slot-id="${daySlotId}"
      data-category-slot="fat"
    >
      <span class="card__slot-label">${meta.label}${optionalTag}</span>
      <div class="fat-points-lane__stack">
        ${stackHtml}
        <div class="fat-points__add">
          <span class="card__slot-hint">Drag to add another</span>
        </div>
      </div>
    </div>
  `;
}

function renderCategorySlotButton({ categorySlot, daySlotId, selected }) {
  if (isFatSlot(categorySlot)) {
    return renderFatPointsLane({ daySlotId });
  }

  const meta = SLOT_META[categorySlot];
  const active = isCategorySlotActive(daySlotId, categorySlot);
  const optionalTag = meta.optional ? ' <span class="card__slot-optional">(optional)</span>' : '';
  const emptyHint = servingHint(daySlotId, categorySlot);

  if (selected) {
    const food = foods.find((item) => item.name === selected.foodName);
    const detail = food
      ? servingAmountLabel(food, selected.servings)
      : '';
    return `
      <button
        type="button"
        class="card card--slot card--filled${active ? ' card--slot-active' : ''}"
        data-day-category
        data-day-slot-id="${daySlotId}"
        data-category-slot="${categorySlot}"
      >
        <span class="card__slot-label">${meta.label}${optionalTag}</span>
        <p class="card__title">${escapeHtml(selected.foodName)}</p>
        ${detail ? `<p class="card__detail">${detail}</p>` : ''}
      </button>
    `;
  }

  return `
    <button
      type="button"
      class="card card--slot card--empty${meta.optional ? ' card--slot-optional' : ''}${active ? ' card--slot-active' : ''}"
      data-day-category
      data-day-slot-id="${daySlotId}"
      data-category-slot="${categorySlot}"
    >
      <span class="card__slot-label">${meta.label}${optionalTag}</span>
      <span class="card__slot-hint">${emptyHint}</span>
    </button>
  `;
}

function clearDayMenu() {
  DAY_SLOTS.forEach((daySlot) => {
    templateSlots(daySlot.template).forEach((slot) => {
      categorySelections(daySlot.id, activeWeekDay)[slot] = null;
    });
    mealSlotMeta(daySlot.id, activeWeekDay).mealName = null;
    mealSlotMeta(daySlot.id, activeWeekDay).savedMealId = null;
  });
  activeSlot = null;
  activeFoodCategory = null;
  refreshPlannerAfterMenuChange();
}

function clearWeekMenu() {
  WEEK_DAYS.forEach((day) => {
    weekPlan[day.id] = createEmptyDayState();
  });
  activeSlot = null;
  activeFoodCategory = null;
  refreshPlannerAfterMenuChange();
}

function refreshPlannerAfterMenuChange() {
  renderWeekGrid();
  renderDayColumn();
  renderFoodFilterLabel();
  renderFoodFilters();
  renderFoodStack();
  persistPlannerToProgram();
}

function initClearDayMenu() {
  document.getElementById('clear-day-menu').addEventListener('click', clearDayMenu);
}

function initClearWeekMenu() {
  document.getElementById('clear-week-menu').addEventListener('click', clearWeekMenu);
}

function weekMealLabel(weekDay, mealSlotId) {
  const meta = mealSlotMeta(mealSlotId, weekDay);
  if (meta.mealName) {
    return { text: meta.mealName, empty: false };
  }

  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  const hasContent = templateSlots(daySlot.template).some((slotKey) => {
    if (isFatSlot(slotKey)) return getFatSelections(mealSlotId, weekDay).length > 0;
    return categorySelections(mealSlotId, weekDay)[slotKey] != null;
  });

  if (!hasContent) {
    return { text: WEEK_MEAL_EMPTY_LABEL[mealSlotId], empty: true };
  }

  if (isFruitOnlySnack(mealSlotId, weekDay)) {
    return {
      text: categorySelections(mealSlotId, weekDay).fruit.foodName,
      empty: false,
    };
  }

  for (const slotKey of templateSlots(daySlot.template)) {
    const selected = categorySelections(mealSlotId, weekDay)[slotKey];
    if (selected) {
      return { text: selected.foodName.split(',')[0], empty: false };
    }
  }

  return { text: WEEK_MEAL_EMPTY_LABEL[mealSlotId], empty: true };
}

function renderWeekGrid() {
  const container = document.getElementById('week-grid');
  container.innerHTML = WEEK_DAYS.map((day) => {
    const active = day.id === activeWeekDay;
    const mealsHtml = WEEK_GRID_MEALS.map((mealSlotId) => {
      const { text, empty } = weekMealLabel(day.id, mealSlotId);
      return `
        <div
          class="mini-card${empty ? ' mini-card--empty' : ''}"
          data-week-meal-drop
          data-week-day="${day.id}"
          data-meal-slot="${mealSlotId}"
        >${escapeHtml(text)}</div>
      `;
    }).join('');

    return `
      <div
        class="day-col${active ? ' day-col--active' : ''}"
        data-week-day-select
        data-week-day="${day.id}"
      >
        <p class="day-col__name">${day.label}</p>
        <div class="day-col__meals">${mealsHtml}</div>
      </div>
    `;
  }).join('');
}

function setActiveWeekDay(weekDay) {
  if (weekDay === activeWeekDay) return;
  activeWeekDay = weekDay;
  activeSlot = null;
  activeFoodCategory = null;
  renderWeekGrid();
  renderActiveDayLabel();
  renderDayColumn();
  renderFoodFilterLabel();
  renderFoodFilters();
  renderFoodStack();
  persistPlannerToProgram();
}

function renderActiveDayLabel() {
  const day = WEEK_DAYS.find((item) => item.id === activeWeekDay);
  document.getElementById('active-day-label').textContent = day.fullLabel;
}

function initWeekGrid() {
  const grid = document.getElementById('week-grid');
  if (grid.dataset.weekInit) return;
  grid.dataset.weekInit = '1';

  grid.addEventListener('click', (event) => {
    const col = event.target.closest('[data-week-day-select]');
    if (!col) return;
    setActiveWeekDay(col.dataset.weekDay);
  });

  grid.addEventListener('dragover', (event) => {
    const cell = event.target.closest('[data-week-meal-drop]');
    if (!cell) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    cell.classList.add('drop-zone--over');
  });

  grid.addEventListener('dragleave', (event) => {
    const cell = event.target.closest('[data-week-meal-drop]');
    if (cell) cell.classList.remove('drop-zone--over');
  });

  grid.addEventListener('drop', (event) => {
    const cell = event.target.closest('[data-week-meal-drop]');
    if (!cell) return;
    event.preventDefault();
    cell.classList.remove('drop-zone--over');

    const mealId = event.dataTransfer.getData('application/x-meal-id');
    if (!mealId) return;

    const meal = savedMeals.find((item) => item.id === mealId);
    if (!meal) return;

    applySavedMealToMealSlot(cell.dataset.weekDay, cell.dataset.mealSlot, meal);
    setActiveWeekDay(cell.dataset.weekDay);
  });
}

function renderDayColumn() {
  const container = document.getElementById('day-slots');
  container.innerHTML = DAY_SLOTS.map((daySlot) => {
    const selections = categorySelections(daySlot.id);
    const categoryHtml = templateSlots(daySlot.template)
      .map((categorySlot) => renderCategorySlotButton({
        categorySlot,
        daySlotId: daySlot.id,
        selected: selections[categorySlot],
      }))
      .join('');

    const mealDropAttr = acceptsSavedMealDrop(daySlot.id) ? ' data-day-meal-drop' : '';

    return `
      <div class="slot">
        ${renderDaySlotHeader(daySlot)}
        <div class="day-slot"${mealDropAttr} data-day-slot-id="${daySlot.id}">
          <div class="day-slot__categories">${categoryHtml}</div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-day-category]').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (event.target.closest('[data-fat-remove]')) return;
      activeSlot = {
        daySlotId: button.dataset.daySlotId,
        categorySlot: button.dataset.categorySlot,
      };
      activeFoodCategory = null;
      ensureActiveFoodCategory();
      renderDayColumn();
      renderFoodFilterLabel();
      renderFoodFilters();
      renderFoodStack();
    });
  });

  container.querySelectorAll('[data-fat-remove]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      removeFatPoint(button.dataset.daySlotId, Number(button.dataset.fatIndex));
    });
  });

  container.querySelectorAll('[data-save-meal]').forEach((button) => {
    button.addEventListener('click', () => {
      openSaveMealDialog(button.dataset.saveMeal);
    });
  });

  initMealDragDrop();
}

function foodsForActiveSlot() {
  const categories = slotFoodCategories();
  if (!categories.length) return [];
  ensureActiveFoodCategory();
  const filterCategories = categories.length > 1
    ? [activeFoodCategory]
    : categories;
  const query = foodSearchQuery.trim().toLowerCase();
  return foods
    .filter((food) => filterCategories.includes(food.category))
    .filter((food) => !query || food.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function syncFoodSearchField() {
  const input = document.getElementById('food-search');
  if (!input) return;
  const show = !!activeSlot;
  input.hidden = !show;
  if (!show) {
    input.value = '';
    foodSearchQuery = '';
    return;
  }
  if (input.value !== foodSearchQuery) {
    input.value = foodSearchQuery;
  }
}

function mealItemDetail(item) {
  const food = foods.find((entry) => entry.name === item.foodName);
  if (!food) return escapeHtml(item.foodName);
  return servingAmountLabel(food, item.servings);
}

function mealSummary(meal) {
  return meal.items.map((item) => item.foodName.split(',')[0]).join(' · ');
}

function mealDragHtml(meal) {
  return `
    <p class="card__title">${escapeHtml(meal.name)}</p>
    <p class="card__detail">${escapeHtml(mealSummary(meal))}</p>
  `;
}

function renderSavedMealCard(meal) {
  const expanded = expandedMeals.has(meal.id);
  const itemsHtml = meal.items.map((item) => `
    <li class="saved-meal__item">
      <span class="saved-meal__slot">${escapeHtml(item.slot)}</span>
      <span class="saved-meal__food">${escapeHtml(item.foodName)}</span>
      <span class="saved-meal__amount">${mealItemDetail(item)}</span>
    </li>
  `).join('');

  return `
    <article class="saved-meal card card--meal${expanded ? ' saved-meal--expanded' : ''}" data-meal-id="${meal.id}">
      <button
        type="button"
        class="saved-meal__delete"
        data-meal-delete="${meal.id}"
        aria-label="Delete ${escapeHtml(meal.name)}"
      >×</button>
      <div class="saved-meal__header" draggable="true" data-meal-source data-meal-id="${meal.id}">
        <button
          type="button"
          class="saved-meal__toggle"
          data-meal-toggle="${meal.id}"
          aria-expanded="${expanded}"
          aria-label="${expanded ? 'Collapse' : 'Expand'} ${escapeHtml(meal.name)}"
        >▾</button>
        <div class="saved-meal__summary">
          <p class="card__title">${escapeHtml(meal.name)}</p>
          <p class="card__detail">${escapeHtml(mealSummary(meal))}</p>
        </div>
      </div>
      <ul class="saved-meal__items${expanded ? '' : ' saved-meal__items--hidden'}">${itemsHtml}</ul>
    </article>
  `;
}

function savedMealsByPopularity() {
  return [...savedMeals].sort((a, b) => b.pickCount - a.pickCount);
}

function deleteSavedMeal(mealId) {
  const index = savedMeals.findIndex((meal) => meal.id === mealId);
  if (index === -1) return;

  savedMeals.splice(index, 1);
  expandedMeals.delete(mealId);

  WEEK_DAYS.forEach((weekDay) => {
    DAY_SLOTS.forEach((daySlot) => {
      if (mealSlotMeta(daySlot.id, weekDay).savedMealId === mealId) {
        mealSlotMeta(daySlot.id, weekDay).mealName = null;
        mealSlotMeta(daySlot.id, weekDay).savedMealId = null;
      }
    });
  });

  renderSavedMeals();
  renderWeekGrid();
  renderDayColumn();
  persistPlannerToProgram();
}

function renderSavedMeals() {
  const container = document.getElementById('saved-meals');
  const meals = savedMealsByPopularity();
  container.innerHTML = meals.length
    ? meals.map((meal) => renderSavedMealCard(meal)).join('')
    : '<p class="saved-meals__hint">Save meals from day slots to build your library.</p>';

  document.querySelectorAll('[data-meal-toggle]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const mealId = button.dataset.mealToggle;
      if (expandedMeals.has(mealId)) {
        expandedMeals.delete(mealId);
      } else {
        expandedMeals.add(mealId);
      }
      renderSavedMeals();
      initMealDragDrop();
    });
  });

  document.querySelectorAll('[data-meal-delete]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteSavedMeal(button.dataset.mealDelete);
    });
  });

  initMealDragDrop();
}

function renderFoodFilterLabel() {
  const label = document.getElementById('food-filter-label');
  if (!activeSlot) {
    label.textContent = '';
    label.hidden = true;
    syncFoodSearchField();
    return;
  }
  const daySlot = DAY_SLOTS.find((item) => item.id === activeSlot.daySlotId);
  const slot = SLOT_META[activeSlot.categorySlot];
  const servings = requiredServings(activeSlot.daySlotId, activeSlot.categorySlot);
  const servingNote = programPackage && !isFatSlot(activeSlot.categorySlot)
    ? ` · ${fmtServings(servings)} serving${Math.abs(servings - 1) < 0.05 ? '' : 's'}`
    : '';
  label.textContent = `${daySlot.label} · ${slot.label}${servingNote}`;
  label.hidden = false;
  syncFoodSearchField();
}

function renderFoodFilters() {
  const container = document.getElementById('food-filters');
  const categories = slotFoodCategories();

  if (!categories.length) {
    container.innerHTML = '';
    return;
  }

  ensureActiveFoodCategory();
  const multiCategory = categories.length > 1;

  container.innerHTML = FOOD_CATEGORIES
    .filter((cat) => categories.includes(cat.id))
    .map((cat) => {
      const active = cat.id === activeFoodCategory;
      if (!multiCategory) {
        return `<span class="food-filter food-filter--active">${cat.label}</span>`;
      }
      return `
        <button
          type="button"
          class="food-filter${active ? ' food-filter--active' : ''}"
          data-food-category="${cat.id}"
        >${cat.label}</button>
      `;
    })
    .join('');

  container.querySelectorAll('[data-food-category]').forEach((button) => {
    button.addEventListener('click', () => {
      activeFoodCategory = button.dataset.foodCategory;
      renderFoodFilters();
      renderFoodStack();
    });
  });
}

function foodCardDetail(food) {
  if (!activeSlot || isFatSlot(activeSlot.categorySlot)) {
    return scaledLabel(food, 1);
  }
  const servings = requiredServings(activeSlot.daySlotId, activeSlot.categorySlot);
  if (!programPackage || Math.abs(servings - 1) < 0.05) {
    return scaledLabel(food, 1);
  }
  return servingAmountLabel(food, servings);
}

function renderFoodStack() {
  const container = document.getElementById('food-stack');
  const list = foodsForActiveSlot();

  if (!activeSlot) {
    container.innerHTML = '<p class="food-stack__hint">Tap a slot on the left, then tap or drag a food.</p>';
    return;
  }

  if (!list.length) {
    const hint = foodSearchQuery.trim()
      ? 'No foods match your search.'
      : 'No foods in this category.';
    container.innerHTML = `<p class="food-stack__hint">${hint}</p>`;
    return;
  }

  container.innerHTML = list.map((food) => `
    <div
      class="card card--food"
      draggable="true"
      data-food-name="${food.name.replace(/"/g, '&quot;')}"
    >
      <p class="card__title">${escapeHtml(food.name)}</p>
      <p class="card__detail">${foodCardDetail(food)}</p>
    </div>
  `).join('');

  initFoodStackInteractions();
}

function addFoodToActiveSlot(foodName) {
  if (!activeSlot) return;
  fillDaySlot(activeSlot.daySlotId, activeSlot.categorySlot, foodName);
}

function initFoodStackInteractions() {
  document.querySelectorAll('[data-food-name]').forEach((card) => {
    if (card.dataset.foodBound) return;
    card.dataset.foodBound = '1';

    let dragged = false;

    card.addEventListener('dragstart', (event) => {
      if (!activeSlot) {
        event.preventDefault();
        return;
      }
      dragged = true;
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-food-name', card.dataset.foodName);
      card.classList.add('card--dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('card--dragging');
      window.setTimeout(() => {
        dragged = false;
      }, 0);
    });

    card.addEventListener('click', () => {
      if (dragged || !activeSlot) return;
      addFoodToActiveSlot(card.dataset.foodName);
    });
  });
}

function fillDaySlot(daySlotId, categorySlot, foodName) {
  const servings = requiredServings(daySlotId, categorySlot);
  clearDaySlotMeta(daySlotId);
  if (isFatSlot(categorySlot)) {
    setFatSelections(daySlotId, [
      ...getFatSelections(daySlotId),
      { foodName, servings: 1 },
    ]);
  } else {
    categorySelections(daySlotId)[categorySlot] = {
      foodName,
      servings,
    };
  }
  renderWeekGrid();
  renderDayColumn();
}

function removeFatPoint(daySlotId, index) {
  clearDaySlotMeta(daySlotId);
  const items = getFatSelections(daySlotId);
  items.splice(index, 1);
  setFatSelections(daySlotId, items);
  renderWeekGrid();
  renderDayColumn();
}

function applySavedMealToMealSlot(weekDay, mealSlotId, meal, { trackPick = true } = {}) {
  if (!acceptsSavedMealDrop(mealSlotId)) return;
  const labelToSlot = {
    Protein: 'protein',
    'Grains/Starches': 'gs',
    'G / S': 'gs',
    Veggie: 'vegetable',
    'Extra Fat': 'fat',
    Sugar: 'fat',
    Alcohol: 'fat',
    Fruit: 'fruit',
  };
  templateSlots(DAY_SLOTS.find((slot) => slot.id === mealSlotId).template).forEach((slotKey) => {
    categorySelections(mealSlotId, weekDay)[slotKey] = null;
  });
  const fatItems = [];
  meal.items.forEach((item) => {
    const slotKey = labelToSlot[item.slot];
    if (slotKey === 'fat') {
      fatItems.push({
        foodName: item.foodName,
        servings: item.servings,
      });
    } else if (slotKey && categorySelections(mealSlotId, weekDay)[slotKey] !== undefined) {
      categorySelections(mealSlotId, weekDay)[slotKey] = {
        foodName: item.foodName,
        servings: item.servings,
      };
    }
  });
  setFatSelections(mealSlotId, fatItems, weekDay);
  mealSlotMeta(mealSlotId, weekDay).mealName = meal.name;
  mealSlotMeta(mealSlotId, weekDay).savedMealId = meal.id;
  if (trackPick) meal.pickCount += 1;
  renderWeekGrid();
  if (weekDay === activeWeekDay) renderDayColumn();
  renderSavedMeals();
}

function applySavedMealToDay(mealSlotId, meal) {
  applySavedMealToMealSlot(activeWeekDay, mealSlotId, meal);
}

function initFoodDropTargets() {
  const daySlots = document.getElementById('day-slots');
  if (daySlots.dataset.dropInit) return;
  daySlots.dataset.dropInit = '1';

  daySlots.addEventListener('dragover', (event) => {
    const slot = event.target.closest('[data-day-category]');
    if (!slot || !activeSlot) return;
    if (activeSlot.daySlotId !== slot.dataset.daySlotId
      || activeSlot.categorySlot !== slot.dataset.categorySlot) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    slot.classList.add('drop-zone--over');
  });

  daySlots.addEventListener('dragleave', (event) => {
    const slot = event.target.closest('[data-day-category]');
    if (slot) slot.classList.remove('drop-zone--over');
  });

  daySlots.addEventListener('drop', (event) => {
    const slot = event.target.closest('[data-day-category]');
    if (!slot) return;
    event.preventDefault();
    slot.classList.remove('drop-zone--over');
    const foodName = event.dataTransfer.getData('application/x-food-name');
    if (!foodName) return;
    fillDaySlot(slot.dataset.daySlotId, slot.dataset.categorySlot, foodName);
  });
}

function initMealDragDrop() {
  document.querySelectorAll('[data-meal-source]').forEach((card) => {
    if (card.dataset.mealDragBound) return;
    card.dataset.mealDragBound = '1';

    card.addEventListener('dragstart', (event) => {
      const meal = savedMeals.find((item) => item.id === card.dataset.mealId);
      if (!meal) return;
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-meal-html', mealDragHtml(meal));
      event.dataTransfer.setData('application/x-meal-id', meal.id);
      card.classList.add('card--dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('card--dragging');
    });
  });

  document.querySelectorAll('[data-day-meal-drop]').forEach((zone) => {
    if (zone.dataset.mealDropBound) return;
    zone.dataset.mealDropBound = '1';

    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      zone.classList.add('drop-zone--over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drop-zone--over');
    });

    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('drop-zone--over');

      const mealId = event.dataTransfer.getData('application/x-meal-id');
      if (!mealId) return;

      const meal = savedMeals.find((item) => item.id === mealId);
      if (!meal || !acceptsSavedMealDrop(zone.dataset.daySlotId)) return;

      applySavedMealToDay(zone.dataset.daySlotId, meal);
    });
  });
}

function initSaveMealDialog() {
  const dialog = document.getElementById('save-meal-dialog');
  const form = document.getElementById('save-meal-form');
  const input = document.getElementById('save-meal-name');
  const cancel = document.getElementById('save-meal-cancel');

  cancel.addEventListener('click', () => {
    pendingSaveDaySlotId = null;
    dialog.close();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!pendingSaveDaySlotId) return;
    saveMealFromDay(pendingSaveDaySlotId, input.value);
    pendingSaveDaySlotId = null;
    dialog.close();
  });
}

function iterWeekFoodSelections(callback) {
  WEEK_DAYS.forEach((day) => {
    DAY_SLOTS.forEach((mealSlot) => {
      templateSlots(mealSlot.template).forEach((categorySlot) => {
        if (isFatSlot(categorySlot)) {
          getFatSelections(mealSlot.id, day.id).forEach((item) => {
            callback({
              weekDay: day.id,
              mealSlotId: mealSlot.id,
              foodName: item.foodName,
              servings: item.servings,
            });
          });
          return;
        }
        const selected = categorySelections(mealSlot.id, day.id)[categorySlot];
        if (selected) {
          callback({
            weekDay: day.id,
            mealSlotId: mealSlot.id,
            foodName: selected.foodName,
            servings: selected.servings,
          });
        }
      });
    });
  });
}

function foodAmountLabel(food, servings) {
  if (!food) return `${servings} servings`;
  const isCountBased = (food.unitsPerServing || 0) > 0;
  if (food.gramWeight || isCountBased) {
    return formatGroceryQuantity({
      foodName: food.name,
      weeklyGrams: (food.gramWeight || 0) * servings,
      weeklyUnits: isCountBased ? food.unitsPerServing * servings : 0,
      isCountBased,
    });
  }
  if (food.servingDescription) {
    if (servings === 1) return food.servingDescription;
    return `${servings} × ${food.servingDescription}`;
  }
  return `${servings} servings`;
}

function buildShoppingTotals() {
  const totals = new Map();
  iterWeekFoodSelections(({ foodName, servings }) => {
    totals.set(foodName, (totals.get(foodName) || 0) + servings);
  });
  return totals;
}

function buildAssistantDocumentHtml() {
  const totals = buildShoppingTotals();
  const logoUrl = escapeHtml(new URL('../img/brand/bblogo.png', window.location.href).href);
  const categoryOrder = FOOD_CATEGORIES.map((cat) => cat.id);
  const categoryLabels = Object.fromEntries(FOOD_CATEGORIES.map((cat) => [cat.id, cat.label]));

  const shoppingRows = [];
  categoryOrder.forEach((categoryId) => {
    const rows = [];
    totals.forEach((servings, foodName) => {
      const food = foods.find((item) => item.name === foodName);
      if ((food?.category || 'other') !== categoryId) return;
      rows.push({ foodName, amount: foodAmountLabel(food, servings) });
    });
    rows.sort((a, b) => a.foodName.localeCompare(b.foodName));
    if (rows.length) {
      shoppingRows.push({ category: categoryLabels[categoryId], rows });
    }
  });

  const shoppingHtml = shoppingRows.length
    ? shoppingRows.map((group) => `
        <section class="assistant-section">
          <h2>${escapeHtml(group.category)}</h2>
          <ul class="assistant-list">
            ${group.rows.map((row) => `
              <li><span class="assistant-food">${escapeHtml(row.foodName)}</span><span class="assistant-amount">${escapeHtml(row.amount)}</span></li>
            `).join('')}
          </ul>
        </section>
      `).join('')
    : '<p class="assistant-empty">No ingredients in this week\'s plan yet.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Burn &amp; Build — Shopping &amp; Food Prep Assistant</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Open Sans", system-ui, sans-serif;
      background: #ffffff;
      color: #111111;
      padding: 32px 40px 48px;
      max-width: 720px;
      margin: 0 auto;
    }
    .assistant-toolbar {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 24px;
    }
    .assistant-toolbar button {
      padding: 8px 14px;
      border: 1px solid #333;
      border-radius: 6px;
      background: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .assistant-toolbar button.primary {
      border-color: #c9a000;
      background: #fdc500;
      color: #111;
    }
    .assistant-brand {
      text-align: center;
      margin-bottom: 28px;
    }
    .assistant-logo {
      display: block;
      width: 140px;
      height: auto;
      margin: 0 auto 12px;
    }
    .assistant-subtitle {
      color: #666;
      font-size: 0.9rem;
    }
    h2 {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #333;
      margin-bottom: 8px;
    }
    .assistant-section { margin-bottom: 20px; }
    .assistant-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .assistant-list li {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-size: 0.9rem;
      padding: 4px 0;
      border-bottom: 1px solid #eee;
    }
    .assistant-food { flex: 1; }
    .assistant-amount {
      color: #333;
      font-weight: 600;
      text-align: right;
      max-width: 45%;
    }
    .assistant-empty { color: #666; font-size: 0.9rem; }
    @media print {
      .assistant-toolbar { display: none; }
      body { padding: 0.5in; }
    }
  </style>
</head>
<body>
  <div class="assistant-toolbar">
    <button type="button" class="primary" onclick="window.print()">Print</button>
  </div>
  <header class="assistant-brand">
    <img class="assistant-logo" src="${logoUrl}" alt="Burn &amp; Build" width="140" height="140" />
    <p class="assistant-subtitle">Shopping &amp; Food Prep Assistant</p>
  </header>
  ${shoppingHtml}
</body>
</html>`;
}

function showPlannerToast(message, { variant = 'info', durationMs = 6000 } = {}) {
  const host = document.getElementById('planner-toast-host');
  if (!host) return;

  host.innerHTML = '';

  const toast = document.createElement('p');
  toast.className = `planner-toast planner-toast--${variant}`;
  toast.textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));

  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 320);
  }, durationMs);
}

function openPrintAssistant() {
  const doc = window.open('', '_blank');
  if (!doc) {
    showPlannerToast('Pop-up blocked — allow new tabs for this site, then try Print Assistant again.', {
      variant: 'error',
      durationMs: 8000,
    });
    return;
  }
  doc.document.write(buildAssistantDocumentHtml());
  doc.document.close();
  doc.focus();
  showPlannerToast('Print Assistant opened in a new tab. Review your list there, then use Print.', {
    variant: 'success',
  });
}

function initFoodSearch() {
  const input = document.getElementById('food-search');
  if (!input) return;
  input.addEventListener('input', () => {
    foodSearchQuery = input.value;
    renderFoodStack();
  });
}

function initPrintAssistant() {
  document.getElementById('print-assistant').addEventListener('click', openPrintAssistant);
}

async function init(pkg) {
  programPackage = pkg || loadProgramPackage();
  if (programPackage?.program?.id) {
    setActiveProgramId(programPackage.program.id);
  }
  applyPlannerState(plannerStateFromPackage(programPackage));
  initMealSlotsFromProgram(programPackage);
  renderProgramChrome();

  const response = await fetch(`../data/foods.json?v=${FOODS_DATA_VERSION}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not load foods catalog.');
  }
  foods = await response.json();
  renderWeekGrid();
  initWeekGrid();
  renderActiveDayLabel();
  renderDayColumn();
  renderSavedMeals();
  renderFoodFilterLabel();
  renderFoodFilters();
  initSaveMealDialog();
  initClearDayMenu();
  initClearWeekMenu();
  initFoodSearch();
  initPrintAssistant();
  renderFoodStack();
  initFoodDropTargets();
  try {
    await bootProgramBridgeAside({
      getProgramPackage: () => programPackage,
      openAccessGate,
      beforeSwitch: async () => {
        persistPlannerToProgram({ immediate: true });
      },
      onSwitch: async (nextPkg) => {
        await init(nextPkg);
      },
      onSettingsChange: async (nextPkg) => {
        programPackage = nextPkg;
      },
    });
  } catch (err) {
    console.error('Program library sidebar failed to load:', err);
  }
}

window.addEventListener('beforeunload', () => {
  persistPlannerToProgram({ immediate: true });
});

bootMenuPlannerAccess(async (pkg) => {
  await init(pkg);
}).catch((error) => {
  console.error(error);
  const gate = document.getElementById('access-gate');
  const stack = document.getElementById('food-stack');
  if (gate) {
    gate.hidden = false;
    const messageEl = gate.querySelector('#access-error-message');
    if (messageEl) {
      messageEl.textContent = 'Something went wrong loading the menu planner. Refresh and try again.';
    }
    const emailScreen = gate.querySelector('#access-screen-email');
    const errorScreen = gate.querySelector('#access-screen-error');
    if (emailScreen) emailScreen.hidden = true;
    if (errorScreen) errorScreen.hidden = false;
  }
  if (stack) {
    stack.innerHTML = '<p class="food-stack__error">Could not load foods. Open via a local server from the repo root.</p>';
  }
});
