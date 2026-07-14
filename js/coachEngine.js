/** Coach Kory — daily messages keyed to program day (56-day ETLF knowledge base). */

import { getCoachPlanDay } from './coachKoryPlan.js';

/**
 * Week 1 display copy — three flowing sentences per day.
 * Source: ETLF 56-day plan, Week 1 — The Athlete Schedule (TIMING).
 */
const WEEK_ONE_DISPLAY = {
  1:
    'Open your custom diet — three meals and three snacks are your game plan for the day, and that structure is where everything starts. The Burn Engine already calculated your numbers from your lean body mass, your job, your life, and your activity, so there is no guessing and no generic template. This week we focus on the schedule: athletes eat on purpose, you are on an eight-week prep, and the job today is to win today.',
  2:
    'Picture the canoe on the roof: you need strength to lift it, energy to paddle all day, and you want to look good doing it — those are the three things everyone actually wants from this program. Whether you are a busy parent, a weekend warrior, or sitting at a desk all week, the wants are the same, and athletes eat with exactly those goals in mind. This is not a different game for you — it is the same game, played the athlete way.',
  3:
    'Put your feet on the floor and eat breakfast within thirty minutes of waking, because champions do not wait until they feel hungry before they fuel up. Running on empty in the morning is not discipline — it is starting the day with your tank near empty before life asks anything of you. Your custom diet gives you that first meal; use it, and you set the clock for everything that follows.',
  4:
    'You were born eating every two to three hours, and kids still live that way — hunger on a regular clock is normal, not a character flaw. Watch the lean person at work who always looks great: they are usually eating often, not white-knuckling through the afternoon. Your plan spaces six eating times across the day for exactly that reason — feed the schedule, and the schedule feeds your strength and energy.',
  5:
    'Kids do not stop getting hungry at seven in the evening, and neither do you — there is no magic cutoff where your body stops needing fuel. Eat every two to three hours from wake-up until your head hits the pillow, because that is how you stay ahead of hunger instead of behind it. Miss that evening snack and you are not being tough — you are betting on the vending machine, and the vending machine always wins.',
  6:
    'Your eight-week program is fifty-six single days, not one impossible leap, so the only day that matters right now is today. Win today: hit your six eating times with the foods on your plan, and leave tomorrow for tomorrow. Athletes do not eat perfectly forever — they execute today\'s rep, and that is the whole prep in miniature.',
  7:
    'Time for the week-one film review: look back and count how many days you hit all six eating times on schedule. Five or more days means you are eating like an athlete on the clock, and that is the foundation everything else in this program is built on. Missed a few? No lecture — week two starts with the same schedule, and you already know what to do.\n\n— Coach Kory',
};

const DAY_IMAGES = {
  1: 'img/coach/card-1.png',
  2: 'img/coach/card-2.png',
  3: 'img/coach/card-3.png',
  4: 'img/coach/card-4.png',
  5: 'img/coach/card-5.png',
  6: 'img/coach/card-6.png',
  7: 'img/coach/card-7.png',
};

const DEFAULT_IMAGE = 'img/brand/bnb-logo.png';

export function getCoachDay(dayNumber) {
  const plan = getCoachPlanDay(dayNumber);
  if (!plan) return null;

  const text = WEEK_ONE_DISPLAY[dayNumber] || plan.message;
  const image = DAY_IMAGES[dayNumber] || DEFAULT_IMAGE;

  return {
    dayNumber: plan.day,
    week: plan.week,
    weekTitle: plan.weekTitle,
    title: plan.title,
    cards: [
      {
        dayNumber: plan.day,
        title: plan.title,
        image,
        text,
      },
    ],
  };
}
