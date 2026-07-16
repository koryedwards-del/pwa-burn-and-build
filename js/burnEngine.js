/** Burn & Build BurnEngine — PHP seminar math in JavaScript.
 * Rounding: round1/round2 at printout boundaries; full precision between steps. */

export const FAT_SERVING_CALORIES = 45;
/** PHP seminar report: eight-week goal uses 60 days (two months). */
export const PROJECTION_CYCLE_DAYS = 60;
export const PROJECTION_CYCLE_WEEKS = 8;
/** Showtime guardrail — female 8.95%, male 4.68%. */
export const PROJECTION_BF_FLOOR = { male: 4.68, female: 8.95 };
/** PHP weekly line: abs(Y9) / 8.6, not / 8. */
export const PROJECTION_WEEKLY_DIVISOR = 8.6;

function round1(x) {
  return Math.round(Number(x) * 10) / 10;
}

function round2(x) {
  return Math.round(Number(x) * 100) / 100;
}

/** Body fat burned (lbs) when fat points from diet are left unused. */
export function fatLossPoundsFromDailyServings(fatPointsPerDay, days) {
  return (Number(fatPointsPerDay) * FAT_SERVING_CALORIES * Number(days)) / 3500;
}

/** PHP printout: (maintain total cal − reduce total cal) × days / 3500. */
export function fatLossPoundsFromCalorieGap(maintainTotalCalories, reduceTotalCalories, days = PROJECTION_CYCLE_DAYS) {
  const gap = Number(maintainTotalCalories) - Number(reduceTotalCalories);
  if (!gap || gap <= 0) return 0;
  return (gap * Number(days)) / 3500;
}

/** PHP printout weekly line: fat lost / 8.6. */
export function weeklyFatLossPoundsFromProjection(fatLostLbs) {
  const loss = Number(fatLostLbs);
  if (!loss || loss <= 0) return 0;
  return round1(loss / PROJECTION_WEEKLY_DIVISOR);
}

function projectionFloorBf(gender) {
  return gender === 'female' ? PROJECTION_BF_FLOOR.female : PROJECTION_BF_FLOOR.male;
}

/** Work intensity multiplier — createsankorplan.php WR table. */
export function workIntensityMultiplier(intensity) {
  switch (Number(intensity)) {
    case 1.0: return 0.47;
    case 1.5: return 0.58;
    case 2.0: return 0.69;
    case 2.5: return 0.84;
    case 3.0: return 1.0;
    case 3.5: return 1.25;
    case 4.0: return 1.5;
    default: return 1.0;
  }
}

/**
 * Eight-week goal projection — PHP threepagereporthtml.php / createfoodpdf.php.
 * Total calorie gap over 60 days; guardrail caps end BF at 8.95% (F) or 4.68% (M).
 */
export function computeEightWeekFatProjection({
  weightLbs,
  leanBodyMass,
  bodyFatPercent,
  maintainTotalCalories,
  reduceTotalCalories,
  gender = 'male',
}) {
  const weight = Number(weightLbs);
  const lbm = Number(leanBodyMass);
  const bf = Number(bodyFatPercent);
  const maintainTotal = Number(maintainTotalCalories);
  const reduceTotal = Number(reduceTotalCalories);
  const isFemale = gender === 'female';

  if (!weight || weight <= 0 || !lbm || lbm <= 0 || lbm >= weight || !bf || bf <= 0 || bf >= 100) {
    return null;
  }
  if (!maintainTotal || !reduceTotal || maintainTotal <= reduceTotal) return null;

  const startFatLbs = round1(weight - lbm);
  const startBf = round2(bf);
  const startLeanPct = round2(100 - startBf);
  const floorBf = projectionFloorBf(gender);

  let fatLostLbs = fatLossPoundsFromCalorieGap(maintainTotal, reduceTotal, PROJECTION_CYCLE_DAYS);
  let endFatLbs = startFatLbs - fatLostLbs;
  let endWeight = lbm + endFatLbs;
  let endBf = Math.abs((endFatLbs / endWeight) * 100);
  let capped = false;

  if ((isFemale && endBf <= floorBf) || (!isFemale && endBf <= floorBf)) {
    capped = true;
    endBf = floorBf;
    endFatLbs = (lbm * endBf) / 100;
    endWeight = lbm + endFatLbs;
    fatLostLbs = startFatLbs - endFatLbs;
  }

  fatLostLbs = round1(Math.abs(fatLostLbs));
  endFatLbs = round1(endFatLbs);
  endWeight = round1(endWeight);
  endBf = round2(endBf);
  const endLeanPct = round2(100 - endBf);
  const weeklyFatLossLbs = weeklyFatLossPoundsFromProjection(fatLostLbs);

  return {
    startWeight: round1(weight),
    leanLbs: round1(lbm),
    startLeanPct,
    endLeanPct,
    startFatLbs,
    endFatLbs,
    fatLostLbs,
    startBf,
    endBf,
    endBfFloor: floorBf,
    endWeight,
    weeklyFatLossLbs,
    cappedByFloor: capped,
    maintainTotalCalories: maintainTotal,
    reduceTotalCalories: reduceTotal,
    projectionDays: PROJECTION_CYCLE_DAYS,
  };
}

function nf1(x) {
  return Math.round(x * 10) / 10;
}

function spf0(x) {
  return Math.floor(x + 0.5);
}

function phpRound(x) {
  return Math.floor(x + 0.5);
}

function computeSetupPhase(LB, intensity, HW, HA, HF) {
  const WR = workIntensityMultiplier(intensity);

  const T2 = LB * 10.65;
  const QB = LB * 0.39;
  const FH = (T2 - QB * 4) * 0.7;
  const C2 = T2 - QB * 4 - FH;

  const T3 = T2 * WR;
  const QC = (T3 * 0.14) / 4;
  const FJ = (T3 - QC * 4) * WR * 0.7;
  const C3 = T3 - QC * 4 - FJ;

  const T4 = T2 * 0.37;
  const QD = LB * 0.075;
  const FK = (T4 - QD * 4) * 0.07;
  const C4 = T4 - QD * 4 - FK;

  const T5 = T2 * 0.42;
  const QE = LB * 0.03;
  const FL = (T5 - QE * 4) * 0.29;
  const C5 = T5 - QE * 4 - FL;

  const T6 = T2 * 0.36;
  const QF = LB * 0.04;
  const FM = (T6 - QF * 4) * 0.48;
  const C6 = T6 - QF * 4 - FM;

  const T7 = (T2 * 7 + T3 * 6 + HW * T4 + HA * T5 + HF * T6) / 7;
  const QA = (QB * 7 + QC * 6 + QD * HW + QE * HA + QF * HF) / 7;
  const FD = (FH * 7 + FJ * 6 + FK * HW + FL * HA + FM * HF) / 7;
  const C1 = (C2 * 7 + C3 * 6 + C4 * HW + C5 * HA + C6 * HF) / 7;

  let FG = FD * 0.38;
  if (FG < 225) FG = 225;

  let T1 = QA * 4 + FG + C1;
  if (T1 < 1000) FG += 1000 - T1;

  const FE = FG / 9;
  T1 = QA * 4 + FG + C1;

  return { T2, QB, FH, C2, T3, QC, FJ, C3, T4, QD, FK, C4, T5, QE, FL, C5, T6, QF, FM, C6, T7, QA, FD, C1, FG, FE, T1 };
}

function computeServingsPhase(r, intensity = 1.0) {
  const FC = r.FD;
  const QG = r.QA * 4;
  const C7 = r.C1;
  const T8 = r.T7;

  let P1 = nf1((((QG * 0.21 / 32) * 2) + 0.5) / 2);
  let D1 = nf1((((QG * 0.25 / 32) * 2) + 0.5) / 2);
  let G1 = nf1((((C7 * 0.23 / 56) * 2) + 0.5) / 2);
  let S2 = nf1((((C7 * 0.18 / 56) * 2) + 0.5) / 2);
  let VE = nf1((((C7 * 0.18 / 40) * 2) + 0.5) / 2);
  let FQ = nf1((((C7 * 0.21 / 72) * 2) + 0.5) / 2);

  if (VE > 1) G1 = G1 + nf1(((VE - 2) * 40 / 56 * 2 + 0.5) / 2);
  if (VE > 1) VE = 1;

  let T9 = 0;
  let TC = 0;

  while (true) {
    while (true) {
      T9 = (P1 + D1) * 32 + (G1 + S2) * 3;
      if (Math.abs(T9 - QG) < 32) break;
      if (QG - T9 > 32) P1 = P1 + spf0((((QG - T9) / 32) * 2 + 0.5) / 2);
      if (T9 - QG > 32) D1 = D1 - nf1((((T9 - QG) / 32) * 2 + 0.5) / 2);
    }

    TC = D1 * 48 + (G1 + S2) * 56 + VE * 40 + FQ * 72;
    if (Math.abs(TC - C7) < 56) break;
    if (C7 - TC >= 56) S2 = S2 + nf1((((C7 - TC) / 56) * 2 + 0.5) / 2);
    if (TC - C7 >= 56) G1 = G1 - nf1((((TC - C7) / 56) * 2 + 0.5) / 2);
  }

  const TF = P1 * 18 + D1 * 22 + G1 * 9 + (S2 + FQ) * 4 + VE * 3;
  let FT = 0;
  if (FC - TF >= 45) FT = nf1((((FC - TF) / 45) * 2 + 0.5) / 2);
  else if (TF - FC < 45) FT = 0;

  const TT = T9 + TC + TF + FT * 45;

  if (Math.abs(TT - T8) < 45) {
    if (T8 - TT > 22) FQ = FQ + ((((T8 - TT) / 44) * 2 + 0.5) / 2);
    if (TT - T8 > 45) FT = FT - nf1((((TT - T8) / 45) * 2 + 0.5) / 2);
    if (FT < 0) FT = 0;
  }
  if (FQ < 3) FQ = 3;

  let PR = phpRound(D1 + P1);
  if (intensity === 4.0) PR = phpRound((D1 + P1) * 1.5);

  return {
    protein: PR,
    grainsStarches: phpRound(G1 + S2),
    vegetables: 1,
    fruits: phpRound(FQ),
    fatReduce: 0,
    fatMaintain: phpRound(FT),
  };
}

export function computePlan({ lbm, intensity, weightTrainingHours, cardioHours, fatBurningHours }) {
  const formula = computeSetupPhase(lbm, intensity, weightTrainingHours, cardioHours, fatBurningHours);
  const servings = computeServingsPhase(formula, intensity);
  return {
    formula,
    servings,
    maintainTotalCals: formula.T7,
    reduceTotalCals: formula.T1,
    maintainProteinGrams: formula.QA,
    reduceFatGrams: formula.FE,
    weeklyFatLossPounds: weeklyFatLossPoundsFromProjection(
      fatLossPoundsFromCalorieGap(formula.T7, formula.T1, PROJECTION_CYCLE_DAYS),
    ),
    maintainFatCalories: formula.FD,
    reduceFatCalories: formula.FG,
  };
}

export function generateMealSlots(wakeHour, wakeMinute, servings) {
  const proteinPerMeal = servings.protein / 3;
  const grainsPerMeal = servings.grainsStarches / 3;
  const fruitsPerSnack = servings.fruits / 3;

  function timeLabel(hoursOffset) {
    const totalMin = wakeHour * 60 + wakeMinute + hoursOffset * 60;
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  return [
    { label: 'Breakfast', mealType: 'meal', time: timeLabel(0), proteinServings: proteinPerMeal, grainStarchServings: grainsPerMeal, vegetableServings: 0, fruitServings: 0 },
    { label: 'Morning Snack', mealType: 'snack', time: timeLabel(3), proteinServings: 0, grainStarchServings: 0, vegetableServings: 0, fruitServings: fruitsPerSnack },
    { label: 'Lunch', mealType: 'meal', time: timeLabel(6), proteinServings: proteinPerMeal, grainStarchServings: grainsPerMeal, vegetableServings: 0, fruitServings: 0 },
    { label: 'Afternoon Snack', mealType: 'snack', time: timeLabel(9), proteinServings: 0, grainStarchServings: 0, vegetableServings: 0, fruitServings: fruitsPerSnack },
    { label: 'Dinner', mealType: 'meal', time: timeLabel(12), proteinServings: proteinPerMeal, grainStarchServings: grainsPerMeal, vegetableServings: servings.vegetables, fruitServings: 0 },
    { label: 'Evening Snack', mealType: 'snack', time: timeLabel(15), proteinServings: 0, grainStarchServings: 0, vegetableServings: 0, fruitServings: fruitsPerSnack },
  ];
}
