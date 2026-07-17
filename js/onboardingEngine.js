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

export const LOW_ACTIVITIES = [
  { id: 'dog', icon: '🐕', label: 'Walking the dog' },
  { id: 'house', icon: '🏠', label: 'Housework & chores' },
  { id: 'garden', icon: '🌱', label: 'Gardening & yard work' },
  { id: 'kids', icon: '👶', label: 'Chasing kids around' },
  { id: 'walk', icon: '🚶', label: 'Walking for exercise' },
  { id: 'yoga', icon: '🧘', label: 'Yoga or stretching' },
];

export function yearsInBusiness() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const anniversaryPassed = month > 6 || (month === 6 && day >= 1);
  return anniversaryPassed ? year - 1985 : year - 1985 - 1;
}

export function computeWorkIntensity(physical, stress) {
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

export function reverseWorkIntensity(intensity) {
  if (intensity <= 1.5) return { physical: 'sitting', stress: 'comfortable' };
  if (intensity <= 2.0) return { physical: 'sitting', stress: 'busy' };
  if (intensity <= 2.5) return { physical: 'feet', stress: 'comfortable' };
  if (intensity <= 3.0) return { physical: 'carrying', stress: 'comfortable' };
  if (intensity <= 3.5) return { physical: 'heavy', stress: 'comfortable' };
  return { physical: 'heavy', stress: 'stressful' };
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

export function formatBirthDateDigits(digits) {
  const d = String(digits || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export const BIRTH_DATE_TEMPLATE = 'MM/DD/YYYY';

export function birthDateDigits(text) {
  return String(text || '').replace(/\D/g, '').slice(0, 8);
}

export function birthDateMaskDisplay(text) {
  const digits = birthDateDigits(text);
  if (!digits.length) return BIRTH_DATE_TEMPLATE;
  let di = 0;
  return BIRTH_DATE_TEMPLATE.replace(/[MDY]/g, (ch) => (di < digits.length ? digits[di++] : ch));
}

export function birthDateCursorPosition(digitCount) {
  const positions = [0, 1, 3, 4, 6, 7, 8, 9, 10];
  return positions[Math.min(digitCount, 8)] ?? 10;
}

export function parseBirthDateText(text) {
  const m = String(text || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const born = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  if (born.getMonth() + 1 !== month || born.getDate() !== day) return null;
  return iso;
}

export function birthDateIsComplete(text) {
  return birthDateDigits(text).length === 8;
}

export function birthDateEntryError(text) {
  if (!birthDateIsComplete(text)) return null;
  const iso = parseBirthDateText(text);
  if (!iso) return 'Enter a valid date (MM/DD/YYYY).';
  const { min, max } = birthDateFieldBounds();
  if (iso < min || iso > max) return 'Age must be between 13 and 99.';
  return null;
}

export function birthDateIsValid(text) {
  return birthDateIsComplete(text) && birthDateEntryError(text) === null;
}

export function defaultBirthDateFromAge(age) {
  const today = new Date();
  const born = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
  const y = born.getFullYear();
  const m = String(born.getMonth() + 1).padStart(2, '0');
  const d = String(born.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function defaultBirthDateTextFromAge(age) {
  return formatBirthDateText(defaultBirthDateFromAge(age));
}

export function birthDateFieldBounds() {
  const today = new Date();
  const max = defaultBirthDateFromAge(13);
  const min = defaultBirthDateFromAge(99);
  return { min, max };
}

export function heightDisplay(inches) {
  const { feet, inches: rem } = heightParts(inches);
  return `${feet}'${rem}"`;
}

export function heightParts(totalInches) {
  const n = Number(totalInches);
  if (!Number.isFinite(n) || n <= 0) return { feet: '', inches: '' };
  const rounded = Math.round(n);
  return {
    feet: Math.floor(rounded / 12),
    inches: rounded % 12,
  };
}

export function heightFromParts(feet, inches) {
  const f = feet === '' ? 0 : Math.max(0, Number(feet) || 0);
  const i = inches === '' ? 0 : Math.max(0, Math.min(11, Number(inches) || 0));
  return f * 12 + i;
}

/** Total inches from ft/in form fields — empty inches counts as 0 when feet is set. */
export function resolvedHeightInches(feet, inchesPart) {
  const f = feet === '' || feet == null ? '' : String(feet).trim();
  const i = inchesPart === '' || inchesPart == null ? '' : String(inchesPart).trim();
  if (f === '' && i === '') return '';
  return heightFromParts(f, i === '' ? 0 : i);
}

export function heightFormParts(totalInches) {
  const parts = heightParts(totalInches);
  return {
    heightFeet: parts.feet !== '' ? String(parts.feet) : '',
    heightInchesPart: parts.inches !== '' ? String(parts.inches) : '',
  };
}

export function heightReadable(totalInches) {
  const n = Number(totalInches);
  if (!Number.isFinite(n) || n <= 0) return '';
  const { feet, inches } = heightParts(n);
  return `${feet} ft ${inches} in`;
}

export function heightInputValue(totalInches) {
  const n = Number(totalInches);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : '';
}

export function isValidHeight(totalInches) {
  const n = Number(totalInches);
  return n >= 48 && n <= 84;
}

export function heightInchesLabel(inches) {
  const n = Math.round(Number(inches));
  return Number.isFinite(n) && n > 0 ? `${n} inches` : '—';
}

/** Bare digits are feet then inches — "56" means 5 ft 6 in, not 56 total inches. */
export function parseHeightDigits(digits) {
  const d = String(digits || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 1) return { feet: d, inches: '' };
  if (d.length === 2) return { feet: d[0], inches: d[1] };
  const feet = d[0];
  const inches = Math.min(11, Number(d.slice(1)) || 0);
  return { feet, inches: String(inches) };
}

/** Parse common height phrases: 5'6, 5 ft 6 in, 56, 511. */
export function parseHeightExpression(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return null;

  let m = raw.match(/^(\d)\s*['\u2032]\s*(\d{1,2})\s*["\u2033]?$/);
  if (m) return { feet: m[1], inches: String(Math.min(11, Number(m[2]))) };

  m = raw.match(/^(\d)\s*(?:ft|feet|foot)\.?\s*(\d{1,2})\s*(?:in|inches|inch)?\.?$/);
  if (m) return { feet: m[1], inches: String(Math.min(11, Number(m[2]))) };

  m = raw.match(/^(\d)\s*[- ]\s*(\d{1,2})$/);
  if (m) return { feet: m[1], inches: String(Math.min(11, Number(m[2]))) };

  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 1) return parseHeightDigits(digits);

  return null;
}

export function formatWakeDisplay(wakeTime) {
  if (!wakeTime) return '—';
  const { hour12, minute, ampm } = parseWakeTime(wakeTime);
  return `${hour12}:${minute} ${ampm}`;
}

export function parseWakeTime(wakeTime) {
  const [hStr, mStr] = (wakeTime || '06:00').split(':');
  let h24 = Number(hStr);
  const minute = String(Number(mStr)).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, ampm };
}

export function wakeTimeFromParts(hour12, minute, ampm) {
  let h = Number(hour12);
  if (ampm === 'AM') {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return `${String(h).padStart(2, '0')}:${minute}`;
}

export const ACTIVITY_HOURS_INSTRUCTION = 'enter the hours each week down to the 1/4 hour (15 minutes)';

export function formatActivityHoursNumber(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}

export function parseActivityHours(value, max = 15) {
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

/** On blur, treat a trailing decimal point as the number before it (e.g. "6." → 6). */
export function finalizeActivityHours(value, max = 15) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (raw.endsWith('.')) return parseActivityHours(raw.slice(0, -1), max);
  return parseActivityHours(raw, max);
}

export function activityHoursHasValue(value, max = 15) {
  return parseActivityHours(value, max) !== null;
}

export function activityHoursFieldDisplay(value, max = 15) {
  const parsed = parseActivityHours(value, max);
  if (parsed !== null) return formatActivityHoursNumber(parsed);
  if (value === '' || value == null) return ACTIVITY_HOURS_INSTRUCTION;
  return ACTIVITY_HOURS_INSTRUCTION;
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
    remindersEnabled: !!form.remindersEnabled,
    newsletterOptIn: !!form.newsletterOptIn,
    lowActivities: form.lowActivities || [],
  };
}
