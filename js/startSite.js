import {
  bindOnboardingEvents,
  initOnboardingForm,
  refreshPersonalDetailFields,
  syncObToStore,
} from './onboardingUI.js?v=116';
import { renderAccordion, bindAccordionEvents, syncAccordionSection, applyPendingAccordionFocus } from './onboardingAccordion.js?v=117';
import {
  buildProgramPackage,
  downloadProgramPackage,
  localDateKey,
  packageToImportUrl,
} from './programPackage.js';
import { getAppEmail, persistAppEmail, saveProgramToServer, isValidEmail, fetchProgramFromServer } from './programApi.js';
import { lookupContact } from './contactsApi.js';
import {
  completeCheckoutForTest,
  createCheckoutSession,
  fetchCheckoutStatus,
  verifyCheckoutSession,
} from './checkoutApi.js';
import { totalOnboardingPages, QUESTION_COUNT, WELCOME_COUNT } from './onboardingEngine.js?v=102';
import { initFocusFlow, syncFocusFlow } from './startViewport.js';

const LANDING_URL = 'https://gettheburnandbuildapp.com';

const OWNERSHIP_INCLUDES = [
  'Your personalized 8-week program',
  'Daily diet in the app',
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
    quote: { text: 'Nutrition is everything. You got the science figured out years before anyone else. At 62, I still weigh and measure every meal every day — 40 years and counting.', by: 'Paul, 40 years on the plan' },
  },
  {
    kicker: 'Website + App',
    title: 'Two parts. One system.',
    body: [
      'This website is where your personalized program is created — the same role the live seminar played for decades. Teaching, intake, and the Burn Engine all happen here.',
      'The Burn & Build app is where you live your program every day: diet, logging, grocery list, and progress tracking. It executes the program you create here.',
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
  accordionSection: 'intro',
  reviewViewed: false,
  accordionEditReturn: null,
  accordionPendingFocus: null,
  accessGranted: false,
  apiReachable: true,
  stripeConfigured: false,
  checkoutTestBypass: false,
  checkoutError: '',
  checkoutMessage: '',
  checkoutBusy: false,
  checkoutVerified: false,
  saveBusy: false,
};

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return localDateKey(d);
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
    sessionStorage.setItem('bnb_onboarding_form_version', String(ONBOARDING_FORM_VERSION));
  }
  sessionStorage.setItem('bnb_onboarding_page', String(store.onboardingPage));
  if (store.accordionSection) {
    sessionStorage.setItem('bnb_accordion_section', store.accordionSection);
  }
  if (store.accordionMax != null) {
    sessionStorage.setItem('bnb_accordion_max', String(store.accordionMax));
  }
  sessionStorage.setItem('bnb_accordion_layout_version', String(ACCORDION_LAYOUT_VERSION));
  sessionStorage.setItem('bnb_review_viewed', store.reviewViewed ? '1' : '0');
}

const ONBOARDING_FORM_VERSION = 8;
const ACCORDION_LAYOUT_VERSION = 1;

function restoreFlowState() {
  restoreBuiltPackage();
  store.email = getAppEmail()
    || sessionStorage.getItem('bnb_unlock_email')
    || '';
  const savedFormVersion = Number(sessionStorage.getItem('bnb_onboarding_form_version') || 0);
  if (savedFormVersion < ONBOARDING_FORM_VERSION) {
    sessionStorage.removeItem('bnb_onboarding_form');
    sessionStorage.removeItem('bnb_accordion_section');
    sessionStorage.removeItem('bnb_accordion_max');
    sessionStorage.removeItem('bnb_review_viewed');
    sessionStorage.setItem('bnb_onboarding_form_version', String(ONBOARDING_FORM_VERSION));
  }
  const savedLayoutVersion = Number(sessionStorage.getItem('bnb_accordion_layout_version') || 0);
  const layoutMigrated = savedLayoutVersion < ACCORDION_LAYOUT_VERSION;
  if (layoutMigrated) {
    sessionStorage.removeItem('bnb_accordion_section');
    sessionStorage.removeItem('bnb_accordion_max');
    sessionStorage.removeItem('bnb_review_viewed');
    sessionStorage.setItem('bnb_accordion_layout_version', String(ACCORDION_LAYOUT_VERSION));
    store.accordionSection = 'intro';
    store.accordionMax = 0;
    store.reviewViewed = false;
  }
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
  if (!layoutMigrated) {
    const accSection = sessionStorage.getItem('bnb_accordion_section');
    if (accSection) store.accordionSection = accSection;
    const accMax = sessionStorage.getItem('bnb_accordion_max');
    if (accMax != null && accMax !== '') store.accordionMax = Number(accMax) || 0;
    store.reviewViewed = sessionStorage.getItem('bnb_review_viewed') === '1';
  }
  const phase = sessionStorage.getItem('bnb_creator_phase');
  const flowPhases = ['email-login', 'onboarding', 'creating', 'plan-ready'];
  if (phase === 'home') {
    sessionStorage.removeItem('bnb_creator_phase');
  } else if (phase && flowPhases.includes(phase)) {
    store.phase = phase;
  }
  if (store.phase === 'email-login') {
    store.phase = 'onboarding';
    store.accordionSection = 'intro';
    store.accordionMax = 0;
  }
}

function restoreBuiltPackage() {
  const raw = sessionStorage.getItem('bnb_built_package');
  if (!raw) return;
  try {
    store.builtPackage = JSON.parse(raw);
    store.importUrl = packageToImportUrl(store.builtPackage, '../myplan/');
  } catch {
    sessionStorage.removeItem('bnb_built_package');
  }
}

async function restoreBuiltPackageFromServer(email) {
  if (store.builtPackage) return true;
  if (!isValidEmail(email)) return false;
  const result = await fetchProgramFromServer(email);
  if (!result.ok || !result.package) return false;
  store.builtPackage = result.package;
  store.importUrl = packageToImportUrl(store.builtPackage, '../myplan/');
  persistBuiltPackage();
  return true;
}

function myplanHandoffUrl() {
  restoreBuiltPackage();
  if (store.builtPackage) {
    return packageToImportUrl(store.builtPackage, '../myplan/');
  }
  const email = (store.email || getAppEmail() || '').trim();
  if (isValidEmail(email)) {
    return `../myplan/?email=${encodeURIComponent(email)}`;
  }
  return '../myplan/';
}

const BROWSE_MODE_KEY = 'bnb_browse_mode';

function setBrowseModeFlag() {
  try {
    sessionStorage.setItem(BROWSE_MODE_KEY, '1');
  } catch (e) {}
}

function isBrowseMode() {
  if (new URLSearchParams(location.search).has('browse')) {
    setBrowseModeFlag();
    return true;
  }
  try {
    return sessionStorage.getItem(BROWSE_MODE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function shouldAllowCreatorInStandalone() {
  if (isBrowseMode()) return true;
  const params = new URLSearchParams(location.search);
  if (params.has('checkout') || params.has('session_id')) return true;
  const phase = sessionStorage.getItem('bnb_creator_phase');
  return phase === 'creating' || phase === 'plan-ready';
}

function escapeStandaloneToMyplan() {
  const standalone = isStandaloneDisplay();
  if (!standalone || shouldAllowCreatorInStandalone()) return false;
  const email = (store.email || getAppEmail() || '').trim();
  const q = isValidEmail(email) ? `?email=${encodeURIComponent(email)}` : '';
  window.location.replace(`../myplan/${q}`);
  return true;
}

async function openMyplanApp() {
  restoreBuiltPackage();
  const email = (store.email || getAppEmail() || store.builtPackage?.intake?.email || '').trim();
  if (isValidEmail(email)) persistAppEmail(email);
  if (store.builtPackage) {
    if (isValidEmail(email)) {
      store.saveBusy = true;
      store.saveError = '';
      const saved = await saveProgramToServer(email, store.builtPackage);
      store.saveBusy = false;
      if (!saved.ok) {
        store.saveError = saved.message || 'Could not save your plan to your account.';
        render();
        return;
      }
      if (saved.programId && store.builtPackage?.program) {
        store.builtPackage.program.id = saved.programId;
        persistBuiltPackage();
      }
    }
    try {
      sessionStorage.setItem('bnb_pending_import', JSON.stringify(store.builtPackage));
    } catch (err) {
      console.error(err);
    }
  }
  const q = isValidEmail(email) ? `?email=${encodeURIComponent(email)}` : '';
  window.location.href = `../myplan/${q}`;
}

function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;
}

function renderPwaInstallBox() {
  if (isStandaloneDisplay()) return '';
  return `
          <div class="install-box">
            <h3>Add to your home screen</h3>
            <p class="install-lead">Open the app first — then add <strong>that page</strong> to your home screen (not this creator page).</p>
            <ol class="install-steps">
              <li>Tap <strong>Open Burn &amp; Build app</strong> above and wait for your diet to load</li>
              <li><strong>iPhone:</strong> Share → <strong>Add to Home Screen</strong></li>
              <li><strong>Android:</strong> Menu → <strong>Install app</strong> or <strong>Add to Home Screen</strong></li>
            </ol>
          </div>`;
}

function renderPlanReadyAppHandoff(unlocked) {
  return `
          <button type="button" class="btn-primary unlock-cta plan-ready-open-app" data-open-myplan>Open Burn &amp; Build app →</button>
          <p class="unlock-tagline">${unlocked ? 'Eat the food. Trust the plan.' : 'Open your diet, then follow the install steps below.'}</p>`;
}

function renderPlanReady() {
  restoreBuiltPackage();
  const unlocked = store.accessGranted || store.checkoutVerified;
  let lead;
  if (unlocked) {
    lead = 'Your personalized diet is ready in the Burn &amp; Build app.';
  } else if (store.saveError) {
    lead = 'Your diet is ready on this device. Save it to your account, then complete checkout.';
  } else {
    lead = 'Your personalized diet is saved. Complete checkout to unlock the app.';
  }

  const checkoutBlock = !unlocked
    ? !store.apiReachable ? `
          <p class="unlock-hint">Could not reach the Burn &amp; Build server. Check your connection and try again.</p>
          ${store.saveError ? `<button type="button" class="btn-secondary unlock-cta-secondary" data-retry-save ${store.saveBusy ? 'disabled' : ''}>${store.saveBusy ? 'SAVING…' : 'Retry save'}</button>` : ''}`
      : store.stripeConfigured ? `
          <button type="button" class="btn-primary unlock-cta" data-start-checkout ${store.checkoutBusy ? 'disabled' : ''}>
            ${store.checkoutBusy ? 'OPENING CHECKOUT…' : 'COMPLETE PURCHASE — $149'}
          </button>
          <p class="unlock-hint">Secure checkout · Promo codes accepted · One-time · Yours for life</p>
          ${store.checkoutTestBypass ? '<button type="button" class="btn-secondary unlock-cta-secondary" data-test-checkout>Skip payment (test)</button>' : ''}`
      : `
          <p class="unlock-hint">Checkout is not available yet. Contact support@gettheburnandbuildapp.com if you need help.</p>
          ${store.checkoutTestBypass ? '<button type="button" class="btn-secondary unlock-cta-secondary" data-test-checkout>Skip payment (test)</button>' : ''}`
    : '';

  const saveActions = !unlocked && store.saveError && store.apiReachable
    ? `<button type="button" class="btn-secondary unlock-cta-secondary" data-retry-save ${store.saveBusy ? 'disabled' : ''}>${store.saveBusy ? 'SAVING…' : 'Retry save'}</button>`
    : '';

  return `
    <div class="start-site">
      <div class="screen unlock-screen">
        <div class="start-success">
          <div class="check">✓</div>
          <div class="ob-welcome-line1">YOUR DIET</div>
          <div class="ob-welcome-line2">IS READY</div>
        </div>
        <div class="unlock-panel">
          <p class="unlock-lead">${lead}</p>
          ${store.checkoutMessage ? `<div class="ob-info"><span class="ob-info-icon">ℹ️</span><p>${store.checkoutMessage}</p></div>` : ''}
          ${checkoutBlock}
          ${saveActions}
          ${renderPlanReadyAppHandoff(unlocked)}
          ${renderPwaInstallBox()}
          ${store.checkoutError ? `<div class="unlock-error">${store.checkoutError}</div>` : ''}
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
    startDate: store.startDate || undefined,
    label: `${store.onboardingForm.preferredName}'s 8-Week Program`,
  });
  store.importUrl = packageToImportUrl(store.builtPackage, '../myplan/');
  persistBuiltPackage();
  return store.builtPackage;
}

async function runPlanCreation() {
  ensureBuiltPackage();
  persistBuiltPackage();
  const ok = await savePlanToServer();
  store.phase = 'plan-ready';
  sessionStorage.setItem('bnb_creator_phase', 'plan-ready');
  await renderPlanReadyPhase();
  if (!ok) render();
}

function renderCreating() {
  const name = programName();
  return `
    <div class="start-site">
      <div class="screen unlock-screen creating-screen">
        <div class="unlock-panel creating-panel">
          <div class="ob-welcome-line1">CREATING</div>
          <div class="ob-welcome-line2">YOUR PLAN</div>
          <p class="unlock-lead">${name ? `Creating a personalized diet for ${name}…` : 'Creating your personalized diet…'}</p>
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
          <button type="button" class="ob-next" data-schedule-next>CREATE MY PROGRAM →</button>
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
          <div class="ob-welcome-line1">YOUR DIET</div>
          <div class="ob-welcome-line2">IS READY.</div>
        </div>
        <div class="unlock-panel">
          <div class="teach-kicker">Step 1 of 3 · Unlock</div>
          <h2 class="unlock-title">Get your custom diet</h2>
          <p class="unlock-lead">Your 8-week Burn &amp; Build program has been created${name ? ` for ${name}` : ''}${lbm ? ` from ${lbm.toFixed(1)} lbs of lean body mass` : ''}. Enter your email to connect it to your phone and continue.</p>
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
  syncAccordionSection(store);
  const fakeStore = {
    onboardingForm: store.onboardingForm,
    onboardingPage: store.onboardingPage,
    onboardingEditMode: false,
    accordionSection: store.accordionSection,
    accordionMax: store.accordionMax,
    reviewViewed: store.reviewViewed,
    accordionEditReturn: store.accordionEditReturn,
  };
  return `<div class="start-site">${renderAccordion(fakeStore)}</div>`;
}

function afterRender() {
  syncFocusFlow();
  persistFlowState();
}

async function refreshCheckoutConfig() {
  const status = await fetchCheckoutStatus();
  store.apiReachable = status.reachable !== false;
  store.stripeConfigured = !!status.configured;
  store.checkoutTestBypass = !!status.testBypass || isTestMode();
}

async function savePlanToServer() {
  if (!isValidEmail(store.email)) {
    store.saveError = 'Enter a valid email address.';
    return false;
  }
  ensureBuiltPackage();
  if (!store.builtPackage) {
    store.saveError = 'No diet to save.';
    return false;
  }
  store.saveBusy = true;
  store.saveError = '';
  const saved = await saveProgramToServer(store.email, store.builtPackage);
  store.saveBusy = false;
  if (!saved.ok) {
    store.saveError = saved.message || 'Could not save your plan.';
    return false;
  }
  if (saved.programId && store.builtPackage?.program) {
    store.builtPackage.program.id = saved.programId;
    persistBuiltPackage();
  }
  persistAppEmail(store.email);
  store.saveError = '';
  return true;
}

async function refreshAccessState() {
  if (!isValidEmail(store.email)) {
    store.accessGranted = false;
    return;
  }
  const result = await lookupContact(store.email);
  store.accessGranted = !!(result.ok && result.contact?.burnAndBuild);
}

function cleanCheckoutQuery() {
  const url = new URL(location.href);
  url.searchParams.delete('checkout');
  url.searchParams.delete('session_id');
  history.replaceState({}, '', `${url.pathname}${url.search}`);
}

async function handleCheckoutReturn() {
  const params = new URLSearchParams(location.search);
  const checkoutState = params.get('checkout');
  if (!checkoutState) return;

  store.phase = 'plan-ready';
  sessionStorage.setItem('bnb_creator_phase', 'plan-ready');

  if (checkoutState === 'cancel') {
    store.checkoutMessage = 'Checkout was canceled. Your plan is still saved — complete purchase when you are ready.';
    cleanCheckoutQuery();
    return;
  }

  if (checkoutState !== 'success') return;

  const sessionId = params.get('session_id');
  if (!sessionId) {
    store.checkoutError = 'Missing checkout session. Contact support if you were charged.';
    cleanCheckoutQuery();
    return;
  }

  store.checkoutBusy = true;
  const result = await verifyCheckoutSession(sessionId);
  store.checkoutBusy = false;
  cleanCheckoutQuery();

  if (!result.ok) {
    store.checkoutError = result.message || 'Could not verify payment.';
    return;
  }

  if (result.email) {
    store.email = persistAppEmail(result.email);
  }
  await restoreBuiltPackageFromServer(store.email);

  store.checkoutMessage = 'Payment complete. Your Burn & Build app access is unlocked.';
  store.checkoutVerified = true;
  await refreshAccessState();
}

async function retrySavePlan() {
  if (store.saveBusy) return;
  const ok = await savePlanToServer();
  if (ok) await refreshCheckoutConfig();
  render();
}

async function startCheckout() {
  if (!isValidEmail(store.email)) {
    store.checkoutError = 'Enter a valid email address before checkout.';
    render();
    return;
  }
  store.checkoutError = '';
  store.checkoutMessage = '';
  store.checkoutBusy = true;
  render();

  const programId = store.builtPackage?.program?.id;
  const result = await createCheckoutSession(store.email, programId);
  store.checkoutBusy = false;

  if (!result.ok || !result.url) {
    store.checkoutError = result.message || 'Could not start checkout.';
    render();
    return;
  }

  window.location.href = result.url;
}

async function completeTestCheckout() {
  store.checkoutError = '';
  store.checkoutMessage = '';
  const result = await completeCheckoutForTest(store.email);
  if (!result.ok) {
    store.checkoutError = result.message || 'Test checkout failed.';
    render();
    return;
  }
  store.checkoutMessage = 'Test access granted.';
  await refreshAccessState();
  render();
}

async function preparePlanReadyState() {
  await refreshCheckoutConfig();
  await handleCheckoutReturn();
  await refreshAccessState();
}

function render() {
  const root = document.getElementById('app');
  if (!root) return;
  if (store.phase === 'onboarding') {
    root.innerHTML = renderOnboardingWrapper();
    bindOnboardingOnly();
  } else if (store.phase === 'creating') {
    root.innerHTML = renderCreating();
  } else if (store.phase === 'plan-ready') {
    root.innerHTML = renderPlanReady();
  } else {
    store.phase = 'onboarding';
    root.innerHTML = renderOnboardingWrapper();
    bindOnboardingOnly();
  }
  afterRender();
}

async function renderPlanReadyPhase() {
  store.phase = 'plan-ready';
  await preparePlanReadyState();
  render();
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
  bindOnboardingOnly();
  syncFocusFlow();
}

function bindOnboardingOnly() {
  bindOnboardingEvents(onboardingStore(), onboardingCallbacks());
  bindAccordionEvents(store, {
    render: renderOnboardingStep,
    onConfirm: (form) => {
      store.onboardingForm = form;
      finishIntake();
    },
  });
  refreshPersonalDetailFields(store.onboardingForm);
  applyPendingAccordionFocus(store);
}

function sendMagicLink() {
  const input = document.querySelector('[name="unlockEmail"]');
  const email = (input?.value || store.email || '').trim();
  if (!isValidEmail(email)) {
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
    if (e.target.closest('[data-download-package]')) {
      downloadProgramPackage(store.builtPackage);
      return;
    }
    if (e.target.closest('[data-copy-import-link]')) {
      copyImportLink();
      return;
    }
    if (e.target.closest('[data-start-checkout]')) {
      startCheckout();
      return;
    }
    if (e.target.closest('[data-retry-save]')) {
      retrySavePlan();
      return;
    }
    if (e.target.closest('[data-open-myplan]')) {
      openMyplanApp().catch((err) => console.error(err));
      return;
    }
    if (e.target.closest('[data-test-checkout]')) {
      completeTestCheckout();
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
  restoreFlowState();
  syncAccordionSection(store);
  if (!store.onboardingForm) {
    const temp = { profile: null };
    initOnboardingForm(temp);
    store.onboardingForm = temp.onboardingForm;
  }
  if (store.email && !store.onboardingForm.email) {
    store.onboardingForm.email = store.email;
  } else if (store.onboardingForm.email && isValidEmail(store.onboardingForm.email)) {
    store.email = store.onboardingForm.email;
  }
}

function openPersonalForEmail() {
  store.phase = 'onboarding';
  store.accordionSection = 'personal';
  render();
}

function finishIntake() {
  const email = (store.onboardingForm?.email || store.email || getAppEmail() || '').trim();
  if (!isValidEmail(email)) {
    openPersonalForEmail();
    return;
  }
  store.onboardingForm.email = persistAppEmail(email);
  store.email = store.onboardingForm.email;
  store.phase = 'creating';
  store.saveError = '';
  sessionStorage.setItem('bnb_creator_phase', 'creating');
  render();
  window.setTimeout(() => {
    runPlanCreation().catch((err) => console.error(err));
  }, 900);
}

bindGlobal();
initFocusFlow();
initStartSite();

(async () => {
  if (escapeStandaloneToMyplan()) return;
  const checkoutParams = new URLSearchParams(location.search);
  if (checkoutParams.has('checkout')) {
    await preparePlanReadyState();
  } else if (store.phase === 'creating') {
    await runPlanCreation();
  } else if (store.phase === 'plan-ready') {
    await preparePlanReadyState();
  }
  render();
})();
