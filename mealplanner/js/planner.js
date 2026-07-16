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

const SAVED_MEALS = [
  {
    id: 'oatmeal-bowl',
    name: 'Oatmeal Bowl',
    pickCount: 38,
    items: [
      { slot: 'Grains/Starches', foodName: 'Oats, rolled', servings: 2 },
      { slot: 'Fruit', foodName: 'Blueberries', servings: 1 },
    ],
  },
  {
    id: 'chicken-bowl',
    name: 'Chicken Bowl',
    pickCount: 42,
    items: [
      { slot: 'Protein', foodName: 'Chicken breast, no skin', servings: 2 },
      { slot: 'Grains/Starches', foodName: 'Rice, white', servings: 2 },
      { slot: 'Veggie', foodName: 'Broccoli, cooked', servings: 1 },
    ],
  },
  {
    id: 'apple-pb',
    name: 'Apple & Peanut Butter',
    pickCount: 31,
    items: [
      { slot: 'Fruit', foodName: 'Apple', servings: 1 },
      { slot: 'Extra Fat', foodName: 'Peanut butter', servings: 1 },
    ],
  },
  {
    id: 'yogurt-berries',
    name: 'Yogurt & Berries',
    pickCount: 22,
    items: [
      { slot: 'Protein', foodName: 'Greek yogurt, nonfat', servings: 1 },
      { slot: 'Fruit', foodName: 'Blueberries', servings: 1 },
    ],
  },
  {
    id: 'stir-fry',
    name: 'Stir Fry',
    pickCount: 28,
    items: [
      { slot: 'Protein', foodName: 'Chicken breast, no skin', servings: 2 },
      { slot: 'Grains/Starches', foodName: 'Rice, brown', servings: 2 },
      { slot: 'Veggie', foodName: 'Peppers, red bell, cooked', servings: 1 },
    ],
  },
  {
    id: 'tilapia-plate',
    name: 'Tilapia Plate',
    pickCount: 5,
    items: [
      { slot: 'Protein', foodName: 'Tilapia, baked', servings: 2 },
      { slot: 'Grains/Starches', foodName: 'Sweet potato, baked', servings: 1 },
      { slot: 'Veggie', foodName: 'Asparagus, cooked', servings: 1 },
    ],
  },
];

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
let activeWeekDay = 'wed';
let activeSlot = null;
let activeFoodCategory = null;
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

WEEK_DAYS.forEach((day) => {
  weekPlan[day.id] = createEmptyDayState();
});

function categorySelections(mealSlotId, weekDay = activeWeekDay) {
  return weekPlan[weekDay].selections[mealSlotId];
}

function mealSlotMeta(mealSlotId, weekDay = activeWeekDay) {
  return weekPlan[weekDay].meta[mealSlotId];
}

function templateSlots(template) {
  return TEMPLATE_SLOTS[template];
}

function savedMealById(id) {
  return SAVED_MEALS.find((meal) => meal.id === id);
}

function seedWeekPlan() {
  const presets = {
    sun: ['oatmeal-bowl', 'chicken-bowl', 'tilapia-plate'],
    mon: ['oatmeal-bowl', 'chicken-bowl', 'stir-fry'],
    tue: ['oatmeal-bowl', 'chicken-bowl', 'tilapia-plate'],
    thu: ['oatmeal-bowl', 'chicken-bowl', 'stir-fry'],
    fri: ['oatmeal-bowl', 'chicken-bowl', 'tilapia-plate'],
    sat: ['oatmeal-bowl', 'chicken-bowl', 'stir-fry'],
  };

  Object.entries(presets).forEach(([weekDay, mealIds]) => {
    if (weekDay === 'wed') return;
    WEEK_GRID_MEALS.forEach((mealSlotId, index) => {
      const meal = savedMealById(mealIds[index]);
      if (meal) applySavedMealToMealSlot(weekDay, mealSlotId, meal, { trackPick: false });
    });
  });

  weekPlan.wed = createEmptyDayState();
  categorySelections('breakfast', 'wed').gs = { foodName: 'Oats, rolled', servings: 2 };
  categorySelections('morning-snack', 'wed').fruit = { foodName: 'Apple', servings: 1 };
  categorySelections('lunch', 'wed').protein = { foodName: 'Chicken breast, no skin', servings: 2 };
  categorySelections('lunch', 'wed').gs = { foodName: 'Rice, white', servings: 2 };
  categorySelections('lunch', 'wed').vegetable = { foodName: 'Broccoli, cooked', servings: 1 };
  mealSlotMeta('lunch', 'wed').mealName = 'Chicken Bowl';
  mealSlotMeta('lunch', 'wed').savedMealId = 'chicken-bowl';
  categorySelections('evening-snack', 'wed').fruit = { foodName: 'Blueberries', servings: 1 };
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
  while (SAVED_MEALS.some((meal) => meal.id === id)) {
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

  SAVED_MEALS.push(meal);
  mealSlotMeta(mealSlotId).mealName = trimmed;
  mealSlotMeta(mealSlotId).savedMealId = meal.id;
  renderWeekGrid();
  renderDayColumn();
  renderSavedMeals();
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
    ? `${item.servings} × ${scaledLabel(food, 1)} = ${scaledLabel(food, item.servings)}`
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
  const emptyHint = 'Tap or drag food';

  if (selected) {
    const food = foods.find((item) => item.name === selected.foodName);
    const detail = food
      ? `${selected.servings} × ${scaledLabel(food, 1)} = ${scaledLabel(food, selected.servings)}`
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

    const meal = SAVED_MEALS.find((item) => item.id === mealId);
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
  return foods
    .filter((food) => filterCategories.includes(food.category))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mealItemDetail(item) {
  const food = foods.find((entry) => entry.name === item.foodName);
  if (!food) return escapeHtml(item.foodName);
  return `${item.servings} × ${scaledLabel(food, 1)} = ${scaledLabel(food, item.servings)}`;
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
        >${expanded ? '▾' : '▸'}</button>
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
  return [...SAVED_MEALS].sort((a, b) => b.pickCount - a.pickCount);
}

function deleteSavedMeal(mealId) {
  const index = SAVED_MEALS.findIndex((meal) => meal.id === mealId);
  if (index === -1) return;

  SAVED_MEALS.splice(index, 1);
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
}

function renderSavedMeals() {
  const container = document.getElementById('saved-meals');
  container.innerHTML = savedMealsByPopularity().map((meal) => renderSavedMealCard(meal)).join('');

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
    return;
  }
  const daySlot = DAY_SLOTS.find((item) => item.id === activeSlot.daySlotId);
  const slot = SLOT_META[activeSlot.categorySlot];
  label.textContent = `${daySlot.label} · ${slot.label}`;
  label.hidden = false;
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

function renderFoodStack() {
  const container = document.getElementById('food-stack');
  const list = foodsForActiveSlot();

  if (!activeSlot) {
    container.innerHTML = '<p class="food-stack__hint">Tap a slot on the left, then tap or drag a food.</p>';
    return;
  }

  if (!list.length) {
    container.innerHTML = '<p class="food-stack__hint">No foods in this category.</p>';
    return;
  }

  container.innerHTML = list.map((food) => `
    <div
      class="card card--food"
      draggable="true"
      data-food-name="${food.name.replace(/"/g, '&quot;')}"
    >
      <p class="card__title">${escapeHtml(food.name)}</p>
      <p class="card__detail">${scaledLabel(food, 1)}</p>
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
  clearDaySlotMeta(daySlotId);
  if (isFatSlot(categorySlot)) {
    setFatSelections(daySlotId, [
      ...getFatSelections(daySlotId),
      { foodName, servings: 1 },
    ]);
  } else {
    categorySelections(daySlotId)[categorySlot] = {
      foodName,
      servings: 1,
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
      const meal = SAVED_MEALS.find((item) => item.id === card.dataset.mealId);
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

      const meal = SAVED_MEALS.find((item) => item.id === mealId);
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
  if (food.gramWeight) return `${Math.round(food.gramWeight * servings)} g`;
  if (food.unitsPerServing > 0) {
    const count = Math.ceil(food.unitsPerServing * servings);
    return `${count} ${food.servingDescription}`;
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

function dinnerPrepSections() {
  const dinnerSlot = DAY_SLOTS.find((slot) => slot.id === 'dinner');
  return WEEK_DAYS.map((day) => {
    const items = [];
    templateSlots(dinnerSlot.template).forEach((categorySlot) => {
      if (isFatSlot(categorySlot)) {
        getFatSelections('dinner', day.id).forEach((item) => items.push(item));
        return;
      }
      const selected = categorySelections('dinner', day.id)[categorySlot];
      if (selected) items.push(selected);
    });
    if (!items.length) return null;
    const meta = mealSlotMeta('dinner', day.id);
    return {
      dayLabel: day.fullLabel,
      mealName: meta.mealName,
      items,
    };
  }).filter(Boolean);
}

function buildAssistantDocumentHtml() {
  const totals = buildShoppingTotals();
  const dinners = dinnerPrepSections();
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

  const dinnerHtml = dinners.length
    ? dinners.map((dinner) => `
        <section class="assistant-dinner">
          <h3>${escapeHtml(dinner.dayLabel)}${dinner.mealName ? ` · ${escapeHtml(dinner.mealName)}` : ''}</h3>
          <ul class="assistant-list">
            ${dinner.items.map((item) => {
              const food = foods.find((entry) => entry.name === item.foodName);
              return `
                <li><span class="assistant-food">${escapeHtml(item.foodName)}</span><span class="assistant-amount">${escapeHtml(foodAmountLabel(food, item.servings))}</span></li>
              `;
            }).join('')}
          </ul>
        </section>
      `).join('')
    : '<p class="assistant-empty">No dinners planned yet.</p>';

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
    h1 {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .assistant-subtitle {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 28px;
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
    h3 {
      font-family: Oswald, system-ui, sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .assistant-section { margin-bottom: 20px; }
    .assistant-dinner { margin-bottom: 16px; }
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
      white-space: nowrap;
    }
    .assistant-empty { color: #666; font-size: 0.9rem; }
    .assistant-divider {
      border: none;
      border-top: 1px solid #ddd;
      margin: 28px 0;
    }
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
  <h1>Burn &amp; Build</h1>
  <p class="assistant-subtitle">Shopping &amp; Food Prep Assistant</p>
  <h2>Shopping</h2>
  ${shoppingHtml}
  <hr class="assistant-divider" />
  <h2>Dinner Prep</h2>
  ${dinnerHtml}
</body>
</html>`;
}

function openPrintAssistant() {
  const doc = window.open('', '_blank');
  if (!doc) return;
  doc.document.write(buildAssistantDocumentHtml());
  doc.document.close();
}

function initPrintAssistant() {
  document.getElementById('print-assistant').addEventListener('click', openPrintAssistant);
}

async function init() {
  const response = await fetch(`../data/foods.json?v=${FOODS_DATA_VERSION}`, { cache: 'no-store' });
  foods = await response.json();
  seedWeekPlan();
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
  initPrintAssistant();
  renderFoodStack();
  initFoodDropTargets();
}

init().catch((error) => {
  console.error(error);
  const stack = document.getElementById('food-stack');
  stack.innerHTML = '<p class="food-stack__error">Could not load foods. Open via a local server from the repo root.</p>';
});
