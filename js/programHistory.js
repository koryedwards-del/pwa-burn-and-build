/** Program history summaries — body composition history table (KWarner-style). */

export function formatActivityCode(intake) {
  if (!intake) return '—';
  const wt = Number(intake.weightTrainingHours) || 0;
  const cardio = Number(intake.cardioHours) || 0;
  const fat = Number(intake.fatBurningHours) || 0;
  return `${wt}/${cardio}/${fat}`;
}

export function formatTestDate(isoOrDate) {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    const m = String(isoOrDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[2]}/${m[3]}/${m[1].slice(2)}`;
    return '—';
  }
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}/${dd}/${yy}`;
}

export function summarizeProgram(pkg, { createdAt, id, label } = {}) {
  const intake = pkg?.intake || {};
  const weight = Number(intake.totalWeight) || 0;
  const lbm = Number(intake.leanBodyMass) || 0;
  const fatPct = Number(intake.fatPercent) || 0;
  const fatLbs = weight > 0 && lbm >= 0 ? weight - lbm : 0;
  const testDate = createdAt || pkg?.program?.issuedAt || pkg?.program?.startDate;

  return {
    id: id || pkg?.program?.id,
    createdAt: testDate,
    label: label || pkg?.program?.label || 'Food Plan',
    testDateDisplay: formatTestDate(testDate),
    fatPercentDisplay: fatPct ? fatPct.toFixed(2) : '—',
    weightDisplay: weight ? String(Math.round(weight)) : '—',
    leanDisplay: lbm ? lbm.toFixed(1) : '—',
    fatLbsDisplay: fatLbs ? fatLbs.toFixed(1) : '—',
    activity: formatActivityCode(intake),
  };
}
