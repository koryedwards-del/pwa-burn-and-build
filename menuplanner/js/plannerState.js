import { formatGroceryQuantity } from '../../js/groceryEngine.js';
import {
  attachPlannerStateToPackage,
  flushProgramPersist,
  scheduleProgramPersist,
} from '../../js/menuPlannerState.js';
import { setActiveProgramId } from '../../js/programActive.js';

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

function ensureWeekPlanShape(plan = state.weekPlan) {
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
  state.weekPlan = createFreshWeekPlan();
  state.savedMeals = [];
  state.activeWeekDay = todayWeekDayId();
  state.activeSlot = null;
  state.activeFoodCategory = null;
  state.weekGridCollapsed = false;
}

function collectPlannerState() {
  return {
    version: 1,
    activeWeekDay: state.activeWeekDay,
    weekPlan: state.weekPlan,
    savedMeals: state.savedMeals,
    weekGridCollapsed: state.weekGridCollapsed,
  };
}

function applyPlannerState(saved) {
  resetPlannerState();
  if (!saved || typeof saved !== 'object') return;
  if (saved.weekPlan && typeof saved.weekPlan === 'object') {
    state.weekPlan = saved.weekPlan;
    ensureWeekPlanShape();
  }
  if (Array.isArray(saved.savedMeals)) {
    state.savedMeals = saved.savedMeals;
  }
  if (saved.activeWeekDay && WEEK_DAYS.some((day) => day.id === saved.activeWeekDay)) {
    state.activeWeekDay = saved.activeWeekDay;
  }
  if (saved.weekGridCollapsed === true) {
    state.weekGridCollapsed = true;
  }
}

function persistPlannerToProgram({ immediate = false } = {}) {
  if (!state.programPackage?.program?.id) return;
  state.programPackage = attachPlannerStateToPackage(state.programPackage, collectPlannerState());
  if (immediate) {
    flushProgramPersist(state.programPackage).catch((err) => console.error(err));
    return;
  }
  scheduleProgramPersist(state.programPackage);
}

function todayWeekDayId() {
  return WEEK_DAYS[new Date().getDay()].id;
}


function categorySelections(mealSlotId, weekDay = state.activeWeekDay) {
  return state.weekPlan[weekDay].selections[mealSlotId];
}

function mealSlotMeta(mealSlotId, weekDay = state.activeWeekDay) {
  return state.weekPlan[weekDay].meta[mealSlotId];
}

function templateSlots(template) {
  return TEMPLATE_SLOTS[template];
}

function initMealSlotsFromProgram(pkg) {
  if (!pkg?.plan?.mealSlots) return;
  pkg.plan.mealSlots.forEach((slot) => {
    const id = SLOT_LABEL_TO_ID[slot.label];
    if (id) state.mealSlotsById[id] = slot;
  });
}

function fmtServings(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value - Math.round(value)) < 0.05) return String(Math.round(value));
  return value.toFixed(1);
}

function requiredServings(daySlotId, categorySlot) {
  const slot = state.mealSlotsById[daySlotId];
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
  if (!state.programPackage) return 'Tap or drag food';
  if (required <= 0 && SLOT_META[categorySlot]?.optional) return 'Optional';
  return `${fmtServings(required)} serving${Math.abs(required - 1) < 0.05 ? '' : 's'}`;
}

function savedMealById(id) {
  return state.savedMeals.find((meal) => meal.id === id);
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
  if (!state.activeSlot) return [];
  return SLOT_META[state.activeSlot.categorySlot].categories;
}

function ensureActiveFoodCategory() {
  const categories = slotFoodCategories();
  if (!categories.length) {
    state.activeFoodCategory = null;
    return;
  }
  if (categories.length === 1) {
    state.activeFoodCategory = categories[0];
    return;
  }
  if (!state.activeFoodCategory || !categories.includes(state.activeFoodCategory)) {
    state.activeFoodCategory = categories[0];
  }
}

function isCategorySlotActive(daySlotId, categorySlot) {
  return state.activeSlot?.daySlotId === daySlotId && state.activeSlot?.categorySlot === categorySlot;
}

function isFatSlot(categorySlot) {
  return categorySlot === 'fat';
}

function getFatSelections(mealSlotId, weekDay = state.activeWeekDay) {
  const fat = categorySelections(mealSlotId, weekDay)?.fat;
  if (!fat) return [];
  return Array.isArray(fat) ? fat : [fat];
}

function setFatSelections(mealSlotId, items, weekDay = state.activeWeekDay) {
  categorySelections(mealSlotId, weekDay).fat = items.length ? items : null;
}

function isFruitOnlySnack(mealSlotId, weekDay = state.activeWeekDay) {
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  if (daySlot.template !== 'snack') return false;
  const selections = categorySelections(mealSlotId, weekDay);
  return selections.fruit != null && getFatSelections(mealSlotId, weekDay).length === 0;
}

function acceptsSavedMealDrop(daySlotId) {
  return DAY_SLOTS.some((item) => item.id === daySlotId);
}

/** Grid and assigned slots: meal came from Saved Meals (center column). */
function isAssignedMeal(mealSlotId, weekDay = state.activeWeekDay) {
  const meta = mealSlotMeta(mealSlotId, weekDay);
  return !!(meta.savedMealId && meta.mealName);
}

const SAVED_MEAL_SLOT_LABELS = {
  Protein: 'protein',
  'Grains/Starches': 'gs',
  'G / S': 'gs',
  Veggie: 'vegetable',
  'Extra Fat': 'fat',
  Sugar: 'fat',
  Alcohol: 'fat',
  Fruit: 'fruit',
};

function savedMealSlotKeys(meal) {
  const keys = new Set();
  meal.items.forEach((item) => {
    const slotKey = SAVED_MEAL_SLOT_LABELS[item.slot];
    if (slotKey) keys.add(slotKey);
  });
  return keys;
}

/** Saved meal must cover every required category for the target meal slot. */
function savedMealFitsMealSlot(meal, mealSlotId) {
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  if (!daySlot || !meal?.items?.length) return false;
  const filled = savedMealSlotKeys(meal);
  return templateSlots(daySlot.template).every((slotKey) => {
    if (SLOT_META[slotKey]?.optional) return true;
    return filled.has(slotKey);
  });
}

function isDaySlotSaveable(mealSlotId, weekDay = state.activeWeekDay) {
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

function clearDaySlotMeta(mealSlotId, weekDay = state.activeWeekDay) {
  mealSlotMeta(mealSlotId, weekDay).mealName = null;
  mealSlotMeta(mealSlotId, weekDay).savedMealId = null;
}

function itemSlotLabel(categorySlot, foodName) {
  if (categorySlot !== 'fat') return SLOT_META[categorySlot].label;
  const food = state.foods.find((item) => item.name === foodName);
  return FAT_LANE_SLOT_LABELS[food?.category] || SLOT_META.fat.label;
}

function daySlotToMealItems(mealSlotId, weekDay = state.activeWeekDay) {
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
  while (state.savedMeals.some((meal) => meal.id === id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
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

export const state = {
  savedMeals: [],
  weekGridCollapsed: false,
  foods: [],
  programPackage: null,
  mealSlotsById: {},
  activeSlot: null,
  activeFoodCategory: null,
  foodSearchQuery: '',
  weekPlan: {},
  pendingSaveDaySlotId: null,
  activeWeekDay: null,
};

state.weekPlan = createFreshWeekPlan();
state.activeWeekDay = todayWeekDayId();

export {
  SLOT_LABEL_TO_ID,
  FOOD_CATEGORIES,
  SLOT_META,
  FAT_LANE_SLOT_LABELS,
  DAY_SLOTS,
  TEMPLATE_SLOTS,
  FOODS_DATA_VERSION,
  WEEK_DAYS,
  WEEK_GRID_MEALS,
  WEEK_MEAL_EMPTY_LABEL,
  createEmptyDayState,
  createFreshWeekPlan,
  ensureWeekPlanShape,
  resetPlannerState,
  collectPlannerState,
  applyPlannerState,
  persistPlannerToProgram,
  todayWeekDayId,
  categorySelections,
  mealSlotMeta,
  templateSlots,
  initMealSlotsFromProgram,
  fmtServings,
  requiredServings,
  servingHint,
  savedMealById,
  scaledLabel,
  servingAmountLabel,
  escapeHtml,
  slotFoodCategories,
  ensureActiveFoodCategory,
  isCategorySlotActive,
  isFatSlot,
  getFatSelections,
  setFatSelections,
  isFruitOnlySnack,
  acceptsSavedMealDrop,
  isAssignedMeal,
  savedMealFitsMealSlot,
  isDaySlotSaveable,
  showSaveMealButton,
  clearDaySlotMeta,
  itemSlotLabel,
  daySlotToMealItems,
  mealIdFromName,
  iterWeekFoodSelections,
  foodAmountLabel,
  buildShoppingTotals,
};
