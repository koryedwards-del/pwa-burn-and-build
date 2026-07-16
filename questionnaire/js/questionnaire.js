import {
  ageFromBirthDate,
  heartRates,
  WORK_PHYSICAL,
  WORK_STRESS,
} from '../../js/onboardingEngine.js';

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'personal', label: 'Personal info' },
  { id: 'body', label: 'Body fat' },
  { id: 'work', label: 'Workday' },
  { id: 'exercise', label: 'Exercise' },
  { id: 'waiver', label: 'Agreement' },
  { id: 'review', label: 'Review' },
];

const form = document.getElementById('q-form');
const navList = document.getElementById('q-nav-list');
const reviewEl = document.getElementById('q-review');
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

function syncAgeField() {
  const birthInput = form.elements.birthDate;
  const ageInput = form.elements.age;
  if (!birthInput || !ageInput) return;
  const age = birthInput.value ? ageFromBirthDate(birthInput.value) : null;
  ageInput.value = age != null ? String(age) : '';
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
      return values.preferredName && values.email && values.weight;
    case 2:
      return values.fatSource && Number(values.fatPercent) > 0;
    case 3:
      return values.workPhysical && values.workStress;
    case 4:
      return values.weightTrainingHours !== ''
        && values.cardioHours !== ''
        && values.fatBurningHours !== '';
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
  const rows = [
    ['Name', values.preferredName || '—'],
    ['Email', values.email || '—'],
    ['Height', heightLabel(values)],
    ['Gender', values.sex || '—'],
    ['Age', values.age != null ? String(values.age) : '—'],
    ['Weight', values.weight ? `${values.weight} lbs` : '—'],
    ['Body fat', values.fatPercent ? `${values.fatPercent}% (${fatSourceLabel(values.fatSource)})` : '—'],
    ['Work exertion', workPhysicalLabel(values.workPhysical)],
    ['Day stress', workStressLabel(values.workStress)],
    ['SAG hours / week', values.weightTrainingHours || '—'],
    ['Vigorous hours / week', values.cardioHours || '—'],
    ['Moderate hours / week', values.fatBurningHours || '—'],
    ['Waiver signed', values.signature || '—'],
  ];
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
  backBtn.hidden = step === 0;
  nextBtn.hidden = step === 0 || step === panels.length - 1;
  nextBtn.disabled = !canProceed(step);
  document.querySelector('#q-actions').hidden = step === 0 || step === panels.length - 1;
}

function initDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  if (form.elements.intakeDate && !form.elements.intakeDate.value) {
    form.elements.intakeDate.value = today;
  }
  if (form.elements.signatureDate && !form.elements.signatureDate.value) {
    form.elements.signatureDate.value = today;
  }
  if (form.elements.fatBurningHours && !form.elements.fatBurningHours.value) {
    form.elements.fatBurningHours.value = '3';
  }
}

navList.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-nav-step]');
  if (!btn) return;
  const target = Number(btn.dataset.navStep);
  if (target <= step) showStep(target);
});

form.addEventListener('input', () => {
  syncAgeField();
  if (step < panels.length - 1) nextBtn.disabled = !canProceed(step);
});

form.addEventListener('change', () => {
  syncAgeField();
  if (step < panels.length - 1) nextBtn.disabled = !canProceed(step);
});

document.querySelectorAll('[data-q-next]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (step < panels.length - 1 && !canProceed(step)) return;
    showStep(step + 1);
  });
});

backBtn.addEventListener('click', () => showStep(step - 1));

initDefaults();
syncAgeField();
showStep(0);
