const FOOD_CATEGORIES = [
  { id: 'protein', label: 'Protein' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'grain', label: 'Grains' },
  { id: 'starch', label: 'Starches' },
  { id: 'vegetable', label: 'Vegetables' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'fat', label: 'Fats' },
];

const SLOT_META = {
  protein: { label: 'Protein', categories: ['protein'] },
  gs: { label: 'G / S', categories: ['grain', 'starch'] },
  vegetable: { label: 'Veggie', categories: ['vegetable'], optional: true },
  fat: { label: 'Extra Fat', categories: ['fat'], optional: true },
  fruit: { label: 'Fruit', categories: ['fruit'] },
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
      { slot: 'G / S', foodName: 'Oats, rolled', servings: 2 },
      { slot: 'Fruit', foodName: 'Blueberries', servings: 1 },
    ],
  },
  {
    id: 'chicken-bowl',
    name: 'Chicken Bowl',
    pickCount: 42,
    items: [
      { slot: 'Protein', foodName: 'Chicken breast, no skin', servings: 2 },
      { slot: 'G / S', foodName: 'Rice, white', servings: 2 },
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
      { slot: 'G / S', foodName: 'Rice, brown', servings: 2 },
      { slot: 'Veggie', foodName: 'Peppers, red bell, cooked', servings: 1 },
    ],
  },
  {
    id: 'tilapia-plate',
    name: 'Tilapia Plate',
    pickCount: 5,
    items: [
      { slot: 'Protein', foodName: 'Tilapia, baked', servings: 2 },
      { slot: 'G / S', foodName: 'Sweet potato, baked', servings: 1 },
      { slot: 'Veggie', foodName: 'Asparagus, cooked', servings: 1 },
    ],
  },
];

let foods = [];
let activeSlot = null;
let daySlotSelections = {};
let daySlotMeta = {};
const expandedMeals = new Set();
let pendingSaveDaySlotId = null;

function templateSlots(template) {
  return TEMPLATE_SLOTS[template];
}

DAY_SLOTS.forEach((daySlot) => {
  daySlotSelections[daySlot.id] = {};
  daySlotMeta[daySlot.id] = { mealName: null, savedMealId: null };
  templateSlots(daySlot.template).forEach((slot) => {
    daySlotSelections[daySlot.id][slot] = null;
  });
});

daySlotSelections.breakfast.gs = { foodName: 'Oats, rolled', servings: 2 };
daySlotSelections['morning-snack'].fruit = { foodName: 'Apple', servings: 1 };
daySlotSelections.lunch.protein = { foodName: 'Chicken breast, no skin', servings: 2 };
daySlotSelections.lunch.gs = { foodName: 'Rice, white', servings: 2 };
daySlotSelections.lunch.vegetable = { foodName: 'Broccoli, cooked', servings: 1 };
daySlotMeta.lunch = { mealName: 'Chicken Bowl', savedMealId: 'chicken-bowl' };
daySlotSelections['evening-snack'].fruit = { foodName: 'Blueberries', servings: 1 };

function scaledLabel(food, servings) {
  if (food.unitsPerServing > 0) {
    const count = Math.ceil(food.unitsPerServing * servings);
    return `${count} ${food.servingDescription}`;
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

function activeCategories() {
  if (!activeSlot) return [];
  return SLOT_META[activeSlot.categorySlot].categories;
}

function isCategorySlotActive(daySlotId, categorySlot) {
  return activeSlot?.daySlotId === daySlotId && activeSlot?.categorySlot === categorySlot;
}

function isFruitOnlySnack(daySlotId) {
  const daySlot = DAY_SLOTS.find((item) => item.id === daySlotId);
  if (daySlot.template !== 'snack') return false;
  const selections = daySlotSelections[daySlotId];
  return selections.fruit != null && selections.fat == null;
}

function acceptsSavedMealDrop(daySlotId) {
  const daySlot = DAY_SLOTS.find((item) => item.id === daySlotId);
  return daySlot.template !== 'snack';
}

function isDaySlotSaveable(daySlotId) {
  if (isFruitOnlySnack(daySlotId)) return false;
  const daySlot = DAY_SLOTS.find((item) => item.id === daySlotId);
  return templateSlots(daySlot.template).every((slotKey) => {
    const meta = SLOT_META[slotKey];
    if (meta.optional) return true;
    return daySlotSelections[daySlotId][slotKey] != null;
  });
}

function showSaveMealButton(daySlotId) {
  return isDaySlotSaveable(daySlotId) && !daySlotMeta[daySlotId].savedMealId;
}

function clearDaySlotMeta(daySlotId) {
  daySlotMeta[daySlotId] = { mealName: null, savedMealId: null };
}

function daySlotToMealItems(daySlotId) {
  const daySlot = DAY_SLOTS.find((item) => item.id === daySlotId);
  return templateSlots(daySlot.template)
    .map((slotKey) => {
      const selected = daySlotSelections[daySlotId][slotKey];
      if (!selected) return null;
      return {
        slot: SLOT_META[slotKey].label,
        foodName: selected.foodName,
        servings: selected.servings,
      };
    })
    .filter(Boolean);
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

function saveMealFromDay(daySlotId, name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const meal = {
    id: mealIdFromName(trimmed),
    name: trimmed,
    pickCount: 1,
    items: daySlotToMealItems(daySlotId),
  };

  SAVED_MEALS.push(meal);
  daySlotMeta[daySlotId] = { mealName: trimmed, savedMealId: meal.id };
  renderDayColumn();
  renderSavedMeals();
}

function openSaveMealDialog(daySlotId) {
  const dialog = document.getElementById('save-meal-dialog');
  const input = document.getElementById('save-meal-name');
  pendingSaveDaySlotId = daySlotId;
  input.value = daySlotMeta[daySlotId].mealName || '';
  dialog.showModal();
  input.focus();
  input.select();
}

function renderDaySlotHeader(daySlot) {
  const meta = daySlotMeta[daySlot.id];
  let nameHtml = '';
  if (meta.mealName) {
    nameHtml = `<span class="slot__meal-name"> · ${escapeHtml(meta.mealName)}</span>`;
  } else if (isFruitOnlySnack(daySlot.id)) {
    const fruit = daySlotSelections[daySlot.id].fruit;
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

function renderCategorySlotButton({ categorySlot, daySlotId, selected }) {
  const meta = SLOT_META[categorySlot];
  const active = isCategorySlotActive(daySlotId, categorySlot);
  const optionalTag = meta.optional ? ' <span class="card__slot-optional">(optional)</span>' : '';
  const emptyHint = meta.optional ? 'Optional — drag food' : 'Tap · drag food';

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

function renderDayColumn() {
  const container = document.getElementById('day-slots');
  container.innerHTML = DAY_SLOTS.map((daySlot) => {
    const selections = daySlotSelections[daySlot.id];
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
    button.addEventListener('click', () => {
      activeSlot = {
        daySlotId: button.dataset.daySlotId,
        categorySlot: button.dataset.categorySlot,
      };
      renderDayColumn();
      renderFoodFilterLabel();
      renderFoodFilters();
      renderFoodStack();
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
  const categories = activeCategories();
  if (!categories.length) return [];
  return foods
    .filter((food) => categories.includes(food.category))
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
  const categories = activeCategories();

  if (!categories.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = FOOD_CATEGORIES
    .filter((cat) => categories.includes(cat.id))
    .map((cat) => `
      <span class="food-filter food-filter--active">${cat.label}</span>
    `)
    .join('');
}

function renderFoodStack() {
  const container = document.getElementById('food-stack');
  const list = foodsForActiveSlot();

  if (!activeSlot) {
    container.innerHTML = '';
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

  initFoodDragDrop();
}

function fillDaySlot(daySlotId, categorySlot, foodName) {
  clearDaySlotMeta(daySlotId);
  daySlotSelections[daySlotId][categorySlot] = {
    foodName,
    servings: 1,
  };
  renderDayColumn();
}

function applySavedMealToDay(daySlotId, meal) {
  if (!acceptsSavedMealDrop(daySlotId)) return;
  const labelToSlot = {
    Protein: 'protein',
    'G / S': 'gs',
    Veggie: 'vegetable',
    'Extra Fat': 'fat',
    Fruit: 'fruit',
  };
  templateSlots(DAY_SLOTS.find((slot) => slot.id === daySlotId).template).forEach((slotKey) => {
    daySlotSelections[daySlotId][slotKey] = null;
  });
  meal.items.forEach((item) => {
    const slotKey = labelToSlot[item.slot];
    if (slotKey && daySlotSelections[daySlotId][slotKey] !== undefined) {
      daySlotSelections[daySlotId][slotKey] = {
        foodName: item.foodName,
        servings: item.servings,
      };
    }
  });
  daySlotMeta[daySlotId] = { mealName: meal.name, savedMealId: meal.id };
  meal.pickCount += 1;
  renderDayColumn();
  renderSavedMeals();
}

function initFoodDragDrop() {
  document.querySelectorAll('[data-food-name]').forEach((card) => {
    if (card.dataset.dragBound) return;
    card.dataset.dragBound = '1';

    card.addEventListener('dragstart', (event) => {
      if (!activeSlot) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-food-name', card.dataset.foodName);
      card.classList.add('card--dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('card--dragging');
    });
  });
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

async function init() {
  const response = await fetch('../data/foods.json');
  foods = await response.json();
  renderDayColumn();
  renderSavedMeals();
  renderFoodFilterLabel();
  renderFoodFilters();
  initSaveMealDialog();
  renderFoodStack();
  initFoodDropTargets();
}

init().catch((error) => {
  console.error(error);
  const stack = document.getElementById('food-stack');
  stack.innerHTML = '<p class="food-stack__error">Could not load foods. Open via a local server from the repo root.</p>';
});
