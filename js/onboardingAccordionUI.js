import {
  LOW_ACTIVITIES,
  WORK_PHYSICAL,
  WORK_STRESS,
  formatWakeDisplay,
  heartRates,
  heightDisplay,
  parseWakeTime,
  wakeTimeFromParts,
  welcomeScreens,
} from './onboardingEngine.js';
import { renderTestimonyBlock } from './testimonyBlock.js';

function accHint(icon, text) {
  return `<div class="acc-hint"><span class="acc-hint-icon">${icon}</span><p>${text}</p></div>`;
}

function accChoice(name, value, selected, label, sub) {
  return `
    <label class="acc-choice ${selected ? 'is-selected' : ''}">
      <input type="radio" name="${name}" value="${value}" ${selected ? 'checked' : ''} />
      <div>
        <div class="acc-choice-label">${label}</div>
        ${sub ? `<div class="acc-choice-sub">${sub}</div>` : ''}
      </div>
    </label>`;
}

function accFatInput(form, source) {
  const hidden = form.fatSource !== source ? ' hidden' : '';
  return `
    <div class="acc-fat-input${hidden}" data-fat-for="${source}">
      <div class="acc-fat-label">Body fat %</div>
      <div class="acc-num-row">
        <input class="acc-input acc-num-input" name="fatPercentText" inputmode="decimal" value="${form.fatPercentText}" placeholder="00" />
        <span class="acc-unit">%</span>
      </div>
    </div>`;
}

function accWakePicker(form) {
  const { hour12, minute, ampm } = parseWakeTime(form.wakeTime);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const hourOpts = hours.map((h) => `<option value="${h}" ${h === hour12 ? 'selected' : ''}>${h}</option>`).join('');
  const minOpts = minutes.map((m) => `<option value="${m}" ${m === minute ? 'selected' : ''}>${m}</option>`).join('');
  return `
    <div class="acc-wake">
      <select class="acc-select" data-wake-part="hour" aria-label="Wake hour">${hourOpts}</select>
      <span class="acc-wake-colon">:</span>
      <select class="acc-select" data-wake-part="minute" aria-label="Wake minute">${minOpts}</select>
      <select class="acc-select acc-select-ampm" data-wake-part="ampm" aria-label="AM or PM">
        <option value="AM" ${ampm === 'AM' ? 'selected' : ''}>AM</option>
        <option value="PM" ${ampm === 'PM' ? 'selected' : ''}>PM</option>
      </select>
    </div>
    <div class="acc-wake-display">${formatWakeDisplay(form.wakeTime)}</div>`;
}

export function renderAccordionIntro() {
  const screen = welcomeScreens()[0];
  return `
    <div class="acc-headline">
      <div class="acc-headline-sm">${screen.line1}</div>
      <div class="acc-headline-lg">${screen.line2}</div>
    </div>
    <p class="acc-lead">${screen.body}</p>
    ${renderTestimonyBlock({
      quote: screen.quote,
      name: screen.quoteName,
      meta: screen.quoteMeta,
      className: 'acc-quote',
    })}`;
}

export function renderAccordionField(index, form) {
  const hr = heartRates(Number(form.age));
  switch (index) {
    case 0:
      return `
        <p class="acc-prompt">What's your first name?</p>
        <input class="acc-input acc-input-name" name="preferredName" value="${form.preferredName}" placeholder="First name" autocomplete="given-name" />
        <p class="acc-label">Sex</p>
        <div class="acc-seg">
          <button type="button" class="${form.sex === 'Male' ? 'is-active' : ''}" data-acc-sex="Male">Male</button>
          <button type="button" class="${form.sex === 'Female' ? 'is-active' : ''}" data-acc-sex="Female">Female</button>
        </div>
        ${accHint('👋', "We'll use your first name throughout your program.")}`;

    case 1:
      return `
        <p class="acc-prompt">How tall are you?</p>
        <div class="acc-big" data-bind="heightInches" data-format="height">${heightDisplay(form.heightInches)}</div>
        <div class="acc-big-sub" data-bind-sub="heightInches">${Math.round(form.heightInches)} inches</div>
        <input type="range" class="acc-range" name="heightInches" min="48" max="84" step="1" value="${form.heightInches}" />
        <div class="acc-range-ends"><span>4'0"</span><span>7'0"</span></div>`;

    case 2:
      return `
        <p class="acc-prompt">Date of birth</p>
        <input class="acc-input acc-input-date" type="text" name="birthDateText" inputmode="numeric" maxlength="10" value="${form.birthDateText}" placeholder="MM/DD/YYYY" autocomplete="bday" />
        <div class="acc-big acc-big-age" data-bind="age">${form.age}</div>
        <input type="range" class="acc-range acc-range-readonly" name="age" min="13" max="99" step="1" value="${form.age}" tabindex="-1" aria-hidden="true" />
        <div class="acc-range-ends"><span>13</span><span>99</span></div>
        ${accHint('❤️', 'Used for your fat-burn and cardio heart-rate targets.')}`;

    case 3:
      return `
        <p class="acc-prompt">Current weight</p>
        ${accHint('🎯', "Don't guess — your entire plan depends on this number.")}
        <div class="acc-num-row">
          <input class="acc-input acc-num-input" name="weightText" inputmode="decimal" value="${form.weightText}" placeholder="000" />
          <span class="acc-unit">lbs</span>
        </div>
        ${accHint('⚖️', 'Best in the morning — after the bathroom, before you eat.')}`;

    case 4:
      return `
        <p class="acc-prompt">Body fat percentage</p>
        ${accChoice('fatSource', 'dexa', form.fatSource === 'dexa', 'DEXA scan', 'Gold standard. The more recent the better.')}
        ${accFatInput(form, 'dexa')}
        ${accChoice('fatSource', 'recent', form.fatSource === 'recent', 'Other method', 'Calipers, ultrasound, or BodPod.')}
        ${accFatInput(form, 'recent')}
        ${accChoice('fatSource', 'guess', form.fatSource === 'guess', "I'm guessing", 'If you guess wrong, your plan is wrong.')}
        ${accFatInput(form, 'guess')}`;

    case 5:
      return `
        <p class="acc-prompt">How physical is your work?</p>
        <p class="acc-label">Physical level</p>
        ${WORK_PHYSICAL.map((o) => accChoice('workPhysical', o.id, form.workPhysical === o.id, o.label, o.sub)).join('')}`;

    case 6:
      return `
        <p class="acc-prompt">How would you describe your lifestyle?</p>
        ${WORK_STRESS.map((o) => accChoice('workStress', o.id, form.workStress === o.id, o.label, o.sub)).join('')}
        ${accHint('🧠', 'Stress affects hunger and fat storage — even at a desk job.')}`;

    case 7:
      return `
        <p class="acc-prompt">Exercise for the next 8 weeks</p>
        <p class="acc-label">Weight training & racquet sports</p>
        <p class="acc-note">Count only active time — not rest between sets.</p>
        <p class="acc-slider">Hours per week: <strong data-bind="weightTrainingHours">${form.weightTrainingHours}</strong></p>
        <input type="range" class="acc-range" name="weightTrainingHours" min="0" max="15" step="1" value="${form.weightTrainingHours}" />
        <div class="acc-split"></div>
        <p class="acc-label">Cardiovascular training</p>
        <p class="acc-hr">Heart rate ${hr.cardioLow}–${hr.cardioHigh} bpm</p>
        <p class="acc-slider">Hours per week: <strong data-bind="cardioHours">${form.cardioHours}</strong></p>
        <input type="range" class="acc-range" name="cardioHours" min="0" max="15" step="1" value="${form.cardioHours}" />`;

    case 8:
      return `
        <p class="acc-prompt">Fat-burning activities</p>
        <p class="acc-hr">Heart rate ${hr.fatBurnLow}–${hr.fatBurnHigh} bpm</p>
        ${LOW_ACTIVITIES.map((a) => `
          <label class="acc-check ${form.lowActivities.includes(a.id) ? 'is-selected' : ''}">
            <input type="checkbox" name="lowActivity" value="${a.id}" ${form.lowActivities.includes(a.id) ? 'checked' : ''} />
            <span>${a.icon}</span>
            <span>${a.label}</span>
          </label>`).join('')}
        <p class="acc-slider">Hours per week: <strong data-bind="fatBurningHours">${form.fatBurningHours}</strong></p>
        <input type="range" class="acc-range" name="fatBurningHours" min="0" max="20" step="1" value="${form.fatBurningHours}" />
        ${accHint('😊', 'Everyone does at least 3 hours a week — even housework counts.')}`;

    case 9:
      return `
        <p class="acc-prompt">What time do you wake up?</p>
        ${accWakePicker(form)}
        <div class="acc-split"></div>
        <p class="acc-label">Meal reminders</p>
        <button type="button" class="acc-toggle ${form.remindersEnabled ? 'is-on' : ''}" data-acc-reminders>
          <div>
            <div class="acc-toggle-title">Time-to-eat reminders</div>
            <div class="acc-toggle-sub">${form.remindersEnabled ? 'Burn & Build will notify you when it\'s time to eat.' : 'No reminders set.'}</div>
          </div>
          <span class="acc-toggle-pill"></span>
        </button>`;

    default:
      return '';
  }
}

function reviewRow(label, value, subtitle) {
  return `
    <div class="acc-review-row">
      <div>
        <div class="acc-review-label">${label}</div>
        ${subtitle ? `<div class="acc-review-sub">${subtitle}</div>` : ''}
      </div>
      <div class="acc-review-value">${value}</div>
    </div>`;
}

export function renderAccordionReview(form) {
  const weight = Number(form.weightText);
  const fat = Number(form.fatPercentText);
  const lbm = weight * (1 - fat / 100);
  const hr = heartRates(Number(form.age));
  const phys = WORK_PHYSICAL.find((w) => w.id === form.workPhysical);
  const stress = WORK_STRESS.find((w) => w.id === form.workStress);

  return `
    <div class="acc-review">
      ${reviewRow('Name', form.preferredName || '—')}
      ${reviewRow('Sex', form.sex)}
      ${reviewRow('Height', heightDisplay(form.heightInches))}
      ${reviewRow('Age', String(form.age))}
      ${reviewRow('Weight', weight > 0 ? `${form.weightText} lbs` : '—')}
      ${reviewRow('Body fat', fat > 0 ? `${form.fatPercentText}%` : '—')}
      ${reviewRow('Lean body mass', lbm > 0 ? `${lbm.toFixed(1)} lbs` : '—')}
      ${reviewRow('Workday', phys?.label || '—')}
      ${reviewRow('Lifestyle', stress?.label || '—')}
      ${reviewRow('Weight training', `${form.weightTrainingHours} hrs/week`)}
      ${reviewRow('Cardio', `${form.cardioHours} hrs/week`, `HR ${hr.cardioLow}–${hr.cardioHigh} bpm`)}
      ${reviewRow('Fat burning', `${form.fatBurningHours} hrs/week`, `HR ${hr.fatBurnLow}–${hr.fatBurnHigh} bpm`)}
      ${reviewRow('Wake time', formatWakeDisplay(form.wakeTime))}
      ${reviewRow('Reminders', form.remindersEnabled ? 'On' : 'Off')}
    </div>`;
}

export function renderAccordionFields(indices, form) {
  return indices.map((qi) => `
    <div class="acc-field" data-question="${qi}">
      ${renderAccordionField(qi, form)}
    </div>`).join('');
}
