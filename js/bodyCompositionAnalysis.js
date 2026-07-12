/** Body composition + LBM analysis — projections screen (DXA-style). */

import { fatLossPoundsFromDailyServings } from './burnEngine.js';

const EIGHT_WEEK_CYCLE = 8;
const WEEKS_PER_MONTH = 4;

function projectFatComposition({ weight, lbm, fatServingsPerDay, days }) {
  const startFatLbs = weight - lbm;
  const startBf = (startFatLbs / weight) * 100;
  const fatLostLbs = fatLossPoundsFromDailyServings(fatServingsPerDay, days);
  const endFatLbs = Math.max(0, startFatLbs - fatLostLbs);
  const endWeight = lbm + endFatLbs;
  const endBf = endWeight > 0 ? (endFatLbs / endWeight) * 100 : 0;

  return {
    startFatLbs,
    startBf,
    endFatLbs,
    endBf,
    endWeight,
    fatLostLbs: Math.min(fatLostLbs, startFatLbs),
  };
}

/** 8-week fat projection from daily fat servings on the diet (dialed in, no extra fat). */
export function computeDietEightWeekProjection({ weightLbs, leanBodyMass, fatServingsPerDay, weeks = EIGHT_WEEK_CYCLE }) {
  const weight = Number(weightLbs);
  const lbm = Number(leanBodyMass);
  const servings = Number(fatServingsPerDay);

  if (!weight || weight <= 0 || !lbm || lbm <= 0 || lbm >= weight || !servings || servings <= 0) return null;

  const eightWeek = projectFatComposition({
    weight,
    lbm,
    fatServingsPerDay: servings,
    days: weeks * 7,
  });
  const oneMonth = projectFatComposition({
    weight,
    lbm,
    fatServingsPerDay: servings,
    days: WEEKS_PER_MONTH * 7,
  });
  const maxBfChangePerMonth = Math.max(0, eightWeek.startBf - oneMonth.endBf);
  const startLeanPct = weight > 0 ? (lbm / weight) * 100 : 0;
  const endLeanPct = eightWeek.endWeight > 0 ? (lbm / eightWeek.endWeight) * 100 : 0;

  return {
    weeks,
    startWeight: Math.round(weight * 10) / 10,
    leanLbs: Math.round(lbm * 10) / 10,
    startLeanPct,
    endLeanPct: Math.round(endLeanPct * 100) / 100,
    startFatLbs: Math.round(eightWeek.startFatLbs * 10) / 10,
    endFatLbs: Math.round(eightWeek.endFatLbs * 10) / 10,
    fatLostLbs: Math.round(eightWeek.fatLostLbs * 10) / 10,
    startBf: Math.round(eightWeek.startBf * 100) / 100,
    endBf: Math.round(eightWeek.endBf * 100) / 100,
    endWeight: Math.round(eightWeek.endWeight * 10) / 10,
    weeklyFatLossLbs: Math.round((eightWeek.fatLostLbs / weeks) * 10) / 10,
    fatServingsPerDay: servings,
    maxBfChangePerMonth: Math.round(maxBfChangePerMonth * 10) / 10,
  };
}

export function computeTodayBodyComposition(intake) {
  const weight = Number(intake?.totalWeight) || 0;
  const lbm = Number(intake?.leanBodyMass) || 0;
  const fatPct = Number(intake?.fatPercent) || 0;
  const fatLbs = weight > 0 && lbm >= 0 ? weight - lbm : 0;
  const leanPct = weight > 0 ? (lbm / weight) * 100 : 0;

  return {
    leanPct: leanPct.toFixed(2),
    fatPct: fatPct.toFixed(2),
    leanLbs: lbm.toFixed(1),
    fatLbs: fatLbs.toFixed(1),
    totalLbs: weight.toFixed(1),
    totalPct: '100.00',
  };
}

/** Desirable LBM (lbs) from height — DXA database reference curve. */
export function desirableLeanBodyMassLbs(gender, heightInches) {
  const h = Number(heightInches) || 0;
  if (h <= 0) return null;
  const coef = gender === 'female' ? 0.026 : 0.032;
  return h * h * coef;
}

export function analyzeLeanBodyMass({ gender, heightInches, leanBodyMass }) {
  const desirable = desirableLeanBodyMassLbs(gender, heightInches);
  const lbm = Number(leanBodyMass) || 0;

  if (!desirable) {
    return {
      atOrAbove: false,
      message: 'Add your height to see lean body mass analysis.',
    };
  }

  const atOrAbove = lbm >= desirable;
  return {
    atOrAbove,
    desirableLbm: desirable,
    message: atOrAbove
      ? 'Your LBM is at or above desirable'
      : 'Your LBM is below desirable',
  };
}
