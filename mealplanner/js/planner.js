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
  fat: { label: 'Extra Fat', categories: ['fat'] },
  fruit: { label: 'Fruit', categories: ['fruit'] },
};

const MEAL_BUILDERS = [
  { id: 'lunch', label: 'Lunch', slots: ['protein', 'gs', 'vegetable', 'fat'] },
  { id: 'snack', label: 'Snack', slots: ['fruit', 'fat'] },
];

const SAVED_MEALS = [
  {
    id: 'oatmeal-bowl',
    name: 'Oatmeal Bowl',
    items: [
      { slot: 'G / S', foodName: 'Oats, rolled', servings: 2 },
      { slot: 'Fruit', foodName: 'Blueberries', servings: 1 },
    ],
  },
  {
    id: 'chicken-bowl',
    name: 'Chicken Bowl',
    items: [
      { slot: 'Protein', foodName: 'Chicken breast, no skin', servings: 2 },
      { slot: 'G / S', foodName: 'Rice, white', servings: 2 },
      { slot: 'Veggie', foodName: 'Broccoli, cooked', servings: 1 },
    ],
  },
  {
    id: 'apple-pb',
    name: 'Apple & Peanut Butter',
    items: [
      { slot: 'Fruit', foodName: 'Apple', servings: 1 },
      { slot: 'Extra Fat', foodName: 'Peanut butter', servings: 1 },
    ],
  },
  {
    id: 'yogurt-berries',
    name: 'Yogurt & Berries',
    items: [
      { slot: 'Protein', foodName: 'Greek yogurt, nonfat', servings: 1 },
      { slot: 'Fruit', foodName: 'Blueberries', servings: 1 },
    ],
  },
  {
    id: 'stir-fry',
    name: 'Stir Fry',
    items: [
      { slot: 'Protein', foodName: 'Chicken breast, no skin', servings: 2 },
      { slot: 'G / S', foodName: 'Rice, brown', servings: 2 },
      { slot: 'Veggie', foodName: 'Peppers, red bell, cooked', servings: 1 },
    ],
  },
  {
    id: 'tilapia-plate',
    name: 'Tilapia Plate',
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
const expandedMeals = new Set();

MEAL_BUILDERS.forEach((builder) => {
  slotSelections[builder.id] = {};
  builder.slots.forEach((slot) => {
    slotSelections[builder.id][slot] = null;
  });
});

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
  return SLOT_META[activeSlot.slot].categories;
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

function renderSavedMeals() {
  const container = document.getElementById('saved-meals');
  container.innerHTML = SAVED_MEALS.map((meal) => {
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
  }).join('');

  container.querySelectorAll('[data-meal-toggle]').forEach((button) => {
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

function isSlotActive(builderId, slotKey) {
  return activeSlot?.builder === builderId && activeSlot?.slot === slotKey;
}

function renderMealBuilders() {
  MEAL_BUILDERS.forEach((builder) => {
    const container = document.getElementById(`${builder.id}-slots`);
    container.innerHTML = builder.slots.map((slotKey) => {
      const meta = SLOT_META[slotKey];
      const selected = slotSelections[builder.id][slotKey];
      const active = isSlotActive(builder.id, slotKey);

      if (selected) {
        const food = foods.find((item) => item.name === selected.foodName);
        const detail = food
          ? `${selected.servings} × ${scaledLabel(food, 1)} = ${scaledLabel(food, selected.servings)}`
          : '';
        return `
          <button
            type="button"
            class="card card--slot card--filled${active ? ' card--slot-active' : ''}"
            data-builder="${builder.id}"
            data-slot="${slotKey}"
          >
            <span class="card__slot-label">${meta.label}</span>
            <p class="card__title">${escapeHtml(selected.foodName)}</p>
            ${detail ? `<p class="card__detail">${detail}</p>` : ''}
          </button>
        `;
      }

      return `
        <button
          type="button"
          class="card card--slot card--empty${active ? ' card--slot-active' : ''}"
          data-builder="${builder.id}"
          data-slot="${slotKey}"
        >
          <span class="card__slot-label">${meta.label}</span>
          <span class="card__slot-hint">Tap to pick</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('[data-slot]').forEach((button) => {
      button.addEventListener('click', () => {
        activeSlot = {
          builder: button.dataset.builder,
          slot: button.dataset.slot,
        };
        renderMealBuilders();
        renderFoodFilterLabel();
        renderFoodFilters();
        renderFoodStack();
      });
    });
  });
}

function renderFoodFilterLabel() {
  const label = document.getElementById('food-filter-label');
  if (!activeSlot) {
    label.textContent = 'Select a slot to filter foods';
    return;
  }
  const builder = MEAL_BUILDERS.find((item) => item.id === activeSlot.builder);
  const slot = SLOT_META[activeSlot.slot];
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
    container.innerHTML = '<p class="food-stack__hint">Tap an empty slot in Lunch or Snack to load foods.</p>';
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
    renderFoodStack();
  });
  updateServingsUI();
}

function fillSlot(builderId, slotKey, foodName) {
  slotSelections[builderId][slotKey] = {
    foodName,
    servings: previewServings,
  };
  renderMealBuilders();
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

  document.querySelectorAll('[data-slot]').forEach((slot) => {
    if (slot.dataset.dropBound) return;
    slot.dataset.dropBound = '1';

    slot.addEventListener('dragover', (event) => {
      if (!activeSlot) return;
      if (activeSlot.builder !== slot.dataset.builder || activeSlot.slot !== slot.dataset.slot) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      slot.classList.add('drop-zone--over');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drop-zone--over');
    });

    slot.addEventListener('drop', (event) => {
      event.preventDefault();
      slot.classList.remove('drop-zone--over');
      const foodName = event.dataTransfer.getData('application/x-food-name');
      if (!foodName) return;
      fillSlot(slot.dataset.builder, slot.dataset.slot, foodName);
    });
  });
}

function initMealDragDrop() {
  const mealSources = document.querySelectorAll('[data-meal-source]');
  const dropZones = document.querySelectorAll('[data-drop-zone]');

  mealSources.forEach((card) => {
    if (card.dataset.mealDragBound) return;
    card.dataset.mealDragBound = '1';

    card.addEventListener('dragstart', (event) => {
      const meal = SAVED_MEALS.find((item) => item.id === card.dataset.mealId);
      if (!meal) return;
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-meal-html', mealDragHtml(meal));
      card.classList.add('card--dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('card--dragging');
    });
  });

  dropZones.forEach((zone) => {
    if (zone.dataset.dropBound) return;
    zone.dataset.dropBound = '1';

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

      const html = event.dataTransfer.getData('application/x-meal-html');
      if (!html) return;

      zone.classList.remove('card--empty');
      zone.classList.add('card--meal');
      zone.innerHTML = html;
      zone.removeAttribute('data-drop-zone');
    });
  });
}

async function init() {
  const response = await fetch('../data/foods.json');
  foods = await response.json();
  renderMealBuilders();
  renderSavedMeals();
  renderFoodFilterLabel();
  renderFoodFilters();
  initServingsControls();
  renderFoodStack();
}

init().catch((error) => {
  console.error(error);
  const stack = document.getElementById('food-stack');
  stack.innerHTML = '<p class="food-stack__error">Could not load foods. Open via a local server from the repo root.</p>';
});
