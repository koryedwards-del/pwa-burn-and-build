/** Burn & Build program package — build and validate desktop program payloads. */

import { computePlan, generateMealSlots } from './burnEngine.js';
import { heartRates, profileFromForm } from './onboardingEngine.js';

export const SCHEMA_VERSION = '1.0.0';
export const FOODS_CATALOG_VERSION = '2026.07.01';
export const PROGRAM_DURATION_DAYS = 56;

export function buildProgramPackage(form, { startDate, programId, label, meta } = {}) {
  const intake = profileFromForm(form);
  const plan = computePlan({
    lbm: intake.leanBodyMass,
    intensity: intake.workIntensity,
    weightTrainingHours: intake.weightTrainingHours,
    cardioHours: intake.cardioHours,
    fatBurningHours: intake.fatBurningHours,
  });
  const [wh, wm] = (intake.wakeTime || '06:00').split(':').map(Number);
  const mealSlots = generateMealSlots(wh, wm, plan.servings);
  const createdDate = localDateKey(new Date());

  return {
    schemaVersion: SCHEMA_VERSION,
    packageType: 'burn-and-build-program',
    program: {
      id: programId || crypto.randomUUID(),
      issuedAt: new Date().toISOString(),
      issuedAtLocalDate: localDateKey(new Date()),
      firstSavedAtLocalDate: createdDate,
      foodPlanCreatedDate: createdDate,
      startDate: startDate || todayDateKey(),
      durationDays: PROGRAM_DURATION_DAYS,
      status: 'active',
      label: label || '8-Week Burn & Build Program',
    },
    intake: {
      ...intake,
      defaultWakeTime: intake.wakeTime || '06:00',
    },
    plan: {
      servings: plan.servings,
      summary: {
        maintainTotalCals: plan.maintainTotalCals,
        reduceTotalCals: plan.reduceTotalCals,
        maintainProteinGrams: plan.maintainProteinGrams,
        reduceFatGrams: plan.reduceFatGrams,
        maintainFatCalories: plan.maintainFatCalories,
        reduceFatCalories: plan.reduceFatCalories,
        weeklyFatLossPounds: plan.weeklyFatLossPounds,
      },
      formula: plan.formula,
      mealSlots,
    },
    schedule: {
      heartRates: heartRates(intake.age),
      activityTargets: {
        weightTrainingHoursPerWeek: intake.weightTrainingHours,
        cardioHoursPerWeek: intake.cardioHours,
        fatBurningHoursPerWeek: intake.fatBurningHours,
      },
    },
    reference: {
      engineVersion: '1.0.0',
      engineSource: 'burnEngine.js',
      foodsCatalogVersion: FOODS_CATALOG_VERSION,
      generatedBy: 'burn-engine-web',
      websiteUrl: 'https://burnandbuilddiet.com',
    },
    meta: {
      customerRef: null,
      purchaseRef: null,
      allowRegenerate: false,
      expiresAt: null,
      supersedesProgramId: null,
      ...meta,
    },
    signature: null,
  };
}

export function validateProgramPackage(pkg) {
  const errors = [];
  if (!pkg || typeof pkg !== 'object') {
    return { ok: false, errors: ['Package must be a JSON object.'] };
  }
  if (pkg.packageType !== 'burn-and-build-program') {
    errors.push('Invalid packageType.');
  }
  if (!pkg.schemaVersion?.startsWith('1.')) {
    errors.push(`Unsupported schemaVersion: ${pkg.schemaVersion}`);
  }
  if (!pkg.program?.id) errors.push('Missing program.id.');
  if (!pkg.program?.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(pkg.program.startDate)) {
    errors.push('Invalid program.startDate (expected YYYY-MM-DD).');
  }
  if (pkg.program?.status !== 'active') {
    errors.push(`Program status is "${pkg.program?.status}" — only active programs are supported.`);
  }
  const s = pkg.plan?.servings;
  if (!s) {
    errors.push('Missing plan.servings.');
  } else {
    for (const key of ['protein', 'grainsStarches', 'vegetables', 'fruits', 'fatReduce', 'fatMaintain']) {
      if (typeof s[key] !== 'number' || s[key] < 0) errors.push(`Invalid plan.servings.${key}.`);
    }
  }
  if (!pkg.intake?.leanBodyMass || pkg.intake.leanBodyMass <= 0) {
    errors.push('Missing intake.leanBodyMass.');
  }
  if (pkg.meta?.expiresAt && new Date(pkg.meta.expiresAt) < new Date()) {
    errors.push('Program has expired.');
  }
  return { ok: errors.length === 0, errors };
}

export function localDateKey(from = new Date()) {
  if (from == null || from === '') return null;
  const s = typeof from === 'string' ? from.trim() : from;
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = from instanceof Date ? from : new Date(from);
  if (Number.isNaN(d.getTime())) {
    const m = String(from).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayDateKey() {
  return localDateKey(new Date());
}
