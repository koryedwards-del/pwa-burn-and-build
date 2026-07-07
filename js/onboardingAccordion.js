import {
  WELCOME_COUNT,
  canProceed,
  heightDisplay,
  welcomeScreens,
} from './onboardingEngine.js';
import { renderQuestionBody, renderConfirmBody } from './onboardingUI.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

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

function sectionIndex(id) {
  return SECTIONS.findIndex((s) => s.id === id);
}

function sectionForQuestion(qi) {
  return SECTIONS.find((s) => s.questions?.includes(qi))?.id || 'about';
}

function sectionValid(section, form) {
  if (section.intro || section.review) return true;
  return section.questions.every((qi) => canProceed({ kind: 'question', index: qi }, form));
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
    <div class="acc-art-headline">
      <div class="ob-welcome-line1">${screen.line1}</div>
      <div class="ob-welcome-line2">${screen.line2}</div>
    </div>
    <p class="acc-art-lead">${screen.body}</p>
    ${renderTestimonyBlock({
      quote: screen.quote,
      name: screen.quoteName,
      meta: screen.quoteMeta,
      className: 'acc-art-quote',
    })}`;
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

function renderFrame(section, form, index, maxUnlocked) {
  const canContinue = index <= maxUnlocked && sectionValid(section, form);
  const step = String(index + 1).padStart(2, '0');

  return `
    <article class="acc-frame" data-acc-section="${section.id}">
      <div class="acc-placard">
        <span class="acc-step">${step}</span>
        <span class="acc-frame-title">${section.frame}</span>
      </div>
      <div class="acc-frame-body">
        ${renderSectionBody(section, form)}
      </div>
      <button type="button" class="acc-continue ${canContinue ? '' : 'disabled'}"
        data-acc-continue="${section.id}"
        ${canContinue ? '' : 'disabled'}>
        ${continueLabel(section)}
      </button>
    </article>`;
}

export function renderAccordion(store) {
  const form = store.onboardingForm;
  const openId = store.accordionSection || 'intro';
  const openIndex = Math.max(0, sectionIndex(openId));
  const section = SECTIONS[openIndex] || SECTIONS[0];
  const maxUnlocked = store.accordionMax ?? deriveAccordionMax(form);
  const showBack = openIndex > 0;

  return `
    <div class="accordion-flow artshow-flow">
      <div class="acc-stage">
        ${renderProgressRail(openIndex)}
        <div class="acc-stage-toolbar">
          ${showBack ? '<button type="button" class="acc-back" data-acc-back>← Back</button>' : '<span class="acc-back-spacer"></span>'}
          <span class="acc-stage-label">${section.title}</span>
        </div>
        ${renderFrame(section, form, openIndex, maxUnlocked)}
      </div>
    </div>`;
}

let accordionBound = false;
let accordionCtx = { store: null, render: null, onConfirm: null, onBeforeReview: null };

function syncAccordionButtons() {
  const store = accordionCtx.store;
  const form = store?.onboardingForm;
  if (!form) return;
  const openId = store.accordionSection || 'intro';
  const openIndex = sectionIndex(openId);
  const section = SECTIONS[openIndex];
  const maxUnlocked = store.accordionMax ?? deriveAccordionMax(form);
  const btn = document.querySelector('.artshow-flow [data-acc-continue]');
  if (!btn || !section) return;
  const ok = openIndex <= maxUnlocked && sectionValid(section, form);
  btn.disabled = !ok;
  btn.classList.toggle('disabled', !ok);
}

function ensureAccordionDelegation() {
  if (accordionBound) return;
  accordionBound = true;

  document.addEventListener('input', (e) => {
    if (e.target.closest('.artshow-flow')) syncAccordionButtons();
  });
  document.addEventListener('change', (e) => {
    if (e.target.closest('.artshow-flow')) syncAccordionButtons();
  });

  document.addEventListener('click', (e) => {
    if (!accordionCtx.store || !e.target.closest('.artshow-flow')) return;
    if (e.target.closest('input, select, textarea, label.ob-radio, label.ob-check')) return;

    const store = accordionCtx.store;
    const openId = store.accordionSection || 'intro';
    const openIndex = sectionIndex(openId);
    const maxUnlocked = store.accordionMax ?? deriveAccordionMax(store.onboardingForm);

    const backBtn = e.target.closest('[data-acc-back]');
    if (backBtn && openIndex > 0) {
      store.accordionSection = SECTIONS[openIndex - 1].id;
      accordionCtx.render?.();
      return;
    }

    const gotoBtn = e.target.closest('[data-ob-goto]');
    if (gotoBtn) {
      const page = Number(gotoBtn.dataset.obGoto);
      const qi = page - WELCOME_COUNT;
      store.accordionSection = sectionForQuestion(qi);
      accordionCtx.render?.();
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
  if (!store.accordionSection) store.accordionSection = 'intro';
  if (store.accordionMax == null) {
    store.accordionMax = deriveAccordionMax(store.onboardingForm);
  }
  const idx = sectionIndex(store.accordionSection);
  if (idx > (store.accordionMax ?? 0) && store.accordionSection !== 'review') {
    store.accordionSection = SECTIONS[store.accordionMax ?? 0]?.id || 'intro';
  }
}
