import { computeTodayBodyComposition } from '../../js/bodyCompositionAnalysis.js';
import { buildProgramPackage } from '../../js/programPackage.js';
import { computePlan } from '../../js/burnEngine.js';
import {
  eightWeekProjectionFromPackage,
  exerciseHoursSummary,
  formatCalories,
  macroTableRows,
  projectionTimelineFromPackage,
} from '../../js/foodPlanPrintout.js';
import { extraFatLines, servingsGridRows } from '../../js/servingsPrintout.js';

const MEALPLANNER_PROGRAM_KEY = 'bnb_mealplanner_program';

/** Kristi Warner seminar printout — LBM 113.7, work 1.5a, 3 wt / 3 fat-burn. */
const PREVIEW_FORM = {
  preferredName: 'Kristi',
  email: 'preview@example.com',
  sex: 'female',
  heightFeet: '5',
  heightInchesPart: '6',
  age: 28,
  weightText: '184',
  fatPercentText: '38.22',
  fatSource: 'recent',
  workPhysical: 'sitting',
  workStress: 'comfortable',
  weightTrainingHours: 3,
  cardioHours: 0,
  fatBurningHours: 3,
  wakeTime: '06:00',
  remindersEnabled: false,
  newsletterOptIn: false,
  lowActivities: [],
};

const PAGES = [
  { id: 'welcome', label: 'Welcome', step: 1 },
  { id: 'foodplan', label: 'Food plan', step: 2 },
  { id: 'servings', label: 'Servings', step: 3 },
  { id: 'menuplanner', label: 'Menu planner', step: 4, href: '../mealplanner/' },
];

let activePage = 0;
let programPackage = null;

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadProgramPackage() {
  try {
    const raw = sessionStorage.getItem(MEALPLANNER_PROGRAM_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildPreviewProgram() {
  const pkg = buildProgramPackage(PREVIEW_FORM, {
    label: '8-Week Burn & Build Program',
    meta: { source: 'program-report-preview' },
  });
  pkg.intake.preferredName = 'Kristi Warner';
  pkg.intake.leanBodyMass = 113.7;
  pkg.intake.workIntensity = 1.5;
  pkg.intake.workPhysical = 'sitting';
  pkg.intake.workStress = 'comfortable';
  pkg.intake.thighMm = 25;
  pkg.intake.waistMm = 25;
  pkg.program.issuedAt = '2024-01-15T12:00:00.000Z';
  pkg.program.foodPlanCreatedDate = '2024-01-15';

  const plan = computePlan({
    lbm: pkg.intake.leanBodyMass,
    intensity: pkg.intake.workIntensity,
    weightTrainingHours: pkg.intake.weightTrainingHours,
    cardioHours: pkg.intake.cardioHours,
    fatBurningHours: pkg.intake.fatBurningHours,
  });
  pkg.plan = {
    ...pkg.plan,
    servings: plan.servings,
    summary: {
      maintainTotalCals: plan.maintainTotalCals,
      reduceTotalCals: plan.reduceTotalCals,
      maintainProteinGrams: plan.maintainProteinGrams,
      reduceFatGrams: plan.reduceFatGrams,
      maintainFatCalories: plan.maintainFatCalories,
      reduceFatCalories: plan.reduceFatCalories,
      weeklyFatLossPounds: plan.weeklyFatLossPounds,
    },
    formula: plan.formula,
  };

  return pkg;
}

function wantsPreviewFromUrl() {
  return new URLSearchParams(location.search).has('preview');
}

function initialPageFromUrl() {
  const page = new URLSearchParams(location.search).get('page');
  if (page === '2' || page === 'food' || page === 'foodplan' || page === 'lbm') return 1;
  if (page === '3' || page === '4' || page === 'servings') return 2;
  return 0;
}

function persistProgram(pkg) {
  sessionStorage.setItem(MEALPLANNER_PROGRAM_KEY, JSON.stringify(pkg));
}

function loadPreviewProgram() {
  programPackage = buildPreviewProgram();
  persistProgram(programPackage);
  showPage(initialPageFromUrl());
}

function formatReportDate(iso) {
  if (!iso) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatReportDateShort(iso) {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function renderNav() {
  const nav = document.getElementById('r-nav-list');
  if (!nav) return;
  nav.innerHTML = PAGES.map((page, index) => {
    if (page.href) {
      return `
    <li class="r-nav__item">
      <a class="r-nav__btn" href="${page.href}">${page.step}. ${page.label}</a>
    </li>`;
    }
    return `
    <li class="r-nav__item">
      <button
        type="button"
        class="r-nav__btn${index === activePage ? ' is-active' : ''}${page.future ? ' is-future' : ''}"
        data-nav-page="${index}"
        ${page.future ? 'disabled' : ''}
      >${page.step}. ${page.label}</button>
    </li>`;
  }).join('');
}

function renderWelcome(pkg) {
  const name = escapeHtml(pkg.intake?.preferredName || 'you');
  const date = escapeHtml(formatReportDate(pkg.program?.issuedAt));

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Page 1</p>
        <h2 class="r-panel__title">Welcome</h2>
      </div>

      <article class="r-doc">
        <header class="r-doc__head">
          <p class="r-doc__meta">
            Prepared exclusively for: <strong>${name}</strong><br />
            On: <strong>${date}</strong>
          </p>
        </header>

        <h3>Welcome</h3>
        <p>
          Congratulations! You have in your hands the most advanced diet available anywhere, at any price. It is
          the most individualized program available for losing fat. This diet will not work effectively for anyone
          else because it has been created just for you, using your LBM, your job, your lifestyle and your daily
          plan for exercise &amp; activities.
        </p>

        <p>
          How we did it. We determined your lean weight using sophisticated body composition testing. Then you
          told us about your job, lifestyle, exercise and activities. With this information, the computer generated
          this five-page report. Included is your ultrasound body composition report that I call your Lean Body
          Analysis, your body composition history and the last two pages are your custom designed diet.
        </p>

        <h3>Food Plan</h3>
        <p>
          Page two is your custom-designed diet. How much food you need each day depends on how much LBM
          you have, your job, lifestyle and the type and amount of exercise you participate in. Based on the
          information you provide, this diet gives you the amount of protein, carbohydrates and fat you need per
          day to lose fat. It also tells you how much fat you can lose in eight weeks — and projects where you
          can go over time. And it shows you what your body requires at rest (your resting metabolic rate), for
          your workday and for one hour of each type of exercise.
        </p>

        <h3>Servings</h3>
        <p>
          Page three is the servings page. No need to count calories or macros in this diet. The computer breaks
          down all the information from the table on page two and shows you the number of servings you need
          daily to have maximum strength &amp; energy and to lose fat as fast as possible.
        </p>

        <h3>Menu Planner</h3>
        <p>
          After your servings page, the Menu Planner is where you build your week. Choose meals for breakfast,
          lunch, dinner, and snacks that hit your daily serving targets — and get your grocery list.
        </p>
      </article>

      <footer class="r-actions">
        <span class="r-note">Three-page program report — then menu planner.</span>
        <button type="button" class="r-btn r-btn--primary" data-report-next>Food plan →</button>
      </footer>
    </section>
  `;
}

function projectionTimelineRows(timeline) {
  if (!timeline?.valid || !timeline.rows?.length) return '';
  return timeline.rows.map((row) => `
    <tr class="${row.isCurrent ? 'r-projection-current' : ''}">
      <td class="r-table-label">${escapeHtml(row.timeline)}</td>
      <td class="r-table-num">${escapeHtml(row.bodyFatDisplay)}${row.badge ? ` <span class="r-projection-badge">${escapeHtml(row.badge)}</span>` : ''}</td>
      <td class="r-table-num">${escapeHtml(row.weightDisplay)}</td>
    </tr>
  `).join('');
}

function renderFoodPlan(pkg) {
  const intake = pkg.intake;
  const today = computeTodayBodyComposition(intake);
  const projection = eightWeekProjectionFromPackage(pkg);
  const timeline = projectionTimelineFromPackage(pkg);
  const hours = exerciseHoursSummary(intake);
  const macroRows = macroTableRows(pkg.plan?.formula, intake.workIntensity);

  const name = escapeHtml((intake.preferredName || 'You').toUpperCase());
  const date = escapeHtml(formatReportDateShort(pkg.program?.issuedAt || pkg.program?.foodPlanCreatedDate));

  const fatLost = projection ? projection.fatLostLbs.toFixed(1) : '—';
  const weekly = projection ? projection.weeklyFatLossLbs.toFixed(1) : '—';
  const goalLeanPct = projection ? `${projection.endLeanPct.toFixed(2)}%` : '—';
  const goalLeanLbs = projection ? `${projection.leanLbs.toFixed(1)} lbs.` : '—';
  const goalFatPct = projection ? `${projection.endBf.toFixed(2)}%` : '—';
  const goalFatLbs = projection ? `${projection.endFatLbs.toFixed(1)} lbs.` : '—';
  const goalTotalPct = '100.00%';
  const goalTotalLbs = projection ? `${projection.endWeight.toFixed(1)} lbs.` : '—';

  const timelineBody = projectionTimelineRows(timeline);

  const macroBody = macroRows.map((row) => {
    if (row.spacer) {
      return '<tr class="r-macro-spacer"><td colspan="8"></td></tr>';
    }
    return `
      <tr>
        <th scope="row" class="r-macro-label r-table-label">${escapeHtml(row.label)}</th>
        <td class="r-table-num">${row.proteinG}</td>
        <td class="r-table-num">${formatCalories(row.proteinCal)}</td>
        <td class="r-table-num">${row.carbsG}</td>
        <td class="r-table-num">${formatCalories(row.carbsCal)}</td>
        <td class="r-table-num">${row.fatsG}</td>
        <td class="r-table-num">${formatCalories(row.fatsCal)}</td>
        <td class="r-table-num">${formatCalories(row.totalCal)}</td>
      </tr>`;
  }).join('');

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Page 2</p>
        <h2 class="r-panel__title">Food plan</h2>
      </div>

      <article class="r-doc">
        <header class="r-doc__head">
          <p class="r-doc__meta">
            Prepared exclusively for: <strong>${name}</strong> On: <strong>${date}</strong>
          </p>
        </header>

        <h3>Food Plan</h3>
        <p>
          The following food program contains a sophisticated calculation that is based on your individual lean
          body mass (LBM), and on your activities. This is the most individualized food program available for
          losing fat and building muscle. In eight weeks, you could safely lose ${fatLost} pounds of fat. In your
          questionnaire, you indicated you plan to exercise a total of ${hours.total} hour(s) per week.
          ${hours.wt} hour(s) of weight training, ${hours.cardio} hour(s) of cardiovascular activities,
          ${hours.fatBurn} hour(s) of fat-burning activities
        </p>

        <table class="r-goal-table" aria-label="Today and eight week goal">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="colgroup" colspan="2">TODAY</th>
              <th scope="col"></th>
              <th scope="colgroup" colspan="2">EIGHT WEEK GOAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" class="r-goal-row-label">LEAN</th>
              <td class="r-goal-num">${today.leanPct}%</td>
              <td class="r-goal-num">${today.leanLbs} lbs.</td>
              <td></td>
              <td class="r-goal-num">${goalLeanPct}</td>
              <td class="r-goal-num">${goalLeanLbs}</td>
            </tr>
            <tr>
              <th scope="row" class="r-goal-row-label">FAT</th>
              <td class="r-goal-num">${today.fatPct}%</td>
              <td class="r-goal-num">${today.fatLbs} lbs.</td>
              <td class="r-goal-fat-loss">−${fatLost} lbs. of fat</td>
              <td class="r-goal-num">${goalFatPct}</td>
              <td class="r-goal-num">${goalFatLbs}</td>
            </tr>
            <tr>
              <th scope="row" class="r-goal-row-label">TOTAL</th>
              <td class="r-goal-num">${today.totalPct}%</td>
              <td class="r-goal-num">${today.totalLbs} lbs.</td>
              <td></td>
              <td class="r-goal-num">${goalTotalPct}</td>
              <td class="r-goal-num">${goalTotalLbs}</td>
            </tr>
          </tbody>
        </table>

        <p>
          You project to lose an average of ${weekly} pounds of fat per week. In addition, you could gain lean weight.
          Gaining lean weight will increase your strength and energy and offset your fat loss.
        </p>

        ${timelineBody ? `
        <table class="r-projection-table r-report-table" aria-label="Body fat and weight projection timeline">
          <colgroup>
            <col class="r-col-label" />
            <col class="r-col-num" />
            <col class="r-col-num" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Timeline</th>
              <th scope="col">Body Fat %</th>
              <th scope="col">Bodyweight</th>
            </tr>
          </thead>
          <tbody>
            ${timelineBody}
          </tbody>
        </table>
        ` : ''}

        <p>
          How much food you need each day depends on how much LBM you have. Also, it depends on your
          activity level and the type and amount of exercise you participate in. Based on the information you
          provided, the following table gives you the number of calories and the amount of protein, carbohydrates
          and fat you need per day to maintain your fat or to reduce body fat. Also listed is what your body
          requires at rest (your resting metabolic rate), for your workday and for one hour of each type of exercise.
        </p>

        <table class="r-macro-table r-report-table" aria-label="Daily macro and calorie requirements">
          <colgroup>
            <col class="r-col-label" />
            <col class="r-col-num" span="7" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" rowspan="2"></th>
              <th scope="colgroup" colspan="2">PROTEIN</th>
              <th scope="colgroup" colspan="2">CARBS</th>
              <th scope="colgroup" colspan="2">FATS</th>
              <th scope="colgroup" rowspan="2" class="r-macro-total-head">TOTAL<br /><span class="r-macro-th-sub">calories</span></th>
            </tr>
            <tr>
              <th scope="col">grams</th>
              <th scope="col">calories</th>
              <th scope="col">grams</th>
              <th scope="col">calories</th>
              <th scope="col">grams</th>
              <th scope="col">calories</th>
            </tr>
          </thead>
          <tbody>
            ${macroBody}
          </tbody>
        </table>
      </article>

      <footer class="r-actions">
        <button type="button" class="r-btn r-btn--ghost" data-report-back>← Welcome</button>
        <button type="button" class="r-btn r-btn--primary" data-report-next-servings>Servings →</button>
      </footer>
    </section>
  `;
}

function renderServings(pkg) {
  const intake = pkg.intake;
  const gridRows = servingsGridRows(pkg);
  const extraFats = extraFatLines(pkg);

  const name = escapeHtml((intake.preferredName || 'You').toUpperCase());
  const date = escapeHtml(formatReportDateShort(pkg.program?.issuedAt || pkg.program?.foodPlanCreatedDate));

  const gridBody = gridRows.map((row) => `
    <tr>
      <th scope="row" class="r-servings-label">${escapeHtml(row.label)}</th>
      <td>${row.daily}</td>
      <td>${row.breakfast}</td>
      <td>${row.snack1}</td>
      <td>${row.lunch}</td>
      <td>${row.snack2}</td>
      <td>${row.dinner}</td>
      <td>${row.snack3}</td>
    </tr>
  `).join('');

  const extraBody = extraFats.map((line) => `
    <tr>
      <th scope="row" class="r-servings-label">Extra Fats</th>
      <td>${escapeHtml(line.value)}</td>
      <td colspan="6">${escapeHtml(line.note)}</td>
    </tr>
  `).join('');

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Page 3</p>
        <h2 class="r-panel__title">Servings</h2>
      </div>

      <article class="r-doc">
        <header class="r-doc__head">
          <p class="r-doc__meta">
            Prepared exclusively for: <strong>${name}</strong> On: <strong>${date}</strong>
          </p>
        </header>

        <h3>Servings</h3>
        <p class="r-doc__note">
          NOTE: Always consult your physician before starting this plan or making any change in your eating
          habits.
        </p>

        <table class="r-servings-table" aria-label="Daily servings by meal">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Daily</th>
              <th scope="col">Breakfast</th>
              <th scope="col">Snack</th>
              <th scope="col">Lunch</th>
              <th scope="col">Snack</th>
              <th scope="col">Dinner</th>
              <th scope="col">Snack</th>
            </tr>
          </thead>
          <tbody>
            ${gridBody}
            ${extraBody}
          </tbody>
        </table>
      </article>

      <footer class="r-actions">
        <button type="button" class="r-btn r-btn--ghost" data-report-back-food>← Food plan</button>
        <a class="r-btn r-btn--primary" href="../mealplanner/">Continue to meal planner →</a>
      </footer>
    </section>
  `;
}

function renderMissingProgram() {
  return `
    <div class="r-empty">
      <p>No program in this browser session yet.</p>
      <p class="r-note" style="margin-bottom:20px;">Preview the report with sample data, or complete intake to build yours.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button type="button" class="r-btn r-btn--primary" data-report-preview>Preview sample report →</button>
        <a class="r-btn r-btn--ghost" href="../questionnaire/">Questionnaire</a>
      </div>
    </div>
  `;
}

function renderPage() {
  const main = document.getElementById('r-main');
  if (!main) return;

  if (!programPackage?.intake?.leanBodyMass) {
    main.innerHTML = renderMissingProgram();
    return;
  }

  main.innerHTML = activePage === 0
    ? renderWelcome(programPackage)
    : activePage === 1
      ? renderFoodPlan(programPackage)
      : renderServings(programPackage);
}

function showPage(index) {
  activePage = Math.max(0, Math.min(index, 2));
  renderNav();
  renderPage();
}

function bindEvents() {
  document.getElementById('r-nav-list')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-nav-page]');
    if (!btn || btn.disabled) return;
    showPage(Number(btn.dataset.navPage));
  });

  document.getElementById('r-main')?.addEventListener('click', (event) => {
    if (event.target.closest('[data-report-preview]')) {
      loadPreviewProgram();
      return;
    }
    if (event.target.closest('[data-report-next]')) {
      showPage(1);
      return;
    }
    if (event.target.closest('[data-report-next-servings]')) {
      showPage(2);
      return;
    }
    if (event.target.closest('[data-report-back-food]')) {
      showPage(1);
      return;
    }
    if (event.target.closest('[data-report-back]')) {
      showPage(0);
    }
  });
}

function init() {
  if (wantsPreviewFromUrl()) {
    programPackage = buildPreviewProgram();
    persistProgram(programPackage);
  } else {
    programPackage = loadProgramPackage();
  }

  if (programPackage?.intake?.leanBodyMass) {
    activePage = initialPageFromUrl();
  }
  renderNav();
  renderPage();
  bindEvents();
}

init();
