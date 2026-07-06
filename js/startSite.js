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
} from './programPackage.js';
import { getAppEmail, persistAppEmail, saveProgramToServer } from './programApi.js';
import { totalOnboardingPages, QUESTION_COUNT, WELCOME_COUNT } from './onboardingEngine.js';
import { parseQuoteBy, renderTestimonyBlock } from './testimonyBlock.js';

const LANDING_URL = 'https://gettheburnandbuildapp.com';

const OWNERSHIP_INCLUDES = [
  'Your personalized 8-week program',
  'Daily food plan in the app',
  'Meal logging',
  'Grocery lists',
  'Progress tracking',
  'Own Burn & Build for life',
];

const TEACHING = [
  {
    kicker: 'Lean body mass',
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
      'The Burn & Build app is where you live your program every day: food plan, logging, grocery list, and progress tracking. It executes the program you build here.',
      'You can revisit this site anytime for deeper teaching. The app stays focused on doing the work every day.',
    ],
  },
];

const store = {
  phase: 'onboarding',
  onboardingPage: 0,
  onboardingForm: null,
  onboardingEditMode: false,
  teachIndex: 0,
  builtPackage: null,
  startDate: defaultStartDate(),
  importUrl: '',
  email: '',
  emailError: '',
  saveError: '',
  showAdvanced: false,
};

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function programName() {
  return store.onboardingForm?.preferredName || store.builtPackage?.intake?.preferredName || '';
}

function confirmOnboardingPage() {
  return totalOnboardingPages() - 2;
}

function persistBuiltPackage() {
  if (!store.builtPackage) return;
  sessionStorage.setItem('bnb_built_package', JSON.stringify(store.builtPackage));
}

function persistFlowState() {
  sessionStorage.setItem('bnb_creator_phase', store.phase);
  if (store.email) {
    sessionStorage.setItem('bnb_app_email', store.email);
  }
  if (store.onboardingForm) {
    sessionStorage.setItem('bnb_onboarding_form', JSON.stringify(store.onboardingForm));
  }
  sessionStorage.setItem('bnb_onboarding_page', String(store.onboardingPage));
}

function restoreFlowState() {
  restoreBuiltPackage();
  store.email = getAppEmail()
    || sessionStorage.getItem('bnb_unlock_email')
    || '';
  const formRaw = sessionStorage.getItem('bnb_onboarding_form');
  if (formRaw) {
    try {
      store.onboardingForm = JSON.parse(formRaw);
    } catch {
      sessionStorage.removeItem('bnb_onboarding_form');
    }
  }
  const page = sessionStorage.getItem('bnb_onboarding_page');
  if (page != null && page !== '') {
    store.onboardingPage = Number(page) || 0;
  }
  const phase = sessionStorage.getItem('bnb_creator_phase');
  const flowPhases = ['email-login', 'onboarding', 'creating', 'plan-ready'];
  if (phase === 'home') {
    sessionStorage.removeItem('bnb_creator_phase');
  } else if (phase && flowPhases.includes(phase)) {
    store.phase = phase;
  }
  if (store.phase === 'email-login' && store.onboardingPage < WELCOME_COUNT + QUESTION_COUNT - 1) {
    store.phase = 'onboarding';
    store.onboardingPage = 0;
  }
}

function restoreBuiltPackage() {
  const raw = sessionStorage.getItem('bnb_built_package');
  if (!raw) return;
  try {
    store.builtPackage = JSON.parse(raw);
    store.importUrl = packageToImportUrl(store.builtPackage, '../shell/');
  } catch {
    sessionStorage.removeItem('bnb_built_package');
  }
}

function renderEmailLogin() {
  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="unlock-panel email-login-panel">
          <div class="ob-welcome-line1">YOUR EMAIL</div>
          <div class="ob-welcome-line2">IS YOUR LOGIN</div>
          <p class="unlock-lead">Your food plan will be created based on your answers. The custom servings created from those answers are transferred to your phone for convenience. The email you provide here links the food plan creator to your app.</p>
          ${store.emailError ? `<div class="unlock-error">${store.emailError}</div>` : ''}
          <label class="unlock-label" for="creator-email">Email address</label>
          <input id="creator-email" class="ob-input ob-input-lg" type="email" name="creatorEmail" value="${store.email}" placeholder="you@example.com" autocomplete="email" />
          <button type="button" class="btn-primary unlock-cta" data-email-continue>CONTINUE →</button>
          <button type="button" class="unlock-back-link" data-email-back>← Back to your answers</button>
        </div>
      </div>
    </div>`;
}

function renderPlanReady() {
  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="start-success">
          <div class="check">✓</div>
          <div class="ob-welcome-line1">YOUR FOOD PLAN</div>
          <div class="ob-welcome-line2">IS READY</div>
        </div>
        <div class="unlock-panel">
          <p class="unlock-lead">Your personalized food plan is ready to be installed on the Burn &amp; Build app. If you don't have the app on your phone home screen, install it now. Follow the instructions below.</p>
          <div class="install-box">
            <h3>Install on your home screen</h3>
            <ul class="install-steps">
              <li><strong>iPhone:</strong> Tap Share → <strong>Add to Home Screen</strong></li>
              <li><strong>Android:</strong> Tap the menu → <strong>Install app</strong> or <strong>Add to Home Screen</strong></li>
            </ul>
          </div>
          <a href="../shell/" class="plan-ready-pwa-link">Open Burn &amp; Build app →</a>
          ${store.saveError ? `<div class="unlock-error">${store.saveError}</div>` : ''}
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
          ${mod.quote ? (() => {
            const { name, meta } = parseQuoteBy(mod.quote.by);
            return renderTestimonyBlock({
              quote: mod.quote.text,
              name,
              meta,
              className: 'teach-quote',
            });
          })() : ''}
        </div>
        <div class="ob-footer">
          <button type="button" class="ob-next" data-teach-next>${isLast ? 'CHOOSE START DATE →' : 'NEXT →'}</button>
        </div>
      </div>
    </div>`;
}

function ensureBuiltPackage() {
  if (!store.onboardingForm) return null;
  store.builtPackage = buildProgramPackage(store.onboardingForm, {
    label: `${store.onboardingForm.preferredName}'s 8-Week Program`,
  });
  store.importUrl = packageToImportUrl(store.builtPackage, '../shell/');
  persistBuiltPackage();
  return store.builtPackage;
}

function renderCreating() {
  const name = programName();
  return `
    <div class="start-site">
      <div class="screen unlock-screen creating-screen">
        <div class="unlock-panel creating-panel">
          <div class="ob-welcome-line1">BUILDING</div>
          <div class="ob-welcome-line2">YOUR PLAN</div>
          <p class="unlock-lead">${name ? `Creating a personalized food plan for ${name}…` : 'Creating your personalized food plan…'}</p>
          <div class="creating-bar" aria-hidden="true"><span></span></div>
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
          <div class="ob-progress"><span class="filled"></span><span class="filled"></span></div>
        </div>
        <div class="ob-content">
          <div class="teach-kicker">Program calendar</div>
          <h2 class="ob-step-title" style="font-size:32px;">WHEN DO YOU START?</h2>
          <p style="color:#ccc;line-height:1.6;margin:16px 0;">Your start date anchors your 8-week program in the app — meal schedule, logging, and grocery tools all follow from there.</p>
          <div class="start-date-field">
            <label>Program start date</label>
            <input type="date" name="startDate" value="${store.startDate}" />
          </div>
          <div class="ob-info"><span class="ob-info-icon">💡</span><p>Most people start on a Monday. Pick a date you can commit to — grocery shopping done, kitchen ready, mindset set.</p></div>
        </div>
        <div class="ob-footer">
          <button type="button" class="ob-next" data-schedule-next>BUILD MY PROGRAM →</button>
        </div>
      </div>
    </div>`;
}

function renderOwnershipList() {
  return `<ul class="unlock-includes">${OWNERSHIP_INCLUDES.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function renderReady() {
  const name = programName();
  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="start-success">
          <div class="check">✓</div>
          <div class="ob-welcome-line1">YOUR PROGRAM</div>
          <div class="ob-welcome-line2">IS READY.</div>
        </div>
        <div class="unlock-panel">
          <p class="unlock-lead">Your personalized 8-week Burn &amp; Build program has been created${name ? ` for ${name}` : ''}. It will be waiting for you in the Burn &amp; Build app.</p>
          <div class="unlock-box">
            <h3>Own Burn &amp; Build for Life</h3>
            ${renderOwnershipList()}
          </div>
          <p class="unlock-tagline">My program is built. Now I'm opening it.</p>
          <button type="button" class="btn-primary unlock-cta" data-unlock-begin>UNLOCK MY PROGRAM →</button>
          <button type="button" class="unlock-back-link" data-ready-back>← Back to start date</button>
        </div>
      </div>
    </div>`;
}

function renderUnlockEmail() {
  const name = programName();
  const lbm = store.builtPackage?.intake?.leanBodyMass;
  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="start-success compact">
          <div class="check">✓</div>
          <div class="ob-welcome-line1">YOUR FOOD PLAN</div>
          <div class="ob-welcome-line2">IS READY.</div>
        </div>
        <div class="unlock-panel">
          <div class="teach-kicker">Step 1 of 3 · Unlock</div>
          <h2 class="unlock-title">Get your custom food plan</h2>
          <p class="unlock-lead">Your 8-week Burn &amp; Build program has been created${name ? ` for ${name}` : ''}${lbm ? ` from ${lbm.toFixed(1)} lbs of lean body mass` : ''}. Enter your email to save it and continue.</p>
          ${store.emailError ? `<div class="unlock-error">${store.emailError}</div>` : ''}
          <label class="unlock-label" for="unlock-email">Email address</label>
          <input id="unlock-email" class="ob-input ob-input-lg" type="email" name="unlockEmail" value="${store.email}" placeholder="you@example.com" autocomplete="email" />
          <button type="button" class="btn-primary unlock-cta" data-unlock-send>SEND MY LINK →</button>
          <button type="button" class="unlock-back-link" data-unlock-back-confirm>← Back to review</button>
        </div>
      </div>
    </div>`;
}

function renderUnlockSent() {
  const verifyUrl = magicLinkUrl();
  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="unlock-panel">
          <div class="teach-kicker">Step 2 of 3</div>
          <h2 class="unlock-title">Check your email</h2>
          <p class="unlock-lead">We sent a secure link to <strong>${store.email}</strong>. Open it on this device to continue.</p>
          <div class="ob-info"><span class="ob-info-icon">✉️</span><p>Your personalized program is already built and waiting. The link unlocks ownership and opens your plan in the app.</p></div>
          <p class="unlock-hint">Didn't get it? Check spam or wait a minute, then try again.</p>
          <button type="button" class="btn-primary unlock-cta" data-unlock-continue>CONTINUE TO PAYMENT →</button>
          <button type="button" class="btn-secondary" data-unlock-resend>RESEND LINK</button>
          <button type="button" class="unlock-back-link" data-unlock-back-email>← Change email</button>
          <p class="unlock-hint">Email delivery is being connected. Continue above to preview the rest of your flow.</p>
          ${isTestMode() ? `
          <details class="unlock-advanced">
            <summary>Testing tools</summary>
            <p>Simulates clicking the magic link (remove when Signal+ email is live).</p>
            <a href="${verifyUrl}" class="btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-top:8px;">Simulate magic link →</a>
          </details>` : ''}
        </div>
      </div>
    </div>`;
}

function renderUnlockPay() {
  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="unlock-panel">
          <div class="teach-kicker">Step 3 of 3</div>
          <h2 class="unlock-title">Complete your ownership</h2>
          <p class="unlock-lead">One-time purchase. Own Burn &amp; Build for life — your program and daily tools in the app.</p>
          <div class="unlock-box">
            <h3>Lifetime ownership includes</h3>
            ${renderOwnershipList()}
          </div>
          <button type="button" class="btn-primary unlock-cta" data-unlock-purchase>COMPLETE OWNERSHIP →</button>
          <p class="unlock-hint">Secure checkout · No subscription · Yours for life</p>
        </div>
      </div>
    </div>`;
}

function renderOpen() {
  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="start-success">
          <div class="check">✓</div>
          <div class="ob-welcome-line1">YOU'RE</div>
          <div class="ob-welcome-line2">IN.</div>
        </div>
        <div class="unlock-panel">
          <p class="unlock-lead">Your program is waiting in the Burn &amp; Build app. Tap below to open it — no files, no transfer, just your plan.</p>
          <a href="${store.importUrl}" class="btn-primary unlock-cta" style="display:block;text-align:center;text-decoration:none;">OPEN MY PROGRAM →</a>
          <p class="unlock-tagline">Eat the food. Trust the plan.</p>
          ${renderAdvancedFallback()}
        </div>
      </div>
    </div>`;
}

function renderAdvancedFallback() {
  return `
    <details class="unlock-advanced">
      <summary>Having trouble opening your program?</summary>
      <p>For support staff or edge cases only — most users should tap Open My Program above.</p>
      <div class="export-actions">
        <button type="button" class="btn-secondary" data-download-package>Save program file</button>
        <button type="button" class="btn-secondary" data-copy-import-link>Copy app link</button>
      </div>
    </details>`;
}

function isTestMode() {
  return location.hostname.includes('github.io') || location.hostname === 'localhost' || location.search.includes('test=1');
}

function magicLinkUrl() {
  const url = new URL(location.href);
  url.searchParams.set('unlock', 'verified');
  url.searchParams.delete('phase');
  return url.toString();
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
  if (store.phase === 'email-login') root.innerHTML = renderEmailLogin();
  else if (store.phase === 'onboarding') {
    root.innerHTML = renderOnboardingWrapper();
    bindOnboardingOnly();
    persistFlowState();
    return;
  } else if (store.phase === 'creating') root.innerHTML = renderCreating();
  else if (store.phase === 'plan-ready') root.innerHTML = renderPlanReady();
  persistFlowState();
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
    onBeforeAdvance: (page, phase) => {
      if (phase.kind !== 'question' || phase.index !== QUESTION_COUNT - 1) return true;
      const email = (store.email || getAppEmail() || '').trim();
      if (validEmail(email)) return true;
      store.phase = 'email-login';
      persistFlowState();
      render();
      return false;
    },
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

function submitEmailLogin() {
  const input = document.querySelector('[name="creatorEmail"]');
  const email = (input?.value || store.email || getAppEmail() || '').trim();
  if (!validEmail(email)) {
    store.emailError = 'Enter a valid email address.';
    store.email = email;
    render();
    input?.focus();
    return;
  }

  store.email = persistAppEmail(email);
  store.emailError = '';
  store.phase = 'onboarding';
  store.onboardingPage = confirmOnboardingPage();
  render();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function sendMagicLink() {
  const input = document.querySelector('[name="unlockEmail"]');
  const email = (input?.value || store.email || '').trim();
  if (!validEmail(email)) {
    store.emailError = 'Enter a valid email address.';
    store.email = email;
    render();
    input?.focus();
    return;
  }
  store.email = email;
  store.emailError = '';
  sessionStorage.setItem('bnb_unlock_email', email);
  // TODO: Signal+ magic link API — POST email, send link with ?unlock=verified&token=...
  store.phase = 'unlock-sent';
  render();
}

function handleUnlockVerified() {
  store.email = sessionStorage.getItem('bnb_unlock_email') || store.email;
  store.phase = 'unlock-pay';
  const url = new URL(location.href);
  url.searchParams.delete('unlock');
  history.replaceState({}, '', url.pathname + url.search);
  render();
}

function completePurchase() {
  // TODO: Stripe checkout — webhook grants ownership, server attaches program to account
  sessionStorage.setItem('bnb_ownership', 'true');
  store.phase = 'open';
  render();
}

function buildProgramReady() {
  ensureBuiltPackage();
  store.phase = 'ready';
  render();
}

function bindGlobal() {
  if (bindGlobal.done) return;
  bindGlobal.done = true;

  document.getElementById('app').addEventListener('click', (e) => {
    if (e.target.closest('[data-email-continue]')) {
      submitEmailLogin();
      return;
    }
    if (e.target.closest('[data-email-back]')) {
      if (store.onboardingForm) {
        store.phase = 'onboarding';
        store.onboardingPage = WELCOME_COUNT + QUESTION_COUNT - 1;
        store.emailError = '';
        render();
        return;
      }
      window.location.href = LANDING_URL;
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

  document.getElementById('app').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[name="creatorEmail"]')) {
      e.preventDefault();
      submitEmailLogin();
    }
  });
}

async function copyImportLink() {
  try {
    await navigator.clipboard.writeText(store.importUrl);
    const btn = document.querySelector('[data-copy-import-link]');
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = 'COPIED!';
    setTimeout(() => { btn.textContent = prev; }, 2000);
  } catch {
    alert('Could not copy link. Use Open My Program instead.');
  }
}

function initStartSite() {
  restoreFlowState();
  if (!store.onboardingForm) {
    const temp = { profile: null };
    initOnboardingForm(temp);
    store.onboardingForm = temp.onboardingForm;
  }
}

function finishIntake() {
  const email = store.email || getAppEmail();
  if (!email) {
    store.phase = 'email-login';
    store.emailError = 'Enter your email so we can save your food plan.';
    render();
    return;
  }
  store.email = persistAppEmail(email);
  store.phase = 'creating';
  store.saveError = '';
  render();
  window.setTimeout(async () => {
    ensureBuiltPackage();
    const saved = await saveProgramToServer(store.email, store.builtPackage);
    if (!saved.ok) {
      store.saveError = saved.message || 'Could not save your plan.';
    }
    store.phase = 'plan-ready';
    render();
  }, 900);
}

bindGlobal();
initStartSite();
render();
