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
  vegetable: { label: 'Veggie', categories: ['vegetable'] },
  fat: { label: 'Extra Fat', categories: ['fat'], optional: true },
  fruit: { label: 'Fruit', categories: ['fruit'] },
};

const MEAL_BUILDERS = [
  { id: 'lunch', label: 'Build Meal', slots: ['protein', 'gs', 'vegetable', 'fat'] },
  { id: 'snack', label: 'Fruit Snack', slots: ['fruit', 'fat'] },
];

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
let previewServings = 1;
let activeSlot = null;
let slotSelections = {};
let daySlotSelections = {};
const expandedMeals = new Set();

function templateSlots(template) {
  return TEMPLATE_SLOTS[template];
}

MEAL_BUILDERS.forEach((builder) => {
  slotSelections[builder.id] = {};
  builder.slots.forEach((slot) => {
    slotSelections[builder.id][slot] = null;
  });
});

DAY_SLOTS.forEach((daySlot) => {
  daySlotSelections[daySlot.id] = {};
  templateSlots(daySlot.template).forEach((slot) => {
    daySlotSelections[daySlot.id][slot] = null;
  });
});

daySlotSelections.breakfast.gs = { foodName: 'Oats, rolled', servings: 2 };
daySlotSelections['morning-snack'].fruit = { foodName: 'Apple', servings: 1 };
daySlotSelections.lunch.protein = { foodName: 'Chicken breast, no skin', servings: 2 };
daySlotSelections.lunch.gs = { foodName: 'Rice, white', servings: 2 };
daySlotSelections.lunch.vegetable = { foodName: 'Broccoli, cooked', servings: 1 };
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

function isCategorySlotActive(zone, categorySlot, { daySlotId, builderId } = {}) {
  if (!activeSlot || activeSlot.categorySlot !== categorySlot) return false;
  if (zone === 'day') {
    return activeSlot.zone === 'day' && activeSlot.daySlotId === daySlotId;
  }
  return activeSlot.zone === 'builder' && activeSlot.builderId === builderId;
}

function renderCategorySlotButton({
  zone,
  categorySlot,
  daySlotId,
  builderId,
  selected,
}) {
  const meta = SLOT_META[categorySlot];
  const active = isCategorySlotActive(zone, categorySlot, { daySlotId, builderId });
  const optionalTag = meta.optional ? ' <span class="card__slot-optional">(optional)</span>' : '';
  const emptyHint = meta.optional ? 'Optional — drag food' : 'Tap · drag food';
  const dataAttrs = zone === 'day'
    ? `data-day-category data-day-slot-id="${daySlotId}" data-category-slot="${categorySlot}"`
    : `data-builder="${builderId}" data-slot="${categorySlot}"`;

  if (selected) {
    const food = foods.find((item) => item.name === selected.foodName);
    const detail = food
      ? `${selected.servings} × ${scaledLabel(food, 1)} = ${scaledLabel(food, selected.servings)}`
      : '';
    return `
      <button type="button" class="card card--slot card--filled${active ? ' card--slot-active' : ''}" ${dataAttrs}>
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
      ${dataAttrs}
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
    const slots = templateSlots(daySlot.template);
    const categoryHtml = slots
      .map((categorySlot) => renderCategorySlotButton({
        zone: 'day',
        categorySlot,
        daySlotId: daySlot.id,
        selected: selections[categorySlot],
      }))
      .join('');

    return `
      <div class="slot">
        <p class="slot__label">${daySlot.label}</p>
        <div class="day-slot" data-day-meal-drop data-day-slot-id="${daySlot.id}">
          <div class="day-slot__categories">${categoryHtml}</div>
        </div>
      </div>
    `;
  }).join('');

  bindCategorySlotClicks(container, 'day');
}

function bindCategorySlotClicks(container, zone) {
  const selector = zone === 'day' ? '[data-day-category]' : '[data-slot]';
  container.querySelectorAll(selector).forEach((button) => {
    button.addEventListener('click', () => {
      if (zone === 'day') {
        activeSlot = {
          zone: 'day',
          daySlotId: button.dataset.daySlotId,
          categorySlot: button.dataset.categorySlot,
        };
      } else {
        activeSlot = {
          zone: 'builder',
          builderId: button.dataset.builder,
          categorySlot: button.dataset.slot,
        };
      }
      renderDayColumn();
      renderMealBuilders();
      renderFoodFilterLabel();
      renderFoodFilters();
      renderFoodStack();
    });
  });
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

function renderMealBuilders() {
  MEAL_BUILDERS.forEach((builder) => {
    const container = document.getElementById(`${builder.id}-slots`);
    container.innerHTML = builder.slots.map((slotKey) => renderCategorySlotButton({
      zone: 'builder',
      categorySlot: slotKey,
      builderId: builder.id,
      selected: slotSelections[builder.id][slotKey],
    })).join('');

    bindCategorySlotClicks(container, 'builder');
  });
}

function renderFoodFilterLabel() {
  const label = document.getElementById('food-filter-label');
  if (!activeSlot) {
    label.textContent = 'Select a day or build slot to filter foods';
    return;
  }
  const slot = SLOT_META[activeSlot.categorySlot];
  if (activeSlot.zone === 'day') {
    const daySlot = DAY_SLOTS.find((item) => item.id === activeSlot.daySlotId);
    label.textContent = `${daySlot.label} · ${slot.label}`;
    return;
  }
  const builder = MEAL_BUILDERS.find((item) => item.id === activeSlot.builderId);
  label.textContent = `${builder.label} · ${slot.label}`;
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
    container.innerHTML = '<p class="food-stack__hint">Tap a category on the day column or build meal, then drag food.</p>';
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
      <p class="card__detail">${previewServings} × ${scaledLabel(food, 1)} = ${scaledLabel(food, previewServings)}</p>
    </div>
  `).join('');

  initFoodDragDrop();
}

function updateServingsUI() {
  document.querySelectorAll('[data-servings]').forEach((button) => {
    button.classList.toggle('food-servings__btn--active', Number(button.dataset.servings) === previewServings);
  });
}

function initServingsControls() {
  document.getElementById('food-servings-controls').addEventListener('click', (event) => {
    const button = event.target.closest('[data-servings]');
    if (!button) return;
    previewServings = Number(button.dataset.servings);
    updateServingsUI();
    renderMealBuilders();
    renderDayColumn();
    renderFoodStack();
  });
  updateServingsUI();
}

function fillCategorySlot(zone, { daySlotId, builderId, categorySlot }, foodName) {
  const selection = { foodName, servings: previewServings };
  if (zone === 'day') {
    daySlotSelections[daySlotId][categorySlot] = selection;
    renderDayColumn();
    return;
  }
  slotSelections[builderId][categorySlot] = selection;
  renderMealBuilders();
}

function applySavedMealToDay(daySlotId, meal) {
  const daySlot = DAY_SLOTS.find((slot) => slot.id === daySlotId);
  const labelToSlot = {
    Protein: 'protein',
    'G / S': 'gs',
    Veggie: 'vegetable',
    'Extra Fat': 'fat',
    Fruit: 'fruit',
  };
  templateSlots(daySlot.template).forEach((slotKey) => {
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
  if (!daySlots.dataset.dropInit) {
    daySlots.dataset.dropInit = '1';
    daySlots.addEventListener('dragover', (event) => {
      const slot = event.target.closest('[data-day-category]');
      if (!slot || !activeSlot || activeSlot.zone !== 'day') return;
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
      fillCategorySlot('day', {
        daySlotId: slot.dataset.daySlotId,
        categorySlot: slot.dataset.categorySlot,
      }, foodName);
    });
  }

  MEAL_BUILDERS.forEach((builder) => {
    const container = document.getElementById(`${builder.id}-slots`);
    if (container.dataset.dropInit) return;
    container.dataset.dropInit = '1';
    container.addEventListener('dragover', (event) => {
      const slot = event.target.closest('[data-slot][data-builder]');
      if (!slot || !activeSlot || activeSlot.zone !== 'builder') return;
      if (activeSlot.builderId !== slot.dataset.builder
        || activeSlot.categorySlot !== slot.dataset.slot) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      slot.classList.add('drop-zone--over');
    });
    container.addEventListener('dragleave', (event) => {
      const slot = event.target.closest('[data-slot][data-builder]');
      if (slot) slot.classList.remove('drop-zone--over');
    });
    container.addEventListener('drop', (event) => {
      const slot = event.target.closest('[data-slot][data-builder]');
      if (!slot) return;
      event.preventDefault();
      slot.classList.remove('drop-zone--over');
      const foodName = event.dataTransfer.getData('application/x-food-name');
      if (!foodName) return;
      fillCategorySlot('builder', {
        builderId: slot.dataset.builder,
        categorySlot: slot.dataset.slot,
      }, foodName);
    });
  });
}

function initMealDragDrop() {
  const mealSources = document.querySelectorAll('[data-meal-source]');

  mealSources.forEach((card) => {
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
      if (!meal) return;

      applySavedMealToDay(zone.dataset.daySlotId, meal);
    });
  });
}

async function init() {
  const response = await fetch('../data/foods.json');
  foods = await response.json();
  renderDayColumn();
  renderMealBuilders();
  renderSavedMeals();
  renderFoodFilterLabel();
  renderFoodFilters();
  initServingsControls();
  renderFoodStack();
  initFoodDropTargets();
}

init().catch((error) => {
  console.error(error);
  const stack = document.getElementById('food-stack');
  stack.innerHTML = '<p class="food-stack__error">Could not load foods. Open via a local server from the repo root.</p>';
});
