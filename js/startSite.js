import {
  bindOnboardingEvents,
  initOnboardingForm,
  renderOnboarding,
  syncObToStore,
} from './onboardingUI.js';
import {
  buildProgramPackage,
  downloadProgramPackage,
  packageToImportUrl,
  planFromPackage,
} from './programPackage.js';

const TEACHING = [
  {
    kicker: 'Coach Kory',
    title: 'Your lean body mass is your fat burner.',
    body: [
      'Muscle tissue burns calories all day — even when you are sitting, sleeping, or at your desk. That is why two people can weigh the same and lose fat at completely different rates.',
      'The Burn Engine does not guess. It calculates your daily food targets from your lean body mass, your job, your lifestyle stress, and the exercise you commit to for the next 8 weeks.',
    ],
    quote: { text: 'If you want to see real results like you never thought possible, this is the plan to be on because it dials everything in for each person.', by: 'Dave McAftery, client since 1990' },
  },
  {
    kicker: 'Fat servings',
    title: 'The number that controls fat loss.',
    body: [
      'Every day your body burns a specific amount of fat. The Burn Engine calculates that number and gives it to you as fat servings — your daily budget.',
      'Stay under that number and your body burns stored body fat. Hit it exactly and you maintain. Go over it and you are burning what you ate instead of what you are carrying.',
      'This is the basic principle behind why Burn & Build works when cookie-cutter diets fail.',
    ],
  },
  {
    kicker: 'Three meals. Three snacks.',
    title: 'Simple structure. Exact amounts.',
    body: [
      'Protein and grains/starches at breakfast, lunch, and dinner. Fresh fruit at each snack. Vegetables at dinner.',
      'You do not do the math. The app shows you gram weights for every food in the list — scaled to your exact serving targets.',
      'Eat on time. Every 2–3 hours keeps your fat burners working.',
    ],
  },
  {
    kicker: '8-week program',
    title: 'Commit to the full cycle.',
    body: [
      'An 8-week program is not arbitrary. It gives your body time to adapt, your habits time to stick, and your results time to show up on the scale and in the mirror.',
      'When the 8 weeks are done — or when your body composition changes significantly — you come back here for a new personalized program. That is by design.',
    ],
    quote: { text: 'I learned this program in 1992 and it has been invaluable. At 67, I am confident I can maintain and even build muscle and lose fat.', by: 'Linda Kay, client since 1992' },
  },
  {
    kicker: 'Website + App',
    title: 'Two parts. One system.',
    body: [
      'This website is where your personalized program is created — the same role the live seminar played for decades. Teaching, intake, and the Burn Engine all happen here.',
      'The Burn & Build app is your daily coach: food plan, logging, grocery list, and messages from Coach Kory. It executes the program you build here.',
      'You can revisit this site anytime for deeper teaching. The app stays focused on doing the work every day.',
    ],
  },
];

const store = {
  phase: 'landing',
  onboardingPage: 0,
  onboardingForm: null,
  onboardingEditMode: false,
  teachIndex: 0,
  builtPackage: null,
  startDate: defaultStartDate(),
  importUrl: '',
};

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function renderLanding() {
  return `
    <div class="start-site">
      <div class="screen">
        <div class="start-hero">
          <div class="eyebrow">Start your program</div>
          <h1>BURN <span>&amp; BUILD</span></h1>
          <p>Build your program here. Open it in the Burn & Build app — your daily coach for food logging, groceries, and staying on plan.</p>
        </div>
        <div class="start-split">
          <div class="start-card">
            <h3>On this website</h3>
            <p>The program factory — teaching, intake, and the Burn Engine.</p>
            <ul>
              <li>Seminar-style coaching content</li>
              <li>Body composition & lifestyle intake</li>
              <li>Personalized serving targets</li>
              <li>Program ready for the app</li>
            </ul>
          </div>
          <div class="start-card">
            <h3>In the app</h3>
            <p>Your daily coach — execute the plan every day.</p>
            <ul>
              <li>Custom food plan with gram weights</li>
              <li>Meal logging & fat point tracking</li>
              <li>Grocery list</li>
              <li>Coach Kory messages</li>
            </ul>
          </div>
        </div>
        <div class="btn-stack">
          <button type="button" class="btn-primary" data-start-begin>BEGIN YOUR 8-WEEK PROGRAM →</button>
          <a href="../" class="btn-secondary" style="display:block;text-align:center;text-decoration:none;">Already have a program? Open the app →</a>
        </div>
        <div class="start-footer-link">
          <a href="../">Burn & Build App</a>
        </div>
      </div>
    </div>`;
}

function renderTeaching() {
  const mod = TEACHING[store.teachIndex];
  const isLast = store.teachIndex >= TEACHING.length - 1;
  return `
    <div class="start-site">
      <div class="screen ob-flow">
        <div class="ob-top">
          <button type="button" class="ob-back" data-teach-back>←</button>
          <div class="ob-progress">${TEACHING.map((_, i) => `<span class="${i <= store.teachIndex ? 'filled' : ''}"></span>`).join('')}</div>
        </div>
        <div class="ob-content teach-module">
          <div class="teach-kicker">${mod.kicker}</div>
          <h2>${mod.title}</h2>
          ${mod.body.map((p) => `<p>${p}</p>`).join('')}
          ${mod.quote ? `<div class="teach-quote"><p>${mod.quote.text}</p><cite>— ${mod.quote.by}</cite></div>` : ''}
        </div>
        <div class="ob-footer">
          <button type="button" class="ob-next" data-teach-next>${isLast ? 'PREVIEW YOUR TARGETS →' : 'NEXT →'}</button>
        </div>
      </div>
    </div>`;
}

function ensurePreviewPackage() {
  if (!store.onboardingForm) return null;
  store.builtPackage = buildProgramPackage(store.onboardingForm, {
    startDate: store.startDate,
    label: `${store.onboardingForm.preferredName}'s 8-Week Program`,
  });
  return store.builtPackage;
}

function renderPreview() {
  const pkg = store.builtPackage || ensurePreviewPackage();
  const plan = planFromPackage(pkg);
  if (!plan || !pkg?.intake) {
    return `
      <div class="start-site">
        <div class="screen">
          <p style="padding:24px;color:#ccc;">Could not load plan preview. <button type="button" data-teach-back>Go back</button></p>
        </div>
      </div>`;
  }
  const intake = pkg.intake;
  const s = plan.servings;
  return `
    <div class="start-site">
      <div class="screen ob-flow">
        <div class="ob-top">
          <button type="button" class="ob-back" data-preview-back>←</button>
          <div class="ob-progress"><span class="filled"></span><span class="filled"></span><span></span></div>
        </div>
        <div class="ob-content plan-preview">
          <div class="teach-kicker">${intake.preferredName}'s program</div>
          <h2 class="ob-step-title" style="font-size:32px;margin-bottom:8px;">YOUR DAILY TARGETS</h2>
          <p style="color:var(--muted);margin-bottom:8px;">Built from ${intake.leanBodyMass.toFixed(1)} lbs lean body mass</p>
          <div class="plan-preview-grid">
            <div class="plan-preview-cell"><span>Protein</span><strong>${s.protein}</strong></div>
            <div class="plan-preview-cell"><span>Grains & starches</span><strong>${s.grainsStarches}</strong></div>
            <div class="plan-preview-cell"><span>Fruit</span><strong>${s.fruits}</strong></div>
            <div class="plan-preview-cell"><span>Vegetables</span><strong>${s.vegetables}</strong></div>
            <div class="plan-preview-cell"><span>Fat servings</span><strong>${s.fatMaintain}</strong></div>
            <div class="plan-preview-cell"><span>Est. weekly loss</span><strong>${plan.weeklyFatLossPounds.toFixed(1)} lbs</strong></div>
          </div>
          <p>Reduce calories: <strong>${Math.round(plan.reduceTotalCals)}</strong> · Maintain: <strong>${Math.round(plan.maintainTotalCals)}</strong></p>
          <div class="ob-info" style="margin-top:20px;"><span class="ob-info-icon">📱</span><p>These are your daily targets — locked into your program package. Your full custom food plan with gram weights, meal logging, and coaching lives in the app after you open your program.</p></div>
        </div>
        <div class="ob-footer">
          <button type="button" class="ob-next" data-preview-next>CHOOSE START DATE →</button>
        </div>
      </div>
    </div>`;
}

function renderSchedule() {
  return `
    <div class="start-site">
      <div class="screen ob-flow">
        <div class="ob-top">
          <button type="button" class="ob-back" data-schedule-back>←</button>
          <div class="ob-progress"><span class="filled"></span><span class="filled"></span><span class="filled"></span></div>
        </div>
        <div class="ob-content">
          <div class="teach-kicker">Program calendar</div>
          <h2 class="ob-step-title" style="font-size:32px;">WHEN DO YOU START?</h2>
          <p style="color:#ccc;line-height:1.6;margin:16px 0;">Day 1 unlocks Coach Kory's daily messages and starts your 8-week (56-day) program clock in the app.</p>
          <div class="start-date-field">
            <label>Program start date</label>
            <input type="date" name="startDate" value="${store.startDate}" />
          </div>
          <div class="ob-info"><span class="ob-info-icon">💡</span><p>Most people start on a Monday. Pick a date you can commit to — grocery shopping done, kitchen ready, mindset set.</p></div>
        </div>
        <div class="ob-footer">
          <button type="button" class="ob-next" data-schedule-next>GENERATE PROGRAM PACKAGE →</button>
        </div>
      </div>
    </div>`;
}

function renderExport() {
  const pkg = store.builtPackage;
  const json = JSON.stringify(pkg, null, 2);
  return `
    <div class="start-site">
      <div class="screen">
        <div class="start-success">
          <div class="check">✓</div>
          <div class="ob-welcome-line1">PROGRAM</div>
          <div class="ob-welcome-line2">READY.</div>
        </div>
        <div class="export-panel" style="padding:0 24px;">
          <p style="color:#ccc;line-height:1.6;">Your 8-week program is ready. It will be waiting for you in the Burn & Build app.</p>
          <div class="export-actions">
            <a href="${store.importUrl}" class="btn-primary" style="display:block;text-align:center;text-decoration:none;">OPEN IN APP →</a>
            <button type="button" class="btn-secondary" data-copy-import-link>COPY APP LINK</button>
            <button type="button" class="btn-secondary" data-download-package>SAVE PROGRAM FILE</button>
          </div>
          <div class="export-note">
            <strong>On the same device?</strong> Tap <em>Open in App</em>. On another device, use <em>Save Program File</em> and then <em>Open Program</em> in the app.
          </div>
          <textarea readonly aria-label="Program JSON">${json}</textarea>
        </div>
        <div class="start-footer-link">
          <a href="../">← Back to Burn & Build App</a>
        </div>
      </div>
    </div>`;
}

function renderOnboardingWrapper() {
  const fakeStore = {
    onboardingForm: store.onboardingForm,
    onboardingPage: store.onboardingPage,
    onboardingEditMode: false,
  };
  return `<div class="start-site">${renderOnboarding(fakeStore)}</div>`;
}

function render() {
  const root = document.getElementById('app');
  if (store.phase === 'landing') root.innerHTML = renderLanding();
  else if (store.phase === 'onboarding') {
    root.innerHTML = renderOnboardingWrapper();
    bindOnboardingOnly();
    return;
  } else if (store.phase === 'teach') root.innerHTML = renderTeaching();
  else if (store.phase === 'preview') root.innerHTML = renderPreview();
  else if (store.phase === 'schedule') root.innerHTML = renderSchedule();
  else if (store.phase === 'export') root.innerHTML = renderExport();
}

function onboardingStore() {
  return {
    onboardingForm: store.onboardingForm,
    onboardingPage: store.onboardingPage,
    onboardingEditMode: false,
    profile: null,
  };
}

function onboardingCallbacks() {
  return {
    render: renderOnboardingStep,
    onConfirm: (form) => {
      store.onboardingForm = form;
      finishIntake();
    },
    onComplete: () => {},
  };
}

function renderOnboardingStep() {
  syncObToStore(store);
  document.getElementById('app').innerHTML = renderOnboardingWrapper();
  bindOnboardingEvents(onboardingStore(), onboardingCallbacks());
}

function bindOnboardingOnly() {
  bindOnboardingEvents(onboardingStore(), onboardingCallbacks());
}

function bindGlobal() {
  if (bindGlobal.done) return;
  bindGlobal.done = true;

  document.getElementById('app').addEventListener('click', (e) => {
    if (e.target.closest('[data-start-begin]')) {
      beginOnboarding();
      return;
    }
    if (e.target.closest('[data-teach-back]')) {
      if (store.teachIndex > 0) store.teachIndex -= 1;
      else store.phase = 'onboarding';
      render();
      return;
    }
    if (e.target.closest('[data-teach-next]')) {
      if (store.teachIndex < TEACHING.length - 1) {
        store.teachIndex += 1;
      } else {
        ensurePreviewPackage();
        store.phase = 'preview';
      }
      render();
      return;
    }
    if (e.target.closest('[data-preview-back]')) {
      store.phase = 'teach';
      store.teachIndex = TEACHING.length - 1;
      render();
      return;
    }
    if (e.target.closest('[data-preview-next]')) {
      store.phase = 'schedule';
      render();
      return;
    }
    if (e.target.closest('[data-schedule-back]')) {
      store.phase = 'preview';
      render();
      return;
    }
    if (e.target.closest('[data-schedule-next]')) {
      buildPackage();
      return;
    }
    if (e.target.closest('[data-download-package]')) {
      downloadProgramPackage(store.builtPackage);
      return;
    }
    if (e.target.closest('[data-copy-import-link]')) {
      copyImportLink();
    }
  });

  document.getElementById('app').addEventListener('change', (e) => {
    if (e.target.matches('input[name="startDate"]')) {
      store.startDate = e.target.value;
    }
  });
}

async function copyImportLink() {
  try {
    await navigator.clipboard.writeText(store.importUrl);
    const btn = document.querySelector('[data-copy-import-link]');
    const prev = btn.textContent;
    btn.textContent = 'COPIED!';
    setTimeout(() => { btn.textContent = prev; }, 2000);
  } catch {
    alert('Copy failed — use Open in App or Save Program File instead.');
  }
}

function beginOnboarding() {
  store.phase = 'onboarding';
  store.onboardingPage = 0;
  const temp = { profile: null };
  initOnboardingForm(temp);
  store.onboardingForm = temp.onboardingForm;
  render();
}

function finishIntake() {
  store.phase = 'teach';
  store.teachIndex = 0;
  render();
}

function buildPackage() {
  store.builtPackage = buildProgramPackage(store.onboardingForm, {
    startDate: store.startDate,
    label: `${store.onboardingForm.preferredName}'s 8-Week Program`,
  });
  store.importUrl = packageToImportUrl(store.builtPackage, '../');
  store.phase = 'export';
  render();
}

bindGlobal();
render();
