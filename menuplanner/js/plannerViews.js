import {
  programClientName,
  programMetaHtml,
} from '../../js/programBridgeUi.js';
import {
  SLOT_LABEL_TO_ID,
  FOOD_CATEGORIES,
  SLOT_META,
  FAT_LANE_SLOT_LABELS,
  DAY_SLOTS,
  TEMPLATE_SLOTS,
  WEEK_DAYS,
  WEEK_GRID_MEALS,
  WEEK_MEAL_EMPTY_LABEL,
  state,
  categorySelections,
  mealSlotMeta,
  templateSlots,
  initMealSlotsFromProgram,
  fmtServings,
  requiredServings,
  servingHint,
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
  isDaySlotSaveable,
  showSaveMealButton,
  clearDaySlotMeta,
  itemSlotLabel,
  daySlotToMealItems,
  mealIdFromName,
  persistPlannerToProgram,
  createEmptyDayState,
} from './plannerState.js';

function renderPlannerMeta() {
  const meta = document.getElementById('planner-meta');
  if (!meta) return;

  if (!state.programPackage?.intake) {
    meta.innerHTML = '';
    return;
  }

  const servings = state.programPackage.plan?.servings;
  const servingsLine = servings
    ? `Protein ${fmtServings(servings.protein)}, G/S ${fmtServings(servings.grainsStarches)}, Fruit ${fmtServings(servings.fruits)}, Veg ${fmtServings(servings.vegetables)}, Fat pts ${fmtServings(servings.fatMaintain)}`
    : '';

  meta.innerHTML = `
    ${programMetaHtml(state.programPackage)}
    ${servingsLine ? `<p class="pb-servings-note">${escapeHtml(programClientName(state.programPackage))} — ${escapeHtml(servingsLine)}</p>` : ''}`;
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

  state.savedMeals.push(meal);
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
  state.pendingSaveDaySlotId = mealSlotId;
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

function scrollMealSlotIntoView(mealSlotId) {
  if (!mealSlotId) return;
  requestAnimationFrame(() => {
    const slotEl = document.getElementById('day-slots')
      ?.querySelector(`[data-meal-slot-id="${mealSlotId}"]`);
    slotEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function scrollActiveMealSlotIntoView() {
  scrollMealSlotIntoView(state.activeSlot?.daySlotId);
}

function defaultCategorySlotForMeal(mealSlotId) {
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  if (!daySlot) return null;
  return templateSlots(daySlot.template)[0] || null;
}

function navigateToDayMealSlot(weekDay, mealSlotId) {
  const daySlot = DAY_SLOTS.find((item) => item.id === mealSlotId);
  const categorySlot = defaultCategorySlotForMeal(mealSlotId);
  if (!daySlot || !categorySlot) return;

  const dayChanged = weekDay !== state.activeWeekDay;
  state.activeWeekDay = weekDay;
  state.activeSlot = {
    daySlotId: mealSlotId,
    categorySlot,
  };
  state.activeFoodCategory = null;
  ensureActiveFoodCategory();

  renderWeekGrid();
  renderActiveDayLabel();
  renderDayColumn();
  renderFoodFilterLabel();
  renderFoodFilters();
  renderFoodStack();
  scrollMealSlotIntoView(mealSlotId);
  if (dayChanged) persistPlannerToProgram();
}

function renderFatItemCard({ item, daySlotId, index }) {
  const food = state.foods.find((entry) => entry.name === item.foodName);
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
    const food = state.foods.find((item) => item.name === selected.foodName);
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
      categorySelections(daySlot.id, state.activeWeekDay)[slot] = null;
    });
    mealSlotMeta(daySlot.id, state.activeWeekDay).mealName = null;
    mealSlotMeta(daySlot.id, state.activeWeekDay).savedMealId = null;
  });
  state.activeSlot = null;
  state.activeFoodCategory = null;
  refreshPlannerAfterMenuChange();
}

function clearWeekMenu() {
  WEEK_DAYS.forEach((day) => {
    state.weekPlan[day.id] = createEmptyDayState();
  });
  state.activeSlot = null;
  state.activeFoodCategory = null;
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
  const grid = document.getElementById('week-grid');
  if (!grid || grid.dataset.clearWeekInit) return;
  grid.dataset.clearWeekInit = '1';
  grid.addEventListener('click', (event) => {
    if (event.target.closest('#clear-week-menu')) {
      clearWeekMenu();
    }
  });
}

function setWeekGridCollapsed(collapsed, { persist = true } = {}) {
  state.weekGridCollapsed = collapsed;
  const panel = document.getElementById('week-panel');
  const toggle = document.getElementById('week-grid-toggle');
  if (panel) {
    panel.classList.toggle('is-collapsed', collapsed);
  }
  if (toggle) {
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.setAttribute('aria-label', collapsed ? 'Show week grid' : 'Hide week grid');
    const icon = toggle.querySelector('[data-week-toggle-icon]');
    if (icon) icon.textContent = collapsed ? '▸' : '▾';
  }
  if (persist) persistPlannerToProgram();
}

function initWeekGridCollapse() {
  const toggle = document.getElementById('week-grid-toggle');
  if (!toggle || toggle.dataset.weekCollapseInit) return;
  toggle.dataset.weekCollapseInit = '1';
  setWeekGridCollapsed(state.weekGridCollapsed, { persist: false });
  toggle.addEventListener('click', () => {
    setWeekGridCollapsed(!state.weekGridCollapsed);
  });
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
    const active = day.id === state.activeWeekDay;
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
      <div class="week-matrix__corner">
        <button type="button" class="day-col__clear week-matrix__clear" id="clear-week-menu">Clear Week</button>
      </div>
      ${headCells}
      ${bodyRows}
    </div>
  `;
}

function setActiveWeekDay(weekDay) {
  if (weekDay === state.activeWeekDay) return;
  state.activeWeekDay = weekDay;
  state.activeSlot = null;
  state.activeFoodCategory = null;
  renderWeekGrid();
  renderActiveDayLabel();
  renderDayColumn();
  renderFoodFilterLabel();
  renderFoodFilters();
  renderFoodStack();
  persistPlannerToProgram();
}

function renderActiveDayLabel() {
  const day = WEEK_DAYS.find((item) => item.id === state.activeWeekDay);
  document.getElementById('active-day-label').textContent = day.fullLabel;
}

function initWeekGrid() {
  const grid = document.getElementById('week-grid');
  if (grid.dataset.weekInit) return;
  grid.dataset.weekInit = '1';

  grid.addEventListener('click', (event) => {
    const mealCell = event.target.closest('[data-meal-slot]');
    if (mealCell?.dataset.mealSlot) {
      navigateToDayMealSlot(mealCell.dataset.weekDay, mealCell.dataset.mealSlot);
      return;
    }
    const dayCell = event.target.closest('.week-matrix__day[data-week-day-select]');
    if (dayCell) {
      setActiveWeekDay(dayCell.dataset.weekDay);
    }
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

    const meal = state.savedMeals.find((item) => item.id === mealId);
    if (!meal) return;

    applySavedMealToMealSlot(cell.dataset.weekDay, cell.dataset.mealSlot, meal);
    navigateToDayMealSlot(cell.dataset.weekDay, cell.dataset.mealSlot);
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
          ${renderDaySlotSaveAction(daySlot)}
          <div class="day-slot__categories">${categoryHtml}</div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-day-category]').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (event.target.closest('[data-fat-remove]')) return;
      state.activeSlot = {
        daySlotId: button.dataset.daySlotId,
        categorySlot: button.dataset.categorySlot,
      };
      state.activeFoodCategory = null;
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
    ? [state.activeFoodCategory]
    : categories;
  const query = state.foodSearchQuery.trim().toLowerCase();
  return state.foods
    .filter((food) => filterCategories.includes(food.category))
    .filter((food) => !query || food.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function syncFoodSearchField() {
  const input = document.getElementById('food-search');
  if (!input) return;
  const show = !!state.activeSlot;
  input.hidden = !show;
  if (!show) {
    input.value = '';
    state.foodSearchQuery = '';
    return;
  }
  if (input.value !== state.foodSearchQuery) {
    input.value = state.foodSearchQuery;
  }
}

function mealDragHtml(meal) {
  return `<p class="card__title">${escapeHtml(meal.name)}</p>`;
}

function resolveSavedMealTargetSlot() {
  const mealSlots = ['breakfast', 'lunch', 'dinner'];
  if (state.activeSlot?.daySlotId && acceptsSavedMealDrop(state.activeSlot.daySlotId)) {
    return state.activeSlot.daySlotId;
  }
  const emptySlot = mealSlots.find((slotId) => {
    const meta = mealSlotMeta(slotId, state.activeWeekDay);
    return !meta.savedMealId && !meta.mealName;
  });
  if (emptySlot) return emptySlot;
  return mealSlots[0];
}

function applySavedMealFromTap(mealId) {
  const meal = state.savedMeals.find((item) => item.id === mealId);
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
  const index = state.savedMeals.findIndex((meal) => meal.id === mealId);
  if (index === -1) return;

  state.savedMeals.splice(index, 1);

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
  if (!state.activeSlot) {
    label.textContent = '';
    label.hidden = true;
    syncFoodSearchField();
    return;
  }
  const daySlot = DAY_SLOTS.find((item) => item.id === state.activeSlot.daySlotId);
  const slot = SLOT_META[state.activeSlot.categorySlot];
  const servings = requiredServings(state.activeSlot.daySlotId, state.activeSlot.categorySlot);
  const servingNote = state.programPackage && !isFatSlot(state.activeSlot.categorySlot)
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
      const active = cat.id === state.activeFoodCategory;
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
      state.activeFoodCategory = button.dataset.foodCategory;
      renderFoodFilters();
      renderFoodStack();
    });
  });
}

function foodCardDetail(food) {
  if (!state.activeSlot || isFatSlot(state.activeSlot.categorySlot)) {
    return scaledLabel(food, 1);
  }
  const servings = requiredServings(state.activeSlot.daySlotId, state.activeSlot.categorySlot);
  if (!state.programPackage || Math.abs(servings - 1) < 0.05) {
    return scaledLabel(food, 1);
  }
  return servingAmountLabel(food, servings);
}

function renderFoodStack() {
  const container = document.getElementById('food-stack');
  const list = foodsForActiveSlot();

  if (!state.activeSlot) {
    container.innerHTML = '<p class="food-stack__hint">From the first column, tap a food category — e.g. protein or grains/starches — to see the curated food choices appear in this column. Tap a food to add it to the first column.</p>';
    return;
  }

  if (!list.length) {
    const hint = state.foodSearchQuery.trim()
      ? 'No state.foods match your search.'
      : 'No state.foods in this category.';
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
  if (!state.activeSlot) return;
  fillDaySlot(state.activeSlot.daySlotId, state.activeSlot.categorySlot, foodName);
}

function initFoodStackInteractions() {
  document.querySelectorAll('[data-food-name]').forEach((card) => {
    if (card.dataset.foodBound) return;
    card.dataset.foodBound = '1';

    let dragged = false;

    card.addEventListener('dragstart', (event) => {
      if (!state.activeSlot) {
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
      if (dragged || !state.activeSlot) return;
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
  if (weekDay === state.activeWeekDay) renderDayColumn();
  renderSavedMeals();
}

function applySavedMealToDay(mealSlotId, meal) {
  applySavedMealToMealSlot(state.activeWeekDay, mealSlotId, meal);
}

function initFoodDropTargets() {
  const daySlots = document.getElementById('day-slots');
  if (daySlots.dataset.dropInit) return;
  daySlots.dataset.dropInit = '1';

  daySlots.addEventListener('dragover', (event) => {
    const slot = event.target.closest('[data-day-category]');
    if (!slot || !state.activeSlot) return;
    if (state.activeSlot.daySlotId !== slot.dataset.daySlotId
      || state.activeSlot.categorySlot !== slot.dataset.categorySlot) return;
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
      const meal = state.savedMeals.find((item) => item.id === card.dataset.mealId);
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

      const meal = state.savedMeals.find((item) => item.id === mealId);
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
    state.pendingSaveDaySlotId = null;
    dialog.close();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.pendingSaveDaySlotId) return;
    saveMealFromDay(state.pendingSaveDaySlotId, input.value);
    state.pendingSaveDaySlotId = null;
    dialog.close();
  });
}

function renderPlannerWorkspace() {
  setWeekGridCollapsed(state.weekGridCollapsed, { persist: false });
  renderWeekGrid();
  renderActiveDayLabel();
  renderDayColumn();
  renderSavedMeals();
  renderFoodFilterLabel();
  renderFoodFilters();
  renderFoodStack();
}

function initFoodSearch() {
  const input = document.getElementById('food-search');
  if (!input) return;
  input.addEventListener('input', () => {
    state.foodSearchQuery = input.value;
    renderFoodStack();
  });
}

export {
  renderPlannerMeta,
  renderPlannerWorkspace,
  initWeekGrid,
  initWeekGridCollapse,
  initSaveMealDialog,
  initClearDayMenu,
  initClearWeekMenu,
  initFoodSearch,
  initFoodDropTargets,
  setWeekGridCollapsed,
};
