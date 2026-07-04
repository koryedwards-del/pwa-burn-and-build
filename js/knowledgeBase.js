/** Knowledge base — expanded from Eat to Lose Fat teaching, Coach Kory cards, and seminar content. */

import { parseQuoteBy, renderTestimonyBlock } from './testimonyBlock.js';

export const KB_ARTICLES = [
  {
    id: 'lean-body-mass',
    title: 'Lean Body Mass',
    category: 'Fundamentals',
    summary: 'Your muscle tissue is your fat burner. Learn why lean body mass drives every serving target in your program.',
    sections: [
      {
        heading: 'What is lean body mass?',
        paragraphs: [
          'Lean body mass is everything in your body that is not fat — muscle, bone, organs, and water. Muscle tissue burns calories all day, even when you are sitting, sleeping, or at your desk.',
          'Two people can weigh the same and lose fat at completely different rates. The person with more lean body mass has a higher daily burn rate. That is why accuracy matters when you enter your weight and body fat percentage during program creation.',
        ],
      },
      {
        heading: 'Why the Burn Engine starts here',
        paragraphs: [
          'The Burn Engine does not guess. It calculates your daily food targets from your lean body mass, your job, your lifestyle stress, and the exercise you commit to for the next 8 weeks.',
          'Your entire program — protein servings, grains and starches, fruits, vegetables, and your daily fat budget — flows from this number.',
        ],
        bullets: [
          'Weight alone is not enough — body fat percentage determines how much of you is muscle vs. fat.',
          'Weigh in the morning, after the bathroom, before eating, for the most accurate starting point.',
          'Resistance exercise during your program helps preserve and build lean body mass while you lose fat.',
        ],
      },
    ],
    quote: {
      text: 'Your lean body mass is your fat burner. More muscle burns more fat — all day long.',
      by: 'Coach Kory',
    },
  },
  {
    id: 'protein',
    title: 'Protein',
    category: 'Macronutrients',
    summary: 'Why protein servings are split across three meals and how gram weights keep portions exact.',
    sections: [
      {
        heading: 'Protein protects muscle while you lose fat',
        paragraphs: [
          'Protein preserves lean body mass while you lose fat. Without adequate protein, your body can break down muscle for energy — and that slows fat loss.',
          'Burn & Build distributes your protein servings across breakfast, lunch, and dinner. Each meal gets an exact serving count calculated for your body — not a generic recommendation.',
        ],
      },
      {
        heading: 'No math required',
        paragraphs: [
          'When you open breakfast in the app, you see your protein serving count — for example, 4.3 servings. Every food in the drop-down list is pre-calculated to hit that number in grams.',
          '134 g of 95% lean ground beef is 4.3 servings. 113 g of chicken breast with no skin is 4.3 servings. Put a plate on your scale, cook your food, weigh it, and you are done.',
        ],
        bullets: [
          'Protein at breakfast, lunch, and dinner.',
          'Gram weights eliminate guessing — a small kitchen scale is all you need.',
          '278 curated foods from the USDA database, selected for fat loss and muscle preservation.',
        ],
      },
    ],
  },
  {
    id: 'carbohydrates',
    title: 'Carbohydrates',
    category: 'Macronutrients',
    summary: 'Grains and starches fuel your day; fresh fruit keeps your metabolism engaged between meals.',
    sections: [
      {
        heading: 'Grains and starches at every meal',
        paragraphs: [
          'Carbohydrates in Burn & Build come primarily from grains and starches — timed at breakfast, lunch, and dinner alongside protein.',
          'Your serving count is calculated from your lean body mass and activity level. The goal is enough fuel to perform without excess that gets stored as fat.',
          'If you were having black beans at lunch, 3.7 servings might be 216 g on your plate. That is on the scale. Done.',
        ],
      },
      {
        heading: 'Fresh fruit at every snack',
        paragraphs: [
          'Morning snack, afternoon snack, and evening snack are all whole fresh fruit — no dried fruit, no juice.',
          'Each snack gets an exact fruit serving count, and every fruit in the list is measured to match. Apples, apricots, bananas, blackberries — all scaled to your targets.',
          'Fresh fruit at each snack provides controlled carbohydrates and keeps your fat burners working every 2–3 hours.',
        ],
      },
    ],
  },
  {
    id: 'fat',
    title: 'Fat',
    category: 'Macronutrients',
    summary: 'The number that controls fat loss — your daily fat serving budget.',
    sections: [
      {
        heading: 'Your daily fat budget',
        paragraphs: [
          'Every day your body burns a specific amount of fat. The Burn Engine calculates that number and gives it to you as fat servings — your daily budget.',
          'If you burn 28 servings of fat per day and you do not add any extra fats, your body will burn 28 teaspoons of fat off your body. That is fat loss.',
          'If you eat 28 servings of fat in a day, your body will burn the diet fat you ate — or sugar or alcohol — and leave the body fat alone.',
        ],
      },
      {
        heading: 'Fat points in the app',
        paragraphs: [
          'The app tracks your fat servings as fat points throughout the day. Stay under your number and you lose fat. Hit it exactly and you maintain. Go over it and you are burning what you ate instead of what you are carrying.',
          'Extra fats include cooking oils, butter, nuts, desserts, sugar, and alcohol. If you want to lose fat as fast as possible, stay as far away from your maximum fat servings as you can.',
        ],
        bullets: [
          'Stay under your fat budget → body burns stored fat.',
          'Hit your fat budget exactly → maintenance.',
          'Go over your fat budget → body burns what you ate, not what you are carrying.',
        ],
      },
    ],
    quote: {
      text: 'This is the basic principle behind why the Burn & Build program is so effective for losing fat.',
      by: 'Coach Kory',
    },
  },
  {
    id: 'metabolism',
    title: 'Metabolism',
    category: 'Fundamentals',
    summary: 'How your job, stress level, and exercise schedule shape your daily burn rate.',
    sections: [
      {
        heading: 'Metabolism is not one-size-fits-all',
        paragraphs: [
          'Your daily calorie burn depends on lean body mass, physical job demands, lifestyle stress, and structured exercise. A warehouse worker and a desk worker with the same weight get different serving targets.',
          'Burn & Build accounts for all four factors during program creation. Your work intensity is calculated from how physical your job is and how stressful your day feels.',
        ],
        bullets: [
          'Mostly sitting vs. on your feet vs. carrying and lifting vs. heavy physical labor.',
          'Comfortable pace vs. busy vs. high-pressure stressful days.',
          'Weight training, cardio, and fat-burning activity hours per week.',
        ],
      },
      {
        heading: 'Eat on time',
        paragraphs: [
          'Eating on time — every 2–3 hours — keeps your metabolism engaged throughout the day instead of slowing between large meals.',
          'Your meal timing is designed to maximize strength, energy, and fat loss. Turn on reminders and your phone keeps you on track from wake-up through evening snack.',
        ],
      },
    ],
  },
  {
    id: 'calories',
    title: 'Calories',
    category: 'Fundamentals',
    summary: 'Why Burn & Build focuses on servings instead of counting calories.',
    sections: [
      {
        heading: 'Servings, not calorie counting',
        paragraphs: [
          'Calorie counting alone misses the point. What matters is whether your body is burning stored fat or the fat you just ate.',
          'Your program gives you serving targets for protein, grains and starches, fruits, vegetables, and fat. Together they add up to the right energy balance for your body — without you tracking a single calorie.',
        ],
      },
      {
        heading: 'Maintain vs. reduce',
        paragraphs: [
          'The Burn Engine calculates two energy levels: a maintenance total and a reduction total. Your fat serving budget is the lever that determines whether you are losing fat or maintaining.',
          'The app tracks fat servings precisely because that is the number that controls whether you lose fat, maintain, or gain.',
        ],
      },
    ],
  },
  {
    id: 'meal-prep',
    title: 'Meal Prep',
    category: 'Implementation',
    summary: 'Three meals, three snacks, exact gram weights — a simple daily structure scaled to your body.',
    sections: [
      {
        heading: 'The daily structure',
        paragraphs: [
          'Burn & Build uses a simple daily structure: protein and grains/starches at breakfast, lunch, and dinner. Fresh fruit at each snack. Vegetables at dinner.',
          'This program is very simple to do. Protein, grains and starches for breakfast. Protein, grains and starches for lunch. Protein, grains and starches for dinner. And fruit snacks in between. That is it.',
        ],
      },
      {
        heading: 'Shop once, prep with a scale',
        paragraphs: [
          'Your grocery list is generated from your food plan. Every item, every amount, organized by category. Walk in, buy it, done.',
          'Prep portions using the gram weights shown in the app. Put a plate on your scale, cook your food, weigh it to your serving target, and eat on schedule.',
          'Most people start their program on a Monday with groceries done, kitchen ready, and mindset set.',
        ],
        bullets: [
          'Grocery list builds automatically from your daily food selections.',
          'Gram weights mean no measuring cups or guesswork.',
          'Food prep ideas in the app keep your plan on track during a busy week.',
        ],
      },
    ],
  },
  {
    id: 'recipes',
    title: 'Recipes',
    category: 'Implementation',
    summary: 'Meals built around your plan\'s food groups — delicious, on-plan, and already scaled to your servings.',
    sections: [
      {
        heading: 'A serving system, not a recipe app',
        paragraphs: [
          'Burn & Build is not a recipe app. It is a serving system. You choose foods from your personalized list and combine them into meals that hit your targets.',
          'Each food entry shows gram weight per serving. A breakfast might be eggs, toast, and fruit — each portion measured to your exact protein, grain, and fruit servings.',
        ],
      },
      {
        heading: 'Meals that stay on plan',
        paragraphs: [
          'Recipes in the app are built around your plan\'s food groups. Delicious, on-plan options that keep things fresh without throwing off your macros.',
          'Over time you learn your go-to combinations. The structure stays the same; the foods rotate based on what you enjoy.',
          'Every tip, note, and insight from 40+ years of coaching is built into the app — the details that turn good results into great ones.',
        ],
      },
    ],
  },
  {
    id: 'resistance-exercise',
    title: 'Resistance Exercise',
    category: 'Exercise',
    summary: 'Why weight training protects lean body mass and shapes your personalized serving targets.',
    sections: [
      {
        heading: 'Build and preserve muscle',
        paragraphs: [
          'Resistance exercise builds and preserves lean body mass — your primary fat-burning tissue. It is a core input during program creation.',
          'Your committed weight training hours per week directly affect your serving targets. More training means your body needs more fuel to recover and grow.',
        ],
      },
      {
        heading: 'Three categories of activity',
        paragraphs: [
          'Burn & Build tracks three types of exercise separately: weight training, cardiovascular training, and fat-burning activity. Each contributes to your personalized plan in a specific way.',
          'Your age is used to calculate personal fat-burning (60–70% max heart rate) and cardio training (70–85% max heart rate) zones during onboarding.',
        ],
        bullets: [
          'Weight training — builds and preserves lean body mass.',
          'Cardio — cardiovascular fitness at 70–85% of max heart rate.',
          'Fat-burning activity — steady movement at 60–70% of max heart rate.',
        ],
      },
    ],
  },
  {
    id: 'eating-on-schedule',
    title: 'Eating on Schedule',
    category: 'Implementation',
    summary: 'Three meals and three snacks, timed from your wake-up — every 2–3 hours keeps fat burners working.',
    sections: [
      {
        heading: 'Your day, mapped out',
        paragraphs: [
          'When you create your program, you set your wake time. The app builds your meal schedule from there — breakfast at wake-up, then snacks and meals every few hours through evening snack.',
          'For probably the first time, you have a truly accurate food plan to follow. No guessing. Every meal and snack has exact serving targets.',
        ],
      },
      {
        heading: 'Reminders keep you honest',
        paragraphs: [
          'Turn on meal reminders during onboarding and your phone nudges you when it is time to eat. Consistency is what separates people who get results from people who wonder why the plan is not working.',
          'Eat on time. Every 2–3 hours keeps your fat burners working.',
        ],
      },
    ],
    quote: {
      text: "I'll check in tomorrow and we'll talk about how to use the grocery list.",
      by: 'Coach Kory, Day 1',
    },
  },
  {
    id: 'eight-week-cycle',
    title: 'The 8-Week Cycle',
    category: 'Getting Started',
    summary: 'Why 8 weeks, what to expect, and when to build your next program.',
    sections: [
      {
        heading: 'Why 8 weeks?',
        paragraphs: [
          'An 8-week program is not arbitrary. It gives your body time to adapt, your habits time to stick, and your results time to show up on the scale and in the mirror.',
          'Day 1 unlocks Coach Kory\'s daily messages and starts your 56-day program clock in the app.',
        ],
      },
      {
        heading: 'When the cycle ends',
        paragraphs: [
          'When the 8 weeks are done — or when your body composition changes significantly — you come back to the website for a new personalized program. That is by design.',
          'Your body changes. Your job might change. Your exercise commitment might change. Each new cycle recalibrates your serving targets to match who you are now.',
        ],
      },
    ],
    quote: {
      text: 'At 67, I am confident I can maintain and even build muscle and lose fat.',
      by: 'Linda Kay, client since 1992',
    },
  },
  {
    id: 'faq',
    title: 'FAQ',
    category: 'Getting Started',
    summary: 'Common questions about Burn & Build, the program creator, and the app.',
    sections: [
      {
        heading: 'About the system',
        paragraphs: [
          'How is Burn & Build different from other diets? It calculates your exact serving targets from your body composition, job, stress, and exercise — not generic calorie ranges. More than 30,000 people — athletes, homemakers, teenagers, seniors — from 500 pounds to 100 pounds. One system. Every body.',
        ],
      },
      {
        heading: 'Website, program creator, and app',
        paragraphs: [
          'What happens on the website? Teaching, intake, and the Burn Engine — the same role the live seminar played for decades. You learn, explore, and create your personalized program here.',
          'Do I need the app? The app is your daily coach — food plan, logging, grocery list, and messages from Coach Kory. The website creates your program; the app executes it.',
          'Can I revisit the knowledge base? Yes. The website is always available for deeper teaching. The app stays focused on doing the work every day.',
        ],
        bullets: [
          'Website → learn, explore, create your program.',
          'Program Creator → intake questionnaire and Burn Engine calculation.',
          'App → daily food plan, logging, groceries, coaching.',
        ],
      },
    ],
  },
];

function articleText(article) {
  const parts = [article.summary];
  if (article.body) parts.push(...article.body);
  if (article.sections) {
    article.sections.forEach((s) => {
      if (s.heading) parts.push(s.heading);
      if (s.paragraphs) parts.push(...s.paragraphs);
      if (s.bullets) parts.push(...s.bullets);
    });
  }
  if (article.quote) parts.push(article.quote.text, article.quote.by);
  return parts.join(' ');
}

export function searchArticles(query) {
  const q = query.trim().toLowerCase();
  if (!q) return KB_ARTICLES;
  return KB_ARTICLES.filter((a) =>
    a.title.toLowerCase().includes(q)
    || a.category.toLowerCase().includes(q)
    || articleText(a).toLowerCase().includes(q)
  );
}

export function getArticle(id) {
  return KB_ARTICLES.find((a) => a.id === id) || null;
}

export function renderArticleBody(article) {
  if (article.sections) {
    return article.sections.map((s) => `
      ${s.heading ? `<h4 class="kb-section-heading">${s.heading}</h4>` : ''}
      ${(s.paragraphs || []).map((p) => `<p>${p}</p>`).join('')}
      ${s.bullets ? `<ul class="kb-bullets">${s.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
    `).join('');
  }
  return (article.body || []).map((p) => `<p>${p}</p>`).join('');
}

export function renderArticleQuote(article) {
  if (!article.quote) return '';
  const { name, meta } = parseQuoteBy(article.quote.by);
  return renderTestimonyBlock({
    quote: article.quote.text,
    name,
    meta,
    className: 'kb-article-quote',
  });
}
