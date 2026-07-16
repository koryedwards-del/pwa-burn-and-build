import {
  analyzeLeanBodyMass,
  computeDietEightWeekProjection,
  computeTodayBodyComposition,
} from '../../js/bodyCompositionAnalysis.js';

const MEALPLANNER_PROGRAM_KEY = 'bnb_mealplanner_program';

const PAGES = [
  { id: 'welcome', label: 'Welcome', step: 1 },
  { id: 'lbm', label: 'Lean body analysis', step: 2 },
  { id: 'projection', label: '8-week goal', step: 3, future: true },
  { id: 'servings', label: 'Servings', step: 4, future: true },
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
  el.textContent = `Prepared exclusively for ${name} · ${date}`;
}

function renderWelcome(pkg) {
  const name = escapeHtml(pkg.intake?.preferredName || 'you');
  const date = escapeHtml(formatReportDate(pkg.program?.issuedAt));

  return `
    <section class="r-panel">
      <div>
        <p class="r-eyebrow">Page 1</p>
        <h2 class="r-panel__title">Welcome</h2>
        <p class="r-panel__lead">The bridge between building your diet and living it — the same role the seminar printout played for decades.</p>
      </div>

      <article class="r-doc">
        <header class="r-doc__head">
          <p class="r-doc__meta">
            Prepared exclusively for: <strong>${name}</strong><br />
            On: <strong>${date}</strong>
          </p>
        </header>

        <h3>Congratulations</h3>
        <p>
          You have in your hands the most advanced diet available anywhere, at any price. It is the most
          individualized program available for losing fat. This diet will not work effectively for anyone else
          because it has been created just for you — using your lean body mass, your job, your lifestyle, and
          your plan for exercise and activities.
        </p>

        <p class="r-doc__section-title">How we did it</p>
        <p>
          We determined your lean weight from the body composition information you provided. Then you told us
          about your job, lifestyle, exercise, and activities. With that, the Burn Engine generated this
          program report.
        </p>

        <p class="r-doc__section-title">What&apos;s in your report</p>
        <ul class="r-doc__list">
          <li><strong>Lean body analysis</strong> — your lean mass today and where you&apos;re headed in eight weeks.</li>
          <li><strong>8-week goal</strong> — projected fat loss (coming next on this bridge).</li>
          <li><strong>Servings</strong> — your daily food targets, split into meals (then into the meal planner).</li>
        </ul>

        <p>
          Lean body mass is what the computer uses to calculate your metabolic rate. That number drives everything
          that follows — including how much food you need and how fast you can lose fat while keeping your strength
          and energy.
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
      <p>No program found. Complete the questionnaire first so the Burn Engine can build your report.</p>
      <a class="r-btn r-btn--primary" href="../questionnaire/">Go to questionnaire →</a>
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
  renderPreparedLine(programPackage);
  renderNav();
  renderPage();
  bindEvents();
}

init();
