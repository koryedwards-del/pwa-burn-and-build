import {
  canProceed,
  heightDisplay,
  welcomeScreens,
} from './onboardingEngine.js';
import { renderQuestionBody, renderConfirmBody } from './onboardingUI.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

const SECTIONS = [
  {
    id: 'intro',
    title: 'Getting started',
    hint: 'Ready? Let\'s build.',
    intro: true,
  },
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

function sectionIndex(id) {
  return SECTIONS.findIndex((s) => s.id === id);
}

function sectionValid(section, form) {
  if (section.intro || section.review) return true;
  return section.questions.every((qi) => canProceed({ kind: 'question', index: qi }, form));
}

function sectionSummary(section, form) {
  if (section.intro) return 'Ready to begin';
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

function deriveAccordionMax(form) {
  let max = 0;
  const hasProgress = !!(form.preferredName?.trim() || Number(form.weightText) > 0);
  for (let i = 0; i < SECTIONS.length; i += 1) {
    const section = SECTIONS[i];
    if (section.intro) {
      if (hasProgress) max = 1;
      continue;
    }
    if (section.review) break;
    if (sectionValid(section, form)) max = i + 1;
    else break;
  }
  return max;
}

function renderIntroBody() {
  const screen = welcomeScreens()[0];
  return `
    <div class="acc-intro-inner">
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
  if (section.intro) return renderIntroBody();
  if (section.review) {
    return `<div class="ob-confirm">${renderConfirmBody(form, false)}</div>`;
  }
  return section.questions.map((qi) => `
    <div class="acc-question" data-question="${qi}">
      ${renderQuestionBody(qi, form)}
    </div>`).join('');
}

function continueLabel(section, index) {
  if (section.intro) return 'START BUILDING →';
  if (section.review) return 'BUILD MY FOOD PLAN →';
  return 'SAVE & CONTINUE →';
}

function renderSection(section, form, openId, index, maxUnlocked) {
  const open = section.id === openId;
  const locked = index > maxUnlocked;
  const done = !section.review && !locked && !open && (
    section.intro ? maxUnlocked > 0 : sectionValid(section, form)
  );
  const summary = sectionSummary(section, form);
  const canContinue = !locked && sectionValid(section, form);

  return `
    <section class="acc-panel ${open ? 'is-open' : ''} ${done ? 'is-done' : ''} ${locked ? 'is-locked' : ''}"
      data-acc-section="${section.id}" data-acc-index="${index}">
      <button type="button" class="acc-trigger" data-acc-toggle="${section.id}" aria-expanded="${open}" ${locked ? 'disabled' : ''}>
        <span class="acc-step">${index + 1}</span>
        <span class="acc-trigger-text">
          <span class="acc-title">${section.title}</span>
          <span class="acc-hint">${locked ? 'Complete the section above first' : (open || !summary ? section.hint : summary)}</span>
        </span>
        <span class="acc-chevron" aria-hidden="true">${locked ? '·' : open ? '−' : done ? '✓' : '+'}</span>
      </button>
      <div class="acc-body" ${open ? '' : 'hidden'}>
        ${renderSectionBody(section, form)}
        <button type="button" class="acc-continue ob-next ${canContinue ? '' : 'disabled'}"
          data-acc-continue="${section.id}"
          ${canContinue ? '' : 'disabled'}>
          ${continueLabel(section, index)}
        </button>
      </div>
    </section>`;
}

export function renderAccordion(store) {
  const form = store.onboardingForm;
  const openId = store.accordionSection || 'intro';
  const maxUnlocked = store.accordionMax ?? deriveAccordionMax(form);
  const contentSections = SECTIONS.filter((s) => !s.intro && !s.review);
  const completed = contentSections.filter((s) => sectionValid(s, form)).length;
  const openIndex = sectionIndex(openId);

  return `
    <div class="accordion-flow">
      <div class="acc-scroll">
        <div class="acc-progress-meta">Section ${Math.max(1, openIndex + 1)} of ${SECTIONS.length} · ${completed} of ${contentSections.length} complete</div>
        <div class="acc-sections">
          ${SECTIONS.map((section, i) => renderSection(section, form, openId, i, maxUnlocked)).join('')}
        </div>
      </div>
    </div>`;
}

let accordionBound = false;
let accordionCtx = { store: null, render: null, onConfirm: null, onBeforeReview: null };

function syncAccordionButtons() {
  const store = accordionCtx.store;
  const form = store?.onboardingForm;
  if (!form) return;
  const maxUnlocked = store.accordionMax ?? deriveAccordionMax(form);
  document.querySelectorAll('.accordion-flow [data-acc-continue]').forEach((btn) => {
    const section = SECTIONS.find((s) => s.id === btn.dataset.accContinue);
    const idx = section ? sectionIndex(section.id) : -1;
    const locked = idx > maxUnlocked;
    const ok = section && !locked && sectionValid(section, form);
    btn.disabled = !ok;
    btn.classList.toggle('disabled', !ok);
  });
}

function scrollToSection(id) {
  window.requestAnimationFrame(() => {
    document.querySelector(`[data-acc-section="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const maxUnlocked = store.accordionMax ?? deriveAccordionMax(store.onboardingForm);

    const toggle = e.target.closest('[data-acc-toggle]');
    if (toggle) {
      if (toggle.disabled) return;
      const idx = sectionIndex(toggle.dataset.accToggle);
      if (idx > maxUnlocked) return;
      store.accordionSection = toggle.dataset.accToggle;
      accordionCtx.render?.();
      scrollToSection(store.accordionSection);
      return;
    }

    const cont = e.target.closest('[data-acc-continue]');
    if (!cont || cont.disabled || cont.classList.contains('disabled')) return;

    const sectionId = cont.dataset.accContinue;
    const section = SECTIONS.find((s) => s.id === sectionId);
    const idx = sectionIndex(sectionId);
    if (!section || idx > maxUnlocked || !sectionValid(section, store.onboardingForm)) return;

    if (section.review) {
      accordionCtx.onConfirm?.(store.onboardingForm);
      return;
    }

    const next = SECTIONS[idx + 1];
    if (next?.id === 'review' && accordionCtx.onBeforeReview && !accordionCtx.onBeforeReview()) return;

    store.accordionMax = Math.max(maxUnlocked, idx + 1);
    store.accordionSection = next?.id || 'review';
    accordionCtx.render?.();
    scrollToSection(store.accordionSection);
  });
}

export function bindAccordionEvents(store, { render, onConfirm, onBeforeReview }) {
  accordionCtx.store = store;
  accordionCtx.render = render;
  accordionCtx.onConfirm = onConfirm;
  accordionCtx.onBeforeReview = onBeforeReview;
  ensureAccordionDelegation();
  syncAccordionButtons();
  scrollToSection(store.accordionSection || 'intro');
}

export function syncAccordionSection(store) {
  if (!store.accordionSection) store.accordionSection = 'intro';
  if (store.accordionMax == null) {
    store.accordionMax = deriveAccordionMax(store.onboardingForm);
  }
}
