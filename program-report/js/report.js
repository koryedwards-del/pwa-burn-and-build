import {
  analyzeLeanBodyMass,
  computeTodayBodyComposition,
} from '../../js/bodyCompositionAnalysis.js';
import { buildProgramPackage } from '../../js/programPackage.js';
import { desirableLeanLine } from '../../js/leanBodyAnalysisPrintout.js';
import {
  eightWeekProjectionFromPackage,
  exerciseHoursSummary,
  formatCalories,
  macroTableRows,
} from '../../js/foodPlanPrintout.js';
import { extraFatLines, servingsGridRows } from '../../js/servingsPrintout.js';

const MEALPLANNER_PROGRAM_KEY = 'bnb_mealplanner_program';

/** Sample intake for design review — seminar-style client (no questionnaire). */
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
  { id: 'lbm', label: 'Lean body analysis', step: 2 },
  { id: 'foodplan', label: 'Food plan', step: 3 },
  { id: 'servings', label: 'Servings', step: 4 },
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
  pkg.intake.thighMm = 25;
  pkg.intake.waistMm = 25;
  pkg.program.issuedAt = '2024-01-15T12:00:00.000Z';
  pkg.program.foodPlanCreatedDate = '2024-01-15';
  return pkg;
}

function wantsPreviewFromUrl() {
  return new URLSearchParams(location.search).has('preview');
}

function initialPageFromUrl() {
  const page = new URLSearchParams(location.search).get('page');
  if (page === '2' || page === 'lbm') return 1;
  if (page === '3' || page === 'food' || page === 'foodplan') return 2;
  if (page === '4' || page === 'servings') return 3;
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

function genderKey(sex) {
  const s = String(sex || '').toLowerCase();
  return s.startsWith('f') ? 'female' : 'male';
}

function formatReportDate(iso) {
  if (!iso) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderNav() {
  const nav = document.getElementById('r-nav-list');
  if (!nav) return;
  nav.innerHTML = PAGES.map((page, index) => `
    <li class="r-nav__item">
      <button
        type="button"
        class="r-nav__btn${index === activePage ? ' is-active' : ''}${page.future ? ' is-future' : ''}"
        data-nav-page="${index}"
        ${page.future ? 'disabled' : ''}
      >${page.step}. ${page.label}</button>
    </li>
  `).join('');
}

function renderPageMeta(pkg) {
  const name = escapeHtml(pkg.intake?.preferredName || 'You');
  const date = escapeHtml(formatReportDate(pkg.program?.issuedAt || pkg.program?.foodPlanCreatedDate));
  return `
    <header class="r-doc__head">
      <p class="r-doc__meta">Prepared for <strong>${name}</strong> · ${date}</p>
    </header>
  `;
}

function renderWelcome(pkg) {
  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Step 1 of 4</p>
        <h2 class="r-panel__title">Welcome</h2>
      </div>

      <article class="r-doc">
        ${renderPageMeta(pkg)}

        <h3>Your program</h3>
        <p>
          This diet is built for you alone. The Burn Engine used your lean body mass, your workday, your lifestyle
          stress, and the exercise you committed to for the next eight weeks. No one else gets these numbers.
        </p>

        <p>
          You just finished the questionnaire. That intake — plus your body composition numbers — is what the
          Burn Engine used to generate this report and the serving targets that follow.
        </p>

        <h3>What&apos;s in this report</h3>
        <ul class="r-doc__list">
          <li><strong>Lean body analysis</strong> — where you are today. Lean mass is the engine; we protect it while fat moves.</li>
          <li><strong>Food plan</strong> — your eight-week projection and daily fuel targets.</li>
          <li><strong>Servings</strong> — daily totals split across breakfast, lunch, dinner, and snacks.</li>
          <li><strong>Meal planner</strong> — build your week using those serving targets.</li>
        </ul>

        <p>
          You do not need to count calories or macros day to day. The servings page is the contract. The meal
          planner is where you turn it into meals and a shopping list.
        </p>
      </article>

      <footer class="r-actions">
        <span class="r-note">Review each section, then open the meal planner.</span>
        <button type="button" class="r-btn r-btn--primary" data-report-next>Lean body analysis →</button>
      </footer>
    </section>
  `;
}

function renderLbmAnalysis(pkg) {
  const intake = pkg.intake;
  const gender = genderKey(intake.sex);
  const today = computeTodayBodyComposition(intake);
  const lbmAnalysis = analyzeLeanBodyMass({
    gender,
    heightInches: intake.heightInches,
    leanBodyMass: intake.leanBodyMass,
  });
  const desirableLine = desirableLeanLine(gender, intake.heightInches);

  const heightIn = Math.round(Number(intake.heightInches) || 0);
  const sex = gender === 'female' ? 'Female' : 'Male';
  const age = intake.age != null ? String(intake.age) : '—';

  const lbmCallout = lbmAnalysis.atOrAbove
    ? `<div class="r-callout">
        <strong>Lean body mass: ${today.leanLbs} lbs.</strong>
        ${desirableLine ? ` ${escapeHtml(desirableLine)}` : ''}
        Your LBM is at or above the desirable amount for your height. Feed your body properly — the food plan
        shows how much you need daily for maximum results.
      </div>`
    : `<div class="r-callout">
        <strong>Lean body mass: ${today.leanLbs} lbs.</strong>
        ${desirableLine ? ` ${escapeHtml(desirableLine)}` : ''}
        This plan is built to protect lean mass while you lose fat.
      </div>`;

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Step 2 of 4</p>
        <h2 class="r-panel__title">Lean body analysis</h2>
        <p class="r-panel__lead">Today&apos;s composition — lean mass drives your metabolic rate and every serving target that follows.</p>
      </div>

      <article class="r-doc">
        ${renderPageMeta(pkg)}

        <h3>Today</h3>
        <p class="r-doc__stats-line">
          Height: ${heightIn} in · Sex: ${sex} · Age: ${age}
        </p>

        <p class="r-doc__today-label">Composition</p>
        <p class="r-doc__today-row">Lean ${today.leanPct}% · ${today.leanLbs} lbs</p>
        <p class="r-doc__today-row">Fat ${today.fatPct}% · ${today.fatLbs} lbs</p>
        <p class="r-doc__today-row">Total ${today.totalLbs} lbs</p>

        ${lbmCallout}

        <p>
          How you look in the mirror is the real judge of whether you want to lose fat. If you do, follow this
          plan as closely as you can — the next page shows what you can lose in eight weeks while keeping your
          strength and energy.
        </p>

        <p class="r-note">
          Re-check body composition every 6–8 weeks to confirm you are losing fat, not lean.
        </p>
      </article>

      <footer class="r-actions">
        <button type="button" class="r-btn r-btn--ghost" data-report-back>← Welcome</button>
        <button type="button" class="r-btn r-btn--primary" data-report-next-food>Food plan →</button>
      </footer>
    </section>
  `;
}

function renderFoodPlan(pkg) {
  const intake = pkg.intake;
  const today = computeTodayBodyComposition(intake);
  const projection = eightWeekProjectionFromPackage(pkg);
  const hours = exerciseHoursSummary(intake);
  const macroRows = macroTableRows(pkg.plan?.formula, intake.workIntensity);

  const fatLost = projection ? projection.fatLostLbs.toFixed(1) : '—';
  const weekly = projection ? projection.weeklyFatLossLbs.toFixed(1) : '—';
  const goalLeanPct = projection ? `${projection.endLeanPct.toFixed(2)}%` : '—';
  const goalLeanLbs = projection ? `${projection.leanLbs.toFixed(1)} lbs` : '—';
  const goalFatPct = projection ? `${projection.endBf.toFixed(2)}%` : '—';
  const goalFatLbs = projection ? `${projection.endFatLbs.toFixed(1)} lbs` : '—';
  const goalTotalPct = '100.00%';
  const goalTotalLbs = projection ? `${projection.endWeight.toFixed(1)} lbs` : '—';

  const macroBody = macroRows.map((row) => {
    if (row.spacer) {
      return '<tr class="r-macro-spacer"><td colspan="8"></td></tr>';
    }
    return `
      <tr>
        <th scope="row" class="r-macro-label">${escapeHtml(row.label)}</th>
        <td>${row.proteinG}</td>
        <td>${formatCalories(row.proteinCal)}</td>
        <td>${row.carbsG}</td>
        <td>${formatCalories(row.carbsCal)}</td>
        <td>${row.fatsG}</td>
        <td>${formatCalories(row.fatsCal)}</td>
        <td>${formatCalories(row.totalCal)}</td>
      </tr>`;
  }).join('');

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Step 3 of 4</p>
        <h2 class="r-panel__title">Food plan</h2>
        <p class="r-panel__lead">Your eight-week projection and the daily fuel the Burn Engine calculated from your intake.</p>
      </div>

      <article class="r-doc">
        ${renderPageMeta(pkg)}

        <div class="r-callout">
          <p class="r-hero-stat">In eight weeks you could lose ${fatLost} lbs of fat</p>
          <p>About ${weekly} lbs per week on average — while protecting lean mass and keeping your strength and energy up.</p>
        </div>

        <p>
          This plan is based on your lean body mass and the exercise you committed to in the questionnaire:
          ${hours.total} hour(s) per week total (${hours.wt} weight training, ${hours.cardio} cardio, ${hours.fatBurn} fat-burn).
        </p>

        <table class="r-goal-table" aria-label="Today and eight week goal">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Today</th>
              <th scope="col"></th>
              <th scope="col">Eight-week goal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" class="r-goal-row-label">Lean</th>
              <td>${today.leanPct}% · ${today.leanLbs} lbs</td>
              <td></td>
              <td>${goalLeanPct} · ${goalLeanLbs}</td>
            </tr>
            <tr>
              <th scope="row" class="r-goal-row-label">Fat</th>
              <td>${today.fatPct}% · ${today.fatLbs} lbs</td>
              <td class="r-goal-fat-loss">−${fatLost} lbs fat</td>
              <td>${goalFatPct} · ${goalFatLbs}</td>
            </tr>
            <tr>
              <th scope="row" class="r-goal-row-label">Total</th>
              <td>${today.totalLbs} lbs</td>
              <td></td>
              <td>${goalTotalPct} · ${goalTotalLbs}</td>
            </tr>
          </tbody>
        </table>

        <details class="r-details">
          <summary>Daily calories &amp; macros (reference)</summary>
          <p class="r-note" style="margin: 12px 0;">
            You do not need to track these day to day — the servings page is what you follow. This table shows
            how the Burn Engine derived your targets (RMR, workday, and per-hour exercise).
          </p>
          <table class="r-macro-table" aria-label="Daily macro and calorie requirements">
            <thead>
              <tr>
                <th scope="col" rowspan="2"></th>
                <th scope="colgroup" colspan="2">Protein</th>
                <th scope="colgroup" colspan="2">Carbs</th>
                <th scope="colgroup" colspan="2">Fats</th>
                <th scope="colgroup" rowspan="2">Total</th>
              </tr>
              <tr>
                <th scope="col">g</th>
                <th scope="col">cal</th>
                <th scope="col">g</th>
                <th scope="col">cal</th>
                <th scope="col">g</th>
                <th scope="col">cal</th>
                <th scope="col">cal</th>
              </tr>
            </thead>
            <tbody>
              ${macroBody}
            </tbody>
          </table>
        </details>
      </article>

      <footer class="r-actions">
        <button type="button" class="r-btn r-btn--ghost" data-report-back-lbm>← Lean body analysis</button>
        <button type="button" class="r-btn r-btn--primary" data-report-next-servings>Servings →</button>
      </footer>
    </section>
  `;
}

function renderServings(pkg) {
  const intake = pkg.intake;
  const gridRows = servingsGridRows(pkg);
  const extraFats = extraFatLines(pkg);

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
      <th scope="row" class="r-servings-label">Extra fats</th>
      <td>${escapeHtml(line.value)}</td>
      <td colspan="6">${escapeHtml(line.note)}</td>
    </tr>
  `).join('');

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Step 4 of 4</p>
        <h2 class="r-panel__title">Servings</h2>
        <p class="r-panel__lead">Your daily contract — split across meals. The meal planner uses these targets to build your week.</p>
      </div>

      <article class="r-doc">
        ${renderPageMeta(pkg)}

        <p class="r-doc__note">
          Consult your physician before starting this plan or changing how you eat.
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

        <p>
          Hit these serving counts each day for maximum strength and energy while losing fat. Next, open the
          meal planner to turn this grid into meals, snacks, and a grocery list.
        </p>
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
      ? renderLbmAnalysis(programPackage)
      : activePage === 2
        ? renderFoodPlan(programPackage)
        : renderServings(programPackage);
}

function showPage(index) {
  activePage = Math.max(0, Math.min(index, 3));
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
    if (event.target.closest('[data-report-next-food]')) {
      showPage(2);
      return;
    }
    if (event.target.closest('[data-report-next-servings]')) {
      showPage(3);
      return;
    }
    if (event.target.closest('[data-report-back-food]')) {
      showPage(2);
      return;
    }
    if (event.target.closest('[data-report-back-lbm]')) {
      showPage(1);
      return;
    }
    if (event.target.closest('[data-report-back]')) {
      showPage(0);
    }
  });
}

function init() {
  programPackage = loadProgramPackage();

  if (!programPackage?.intake?.leanBodyMass && wantsPreviewFromUrl()) {
    programPackage = buildPreviewProgram();
    persistProgram(programPackage);
  }

  if (programPackage?.intake?.leanBodyMass) {
    activePage = initialPageFromUrl();
  }
  renderNav();
  renderPage();
  bindEvents();
}

init();
