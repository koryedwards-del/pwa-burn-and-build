import {
  analyzeLeanBodyMass,
  computeDietEightWeekProjection,
  computeTodayBodyComposition,
} from '../../js/bodyCompositionAnalysis.js';
import { buildProgramPackage } from '../../js/programPackage.js';

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
  workStress: 'busy',
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
  { id: 'projection', label: '8-week goal', step: 3, future: true },
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
  return buildProgramPackage(PREVIEW_FORM, {
    label: '8-Week Burn & Build Program',
    meta: { source: 'program-report-preview' },
  });
}

function wantsPreviewFromUrl() {
  return new URLSearchParams(location.search).has('preview');
}

function initialPageFromUrl() {
  const page = new URLSearchParams(location.search).get('page');
  if (page === '2' || page === 'lbm') return 1;
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

function genderLabel(sex) {
  return genderKey(sex) === 'female' ? 'Female' : 'Male';
}

function formatReportDate(iso) {
  if (!iso) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function heightLabel(inches) {
  const total = Number(inches);
  if (!total) return '—';
  const feet = Math.floor(total / 12);
  const inch = Math.round(total % 12);
  return `${feet}'${inch}" (${total} in)`;
}

function projectionFromPackage(pkg) {
  const intake = pkg?.intake;
  const summary = pkg?.plan?.summary;
  if (!intake?.leanBodyMass || !intake?.totalWeight || !intake?.fatPercent) return null;
  if (!summary?.maintainTotalCals || !summary?.reduceTotalCals) return null;
  return computeDietEightWeekProjection({
    weightLbs: intake.totalWeight,
    leanBodyMass: intake.leanBodyMass,
    bodyFatPercent: intake.fatPercent,
    maintainTotalCalories: summary.maintainTotalCals,
    reduceTotalCalories: summary.reduceTotalCals,
    gender: genderKey(intake.sex),
  });
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
        <span class="r-note">Pages 3–4 coming next.</span>
        <button type="button" class="r-btn r-btn--primary" data-report-next>Lean body analysis →</button>
      </footer>
    </section>
  `;
}

function renderLbmAnalysis(pkg) {
  const intake = pkg.intake;
  const today = computeTodayBodyComposition(intake);
  const projection = projectionFromPackage(pkg);
  const lbmAnalysis = analyzeLeanBodyMass({
    gender: genderKey(intake.sex),
    heightInches: intake.heightInches,
    leanBodyMass: intake.leanBodyMass,
  });

  const stats = `
    <div class="r-stats">
      <span>Height: <strong>${escapeHtml(heightLabel(intake.heightInches))}</strong></span>
      <span>Sex: <strong>${escapeHtml(genderLabel(intake.sex))}</strong></span>
      <span>Age: <strong>${escapeHtml(intake.age ?? '—')}</strong></span>
    </div>
  `;

  const goalLeanLbs = projection ? `${projection.leanLbs.toFixed(1)} lbs.` : '—';
  const goalLeanPct = projection ? `${projection.endLeanPct.toFixed(2)} %` : '—';
  const goalFatLine = projection
    ? `<span class="r-composition__metric">−${projection.fatLostLbs.toFixed(1)} lbs. of fat</span>
       <span class="r-composition__sub">${projection.endBf.toFixed(2)} % · ${projection.endFatLbs.toFixed(1)} lbs.</span>`
    : '—';
  const goalTotal = projection
    ? `<span class="r-composition__metric">100.00 %</span>
       <span class="r-composition__sub">${projection.endWeight.toFixed(1)} lbs.</span>`
    : '—';

  const lbmCallout = lbmAnalysis.atOrAbove
    ? `<div class="r-callout r-callout--good">
        <strong>Congratulations!</strong> Your lean body mass is at or above the desirable amount for your height
        (${lbmAnalysis.desirableLbm} lbs. or more). Even so, it&apos;s a good idea to exercise at least twice a week.
        Feed your body properly — this program shows you how much food you need daily for maximum results.
      </div>`
    : `<div class="r-callout">
        A ${genderLabel(intake.sex).toLowerCase()} your height in good condition has
        <strong>${lbmAnalysis.desirableLbm} pounds</strong> or more of lean body weight.
        This plan is built to protect lean mass while you lose fat. Feed your body properly — the servings page
        shows how much food you need daily.
      </div>`;

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Page 2</p>
        <h2 class="r-panel__title">Lean body analysis</h2>
        <p class="r-panel__lead">Today versus your eight-week goal — lean mass is the engine; fat is what moves.</p>
      </div>

      <article class="r-doc">
        <header class="r-doc__head">
          <p class="r-doc__meta">Lean Body Analysis</p>
        </header>

        ${stats}

        <table class="r-composition" aria-label="Body composition today and eight-week goal">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Today</th>
              <th scope="col">Eight week goal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" class="r-composition__row-label">Lean</th>
              <td>
                <span class="r-composition__metric">${today.leanPct} %</span>
                <span class="r-composition__sub">${today.leanLbs} lbs.</span>
              </td>
              <td>
                <span class="r-composition__metric">${goalLeanPct}</span>
                <span class="r-composition__sub">${goalLeanLbs}</span>
              </td>
            </tr>
            <tr>
              <th scope="row" class="r-composition__row-label">Fat</th>
              <td>
                <span class="r-composition__metric">${today.fatPct} %</span>
                <span class="r-composition__sub">${today.fatLbs} lbs.</span>
              </td>
              <td>${goalFatLine}</td>
            </tr>
            <tr>
              <th scope="row" class="r-composition__row-label">Total</th>
              <td>
                <span class="r-composition__metric">${today.totalPct} %</span>
                <span class="r-composition__sub">${today.totalLbs} lbs.</span>
              </td>
              <td>${goalTotal}</td>
            </tr>
          </tbody>
        </table>

        ${lbmCallout}

        <p>
          Continue to monitor your body composition every 6 to 8 weeks to make sure you are losing only fat and
          not lean. If you want to lose fat, follow this plan as closely as you can — it allows you to lose the
          fat you want while increasing your strength and energy.
        </p>
      </article>

      <footer class="r-actions">
        <button type="button" class="r-btn r-btn--ghost" data-report-back>← Welcome</button>
        <div>
          <p class="r-note" style="text-align:right;margin-bottom:8px;">8-week goal &amp; servings pages next — meal planner for now.</p>
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
    : renderLbmAnalysis(programPackage);
}

function showPage(index) {
  activePage = Math.max(0, Math.min(index, 1));
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
