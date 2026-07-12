/** Body composition + LBM analysis — projections screen (DXA-style). */

import { fatLossPoundsFromDailyServings } from './burnEngine.js';

const EIGHT_WEEK_CYCLE = 8;
const WEEKS_PER_MONTH = 4;
const TARGET_BF = { male: 4.68, female: 8.95 };

function aceBadge(bf, gender, isFloor) {
  if (isFloor) return { label: 'Showtime', cls: 'showtime' };
  if (gender === 'male' && bf <= 24 && bf > 13) return { label: 'Average', cls: 'average' };
  if (gender === 'female' && bf <= 31 && bf > 20) return { label: 'Average', cls: 'average' };
  return null;
}

function targetFatLbs(lbm, targetBf) {
  return (lbm / (1 - targetBf / 100)) - lbm;
}

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

/** Full timeline from daily fat servings (8-week cycles, constant LBM). */
export function computeDietProjectionTimeline({
  gender,
  weightLbs,
  leanBodyMass,
  bodyFatPercent,
  fatServingsPerDay,
}) {
  const weight = Number(weightLbs);
  const lbm = Number(leanBodyMass);
  const bf = Number(bodyFatPercent);
  const servings = Number(fatServingsPerDay);
  const g = gender === 'female' ? 'female' : 'male';
  const targetBf = TARGET_BF[g];

  if (!weight || weight <= 0 || !lbm || lbm <= 0 || lbm >= weight || !bf || bf <= targetBf || bf > 70 || !servings || servings <= 0) {
    return { valid: false };
  }

  const cycleFatLossLbs = fatLossPoundsFromDailyServings(servings, EIGHT_WEEK_CYCLE * 7);
  const goalFatLbs = targetFatLbs(lbm, targetBf);
  const finalWeight = lbm + goalFatLbs;

  const rows = [];
  const shownBadges = {};
  let curWeight = weight;
  let curFatLbs = weight - lbm;
  let cycleWeeks = 0;

  rows.push({
    timeline: 'Current',
    bodyFat: bf,
    bodyFatDisplay: `${bf.toFixed(2)}%`,
    weight,
    weightDisplay: `${weight.toFixed(0)} lbs`,
    isCurrent: true,
    badge: null,
  });

  while (curFatLbs > goalFatLbs + 0.05) {
    const remaining = curFatLbs - goalFatLbs;
    const isFloor = remaining <= cycleFatLossLbs;
    const lostThisCycle = isFloor ? remaining : cycleFatLossLbs;
    const weeksThisCycle = isFloor
      ? (lostThisCycle > 0 ? (lostThisCycle / cycleFatLossLbs) * EIGHT_WEEK_CYCLE : 0)
      : EIGHT_WEEK_CYCLE;

    curFatLbs -= lostThisCycle;
    curWeight = lbm + curFatLbs;
    const newBf = isFloor ? targetBf : (curFatLbs / curWeight) * 100;
    cycleWeeks += weeksThisCycle;

    const badge = aceBadge(newBf, g, isFloor);
    let badgeLabel = null;
    if (badge && !shownBadges[badge.label]) {
      shownBadges[badge.label] = true;
      badgeLabel = badge.label;
    }

    rows.push({
      timeline: isFloor ? `${Math.round(cycleWeeks)} weeks` : `${cycleWeeks} weeks`,
      bodyFat: newBf,
      bodyFatDisplay: isFloor ? `${targetBf.toFixed(2)}%` : `${newBf.toFixed(2)}%`,
      weight: curWeight,
      weightDisplay: `${curWeight.toFixed(1)} lbs`,
      isCurrent: false,
      badge: badgeLabel,
    });

    if (isFloor) break;
  }

  const wholeWeeks = Math.round(cycleWeeks);
  const narrative = `<strong>Pro Tip:</strong> Transforming your body is a balance of lean body mass (muscle shape) and how much body fat is covering it up. Based on your current weight and body fat, Burn &amp; Build can take you from <strong>${weight.toFixed(0)} lbs at ${bf.toFixed(0)}%</strong> to <strong>${finalWeight.toFixed(1)} lbs at ${targetBf}%</strong> in <strong>${wholeWeeks} weeks</strong> — while increasing your strength and energy. If the projected body weight at your desired body fat seems too low, it means you need more muscle. Participate in weight training and follow your personalized Burn &amp; Build program for fastest results.`;

  return {
    valid: true,
    gender: g,
    lbm: Math.round(lbm * 10) / 10,
    targetBf,
    finalWeight: Math.round(finalWeight * 10) / 10,
    totalWeeks: wholeWeeks,
    narrative,
    rows,
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
