const FOOD_CATEGORIES = [
  { id: 'protein', label: 'Protein' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'grain', label: 'Grains' },
  { id: 'starch', label: 'Starches' },
  { id: 'vegetable', label: 'Vegetables' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'fat', label: 'Fats' },
];

let foods = [];
let activeCategory = 'protein';
let previewServings = 1;

function scaledLabel(food, servings) {
  if (food.unitsPerServing > 0) {
    const count = Math.ceil(food.unitsPerServing * servings);
    return `${count} ${food.servingDescription}`;
  }
  return `${Math.round(food.gramWeight * servings)} g`;
}

function foodsInCategory(category) {
  return foods
    .filter((food) => food.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderFoodFilters() {
  const container = document.getElementById('food-filters');
  container.innerHTML = FOOD_CATEGORIES.map((cat) => `
    <button
      type="button"
      class="food-filter${cat.id === activeCategory ? ' food-filter--active' : ''}"
      data-category="${cat.id}"
    >${cat.label}</button>
  `).join('');

  container.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      renderFoodFilters();
      renderFoodStack();
    });
  });
}

function renderFoodStack() {
  const container = document.getElementById('food-stack');
  const list = foodsInCategory(activeCategory);

  container.innerHTML = list.map((food) => `
    <div class="card card--food">
      <p class="card__title">${food.name}</p>
      <p class="card__detail">${previewServings} × ${scaledLabel(food, 1)} = ${scaledLabel(food, previewServings)}</p>
    </div>
  `).join('');
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
    renderFoodStack();
  });
  updateServingsUI();
}

function initMealDragDrop() {
  const mealSources = document.querySelectorAll('[data-meal-source]');
  const dropZones = document.querySelectorAll('[data-drop-zone]');

  mealSources.forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-meal-html', card.innerHTML);
      card.classList.add('card--dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('card--dragging');
    });
  });

  dropZones.forEach((zone) => {
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
  renderFoodFilters();
  initServingsControls();
  renderFoodStack();
  initMealDragDrop();
}

init().catch((error) => {
  console.error(error);
  const stack = document.getElementById('food-stack');
  stack.innerHTML = '<p class="food-stack__error">Could not load foods. Open via a local server from the repo root.</p>';
});
