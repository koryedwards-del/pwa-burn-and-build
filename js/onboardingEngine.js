export const WORK_PHYSICAL = [
  { id: 'sitting', label: 'Mostly sitting', sub: 'Desk, computer, driving, reception.' },
  { id: 'feet', label: 'On your feet', sub: 'Retail, teaching, nursing, restaurant.' },
  { id: 'carrying', label: 'Carrying & lifting', sub: 'Warehouse, construction, delivery, trades.' },
  { id: 'heavy', label: 'Heavy physical labor', sub: 'Moving heavy loads all day. Brick, concrete, roofing.' },
];

export const WORK_STRESS = [
  { id: 'comfortable', label: 'Comfortable', sub: 'Relaxed pace. Manageable demands.' },
  { id: 'busy', label: 'Busy', sub: 'Steady pace. Tired by end of day but manageable.' },
  { id: 'stressful', label: 'Stressful', sub: 'High pressure. You come home drained.' },
];

function computeWorkIntensity(physical, stress) {
  if (!physical || !stress) return 2.0;
  const map = {
    'sitting|comfortable': 1.5,
    'sitting|busy': 2.0,
    'sitting|stressful': 2.0,
    'feet|comfortable': 2.5,
    'feet|busy': 2.5,
    'feet|stressful': 3.0,
    'carrying|comfortable': 3.0,
    'carrying|busy': 3.0,
    'carrying|stressful': 3.5,
    'heavy|comfortable': 3.5,
    'heavy|busy': 3.5,
    'heavy|stressful': 4.0,
  };
  return map[`${physical}|${stress}`] ?? 2.0;
}

export function heartRates(age) {
  const maxHR = 220 - age;
  return {
    cardioLow: Math.floor(maxHR * 0.7),
    cardioHigh: Math.floor(maxHR * 0.85),
    fatBurnLow: Math.floor(maxHR * 0.6),
    fatBurnHigh: Math.floor(maxHR * 0.7),
  };
}

export function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const born = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age -= 1;
  return age;
}

export function formatBirthDateText(isoDate) {
  if (!isoDate) return '';
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function heightParts(totalInches) {
  const n = Number(totalInches);
  if (!Number.isFinite(n) || n <= 0) return { feet: '', inches: '' };
  const rounded = Math.round(n);
  return {
    feet: Math.floor(rounded / 12),
    inches: rounded % 12,
  };
}

function heightFromParts(feet, inches) {
  const f = feet === '' ? 0 : Math.max(0, Number(feet) || 0);
  const i = inches === '' ? 0 : Math.max(0, Math.min(11, Number(inches) || 0));
  return f * 12 + i;
}

function resolvedHeightInches(feet, inchesPart) {
  const f = feet === '' || feet == null ? '' : String(feet).trim();
  const i = inchesPart === '' || inchesPart == null ? '' : String(inchesPart).trim();
  if (f === '' && i === '') return '';
  return heightFromParts(f, i === '' ? 0 : i);
}

export function heightReadable(totalInches) {
  const n = Number(totalInches);
  if (!Number.isFinite(n) || n <= 0) return '';
  const { feet, inches } = heightParts(n);
  return `${feet} ft ${inches} in`;
}

function parseWakeTime(wakeTime) {
  const [hStr, mStr] = (wakeTime || '06:00').split(':');
  let h24 = Number(hStr);
  const minute = String(Number(mStr)).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, ampm };
}

export function formatWakeDisplay(wakeTime) {
  if (!wakeTime) return '—';
  const { hour12, minute, ampm } = parseWakeTime(wakeTime);
  return `${hour12}:${minute} ${ampm}`;
}

function formatActivityHoursNumber(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}

function parseActivityHours(value, max = 15) {
  if (value === '' || value == null) return null;
  if (value === 0 || value === '0') return 0;
  const raw = String(value).trim();
  if (raw.endsWith('.')) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  const quarters = Math.round(n * 4);
  if (Math.abs(n * 4 - quarters) > 0.001) return null;
  return quarters / 4;
}

export function activityHoursReviewLabel(value, max = 20) {
  const parsed = parseActivityHours(value, max);
  return parsed !== null ? `${formatActivityHoursNumber(parsed)} hrs/week` : '—';
}

export function profileFromForm(form) {
  const weight = Number(form.weightText);
  const fatPercent = Number(form.fatPercentText);
  const lbm = Math.round(weight * (1 - fatPercent / 100) * 10) / 10;
  const intensity = computeWorkIntensity(form.workPhysical, form.workStress);
  return {
    preferredName: form.preferredName.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    email: String(form.email || '').trim().toLowerCase(),
    sex: form.sex,
    age: Number(form.age),
    heightInches: resolvedHeightInches(form.heightFeet, form.heightInchesPart) || Number(form.heightInches) || 0,
    totalWeight: weight,
    fatPercent,
    leanBodyMass: lbm,
    workIntensity: intensity,
    workPhysical: form.workPhysical,
    workStress: form.workStress,
    weightTrainingHours: parseActivityHours(form.weightTrainingHours, 15) ?? 0,
    cardioHours: parseActivityHours(form.cardioHours, 15) ?? 0,
    fatBurningHours: parseActivityHours(form.fatBurningHours, 20) ?? 0,
    wakeTime: form.wakeTime,
    newsletterOptIn: !!form.newsletterOptIn,
  };
}
