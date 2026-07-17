import {
  bindOnboardingEvents,
  initOnboardingForm,
  refreshPersonalDetailFields,
  syncObToStore,
} from './onboardingUI.js';
import { renderAccordion, bindAccordionEvents, syncAccordionSection, applyPendingAccordionFocus } from './onboardingAccordion.js';
import {
  buildProgramPackage,
  localDateKey,
} from './programPackage.js';
import { getAppEmail, persistAppEmail, saveProgramToServer, isValidEmail, fetchProgramFromServer, fetchProgramPaymentStatus } from './programApi.js';
import { persistProgramBridge, programReportHref } from './programBridgeHandoff.js';
import {
  completeCheckoutForTest,
  createCheckoutSession,
  fetchCheckoutStatus,
  verifyCheckoutSession,
} from './checkoutApi.js';
import { initFocusFlow, syncFocusFlow } from './startViewport.js';

const store = {
  phase: 'onboarding',
  onboardingPage: 0,
  onboardingForm: null,
  onboardingEditMode: false,
  builtPackage: null,
  startDate: defaultStartDate(),
  email: '',
  saveError: '',
  accordionSection: 'intro',
  reviewViewed: false,
  accordionEditReturn: null,
  accordionPendingFocus: null,
  programPaid: false,
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

function persistBuiltPackage() {
  if (!store.builtPackage) return;
  persistProgramBridge(store.builtPackage);
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
  store.email = getAppEmail() || '';
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
  persistBuiltPackage();
  return true;
}

async function openProgramReport() {
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
    persistProgramBridge(store.builtPackage);
  }
  window.location.href = programReportHref();
}

function renderPlanReadyAppHandoff(unlocked) {
  if (!unlocked) {
    return '<p class="unlock-tagline">Complete purchase to unlock your program.</p>';
  }
  restoreBuiltPackage();
  if (store.builtPackage) persistProgramBridge(store.builtPackage);
  const reportUrl = programReportHref();
  return `
          <a class="btn-primary unlock-cta plan-ready-open-program" href="${reportUrl}" data-open-program-report>View your program →</a>
          <p class="unlock-tagline">Projections, plan/servings, and menu planner.</p>`;
}

function ensurePlanReadyEmail() {
  restoreBuiltPackage();
  const fromStore = String(store.email || '').trim();
  if (isValidEmail(fromStore)) return fromStore;

  const fromSaved = getAppEmail();
  if (isValidEmail(fromSaved)) {
    store.email = fromSaved;
    return fromSaved;
  }

  const fromPackage = String(store.builtPackage?.intake?.email || '').trim();
  if (isValidEmail(fromPackage)) {
    store.email = persistAppEmail(fromPackage);
    return store.email;
  }

  const fromForm = String(store.onboardingForm?.email || '').trim();
  if (isValidEmail(fromForm)) {
    store.email = persistAppEmail(fromForm);
    return store.email;
  }

  return '';
}

function currentProgramId() {
  restoreBuiltPackage();
  return String(store.builtPackage?.program?.id || '').trim();
}

async function refreshProgramPaymentStatus() {
  const email = ensurePlanReadyEmail();
  const programId = currentProgramId();
  if (!isValidEmail(email) || !programId) {
    store.programPaid = false;
    return;
  }
  const result = await fetchProgramPaymentStatus(email, programId);
  store.programPaid = !!(result.ok && result.paid);
}

function renderPlanReady() {
  restoreBuiltPackage();
  ensurePlanReadyEmail();
  const paidThisSession = store.checkoutVerified;
  const hasPaidAccess = paidThisSession || store.programPaid;
  const showPaywall = !hasPaidAccess;
  let lead;
  if (paidThisSession) {
    lead = 'Payment complete. Your program is ready — open your food plan, servings, and menu planner.';
  } else if (store.programPaid) {
    lead = 'Your program is unlocked. Open your food plan, servings, and menu planner.';
  } else if (store.saveError) {
    lead = 'Your diet is ready on this device. Save it to your account, then complete checkout.';
  } else {
    lead = 'Your personalized diet is saved. Complete checkout to unlock your program.';
  }

  const checkoutBlock = showPaywall
    ? !store.apiReachable ? `
          <p class="unlock-hint">Could not reach the Burn &amp; Build server. Check your connection and try again.</p>
          ${store.saveError ? `<button type="button" class="btn-secondary unlock-cta-secondary" data-retry-save ${store.saveBusy ? 'disabled' : ''}>${store.saveBusy ? 'SAVING…' : 'Retry save'}</button>` : ''}`
      : store.stripeConfigured ? `
          <button type="button" class="btn-primary unlock-cta" data-start-checkout ${store.checkoutBusy ? 'disabled' : ''}>
            ${store.checkoutBusy ? 'OPENING CHECKOUT…' : 'COMPLETE PURCHASE — $149'}
          </button>
          <p class="unlock-hint">Secure checkout · One-time $149 · Yours for life</p>
          ${store.checkoutTestBypass ? '<button type="button" class="btn-secondary unlock-cta-secondary" data-test-checkout>Skip payment (local test)</button>' : ''}`
      : `
          <p class="unlock-hint">Checkout is not available yet. Contact support@burnandbuilddiet.com if you need help.</p>
          ${store.checkoutTestBypass ? '<button type="button" class="btn-secondary unlock-cta-secondary" data-test-checkout>Skip payment (local test)</button>' : ''}`
    : '';

  const saveActions = showPaywall && store.saveError && store.apiReachable
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
          ${renderPlanReadyAppHandoff(hasPaidAccess)}
          ${store.checkoutError ? `<div class="unlock-error">${store.checkoutError}</div>` : ''}
          ${store.saveError ? `<div class="unlock-error">${store.saveError}</div>` : ''}
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

function isTestMode() {
  return location.hostname.includes('github.io') || location.hostname === 'localhost' || location.search.includes('test=1');
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
  store.checkoutTestBypass = isTestMode();
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

  store.checkoutMessage = 'Payment complete. Your program is unlocked.';
  store.checkoutVerified = true;
  store.programPaid = true;
}

async function retrySavePlan() {
  if (store.saveBusy) return;
  const ok = await savePlanToServer();
  if (ok) await refreshCheckoutConfig();
  render();
}

async function startCheckout() {
  const email = ensurePlanReadyEmail();
  if (!isValidEmail(email)) {
    store.checkoutError = 'We need your email from the questionnaire before checkout. Go back and confirm your email.';
    render();
    return;
  }
  store.checkoutError = '';
  store.checkoutMessage = '';
  store.checkoutBusy = true;
  render();

  const programId = currentProgramId();
  if (!programId) {
    store.checkoutError = 'Your program must be saved before checkout. Try again from the questionnaire.';
    render();
    return;
  }
  const result = await createCheckoutSession(email, programId);
  store.checkoutBusy = false;

  if (!result.ok || !result.url) {
    store.checkoutError = result.message || 'Could not start checkout.';
    render();
    return;
  }

  window.location.href = result.url;
}

async function completeTestCheckout() {
  const email = ensurePlanReadyEmail();
  store.checkoutError = '';
  store.checkoutMessage = '';
  const result = await completeCheckoutForTest(email, currentProgramId());
  if (!result.ok) {
    store.checkoutError = result.message || 'Test checkout failed.';
    render();
    return;
  }
  store.checkoutMessage = 'Test access granted. Your program is unlocked.';
  store.checkoutVerified = true;
  store.programPaid = true;
  render();
}

async function preparePlanReadyState() {
  ensurePlanReadyEmail();
  await refreshCheckoutConfig();
  await handleCheckoutReturn();
  await refreshProgramPaymentStatus();
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

function bindGlobal() {
  if (bindGlobal.done) return;
  bindGlobal.done = true;

  document.getElementById('app').addEventListener('click', (e) => {
    if (e.target.closest('[data-start-checkout]')) {
      startCheckout();
      return;
    }
    if (e.target.closest('[data-retry-save]')) {
      retrySavePlan();
      return;
    }
    if (e.target.closest('[data-open-program-report]')) {
      e.preventDefault();
      openProgramReport().catch((err) => console.error(err));
      return;
    }
    if (e.target.closest('[data-test-checkout]')) {
      completeTestCheckout();
    }
  });
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
