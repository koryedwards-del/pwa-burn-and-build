/** Seminar page 4 — Food Plan printout (8-week table + macro grid). */

import {
  computeDietEightWeekProjection,
  computeDietProjectionTimeline,
} from './bodyCompositionAnalysis.js';

function phpRound(x) {
  return Math.floor(Number(x) + 0.5);
}

function formatCalories(n) {
  return phpRound(n).toLocaleString('en-US');
}

function formatHours(n) {
  return Number(n).toFixed(2);
}

export function workdayActivityLabel(intensity) {
  const value = Number(intensity);
  if (!Number.isFinite(value)) return 'Workday';
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `Workday (${text}a)`;
}

export function exerciseHoursSummary(intake) {
  const wt = formatHours(intake?.weightTrainingHours ?? 0);
  const cardio = formatHours(intake?.cardioHours ?? 0);
  const fatBurn = formatHours(intake?.fatBurningHours ?? 0);
  const total = formatHours(
    Number(intake?.weightTrainingHours ?? 0)
    + Number(intake?.cardioHours ?? 0)
    + Number(intake?.fatBurningHours ?? 0),
  );
  return { total, wt, cardio, fatBurn };
}

export function eightWeekProjectionFromPackage(pkg) {
  const intake = pkg?.intake;
  const summary = pkg?.plan?.summary;
  const formula = pkg?.plan?.formula;
  if (!intake?.leanBodyMass || !intake?.totalWeight || !intake?.fatPercent) return null;
  if (!summary?.maintainTotalCals || !summary?.reduceTotalCals) return null;

  return computeDietEightWeekProjection({
    weightLbs: intake.totalWeight,
    leanBodyMass: intake.leanBodyMass,
    bodyFatPercent: intake.fatPercent,
    maintainTotalCalories: summary.maintainTotalCals,
    reduceTotalCalories: summary.reduceTotalCals,
    gender: String(intake.sex || '').toLowerCase().startsWith('f') ? 'female' : 'male',
  });
}

export function projectionTimelineFromPackage(pkg) {
  const intake = pkg?.intake;
  const summary = pkg?.plan?.summary;
  if (!intake?.leanBodyMass || !intake?.totalWeight || !intake?.fatPercent) return null;
  if (!summary?.maintainTotalCals || !summary?.reduceTotalCals) return null;

  return computeDietProjectionTimeline({
    gender: String(intake.sex || '').toLowerCase().startsWith('f') ? 'female' : 'male',
    weightLbs: intake.totalWeight,
    leanBodyMass: intake.leanBodyMass,
    bodyFatPercent: intake.fatPercent,
    maintainTotalCalories: summary.maintainTotalCals,
    reduceTotalCalories: summary.reduceTotalCals,
  });
}

function macroRow(label, proteinQ, carbsQuarter, fatCalories, totalCalories) {
  const proteinG = Math.round(proteinQ);
  const carbsG = Math.round(carbsQuarter);
  const fatsG = Math.round(fatCalories / 9);
  return {
    label,
    proteinG,
    proteinCal: Math.round(proteinG * 4),
    carbsG,
    carbsCal: Math.round(carbsG * 4),
    fatsG,
    fatsCal: Math.round(fatCalories),
    totalCal: Math.round(totalCalories),
  };
}

export function macroTableRows(formula, workIntensity) {
  if (!formula) return [];
  const f = formula;

  return [
    macroRow('Maintain current fat %', f.QA, f.C1 / 4, f.FD, f.T7),
    macroRow('Reduce current fat %', f.QA, f.C1 / 4, f.FG, f.T1),
    { spacer: true },
    macroRow('Resting(RMR)', f.QB, f.C2 / 4, f.FH, f.T2),
    macroRow(workdayActivityLabel(workIntensity), f.QC, f.C3 / 4, f.FJ, f.T3),
    macroRow('Weight Training', f.QD, f.C4 / 4, f.FK, f.T4),
    macroRow('Cardiovascular Activities', f.QE, f.C5 / 4, f.FL, f.T5),
    macroRow('Fat Burning Activities', f.QF, f.C6 / 4, f.FM, f.T6),
  ];
}

export { formatCalories, formatHours };
