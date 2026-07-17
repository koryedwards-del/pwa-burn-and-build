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
import {
  PROGRAM_BRIDGE_PAGES,
  escapeHtml,
  programMetaHtml,
  programNavListHtml,
} from '../../js/programBridgeUi.js';
import { loadProgramBridge, persistProgramBridge } from '../../js/programBridgeHandoff.js';
import { getActiveProgramId, setActiveProgramId } from '../../js/programActive.js';
import { bootProgramBridgeAside } from '../../js/programLibrary.js';
import { bindProgramAccess, bootProgramAccess, openAccessGate } from '../../js/programAccess.js';
import { QUESTIONNAIRE_WELCOME_URL } from '../../js/siteUrls.js';

const ASSET_VERSION = new URL(import.meta.url).searchParams.get('v') || '1';

let plannerModulePromise = null;

function loadPlannerModule() {
  if (!plannerModulePromise) {
    plannerModulePromise = import(`../../menuplanner/js/planner.js?v=${ASSET_VERSION}`);
  }
  return plannerModulePromise;
}

async function bootMenuPlannerPage() {
  return (await loadPlannerModule()).bootMenuPlannerPage();
}

async function applyMenuPlannerProgram(pkg) {
  return (await loadPlannerModule()).applyMenuPlannerProgram(pkg);
}

async function refreshMenuPlannerDisplay() {
  return (await loadPlannerModule()).refreshMenuPlannerDisplay();
}

async function isMenuPlannerHydrated() {
  return (await loadPlannerModule()).isMenuPlannerHydrated();
}

async function persistMenuPlannerState() {
  return (await loadPlannerModule()).persistMenuPlannerState();
}

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
  newsletterOptIn: false,
};

const PAGES = PROGRAM_BRIDGE_PAGES;

let activePage = 0;
let programPackage = null;

function loadProgramPackage() {
  return loadProgramBridge();
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
  if (page === 'menuplanner' || page === 'menu' || page === 'planner') return 3;
  if (page === '2' || page === 'food' || page === 'foodplan' || page === 'lbm' || page === 'projections') return 1;
  if (page === '3' || page === '4' || page === 'servings') return 2;
  return 0;
}

function wantsMenuPlannerFromUrl() {
  const page = new URLSearchParams(location.search).get('page');
  return page === 'menuplanner' || page === 'menu' || page === 'planner';
}

function syncPageUrl() {
  const query = PAGES[activePage]?.reportQuery || 'welcome';
  const url = new URL(location.href);
  if (url.searchParams.get('page') === query) return;
  url.searchParams.set('page', query);
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function persistProgram(pkg) {
  persistProgramBridge(pkg);
  if (pkg?.program?.id) setActiveProgramId(pkg.program.id);
}

function loadPreviewProgram() {
  programPackage = buildPreviewProgram();
  persistProgram(programPackage);
  showPage(initialPageFromUrl());
}

function shouldShowPrintShop() {
  return activePage === 3 && Boolean(programPackage?.intake?.leanBodyMass);
}

function syncPrintShopNavVisibility() {
  const show = shouldShowPrintShop();
  const printShop = document.getElementById('print-shop');
  const slot = printShop?.closest('.pb-nav__item--print-shop');
  document.querySelector('.pb-aside')?.classList.toggle('pb-aside--print-shop', show);
  if (show) {
    printShop?.removeAttribute('hidden');
    slot?.removeAttribute('hidden');
  } else {
    printShop?.setAttribute('hidden', '');
    slot?.setAttribute('hidden', '');
  }
}

function detachPrintShopFromNav() {
  const printShop = document.getElementById('print-shop');
  const aside = document.querySelector('.pb-aside');
  const dock = aside?.querySelector('.pb-aside__dock');
  if (printShop && aside && dock && printShop.parentElement !== aside) {
    aside.insertBefore(printShop, dock);
  }
}

function mountPrintShopUnderMenuPlanner(list) {
  const printShop = document.getElementById('print-shop');
  if (!printShop || !list) return;

  const menuItem = list.querySelector('[data-nav-page="3"]')?.closest('.pb-nav__item');
  let slot = list.querySelector('.pb-nav__item--print-shop');
  if (!slot) {
    slot = document.createElement('li');
    slot.className = 'pb-nav__item pb-nav__item--print-shop';
  }
  slot.appendChild(printShop);
  menuItem?.insertAdjacentElement('afterend', slot);
}

function renderNav() {
  const list = document.getElementById('r-nav-list');
  if (!list) return;
  detachPrintShopFromNav();
  const activeId = PAGES[activePage]?.id || 'welcome';
  list.innerHTML = programNavListHtml(activeId);
  mountPrintShopUnderMenuPlanner(list);
  syncPrintShopNavVisibility();
}

function renderWelcome(pkg) {
  return `
    <section class="r-panel">
      <div class="pb-page-head">
        <p class="pb-eyebrow">Page 1</p>
        <h2 class="pb-panel__title">Welcome</h2>
      </div>

      <article class="r-doc">
        ${programMetaHtml(pkg)}

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

        <h3>Projections</h3>
        <p>
          Page two shows your eight-week fat-loss projection and longer-term timeline — how much fat you can
          lose based on your lean body mass, job, lifestyle, and exercise plan.
        </p>

        <h3>Plan/Servings</h3>
        <p>
          Page three is your plan and servings. How much food you need each day depends on your LBM, your job,
          and your exercise. The macro table shows calories and protein, carbs, and fat at rest, at work, and
          per hour of exercise. The servings grid breaks that into daily meal targets — no counting calories
          on your own.
        </p>

        <h3>Menu planner</h3>
        <p>
          After your servings page, the menu planner is where you build your week. Choose meals for breakfast,
          lunch, dinner, and snacks that hit your daily serving targets — and get your grocery list.
        </p>
      </article>

      <footer class="r-actions r-actions--end">
        <button type="button" class="r-btn r-btn--primary" data-report-next>Projections →</button>
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

function macroTableSectionHtml(pkg) {
  const intake = pkg?.intake;
  const macroRows = macroTableRows(pkg?.plan?.formula, intake?.workIntensity);
  if (!macroRows.length) return '';

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
        </table>`;
}

function renderFoodPlan(pkg) {
  const intake = pkg.intake;
  const today = computeTodayBodyComposition(intake);
  const projection = eightWeekProjectionFromPackage(pkg);
  const timeline = projectionTimelineFromPackage(pkg);
  const hours = exerciseHoursSummary(intake);

  const fatLost = projection ? projection.fatLostLbs.toFixed(1) : '—';
  const weekly = projection ? projection.weeklyFatLossLbs.toFixed(1) : '—';
  const goalLeanPct = projection ? `${projection.endLeanPct.toFixed(2)}%` : '—';
  const goalLeanLbs = projection ? `${projection.leanLbs.toFixed(1)} lbs.` : '—';
  const goalFatPct = projection ? `${projection.endBf.toFixed(2)}%` : '—';
  const goalFatLbs = projection ? `${projection.endFatLbs.toFixed(1)} lbs.` : '—';
  const goalTotalPct = '100.00%';
  const goalTotalLbs = projection ? `${projection.endWeight.toFixed(1)} lbs.` : '—';

  const timelineBody = projectionTimelineRows(timeline);

  return `
    <section class="r-panel">
      <div class="pb-page-head">
        <p class="pb-eyebrow">Page 2</p>
        <h2 class="pb-panel__title">Projections</h2>
      </div>

      <article class="r-doc">
        ${programMetaHtml(pkg)}

        <h3>Projections</h3>
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
      </article>

      <footer class="r-actions">
        <button type="button" class="r-btn r-btn--ghost" data-report-back>← Welcome</button>
        <button type="button" class="r-btn r-btn--primary" data-report-next-servings>Plan/Servings →</button>
      </footer>
    </section>
  `;
}

function renderServings(pkg) {
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
      <th scope="row" class="r-servings-label">Extra Fats</th>
      <td>${escapeHtml(line.value)}</td>
      <td colspan="6">${escapeHtml(line.note)}</td>
    </tr>
  `).join('');

  return `
    <section class="r-panel">
      <div class="pb-page-head">
        <p class="pb-eyebrow">Page 3</p>
        <h2 class="pb-panel__title">Plan/Servings</h2>
      </div>

      <article class="r-doc">
        ${programMetaHtml(pkg)}

        ${macroTableSectionHtml(pkg)}

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
        <button type="button" class="r-btn r-btn--ghost" data-report-back-food>← Projections</button>
        <button type="button" class="r-btn r-btn--primary" data-report-next-planner>Menu planner →</button>
      </footer>
    </section>
  `;
}

function renderMissingProgram() {
  return `
    <div class="r-empty">
      <p class="r-empty__eyebrow">Get started</p>
      <h2 class="r-empty__title">Create your personalized program</h2>
      <p class="r-empty__lead">
        Answer a short intake questionnaire — your body composition, workday, and exercise plan for the next 8 weeks.
        Burn &amp; Build calculates your servings and builds your program report.
      </p>
      <ol class="r-empty__steps">
        <li><strong>Intake</strong> — personal info, body fat, work &amp; exercise</li>
        <li><strong>Your program</strong> — welcome, projections, plan/servings, and menu planner</li>
        <li><strong>Menu planner</strong> — build your week and grocery list</li>
      </ol>
      <div class="r-empty__actions">
        <a class="r-btn r-btn--primary" href="${QUESTIONNAIRE_WELCOME_URL}">Create your diet →</a>
        <button type="button" class="r-btn r-btn--ghost" data-report-preview>Preview sample report</button>
      </div>
      <p class="r-note r-empty__hint">Preview uses Kristi Warner&rsquo;s seminar sample before you build yours.</p>
    </div>
  `;
}

function renderPage() {
  const main = document.getElementById('r-main');
  const plannerPage = document.getElementById('planner-page');
  if (!main || !plannerPage) return;

  if (!programPackage?.intake?.leanBodyMass) {
    plannerPage.hidden = true;
    main.hidden = false;
    main.innerHTML = renderMissingProgram();
    return;
  }

  if (activePage === 3) {
    main.hidden = true;
    main.innerHTML = '';
    plannerPage.hidden = false;
    bootMenuPlannerPage()
      .then(async () => {
        if (await isMenuPlannerHydrated()) {
          await refreshMenuPlannerDisplay();
          return;
        }
        await applyMenuPlannerProgram(programPackage);
      })
      .catch((err) => {
        console.error('Menu planner failed to load:', err);
        applyMenuPlannerProgram(programPackage).catch((applyErr) => {
          console.error('Menu planner apply failed:', applyErr);
        });
      });
    return;
  }

  plannerPage.hidden = true;
  main.hidden = false;
  main.innerHTML = activePage === 0
    ? renderWelcome(programPackage)
    : activePage === 1
      ? renderFoodPlan(programPackage)
      : renderServings(programPackage);
}

function showPage(index) {
  activePage = Math.max(0, Math.min(index, PAGES.length - 1));
  syncPageUrl();
  renderNav();
  renderPage();
}

function bindEvents() {
  document.getElementById('r-nav-list')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-nav-page]');
    if (!btn || btn.disabled) return;
    showPage(Number(btn.dataset.navPage));
  });

  document.getElementById('r-app')?.addEventListener('click', (event) => {
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
    if (event.target.closest('[data-report-back-servings]')) {
      showPage(2);
      return;
    }
    if (event.target.closest('[data-report-next-planner]')) {
      showPage(3);
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

function launchApp() {
  window.__bnbSyncProgramPackage = (pkg) => {
    if (pkg) programPackage = pkg;
  };
  renderNav();
  renderPage();
  bindEvents();
  bootProgramBridgeAside({
    getProgramPackage: () => programPackage,
    openAccessGate,
    beforeSwitch: async () => {
      if (activePage === 3) await persistMenuPlannerState();
    },
    onSwitch: async (pkg) => {
      programPackage = pkg;
      persistProgram(programPackage);
      renderNav();
      if (activePage === 3) {
        await applyMenuPlannerProgram(programPackage);
        syncPrintShopNavVisibility();
      } else {
        renderPage();
      }
    },
  }).catch((err) => console.error(err));
}

async function init() {
  if (wantsPreviewFromUrl()) {
    programPackage = buildPreviewProgram();
    persistProgram(programPackage);
  } else {
    programPackage = loadProgramPackage();
  }

  bindProgramAccess(async (pkg) => {
    programPackage = pkg;
    persistProgram(programPackage);
    activePage = 0;
    launchApp();
  });

  if (!programPackage?.intake?.leanBodyMass && wantsMenuPlannerFromUrl()) {
    await bootProgramAccess();
    return;
  }

  if (programPackage?.intake?.leanBodyMass) {
    activePage = initialPageFromUrl();
  }
  launchApp();
}

init();
