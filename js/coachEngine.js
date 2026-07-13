/** Coach Kory — 56-day Eat to Lose Fat best-of series (8-week program). */

export const COACH_PROGRAM_DAYS = 56;

const COACH_DAYS = [
  {
    title: 'Your playbook',
    text: 'Open your custom diet. Three meals, three snacks — that\'s your game plan. The Burn Engine already calculated your numbers from your lean body mass, job, life, and activity. No guessing. We start with the schedule.',
  },
  {
    title: 'The canoe',
    text: 'SUV on the roof: you need strength to lift it, energy to paddle, and you want to look good doing it. Busy mom, weekend warrior, desk job — same three wants. Athletes eat for this. So will you.',
  },
  {
    title: 'Feet on the floor',
    text: 'Breakfast within 30 minutes of waking. Champions don\'t "wait until hungry." Fasted isn\'t discipline — it\'s an empty tank before the day starts.',
  },
  {
    title: 'Every 2–3 hours',
    text: 'You were born eating every 2–3 hours. Kids still do. The lean coworker who looks great? Always eating. Hunger on the clock is normal.',
  },
  {
    title: 'No 7 PM cutoff',
    text: 'Kids don\'t stop getting hungry at 7. Neither do you. Eat every 2–3 hours from wake-up until your head hits the pillow — or you\'ll meet the vending machine.',
  },
  {
    title: 'One-day prep',
    text: 'Eight weeks = 56 single days. Win today. Not "forever." Not "perfect." Today\'s meals only.',
  },
  {
    title: 'Week 1 film',
    text: 'Score the week: How many days did you hit 6 eating times? 5+ = you\'re eating like an athlete on the clock.',
  },
  {
    title: 'Protein = rebuild',
    text: 'Protein repairs and replaces muscle, bone, skin, hormones — your lean body. Athletes prioritize it. Every meal.',
  },
  {
    title: 'Carbs = gas',
    text: 'Carbohydrates are fast energy. They fuel your day and help protect muscle. This isn\'t a no-carb contest.',
  },
  {
    title: 'The roster',
    text: 'Preferred list: lean proteins, whole grains, vegetables, whole fresh fruit. People who win long-term eat the same clean foods repeatedly.',
  },
  {
    title: 'One apple',
    text: 'Start simple: one apple in a bag, graze until it\'s gone. One fruit snack down. Small rep, big habit.',
  },
  {
    title: 'Three fruits',
    text: 'Three whole-fruit snacks daily. No juice. No dried fruit. Liquid sugar is a different game — we\'ll talk later.',
  },
  {
    title: 'Rip the page',
    text: 'College football player: "Will this help me play better?" No? Then I don\'t need it. Sugar, extra fat, alcohol — off the roster for max results.',
  },
  {
    title: 'Week 2 film',
    text: 'Three whole-fruit snacks — how many days? Athletes fuel between sessions. You\'re fueling between meals.',
  },
  {
    title: 'Your engine',
    text: 'Lean body mass is everything that isn\'t fat — muscle, bone, organs. It\'s your engine. Bigger engine, more fuel. That\'s why your plan isn\'t generic.',
  },
  {
    title: 'Stop starving',
    text: 'Skipping food to get lean is how people get fatter. Hunger → cravings → binge. Athletes eat enough to perform. Undereating is the trap.',
  },
  {
    title: 'No two alike',
    text: 'Your protein, grains, and fat servings come from YOU — LBM, job, stress, exercise. One-size diets fit someone in the middle. You\'re not middle.',
  },
  {
    title: 'Grams win',
    text: '134 g beef. 216 g beans. Put a plate on the scale. Cook it, weigh it, eat it. Done. No math in your head — athletes measure.',
  },
  {
    title: 'Get it in',
    text: 'Seminar truth: people who got all their food in beat the hard exerciser who didn\'t. Eating your lunch beats skipping it for a walk. Best: eat, then walk.',
  },
  {
    title: 'The 300-lb lesson',
    text: 'Big active people often carry huge lean mass — calves don\'t lie. They need lots of food. Hiding food or skipping meals sabotages fat loss. Eat like your engine requires.',
  },
  {
    title: 'Week 3 film',
    text: 'Did you hit your meal servings most days? Volume is the piece most people miss. Athletes don\'t underfuel.',
  },
  {
    title: 'Pocket money',
    text: 'You owe $295 and it\'s in your pocket. Would you drive to the ATM? Your body won\'t dig into stored fat if butter, oil, cheese, or sugar is already on the plate.',
  },
  {
    title: 'Your tsp budget',
    text: 'Your plan shows how many teaspoons of fat your body burns daily. That\'s your cut budget. Unused budget comes off your body.',
  },
  {
    title: 'Butter on bread',
    text: 'Diet fat burns first. Body fat waits. Every day you decide: diet fat or body fat?',
  },
  {
    title: 'Sugar lane',
    text: 'Diabetic shock gets sugar — usually juice. Liquid hits fast. Sugar belongs in the same lane as extra fat when you\'re cutting.',
  },
  {
    title: 'Alcohol',
    text: 'Liquid calories, no nutrition, no place in a max-results 8 weeks. Athletes in prep don\'t drink their calories.',
  },
  {
    title: 'Salt check',
    text: 'Love chips and cheese? Try unsalted once. If you don\'t crave it, you might want salt, not fat. Sprinkle salt on bread instead of butter — test it.',
  },
  {
    title: 'PRO TIP',
    text: 'You can\'t speed this up. You can slow it down. Extra fat, sugar, alcohol = slower cut. Stay inside your budget.',
  },
  {
    title: 'Wrong scoreboard',
    text: 'Ten pounds "weight loss" is often 3 fat, 7 lean. You get smaller and softer — not what athletes want.',
  },
  {
    title: 'Three-pound can',
    text: 'Imagine a 3-lb Crisco can of fat off your body. Scale barely moves. Clothes fit different. That\'s real fat loss.',
  },
  {
    title: 'Mirror judges',
    text: 'She didn\'t ask the mirror her weight. Successful people let clothes and mirror decide — not the scale.',
  },
  {
    title: 'Keep the muscle',
    text: 'Shoot for 100% fat loss while holding or building lean. That\'s the fastest way to look firm and trim — not smaller-flabbier.',
  },
  {
    title: 'Scale lies',
    text: 'Gaining 5 lb of muscle is 5 lb on the scale — and you look better. Lean up while fat drops and the scale confuses you. Normal.',
  },
  {
    title: 'CEO warning',
    text: 'Starve + mega-exercise and your body breaks down muscle for fuel — then slams the brakes. Plateau isn\'t failure. It\'s biology protecting you.',
  },
  {
    title: 'Week 5 film',
    text: 'Energy up or steady? Clothes? Mirror? That\'s your score — not the scale alone.',
  },
  {
    title: 'Diet first',
    text: 'People in wheelchairs control weight with food. Exercise helps — but diet drives fat loss. No guilt for missed workouts if food is in.',
  },
  {
    title: 'Eaters win',
    text: 'Ten employees, eight weeks later: nine "lazy" eaters lost more fat than the one who crushed exercise but skipped meals. Food in wins.',
  },
  {
    title: '80 / 20',
    text: 'Even bodybuilders say the look is 80% food, 20% training. Stop dieting. Start eating for your plan.',
  },
  {
    title: '200-mile dentist',
    text: 'Biked 200 miles weekends, ran 8 miles daily — still 26% fat. Food for his volume unlocked abs. You can\'t out-train a bad plan.',
  },
  {
    title: 'Walk after dinner',
    text: 'Easy walk burns fat differently than killer elliptical. Low intensity after dinner is an athlete\'s fat-burning tool.',
  },
  {
    title: 'Lunch then walk',
    text: 'Better than walk instead of lunch: eat your lunch, then walk. Fuel, then move.',
  },
  {
    title: 'Week 6 film',
    text: 'Food in before exercise guilt? That\'s the athlete order.',
  },
  {
    title: 'Halfway',
    text: 'You\'re in the back half of prep. Athletes don\'t quit at halftime.',
  },
  {
    title: 'Why this works',
    text: 'Protein rebuilds lean. Carbs fuel and protect muscle. Your body burns fat servings daily to balance the equation. Dialed in, that comes off you.',
  },
  {
    title: 'The math',
    text: 'Those tsp you don\'t eat as fat, sugar, or alcohol add up to your 8-week fat-loss projection. Your numbers, not a generic chart.',
  },
  {
    title: 'Lean may rise',
    text: 'Muscle up, fat down — scale stuck, mirror better. Winning prep looks like that.',
  },
  {
    title: 'Adjust early',
    text: 'Clothes snug? Pull diet fat back a few days — like an athlete tweaking before photos. Don\'t wait.',
  },
  {
    title: 'Crisco pile',
    text: 'Picture fat coming off in cans. You\'re not chasing "weight." You\'re stripping fat.',
  },
  {
    title: 'Week 7 film',
    text: 'Open Why This Works and your timeline. Where are you headed if you keep choosing body fat?',
  },
  {
    title: 'Maintenance secret',
    text: 'Whatever method you use to lose fat is what you must live to keep it. Learn to eat to lose fat — not to "finish a diet."',
  },
  {
    title: 'One day forever',
    text: 'Forever is built one day at a time. Athletes don\'t "go back to normal." This is normal.',
  },
  {
    title: 'Model the lean',
    text: 'Watch people who look great year-round. Good choices. Eat often. Eat a lot — of the right food. Simple.',
  },
  {
    title: 'Grocery once',
    text: 'Shop the list. Execute the week. Athletes meal-prep. So do you.',
  },
  {
    title: 'Six stages',
    text: 'Diet is only 1/6 of nutrition — digestion, absorption, circulation, cells, elimination matter too. But diet is the part you control daily.',
  },
  {
    title: 'Check-in soon',
    text: 'Body comp changed? Time for a fresh Burn Engine plan. Athletes periodize. Your next 8 weeks starts with new numbers.',
  },
  {
    title: 'Graduation',
    text: 'Strength. Energy. Look good doing it. You ate to lose fat like an athlete — to the best of your ability. Canoe\'s on the roof. Go paddle.',
  },
];

function clampProgramDay(dayNumber) {
  const day = Math.floor(Number(dayNumber) || 1);
  return Math.max(1, Math.min(day, COACH_PROGRAM_DAYS));
}

/** @returns {{ dayNumber: number, title: string, cards: Array<{ dayNumber: number, title: string, text: string, image?: string }> } | null} */
export function getCoachDay(dayNumber) {
  const day = clampProgramDay(dayNumber);
  const entry = COACH_DAYS[day - 1];
  if (!entry) return null;
  const text = `${entry.text}\n\n— Coach Kory`;
  return {
    dayNumber: day,
    title: entry.title,
    cards: [{
      dayNumber: day,
      title: entry.title,
      text,
    }],
  };
}

export function normalizeCoachProgress(raw) {
  if (!raw || typeof raw !== 'object') return { lastViewedDay: 0 };
  if (raw.lastViewedDay != null) return { lastViewedDay: Math.max(0, Number(raw.lastViewedDay) || 0) };
  if (raw.day1Complete) return { lastViewedDay: 1 };
  return { lastViewedDay: 0 };
}
