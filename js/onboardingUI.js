import {
  LOW_ACTIVITIES,
  QUESTION_COUNT,
  WELCOME_COUNT,
  WORK_PHYSICAL,
  WORK_STRESS,
  canProceed,
  defaultOnboardingForm,
  formatWakeDisplay,
  heartRates,
  heightDisplay,
  nextLabel,
  onboardingPhase,
  parseWakeTime,
  profileFromForm,
  totalOnboardingPages,
  wakeTimeFromParts,
  welcomeScreens,
  ageFromBirthDate,
  formatBirthDateDigits,
  parseBirthDateText,
} from './onboardingEngine.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

function infoBox(icon, text) {
  return `<div class="ob-info"><span class="ob-info-icon">${icon}</span><p>${text}</p></div>`;
}

function stepHeadline(step, title, prefix = 'YOUR') {
  return `
    <div class="ob-step-header">
      <div class="ob-step-num">STEP ${step} OF ${QUESTION_COUNT}</div>
      <div class="ob-step-headline">
        <div class="ob-welcome-line1">${prefix}</div>
        <div class="ob-welcome-line2">${title}</div>
      </div>
    </div>`;
}

function stepLead(text = '') {
  return `<div class="ob-main-lead"><p class="ob-step-sub">${text}</p></div>`;
}

const QUESTION_META = [
  { step: 1, prefix: 'YOUR', title: 'NAME', lead: "What's your first name?" },
  { step: 2, prefix: 'YOUR', title: 'HEIGHT', lead: '' },
  { step: 3, prefix: 'YOUR', title: 'AGE', lead: 'Used to determine your fat burn and cardiovascular training heart rate targets.' },
  { step: 4, prefix: 'YOUR CURRENT', title: 'WEIGHT', lead: '' },
  { step: 5, prefix: 'YOUR', title: 'BODY FAT', lead: 'How do you know your body fat percentage?' },
  { step: 6, prefix: 'YOUR', title: 'WORKDAY', lead: 'How physical is your work?<br>Choose the one that most closely describes your typical work week.' },
  { step: 7, prefix: 'YOUR', title: 'LIFESTYLE', lead: 'Choose the one that most closely describes your life.' },
  { step: 8, prefix: 'YOUR', title: 'EXERCISE', lead: 'What do you plan to do exercise wise in the next 8 weeks? Be realistic — conservative is better. You can always update your plan.' },
  { step: 9, prefix: 'YOUR', title: 'FAT BURNING', lead: 'Select your activities and weekly hours.' },
  { step: 10, prefix: 'YOUR', title: 'WAKE TIME', lead: 'Eating every 2–3 hours keeps your fat burners (muscles) burning.' },
];

function renderWelcomeHeadline(screen) {
  if (screen.type === 'intro') {
    return `
      <div class="ob-step-num ob-step-num-slot" aria-hidden="true"></div>
      <div class="ob-intro-headline">
        <div class="ob-welcome-line1">${screen.line1}</div>
        <div class="ob-welcome-line2">${screen.line2}</div>
      </div>`;
  }
  if (screen.type === 'brand') {
    return `
      <div class="ob-step-num ob-step-num-slot" aria-hidden="true"></div>
      <div class="ob-intro-headline">
        <div class="ob-brand-tag">${screen.tag}</div>
        <div class="ob-brand-line1">${screen.line1}</div>
      </div>`;
  }
  return `
    <div class="ob-step-num ob-step-num-slot" aria-hidden="true"></div>
    <div class="ob-intro-headline">
      <div class="ob-welcome-line1">${screen.line1}</div>
      <div class="ob-welcome-line2">${screen.line2}</div>
    </div>`;
}

function renderWelcomeMain(screen) {
  if (screen.type === 'intro') {
    return `
      ${stepLead('')}
      <div class="ob-stage-body">
        <div class="ob-intro">
          <p class="ob-intro-body">${screen.body}</p>
          ${renderTestimonyBlock({
            quote: screen.quote,
            name: screen.quoteName,
            meta: screen.quoteMeta,
          })}
        </div>
      </div>`;
  }
  if (screen.type === 'brand') {
    return `
      ${stepLead('')}
      <div class="ob-stage-body">
        <div class="ob-welcome ob-welcome-brand">
          <div class="ob-brand-line2"><span class="ob-brand-amp">& </span><span class="ob-brand-accent">${screen.line2.replace('& ', '')}</span></div>
          <p class="ob-brand-sub">${screen.sub.replace('\n', '<br>')}</p>
        </div>
      </div>`;
  }
  return `
    ${stepLead('')}
    <div class="ob-stage-body">
      <div class="ob-welcome">
        <p class="ob-welcome-body">${screen.body}</p>
        ${screen.quote ? `
          <div class="ob-quote">
            <p>${screen.quote}</p>
            <div class="ob-quote-by">${screen.attribution}</div>
          </div>` : ''}
      </div>
    </div>`;
}

function renderConfirmHeadline(isEditMode) {
  return `
    <div class="ob-step-header">
      <div class="ob-step-num">${isEditMode ? 'REVIEW CHANGES' : 'ALMOST THERE'}</div>
      <div class="ob-step-headline">
        <div class="ob-welcome-line1">${isEditMode ? 'EDIT YOUR' : 'ARE THESE'}</div>
        <div class="ob-welcome-line2">${isEditMode ? 'PLAN' : 'CORRECT?'}</div>
      </div>
    </div>`;
}

function renderFlowHeadline(phase, form, isEditMode, welcomeScreen) {
  if (phase.kind === 'welcome') return renderWelcomeHeadline(welcomeScreen);
  if (phase.kind === 'question') {
    const meta = QUESTION_META[phase.index];
    return stepHeadline(meta.step, meta.title, meta.prefix);
  }
  if (phase.kind === 'confirm') return renderConfirmHeadline(isEditMode);
  if (isEditMode) {
    return `
      <div class="ob-step-num ob-step-num-slot" aria-hidden="true"></div>
      <div class="ob-intro-headline">
        <div class="ob-welcome-line1">PLAN</div>
        <div class="ob-welcome-line2">UPDATED.</div>
      </div>`;
  }
  return `
    <div class="ob-step-num ob-step-num-slot" aria-hidden="true"></div>
    <div class="ob-intro-headline">
      <div class="ob-welcome-line1">YOU'RE</div>
      <div class="ob-welcome-line2">SET.</div>
    </div>`;
}

function renderFlowMain(phase, form, isEditMode) {
  if (phase.kind === 'welcome') {
    return renderWelcomeMain(welcomeScreens()[phase.index]);
  }
  if (phase.kind === 'question') {
    const lead = QUESTION_META[phase.index].lead;
    return `${stepLead(lead)}<div class="ob-stage-body"><div class="ob-question">${renderQuestionBody(phase.index, form)}</div></div>`;
  }
  if (phase.kind === 'confirm') {
    return `${stepLead('')}<div class="ob-stage-body"><div class="ob-confirm">${renderConfirmBody(form, isEditMode)}</div></div>`;
  }
  return `<div class="ob-stage-body">${renderDone(isEditMode)}</div>`;
}

function radioCard(name, value, selected, label, sub) {
  return `
    <label class="ob-radio ${selected ? 'selected' : ''}">
      <input type="radio" name="${name}" value="${value}" ${selected ? 'checked' : ''} />
      <div>
        <div class="ob-radio-label">${label}</div>
        ${sub ? `<div class="ob-radio-sub">${sub}</div>` : ''}
      </div>
    </label>`;
}

function renderQuestionBody(index, form) {
  const hr = heartRates(Number(form.age));
  switch (index) {
    case 0:
      return `
        <input class="ob-input ob-input-lg" name="preferredName" value="${form.preferredName}" placeholder="Your first name" autocomplete="given-name" />
        <div class="ob-field-label">SEX</div>
        <div class="ob-seg">
          <button type="button" class="${form.sex === 'Male' ? 'active' : ''}" data-ob-sex="Male">Male</button>
          <button type="button" class="${form.sex === 'Female' ? 'active' : ''}" data-ob-sex="Female">Female</button>
        </div>
        ${infoBox('👋', "We'll use your first name throughout your program.")}`;

    case 1:
      return `
        <div class="ob-big-value" data-bind="heightInches" data-format="height">${heightDisplay(form.heightInches)}</div>
        <div class="ob-big-sub" data-bind-sub="heightInches">${Math.round(form.heightInches)} inches</div>
        <input type="range" class="ob-range" name="heightInches" min="48" max="84" step="1" value="${form.heightInches}" />
        <div class="ob-range-labels"><span>4'0"</span><span>7'0"</span></div>
        ${infoBox('💡', 'Your lean body mass is your fat burner. More muscle burns more fat.')}`;

    case 2:
      return `
        <div class="ob-field-label">DATE OF BIRTH</div>
        <input class="ob-input ob-input-birth" type="text" name="birthDateText" inputmode="numeric" maxlength="10" value="${form.birthDateText}" placeholder="MM/DD/YYYY" autocomplete="bday" />
        <div class="ob-big-value ob-big-age" data-bind="age">${form.age}</div>
        <input type="range" class="ob-range ob-range-readonly" name="age" min="13" max="99" step="1" value="${form.age}" tabindex="-1" aria-hidden="true" />
        <div class="ob-range-labels"><span>13</span><span>99</span></div>
        ${infoBox('❤️', 'Your age is used to calculate your personal fat burning (60–70%) and cardio training (70–85%) heart rate zones.')}`;

    case 3:
      return `
        ${infoBox('🎯', "For best results, don't guess your weight. Your entire plan depends on the accuracy of this number.")}
        <div class="ob-weight-row">
          <input class="ob-input ob-weight-input" name="weightText" inputmode="decimal" value="${form.weightText}" placeholder="000" />
          <span class="ob-unit">lbs</span>
        </div>
        ${infoBox('⚖️', 'Your best weight is in the morning — after you go to the bathroom and before you eat.')}`;

    case 4:
      return `
        ${radioCard('fatSource', 'dexa', form.fatSource === 'dexa', 'DEXA Scan', 'Gold standard. The more recent the better.')}
        ${renderFatInput(form, 'dexa')}
        ${radioCard('fatSource', 'recent', form.fatSource === 'recent', 'Other method', 'Calipers, ultrasound, or BodPod. The more recent the better.')}
        ${renderFatInput(form, 'recent')}
        ${radioCard('fatSource', 'guess', form.fatSource === 'guess', "I'm guessing", "If you guess right, you're golden. If you guess wrong, your plan is wrong.")}
        ${renderFatInput(form, 'guess')}`;

    case 5:
      return `
        <div class="ob-section-label">PHYSICAL LEVEL</div>
        ${WORK_PHYSICAL.map((o) => radioCard('workPhysical', o.id, form.workPhysical === o.id, o.label, o.sub)).join('')}`;

    case 6:
      return `
        ${WORK_STRESS.map((o) => radioCard('workStress', o.id, form.workStress === o.id, o.label, o.sub)).join('')}
        ${infoBox('🧠', 'Stress increases cortisol. Cortisol increases hunger and promotes fat storage — even if you\'re sitting at a desk all day. Your plan accounts for this.')}`;

    case 7:
      return `
        <div class="ob-section-label">WEIGHT TRAINING, RACQUET SPORTS</div>
        <p class="ob-exercise-desc">Weight training, racquet sports type activity. Count only the time with weight in your hand or actually moving — not the rest between sets.</p>
        <div class="ob-slider-label">Total hours per week: <strong data-bind="weightTrainingHours">${form.weightTrainingHours}</strong></div>
        <input type="range" class="ob-range" name="weightTrainingHours" min="0" max="15" step="1" value="${form.weightTrainingHours}" />
        <div class="ob-divider"></div>
        <div class="ob-section-label">CARDIOVASCULAR TRAINING</div>
        <div class="ob-hr-label">HEART RATE ${hr.cardioLow}–${hr.cardioHigh} BPM</div>
        <div class="ob-slider-label">Total hours per week: <strong data-bind="cardioHours">${form.cardioHours}</strong></div>
        <input type="range" class="ob-range" name="cardioHours" min="0" max="15" step="1" value="${form.cardioHours}" />`;

    case 8:
      return `
        <div class="ob-hr-label">HEART RATE ${hr.fatBurnLow}–${hr.fatBurnHigh} BPM</div>
        ${LOW_ACTIVITIES.map((a) => `
          <label class="ob-check ${form.lowActivities.includes(a.id) ? 'selected' : ''}">
            <input type="checkbox" name="lowActivity" value="${a.id}" ${form.lowActivities.includes(a.id) ? 'checked' : ''} />
            <span>${a.icon}</span>
            <span>${a.label}</span>
          </label>`).join('')}
        <div class="ob-slider-label">Total hours per week: <strong data-bind="fatBurningHours">${form.fatBurningHours}</strong></div>
        <input type="range" class="ob-range" name="fatBurningHours" min="0" max="20" step="1" value="${form.fatBurningHours}" />
        ${infoBox('😊', "Everyone does at least 3 hours of something a week. Even housework and carrying groceries count. Don't sell yourself short.")}`;

    case 9:
      return `
        ${renderWakePicker(form)}
        <div class="ob-divider"></div>
        <div class="ob-section-label">MEAL REMINDERS</div>
        <button type="button" class="ob-reminder-toggle ${form.remindersEnabled ? 'on' : ''}" data-ob-reminders>
          <div>
            <div class="ob-reminder-title">Time-to-eat reminders</div>
            <div class="ob-reminder-sub">${form.remindersEnabled ? 'Burn & Build will notify you when it\'s time to eat each meal and fruit snack.' : 'No reminders set.'}</div>
          </div>
          <span class="ob-toggle-pill"></span>
        </button>`;

    default:
      return '';
  }
}

function renderWakePicker(form) {
  const { hour12, minute, ampm } = parseWakeTime(form.wakeTime);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const hourOpts = hours.map((h) => `<option value="${h}" ${h === hour12 ? 'selected' : ''}>${h}</option>`).join('');
  const minOpts = minutes.map((m) => `<option value="${m}" ${m === minute ? 'selected' : ''}>${m}</option>`).join('');
  return `
    <div class="ob-wake-picker">
      <select class="ob-select" data-wake-part="hour" aria-label="Wake hour">${hourOpts}</select>
      <span class="ob-wake-colon">:</span>
      <select class="ob-select" data-wake-part="minute" aria-label="Wake minute">${minOpts}</select>
      <select class="ob-select" data-wake-part="ampm" aria-label="AM or PM">
        <option value="AM" ${ampm === 'AM' ? 'selected' : ''}>AM</option>
        <option value="PM" ${ampm === 'PM' ? 'selected' : ''}>PM</option>
      </select>
    </div>
    <div class="ob-wake-display">${formatWakeDisplay(form.wakeTime)}</div>`;
}

function syncWakeTimeFromPicker(form) {
  const hour = document.querySelector('[data-wake-part="hour"]')?.value;
  const minute = document.querySelector('[data-wake-part="minute"]')?.value;
  const ampm = document.querySelector('[data-wake-part="ampm"]')?.value;
  if (!hour || !minute || !ampm) return;
  form.wakeTime = wakeTimeFromParts(hour, minute, ampm);
  const display = document.querySelector('.ob-wake-display');
  if (display) display.textContent = formatWakeDisplay(form.wakeTime);
}

function updateReminderToggle(enabled) {
  const btn = document.querySelector('[data-ob-reminders]');
  if (!btn) return;
  btn.classList.toggle('on', enabled);
  const sub = btn.querySelector('.ob-reminder-sub');
  if (sub) {
    sub.textContent = enabled
      ? 'Burn & Build will notify you when it\'s time to eat each meal and fruit snack.'
      : 'No reminders set.';
  }
}

function renderFatInput(form, source) {
  const hidden = form.fatSource !== source ? ' hidden' : '';
  return `
    <div class="ob-fat-input${hidden}" data-fat-for="${source}">
      <div class="ob-fat-label">Enter your body fat percentage:</div>
      <div class="ob-weight-row">
        <input class="ob-input ob-weight-input" name="fatPercentText" inputmode="decimal" value="${form.fatPercentText}" placeholder="00" />
        <span class="ob-unit">%</span>
      </div>
    </div>`;
}

function confirmRow(label, value, subtitle, editPage, readOnly) {
  if (readOnly || editPage == null) {
    return `
    <div class="ob-confirm-row ob-confirm-row-readonly">
      <div>
        <div class="ob-confirm-label">${label}</div>
        ${subtitle ? `<div class="ob-confirm-sub">${subtitle}</div>` : ''}
      </div>
      <div class="ob-confirm-value">${value}</div>
    </div>`;
  }
  return `
    <button type="button" class="ob-confirm-row" data-ob-goto="${editPage}">
      <div>
        <div class="ob-confirm-label">${label}</div>
        ${subtitle ? `<div class="ob-confirm-sub">${subtitle}</div>` : ''}
      </div>
      <div class="ob-confirm-value">${value} <span class="ob-edit">Edit</span></div>
    </button>`;
}

function renderConfirmBody(form, isEditMode, options = {}) {
  const readOnly = !!options.readOnly;
  const weight = Number(form.weightText);
  const fat = Number(form.fatPercentText);
  const lbm = weight * (1 - fat / 100);
  const hr = heartRates(Number(form.age));
  const phys = WORK_PHYSICAL.find((w) => w.id === form.workPhysical);
  const stress = WORK_STRESS.find((w) => w.id === form.workStress);
  const base = WELCOME_COUNT;

  return `
      <div class="ob-confirm-rows">
        ${confirmRow('NAME', form.preferredName || '—', '', base, readOnly)}
        ${confirmRow('SEX', form.sex, '', base, readOnly)}
        ${confirmRow('HEIGHT', heightDisplay(form.heightInches), '', base + 1, readOnly)}
        ${confirmRow('AGE', String(form.age), '', base + 2, readOnly)}
        ${confirmRow('WEIGHT', weight > 0 ? `${form.weightText} lbs` : '—', '', base + 3, readOnly)}
        ${confirmRow('BODY FAT', fat > 0 ? `${form.fatPercentText}%` : '—', '', base + 4, readOnly)}
        ${confirmRow('LEAN BODY MASS', lbm > 0 ? `${lbm.toFixed(1)} lbs` : '—', '', null, readOnly)}
        ${confirmRow('WORKDAY', phys?.label || '—', '', base + 5, readOnly)}
        ${confirmRow('LIFESTYLE', stress?.label || '—', '', base + 6, readOnly)}
        ${confirmRow('WEIGHT TRAINING, RACQUET SPORTS', `${form.weightTrainingHours} hrs/week`, '', base + 7, readOnly)}
        ${confirmRow('CARDIOVASCULAR TRAINING', `${form.cardioHours} hrs/week`, `HEART RATE ${hr.cardioLow}–${hr.cardioHigh} BPM`, base + 7, readOnly)}
        ${confirmRow('FAT BURNING', `${form.fatBurningHours} hrs/week`, `HEART RATE ${hr.fatBurnLow}–${hr.fatBurnHigh} BPM`, base + 8, readOnly)}
        ${confirmRow('WAKE TIME', formatWakeDisplay(form.wakeTime), '', base + 9, readOnly)}
        ${confirmRow('MEAL REMINDERS', form.remindersEnabled ? 'On' : 'Off', '', base + 9, readOnly)}
      </div>`;
}

function renderConfirm(form, isEditMode) {
  return renderConfirmBody(form, isEditMode);
}

function renderDone(isEditMode) {
  if (isEditMode) {
    return `
      <div class="ob-done">
        <div class="ob-done-check">✓</div>
        <p class="ob-done-body">Your food plan has been recalculated based on your updated numbers.</p>
        <p class="ob-done-sub">New servings. Same system.<br>Keep going.</p>
      </div>`;
  }
  return `
    <div class="ob-done">
      <div class="ob-done-check">✓</div>
      <p class="ob-done-body">Your custom food plan is calculated from your lean body mass, job, lifestyle, and activities.</p>
      <p class="ob-done-sub">Eat the food. Trust the plan.</p>
    </div>`;
}

export function renderOnboarding(store, options = {}) {
  const form = store.onboardingForm;
  const page = store.onboardingPage;
  const isEditMode = store.onboardingEditMode;
  const phase = onboardingPhase(page, isEditMode);
  const start = isEditMode ? WELCOME_COUNT : (options.progressStart ?? 0);
  const progressTotal = totalOnboardingPages() - 1 - start;
  const progressCurrent = page - start;
  const screens = welcomeScreens();
  const proceed = canProceed(phase, form);
  const welcomeScreen = phase.kind === 'welcome' ? screens[phase.index] : null;
  const headline = renderFlowHeadline(phase, form, isEditMode, welcomeScreen);
  const main = renderFlowMain(phase, form, isEditMode);

  const showBar = phase.kind !== 'done';
  const showBack = page > start;
  const nextText = options.firstStepLabel && page === start
    ? options.firstStepLabel
    : nextLabel(phase, isEditMode);
  const flowClass = [
    options.flowClass || '',
    phase.kind === 'welcome' && screens[phase.index]?.type === 'intro' ? 'ob-flow-intro' : '',
    phase.kind === 'question' || phase.kind === 'confirm' ? 'ob-flow-step' : '',
  ].filter(Boolean).join(' ');
  const flowClassAttr = flowClass ? ` ${flowClass}` : '';

  return `
    <div class="ob-flow focus-flow${flowClassAttr}">
      ${showBar ? `
      <div class="ob-chrome-top ob-top">
        ${showBack ? '<button type="button" class="ob-back" data-ob-back>←</button>' : (isEditMode ? '<button type="button" class="ob-back" data-nav="home">×</button>' : '<span class="ob-back-spacer"></span>')}
        <div class="ob-progress">${Array.from({ length: progressTotal }, (_, i) => `<span class="${i <= progressCurrent ? 'filled' : ''}"></span>`).join('')}</div>
      </div>` : ''}
      <div class="ob-chrome-headline ob-headline">${headline}</div>
      <div class="ob-stage ob-main">${main}</div>
      <div class="ob-chrome-dock ob-footer">
        <button type="button" class="ob-next ${proceed ? '' : 'disabled'}" data-ob-next ${proceed ? '' : 'disabled'}>${nextText}</button>
      </div>
    </div>`;
}

export function initOnboardingForm(store) {
  store.onboardingForm = defaultOnboardingForm(store.profile);
}

export { profileFromForm, onboardingPhase, WELCOME_COUNT, renderQuestionBody, renderConfirmBody };

function flowRoot() {
  return '.ob-flow, .accordion-flow, .chat-flow';
}

function syncNextButton(store, form) {
  const btn = document.querySelector('.ob-flow [data-ob-next]');
  if (!btn) return;
  const phase = onboardingPhase(store.onboardingPage, store.onboardingEditMode);
  const proceed = canProceed(phase, form);
  btn.disabled = !proceed;
  btn.classList.toggle('disabled', !proceed);
}

function syncAgeFromBirthDate(form, flow) {
  const iso = parseBirthDateText(form.birthDateText);
  form.birthDate = iso || '';
  if (!iso) return;
  const age = ageFromBirthDate(iso);
  if (age == null) return;
  form.age = Math.min(99, Math.max(13, age));
  updateBoundDisplays('age', form.age);
  const range = flow?.querySelector('input[name="age"]');
  if (range) range.value = form.age;
}

function updateBoundDisplays(name, value) {
  const num = Number(value);
  const sel = `[data-bind="${name}"]`;
  document.querySelectorAll(`.ob-flow ${sel}, .accordion-flow ${sel}, .chat-flow ${sel}`).forEach((el) => {
    if (el.dataset.format === 'height') el.textContent = heightDisplay(num);
    else el.textContent = value;
  });
  const subSel = `[data-bind-sub="${name}"]`;
  document.querySelectorAll(`.ob-flow ${subSel}, .accordion-flow ${subSel}, .chat-flow ${subSel}`).forEach((el) => {
    if (name === 'heightInches') el.textContent = `${Math.round(num)} inches`;
  });
}

const obCtx = { store: null, render: null, onComplete: null, onConfirm: null };

function handleObNext() {
  const store = obCtx.store;
  const form = store.onboardingForm;
  const phase = onboardingPhase(store.onboardingPage, store.onboardingEditMode);
  if (!canProceed(phase, form)) return;

  if (phase.kind === 'confirm') {
    if (obCtx.onConfirm) {
      obCtx.onConfirm(form);
      return;
    }
    store.profile = profileFromForm(form);
    localStorage.setItem('bnb_profile', JSON.stringify(store.profile));
    localStorage.setItem('bnb_onboarding_complete', 'true');
    store.onboardingPage += 1;
    obCtx.render();
    return;
  }

  if (phase.kind === 'done') {
    obCtx.onComplete?.();
    return;
  }

  if (obCtx.onBeforeAdvance && obCtx.onBeforeAdvance(store.onboardingPage, phase) === false) {
    return;
  }

  store.onboardingPage += 1;
  obCtx.render();
}

function ensureObDelegation() {
  if (ensureObDelegation.done) return;
  ensureObDelegation.done = true;

  document.addEventListener('click', (e) => {
    if (!obCtx.store || !e.target.closest(flowRoot())) return;

    const target = e.target;
    if (target.closest('input, select, textarea, label.ob-radio, label.ob-check')) return;

    const store = obCtx.store;
    const form = store.onboardingForm;
    const flow = e.target.closest(flowRoot());

    if (e.target.closest('[data-ob-back]')) {
      if (store.onboardingPage > 0) {
        store.onboardingPage -= 1;
        obCtx.render();
      }
      return;
    }

    const nextBtn = e.target.closest('[data-ob-next]');
    if (nextBtn) {
      if (nextBtn.disabled || nextBtn.classList.contains('disabled')) return;
      handleObNext();
      return;
    }

    const gotoBtn = e.target.closest('[data-ob-goto]');
    if (gotoBtn) {
      if (e.target.closest('.artshow-flow')) return;
      store.onboardingPage = Number(gotoBtn.dataset.obGoto);
      obCtx.render();
      return;
    }

    const sexBtn = e.target.closest('[data-ob-sex]');
    if (sexBtn) {
      form.sex = sexBtn.dataset.obSex;
      flow.querySelectorAll('[data-ob-sex]').forEach((b) => b.classList.toggle('active', b === sexBtn));
      syncNextButton(store, form);
      return;
    }

    if (e.target.closest('[data-ob-reminders]')) {
      form.remindersEnabled = !form.remindersEnabled;
      updateReminderToggle(form.remindersEnabled);
    }
  });

  document.addEventListener('input', (e) => {
    if (!obCtx.store) return;
    const input = e.target;
    if (!input.closest(flowRoot()) || !input.name) return;
    const form = obCtx.store.onboardingForm;

    if (input.type === 'range') {
      if (input.name === 'age') return;
      form[input.name] = Number(input.value);
      updateBoundDisplays(input.name, input.value);
      return;
    }

    if (input.name === 'birthDateText') {
      const formatted = formatBirthDateDigits(input.value);
      form.birthDateText = formatted;
      input.value = formatted;
      syncAgeFromBirthDate(form, input.closest('.ob-flow, .chat-flow'));
      syncNextButton(obCtx.store, form);
      return;
    }

    form[input.name] = input.value;
    syncNextButton(obCtx.store, form);
  });

  document.addEventListener('change', (e) => {
    if (!obCtx.store) return;
    const input = e.target;
    if (!input.closest(flowRoot())) return;
    const form = obCtx.store.onboardingForm;
    const flow = input.closest('.ob-flow, .chat-flow');

    if (input.name === 'fatSource') {
      form.fatSource = input.value;
      flow.querySelectorAll('[data-fat-for]').forEach((el) => {
        el.classList.toggle('hidden', el.dataset.fatFor !== input.value);
      });
      flow.querySelectorAll('input[name="fatSource"]').forEach((r) => {
        r.closest('.ob-radio')?.classList.toggle('selected', r.checked);
      });
      syncNextButton(obCtx.store, form);
      return;
    }

    if (input.name === 'workPhysical' || input.name === 'workStress') {
      form[input.name] = input.value;
      flow.querySelectorAll(`input[name="${input.name}"]`).forEach((r) => {
        r.closest('.ob-radio')?.classList.toggle('selected', r.checked);
      });
      syncNextButton(obCtx.store, form);
      return;
    }

    if (input.name === 'lowActivity') {
      const set = new Set(form.lowActivities);
      if (input.checked) set.add(input.value);
      else set.delete(input.value);
      form.lowActivities = [...set];
      flow.querySelectorAll('input[name="lowActivity"]').forEach((c) => {
        c.closest('.ob-check')?.classList.toggle('selected', c.checked);
      });
      return;
    }

    if (input.dataset.wakePart) {
      syncWakeTimeFromPicker(form);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest(`${flowRoot()} input, ${flowRoot()} textarea`)) {
      e.preventDefault();
    }
  });
}

export function bindOnboardingEvents(store, { render, onComplete, onConfirm, onBeforeAdvance }) {
  obCtx.store = store;
  obCtx.render = render;
  obCtx.onComplete = onComplete;
  obCtx.onConfirm = onConfirm;
  obCtx.onBeforeAdvance = onBeforeAdvance;
  ensureObDelegation();
}

export function syncObToStore(target) {
  if (!obCtx.store) return;
  target.onboardingPage = obCtx.store.onboardingPage;
  target.onboardingForm = obCtx.store.onboardingForm;
  if (obCtx.store.accordionSection) target.accordionSection = obCtx.store.accordionSection;
  if (obCtx.store.accordionMax != null) target.accordionMax = obCtx.store.accordionMax;
}
