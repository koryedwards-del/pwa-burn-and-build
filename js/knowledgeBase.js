/** Knowledge base articles — expandable from Eat to Lose Fat book content. */

export const KB_ARTICLES = [
  {
    id: 'lean-body-mass',
    title: 'Lean Body Mass',
    category: 'Fundamentals',
    summary: 'Your muscle tissue is your fat burner. Learn why lean body mass drives every serving target in your program.',
    body: [
      'Lean body mass is everything in your body that is not fat — muscle, bone, organs, and water. Muscle tissue burns calories all day, even when you are sitting, sleeping, or at your desk.',
      'Two people can weigh the same and lose fat at completely different rates. The person with more lean body mass has a higher daily burn rate.',
      'The Burn Engine calculates your daily food targets from your lean body mass, your job, your lifestyle stress, and the exercise you commit to for the next 8 weeks. It does not guess.',
    ],
  },
  {
    id: 'protein',
    title: 'Protein',
    category: 'Macronutrients',
    summary: 'Why protein servings are split across three meals and how gram weights keep portions exact.',
    body: [
      'Protein preserves lean body mass while you lose fat. Without adequate protein, your body can break down muscle for energy — and that slows fat loss.',
      'Burn & Build distributes your protein servings across breakfast, lunch, and dinner. Each meal gets an exact serving count calculated for your body.',
      'The app shows gram weights for every protein food in your list, scaled to your exact serving targets. You do not do the math.',
    ],
  },
  {
    id: 'carbohydrates',
    title: 'Carbohydrates',
    category: 'Macronutrients',
    summary: 'Grains and starches fuel your day without spiking insulin or leaving you hungry.',
    body: [
      'Carbohydrates in Burn & Build come primarily from grains and starches — timed at breakfast, lunch, and dinner alongside protein.',
      'Your serving count is calculated from your lean body mass and activity level. The goal is enough fuel to perform without excess that gets stored as fat.',
      'Fresh fruit at each snack provides additional carbohydrates in controlled portions, keeping your fat burners working every 2–3 hours.',
    ],
  },
  {
    id: 'fat',
    title: 'Fat',
    category: 'Macronutrients',
    summary: 'The number that controls fat loss — your daily fat serving budget.',
    body: [
      'Every day your body burns a specific amount of fat. The Burn Engine calculates that number and gives it to you as fat servings — your daily budget.',
      'Stay under that number and your body burns stored body fat. Hit it exactly and you maintain. Go over it and you are burning what you ate instead of what you are carrying.',
      'This is the basic principle behind why Burn & Build works when cookie-cutter diets fail.',
    ],
  },
  {
    id: 'metabolism',
    title: 'Metabolism',
    category: 'Fundamentals',
    summary: 'How your job, stress level, and exercise schedule shape your daily burn rate.',
    body: [
      'Metabolism is not fixed. Your daily calorie burn depends on lean body mass, physical job demands, lifestyle stress, and structured exercise.',
      'Burn & Build accounts for all four factors during program creation. A warehouse worker and a desk worker with the same weight get different serving targets.',
      'Eating on time — every 2–3 hours — keeps your metabolism engaged throughout the day instead of slowing between large meals.',
    ],
  },
  {
    id: 'calories',
    title: 'Calories',
    category: 'Fundamentals',
    summary: 'Why Burn & Build focuses on servings instead of counting calories.',
    body: [
      'Calorie counting alone misses the point. What matters is whether your body is burning stored fat or the fat you just ate.',
      'Your program gives you serving targets for protein, grains and starches, fruits, vegetables, and fat. Together they add up to the right energy balance for your body.',
      'The app tracks fat servings precisely because that is the lever that controls whether you lose fat, maintain, or gain.',
    ],
  },
  {
    id: 'meal-prep',
    title: 'Meal Prep',
    category: 'Implementation',
    summary: 'Simple structure for three meals and three snacks — scaled to your exact targets.',
    body: [
      'Burn & Build uses a simple daily structure: protein and grains/starches at breakfast, lunch, and dinner. Fresh fruit at each snack. Vegetables at dinner.',
      'Your grocery list is generated from your food plan. Shop once, prep portions using the gram weights shown in the app, and eat on schedule.',
      'Most people start their program on a Monday with groceries done, kitchen ready, and mindset set.',
    ],
  },
  {
    id: 'recipes',
    title: 'Recipes',
    category: 'Implementation',
    summary: 'Build meals from your food list — every ingredient already scaled to your servings.',
    body: [
      'Burn & Build is not a recipe app. It is a serving system. You choose foods from your personalized list and combine them into meals that hit your targets.',
      'Each food entry shows gram weight per serving. A breakfast might be eggs, toast, and fruit — each portion measured to your exact protein, grain, and fruit servings.',
      'Over time you learn your go-to combinations. The structure stays the same; the foods rotate based on what you enjoy.',
    ],
  },
  {
    id: 'resistance-exercise',
    title: 'Resistance Exercise',
    category: 'Exercise',
    summary: 'Why weight training protects lean body mass and accelerates fat loss.',
    body: [
      'Resistance exercise builds and preserves lean body mass — your primary fat-burning tissue. It is a core input during program creation.',
      'Your committed weight training hours per week directly affect your serving targets. More training means your body needs more fuel to recover and grow.',
      'Cardio and fat-burning activity are tracked separately. Each type of exercise contributes to your personalized plan in a specific way.',
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    category: 'Getting Started',
    summary: 'Common questions about Burn & Build, the program creator, and the app.',
    body: [
      'How is Burn & Build different from other diets? It calculates your exact serving targets from your body composition, job, stress, and exercise — not generic calorie ranges.',
      'What is the 8-week program? An 8-week cycle gives your body time to adapt, your habits time to stick, and your results time to show. When it ends, you create a new program based on your updated body composition.',
      'Do I need the app? The app is your daily coach — food plan, logging, grocery list, and messages from Coach Kory. The website creates your program; the app executes it.',
      'Can I revisit the knowledge base? Yes. The website is always available for deeper teaching. The app stays focused on doing the work every day.',
    ],
  },
];

export function searchArticles(query) {
  const q = query.trim().toLowerCase();
  if (!q) return KB_ARTICLES;
  return KB_ARTICLES.filter((a) =>
    a.title.toLowerCase().includes(q)
    || a.category.toLowerCase().includes(q)
    || a.summary.toLowerCase().includes(q)
    || a.body.some((p) => p.toLowerCase().includes(q))
  );
}

export function getArticle(id) {
  return KB_ARTICLES.find((a) => a.id === id) || null;
}
