import {
  canProceed,
  welcomeScreens,
} from './onboardingEngine.js';
import {
  renderQuestionBody,
  renderConfirmBody,
  renderPersonalDetails,
  personalSectionValid,
  renderJobLifestyleActivity,
  jobLifestyleSectionValid,
} from './onboardingUI.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

const SECTIONS = [
  {
    id: 'intro',
    title: 'Opening',
    frame: 'Ready?',
    intro: true,
  },
  {
    id: 'personal',
    title: 'Personal details',
    frame: 'Personal',
    personal: true,
  },
  {
    id: 'body',
    title: 'Your body',
    frame: 'Body',
    questions: [4],
  },
  {
    id: 'work',
    title: 'Job, lifestyle & activity',
    frame: 'Work',
    workActivity: true,
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

function isPanelSection(section) {
  return section.personal || section.workActivity;
}

function sectionValid(section, form) {
  if (section.intro || section.review) return true;
  if (section.personal) return personalSectionValid(form);
  if (section.workActivity) return jobLifestyleSectionValid(form);
  return section.questions.every((qi) => canProceed({ kind: 'question', index: qi }, form));
}

function currentSection(store) {
  if (store.accordionSection === 'review' && (store.accordionMax ?? 0) >= REVIEW_INDEX) {
    return { section: SECTIONS[REVIEW_INDEX], index: REVIEW_INDEX };
  }
  const index = Math.min(store.accordionMax ?? 0, REVIEW_INDEX - 1);
  return { section: SECTIONS[index], index };
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
  const complete = sectionValid(section, form);
  if (section.intro) return renderIntroBody();
  if (section.personal) return renderPersonalDetails(form, true, complete);
  if (section.workActivity) return renderJobLifestyleActivity(form, true, complete);
  if (section.review) {
    return `<div class="ob-confirm">${renderConfirmBody(form, false, { readOnly: true })}</div>`;
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

function renderFrame(section, form, index) {
  const canContinue = sectionValid(section, form);
  const panel = isPanelSection(section);

  return `
    <article class="acc-frame ${panel ? 'acc-frame-panel' : ''} ${canContinue && !section.intro && !section.review ? 'is-complete' : ''}" data-acc-section="${section.id}">
      ${panel ? '' : `
      <div class="acc-placard">
        <span class="acc-step">${String(index + 1).padStart(2, '0')}</span>
        <span class="acc-frame-title">${section.frame}</span>
      </div>`}
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
  const { section, index } = currentSection(store);

  return `
    <div class="accordion-flow artshow-flow">
      <div class="acc-stage">
        ${renderProgressRail(index)}
        ${isPanelSection(section) ? '' : `
        <div class="acc-stage-toolbar">
          <span class="acc-stage-label">${section.title}</span>
        </div>`}
        ${renderFrame(section, form, index)}
      </div>
    </div>`;
}

let accordionBound = false;
let accordionCtx = { store: null, render: null, onConfirm: null, onBeforeReview: null };

function syncAccordionButtons() {
  const store = accordionCtx.store;
  const form = store?.onboardingForm;
  if (!form) return;
  const { section } = currentSection(store);
  const btn = document.querySelector('.artshow-flow [data-acc-continue]');
  const ok = sectionValid(section, form);
  if (btn && section) {
    btn.disabled = !ok;
    btn.classList.toggle('disabled', !ok);
  }
  document.querySelector('.artshow-flow .pd-panel')?.classList.toggle('is-complete', ok);
  document.querySelector('.artshow-flow .acc-frame')?.classList.toggle('is-complete', ok && !section.intro && !section.review);
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

    const pdToggle = e.target.closest('[data-pd-toggle]');
    if (pdToggle) {
      const panel = pdToggle.closest('.pd-panel');
      const fields = panel?.querySelector('.pd-fields');
      if (panel && fields) {
        const open = panel.classList.toggle('is-open');
        fields.hidden = !open;
        pdToggle.setAttribute('aria-expanded', String(open));
        const chev = pdToggle.querySelector('.pd-chevron');
        if (chev) chev.textContent = open ? '−' : '+';
      }
      return;
    }

    if (e.target.closest('input, select, textarea, label.ob-radio, label.ob-check')) return;

    const cont = e.target.closest('[data-acc-continue]');
    if (!cont || cont.disabled || cont.classList.contains('disabled')) return;

    const store = accordionCtx.store;
    const { section, index } = currentSection(store);
    if (cont.dataset.accContinue !== section.id || !sectionValid(section, store.onboardingForm)) return;

    if (section.review) {
      accordionCtx.onConfirm?.(store.onboardingForm);
      return;
    }

    const next = SECTIONS[index + 1];
    if (next?.id === 'review' && accordionCtx.onBeforeReview && !accordionCtx.onBeforeReview()) return;

    store.accordionMax = index + 1;
    store.accordionSection = next.id;
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
  if (store.accordionMax == null) store.accordionMax = 0;
  if (store.accordionSection === 'review') return;
  const legacy = {
    about: 'personal',
    life: 'work',
    exercise: 'work',
  };
  if (legacy[store.accordionSection]) store.accordionSection = legacy[store.accordionSection];
  store.accordionSection = SECTIONS[store.accordionMax]?.id || 'intro';
}
