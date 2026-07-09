/** Body composition + LBM analysis — projections screen (DXA-style). */

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
