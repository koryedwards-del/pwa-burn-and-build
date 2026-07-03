import { getArticle, searchArticles } from './knowledgeBase.js';
import { computePreview, defaultTargetBf } from './previewCalculator.js';

const RESULTS = [
  {
    name: 'Dave McAftery',
    since: 'Client since 1990',
    quote: 'If you want to see real results like you never thought possible, this is the plan to be on because it dials everything in for each person.',
  },
  {
    name: 'Linda Kay',
    since: 'Client since 1992',
    quote: 'I learned this program in 1992 and it has been invaluable. At 67, I am confident I can maintain and even build muscle and lose fat.',
  },
];

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
    desc: 'Log meals, track fat servings, and get coaching messages from Coach Kory — one day at a time.',
    img: '../img/coach/card-5.png',
  },
];

export function createHomeState() {
  return {
    calcWeight: '180',
    calcBf: '25',
    calcTargetBf: '20',
    calcResult: null,
    kbQuery: '',
    kbOpenId: null,
  };
}

function renderHeader() {
  return `
    <header class="site-header">
      <div class="site-header-inner">
        <div class="site-logo">BURN <span>&amp; BUILD</span></div>
        <button type="button" class="btn-primary site-header-cta" data-action="create-program">Create My Program</button>
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
          <button type="button" class="btn-primary" data-action="create-program">Create My Program</button>
          <button type="button" class="btn-secondary" data-action="scroll-calculator">See What's Possible</button>
        </div>
      </div>
    </section>`;
}

function renderCalculator(state) {
  const r = state.calcResult;
  return `
    <section class="site-section" id="calculator">
      <div class="site-section-inner">
        <div class="section-label">Interactive Tools</div>
        <h2>Visualize what's possible</h2>
        <p class="section-lead">Enter your weight and body fat percentage to see an estimated timeline. Your actual program will be far more precise — this preview uses moderate defaults.</p>
        <div class="calc-panel">
          <div class="calc-inputs">
            <div class="calc-field">
              <label for="calc-weight">Weight (lbs)</label>
              <input id="calc-weight" type="number" name="calcWeight" min="80" max="400" value="${state.calcWeight}" />
            </div>
            <div class="calc-field">
              <label for="calc-bf">Body fat %</label>
              <input id="calc-bf" type="number" name="calcBf" min="5" max="60" step="0.1" value="${state.calcBf}" />
            </div>
            <div class="calc-field">
              <label for="calc-target">Target body fat %</label>
              <input id="calc-target" type="number" name="calcTargetBf" min="5" max="50" step="0.1" value="${state.calcTargetBf}" />
            </div>
          </div>
          <button type="button" class="btn-primary calc-run" data-action="run-calculator">Calculate Timeline</button>
          ${r ? (r.valid ? `
            <div class="calc-results">
              <div class="calc-stat-grid">
                <div class="calc-stat">
                  <div class="calc-stat-val">${r.lbm} lbs</div>
                  <div class="calc-stat-lbl">Lean body mass</div>
                </div>
                <div class="calc-stat">
                  <div class="calc-stat-val">${r.weeklyFatLossLbs}</div>
                  <div class="calc-stat-lbl">Est. lbs / week</div>
                </div>
                <div class="calc-stat">
                  <div class="calc-stat-val">${r.eightWeekLossLbs}</div>
                  <div class="calc-stat-lbl">Est. loss in 8 wks</div>
                </div>
                <div class="calc-stat">
                  <div class="calc-stat-val">${r.weeksToTarget ?? '—'}</div>
                  <div class="calc-stat-lbl">Weeks to ${r.targetBodyFatPercent}% BF</div>
                </div>
              </div>
              <p class="calc-note">Preview only — your personalized program accounts for your job, stress, exercise schedule, and exact body composition.</p>
              <button type="button" class="btn-primary" data-action="create-program">Create My Personalized Program →</button>
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
            <h3>Learn</h3>
            <p>Explore the knowledge base. Understand lean body mass, fat servings, and why personalized targets beat generic diets.</p>
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
            <p>Your daily coach — food plan, grocery list, meal logging, and coaching from Coach Kory. Execute the program you built.</p>
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

function renderKnowledgeBase(state) {
  const articles = searchArticles(state.kbQuery);
  const open = state.kbOpenId ? getArticle(state.kbOpenId) : null;

  return `
    <section class="site-section site-section-alt" id="knowledge">
      <div class="site-section-inner">
        <div class="section-label">Knowledge Base</div>
        <h2>Learn before you build</h2>
        <p class="section-lead">The same teaching that powered live seminars for decades — now searchable on the website.</p>
        <div class="kb-search-wrap">
          <input class="kb-search" type="search" name="kbQuery" placeholder="Search topics…" value="${state.kbQuery}" aria-label="Search knowledge base" />
        </div>
        ${open ? `
          <article class="kb-article-open">
            <button type="button" class="kb-back" data-action="kb-close">← All topics</button>
            <div class="kb-article-meta">${open.category}</div>
            <h3>${open.title}</h3>
            ${open.body.map((p) => `<p>${p}</p>`).join('')}
          </article>` : `
          <div class="kb-grid">
            ${articles.map((a) => `
              <button type="button" class="kb-card" data-kb-id="${a.id}">
                <div class="kb-card-cat">${a.category}</div>
                <div class="kb-card-title">${a.title}</div>
                <div class="kb-card-summary">${a.summary}</div>
              </button>`).join('')}
            ${articles.length === 0 ? '<p class="kb-empty">No topics match your search.</p>' : ''}
          </div>`}
      </div>
    </section>`;
}

function renderResults() {
  return `
    <section class="site-section" id="results">
      <div class="site-section-inner">
        <div class="section-label">Results</div>
        <h2>Real people. Real programs.</h2>
        <p class="section-lead">Burn &amp; Build has been dialing in personalized programs since 1982. These clients are still on the plan decades later.</p>
        <div class="results-grid">
          ${RESULTS.map((r) => `
            <div class="result-card">
              <div class="result-quote">"${r.quote}"</div>
              <div class="result-name">${r.name}</div>
              <div class="result-since">${r.since}</div>
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
        <button type="button" class="btn-primary site-final-btn" data-action="create-program">Create My Program →</button>
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
        ${renderKnowledgeBase(state)}
        ${renderResults()}
        ${renderFinalCta()}
      </main>
      ${renderFooter()}
    </div>`;
}

export function runCalculator(state) {
  state.calcResult = computePreview({
    weightLbs: state.calcWeight,
    bodyFatPercent: state.calcBf,
    targetBodyFatPercent: state.calcTargetBf,
  });
}

function syncInputs(state, root) {
  const w = root.querySelector('[name="calcWeight"]');
  const bf = root.querySelector('[name="calcBf"]');
  const target = root.querySelector('[name="calcTargetBf"]');
  if (w) state.calcWeight = w.value;
  if (bf) state.calcBf = bf.value;
  if (target) state.calcTargetBf = target.value;
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

  root.querySelectorAll('[data-kb-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.kbOpenId = btn.dataset.kbId;
      rerenderHome(root, state, { onCreateProgram });
      document.getElementById('knowledge')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  root.querySelector('[data-action="kb-close"]')?.addEventListener('click', () => {
    state.kbOpenId = null;
    rerenderHome(root, state, { onCreateProgram });
  });

  const searchInput = root.querySelector('[name="kbQuery"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.kbQuery = e.target.value;
      state.kbOpenId = null;
      rerenderHome(root, state, { onCreateProgram });
      const input = document.querySelector('[name="kbQuery"]');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  root.querySelectorAll('.calc-field input').forEach((input) => {
    input.addEventListener('change', () => {
      syncInputs(state, root);
      if (input.name === 'calcBf') {
        state.calcTargetBf = String(defaultTargetBf(Number(state.calcBf)));
      }
    });
  });
}
