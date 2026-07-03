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
import {
  bindHomeEvents,
  createHomeState,
  renderWebsiteHome,
} from './websiteHome.js';
import { totalOnboardingPages } from './onboardingEngine.js';

const OWNERSHIP_INCLUDES = [
  'Your personalized 8-week program',
  'Coaching from Coach Kory',
  'Meal logging',
  'Grocery lists',
  'Progress tracking',
  'Own Burn & Build for life',
];

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
  phase: 'home',
  home: createHomeState(),
  onboardingPage: 1,
  onboardingForm: null,
  onboardingEditMode: false,
  teachIndex: 0,
  builtPackage: null,
  startDate: defaultStartDate(),
  importUrl: '',
  email: '',
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

function beginProgramCreation() {
  store.phase = 'onboarding';
  store.onboardingPage = 1;
  window.scrollTo(0, 0);
  render();
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
          <button type="button" class="ob-next" data-teach-next>${isLast ? 'CHOOSE START DATE →' : 'NEXT →'}</button>
        </div>
      </div>
    </div>`;
}

function ensureBuiltPackage() {
  if (!store.onboardingForm) return null;
  store.builtPackage = buildProgramPackage(store.onboardingForm, {
    startDate: store.startDate,
    label: `${store.onboardingForm.preferredName}'s 8-Week Program`,
  });
  store.importUrl = packageToImportUrl(store.builtPackage, '../');
  return store.builtPackage;
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
          <p style="color:#ccc;line-height:1.6;margin:16px 0;">Day 1 unlocks Coach Kory's daily messages and starts your 8-week (56-day) program clock in the app.</p>
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
          <p class="unlock-tagline">My coach built my program. Now I'm opening it.</p>
          <button type="button" class="btn-primary unlock-cta" data-unlock-begin>UNLOCK MY PROGRAM →</button>
          <button type="button" class="unlock-back-link" data-ready-back>← Back to start date</button>
        </div>
      </div>
    </div>`;
}

function renderUnlockEmail() {
  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="unlock-panel">
          <div class="teach-kicker">Step 1 of 3</div>
          <h2 class="unlock-title">Own Burn &amp; Build for life</h2>
          <p class="unlock-lead">Enter your email. We'll send you a secure link to unlock your program and open it in the app.</p>
          ${store.emailError ? `<div class="unlock-error">${store.emailError}</div>` : ''}
          <label class="unlock-label" for="unlock-email">Email address</label>
          <input id="unlock-email" class="ob-input ob-input-lg" type="email" name="unlockEmail" value="${store.email}" placeholder="you@example.com" autocomplete="email" />
          <button type="button" class="btn-primary unlock-cta" data-unlock-send>SEND MY LINK →</button>
          <button type="button" class="unlock-back-link" data-unlock-back-ready>← Back</button>
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
          <button type="button" class="btn-secondary" data-unlock-resend>RESEND LINK</button>
          <button type="button" class="unlock-back-link" data-unlock-back-email>← Change email</button>
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
          <p class="unlock-lead">One-time purchase. Own Burn &amp; Build for life — your program, coaching, and daily tools in the app.</p>
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
          <p class="unlock-lead">Your program is waiting in the Burn &amp; Build app. Tap below to open it — no files, no transfer, just your coach and your plan.</p>
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
  return `<div class="start-site">${renderOnboarding(fakeStore, {
    progressStart: 1,
    firstStepLabel: 'GET STARTED  →',
  })}</div>`;
}

function render() {
  const root = document.getElementById('app');
  if (store.phase === 'home') {
    root.innerHTML = renderWebsiteHome(store.home);
    bindHomeEvents(root, store.home, { onCreateProgram: beginProgramCreation });
    return;
  } else if (store.phase === 'onboarding') {
    root.innerHTML = renderOnboardingWrapper();
    bindOnboardingOnly();
    return;
  } else if (store.phase === 'teach') root.innerHTML = renderTeaching();
  else if (store.phase === 'schedule') root.innerHTML = renderSchedule();
  else if (store.phase === 'ready') root.innerHTML = renderReady();
  else if (store.phase === 'unlock-email') root.innerHTML = renderUnlockEmail();
  else if (store.phase === 'unlock-sent') root.innerHTML = renderUnlockSent();
  else if (store.phase === 'unlock-pay') root.innerHTML = renderUnlockPay();
  else if (store.phase === 'open') root.innerHTML = renderOpen();
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
    if (e.target.closest('[data-teach-back]')) {
      if (store.teachIndex > 0) store.teachIndex -= 1;
      else {
        store.phase = 'onboarding';
        store.onboardingPage = totalOnboardingPages() - 1;
      }
      render();
      return;
    }
    if (e.target.closest('[data-teach-next]')) {
      if (store.teachIndex < TEACHING.length - 1) {
        store.teachIndex += 1;
      } else {
        store.phase = 'schedule';
      }
      render();
      return;
    }
    if (e.target.closest('[data-schedule-back]')) {
      store.phase = 'teach';
      store.teachIndex = TEACHING.length - 1;
      render();
      return;
    }
    if (e.target.closest('[data-schedule-next]')) {
      buildProgramReady();
      return;
    }
    if (e.target.closest('[data-ready-back]')) {
      store.phase = 'schedule';
      render();
      return;
    }
    if (e.target.closest('[data-unlock-begin]')) {
      store.phase = 'unlock-email';
      render();
      return;
    }
    if (e.target.closest('[data-unlock-back-ready]')) {
      store.phase = 'ready';
      render();
      return;
    }
    if (e.target.closest('[data-unlock-send]')) {
      sendMagicLink();
      return;
    }
    if (e.target.closest('[data-unlock-back-email]')) {
      store.phase = 'unlock-email';
      render();
      return;
    }
    if (e.target.closest('[data-unlock-resend]')) {
      sendMagicLink();
      return;
    }
    if (e.target.closest('[data-unlock-purchase]')) {
      completePurchase();
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
      if (store.builtPackage) ensureBuiltPackage();
    }
  });

  document.getElementById('app').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[name="unlockEmail"]')) {
      e.preventDefault();
      sendMagicLink();
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
  if (store.onboardingForm) return;
  const temp = { profile: null };
  initOnboardingForm(temp);
  store.onboardingForm = temp.onboardingForm;
}

function finishIntake() {
  store.phase = 'teach';
  store.teachIndex = 0;
  render();
}

function initFromUrl() {
  const params = new URLSearchParams(location.search);
  if (params.get('unlock') === 'verified') {
    handleUnlockVerified();
    return;
  }
  if (params.get('unlock') === 'open' && sessionStorage.getItem('bnb_ownership') === 'true') {
    store.email = sessionStorage.getItem('bnb_unlock_email') || '';
    ensureBuiltPackage();
    store.phase = 'open';
  }
}

bindGlobal();
initFromUrl();
initStartSite();
render();
