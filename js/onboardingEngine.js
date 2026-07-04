export const WELCOME_COUNT = 1;
export const QUESTION_COUNT = 9;

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

export function heightDisplay(inches) {
  const ft = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${ft}'${rem}"`;
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

export function defaultOnboardingForm(profile) {
  const p = profile || {};
  const work = reverseWorkIntensity(p.workIntensity ?? 2);
  return {
    preferredName: p.preferredName || '',
    sex: p.sex || 'Male',
    heightInches: p.heightInches ?? 68,
    age: p.age ?? 35,
    weightText: p.totalWeight > 0 ? String(Math.round(p.totalWeight)) : '',
    fatPercentText: p.fatPercent > 0 ? String(p.fatPercent) : '',
    fatSource: p.fatPercent > 0 ? 'recent' : '',
    workPhysical: p.workPhysical || work.physical,
    workStress: p.workStress || work.stress,
    weightTrainingHours: p.weightTrainingHours ?? 0,
    cardioHours: p.cardioHours ?? 0,
    fatBurningHours: p.fatBurningHours ?? 3,
    wakeTime: p.wakeTime || '06:00',
    remindersEnabled: p.remindersEnabled !== false,
    lowActivities: p.lowActivities || [],
  };
}

export function profileFromForm(form) {
  const weight = Number(form.weightText);
  const fatPercent = Number(form.fatPercentText);
  const lbm = weight * (1 - fatPercent / 100);
  const intensity = computeWorkIntensity(form.workPhysical, form.workStress);
  return {
    preferredName: form.preferredName.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    sex: form.sex,
    age: Number(form.age),
    heightInches: Number(form.heightInches),
    totalWeight: weight,
    fatPercent,
    leanBodyMass: lbm,
    workIntensity: intensity,
    workPhysical: form.workPhysical,
    workStress: form.workStress,
    weightTrainingHours: Number(form.weightTrainingHours),
    cardioHours: Number(form.cardioHours),
    fatBurningHours: Number(form.fatBurningHours),
    wakeTime: form.wakeTime,
    remindersEnabled: !!form.remindersEnabled,
    lowActivities: form.lowActivities || [],
  };
}

export function welcomeScreens() {
  return [
    {
      type: 'intro',
      line1: 'READY?',
      line2: "LET'S BUILD.",
      body: "This takes a few minutes. It's worth it. We'll use your answers to build a food plan that's yours — not a generic template.",
      quote: "I learned this program in 1992 and it has been invaluable. At 67, I am confident I can maintain and even build muscle and lose fat. Let's go!",
      quoteName: 'Linda Kay',
      quoteMeta: 'Client since 1992',
    },
  ];
}

export function onboardingPhase(page, isEditMode) {
  const start = isEditMode ? WELCOME_COUNT : 0;
  if (page < WELCOME_COUNT) return { kind: 'welcome', index: page };
  const qi = page - WELCOME_COUNT;
  if (qi < QUESTION_COUNT) return { kind: 'question', index: qi };
  if (qi === QUESTION_COUNT) return { kind: 'confirm' };
  return { kind: 'done' };
}

export function totalOnboardingPages() {
  return WELCOME_COUNT + QUESTION_COUNT + 2;
}

export function canProceed(phase, form) {
  switch (phase.kind) {
    case 'welcome':
      return true;
    case 'question':
      switch (phase.index) {
        case 0: return form.preferredName.trim().length > 0;
        case 3: return Number(form.weightText) > 0;
        case 4: return Number(form.fatPercentText) > 0 && form.fatSource;
        case 5: return !!form.workPhysical;
        case 6: return !!form.workStress;
        default: return true;
      }
    default:
      return true;
  }
}

export function nextLabel(phase, isEditMode) {
  if (phase.kind === 'welcome' && phase.index === 0) return 'START BUILDING';
  if (phase.kind === 'welcome') return 'NEXT  →';
  if (phase.kind === 'confirm') return isEditMode ? 'UPDATE MY PLAN  →' : "LET'S GO  →";
  if (phase.kind === 'done') return isEditMode ? 'DONE  →' : 'SEE YOUR FOOD PLAN  →';
  return 'NEXT  →';
}
