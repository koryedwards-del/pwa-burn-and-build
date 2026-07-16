/** Body composition + LBM analysis — projections screen (DXA-style). */

import {
  computeEightWeekFatProjection,
  fatLossPoundsFromCalorieGap,
  PROJECTION_BF_FLOOR,
  PROJECTION_CYCLE_DAYS,
} from './burnEngine.js';

const PROJECTION_CYCLE_WEEKS = 8;
const TARGET_BF = PROJECTION_BF_FLOOR;

/** Desirable LBM by height (in) — PHP createsankorplan.php lookup table. */
const DESIRABLE_LBM_BY_HEIGHT = {
  female: {
    58: 90, 59: 92, 60: 94, 61: 96, 62: 98, 63: 100, 64: 102, 65: 104, 66: 106, 67: 108,
    68: 110, 69: 112, 70: 115, 71: 118, 72: 121, 73: 124, 74: 128, 75: 132, 76: 136, 77: 140,
  },
  male: {
    58: 113, 59: 116, 60: 119, 61: 122, 62: 125, 63: 128, 64: 131, 65: 135, 66: 139, 67: 145,
    68: 151, 69: 156, 70: 161, 71: 166, 72: 171, 73: 176, 74: 181, 75: 187, 76: 192, 77: 197,
  },
};

function aceBadge(bf, gender, isFloor) {
  if (isFloor) return { label: 'Showtime', cls: 'showtime' };
  if (gender === 'male' && bf <= 24 && bf > 13) return { label: 'Average', cls: 'average' };
  if (gender === 'female' && bf <= 31 && bf > 20) return { label: 'Average', cls: 'average' };
  return null;
}


function round1(x) {
  return Math.round(Number(x) * 10) / 10;
}

function round2(x) {
  return Math.round(Number(x) * 100) / 100;
}

/** Eight-week fat projection — PHP printout math with gender BF% guardrail. */
export function computeDietEightWeekProjection({
  weightLbs,
  leanBodyMass,
  bodyFatPercent,
  maintainTotalCalories,
  reduceTotalCalories,
  gender = 'male',
}) {
  return computeEightWeekFatProjection({
    weightLbs,
    leanBodyMass,
    bodyFatPercent,
    maintainTotalCalories,
    reduceTotalCalories,
    gender: gender === 'female' ? 'female' : 'male',
  });
}

/** Full timeline from PHP projection cycles (60-day fat loss, constant LBM). */
export function computeDietProjectionTimeline({
  gender,
  weightLbs,
  leanBodyMass,
  bodyFatPercent,
  maintainTotalCalories,
  reduceTotalCalories,
}) {
  const weight = Number(weightLbs);
  const lbm = Number(leanBodyMass);
  const bf = Number(bodyFatPercent);
  const maintainTotal = Number(maintainTotalCalories);
  const reduceTotal = Number(reduceTotalCalories);
  const g = gender === 'female' ? 'female' : 'male';
  const targetBf = TARGET_BF[g];

  if (!weight || weight <= 0 || !lbm || lbm <= 0 || lbm >= weight || !bf || bf <= targetBf || bf > 70) {
    return { valid: false };
  }
  if (!maintainTotal || !reduceTotal || maintainTotal <= reduceTotal) {
    return { valid: false };
  }

  const cycleFatLossLbs = round1(fatLossPoundsFromCalorieGap(maintainTotal, reduceTotal, PROJECTION_CYCLE_DAYS));
  const goalFatLbs = (lbm * targetBf) / 100;
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

    if (remaining <= cycleFatLossLbs) {
      const weeksThisCycle = remaining > 0
        ? (remaining / cycleFatLossLbs) * PROJECTION_CYCLE_WEEKS
        : 0;
      cycleWeeks += weeksThisCycle;
      curFatLbs = goalFatLbs;
      curWeight = lbm + curFatLbs;

      const timelineLabel = `${Math.round(cycleWeeks)} weeks`;
      const last = rows[rows.length - 1];
      if (last && !last.isCurrent && last.timeline === timelineLabel) {
        rows.pop();
      }

      if (!shownBadges.Showtime) {
        shownBadges.Showtime = true;
        rows.push({
          timeline: timelineLabel,
          bodyFat: targetBf,
          bodyFatDisplay: `${targetBf.toFixed(2)}%`,
          weight: curWeight,
          weightDisplay: `${curWeight.toFixed(1)} lbs`,
          isCurrent: false,
          badge: 'Showtime',
          isShowtime: true,
        });
      }
      break;
    }

    curFatLbs -= cycleFatLossLbs;
    curWeight = lbm + curFatLbs;
    const newBf = (curFatLbs / curWeight) * 100;
    cycleWeeks += PROJECTION_CYCLE_WEEKS;

    const badge = aceBadge(newBf, g, false);
    let badgeLabel = null;
    if (badge && !shownBadges[badge.label]) {
      shownBadges[badge.label] = true;
      badgeLabel = badge.label;
    }

    rows.push({
      timeline: `${cycleWeeks} weeks`,
      bodyFat: newBf,
      bodyFatDisplay: `${newBf.toFixed(2)}%`,
      weight: curWeight,
      weightDisplay: `${curWeight.toFixed(1)} lbs`,
      isCurrent: false,
      badge: badgeLabel,
    });
  }

  const wholeWeeks = Math.round(cycleWeeks);

  return {
    valid: true,
    gender: g,
    lbm: round1(lbm),
    targetBf,
    finalWeight: round1(finalWeight),
    totalWeeks: wholeWeeks,
    rows,
  };
}

export function computeTodayBodyComposition(intake) {
  const weight = Number(intake?.totalWeight) || 0;
  const lbm = Number(intake?.leanBodyMass) || 0;
  const fatPct = Number(intake?.fatPercent) || 0;
  const fatLbs = weight > 0 && lbm >= 0 ? round1(weight - lbm) : 0;
  const leanPct = fatPct > 0 ? round2(100 - fatPct) : (weight > 0 ? round2((lbm / weight) * 100) : 0);

  return {
    leanPct: leanPct.toFixed(2),
    fatPct: fatPct.toFixed(2),
    leanLbs: lbm.toFixed(1),
    fatLbs: fatLbs.toFixed(1),
    totalLbs: weight.toFixed(1),
    totalPct: '100.00',
  };
}

/** Desirable LBM (lbs) from height — PHP createsankorplan.php table. */
export function desirableLeanBodyMassLbs(gender, heightInches) {
  const h = Math.round(Number(heightInches) || 0);
  if (h <= 0) return null;
  const table = DESIRABLE_LBM_BY_HEIGHT[gender === 'female' ? 'female' : 'male'];
  if (table[h] != null) return table[h];
  const heights = Object.keys(table).map(Number).sort((a, b) => a - b);
  const clamped = Math.max(heights[0], Math.min(heights[heights.length - 1], h));
  return table[clamped] ?? null;
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
    desirableLbm: Math.round(desirable * 10) / 10,
    message: atOrAbove
      ? 'Your LBM is at or above desirable'
      : 'Your LBM is below desirable',
  };
}
