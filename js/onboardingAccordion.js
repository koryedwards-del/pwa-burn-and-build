import {
  canProceed,
  welcomeScreens,
} from './onboardingEngine.js';
import {
  renderQuestionBody,
  renderConfirmBody,
  renderPersonalDetails,
  renderEmailDetails,
  personalSectionValid,
  emailSectionValid,
  renderCollapsiblePanel,
} from './onboardingUI.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

const SECTIONS = [
  { id: 'intro', title: 'Getting started', intro: true },
  { id: 'personal', title: 'Personal', personal: true },
  { id: 'job', title: 'Job & lifestyle', questions: [5, 6] },
  { id: 'activity', title: 'Exercise & activities', questions: [7, 8] },
  { id: 'rhythm', title: 'Wake time', questions: [9] },
  { id: 'body', title: 'Body composition', questions: [4] },
  { id: 'email', title: 'Email address', email: true },
  { id: 'review', title: 'Review & approve', review: true },
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
  if (section.review) return true;
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
  if (section.email) return emailSectionValid(form);
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
  if (section.intro) {
    return renderCollapsiblePanel('Getting started', renderIntroBody(), open, complete);
  }
  if (section.personal) return renderPersonalDetails(form, open, complete);
  if (section.email) return renderEmailDetails(form, open, complete);
  if (section.review) {
    return renderCollapsiblePanel(
      'Review & approve',
      `<p class="acc-review-lead">Check your answers below. Tap the pencil on any row to edit.</p>
        <div class="ob-confirm">${renderConfirmBody(form, false, { accordionEdit: true })}</div>`,
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

function continueLabel(section, store) {
  if (store?.accordionEditReturn) return 'Back to review →';
  if (section.intro) return 'Create your diet';
  if (section.id === 'email') return 'Review & approve →';
  if (section.review) {
    return store?.reviewViewed ? 'I approve-create my diet →' : 'I\'ve reviewed my answers →';
  }
  return 'Continue →';
}

const SECTION_LABELS = {
  intro: 'Getting started',
  personal: 'Personal',
  job: 'Job & lifestyle',
  activity: 'Exercise & activities',
  rhythm: 'Wake time',
  body: 'Body composition',
  email: 'Email address',
  review: 'Review & approve',
};

function sectionLabel(section) {
  return SECTION_LABELS[section.id] || section.title;
}

function renderStackItem(section, form, index, activeIndex, maxUnlocked, store) {
  if (index > maxUnlocked) return '';

  const isActive = index === activeIndex;
  const isComplete = index < maxUnlocked && !isActive;
  const open = isActive;
  const canContinue = store.accordionEditReturn || sectionCanContinue(section, form, store);

  return `
    <div class="acc-stack-item ${isActive ? 'is-active' : ''} ${isComplete ? 'is-done' : ''}"
      data-stack-index="${index}" data-acc-section="${section.id}">
      ${renderSectionPanel(section, form, open, isComplete)}
      ${isActive ? `
      <button type="button" class="acc-continue ${canContinue ? '' : 'disabled'}"
        data-acc-continue="${section.id}"
        ${canContinue ? '' : 'disabled'}>
        ${continueLabel(section, store)}
      </button>` : ''}
    </div>`;
}

export function renderAccordion(store) {
  const form = store.onboardingForm;
  const activeIndex = getActiveIndex(store);
  const maxUnlocked = store.accordionMax ?? activeIndex;

  return `
    <div class="accordion-flow artshow-flow">
      <div class="acc-stage">
        <div class="acc-stack">
          ${SECTIONS.map((section, i) => renderStackItem(section, form, i, activeIndex, maxUnlocked, store)).join('')}
        </div>
      </div>
    </div>`;
}

let accordionBound = false;
let accordionCtx = { store: null, render: null, onConfirm: null, onBeforeReview: null };

function syncReviewBody(form) {
  const stackItem = document.querySelector('.artshow-flow [data-acc-section="review"]');
  if (!stackItem) return;
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

function resolveAccordionFieldEl(stackItem, fieldRef) {
  if (!stackItem || !fieldRef) return null;

  if (fieldRef === 'heightDigits') fieldRef = 'pd-height-input';

  if (fieldRef === 'pd-sex') {
    return stackItem.querySelector('#pd-sex .pd-gender-btn.is-active')
      || stackItem.querySelector('#pd-sex .pd-gender-btn');
  }
  if (fieldRef === 'reminders') {
    return stackItem.querySelector('[data-ob-reminders]');
  }
  if (fieldRef.startsWith('wake-')) {
    return stackItem.querySelector(`[data-wake-part="${fieldRef.slice(5)}"]`);
  }

  const byId = document.getElementById(fieldRef);
  if (byId && stackItem.contains(byId)) {
    if (byId.matches('input, select, textarea, button')) return byId;
    const nested = byId.querySelector('input, select, textarea, button');
    if (nested) return nested;
  }

  return stackItem.querySelector(`[name="${CSS.escape(fieldRef)}"]`);
}

function isCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches;
}

function clearReviewEditHighlight(el) {
  if (!el) return;
  el.classList.remove('is-review-edit');
  delete el.dataset.reviewEditReplace;
  el.closest('.pd-box, .pd-box-split, .acc-question')?.classList.remove('is-review-edit');
}

function clearAllReviewEditHighlights() {
  document.querySelectorAll('.artshow-flow input[data-review-edit-replace], .artshow-flow textarea[data-review-edit-replace]')
    .forEach(clearReviewEditHighlight);
  document.querySelectorAll('.artshow-flow .is-review-edit')
    .forEach((node) => node.classList.remove('is-review-edit'));
}

function highlightFieldForReviewEdit(el) {
  clearAllReviewEditHighlights();
  if (!el) return;

  if (!el.matches('input:not([type=radio]):not([type=checkbox]), textarea')) {
    if (typeof el.focus === 'function') {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }
    return;
  }

  el.classList.add('is-review-edit');
  el.closest('.pd-box, .pd-box-split, .acc-question')?.classList.add('is-review-edit');

  if (typeof el.focus === 'function') {
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }

  if (isCoarsePointer()) {
    el.dataset.reviewEditReplace = '1';
    try {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    } catch {
      /* ignore */
    }
    return;
  }

  if (typeof el.select === 'function') {
    el.select();
  }
}

function focusAccordionField(sectionId, fieldRef) {
  const focusTarget = () => {
    const stackItem = document.querySelector(`.artshow-flow [data-acc-section="${sectionId}"]`);
    if (!stackItem) return;

    const panel = stackItem.querySelector('.pd-panel');
    if (panel) setAccordionPanelOpen(panel, true);

    const el = resolveAccordionFieldEl(stackItem, fieldRef);
    if (!el) return;

    const scrollRowId = {
      'pd-height-input': 'pd-height',
      'heightDigits': 'pd-height',
    }[fieldRef];
    const row = (scrollRowId && document.getElementById(scrollRowId))
      || el.closest('.pd-row, .acc-question, .ob-activity-row, .ob-weight-row, .ob-height-row')
      || el;
    row.scrollIntoView({ block: 'center', inline: 'nearest' });

    window.setTimeout(() => {
      highlightFieldForReviewEdit(el);
    }, 50);
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(focusTarget);
  });
}

function openFieldFromReview(sectionId, fieldRef) {
  const store = accordionCtx.store;
  if (!store || !sectionId || !fieldRef) return;
  store.accordionSection = sectionId;
  store.accordionEditReturn = 'review';
  store.accordionPendingFocus = { sectionId, fieldRef };
  accordionCtx.render?.();
}

export function applyPendingAccordionFocus(store) {
  const pending = store?.accordionPendingFocus;
  if (!pending) return;
  delete store.accordionPendingFocus;
  syncAccordionButtons();
  window.setTimeout(() => {
    focusAccordionField(pending.sectionId, pending.fieldRef);
  }, 120);
}

function syncAccordionButtons() {
  const store = accordionCtx.store;
  const form = store?.onboardingForm;
  if (!form) return;
  const activeIndex = getActiveIndex(store);
  const activeSection = SECTIONS[activeIndex];
  const ok = store.accordionEditReturn || sectionCanContinue(activeSection, form, store);

  document.querySelectorAll('.artshow-flow .acc-stack-item').forEach((el) => {
    const idx = Number(el.dataset.stackIndex);
    const isActive = idx === activeIndex;
    const isComplete = idx < (store.accordionMax ?? 0) && !isActive;
    const panel = el.querySelector('.pd-panel');

    el.classList.toggle('is-active', isActive);
    el.classList.toggle('is-done', isComplete);
    setAccordionPanelOpen(panel, isActive);
    panel?.classList.toggle('is-complete', isComplete);

    const btn = el.querySelector('[data-acc-continue]');
    if (btn) {
      const section = SECTIONS[idx];
      if (section) btn.textContent = continueLabel(section, store);
      btn.disabled = !ok || !isActive;
      btn.classList.toggle('disabled', !ok || !isActive);
    }
  });

  syncReviewBody(form);
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

  document.addEventListener('keydown', (e) => {
    const input = e.target;
    if (!input?.closest?.('.artshow-flow') || input.dataset.reviewEditReplace !== '1') return;
    if (!input.matches('input:not([type=radio]):not([type=checkbox]), textarea')) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      input.value = '';
      clearReviewEditHighlight(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      input.value = e.key;
      clearReviewEditHighlight(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  document.addEventListener('focusout', (e) => {
    const input = e.target;
    if (!input?.closest?.('.artshow-flow') || !input.matches('input, textarea')) return;
    window.setTimeout(() => {
      if (document.activeElement === input) return;
      clearReviewEditHighlight(input);
    }, 0);
  });

  document.addEventListener('click', (e) => {
    if (!accordionCtx.store || !e.target.closest('.artshow-flow')) return;
    const store = accordionCtx.store;
    const activeIndex = getActiveIndex(store);

    const editRow = e.target.closest('.ob-confirm-row-edit');
    if (editRow) {
      openFieldFromReview(
        editRow.dataset.editSection,
        editRow.dataset.editField,
      );
      return;
    }

    const pdToggle = e.target.closest('[data-pd-toggle]');
    if (pdToggle) {
      const stackItem = pdToggle.closest('.acc-stack-item');
      if (!stackItem) return;
      const idx = Number(stackItem.dataset.stackIndex);
      if (idx > (store.accordionMax ?? 0)) return;
      if (idx === activeIndex && stackItem.querySelector('.pd-panel')?.classList.contains('is-open')) return;
      store.accordionSection = SECTIONS[idx].id;
      accordionCtx.render?.();
      return;
    }

    if (e.target.closest('input, select, textarea, label.ob-radio, label.ob-check, label.pd-radio, [data-pd-sex]')) return;

    const cont = e.target.closest('[data-acc-continue]');
    if (!cont || cont.disabled || cont.classList.contains('disabled')) return;

    const contSection = SECTIONS.find((s) => s.id === cont.dataset.accContinue);
    if (!contSection) return;
    const contIndex = SECTIONS.indexOf(contSection);
    if (contIndex !== activeIndex) return;
    const section = contSection;

    if (store.accordionEditReturn) {
      store.accordionSection = store.accordionEditReturn;
      store.accordionEditReturn = null;
      accordionCtx.render?.();
      return;
    }

    if (!sectionCanContinue(section, store.onboardingForm, store)) return;

    if (section.review && !store.reviewViewed) {
      markReviewViewed();
      return;
    }

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

    store.accordionMax = Math.max(store.accordionMax ?? 0, activeIndex + 1);
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
}

export function syncAccordionSection(store) {
  if (store.accordionMax == null) store.accordionMax = 0;
  if (store.accordionEditReturn) return;
  const sectionIndex = SECTIONS.findIndex((s) => s.id === store.accordionSection);
  if (store.accordionSection === 'intro' && store.accordionMax === 0) return;
  if (sectionIndex >= 0 && sectionIndex <= store.accordionMax) return;
  if (store.accordionSection === 'review' && store.accordionMax >= REVIEW_INDEX) return;
  const legacy = {
    about: 'personal',
    life: 'job',
    exercise: 'activity',
    work: 'job',
  };
  if (legacy[store.accordionSection]) store.accordionSection = legacy[store.accordionSection];
  if (store.accordionMax <= 0) {
    store.accordionSection = 'intro';
    return;
  }
  store.accordionSection = SECTIONS[store.accordionMax]?.id || 'intro';
}
