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
  heightInchesLabel,
  nextLabel,
  onboardingPhase,
  parseWakeTime,
  profileFromForm,
  totalOnboardingPages,
  wakeTimeFromParts,
  welcomeScreens,
  ageFromBirthDate,
  formatBirthDateDigits,
  formatBirthDateText,
  birthDateMaskDisplay,
  birthDateCursorPosition,
  birthDateDigits,
  parseBirthDateText,
  birthDateEntryError,
  birthDateIsValid,
  ACTIVITY_HOURS_INSTRUCTION,
  activityHoursHasValue,
  activityHoursFieldDisplay,
  activityHoursReviewLabel,
  parseActivityHours,
  formatActivityHoursNumber,
} from './onboardingEngine.js?v=90';
import { isValidEmail } from './programApi.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

function infoBox(icon, text) {
  return `<div class="ob-info"><span class="ob-info-icon">${icon}</span><p>${text}</p></div>`;
}

const HEIGHT_INSTRUCTION = '(72" is 6 feet)';

function heightFieldDisplay(inches) {
  const n = Number(inches);
  return Number.isFinite(n) && n >= 48 && n <= 84 ? String(Math.round(n)) : HEIGHT_INSTRUCTION;
}

function heightHasValue(inches) {
  const n = Number(inches);
  return Number.isFinite(n) && n >= 48 && n <= 84;
}

function syncHeightInput(input, form) {
  const hasValue = heightHasValue(form.heightInches);
  input.classList.toggle('is-instruction', !hasValue);
  input.value = hasValue ? String(Math.round(Number(form.heightInches))) : HEIGHT_INSTRUCTION;
  updateBoundDisplays('heightInches', form.heightInches);
  syncNextButton(obCtx.store, form);
  input.closest(flowRoot())?.dispatchEvent(new Event('input', { bubbles: true }));
}

function renderActivityHoursInput(name, form, max) {
  const value = form[name];
  const hasValue = activityHoursHasValue(value, max);
  return `
        <input class="ob-input ob-input-activity-hours${hasValue ? '' : ' is-instruction'}"
          name="${name}"
          type="text"
          inputmode="decimal"
          value="${activityHoursFieldDisplay(value, max)}"
          aria-label="Hours per week" />`;
}

function syncActivityHoursInput(input, form) {
  const max = input.name === 'fatBurningHours' ? 20 : 15;
  const parsed = parseActivityHours(form[input.name], max);
  const hasValue = parsed !== null;
  input.classList.toggle('is-instruction', !hasValue);
  if (hasValue) {
    form[input.name] = parsed;
    input.value = activityHoursFieldDisplay(parsed, max);
  } else if (form[input.name] === '' || form[input.name] == null) {
    form[input.name] = '';
    input.value = ACTIVITY_HOURS_INSTRUCTION;
  }
  syncNextButton(obCtx.store, form);
  input.closest(flowRoot())?.dispatchEvent(new Event('input', { bubbles: true }));
}

function sanitizeActivityHoursInput(raw) {
  let cleaned = String(raw || '').replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
  if (parts.length === 2 && parts[1].length > 2) cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
  return cleaned;
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
  { step: 3, prefix: 'YOUR', title: 'BIRTH DATE', lead: 'Enter as MM/DD/YYYY. Used for your fat burn and cardiovascular training heart rate targets.' },
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

function displayBirthDate(form) {
  const iso = parseBirthDateText(form.birthDateText);
  return iso ? formatBirthDateText(iso) : '—';
}

function birthDateAgeDisplay(form) {
  const iso = parseBirthDateText(form.birthDateText);
  if (!iso) return '';
  const age = ageFromBirthDate(iso);
  return age != null ? String(age) : '';
}

function syncBirthDateInput(input, form) {
  const digits = birthDateDigits(form.birthDateText);
  form.birthDateText = formatBirthDateDigits(digits);
  input.value = birthDateMaskDisplay(form.birthDateText);
  const pos = birthDateCursorPosition(digits.length);
  input.setSelectionRange(pos, pos);
  syncBirthDateValidation(input, form);
  syncAgeFromBirthDate(form, input.closest(flowRoot()));
  syncNextButton(obCtx.store, form);
  input.closest(flowRoot())?.dispatchEvent(new Event('input', { bubbles: true }));
}

function syncBirthDateValidation(input, form) {
  const row = input.closest('.pd-row') || input.closest('.ob-stage-body') || input.parentElement;
  const box = input.closest('.pd-box');
  const hint = row?.querySelector('[data-birth-date-error]');
  const error = birthDateEntryError(form.birthDateText);
  const showError = !!error;
  box?.classList.toggle('is-invalid', showError);
  input.classList.toggle('is-invalid', showError);
  input.setAttribute('aria-invalid', showError ? 'true' : 'false');
  if (hint) {
    hint.hidden = !showError;
    hint.textContent = error || '';
  }
}

function renderQuestionBody(index, form) {
  const hr = heartRates(Number(form.age));
  switch (index) {
    case 0:
      return `
        <input class="ob-input ob-input-lg" name="preferredName" value="${form.preferredName}" placeholder="Your first name" autocomplete="given-name" />
        <div class="ob-field-label">GENDER</div>
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
        <input class="ob-input ob-input-birth" type="text" name="birthDateText" inputmode="numeric" maxlength="10" value="${birthDateMaskDisplay(form.birthDateText)}" autocomplete="bday" aria-describedby="ob-birth-date-error" />
        <p class="ob-field-error" id="ob-birth-date-error" data-birth-date-error hidden>Enter a valid date (MM/DD/YYYY).</p>
        ${infoBox('❤️', 'Your birth date is used to calculate your personal fat burning (60–70%) and cardio training (70–85%) heart rate zones.')}`;

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
        <div class="ob-section-label">JOB</div>
        ${WORK_PHYSICAL.map((o) => radioCard('workPhysical', o.id, form.workPhysical === o.id, o.label, o.sub)).join('')}`;

    case 6:
      return `
        <div class="ob-section-label">LIFESTYLE</div>
        ${WORK_STRESS.map((o) => radioCard('workStress', o.id, form.workStress === o.id, o.label, o.sub)).join('')}
        ${infoBox('🧠', 'Stress increases cortisol. Cortisol increases hunger and promotes fat storage — even if you\'re sitting at a desk all day. Your plan accounts for this.')}`;

    case 7:
      return `
        <div class="ob-section-label">WEIGHT TRAINING, RACQUET SPORTS</div>
        <p class="ob-exercise-desc">Weight training, racquet sports type activity. Count only the time with weight in your hand or actually moving — not the rest between sets.</p>
        ${renderActivityHoursInput('weightTrainingHours', form, 15)}
        <div class="ob-divider"></div>
        <div class="ob-section-label">CARDIOVASCULAR TRAINING</div>
        <div class="ob-hr-label ob-hr-label-tight">HEART RATE ${hr.cardioLow}–${hr.cardioHigh} BPM</div>
        ${renderActivityHoursInput('cardioHours', form, 15)}`;

    case 8:
      return `
        <div class="ob-section-label">FAT BURNING</div>
        <div class="ob-hr-label ob-hr-label-tight">HEART RATE ${hr.fatBurnLow}–${hr.fatBurnHigh} BPM</div>
        ${renderActivityHoursInput('fatBurningHours', form, 20)}
        ${infoBox('😊', "Everyone does at least 3 hours of something a week. Even housework and carrying groceries count. Don't sell yourself short.")}
        ${LOW_ACTIVITIES.map((a) => `
          <label class="ob-check ${form.lowActivities.includes(a.id) ? 'selected' : ''}">
            <input type="checkbox" name="lowActivity" value="${a.id}" ${form.lowActivities.includes(a.id) ? 'checked' : ''} />
            <span>${a.icon}</span>
            <span>${a.label}</span>
          </label>`).join('')}`;

    case 9:
      return `
        <p class="ob-exercise-desc">Your wake time sets breakfast, lunch, dinner, and snack times for each day of your food plan.</p>
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

function confirmRowValue(value, showEditIcon = false) {
  if (!showEditIcon) return `<div class="ob-confirm-value">${value}</div>`;
  return `
      <div class="ob-confirm-value-wrap">
        <div class="ob-confirm-value">${value}</div>
        <span class="ob-confirm-edit-icon" aria-hidden="true"></span>
      </div>`;
}

function confirmRow(label, value, subtitle, editTarget, readOnly, accordionEdit) {
  if (accordionEdit) {
    if (!editTarget) {
      return `
    <div class="ob-confirm-row ob-confirm-row-readonly">
      <div>
        <div class="ob-confirm-label">${label}</div>
        ${subtitle ? `<div class="ob-confirm-sub">${subtitle}</div>` : ''}
      </div>
      ${confirmRowValue(value)}
    </div>`;
    }
    return `
    <button type="button" class="ob-confirm-row ob-confirm-row-edit"
      data-acc-edit-section="${editTarget.section}"
      data-acc-edit-field="${editTarget.field}">
      <div>
        <div class="ob-confirm-label">${label}</div>
        ${subtitle ? `<div class="ob-confirm-sub">${subtitle}</div>` : ''}
      </div>
      ${confirmRowValue(value, true)}
    </button>`;
  }
  if (readOnly || editTarget == null) {
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
    <button type="button" class="ob-confirm-row" data-ob-goto="${editTarget}">
      <div>
        <div class="ob-confirm-label">${label}</div>
        ${subtitle ? `<div class="ob-confirm-sub">${subtitle}</div>` : ''}
      </div>
      <div class="ob-confirm-value">${value} <span class="ob-edit">Edit</span></div>
    </button>`;
}

function renderConfirmBody(form, isEditMode, options = {}) {
  const accordionEdit = !!options.accordionEdit;
  const readOnly = accordionEdit ? false : !!options.readOnly;
  const weight = Number(form.weightText);
  const fat = Number(form.fatPercentText);
  const hr = heartRates(Number(form.age));
  const phys = WORK_PHYSICAL.find((w) => w.id === form.workPhysical);
  const stress = WORK_STRESS.find((w) => w.id === form.workStress);
  const base = WELCOME_COUNT;

  if (accordionEdit) {
    return `
      <div class="ob-confirm-rows">
        ${confirmRow('NAME', form.preferredName || '—', '', { section: 'personal', field: 'pd-name' }, false, true)}
        ${confirmRow('EMAIL', form.email || '—', '', { section: 'email', field: 'pd-email' }, false, true)}
        ${confirmRow('NEWSLETTER', form.newsletterOptIn ? 'Yes' : 'No', '', { section: 'email', field: 'newsletterOptIn' }, false, true)}
        ${confirmRow('GENDER', form.sex, '', { section: 'personal', field: 'pd-sex' }, false, true)}
        ${confirmRow('HEIGHT', heightInchesLabel(form.heightInches), '', { section: 'personal', field: 'pd-height' }, false, true)}
        ${confirmRow('BIRTH DATE', displayBirthDate(form), '', { section: 'personal', field: 'pd-age' }, false, true)}
        ${confirmRow('WEIGHT', weight > 0 ? `${form.weightText} lbs` : '—', '', { section: 'personal', field: 'pd-weight' }, false, true)}
        ${confirmRow('BODY FAT', fat > 0 ? `${form.fatPercentText}%` : '—', '', { section: 'body', field: 'fatPercentText' }, false, true)}
        ${confirmRow('WORKDAY', phys?.label || '—', '', { section: 'job', field: 'workPhysical' }, false, true)}
        ${confirmRow('LIFESTYLE', stress?.label || '—', '', { section: 'job', field: 'workStress' }, false, true)}
        ${confirmRow('WEIGHT TRAINING, RACQUET SPORTS', activityHoursReviewLabel(form.weightTrainingHours, 15), '', { section: 'activity', field: 'weightTrainingHours' }, false, true)}
        ${confirmRow('CARDIOVASCULAR TRAINING', activityHoursReviewLabel(form.cardioHours, 15), '', { section: 'activity', field: 'cardioHours' }, false, true)}
        ${confirmRow('FAT BURNING', activityHoursReviewLabel(form.fatBurningHours, 20), '', { section: 'activity', field: 'fatBurningHours' }, false, true)}
        ${confirmRow('WAKE TIME', formatWakeDisplay(form.wakeTime), '', { section: 'rhythm', field: 'wake-hour' }, false, true)}
        ${confirmRow('MEAL REMINDERS', form.remindersEnabled ? 'On' : 'Off', '', { section: 'rhythm', field: 'reminders' }, false, true)}
      </div>`;
  }

  return `
      <div class="ob-confirm-rows">
        ${confirmRow('NAME', form.preferredName || '—', '', base, readOnly)}
        ${confirmRow('EMAIL', form.email || '—', '', base, readOnly)}
        ${confirmRow('NEWSLETTER', form.newsletterOptIn ? 'Yes' : 'No', '', base, readOnly)}
        ${confirmRow('GENDER', form.sex, '', base, readOnly)}
        ${confirmRow('HEIGHT', heightInchesLabel(form.heightInches), '', base + 1, readOnly)}
        ${confirmRow('BIRTH DATE', displayBirthDate(form), '', base + 2, readOnly)}
        ${confirmRow('WEIGHT', weight > 0 ? `${form.weightText} lbs` : '—', '', base + 3, readOnly)}
        ${confirmRow('BODY FAT', fat > 0 ? `${form.fatPercentText}%` : '—', '', base + 4, readOnly)}
        ${confirmRow('WORKDAY', phys?.label || '—', '', base + 5, readOnly)}
        ${confirmRow('LIFESTYLE', stress?.label || '—', '', base + 6, readOnly)}
        ${confirmRow('WEIGHT TRAINING, RACQUET SPORTS', activityHoursReviewLabel(form.weightTrainingHours, 15), '', base + 7, readOnly)}
        ${confirmRow('CARDIOVASCULAR TRAINING', activityHoursReviewLabel(form.cardioHours, 15), '', base + 7, readOnly)}
        ${confirmRow('FAT BURNING', activityHoursReviewLabel(form.fatBurningHours, 20), '', base + 8, readOnly)}
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

export function refreshPersonalDetailFields(form) {
  if (!form) return;
  document.querySelectorAll(`${flowRoot()} [name="birthDateText"]`).forEach((input) => {
    const digits = birthDateDigits(form.birthDateText);
    form.birthDateText = formatBirthDateDigits(digits);
    input.value = birthDateMaskDisplay(form.birthDateText);
    syncBirthDateValidation(input, form);
    syncAgeFromBirthDate(form, input.closest(flowRoot()));
  });
  document.querySelectorAll(`${flowRoot()} [name="heightInches"]`).forEach((input) => {
    const hasValue = heightHasValue(form.heightInches);
    input.classList.toggle('is-instruction', !hasValue);
    input.value = heightFieldDisplay(form.heightInches);
  });
}

export { profileFromForm, onboardingPhase, WELCOME_COUNT, renderQuestionBody, renderConfirmBody };

export function renderLockedPanel(title) {
  return `
    <div class="pd-panel is-locked">
      <div class="pd-trigger pd-trigger-locked" aria-disabled="true">
        <span class="pd-trigger-title">${title}</span>
        <span class="pd-chevron" aria-hidden="true">·</span>
      </div>
    </div>`;
}

export function renderCollapsiblePanel(title, innerHtml, open = true, complete = false) {
  return `
    <div class="pd-panel ${open ? 'is-open' : ''} ${complete ? 'is-complete' : ''}">
      <button type="button" class="pd-trigger" data-pd-toggle aria-expanded="${open}">
        <span class="pd-trigger-title">${title}</span>
        <span class="pd-chevron" aria-hidden="true">${open ? '−' : '+'}</span>
      </button>
      <div class="pd-fields" ${open ? '' : 'hidden'}>${innerHtml}</div>
    </div>`;
}

export function personalSectionValid(form) {
  return form.preferredName.trim().length > 0
    && !!form.sex
    && birthDateIsValid(form.birthDateText)
    && heightHasValue(form.heightInches)
    && Number(form.weightText) > 0;
}

export function emailSectionValid(form) {
  return isValidEmail(form.email);
}

const EMAIL_USAGE_HINT = 'Your email is used by the Burn & Build App to authorize and upload your custom food plan.';
const NEWSLETTER_LEAD = 'Maybe you\'d like a touch of motivation going into every weekend.';
const NEWSLETTER_CHECK_LABEL = 'Yes, send me the newsletter';

export function renderEmailDetails(form, open = true, complete = false) {
  const fields = `
        <div class="pd-row">
          <label class="pd-label" for="pd-email">Email</label>
          <div class="pd-box">
            <input id="pd-email" class="pd-input" type="email" name="email" value="${form.email || ''}" placeholder="you@example.com" autocomplete="email" />
          </div>
          <p class="pd-hint">${EMAIL_USAGE_HINT}</p>
          <div class="pd-newsletter">
            <p class="pd-hint">${NEWSLETTER_LEAD}</p>
            <label class="ob-check pd-newsletter-check ${form.newsletterOptIn ? 'selected' : ''}">
              <input type="checkbox" name="newsletterOptIn" ${form.newsletterOptIn ? 'checked' : ''} />
              <span>${NEWSLETTER_CHECK_LABEL}</span>
            </label>
          </div>
        </div>`;
  return renderCollapsiblePanel('Email address', fields, open, complete);
}

function renderGenderSelect(form) {
  const hasValue = !!form.sex;
  const display = hasValue ? form.sex : 'Select gender';
  return `
            <span class="pd-select-display pd-select-gender${hasValue ? '' : ' is-instruction'}" data-gender-display aria-hidden="true">${display}</span>
            <select id="pd-sex" class="pd-select-native pd-select-gender" name="sex" autocomplete="sex" aria-labelledby="pd-sex-label" aria-haspopup="listbox">
              <option value="" ${hasValue ? '' : 'selected'} disabled>Select gender</option>
              <option value="Male" ${form.sex === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${form.sex === 'Female' ? 'selected' : ''}>Female</option>
            </select>`;
}

function syncGenderSelectDisplay(select, form) {
  if (!select) return;
  const hasValue = !!form.sex;
  const display = select.closest('.pd-box-select')?.querySelector('[data-gender-display]');
  if (display) {
    display.textContent = hasValue ? form.sex : 'Select gender';
    display.classList.toggle('is-instruction', !hasValue);
  }
  if (select.value !== (form.sex || '')) select.value = form.sex || '';
}

function genderSelectNear(el) {
  const scope = el.closest('.acc-stack-item, .pd-panel, .pd-fields, .ob-stage-body');
  return scope?.querySelector('select[name="sex"]')
    ?? document.querySelector('.artshow-flow .acc-stack-item.is-active select[name="sex"]');
}

export function openGenderPicker(select) {
  if (!select) return;
  if (typeof select.showPicker === 'function') {
    try {
      select.showPicker();
    } catch {
      /* showPicker requires a user gesture in some browsers. */
    }
  }
}

function focusGenderFromName(nameInput) {
  const sexSelect = genderSelectNear(nameInput);
  if (!sexSelect) return false;
  sexSelect.focus({ preventScroll: true });
  openGenderPicker(sexSelect);
  return document.activeElement === sexSelect;
}

export function renderPersonalDetails(form, open = true, complete = false) {
  const fields = `
        <div class="pd-row">
          <label class="pd-label" for="pd-name">Name</label>
          <div class="pd-box">
            <input id="pd-name" class="pd-input" name="preferredName" value="${form.preferredName}" placeholder="First name" autocomplete="given-name" />
          </div>
        </div>
        <div class="pd-row">
          <label class="pd-label" for="pd-sex" id="pd-sex-label">Gender</label>
          <div class="pd-box pd-box-select">
            ${renderGenderSelect(form)}
          </div>
        </div>
        <div class="pd-row">
          <label class="pd-label" for="pd-age">Birth date</label>
          <div class="pd-box pd-box-split">
            <input id="pd-age" class="pd-input pd-input-birth" type="text" name="birthDateText" inputmode="numeric" maxlength="10" value="${birthDateMaskDisplay(form.birthDateText)}" autocomplete="bday" aria-describedby="pd-birth-date-error" />
            <span class="pd-unit" data-bind="age" aria-live="polite">${birthDateAgeDisplay(form)}</span>
          </div>
          <p class="pd-hint pd-hint-error" id="pd-birth-date-error" data-birth-date-error hidden>Enter a valid date (MM/DD/YYYY).</p>
        </div>
        <div class="pd-row">
          <label class="pd-label" for="pd-height">Height</label>
          <div class="pd-box pd-box-split">
            <input id="pd-height" class="pd-input pd-input-height${heightHasValue(form.heightInches) ? '' : ' is-instruction'}" name="heightInches" type="text" inputmode="numeric" maxlength="2" value="${heightFieldDisplay(form.heightInches)}" aria-label="Height in inches" />
            <span class="pd-unit">inches</span>
          </div>
        </div>
        <div class="pd-row">
          <label class="pd-label" for="pd-weight">Weight</label>
          <div class="pd-box pd-box-split">
            <input id="pd-weight" class="pd-input" name="weightText" inputmode="decimal" value="${form.weightText}" placeholder="000" />
            <span class="pd-unit">lbs</span>
          </div>
        </div>`;
  return renderCollapsiblePanel('Personal', fields, open, complete);
}

function flowRoot() {
  return '.ob-flow, .accordion-flow, .chat-flow, .artshow-flow';
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
  const age = iso ? ageFromBirthDate(iso) : null;
  form.age = age != null ? age : '';
  updateBoundDisplays('age', age != null ? String(age) : '');
  updateBoundDisplays('birthDateText', form.birthDateText);
  const range = flow?.querySelector('input[name="age"]');
  if (range && age != null) range.value = age;
}

function updateBoundDisplays(name, value) {
  const num = Number(value);
  const sel = `[data-bind="${name}"]`;
  document.querySelectorAll(`.ob-flow ${sel}, .accordion-flow ${sel}, .chat-flow ${sel}, .artshow-flow ${sel}`).forEach((el) => {
    if (el.dataset.format === 'height') el.textContent = heightInchesLabel(num);
    else if (el.dataset.format === 'inches') el.textContent = Number.isFinite(num) && num > 0 ? String(Math.round(num)) : '';
    else el.textContent = value;
  });
  const subSel = `[data-bind-sub="${name}"]`;
  document.querySelectorAll(`.ob-flow ${subSel}, .accordion-flow ${subSel}, .chat-flow ${subSel}, .artshow-flow ${subSel}`).forEach((el) => {
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
    if (target.closest('input, select, textarea, label.ob-radio, label.ob-check, label.pd-radio, .pd-box-select, [data-ob-sex]')) return;

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
      flow.dispatchEvent(new Event('input', { bubbles: true }));
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

    if (input.name === 'weightTrainingHours' || input.name === 'cardioHours' || input.name === 'fatBurningHours') {
      if (input.value === ACTIVITY_HOURS_INSTRUCTION) return;
      const max = input.name === 'fatBurningHours' ? 20 : 15;
      const cleaned = sanitizeActivityHoursInput(input.value);
      const parsed = parseActivityHours(cleaned, max);
      if (cleaned === '') {
        form[input.name] = '';
        input.classList.add('is-instruction');
        input.value = ACTIVITY_HOURS_INSTRUCTION;
      } else if (parsed !== null) {
        form[input.name] = parsed;
        input.classList.remove('is-instruction');
        input.value = formatActivityHoursNumber(parsed);
      } else {
        form[input.name] = cleaned;
        input.classList.remove('is-instruction');
        input.value = cleaned;
      }
      syncNextButton(obCtx.store, form);
      input.closest(flowRoot())?.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (input.name === 'birthDateText') {
      const digits = birthDateDigits(input.value);
      form.birthDateText = formatBirthDateDigits(digits);
      syncBirthDateInput(input, form);
      return;
    }

    if (input.name === 'heightInches') {
      const raw = input.value === HEIGHT_INSTRUCTION ? '' : input.value.replace(/\D/g, '').slice(0, 2);
      form.heightInches = raw ? Number(raw) : '';
      const focused = document.activeElement === input;
      input.classList.toggle('is-instruction', !raw && !focused);
      input.value = raw || (focused ? '' : HEIGHT_INSTRUCTION);
      updateBoundDisplays('heightInches', form.heightInches);
      syncNextButton(obCtx.store, form);
      input.closest(flowRoot())?.dispatchEvent(new Event('input', { bubbles: true }));
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
    const flow = input.closest('.ob-flow, .chat-flow, .artshow-flow');

    if (input.name === 'sex') {
      form.sex = input.value;
      syncGenderSelectDisplay(input, form);
      syncNextButton(obCtx.store, form);
      input.closest(flowRoot())?.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

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

    if (input.name === 'newsletterOptIn') {
      form.newsletterOptIn = input.checked;
      input.closest('.ob-check')?.classList.toggle('selected', input.checked);
      return;
    }

    if (input.dataset.wakePart) {
      syncWakeTimeFromPicker(form);
    }
  });

  document.addEventListener('focusin', (e) => {
    const input = e.target;
    if (!obCtx.store || !input.closest(flowRoot())) return;
    const form = obCtx.store.onboardingForm;

    if (input.name === 'birthDateText') {
      window.requestAnimationFrame(() => syncBirthDateInput(input, form));
      return;
    }

    if (input.name === 'sex' && input.tagName === 'SELECT') {
      return;
    }

    if (input.name === 'heightInches' && input.value === HEIGHT_INSTRUCTION) {
      input.value = '';
      input.classList.remove('is-instruction');
    }

    if (
      (input.name === 'weightTrainingHours' || input.name === 'cardioHours' || input.name === 'fatBurningHours')
      && input.value === ACTIVITY_HOURS_INSTRUCTION
    ) {
      input.value = '';
      input.classList.remove('is-instruction');
    }
  });

  document.addEventListener('focusout', (e) => {
    const input = e.target;
    if (!obCtx.store || !input.closest(flowRoot())) return;
    const form = obCtx.store.onboardingForm;

    if (input.name === 'weightTrainingHours' || input.name === 'cardioHours' || input.name === 'fatBurningHours') {
      syncActivityHoursInput(input, form);
      return;
    }

    if (input.name !== 'heightInches') return;
    const n = Number(form.heightInches);
    if (heightHasValue(n)) {
      form.heightInches = Math.min(84, Math.max(48, Math.round(n)));
    } else {
      form.heightInches = '';
    }
    syncHeightInput(input, form);
  });

  document.addEventListener('keydown', (e) => {
    const input = e.target;
    if (!obCtx.store || input.name !== 'birthDateText' || !input.closest(flowRoot())) return;
    const form = obCtx.store.onboardingForm;
    const digits = birthDateDigits(form.birthDateText);

    if (e.key >= '0' && e.key <= '9' && digits.length < 8) {
      e.preventDefault();
      form.birthDateText = formatBirthDateDigits(digits + e.key);
      syncBirthDateInput(input, form);
      return;
    }

    if (e.key === 'Backspace' && digits.length > 0) {
      e.preventDefault();
      form.birthDateText = formatBirthDateDigits(digits.slice(0, -1));
      syncBirthDateInput(input, form);
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!obCtx.store) return;
    const box = e.target.closest(`${flowRoot()} .pd-box-select`);
    if (!box) return;
    const select = box.querySelector('select[name="sex"]');
    if (!select) return;
    if (e.target !== select) {
      select.focus({ preventScroll: true });
    }
    openGenderPicker(select);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (!obCtx.store) return;
    const input = e.target;
    if (!input.closest(flowRoot())) return;

    if (input.name === 'sex' && input.tagName === 'SELECT') {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openGenderPicker(input);
      }
      return;
    }

    if (e.key === 'Tab' && !e.shiftKey && input.name === 'preferredName') {
      e.preventDefault();
      focusGenderFromName(input);
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
  if (obCtx.store.reviewViewed != null) target.reviewViewed = obCtx.store.reviewViewed;
  if (obCtx.store.accordionEditReturn !== undefined) target.accordionEditReturn = obCtx.store.accordionEditReturn;
}
