/** Coach Kory — daily app tips keyed to program day (week one). */

const WEEK_ONE = [
  {
    dayNumber: 1,
    title: 'Your Custom Diet',
    image: 'img/coach/card-1.png',
    text:
      'When you open Your Custom Diet, you will see three meals and three fruit snacks for the day — breakfast, lunch, dinner, and morning, afternoon, and evening snacks. Tap any meal to see your targets for protein, grains and starches, and optional extra fats; those numbers came from your intake and the Burn Engine, so they belong to you, not a generic template. Each food in the list shows the gram weight that matches your serving count, so put that amount on your scale and you are done without doing any math yourself.',
  },
  {
    dayNumber: 2,
    title: 'Your Grocery List',
    image: 'img/coach/card-2.png',
    text:
      'Your Grocery List is built from what you have logged over the last seven days, so the foods you actually eat begin appearing automatically as you use the diet screen. Check items off while you shop, and use the add button for anything else you need — the list is meant to support your plan, not become a separate project. The more consistently you log, the more useful this page becomes, so even imperfect logging in your first week pays off quickly.',
  },
  {
    dayNumber: 3,
    title: 'Logging Your Meals',
    image: 'img/coach/card-3.png',
    text:
      'Logging is straightforward: when you eat something, tap it in the meal where it belongs and the app records it for that day. You do not need a perfect log every time — what matters is building the habit of tapping foods so your grocery list and your sense of the plan stay tied to real meals. Mark a meal complete when you have eaten what you planned, and come back later if you need to add or change something.',
  },
  {
    dayNumber: 4,
    title: 'Fat Servings',
    image: 'img/coach/card-5.png',
    text:
      'At the bottom of your diet screen you will see fat points — your daily fat budget, or the number of fat servings your body can burn in a day. Extra fats, desserts, sugar, and alcohol all draw from that same pool, so the less you use, the more your body pulls from stored fat. You do not need to hit zero to lose fat; staying well under your maximum is what keeps the program working in your favor.',
  },
  {
    dayNumber: 5,
    title: 'Meal Timing',
    image: 'img/coach/card-4.png',
    text:
      'Your meal times are spaced from the wake time you set in Settings, so when you change wake time, breakfast, lunch, dinner, and your snacks shift with it. Eating roughly every two to three hours keeps your metabolism steady through the day, which is why the schedule matters as much as the portions. Open Settings from the gear icon on the home screen whenever your routine changes — update wake time once and the app handles the rest.',
  },
  {
    dayNumber: 6,
    title: 'Weigh in Grams',
    image: 'img/coach/card-6.png',
    text:
      'Everything in the app is in grams because a small kitchen scale is more accurate than eyeballing portions, and after a few days it becomes faster than guessing. Cook your food, place it on the scale, and serve the gram amount shown next to the food you chose — the app has already converted your servings into that weight. A steady weighing habit is one of the biggest differences between people who get results and people who slowly drift off plan.',
  },
  {
    dayNumber: 7,
    title: 'End of Week One',
    image: 'img/coach/card-7.png',
    text:
      'You have made it through week one, and by now the rhythm should feel familiar: protein and grains at your three meals, fruit at your snacks, log what you eat, and let the grocery list follow. You do not need perfection — you need repetition, showing up each day and using the tools until they feel automatic. Head into week two with the same structure; the program works when you work the program.\n\n— Coach Kory',
  },
];

export function getCoachDay(dayNumber) {
  const entry = WEEK_ONE.find((d) => d.dayNumber === dayNumber);
  if (!entry) return null;
  return {
    dayNumber: entry.dayNumber,
    title: entry.title,
    cards: [
      {
        dayNumber: entry.dayNumber,
        title: entry.title,
        image: entry.image,
        text: entry.text,
      },
    ],
  };
}
