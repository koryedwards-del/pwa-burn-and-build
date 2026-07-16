/** Seminar page 2 — Lean Body Analysis printout (ACE + weight bands). */

import { desirableLeanBodyMassLbs } from './bodyCompositionAnalysis.js';

const ACE = {
  female: [
    { key: 'extreme', label: 'Extreme', rangeLabel: '9%-13.99%', low: 9, high: 13.99, aceWord: 'lean' },
    { key: 'healthy', label: 'Healthy', rangeLabel: '14%-20.99%', low: 14, high: 20.99, aceWord: 'healthy' },
    { key: 'average', label: 'Average', rangeLabel: '21%-25.99%', low: 21, high: 25.99, aceWord: 'average' },
    { key: 'borderline', label: 'Borderline', rangeLabel: '26%-31.99%', low: 26, high: 31.99, aceWord: 'borderline' },
    { key: 'atRisk', label: 'At Risk', rangeLabel: 'Over 32 +%', low: 32, high: null, aceWord: 'at risk' },
  ],
  male: [
    { key: 'extreme', label: 'Extreme', rangeLabel: '4.5%-7.99%', low: 4.5, high: 7.99, aceWord: 'lean' },
    { key: 'healthy', label: 'Healthy', rangeLabel: '8%-14.99%', low: 8, high: 14.99, aceWord: 'healthy' },
    { key: 'average', label: 'Average', rangeLabel: '15%-20.99%', low: 15, high: 20.99, aceWord: 'average' },
    { key: 'borderline', label: 'Borderline', rangeLabel: '21%-24.99%', low: 21, high: 24.99, aceWord: 'borderline' },
    { key: 'atRisk', label: 'At Risk', rangeLabel: 'Over 25 +%', low: 25, high: null, aceWord: 'at risk' },
  ],
};

function phpRound(weight) {
  return Math.floor(Number(weight) + 0.5);
}

function weightAtBodyFat(lbm, bodyFatPercent) {
  const l = Number(lbm);
  const bf = Number(bodyFatPercent);
  if (!l || !bf || bf >= 100) return 0;
  return phpRound(l / (1 - bf / 100));
}

export function aceCategoryForBodyFat(gender, bodyFatPercent) {
  const g = gender === 'female' ? 'female' : 'male';
  const bf = Number(bodyFatPercent);
  const rows = ACE[g];
  for (const row of rows) {
    if (row.high == null && bf >= row.low) return row;
    if (bf >= row.low && bf <= row.high) return row;
  }
  return rows[rows.length - 1];
}

export function aceVerdictSentence(gender, bodyFatPercent) {
  const cat = aceCategoryForBodyFat(gender, bodyFatPercent);
  return `According to the American Council on Exercise you are ${cat.aceWord} based on your current fat percentage.`;
}

export function weightGoalBandsByLbm(gender, leanBodyMass) {
  const g = gender === 'female' ? 'female' : 'male';
  const lbm = Number(leanBodyMass);
  const rows = ACE[g];
  if (!lbm) return [];

  return rows.map((row, index) => {
    const lowWeight = weightAtBodyFat(lbm, row.low);
    if (index === rows.length - 1) {
      return { label: row.label, display: `${lowWeight} lbs. or more` };
    }
    const nextLow = rows[index + 1].low;
    const highWeight = weightAtBodyFat(lbm, nextLow) - 1;
    return { label: row.label, display: `${lowWeight}-${highWeight} lbs.` };
  });
}

export function desirableLeanLine(gender, heightInches) {
  const desirable = desirableLeanBodyMassLbs(gender, heightInches);
  const noun = gender === 'female' ? 'female' : 'male';
  if (!desirable) return null;
  return `A ${noun} your height in good condition has ${desirable} pounds or more of lean body weight.`;
}

export function lbmCongratulationsLine(atOrAbove) {
  if (!atOrAbove) return null;
  return (
    'CONGRATULATIONS! Your LBM is at or above the desirable amount. Even so, it\'s a good idea to '
    + 'exercise at least twice a week. If you want to gain lean or maybe just tone and shape your body, do so by '
    + 'participating in a weight-training program two to three times a week under the guidance of an '
    + 'experienced trainer. The table below tells us what you would weigh for the different health categories '
    + 'based on your current Lean Body Mass. Increasing or decreasing your LBM would increase or decrease '
    + 'the suggested body weight accordingly. For maximum success, feed your body properly. This diet will '
    + 'show you how much food you need daily for maximum results.'
  );
}

export function aceRangeHeaders(gender) {
  const g = gender === 'female' ? 'female' : 'male';
  return ACE[g];
}
