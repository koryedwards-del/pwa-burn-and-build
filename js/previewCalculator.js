/** "What's Possible" timeline — constant lean body mass, ~3% BF/month (6% per 8 weeks). */

const TARGET_BF = { male: 4.68, female: 8.95 };
const DROP_PER_CYCLE = 6;
const WEEKS_PER_CYCLE = 8;

function aceBadge(bf, gender, isFloor) {
  if (isFloor) return { label: 'Showtime', cls: 'showtime' };
  if (gender === 'male' && bf <= 24 && bf > 13) return { label: 'Average', cls: 'average' };
  if (gender === 'female' && bf <= 31 && bf > 20) return { label: 'Average', cls: 'average' };
  return null;
}

export function computeWhatsPossible({ gender, weightLbs, bodyFatPercent }) {
  const weight = Number(weightLbs);
  const bf = Number(bodyFatPercent);
  const g = gender === 'female' ? 'female' : 'male';
  const targetBf = TARGET_BF[g];

  if (!weight || weight <= 0 || !bf || bf <= targetBf || bf > 70) {
    return {
      valid: false,
      error: `Enter a valid weight and body fat % above ${targetBf}%.`,
    };
  }

  const lbm = weight * (1 - bf / 100);
  const finalWeight = lbm / (1 - targetBf / 100);

  const fullCycles = Math.floor((bf - targetBf) / DROP_PER_CYCLE);
  const remainder = (bf - targetBf) % DROP_PER_CYCLE;
  const partialWeeks = remainder > 0 ? (remainder / DROP_PER_CYCLE) * WEEKS_PER_CYCLE : 0;
  const totalWeeks = fullCycles * WEEKS_PER_CYCLE + partialWeeks;
  const wholeWeeks = Math.round(totalWeeks);
  const timeStr = `${wholeWeeks} weeks`;

  const narrative = `<strong>Pro Tip:</strong> Transforming your body is a balance of lean body mass (muscle shape) and how much body fat is covering it up. Based on your current weight and body fat, Burn &amp; Build can take you from <strong>${weight.toFixed(0)} lbs at ${bf.toFixed(0)}%</strong> to <strong>${finalWeight.toFixed(1)} lbs at ${targetBf}%</strong> in <strong>${timeStr}</strong> — while increasing your strength and energy. If the projected body weight at your desired body fat seems too low, it means you need more muscle. Participate in weight training and follow your personalized Burn &amp; Build program for fastest results.`;

  const rows = [];
  const shownBadges = {};
  let curBf = bf;
  let cycleWeeks = 0;

  rows.push({
    timeline: 'Current',
    bodyFat: bf,
    bodyFatDisplay: `${bf.toFixed(2)}%`,
    weight: weight,
    weightDisplay: `${weight.toFixed(0)} lbs`,
    isCurrent: true,
    badge: null,
  });

  while (curBf > targetBf) {
    let newBf = curBf - DROP_PER_CYCLE;
    let isFloor = false;
    let isPartial = false;
    if (newBf <= targetBf) {
      newBf = targetBf;
      isFloor = true;
    }
    if (isFloor && remainder > 0) isPartial = true;

    const newWeight = lbm / (1 - newBf / 100);
    const badge = aceBadge(newBf, g, isFloor);
    let badgeLabel = null;
    if (badge && !shownBadges[badge.label]) {
      shownBadges[badge.label] = true;
      badgeLabel = badge.label;
    }

    if (isPartial) {
      cycleWeeks += partialWeeks;
      rows.push({
        timeline: `${Math.round(cycleWeeks)} weeks`,
        bodyFat: targetBf,
        bodyFatDisplay: `${targetBf.toFixed(2)}%`,
        weight: newWeight,
        weightDisplay: `${newWeight.toFixed(1)} lbs`,
        isCurrent: false,
        badge: badgeLabel,
      });
    } else {
      cycleWeeks += WEEKS_PER_CYCLE;
      rows.push({
        timeline: `${cycleWeeks} weeks`,
        bodyFat: newBf,
        bodyFatDisplay: `${newBf.toFixed(2)}%`,
        weight: newWeight,
        weightDisplay: `${newWeight.toFixed(1)} lbs`,
        isCurrent: false,
        badge: badgeLabel,
      });
    }

    curBf = newBf;
  }

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
