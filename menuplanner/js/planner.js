import { formatGroceryQuantity } from '../../js/groceryEngine.js';
import {
  formatProgramDateLong,
  programClientName,
  programMetaHtml,
} from '../../js/programBridgeUi.js?v=22';
import { loadProgramBridge } from '../../js/programBridgeHandoff.js?v=22';
import {
  attachPlannerStateToPackage,
  flushProgramPersist,
  plannerStateFromPackage,
  scheduleProgramPersist,
} from '../../js/menuPlannerState.js?v=22';
import { getActiveProgramId, setActiveProgramId } from '../../js/programActive.js?v=22';

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

const WEEK_GRID_MEALS = DAY_SLOTS.map((slot) => slot.id);

const WEEK_MEAL_EMPTY_LABEL = {
  breakfast: 'Breakfast —',
  lunch: 'Lunch —',
  dinner: 'Dinner —',
  'morning-snack': 'Snack',
  'afternoon-snack': 'Snack',
  'evening-snack': 'Snack',
};

let foods = [];
let programPackage = null;
const mealSlotsById = {};
let activeSlot = null;
let activeFoodCategory = null;
let foodSearchQuery = '';
let weekPlan = {};
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
  activeSlot = null;
  activeFoodCategory = null;
}

function collectPlannerState() {
  return {
    version: 1,
    activeWeekDay,
    weekPlan,
    savedMeals,
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

function renderPlannerMeta() {
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
  return `
    <div class="slot-header">
      <p class="slot__label"><span class="slot__time">${daySlot.label}</span>${nameHtml}</p>
    </div>
  `;
}

function renderDaySlotSaveAction(daySlot) {
  if (!showSaveMealButton(daySlot.id)) return '';
  return `
    <div class="slot__save-row">
      <button type="button" class="slot__save" data-save-meal="${daySlot.id}">Save Meal</button>
    </div>
  `;
}

function scrollActiveMealSlotIntoView() {
  const daySlotId = activeSlot?.daySlotId;
  if (!daySlotId) return;
  requestAnimationFrame(() => {
    const slotEl = document.getElementById('day-slots')
      ?.querySelector(`[data-meal-slot-id="${daySlotId}"]`);
    slotEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
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

let weekGridLabelProbe = null;

function weekGridLabelReferenceCell() {
  return document.querySelector('#week-grid .week-matrix__cell.mini-card[data-meal-slot="breakfast"]')
    || document.querySelector('#week-grid .week-matrix__cell.mini-card[data-meal-slot]');
}

function ensureWeekGridLabelProbe() {
  if (!weekGridLabelProbe) {
    weekGridLabelProbe = document.createElement('div');
    weekGridLabelProbe.className = 'mini-card week-matrix__cell';
    weekGridLabelProbe.setAttribute('aria-hidden', 'true');
    Object.assign(weekGridLabelProbe.style, {
      position: 'absolute',
      left: '-9999px',
      top: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      display: 'block',
    });
    document.body.appendChild(weekGridLabelProbe);
  }
  return weekGridLabelProbe;
}

function syncWeekGridLabelProbeStyles() {
  const probe = ensureWeekGridLabelProbe();
  const refCell = weekGridLabelReferenceCell();
  if (!refCell) return;
  const style = getComputedStyle(refCell);
  probe.style.font = style.font;
  probe.style.letterSpacing = style.letterSpacing;
  probe.style.textTransform = style.textTransform;
  probe.style.boxSizing = style.boxSizing;
  probe.style.padding = style.padding;
  probe.style.border = style.border;
}

function weekGridLabelMaxWidth() {
  const cell = weekGridLabelReferenceCell();
  if (!cell) return null;
  return cell.getBoundingClientRect().width;
}

function weekGridLabelFits(text, maxWidth) {
  syncWeekGridLabelProbeStyles();
  const probe = ensureWeekGridLabelProbe();
  probe.style.width = `${maxWidth}px`;
  probe.textContent = text;
  return probe.scrollWidth <= probe.clientWidth;
}

function fitWeekGridLabel(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';

  const maxWidth = weekGridLabelMaxWidth();
  if (maxWidth == null || maxWidth <= 0) return raw;
  if (weekGridLabelFits(raw, maxWidth)) return raw;

  let lo = 0;
  let hi = raw.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (weekGridLabelFits(raw.slice(0, mid), maxWidth)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const fitted = raw.slice(0, lo).trimEnd();
  if (fitted) return fitted;
  return raw.charAt(0);
}

function weekMealLabel(weekDay, mealSlotId) {
  const meta = mealSlotMeta(mealSlotId, weekDay);
  if (meta.mealName) {
    const fullText = meta.mealName;
    const text = fitWeekGridLabel(fullText);
    return { text, fullText, empty: false };
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

function weekGridColumnLabel(mealSlotId) {
  const slot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  if (!slot) return mealSlotId;
  if (slot.template === 'snack') return 'Snack';
  return slot.label;
}

function renderWeekGrid() {
  const container = document.getElementById('week-grid');
  const headCells = WEEK_GRID_MEALS.map((mealSlotId) => `
    <div class="week-matrix__col-head">${escapeHtml(weekGridColumnLabel(mealSlotId))}</div>
  `).join('');

  const bodyRows = WEEK_DAYS.map((day) => {
    const active = day.id === activeWeekDay;
    const dayCell = `
      <div
        class="week-matrix__day${active ? ' week-matrix__day--active' : ''}"
        data-week-day-select
        data-week-day="${day.id}"
      >${escapeHtml(day.label)}</div>
    `;
    const mealCells = WEEK_GRID_MEALS.map((mealSlotId) => {
      const { text, fullText, empty } = weekMealLabel(day.id, mealSlotId);
      const tooltip = !empty && fullText && fullText !== text ? fullText : text;
      const titleAttr = empty ? '' : ` title="${escapeHtml(tooltip)}"`;
      const dropAttrs = acceptsSavedMealDrop(mealSlotId) ? ' data-week-meal-drop' : '';
      return `
        <div
          class="mini-card week-matrix__cell${empty ? ' mini-card--empty' : ''}${active ? ' week-matrix__cell--active-row' : ''}"
          ${dropAttrs}${titleAttr}
          data-week-day-select
          data-week-day="${day.id}"
          data-meal-slot="${mealSlotId}"
        >${escapeHtml(text)}</div>
      `;
    }).join('');
    return dayCell + mealCells;
  }).join('');

  container.innerHTML = `
    <div class="week-matrix" role="grid" aria-label="Week">
      <div class="week-matrix__corner" aria-hidden="true"></div>
      ${headCells}
      ${bodyRows}
    </div>
  `;
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
      <div class="slot" data-meal-slot-id="${daySlot.id}">
        ${renderDaySlotHeader(daySlot)}
        <div class="day-slot"${mealDropAttr} data-day-slot-id="${daySlot.id}">
          <div class="day-slot__categories">${categoryHtml}</div>
          ${renderDaySlotSaveAction(daySlot)}
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
  scrollActiveMealSlotIntoView();
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

function mealDragHtml(meal) {
  return `<p class="card__title">${escapeHtml(meal.name)}</p>`;
}

function resolveSavedMealTargetSlot() {
  const mealSlots = ['breakfast', 'lunch', 'dinner'];
  if (activeSlot?.daySlotId && acceptsSavedMealDrop(activeSlot.daySlotId)) {
    return activeSlot.daySlotId;
  }
  const emptySlot = mealSlots.find((slotId) => {
    const meta = mealSlotMeta(slotId, activeWeekDay);
    return !meta.savedMealId && !meta.mealName;
  });
  if (emptySlot) return emptySlot;
  return mealSlots[0];
}

function applySavedMealFromTap(mealId) {
  const meal = savedMeals.find((item) => item.id === mealId);
  if (!meal) return;
  const daySlotId = resolveSavedMealTargetSlot();
  applySavedMealToDay(daySlotId, meal);
}

function renderSavedMealCard(meal) {
  return `
    <article class="saved-meal card card--meal" data-meal-id="${meal.id}">
      <button
        type="button"
        class="saved-meal__apply"
        draggable="true"
        data-meal-source
        data-meal-apply="${meal.id}"
        data-meal-id="${meal.id}"
      >${escapeHtml(meal.name)}</button>
      <button
        type="button"
        class="saved-meal__delete"
        data-meal-delete="${meal.id}"
        aria-label="Delete ${escapeHtml(meal.name)}"
      >×</button>
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
    : '<p class="saved-meals__hint">It won\'t take long before you have a few go-to meals. Eggs and oatmeal. Chicken and rice. Save your go-to meals to speed up menu planning. Tap a saved meal to add it to the active day.</p>';

  document.querySelectorAll('[data-meal-apply]').forEach((button) => {
    button.addEventListener('click', () => {
      applySavedMealFromTap(button.dataset.mealApply);
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
    container.innerHTML = '<p class="food-stack__hint">From the first column, tap a food category — e.g. protein or grains/starches — to see the curated food choices appear in this column. Tap a food to add it to the first column.</p>';
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

function printFoodAmount(foodName, servings) {
  const food = foods.find((item) => item.name === foodName);
  if (!food) return `${fmtServings(servings)} servings`;
  return scaledLabel(food, servings);
}

function mealSlotPrintParts(mealSlotId) {
  const schedule = mealSlotsById[mealSlotId];
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  return {
    time: schedule?.time || '',
    label: daySlot?.label || mealSlotId,
  };
}

function mealFoodLinesForPrint(mealSlotId, weekDay) {
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  if (!daySlot) return [];
  const lines = [];
  templateSlots(daySlot.template).forEach((categorySlot) => {
    if (isFatSlot(categorySlot)) {
      getFatSelections(mealSlotId, weekDay).forEach((item) => {
        lines.push({
          foodName: item.foodName,
          amount: printFoodAmount(item.foodName, item.servings),
        });
      });
      return;
    }
    const selected = categorySelections(mealSlotId, weekDay)[categorySlot];
    if (selected) {
      lines.push({
        foodName: selected.foodName,
        amount: printFoodAmount(selected.foodName, selected.servings),
      });
    }
  });
  return lines;
}

function renderAgendaCell(foodLines) {
  if (!foodLines.length) {
    return '<span class="agenda-cell-empty" aria-hidden="true">—</span>';
  }
  return `
    <ul class="agenda-foods">
      ${foodLines.map((line) => `
        <li>
          <span class="agenda-food">${escapeHtml(line.foodName)}</span>
          <span class="agenda-amount">${escapeHtml(line.amount)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function mealSlotHasAnyContent(mealSlotId) {
  return WEEK_DAYS.some((day) => mealFoodLinesForPrint(mealSlotId, day.id).length > 0);
}

function buildWeekAgendaContent() {
  if (!weekPlanHasContent()) {
    return '<p class="assistant-empty">No meals planned for this week yet. Fill in your menu planner, then open Print Assistant again.</p>';
  }

  const name = escapeHtml(programClientName(programPackage));

  return `
    <div class="agenda-section">
      <h2 class="agenda-section-title">Weekly Meal Schedule</h2>
      <p class="agenda-section-sub">Burn &amp; Build Diet · Meal schedule for ${name}</p>
      <table class="agenda-table">
        <thead>
          <tr>
            <th class="agenda-table-corner" scope="col"><span class="visually-hidden">Meal</span></th>
            ${WEEK_DAYS.map((day) => `
              <th class="agenda-day-head" scope="col">${escapeHtml(day.label)}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${DAY_SLOTS.map((mealSlot) => {
            if (!mealSlotHasAnyContent(mealSlot.id)) return '';
            const { time, label } = mealSlotPrintParts(mealSlot.id);
            return `
              <tr class="agenda-row">
                <th class="agenda-row-head" scope="row">
                  ${time ? `<span class="agenda-time">${escapeHtml(time)}</span>` : ''}
                  <span class="agenda-meal-label">${escapeHtml(label)}</span>
                </th>
                ${WEEK_DAYS.map((day) => `
                  <td class="agenda-cell">
                    ${renderAgendaCell(mealFoodLinesForPrint(mealSlot.id, day.id))}
                  </td>
                `).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function buildWeekPlanReportHeaderHtml() {
  const name = escapeHtml(programClientName(programPackage));
  const date = escapeHtml(formatProgramDateLong(
    programPackage?.program?.issuedAt || programPackage?.program?.foodPlanCreatedDate,
  ));
  const logoUrl = escapeHtml(new URL('../img/brand/bblogo.png', window.location.href).href);
  return `
    <header class="assistant-doc-header assistant-doc-header--report">
      <img class="assistant-logo" src="${logoUrl}" alt="Burn &amp; Build" width="120" height="120" />
      <div class="assistant-doc-titles">
        <p class="assistant-doc-eyebrow">Personalized nutrition plan for</p>
        <h1 class="assistant-doc-name">${name}</h1>
        <p class="assistant-doc-guide">Burn &amp; Build Diet · Week Plan</p>
        <p class="assistant-doc-date">${date}</p>
      </div>
    </header>
  `;
}

function weekPlanHasContent() {
  let found = false;
  iterWeekFoodSelections(() => {
    found = true;
  });
  return found;
}

function buildShoppingListContent() {
  const totals = buildShoppingTotals();
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

  if (!shoppingRows.length) {
    return '<p class="assistant-empty">No ingredients in this week\'s plan yet.</p>';
  }

  return shoppingRows.map((group) => `
    <section class="assistant-section">
      <h2>${escapeHtml(group.category)}</h2>
      <ul class="assistant-list">
        ${group.rows.map((row) => `
          <li>
            <label class="assistant-row">
              <input type="checkbox" class="assistant-check" />
              <span class="assistant-food">${escapeHtml(row.foodName)}</span>
            </label>
            <span class="assistant-amount">${escapeHtml(row.amount)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `).join('');
}

function buildAssistantHeaderHtml(title) {
  const name = escapeHtml(programClientName(programPackage));
  const date = escapeHtml(formatProgramDateLong(
    programPackage?.program?.issuedAt || programPackage?.program?.foodPlanCreatedDate,
  ));
  const logoUrl = escapeHtml(new URL('../img/brand/bblogo.png', window.location.href).href);
  return `
    <header class="assistant-doc-header">
      <img class="assistant-logo" src="${logoUrl}" alt="Burn &amp; Build" width="160" height="160" />
      <div class="assistant-doc-titles">
        <p class="assistant-doc-brand">Burn &amp; Build Diet</p>
        <h1 class="assistant-doc-title">${escapeHtml(title)}</h1>
        <p class="assistant-doc-meta">Prepared for ${name} · ${date}</p>
      </div>
    </header>
  `;
}

function buildPrintDocumentHtml(view = 'week') {
  const shoppingHtml = buildShoppingListContent();
  const weekHtml = buildWeekAgendaContent();
  const weekHeaderHtml = buildWeekPlanReportHeaderHtml();
  const shoppingHeaderHtml = buildAssistantHeaderHtml('Shopping List');
  const weekFooterHtml = `
    <footer class="assistant-doc-footer">
      <span>Burn &amp; Build Diet</span>
      <span>Week Plan · ${escapeHtml(programClientName(programPackage))}</span>
    </footer>
  `;
  const bodyClass = view === 'shopping' ? 'view-shopping' : 'view-week';
  const documentContent = view === 'shopping'
    ? `
      <section class="assistant-panel">
        ${shoppingHeaderHtml}
        ${shoppingHtml}
      </section>
    `
    : `
      <section class="assistant-panel">
        ${weekHeaderHtml}
        ${weekHtml}
        ${weekFooterHtml}
      </section>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Burn &amp; Build — Print Assistant</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page portrait-page { size: portrait; margin: 0.5in; }
    @page landscape-page { size: landscape; margin: 0.35in; }
    body {
      font-family: "Open Sans", system-ui, sans-serif;
      background: #ececec;
      color: #111111;
      margin: 0;
    }
    body.view-shopping {
      page: portrait-page;
    }
    body.view-week {
      page: landscape-page;
    }
    .assistant-document {
      background: #ffffff;
      color: #111111;
      margin: 0 auto;
      padding: 36px 44px 52px;
    }
    body.view-shopping .assistant-document {
      max-width: 720px;
    }
    body.view-week .assistant-document {
      max-width: none;
    }
    .assistant-doc-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 28px;
      margin-bottom: 28px;
      padding-bottom: 22px;
      border-bottom: 1px solid #e8e8e8;
    }
    .assistant-doc-header--report {
      align-items: flex-start;
      justify-content: flex-start;
      gap: 24px;
      margin-bottom: 24px;
    }
    .assistant-logo {
      display: block;
      width: 120px;
      height: auto;
      flex-shrink: 0;
    }
    .assistant-doc-titles {
      text-align: left;
    }
    .assistant-doc-eyebrow {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 0.62rem;
      font-weight: 600;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 6px;
    }
    .assistant-doc-name {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 2.15rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #111;
      line-height: 1.05;
      margin-bottom: 8px;
    }
    .assistant-doc-guide {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #444;
      margin-bottom: 4px;
    }
    .assistant-doc-date {
      font-size: 0.8rem;
      color: #666;
    }
    .assistant-doc-brand {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 4px;
    }
    .assistant-doc-title {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 2rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #111;
      line-height: 1.05;
      margin-bottom: 8px;
    }
    .assistant-doc-meta {
      font-size: 0.82rem;
      color: #666;
      letter-spacing: 0.01em;
    }
    .assistant-doc-footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e8e8e8;
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #999;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
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
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 0.9rem;
      padding: 4px 0;
      border-bottom: 1px solid #eee;
    }
    .assistant-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      flex: 1;
      min-width: 0;
      cursor: pointer;
    }
    .assistant-check {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: #c9a000;
    }
    .assistant-food { flex: 1; }
    .assistant-amount {
      color: #333;
      font-weight: 600;
      text-align: right;
      max-width: 45%;
    }
    .assistant-empty { color: #666; font-size: 0.9rem; }
    .agenda-section-title {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #111;
      margin-bottom: 4px;
    }
    .agenda-section-sub {
      font-size: 0.78rem;
      color: #666;
      margin-bottom: 18px;
    }
    .agenda-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .agenda-table-corner {
      width: 76px;
      border-bottom: 2px solid transparent;
    }
    .agenda-day-head {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-align: center;
      color: #111;
      padding: 0 6px 8px;
      border-bottom: 2px solid #fdc500;
      vertical-align: bottom;
    }
    .agenda-row-head {
      font-family: Oswald, system-ui, sans-serif;
      vertical-align: top;
      text-align: right;
      padding: 26px 10px 26px 0;
      border-bottom: 1px solid #ececec;
      width: 76px;
    }
    .agenda-row:last-child .agenda-row-head,
    .agenda-row:last-child .agenda-cell {
      border-bottom: none;
    }
    .agenda-cell {
      vertical-align: top;
      padding: 26px 10px;
      border-bottom: 1px solid #ececec;
      border-left: 1px solid #f2f2f2;
    }
    .agenda-time {
      display: block;
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      color: #111;
      line-height: 1.2;
    }
    .agenda-meal-label {
      display: block;
      font-size: 0.56rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #777;
      line-height: 1.25;
      margin-top: 1px;
    }
    .agenda-cell-empty {
      display: block;
      color: #d8d8d8;
      font-size: 0.85rem;
      text-align: center;
      line-height: 1;
    }
    .agenda-foods {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .agenda-foods li {
      display: flex;
      flex-direction: column;
      gap: 1px;
      font-size: 0.72rem;
      line-height: 1.35;
    }
    .agenda-food {
      font-weight: 400;
      color: #222;
    }
    .agenda-amount {
      font-weight: 700;
      font-size: 0.68rem;
      color: #111;
    }
    @media print {
      body { background: #fff; }
      .assistant-document {
        padding: 0;
        margin: 0;
        max-width: none;
      }
      .assistant-doc-header {
        margin-bottom: 20px;
        padding-bottom: 16px;
      }
      .assistant-logo {
        width: 100px;
      }
      .assistant-doc-name {
        font-size: 1.85rem;
      }
      .agenda-row-head,
      .agenda-cell {
        padding-top: 22px;
        padding-bottom: 22px;
      }
    }
  </style>
</head>
<body class="${bodyClass}">
  <article class="assistant-document">
    ${documentContent}
  </article>
</body>
</html>`;
}

let printFrame = null;

function printPlannerDocument(view) {
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.title = 'Print';
    Object.assign(printFrame.style, {
      position: 'fixed',
      width: '0',
      height: '0',
      border: '0',
      visibility: 'hidden',
    });
    document.body.appendChild(printFrame);
  }

  const frameWin = printFrame.contentWindow;
  const frameDoc = frameWin.document;
  frameDoc.open();
  frameDoc.write(buildPrintDocumentHtml(view));
  frameDoc.close();

  const triggerPrint = () => {
    frameWin.focus();
    frameWin.print();
  };

  frameWin.requestAnimationFrame(() => {
    window.setTimeout(triggerPrint, 250);
  });
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

function initPrintChoiceDialog() {
  const dialog = document.getElementById('print-choice-dialog');
  if (!dialog) return;

  dialog.querySelector('#print-choice-cancel')?.addEventListener('click', () => {
    dialog.close();
  });

  dialog.querySelectorAll('[data-print-view]').forEach((button) => {
    button.addEventListener('click', () => {
      printPlannerDocument(button.dataset.printView);
      dialog.close();
    });
  });
}

function openPrintAssistant() {
  const dialog = document.getElementById('print-choice-dialog');
  if (dialog) {
    dialog.showModal();
    return;
  }
  printPlannerDocument('week');
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
  initPrintChoiceDialog();
}

let plannerShellReady = false;
let plannerBootPromise = null;

function renderPlannerWorkspace() {
  renderWeekGrid();
  renderActiveDayLabel();
  renderDayColumn();
  renderSavedMeals();
  renderFoodFilterLabel();
  renderFoodFilters();
  renderFoodStack();
}

function applyProgramPackage(pkg) {
  programPackage = pkg;
  if (programPackage?.program?.id) {
    setActiveProgramId(programPackage.program.id);
  }
  applyPlannerState(plannerStateFromPackage(programPackage));
  initMealSlotsFromProgram(programPackage);
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
    const response = await fetch(`../data/foods.json?v=${FOODS_DATA_VERSION}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Could not load foods catalog.');
    }
    foods = await response.json();
    initWeekGrid();
    initSaveMealDialog();
    initClearDayMenu();
    initClearWeekMenu();
    initFoodSearch();
    initPrintAssistant();
    initFoodDropTargets();
    plannerShellReady = true;
  })();

  await plannerBootPromise;
}

window.addEventListener('beforeunload', () => {
  persistPlannerToProgram({ immediate: true });
});
