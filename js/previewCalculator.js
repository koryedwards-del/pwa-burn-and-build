import { computePlan } from './burnEngine.js';

/** Moderate defaults for "what's possible" preview — not a personalized program. */
const PREVIEW_DEFAULTS = {
  intensity: 2.0,
  weightTrainingHours: 2,
  cardioHours: 1,
  fatBurningHours: 3,
};

export function computePreview({ weightLbs, bodyFatPercent, targetBodyFatPercent }) {
  const weight = Number(weightLbs);
  const bf = Number(bodyFatPercent);
  const targetBf = Number(targetBodyFatPercent);

  if (!weight || weight < 80 || !bf || bf < 5 || bf > 60) {
    return { valid: false, error: 'Enter a realistic weight and body fat percentage.' };
  }

  const lbm = weight * (1 - bf / 100);
  const plan = computePlan({
    lbm,
    ...PREVIEW_DEFAULTS,
  });

  const weeklyLoss = Math.max(plan.weeklyFatLossPounds, 0);
  const fatToLose = Math.max((weight * (bf - targetBf)) / 100, 0);
  const weeksToTarget = weeklyLoss > 0 ? Math.ceil(fatToLose / weeklyLoss) : null;
  const eightWeekLoss = weeklyLoss * 8;

  return {
    valid: true,
    lbm: Math.round(lbm),
    weeklyFatLossLbs: Math.round(weeklyLoss * 10) / 10,
    fatServingsPerDay: plan.servings.fatMaintain,
    proteinServingsPerDay: plan.servings.protein,
    eightWeekLossLbs: Math.round(eightWeekLoss * 10) / 10,
    weeksToTarget,
    targetBodyFatPercent: targetBf,
    projectedWeight8wk: Math.round((weight - eightWeekLoss) * 10) / 10,
    projectedBf8wk: weeklyLoss > 0
      ? Math.round(((weight - eightWeekLoss - (weight - eightWeekLoss) * (1 - bf / 100)) / (weight - eightWeekLoss)) * 1000) / 10
      : bf,
  };
}

export function defaultTargetBf(currentBf) {
  const target = currentBf - 5;
  return Math.max(Math.round(target), 12);
}
