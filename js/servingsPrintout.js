/** Seminar page 5 — Servings grid printout. */

const SLOT_COLUMNS = [
  { key: 'breakfast', label: 'Breakfast', slotLabel: 'Breakfast' },
  { key: 'snack1', label: 'Snack', slotLabel: 'Morning Snack' },
  { key: 'lunch', label: 'Lunch', slotLabel: 'Lunch' },
  { key: 'snack2', label: 'Snack', slotLabel: 'Afternoon Snack' },
  { key: 'dinner', label: 'Dinner', slotLabel: 'Dinner' },
  { key: 'snack3', label: 'Snack', slotLabel: 'Evening Snack' },
];

export function formatServingCell(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  return n.toFixed(1);
}

function slotByLabel(mealSlots, label) {
  return mealSlots?.find((slot) => slot.label === label) || null;
}

export function servingsGridRows(pkg) {
  const servings = pkg?.plan?.servings;
  const mealSlots = pkg?.plan?.mealSlots || [];
  if (!servings) return [];

  const col = (slotLabel, field) => {
    const slot = slotByLabel(mealSlots, slotLabel);
    return slot ? formatServingCell(slot[field]) : '';
  };

  return [
    {
      label: 'Protein',
      daily: formatServingCell(servings.protein),
      breakfast: col('Breakfast', 'proteinServings'),
      snack1: col('Morning Snack', 'proteinServings'),
      lunch: col('Lunch', 'proteinServings'),
      snack2: col('Afternoon Snack', 'proteinServings'),
      dinner: col('Dinner', 'proteinServings'),
      snack3: col('Evening Snack', 'proteinServings'),
    },
    {
      label: 'Grains/Starches',
      daily: formatServingCell(servings.grainsStarches),
      breakfast: col('Breakfast', 'grainStarchServings'),
      snack1: col('Morning Snack', 'grainStarchServings'),
      lunch: col('Lunch', 'grainStarchServings'),
      snack2: col('Afternoon Snack', 'grainStarchServings'),
      dinner: col('Dinner', 'grainStarchServings'),
      snack3: col('Evening Snack', 'grainStarchServings'),
    },
    {
      label: 'Veggies',
      daily: formatServingCell(servings.vegetables),
      breakfast: '',
      snack1: '',
      lunch: '',
      snack2: '',
      dinner: '',
      snack3: '',
    },
    {
      label: 'Fruits',
      daily: formatServingCell(servings.fruits),
      breakfast: col('Breakfast', 'fruitServings'),
      snack1: col('Morning Snack', 'fruitServings'),
      lunch: col('Lunch', 'fruitServings'),
      snack2: col('Afternoon Snack', 'fruitServings'),
      dinner: col('Dinner', 'fruitServings'),
      snack3: col('Evening Snack', 'fruitServings'),
    },
  ];
}

export function extraFatLines(pkg) {
  const servings = pkg?.plan?.servings;
  if (!servings) return [];
  return [
    {
      value: formatServingCell(servings.fatMaintain),
      note: 'To maintain your current fat %',
    },
    {
      value: formatServingCell(servings.fatReduce ?? 0) || '0',
      note: 'To reduce your current fat %',
    },
  ];
}

export { SLOT_COLUMNS };
