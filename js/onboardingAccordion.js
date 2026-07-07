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
  renderCollapsiblePanel,
  renderLockedPanel,
} from './onboardingUI.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

const SECTIONS = [
  { id: 'intro', title: 'Getting started', intro: true },
  { id: 'personal', title: 'Personal details', personal: true },
  { id: 'body', title: 'Your body', questions: [4] },
  { id: 'work', title: 'Job, lifestyle & activity', workActivity: true },
  { id: 'rhythm', title: 'Daily rhythm', questions: [9] },
  { id: 'review', title: 'Review & build', review: true },
];

const REVIEW_INDEX = SECTIONS.length - 1;

function getActiveIndex(store) {
  if (store.accordionSection === 'review' && (store.accordionMax ?? 0) >= REVIEW_INDEX) {
    return REVIEW_INDEX;
  }
  const sectionIndex = SECTIONS.findIndex((s) => s.id === store.accordionSection);
  if (sectionIndex >= 0 && sectionIndex <= (store.accordionMax ?? 0)) {
    return sectionIndex;
  }
  return Math.min(store.accordionMax ?? 0, REVIEW_INDEX);
}

function sectionCanContinue(section, form, store) {
  if (section.review) return !!store?.reviewViewed;
  return sectionValid(section, form);
}

function markReviewViewed() {
  const store = accordionCtx.store;
  if (!store || store.reviewViewed) return;
  store.reviewViewed = true;
  sessionStorage.setItem('bnb_review_viewed', '1');
  syncAccordionButtons();
}

function sectionValid(section, form) {
  if (section.intro || section.review) return true;
  if (section.personal) return personalSectionValid(form);
  if (section.workActivity) return jobLifestyleSectionValid(form);
  return section.questions.every((qi) => canProceed({ kind: 'question', index: qi }, form));
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

function renderSectionPanel(section, form, open, complete) {
  if (section.intro) return renderCollapsiblePanel('Getting started', renderIntroBody(), open, complete);
  if (section.personal) return renderPersonalDetails(form, open, complete);
  if (section.workActivity) return renderJobLifestyleActivity(form, open, complete);
  if (section.review) {
    return renderCollapsiblePanel(
      'Review & build',
      `<div class="ob-confirm">${renderConfirmBody(form, false, { accordionEdit: true })}</div>`,
      open,
      complete,
    );
  }
  const inner = section.questions.map((qi) => `
    <div class="acc-question" data-question="${qi}">
      ${renderQuestionBody(qi, form)}
    </div>`).join('');
  return renderCollapsiblePanel(section.title, inner, open, complete);
}

function continueLabel(section) {
  if (section.intro) return 'Start building →';
  if (section.id === 'rhythm') return 'Review & build →';
  if (section.review) return 'Build my food plan →';
  return 'Continue →';
}

function renderProgressRail(activeIndex) {
  return `
    <div class="acc-rail" aria-label="Section ${activeIndex + 1} of ${SECTIONS.length}">
      ${SECTIONS.map((_, i) => `
        <span class="acc-dot ${i < activeIndex ? 'is-done' : ''} ${i === activeIndex ? 'is-current' : ''} ${i > activeIndex ? 'is-future' : ''}"></span>`).join('')}
    </div>`;
}

const SECTION_LABELS = {
  intro: 'Getting started',
  personal: 'Personal details',
  body: 'Your body',
  work: 'Job, lifestyle & activity',
  rhythm: 'Daily rhythm',
  review: 'Review & build',
};

function sectionLabel(section) {
  return SECTION_LABELS[section.id] || section.title;
}

function renderStackItem(section, form, index, activeIndex, store) {
  const isActive = index === activeIndex;
  const isDone = index < activeIndex;
  const isLocked = index > activeIndex;

  if (isLocked) {
    return `
      <div class="acc-stack-item is-locked" data-stack-index="${index}" data-acc-section="${section.id}">
        ${renderLockedPanel(sectionLabel(section))}
      </div>`;
  }

  const complete = section.review
    ? !!store.reviewViewed
    : (isDone || sectionValid(section, form));
  const open = isActive;
  const canContinue = isActive && sectionCanContinue(section, form, store);

  return `
    <div class="acc-stack-item ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}"
      data-stack-index="${index}" data-acc-section="${section.id}">
      ${renderSectionPanel(section, form, open, complete)}
      ${isActive ? `
      <button type="button" class="acc-continue ${canContinue ? '' : 'disabled'}"
        data-acc-continue="${section.id}"
        ${canContinue ? '' : 'disabled'}>
        ${continueLabel(section)}
      </button>` : ''}
    </div>`;
}

export function renderAccordion(store) {
  const form = store.onboardingForm;
  const activeIndex = getActiveIndex(store);

  return `
    <div class="accordion-flow artshow-flow">
      <div class="acc-stage">
        ${renderProgressRail(activeIndex)}
        <div class="acc-stack">
          ${SECTIONS.map((section, i) => renderStackItem(section, form, i, activeIndex, store)).join('')}
        </div>
      </div>
    </div>`;
}

let accordionBound = false;
let accordionCtx = { store: null, render: null, onConfirm: null, onBeforeReview: null };

function syncReviewBody(form) {
  const stackItem = document.querySelector('.artshow-flow [data-acc-section="review"]');
  if (!stackItem || stackItem.classList.contains('is-locked')) return;
  const confirm = stackItem.querySelector('.ob-confirm');
  if (!confirm) return;
  confirm.innerHTML = renderConfirmBody(form, false, { accordionEdit: true });
}

function setAccordionPanelOpen(panel, open) {
  if (!panel || panel.classList.contains('is-locked')) return;
  const fields = panel.querySelector('.pd-fields');
  const trigger = panel.querySelector('[data-pd-toggle]');
  panel.classList.toggle('is-open', open);
  if (fields) fields.hidden = !open;
  if (trigger) {
    trigger.setAttribute('aria-expanded', String(open));
    const chev = trigger.querySelector('.pd-chevron');
    if (chev) chev.textContent = open ? '−' : '+';
  }
}

function closeAllAccordionPanels(root = document.querySelector('.artshow-flow')) {
  root?.querySelectorAll('.pd-panel.is-open').forEach((panel) => {
    setAccordionPanelOpen(panel, false);
  });
}

function openAccordionPanel(stackItem) {
  const panel = stackItem?.querySelector('.pd-panel');
  if (!panel || panel.classList.contains('is-locked')) return;
  closeAllAccordionPanels();
  setAccordionPanelOpen(panel, true);
}

function focusAccordionField(sectionId, fieldRef) {
  const stackItem = document.querySelector(`.artshow-flow [data-acc-section="${sectionId}"]`);
  if (!stackItem) return;
  openAccordionPanel(stackItem);

  let el = null;
  if (fieldRef.startsWith('pd-')) {
    el = stackItem.querySelector(`#${fieldRef}`);
  } else if (fieldRef.startsWith('wake-')) {
    el = stackItem.querySelector(`[data-wake-part="${fieldRef.slice(5)}"]`);
  } else if (fieldRef === 'reminders') {
    el = stackItem.querySelector('[data-ob-reminders]');
  } else {
    el = stackItem.querySelector(`[name="${fieldRef}"]`);
  }

  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (typeof el.focus === 'function') {
      el.focus({ preventScroll: true });
    }
  }
}

function openFieldFromReview(sectionId, fieldRef) {
  const index = SECTIONS.findIndex((s) => s.id === sectionId);
  if (index < 0) return;
  scrollToStackItem(index);
  window.requestAnimationFrame(() => {
    focusAccordionField(sectionId, fieldRef);
  });
}

function syncAccordionButtons() {
  const store = accordionCtx.store;
  const form = store?.onboardingForm;
  if (!form) return;
  const activeIndex = getActiveIndex(store);
  const activeSection = SECTIONS[activeIndex];
  const ok = sectionCanContinue(activeSection, form, store);

  document.querySelectorAll('.artshow-flow [data-acc-continue]').forEach((btn) => {
    btn.disabled = !ok;
    btn.classList.toggle('disabled', !ok);
  });

  document.querySelectorAll('.artshow-flow .acc-stack-item').forEach((el) => {
    const idx = Number(el.dataset.stackIndex);
    const section = SECTIONS[idx];
    const complete = section.review
      ? !!store.reviewViewed
      : (idx < activeIndex || (idx === activeIndex && sectionValid(section, form)));
    el.querySelector('.pd-panel')?.classList.toggle('is-complete', complete);
  });

  syncReviewBody(form);
  enforceSingleOpenPanel();
}

function enforceSingleOpenPanel() {
  const root = document.querySelector('.artshow-flow');
  if (!root) return;
  const openPanels = root.querySelectorAll('.pd-panel.is-open');
  if (openPanels.length <= 1) return;
  const keep = openPanels[openPanels.length - 1];
  openPanels.forEach((panel) => {
    if (panel !== keep) setAccordionPanelOpen(panel, false);
  });
}

function scrollToStackItem(index) {
  window.requestAnimationFrame(() => {
    document.querySelector(`[data-stack-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
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

    const editRow = e.target.closest('[data-acc-edit-section]');
    if (editRow) {
      markReviewViewed();
      openFieldFromReview(editRow.dataset.accEditSection, editRow.dataset.accEditField);
      return;
    }

    if (e.target.closest('[data-acc-section="review"]') && !e.target.closest('[data-acc-continue]')) {
      markReviewViewed();
    }

    const pdToggle = e.target.closest('[data-pd-toggle]');
    if (pdToggle) {
      const panel = pdToggle.closest('.pd-panel');
      if (panel?.classList.contains('is-locked')) return;
      const willOpen = !panel.classList.contains('is-open');
      if (willOpen) {
        closeAllAccordionPanels();
        setAccordionPanelOpen(panel, true);
        if (panel.closest('[data-acc-section="review"]')) markReviewViewed();
      } else {
        setAccordionPanelOpen(panel, false);
      }
      return;
    }

    if (e.target.closest('input, select, textarea, label.ob-radio, label.ob-check')) return;

    const cont = e.target.closest('[data-acc-continue]');
    if (!cont || cont.disabled || cont.classList.contains('disabled')) return;

    const store = accordionCtx.store;
    const activeIndex = getActiveIndex(store);
    const section = SECTIONS[activeIndex];
    if (cont.dataset.accContinue !== section.id || !sectionCanContinue(section, store.onboardingForm, store)) return;

    if (section.review) {
      accordionCtx.onConfirm?.(store.onboardingForm);
      return;
    }

    const next = SECTIONS[activeIndex + 1];
    if (next?.id === 'review' && accordionCtx.onBeforeReview && !accordionCtx.onBeforeReview()) return;

    if (next?.id === 'review') {
      store.reviewViewed = false;
      sessionStorage.removeItem('bnb_review_viewed');
    }

    store.accordionMax = activeIndex + 1;
    store.accordionSection = next.id;
    accordionCtx.render?.();
    scrollToStackItem(activeIndex + 1);
  });
}

export function bindAccordionEvents(store, { render, onConfirm, onBeforeReview }) {
  accordionCtx.store = store;
  accordionCtx.render = render;
  accordionCtx.onConfirm = onConfirm;
  accordionCtx.onBeforeReview = onBeforeReview;
  ensureAccordionDelegation();
  syncAccordionButtons();
  enforceSingleOpenPanel();
}

export function syncAccordionSection(store) {
  if (store.accordionMax == null) store.accordionMax = 0;
  if (store.accordionSection === 'review') return;
  const legacy = { about: 'personal', life: 'work', exercise: 'work' };
  if (legacy[store.accordionSection]) store.accordionSection = legacy[store.accordionSection];
  store.accordionSection = SECTIONS[store.accordionMax]?.id || 'intro';
}
