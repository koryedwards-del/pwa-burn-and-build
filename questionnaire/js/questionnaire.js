import {
  ageFromBirthDate,
  formatBirthDateText,
  heartRates,
  WORK_PHYSICAL,
  WORK_STRESS,
} from '../../js/onboardingEngine.js';
import { buildProgramPackage } from '../../js/programPackage.js';
import { persistAppEmail, saveProgramToServer, isValidEmail } from '../../js/programApi.js';
import { persistProgramBridge } from '../../js/programBridgeHandoff.js';

import { CREATOR_CHECKOUT_URL } from '../../js/siteUrls.js';

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'personal', label: 'Personal info' },
  { id: 'work', label: 'Workday' },
  { id: 'exercise', label: 'Exercise' },
  { id: 'body', label: 'Body composition' },
  { id: 'waiver', label: 'Agreement' },
  { id: 'review', label: 'Review' },
];

const form = document.getElementById('q-form');
const navList = document.getElementById('q-nav-list');
const reviewEl = document.getElementById('q-review');
const continueBtn = document.getElementById('q-continue');
const backBtn = document.querySelector('[data-q-back]');
const nextBtn = document.querySelector('#q-actions [data-q-next]');
const panels = [...document.querySelectorAll('.q-panel')];

let step = 0;

function workPhysicalLabel(id) {
  return WORK_PHYSICAL.find((item) => item.id === id)?.label || id || '—';
}

function workStressLabel(id) {
  return WORK_STRESS.find((item) => item.id === id)?.label || id || '—';
}

function fatSourceLabel(value) {
  if (value === 'dexa') return 'DEXA scan';
  if (value === 'recent') return 'Calipers / ultrasound / BodPod';
  if (value === 'guess') return 'Estimating';
  return '—';
}

function readForm() {
  const data = new FormData(form);
  const birthDate = data.get('birthDate');
  const age = birthDate ? ageFromBirthDate(birthDate) : null;
  return {
    preferredName: String(data.get('preferredName') || '').trim(),
    email: String(data.get('email') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    intakeDate: data.get('intakeDate'),
    heightFeet: data.get('heightFeet'),
    heightInchesPart: data.get('heightInchesPart'),
    sex: data.get('sex'),
    birthDate,
    age,
    weight: data.get('weight'),
    fatSource: data.get('fatSource'),
    fatPercent: data.get('fatPercent'),
    workPhysical: data.get('workPhysical'),
    workStress: data.get('workStress'),
    weightTrainingHours: data.get('weightTrainingHours'),
    cardioHours: data.get('cardioHours'),
    fatBurningHours: data.get('fatBurningHours'),
    waiverAccepted: data.get('waiverAccepted') === 'on',
    signature: String(data.get('signature') || '').trim(),
    signatureDate: data.get('signatureDate'),
    newsletterOptIn: data.get('newsletterOptIn') === 'on',
  };
}

function toOnboardingForm(values) {
  return {
    preferredName: values.preferredName,
    email: values.email,
    sex: values.sex,
    heightFeet: String(values.heightFeet || ''),
    heightInchesPart: String(values.heightInchesPart || ''),
    heightInches: '',
    age: values.age,
    birthDate: values.birthDate,
    birthDateText: values.birthDate ? formatBirthDateText(values.birthDate) : '',
    weightText: String(values.weight || ''),
    fatPercentText: String(values.fatPercent || ''),
    fatSource: values.fatSource,
    workPhysical: values.workPhysical,
    workStress: values.workStress,
    weightTrainingHours: values.weightTrainingHours,
    cardioHours: values.cardioHours,
    fatBurningHours: values.fatBurningHours,
    wakeTime: '06:00',
    newsletterOptIn: values.newsletterOptIn,
  };
}

function buildProgramFromValues(values) {
  return buildProgramPackage(toOnboardingForm(values), {
    label: '8-Week Burn & Build Program',
    meta: { source: 'desktop-questionnaire' },
  });
}

function syncAgeField() {
  const birthInput = form.elements.birthDate;
  const ageDisplay = document.getElementById('q-age-display');
  if (!birthInput || !ageDisplay) return;
  const age = birthInput.value ? ageFromBirthDate(birthInput.value) : null;
  ageDisplay.textContent = age != null ? String(age) : '—';
  syncHeartRateHints(age);
}

function syncHeartRateHints(age) {
  if (!age) return;
  const hr = heartRates(age);
  const cardio = document.querySelector('[data-hr-cardio]');
  const fat = document.querySelector('[data-hr-fat]');
  if (cardio) cardio.textContent = `Target zone ${hr.cardioLow}–${hr.cardioHigh} BPM`;
  if (fat) fat.textContent = `Target zone ${hr.fatBurnLow}–${hr.fatBurnHigh} BPM`;
}

function heightLabel(values) {
  const feet = values.heightFeet;
  const inches = values.heightInchesPart;
  if (!feet && !inches) return '—';
  return `${feet || 0}'${inches || 0}"`;
}

function canProceed(stepIndex) {
  const values = readForm();
  switch (stepIndex) {
    case 0:
      return true;
    case 1:
      return values.preferredName && values.email && values.weight && values.sex && values.birthDate;
    case 2:
      return values.workPhysical && values.workStress;
    case 3:
      return values.weightTrainingHours !== ''
        && values.cardioHours !== ''
        && values.fatBurningHours !== '';
    case 4:
      return values.fatSource && Number(values.fatPercent) > 0;
    case 5:
      return values.waiverAccepted && values.signature;
    default:
      return true;
  }
}

function renderNav() {
  navList.innerHTML = STEPS.map((item, index) => `
    <li>
      <button type="button" class="q-nav__item${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}" data-nav-step="${index}">
        ${index + 1}. ${item.label}
      </button>
    </li>
  `).join('');
}

function renderReview() {
  const values = readForm();
  let program = null;
  try {
    program = buildProgramFromValues(values);
  } catch (error) {
    console.error(error);
  }

  const rows = [
    ['Name', values.preferredName || '—'],
    ['Email', values.email || '—'],
    ['Weekly newsletter', values.newsletterOptIn ? 'Yes' : 'No'],
    ['Height', heightLabel(values)],
    ['Gender', values.sex || '—'],
    ['Age', values.age != null ? String(values.age) : '—'],
    ['Weight', values.weight ? `${values.weight} lbs` : '—'],
    ['Body composition', values.fatPercent ? `${values.fatPercent}% (${fatSourceLabel(values.fatSource)})` : '—'],
    ['Work exertion', workPhysicalLabel(values.workPhysical)],
    ['Day stress', workStressLabel(values.workStress)],
    ['SAG hours / week', values.weightTrainingHours || '—'],
    ['Vigorous hours / week', values.cardioHours || '—'],
    ['Moderate hours / week', values.fatBurningHours || '—'],
    ['Waiver signed', values.signature || '—'],
  ];

  if (program?.intake) {
    rows.push(['Lean body mass', `${program.intake.leanBodyMass.toFixed(1)} lbs`]);
  }

  reviewEl.innerHTML = rows.map(([label, value]) => `
    <div><dt>${label}</dt><dd>${value}</dd></div>
  `).join('');
}

function showStep(index) {
  step = Math.max(0, Math.min(index, panels.length - 1));
  panels.forEach((panel, i) => {
    panel.hidden = i !== step;
  });
  renderNav();
  if (step === 6) renderReview();
  if (backBtn) backBtn.hidden = step === 0;
  if (nextBtn) {
    nextBtn.hidden = step === 0 || step === panels.length - 1;
    nextBtn.disabled = !canProceed(step);
  }
  const actions = document.getElementById('q-actions');
  if (actions) actions.hidden = step === 0 || step === panels.length - 1;

  const base = `${location.pathname}${location.search}`;
  if (step === 0) {
    history.replaceState(null, '', `${base}#welcome`);
  } else if (location.hash === '#welcome') {
    history.replaceState(null, '', base);
  }
}

function initDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  if (form.elements.intakeDate) {
    form.elements.intakeDate.value = today;
  }
  const intakeDisplay = document.getElementById('q-intake-date-display');
  if (intakeDisplay) intakeDisplay.textContent = formatBirthDateText(today);
  if (form.elements.signatureDate && !form.elements.signatureDate.value) {
    form.elements.signatureDate.value = today;
  }
  if (form.elements.fatBurningHours && !form.elements.fatBurningHours.value) {
    form.elements.fatBurningHours.value = '3';
  }
}

function bindEvents() {
  if (!form || !navList) {
    throw new Error('Questionnaire markup is missing required elements.');
  }

  navList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-nav-step]');
    if (!btn) return;
    const target = Number(btn.dataset.navStep);
    if (target <= step) showStep(target);
  });

  form.addEventListener('input', () => {
    syncAgeField();
    if (nextBtn && step < panels.length - 1) nextBtn.disabled = !canProceed(step);
  });

  form.addEventListener('change', () => {
    syncAgeField();
    if (nextBtn && step < panels.length - 1) nextBtn.disabled = !canProceed(step);
  });

  document.querySelectorAll('[data-q-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (step < panels.length - 1 && !canProceed(step)) return;
      showStep(step + 1);
    });
  });

  backBtn?.addEventListener('click', () => showStep(step - 1));

  window.addEventListener('hashchange', () => {
    if (location.hash === '#welcome' && step !== 0) showStep(0);
  });

  continueBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    const values = readForm();
    if (!canProceed(5)) return;

    const email = String(values.email || '').trim();
    if (!isValidEmail(email)) {
      window.alert('Enter a valid email address before continuing.');
      showStep(1);
      return;
    }

    continueBtn.disabled = true;
    const prevLabel = continueBtn.textContent;
    continueBtn.textContent = 'Opening checkout…';

    try {
      const program = buildProgramFromValues(values);
      persistAppEmail(email);
      persistProgramBridge(program);
      sessionStorage.setItem('bnb_creator_phase', 'plan-ready');

      const saved = await saveProgramToServer(email, program);
      if (!saved.ok) {
        window.alert(saved.message || 'Could not save your plan. Check your connection and try again.');
        continueBtn.disabled = false;
        continueBtn.textContent = prevLabel;
        return;
      }
      if (saved.programId && program.program) {
        program.program.id = saved.programId;
        persistProgramBridge(program);
      }

      window.location.href = CREATOR_CHECKOUT_URL;
    } catch (error) {
      console.error(error);
      window.alert('Could not build your program. Check your answers and try again.');
      continueBtn.disabled = false;
      continueBtn.textContent = prevLabel;
    }
  });
}

function showBootError(message) {
  const main = document.querySelector('.q-main');
  if (!main) return;
  const panel = document.querySelector('.q-panel[data-step="0"]');
  if (panel) panel.hidden = false;
  const note = document.createElement('p');
  note.className = 'q-boot-error';
  note.textContent = message;
  main.prepend(note);
}

function boot() {
  try {
    bindEvents();
    initDefaults();
    syncAgeField();
    showStep(0);
  } catch (error) {
    console.error(error);
    showBootError('Could not start the questionnaire. Hard refresh and try again.');
  }
}

boot();
