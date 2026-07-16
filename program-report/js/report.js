import {
  analyzeLeanBodyMass,
  computeTodayBodyComposition,
} from '../../js/bodyCompositionAnalysis.js';
import { buildProgramPackage } from '../../js/programPackage.js';
import {
  aceRangeHeaders,
  aceVerdictSentence,
  desirableLeanLine,
  lbmCongratulationsLine,
  weightGoalBandsByLbm,
} from '../../js/leanBodyAnalysisPrintout.js';
import {
  eightWeekProjectionFromPackage,
  exerciseHoursSummary,
  formatCalories,
  macroTableRows,
} from '../../js/foodPlanPrintout.js';

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
  { id: 'servings', label: 'Servings', step: 4, future: true },
];

let activePage = 0;
let programPackage = null;
let usingPreview = false;

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
  return 0;
}

function persistProgram(pkg) {
  sessionStorage.setItem(MEALPLANNER_PROGRAM_KEY, JSON.stringify(pkg));
}

function loadPreviewProgram() {
  programPackage = buildPreviewProgram();
  usingPreview = true;
  persistProgram(programPackage);
  renderPreparedLine(programPackage);
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

function formatReportDateShort(iso) {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
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

function renderPreparedLine(pkg) {
  const el = document.getElementById('r-prepared');
  if (!el || !pkg) return;
  const name = pkg.intake?.preferredName || 'You';
  const date = formatReportDate(pkg.program?.issuedAt || pkg.program?.foodPlanCreatedDate);
  const previewNote = usingPreview ? ' · Sample program' : '';
  el.textContent = `Prepared exclusively for ${name} · ${date}${previewNote}`;
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

        <h3>Lean Body Analysis</h3>
        <p>
          Page two is the results of your body composition test. Although very few people want to know how fat
          they are, all of them want to how to lose fat. Our Lean Body Analysis page includes a breakdown of
          your current body composition with an emphasis on the good stuff. LBM (lean body mass) is used by
          the computer to calculate your metabolic rate (RMR). In addition, the Lean Body Analysis projects
          appropriate weight goals based on your current lean body mass.
        </p>

        <h3>History</h3>
        <p>
          Page three is a record of your body composition history with me. Having a history of body compositions
          can give you valuable information about how your eating habits are affecting your weight loss. That&apos;s
          why I recommend having your body composition checked every 6-8 weeks. I call it a check-in.
        </p>

        <h3>Food Plan</h3>
        <p>
          Page four is your custom-designed diet. How much food you need each day depends on how much LBM
          you have, your job, lifestyle and the type and amount of exercise you participate in. Based on the
          information you provide, this diet gives you the amount of protein, carbohydrates and fat you need per
          day to lose fat. It also tells you how much fat you can lose in eight weeks. And it shows you what your
          body requires at rest (your resting metabolic rate), for your workday and for one hour of each type of
          exercise.
        </p>

        <h3>Servings</h3>
        <p>
          Page five is the servings page. No need to count calories or macros in this diet. The computer breaks
          down all the information from the table on page four and shows you the number of servings you need
          daily to have maximum strength &amp; energy and to lose fat as fast as possible.
        </p>
      </article>

      <footer class="r-actions">
        <span class="r-note">Servings page coming next.</span>
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
  const aceHeaders = aceRangeHeaders(gender);
  const weightBands = weightGoalBandsByLbm(gender, intake.leanBodyMass);
  const desirableLine = desirableLeanLine(gender, intake.heightInches);
  const congratsLine = lbmCongratulationsLine(lbmAnalysis.atOrAbove);
  const aceVerdict = aceVerdictSentence(gender, intake.fatPercent);

  const name = escapeHtml((intake.preferredName || 'You').toUpperCase());
  const date = escapeHtml(formatReportDateShort(pkg.program?.issuedAt || pkg.program?.foodPlanCreatedDate));
  const heightIn = Math.round(Number(intake.heightInches) || 0);
  const sex = gender === 'female' ? 'FEMALE' : 'MALE';
  const thigh = intake.thighMm != null ? `${intake.thighMm} mm` : '— mm';
  const waist = intake.waistMm != null ? `${intake.waistMm} mm` : '— mm';
  const age = intake.age != null ? `${intake.age} years of experience` : '— years of experience';

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Page 2</p>
        <h2 class="r-panel__title">Lean body analysis</h2>
      </div>

      <article class="r-doc">
        <header class="r-doc__head">
          <p class="r-doc__meta">
            Prepared exclusively for: <strong>${name}</strong> On: <strong>${date}</strong>
          </p>
        </header>

        <h3>Lean Body Analysis</h3>
        <p class="r-doc__stats-line">
          Height: ${heightIn} inches Sex: ${sex} Thigh: ${thigh} Waist: ${waist} Age: ${age}
        </p>

        <p class="r-doc__today-label">--TODAY--</p>
        <p class="r-doc__today-row">LEAN ${today.leanPct} % ${today.leanLbs} lbs.</p>
        <p class="r-doc__today-row">FAT ${today.fatPct} % ${today.fatLbs} lbs.</p>
        <p class="r-doc__today-row">TOTAL ${today.totalPct} % ${today.totalLbs} lbs.</p>

        <table class="r-ace-table" aria-label="ACE body fat categories">
          <thead>
            <tr>
              ${aceHeaders.map((row) => `<th scope="col">${row.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${aceHeaders.map((row) => `<td>${row.rangeLabel}</td>`).join('')}
            </tr>
          </tbody>
        </table>

        <p>${escapeHtml(aceVerdict)}</p>
        <p>
          How much fat is right for each individual is a personal choice. How you look in the mirror is the only
          true judge of whether you have fat to lose. If you see more fat than you personally want, then exercise
          and follow your this plan until you reach your desired goals.
        </p>

        ${desirableLine ? `<p>${escapeHtml(desirableLine)}</p>` : ''}
        ${congratsLine ? `<p>${escapeHtml(congratsLine)}</p>` : ''}

        <table class="r-ace-table r-ace-table--weights" aria-label="Weight goals by health category">
          <thead>
            <tr>
              ${weightBands.map((band) => `<th scope="col">${escapeHtml(band.label)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${weightBands.map((band) => `<td>${escapeHtml(band.display)}</td>`).join('')}
            </tr>
          </tbody>
        </table>

        <p>
          Continue to monitor your body composition using Lean Body Analysis every 6 to 8 weeks to make sure
          you are losing only fat and not lean! If you want to lose fat, do so by following this diet as closely as
          you can. This plan allows you to lose all the fat you want to lose while increasing your strength &amp;
          energy.
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
        <p class="r-eyebrow">Page 3</p>
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
          losing fat and getting more energy. In eight weeks, you could safely lose ${fatLost} pounds of fat. On your
          information sheet, you indicated you plan to exercise a total of ${hours.total} hour(s) per week.
          ${hours.wt} hour(s) of weight training, ${hours.cardio} hour(s) of cardiovascular activities,
          ${hours.fatBurn} hour(s) of fat-burning activities
        </p>

        <table class="r-goal-table" aria-label="Today and eight week goal">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">TODAY</th>
              <th scope="col"></th>
              <th scope="col">EIGHT WEEK GOAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" class="r-goal-row-label">LEAN</th>
              <td>${today.leanPct} % ${today.leanLbs} lbs.</td>
              <td></td>
              <td>${goalLeanPct} ${goalLeanLbs}</td>
            </tr>
            <tr>
              <th scope="row" class="r-goal-row-label">FAT</th>
              <td>${today.fatPct} % ${today.fatLbs} lbs.</td>
              <td class="r-goal-fat-loss">−${fatLost} lbs. of fat</td>
              <td>${goalFatPct} ${goalFatLbs}</td>
            </tr>
            <tr>
              <th scope="row" class="r-goal-row-label">TOTAL</th>
              <td>${today.totalPct} % ${today.totalLbs} lbs.</td>
              <td></td>
              <td>${goalTotalPct} ${goalTotalLbs}</td>
            </tr>
          </tbody>
        </table>

        <p>
          You project to lose an average of ${weekly} pounds of fat per week. In addition, you could gain lean weight.
          Gaining lean weight will increase your strength and energy and offset your fat loss.
        </p>

        <p>
          How much food you need each day depends on how much LBM you have. Also, it depends on your
          activity level and the type and amount of exercise you participate in. Based on the information you
          provided, the following table gives you the number of calories and the amount of protein, carbohydrates
          and fat you need per day to maintain your fat or to reduce body fat. Also listed is what your body
          requires at rest (your resting metabolic rate), for your workday and for one hour of each type of exercise.
        </p>

        <table class="r-macro-table" aria-label="Daily macro and calorie requirements">
          <thead>
            <tr>
              <th scope="col" rowspan="2"></th>
              <th scope="colgroup" colspan="2">PROTEIN</th>
              <th scope="colgroup" colspan="2">CARBS</th>
              <th scope="colgroup" colspan="2">FATS</th>
              <th scope="colgroup" rowspan="2">TOTAL</th>
            </tr>
            <tr>
              <th scope="col">grams</th>
              <th scope="col">calories</th>
              <th scope="col">grams</th>
              <th scope="col">calories</th>
              <th scope="col">grams</th>
              <th scope="col">calories</th>
              <th scope="col">calories</th>
            </tr>
          </thead>
          <tbody>
            ${macroBody}
          </tbody>
        </table>
      </article>

      <footer class="r-actions">
        <button type="button" class="r-btn r-btn--ghost" data-report-back-lbm>← Lean body analysis</button>
        <div>
          <p class="r-note" style="text-align:right;margin-bottom:8px;">Servings page next — meal planner for now.</p>
          <a class="r-btn r-btn--primary" href="../mealplanner/">Continue to meal planner →</a>
        </div>
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
      : renderFoodPlan(programPackage);
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
    if (event.target.closest('[data-report-next-food]')) {
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
  usingPreview = programPackage?.meta?.source === 'program-report-preview';

  if (!programPackage?.intake?.leanBodyMass && wantsPreviewFromUrl()) {
    programPackage = buildPreviewProgram();
    usingPreview = true;
    persistProgram(programPackage);
  }

  renderPreparedLine(programPackage);
  if (programPackage?.intake?.leanBodyMass) {
    activePage = initialPageFromUrl();
  }
  renderNav();
  renderPage();
  bindEvents();
}

init();
