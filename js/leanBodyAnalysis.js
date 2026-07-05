/** Lean Body Analysis — body composition, LBM status, and body fat projections. */

export const BF_CATEGORIES = {
  male: [
    { label: 'Competition', bfMin: 8, bfMax: 8 },
    { label: 'Athletic', bfMin: 8, bfMax: 16 },
    { label: 'Lean', bfMin: 16, bfMax: 21 },
    { label: 'Healthy', bfMin: 21, bfMax: 33 },
  ],
  female: [
    { label: 'Competition', bfMin: 12, bfMax: 12 },
    { label: 'Athletic', bfMin: 12, bfMax: 20 },
    { label: 'Lean', bfMin: 20, bfMax: 25 },
    { label: 'Healthy', bfMin: 25, bfMax: 33 },
  ],
};

const DESIRABLE_LEAN_PCT = { male: 50, female: 45 };

export function weightAtBodyFat(lbm, bfPercent) {
  return lbm / (1 - bfPercent / 100);
}

export function computeBodyComposition(weight, fatPercent) {
  const lbm = weight * (1 - fatPercent / 100);
  const fatLbs = weight - lbm;
  const leanPct = (lbm / weight) * 100;
  return {
    totalWeight: weight,
    lbm,
    fatLbs,
    leanPct,
    fatPct: fatPercent,
  };
}

export function computeLbmStatus(leanPct, gender) {
  const threshold = DESIRABLE_LEAN_PCT[gender] || DESIRABLE_LEAN_PCT.male;
  const atOrAbove = leanPct >= threshold;
  return {
    atOrAbove,
    threshold,
    message: atOrAbove
      ? 'Your LBM is at or above desirable'
      : 'Your LBM is below desirable',
  };
}

function formatBfRange(bfMin, bfMax) {
  if (bfMin === bfMax) return `${bfMin}%`;
  return `${bfMin} – ${bfMax}%`;
}

function formatWeightRange(lbm, bfMin, bfMax) {
  const wLow = weightAtBodyFat(lbm, bfMin);
  const wHigh = weightAtBodyFat(lbm, bfMax);
  if (bfMin === bfMax) return `${Math.round(wLow)} lbs`;
  return `${Math.round(wLow)} – ${Math.round(wHigh)} lbs`;
}

export function computeBodyFatProjections(lbm, gender) {
  const cats = BF_CATEGORIES[gender] || BF_CATEGORIES.male;
  return cats.map((cat) => ({
    label: cat.label,
    bfDisplay: formatBfRange(cat.bfMin, cat.bfMax),
    weightDisplay: formatWeightRange(lbm, cat.bfMin, cat.bfMax),
  }));
}

export function computeLeanBodyAnalysis({ weightLbs, bodyFatPercent, gender }) {
  const g = gender === 'female' ? 'female' : 'male';
  const weight = Number(weightLbs);
  const fatPercent = Number(bodyFatPercent);

  if (!weight || weight <= 0 || !fatPercent || fatPercent <= 0 || fatPercent >= 100) {
    return { valid: false, error: 'Program data is missing weight or body fat %.' };
  }

  const composition = computeBodyComposition(weight, fatPercent);
  const lbmStatus = computeLbmStatus(composition.leanPct, g);
  const projections = computeBodyFatProjections(composition.lbm, g);

  return {
    valid: true,
    gender: g,
    composition,
    lbmStatus,
    projections,
  };
}
