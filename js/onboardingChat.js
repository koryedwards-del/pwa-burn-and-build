import {
  QUESTION_COUNT,
  WELCOME_COUNT,
  WORK_PHYSICAL,
  WORK_STRESS,
  canProceed,
  formatWakeDisplay,
  formatBirthDateText,
  heightDisplay,
  heartRates,
  onboardingPhase,
  parseBirthDateText,
  welcomeScreens,
} from './onboardingEngine.js';
import { renderQuestionBody, renderConfirmBody } from './onboardingUI.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

const CHAT_PROMPTS = [
  "What's your first name? We'll use it throughout your program.",
  'How tall are you? Enter feet and inches.',
  'What is your date of birth? We use this for your fat-burn and cardio heart-rate targets.',
  "What's your current weight? Best in the morning — after the bathroom, before you eat.",
  'What is your body fat percentage? Pick how you know it, then enter the number.',
  'How physical is your work? Choose what best matches a typical week.',
  'How would you describe your lifestyle stress? Be honest — it affects your plan.',
  'What exercise will you commit to for the next 8 weeks? Be realistic — you can always update later.',
  'Select your fat-burning activities and weekly hours. Everyone does at least a few hours a week.',
  'What time do you usually wake up? Eating every 2–3 hours keeps your fat burners working.',
];

function formatUserAnswer(qi, form) {
  const hr = heartRates(Number(form.age));
  switch (qi) {
    case 0:
      return form.preferredName || '—';
    case 1:
      return heightDisplay(form.heightInches);
    case 2:
      return form.birthDateText && parseBirthDateText(form.birthDateText)
        ? formatBirthDateText(parseBirthDateText(form.birthDateText))
        : '—';
    case 3:
      return `${form.weightText} lbs`;
    case 4:
      return `${form.fatPercentText}% body fat`;
    case 5:
      return WORK_PHYSICAL.find((w) => w.id === form.workPhysical)?.label || '—';
    case 6:
      return WORK_STRESS.find((w) => w.id === form.workStress)?.label || '—';
    case 7:
      return `Strength ${form.weightTrainingHours} hrs · Cardio ${form.cardioHours} hrs/week`;
    case 8:
      return `Fat burn ${form.fatBurningHours} hrs/week (${hr.fatBurnLow}–${hr.fatBurnHigh} bpm)`;
    case 9:
      return `${formatWakeDisplay(form.wakeTime)} · Reminders ${form.remindersEnabled ? 'on' : 'off'}`;
    default:
      return '';
  }
}

function renderBotBubble(html) {
  return `<div class="chat-msg chat-bot"><div class="chat-bubble">${html}</div></div>`;
}

function renderUserBubble(text) {
  return `<div class="chat-msg chat-user"><div class="chat-bubble">${text}</div></div>`;
}

function renderIntroMessages() {
  const screen = welcomeScreens()[0];
  return `
    ${renderBotBubble(`
      <div class="chat-intro-headline">
        <div class="ob-welcome-line1">${screen.line1}</div>
        <div class="ob-welcome-line2">${screen.line2}</div>
      </div>
      <p class="chat-intro-body">${screen.body}</p>
    `)}
    ${renderBotBubble(renderTestimonyBlock({
      quote: screen.quote,
      name: screen.quoteName,
      meta: screen.quoteMeta,
      className: 'chat-testimony',
    }))}`;
}

function renderPastMessages(form, page) {
  let html = '';
  if (page <= 0) return html;

  for (let qi = 0; qi < QUESTION_COUNT; qi += 1) {
    const questionPage = WELCOME_COUNT + qi;
    if (page <= questionPage) break;
    html += renderBotBubble(`<p class="chat-prompt">${CHAT_PROMPTS[qi]}</p>`);
    html += renderUserBubble(formatUserAnswer(qi, form));
  }
  return html;
}

function renderCurrentBotMessage(page, form) {
  const phase = onboardingPhase(page, false);
  if (phase.kind === 'welcome') return '';
  if (phase.kind === 'question') {
    return renderBotBubble(`<p class="chat-prompt">${CHAT_PROMPTS[phase.index]}</p>`);
  }
  if (phase.kind === 'confirm') {
    return renderBotBubble(`
      <p class="chat-prompt">Almost there — are these answers correct?</p>
      <p class="chat-confirm-lead">Tap any row to edit. When everything looks right, create your food plan.</p>`);
  }
  return '';
}

function progressLabel(page) {
  const phase = onboardingPhase(page, false);
  if (phase.kind === 'welcome') return 'Getting started';
  if (phase.kind === 'question') return `Question ${phase.index + 1} of ${QUESTION_COUNT}`;
  if (phase.kind === 'confirm') return 'Review & create';
  return '';
}

function composerContent(page, form) {
  const phase = onboardingPhase(page, false);
  if (phase.kind === 'welcome') {
    return `
      <button type="button" class="ob-next chat-send" data-chat-next>CREATE YOUR FOOD PLAN</button>`;
  }
  if (phase.kind === 'question') {
    const proceed = canProceed(phase, form);
    return `
      <div class="chat-inputs">${renderQuestionBody(phase.index, form)}</div>
      <button type="button" class="ob-next chat-send ${proceed ? '' : 'disabled'}" data-chat-next ${proceed ? '' : 'disabled'}>CONTINUE →</button>`;
  }
  if (phase.kind === 'confirm') {
    return `
      <div class="chat-confirm">${renderConfirmBody(form, false)}</div>
      <button type="button" class="ob-next chat-send" data-chat-next>CREATE MY FOOD PLAN →</button>`;
  }
  return '';
}

export function renderChat(store) {
  const form = store.onboardingForm;
  const page = store.onboardingPage ?? 0;
  const phase = onboardingPhase(page, false);
  const showBack = page > 0 && phase.kind !== 'confirm';

  return `
    <div class="chat-flow focus-flow">
      <div class="chat-chrome-top ob-chrome-top">
        ${showBack ? '<button type="button" class="ob-back" data-chat-back aria-label="Back">←</button>' : '<span class="ob-back-spacer"></span>'}
        <div class="chat-progress">${progressLabel(page)}</div>
      </div>
      <div class="chat-thread ob-stage" data-chat-thread>
        ${renderIntroMessages()}
        ${renderPastMessages(form, page)}
        ${renderCurrentBotMessage(page, form)}
      </div>
      <div class="chat-composer ob-chrome-dock">
        ${composerContent(page, form)}
      </div>
    </div>`;
}

let chatBound = false;
const chatCtx = { store: null, render: null, onConfirm: null, onBeforeReview: null };

function syncChatSendButton() {
  const store = chatCtx.store;
  if (!store) return;
  const form = store.onboardingForm;
  const phase = onboardingPhase(store.onboardingPage, false);
  const btn = document.querySelector('.chat-flow [data-chat-next]');
  if (!btn || phase.kind !== 'question') return;
  const proceed = canProceed(phase, form);
  btn.disabled = !proceed;
  btn.classList.toggle('disabled', !proceed);
}

function scrollChatToBottom() {
  const thread = document.querySelector('[data-chat-thread]');
  if (!thread) return;
  window.requestAnimationFrame(() => {
    thread.scrollTop = thread.scrollHeight;
  });
}

function handleChatAdvance() {
  const store = chatCtx.store;
  const form = store.onboardingForm;
  const phase = onboardingPhase(store.onboardingPage, false);

  if (phase.kind === 'welcome') {
    store.onboardingPage += 1;
    chatCtx.render?.();
    return;
  }

  if (phase.kind === 'question' && !canProceed(phase, form)) return;

  if (phase.kind === 'confirm') {
    chatCtx.onConfirm?.(form);
    return;
  }

  const nextPage = store.onboardingPage + 1;
  const nextPhase = onboardingPhase(nextPage, false);
  if (nextPhase.kind === 'confirm' && chatCtx.onBeforeReview && !chatCtx.onBeforeReview()) {
    return;
  }

  store.onboardingPage = nextPage;
  chatCtx.render?.();
}

function ensureChatDelegation() {
  if (chatBound) return;
  chatBound = true;

  document.addEventListener('click', (e) => {
    if (!chatCtx.store || !e.target.closest('.chat-flow')) return;

    if (e.target.closest('[data-chat-back]')) {
      if (chatCtx.store.onboardingPage > 0) {
        chatCtx.store.onboardingPage -= 1;
        chatCtx.render?.();
      }
      return;
    }

    const nextBtn = e.target.closest('[data-chat-next]');
    if (nextBtn) {
      if (nextBtn.disabled || nextBtn.classList.contains('disabled')) return;
      handleChatAdvance();
      return;
    }

    const gotoBtn = e.target.closest('[data-ob-goto]');
    if (gotoBtn) {
      chatCtx.store.onboardingPage = Number(gotoBtn.dataset.obGoto);
      chatCtx.render?.();
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.closest('.chat-flow')) syncChatSendButton();
  });
  document.addEventListener('change', (e) => {
    if (e.target.closest('.chat-flow')) syncChatSendButton();
  });
}

export function bindChatEvents(store, { render, onConfirm, onBeforeReview }) {
  chatCtx.store = store;
  chatCtx.render = render;
  chatCtx.onConfirm = onConfirm;
  chatCtx.onBeforeReview = onBeforeReview;
  ensureChatDelegation();
  syncChatSendButton();
  scrollChatToBottom();
}

export function syncChatPage(store) {
  if (store.onboardingPage == null || store.onboardingPage < 0) {
    store.onboardingPage = 0;
  }
}
