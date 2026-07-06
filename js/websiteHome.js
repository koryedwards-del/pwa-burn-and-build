import { computeWhatsPossible } from './previewCalculator.js';

const APP_FEATURES = [
  {
    icon: '🍽',
    title: 'Daily Food Plan',
    desc: 'Three meals and three snacks with exact serving counts and gram weights for every food — scaled to your body.',
    img: '../img/coach/card-1.png',
  },
  {
    icon: '🛒',
    title: 'Grocery List',
    desc: 'Auto-generated from your food plan. Shop once, prep portions, and stay on schedule all week.',
    img: '../img/coach/card-3.png',
  },
  {
    icon: '📋',
    title: 'Simple Daily Implementation',
    desc: 'Log meals, track fat servings, and stay on schedule — one day at a time.',
    img: '../img/coach/card-5.png',
  },
];

export function createHomeState() {
  return {
    calcGender: 'male',
    calcWeight: '180',
    calcBf: '25',
    calcResult: null,
  };
}

function renderHeader() {
  return `
    <header class="site-header">
      <div class="site-header-inner">
        <div class="site-logo">BURN <span>&amp; BUILD</span></div>
        <button type="button" class="btn-primary site-header-cta" data-action="create-program">Create Food Plan</button>
      </div>
    </header>`;
}

function renderHero() {
  return `
    <section class="site-hero" id="top">
      <div class="site-hero-inner">
        <div class="eyebrow">Personalized nutrition since 1982</div>
        <h1>BURN <span>&amp; BUILD</span></h1>
        <p class="site-hero-lead">A personalized food program built for your body — your lean mass, your job, your lifestyle, and your exercise. Not a generic diet. A system designed for you.</p>
        <div class="site-hero-actions">
          <button type="button" class="btn-primary" data-action="create-program">Create Food Plan</button>
          <button type="button" class="btn-secondary" data-action="scroll-calculator">See What's Possible</button>
        </div>
      </div>
    </section>`;
}

function renderCalculator(state) {
  const r = state.calcResult;
  const maleActive = state.calcGender === 'male';
  return `
    <section class="site-section" id="calculator">
      <div class="site-section-inner calc-inner">
        <div class="section-label">Interactive Tools</div>
        <h2 class="calc-heading">What can Burn &amp; Build do for you?</h2>
        <p class="calc-intro">A precision program built to maximize fat loss and preserve every ounce of muscle. Based on thousands of clients over 40 years, the average person loses approximately 3% body fat per month — while increasing strength and energy.</p>
        <div class="calc-panel">
          <div class="calc-row">
            <div class="calc-col">
              <div class="calc-label">Gender</div>
              <div class="gender-tabs">
                <button type="button" class="gender-tab ${maleActive ? 'active' : ''}" data-calc-gender="male">Male</button>
                <button type="button" class="gender-tab ${!maleActive ? 'active' : ''}" data-calc-gender="female">Female</button>
              </div>
            </div>
            <div class="calc-col">
              <label class="calc-label" for="calc-weight">Current Bodyweight (lbs)</label>
              <input class="calc-input" id="calc-weight" type="number" name="calcWeight" min="1" placeholder="Enter weight" value="${state.calcWeight}" />
            </div>
            <div class="calc-col">
              <label class="calc-label" for="calc-bf">Current Body Fat %</label>
              <input class="calc-input" id="calc-bf" type="number" name="calcBf" min="1" max="70" step="0.1" placeholder="Enter body fat %" value="${state.calcBf}" />
            </div>
          </div>
          <button type="button" class="calc-btn" data-action="run-calculator">Show Me What's Possible →</button>
          ${r ? (r.valid ? `
            <div class="calc-results visible">
              <p class="calc-narrative">${r.narrative}</p>
              <table class="calc-table">
                <thead>
                  <tr>
                    <th>Timeline</th>
                    <th>Body Fat %</th>
                    <th>Bodyweight</th>
                  </tr>
                </thead>
                <tbody>
                  ${r.rows.map((row) => `
                    <tr class="${row.isCurrent ? 'row-current' : ''}">
                      <td>${row.timeline}</td>
                      <td>${row.bodyFatDisplay}${row.badge ? `<span class="ace-badge">${row.badge}</span>` : ''}</td>
                      <td>${row.weightDisplay}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
              <p class="calc-disclaimer">Results may vary. This tool is for informational purposes only and does not constitute medical or nutritional advice. Individual results depend on starting body composition, program adherence, diet, exercise, and other factors. Consult a qualified healthcare professional before beginning any diet or exercise program.</p>
              <button type="button" class="btn-primary" data-action="create-program">Create Food Plan →</button>
            </div>` : `<div class="calc-error">${r.error}</div>`) : ''}
        </div>
      </div>
    </section>`;
}

function renderHowItWorks() {
  return `
    <section class="site-section site-section-alt">
      <div class="site-section-inner">
        <div class="section-label">How Burn &amp; Build Works</div>
        <h2>Three simple steps</h2>
        <div class="steps-flow">
          <div class="step-card">
            <div class="step-num">1</div>
            <h3>See What's Possible</h3>
            <p>Use the calculator to explore what Burn &amp; Build can do for your body — fat loss while preserving muscle.</p>
          </div>
          <div class="step-arrow">↓</div>
          <div class="step-card">
            <div class="step-num">2</div>
            <h3>Create Your Program</h3>
            <p>Answer questions about your body, job, and exercise. The Burn Engine builds your exact serving targets for 8 weeks.</p>
          </div>
          <div class="step-arrow">↓</div>
          <div class="step-card">
            <div class="step-num">3</div>
            <h3>Use the App</h3>
            <p>Your daily tools — food plan, grocery list, meal logging, and progress tracking. Execute the program you built.</p>
          </div>
        </div>
      </div>
    </section>`;
}

function renderAppPreview() {
  return `
    <section class="site-section" id="app-preview">
      <div class="site-section-inner">
        <div class="section-label">The App</div>
        <h2>Your daily delivery system</h2>
        <p class="section-lead">The app is not the starting point — it is how you live your program every day after it has been created for you.</p>
        <div class="preview-grid">
          ${APP_FEATURES.map((f) => `
            <div class="preview-card">
              <img src="${f.img}" alt="${f.title}" loading="lazy" />
              <div class="preview-card-body">
                <div class="preview-icon">${f.icon}</div>
                <h3>${f.title}</h3>
                <p>${f.desc}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
}

function renderFinalCta() {
  return `
    <section class="site-section site-final-cta">
      <div class="site-section-inner">
        <h2>Create Your Burn &amp; Build Program</h2>
        <p class="section-lead">You've explored what's possible. Now let the Burn Engine build a program designed for your body.</p>
        <button type="button" class="btn-primary site-final-btn" data-action="create-program">Create Food Plan →</button>
        <p class="site-footer-note">Already have a program? <a href="../">Open the Burn &amp; Build app →</a></p>
      </div>
    </section>`;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="site-footer-inner">
        <div class="site-logo">BURN <span>&amp; BUILD</span></div>
        <p>Website → Program Creator → App</p>
      </div>
    </footer>`;
}

export function renderWebsiteHome(state) {
  return `
    <div class="website-home">
      ${renderHeader()}
      <main>
        ${renderHero()}
        ${renderCalculator(state)}
        ${renderHowItWorks()}
        ${renderAppPreview()}
        ${renderFinalCta()}
      </main>
      ${renderFooter()}
    </div>`;
}

export function runCalculator(state) {
  state.calcResult = computeWhatsPossible({
    gender: state.calcGender,
    weightLbs: state.calcWeight,
    bodyFatPercent: state.calcBf,
  });
}

function syncInputs(state, root) {
  const w = root.querySelector('[name="calcWeight"]');
  const bf = root.querySelector('[name="calcBf"]');
  if (w) state.calcWeight = w.value;
  if (bf) state.calcBf = bf.value;
}

function rerenderHome(root, state, callbacks) {
  const parent = root.closest('#app') || root.parentElement;
  parent.innerHTML = renderWebsiteHome(state);
  bindHomeEvents(parent, state, callbacks);
}

export function bindHomeEvents(root, state, { onCreateProgram }) {
  root.querySelectorAll('[data-action="create-program"]').forEach((el) => {
    el.addEventListener('click', onCreateProgram);
  });

  root.querySelector('[data-action="scroll-calculator"]')?.addEventListener('click', () => {
    document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
  });

  root.querySelector('[data-action="run-calculator"]')?.addEventListener('click', () => {
    syncInputs(state, root);
    runCalculator(state);
    rerenderHome(root, state, { onCreateProgram });
    document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
  });

  root.querySelectorAll('[data-calc-gender]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.calcGender = btn.dataset.calcGender;
      rerenderHome(root, state, { onCreateProgram });
    });
  });

  root.querySelectorAll('.calc-input').forEach((input) => {
    input.addEventListener('change', () => syncInputs(state, root));
  });
}
