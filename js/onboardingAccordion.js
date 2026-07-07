import {
  canProceed,
  ageFromBirthDate,
  formatBirthDateDigits,
  formatWakeDisplay,
  heightDisplay,
  parseBirthDateText,
  wakeTimeFromParts,
} from './onboardingEngine.js';
import {
  renderAccordionFields,
  renderAccordionIntro,
  renderAccordionReview,
} from './onboardingAccordionUI.js';

const SECTIONS = [
  {
    id: 'intro',
    title: 'Opening',
    frame: 'Ready?',
    intro: true,
  },
  {
    id: 'about',
    title: 'About you',
    frame: 'You',
    questions: [0, 1, 2],
  },
  {
    id: 'body',
    title: 'Your body',
    frame: 'Body',
    questions: [3, 4],
  },
  {
    id: 'life',
    title: 'Work & life',
    frame: 'Life',
    questions: [5, 6],
  },
  {
    id: 'exercise',
    title: 'Exercise',
    frame: 'Move',
    questions: [7, 8],
  },
  {
    id: 'rhythm',
    title: 'Daily rhythm',
    frame: 'Rhythm',
    questions: [9],
  },
  {
    id: 'review',
    title: 'Review',
    frame: 'Build',
    review: true,
  },
];

const REVIEW_INDEX = SECTIONS.length - 1;
const FLOW = '.artshow-flow';

function sectionValid(section, form) {
  if (section.intro || section.review) return true;
  return section.questions.every((qi) => canProceed({ kind: 'question', index: qi }, form));
}

function currentSection(store) {
  if (store.accordionSection === 'review' && (store.accordionMax ?? 0) >= REVIEW_INDEX) {
    return { section: SECTIONS[REVIEW_INDEX], index: REVIEW_INDEX };
  }
  const index = Math.min(store.accordionMax ?? 0, REVIEW_INDEX - 1);
  return { section: SECTIONS[index], index };
}

function renderSectionBody(section, form) {
  if (section.intro) return renderAccordionIntro();
  if (section.review) return renderAccordionReview(form);
  return renderAccordionFields(section.questions, form);
}

function continueLabel(section) {
  if (section.intro) return 'Start building →';
  if (section.review) return 'Build my food plan →';
  return 'Continue →';
}

function renderProgressRail(currentIndex) {
  return `
    <div class="acc-rail" aria-label="Section ${currentIndex + 1} of ${SECTIONS.length}">
      ${SECTIONS.map((_, i) => `
        <span class="acc-dot ${i < currentIndex ? 'is-done' : ''} ${i === currentIndex ? 'is-current' : ''} ${i > currentIndex ? 'is-future' : ''}"></span>`).join('')}
    </div>`;
}

function renderFrame(section, form, index) {
  const canContinue = sectionValid(section, form);

  return `
    <article class="acc-frame" data-acc-section="${section.id}">
      <div class="acc-placard">
        <span class="acc-step">${String(index + 1).padStart(2, '0')}</span>
        <span class="acc-frame-title">${section.frame}</span>
      </div>
      <div class="acc-frame-body">
        ${renderSectionBody(section, form)}
      </div>
      <button type="button" class="acc-continue ${canContinue ? '' : 'is-disabled'}"
        data-acc-continue="${section.id}"
        ${canContinue ? '' : 'disabled'}>
        ${continueLabel(section)}
      </button>
    </article>`;
}

export function renderAccordion(store) {
  const form = store.onboardingForm;
  const { section, index } = currentSection(store);

  return `
    <div class="accordion-flow artshow-flow">
      <div class="acc-stage">
        ${renderProgressRail(index)}
        <div class="acc-stage-toolbar">
          <span class="acc-stage-label">${section.title}</span>
        </div>
        ${renderFrame(section, form, index)}
      </div>
    </div>`;
}

let accordionBound = false;
let accordionCtx = { store: null, render: null, onConfirm: null, onBeforeReview: null };

function updateBoundDisplays(name, value) {
  const num = Number(value);
  document.querySelectorAll(`${FLOW} [data-bind="${name}"]`).forEach((el) => {
    if (el.dataset.format === 'height') el.textContent = heightDisplay(num);
    else el.textContent = value;
  });
  document.querySelectorAll(`${FLOW} [data-bind-sub="${name}"]`).forEach((el) => {
    if (name === 'heightInches') el.textContent = `${Math.round(num)} inches`;
  });
}

function syncAgeFromBirthDate(form) {
  const iso = parseBirthDateText(form.birthDateText);
  form.birthDate = iso || '';
  if (!iso) return;
  const age = ageFromBirthDate(iso);
  if (age == null) return;
  form.age = Math.min(99, Math.max(13, age));
  updateBoundDisplays('age', form.age);
  const range = document.querySelector(`${FLOW} input[name="age"]`);
  if (range) range.value = form.age;
}

function syncWakeTimeFromPicker(form) {
  const hour = document.querySelector(`${FLOW} [data-wake-part="hour"]`)?.value;
  const minute = document.querySelector(`${FLOW} [data-wake-part="minute"]`)?.value;
  const ampm = document.querySelector(`${FLOW} [data-wake-part="ampm"]`)?.value;
  if (!hour || !minute || !ampm) return;
  form.wakeTime = wakeTimeFromParts(hour, minute, ampm);
  const display = document.querySelector(`${FLOW} .acc-wake-display`);
  if (display) display.textContent = formatWakeDisplay(form.wakeTime);
}

function updateReminderToggle(enabled) {
  const btn = document.querySelector(`${FLOW} [data-acc-reminders]`);
  if (!btn) return;
  btn.classList.toggle('is-on', enabled);
  const sub = btn.querySelector('.acc-toggle-sub');
  if (sub) {
    sub.textContent = enabled
      ? 'Burn & Build will notify you when it\'s time to eat.'
      : 'No reminders set.';
  }
}

function syncAccordionButtons() {
  const store = accordionCtx.store;
  const form = store?.onboardingForm;
  if (!form) return;
  const { section } = currentSection(store);
  const btn = document.querySelector(`${FLOW} [data-acc-continue]`);
  if (!btn || !section) return;
  const ok = sectionValid(section, form);
  btn.disabled = !ok;
  btn.classList.toggle('is-disabled', !ok);
}

function ensureAccordionDelegation() {
  if (accordionBound) return;
  accordionBound = true;

  document.addEventListener('input', (e) => {
    const input = e.target;
    if (!accordionCtx.store || !input.closest(FLOW) || !input.name) return;
    const form = accordionCtx.store.onboardingForm;

    if (input.type === 'range') {
      if (input.name === 'age') return;
      form[input.name] = Number(input.value);
      updateBoundDisplays(input.name, input.value);
      syncAccordionButtons();
      return;
    }

    if (input.name === 'birthDateText') {
      const formatted = formatBirthDateDigits(input.value);
      form.birthDateText = formatted;
      input.value = formatted;
      syncAgeFromBirthDate(form);
      syncAccordionButtons();
      return;
    }

    form[input.name] = input.value;
    syncAccordionButtons();
  });

  document.addEventListener('change', (e) => {
    const input = e.target;
    if (!accordionCtx.store || !input.closest(FLOW)) return;
    const form = accordionCtx.store.onboardingForm;
    const flow = input.closest(FLOW);

    if (input.name === 'fatSource') {
      form.fatSource = input.value;
      flow.querySelectorAll('[data-fat-for]').forEach((el) => {
        el.classList.toggle('hidden', el.dataset.fatFor !== input.value);
      });
      flow.querySelectorAll('input[name="fatSource"]').forEach((r) => {
        r.closest('.acc-choice')?.classList.toggle('is-selected', r.checked);
      });
      syncAccordionButtons();
      return;
    }

    if (input.name === 'workPhysical' || input.name === 'workStress') {
      form[input.name] = input.value;
      flow.querySelectorAll(`input[name="${input.name}"]`).forEach((r) => {
        r.closest('.acc-choice')?.classList.toggle('is-selected', r.checked);
      });
      syncAccordionButtons();
      return;
    }

    if (input.name === 'lowActivity') {
      const set = new Set(form.lowActivities);
      if (input.checked) set.add(input.value);
      else set.delete(input.value);
      form.lowActivities = [...set];
      flow.querySelectorAll('input[name="lowActivity"]').forEach((c) => {
        c.closest('.acc-check')?.classList.toggle('is-selected', c.checked);
      });
      return;
    }

    if (input.dataset.wakePart) {
      syncWakeTimeFromPicker(form);
    }
  });

  document.addEventListener('click', (e) => {
    if (!accordionCtx.store || !e.target.closest(FLOW)) return;
    if (e.target.closest('input, select, textarea, label.acc-choice, label.acc-check')) return;

    const store = accordionCtx.store;
    const form = store.onboardingForm;
    const flow = e.target.closest(FLOW);

    const cont = e.target.closest('[data-acc-continue]');
    if (cont) {
      if (cont.disabled || cont.classList.contains('is-disabled')) return;
      const { section, index } = currentSection(store);
      if (cont.dataset.accContinue !== section.id || !sectionValid(section, form)) return;

      if (section.review) {
        accordionCtx.onConfirm?.(form);
        return;
      }

      const next = SECTIONS[index + 1];
      if (next?.id === 'review' && accordionCtx.onBeforeReview && !accordionCtx.onBeforeReview()) return;

      store.accordionMax = index + 1;
      store.accordionSection = next.id;
      accordionCtx.render?.();
      return;
    }

    const sexBtn = e.target.closest('[data-acc-sex]');
    if (sexBtn) {
      form.sex = sexBtn.dataset.accSex;
      flow.querySelectorAll('[data-acc-sex]').forEach((b) => b.classList.toggle('is-active', b === sexBtn));
      syncAccordionButtons();
      return;
    }

    if (e.target.closest('[data-acc-reminders]')) {
      form.remindersEnabled = !form.remindersEnabled;
      updateReminderToggle(form.remindersEnabled);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest(`${FLOW} input, ${FLOW} textarea`)) {
      e.preventDefault();
    }
  });
}

export function bindAccordionEvents(store, { render, onConfirm, onBeforeReview }) {
  accordionCtx.store = store;
  accordionCtx.render = render;
  accordionCtx.onConfirm = onConfirm;
  accordionCtx.onBeforeReview = onBeforeReview;
  ensureAccordionDelegation();
  syncAccordionButtons();
}

export function syncAccordionSection(store) {
  if (store.accordionMax == null) store.accordionMax = 0;
  if (store.accordionSection === 'review') return;
  store.accordionSection = SECTIONS[store.accordionMax]?.id || 'intro';
}
