/** Program history summaries — body composition history table (KWarner-style). */

import {
  heightReadable,
  formatWakeDisplay,
  activityHoursReviewLabel,
  WORK_PHYSICAL,
  WORK_STRESS,
} from './onboardingEngine.js';
import { localDateKey } from './programPackage.js';

export function formatActivityCode(intake) {
  if (!intake) return '—';
  const wt = Number(intake.weightTrainingHours) || 0;
  const cardio = Number(intake.cardioHours) || 0;
  const fat = Number(intake.fatBurningHours) || 0;
  return `${wt}/${cardio}/${fat}`;
}

export function formatTestDate(isoOrDate) {
  const key = localDateKey(isoOrDate);
  if (!key) return '—';
  const [, y, m, d] = key.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
  return `${m}/${d}/${y.slice(2)}`;
}

function resolveProgramHistoryDateKey(pkg, createdAt) {
  const raw = pkg?.program?.foodPlanCreatedDate
    || (createdAt ? localDateKey(createdAt) : null)
    || pkg?.program?.firstSavedAtLocalDate
    || pkg?.program?.issuedAtLocalDate
    || pkg?.program?.issuedAt
    || pkg?.program?.startDate;
  return localDateKey(raw);
}

function historyTimestamp(isoOrDate) {
  const key = localDateKey(isoOrDate);
  if (!key) return 0;
  return new Date(`${key}T12:00:00`).getTime();
}

/** Active plan first, then newest by date. */
export function sortProgramHistory(rows, activeId) {
  return [...(rows || [])]
    .filter((row) => row?.id)
    .sort((a, b) => {
      if (activeId) {
        if (a.id === activeId && b.id !== activeId) return -1;
        if (b.id === activeId && a.id !== activeId) return 1;
      }
      const ta = historyTimestamp(a.createdAt);
      const tb = historyTimestamp(b.createdAt);
      if (tb !== ta) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    });
}

function historyField(label, value, options = {}) {
  if (value === '' || value == null) return { label, value: '—', accent: !!options.accent };
  return { label, value: String(value), accent: !!options.accent };
}

/** Intake field rows for history cards — grouped layout; omits name, email, newsletter, meal reminders. */
export function programHistoryFieldRows(pkg) {
  const intake = pkg?.intake || {};
  const weight = Number(intake.totalWeight) || 0;
  const lbm = Number(intake.leanBodyMass) || 0;
  const fatPct = Number(intake.fatPercent) || 0;
  const fatLbs = weight > 0 && lbm >= 0 ? weight - lbm : 0;
  const phys = WORK_PHYSICAL.find((w) => w.id === intake.workPhysical);
  const stress = WORK_STRESS.find((w) => w.id === intake.workStress);
  const wakeTime = intake.wakeTime || intake.defaultWakeTime;

  const rows = [
    [
      historyField('Weight', weight > 0 ? Math.round(weight) : null),
      historyField('Lean', lbm > 0 ? lbm.toFixed(1) : null),
      historyField('Fat', fatLbs > 0 ? fatLbs.toFixed(1) : null),
      historyField('Fat %', fatPct > 0 ? fatPct.toFixed(2) : null, { accent: true }),
    ],
    [
      historyField('Gender', intake.sex),
      historyField('Height', heightReadable(intake.heightInches) || null),
      historyField('Age', intake.age > 0 ? intake.age : null),
    ],
    [
      historyField('Workday', phys?.label),
      historyField('Lifestyle', stress?.label),
      historyField('Wake time', wakeTime ? formatWakeDisplay(wakeTime) : null),
    ],
    [
      historyField('Strength', activityHoursReviewLabel(intake.weightTrainingHours, 15)),
      historyField('Cardio', activityHoursReviewLabel(intake.cardioHours, 15)),
      historyField('Fat burning', activityHoursReviewLabel(intake.fatBurningHours, 20)),
    ],
  ];

  return rows;
}

export function summarizeProgram(pkg, { createdAt, id, label } = {}) {
  const intake = pkg?.intake || {};
  const weight = Number(intake.totalWeight) || 0;
  const lbm = Number(intake.leanBodyMass) || 0;
  const fatPct = Number(intake.fatPercent) || 0;
  const fatLbs = weight > 0 && lbm >= 0 ? weight - lbm : 0;
  const testDate = resolveProgramHistoryDateKey(pkg, createdAt);

  return {
    id: id || pkg?.program?.id,
    createdAt: testDate,
    label: label || pkg?.program?.label || 'Diet',
    testDateDisplay: formatTestDate(testDate),
    fieldRows: programHistoryFieldRows(pkg),
    fatPercentDisplay: fatPct ? fatPct.toFixed(2) : '—',
    weightDisplay: weight ? String(Math.round(weight)) : '—',
    leanDisplay: lbm ? lbm.toFixed(1) : '—',
    fatLbsDisplay: fatLbs ? fatLbs.toFixed(1) : '—',
    activity: formatActivityCode(intake),
  };
}
