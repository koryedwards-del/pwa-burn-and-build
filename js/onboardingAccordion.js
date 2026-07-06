import {
  canProceed,
  heightDisplay,
  welcomeScreens,
} from './onboardingEngine.js';
import { renderQuestionBody, renderConfirmBody } from './onboardingUI.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

const SECTIONS = [
  {
    id: 'about',
    title: 'About you',
    hint: 'Name, sex, height, age',
    questions: [0, 1, 2],
  },
  {
    id: 'body',
    title: 'Your body',
    hint: 'Weight and body fat %',
    questions: [3, 4],
  },
  {
    id: 'life',
    title: 'Work & lifestyle',
    hint: 'Your job and daily stress',
    questions: [5, 6],
  },
  {
    id: 'exercise',
    title: 'Exercise',
    hint: 'Training and fat-burning activity',
    questions: [7, 8],
  },
  {
    id: 'rhythm',
    title: 'Daily rhythm',
    hint: 'Wake time and meal reminders',
    questions: [9],
  },
  {
    id: 'review',
    title: 'Review & build',
    hint: 'Confirm your answers',
    review: true,
  },
];

function sectionValid(section, form) {
  if (section.review) return true;
  return section.questions.every((qi) => canProceed({ kind: 'question', index: qi }, form));
}

function sectionSummary(section, form) {
  if (!sectionValid(section, form)) return '';
  if (section.id === 'about') {
    return [form.preferredName, form.sex, heightDisplay(form.heightInches), `age ${form.age}`]
      .filter(Boolean)
      .join(' · ');
  }
  if (section.id === 'body') {
    const w = Number(form.weightText);
    const bf = Number(form.fatPercentText);
    if (!w || !bf) return '';
    return `${form.weightText} lbs · ${form.fatPercentText}% body fat`;
  }
  if (section.id === 'life') return 'Work & lifestyle saved';
  if (section.id === 'exercise') return 'Exercise plan saved';
  if (section.id === 'rhythm') return 'Daily rhythm saved';
  return 'Complete';
}

function renderIntro() {
  const screen = welcomeScreens()[0];
  return `
    <div class="acc-intro">
      <div class="acc-intro-headline">
        <div class="ob-welcome-line1">${screen.line1}</div>
        <div class="ob-welcome-line2">${screen.line2}</div>
      </div>
      <p class="acc-intro-body">${screen.body}</p>
      ${renderTestimonyBlock({
        quote: screen.quote,
        name: screen.quoteName,
        meta: screen.quoteMeta,
      })}
    </div>`;
}

function renderSectionBody(section, form) {
  if (section.review) {
    return `<div class="ob-confirm">${renderConfirmBody(form, false)}</div>`;
  }
  return section.questions.map((qi) => `
    <div class="acc-question" data-question="${qi}">
      ${renderQuestionBody(qi, form)}
    </div>`).join('');
}

function renderSection(section, form, openId, index) {
  const open = section.id === openId;
  const done = section.review ? false : sectionValid(section, form);
  const summary = sectionSummary(section, form);
  const isLast = index === SECTIONS.length - 1;

  return `
    <section class="acc-panel ${open ? 'is-open' : ''} ${done ? 'is-done' : ''}" data-acc-section="${section.id}">
      <button type="button" class="acc-trigger" data-acc-toggle="${section.id}" aria-expanded="${open}">
        <span class="acc-trigger-text">
          <span class="acc-title">${section.title}</span>
          <span class="acc-hint">${open || !summary ? section.hint : summary}</span>
        </span>
        <span class="acc-chevron" aria-hidden="true">${open ? '−' : done ? '✓' : '+'}</span>
      </button>
      <div class="acc-body" ${open ? '' : 'hidden'}>
        ${renderSectionBody(section, form)}
        <button type="button" class="acc-continue ob-next ${sectionValid(section, form) ? '' : 'disabled'}"
          data-acc-continue="${section.id}"
          ${sectionValid(section, form) ? '' : 'disabled'}>
          ${isLast ? 'BUILD MY FOOD PLAN →' : 'SAVE & CONTINUE →'}
        </button>
      </div>
    </section>`;
}

export function renderAccordion(store) {
  const form = store.onboardingForm;
  const openId = store.accordionSection || 'about';
  const completed = SECTIONS.filter((s) => !s.review && sectionValid(s, form)).length;

  return `
    <div class="accordion-flow">
      <div class="acc-scroll">
        <div class="acc-progress-meta">${completed} of ${SECTIONS.length - 1} sections complete</div>
        ${renderIntro()}
        <div class="acc-sections">
          ${SECTIONS.map((section, i) => renderSection(section, form, openId, i)).join('')}
        </div>
      </div>
    </div>`;
}

let accordionBound = false;
let accordionCtx = { store: null, render: null, onConfirm: null, onBeforeReview: null };

function syncAccordionButtons() {
  const form = accordionCtx.store?.onboardingForm;
  if (!form) return;
  document.querySelectorAll('.accordion-flow [data-acc-continue]').forEach((btn) => {
    const section = SECTIONS.find((s) => s.id === btn.dataset.accContinue);
    const ok = section && sectionValid(section, form);
    btn.disabled = !ok;
    btn.classList.toggle('disabled', !ok);
  });
}

function ensureAccordionDelegation() {
  if (accordionBound) return;
  accordionBound = true;

  document.addEventListener('input', (e) => {
    if (e.target.closest('.accordion-flow')) syncAccordionButtons();
  });
  document.addEventListener('change', (e) => {
    if (e.target.closest('.accordion-flow')) syncAccordionButtons();
  });

  document.addEventListener('click', (e) => {
    if (!accordionCtx.store || !e.target.closest('.accordion-flow')) return;
    if (e.target.closest('input, select, textarea, label.ob-radio, label.ob-check')) return;

    const store = accordionCtx.store;
    const toggle = e.target.closest('[data-acc-toggle]');
    if (toggle) {
      store.accordionSection = toggle.dataset.accToggle;
      accordionCtx.render?.();
      return;
    }

    const cont = e.target.closest('[data-acc-continue]');
    if (!cont || cont.disabled || cont.classList.contains('disabled')) return;

    const sectionId = cont.dataset.accContinue;
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section || !sectionValid(section, store.onboardingForm)) return;

    if (section.review) {
      accordionCtx.onConfirm?.(store.onboardingForm);
      return;
    }

    const idx = SECTIONS.findIndex((s) => s.id === sectionId);
    const next = SECTIONS[idx + 1];
    if (next?.id === 'review' && accordionCtx.onBeforeReview && !accordionCtx.onBeforeReview()) return;

    store.accordionSection = next?.id || 'review';
    accordionCtx.render?.();
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
  if (!store.accordionSection) store.accordionSection = 'about';
}
