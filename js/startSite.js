/** Checkout paywall — questionnaire builds the program; this page handles Stripe only. */

import { getAppEmail, persistAppEmail, saveProgramToServer, isValidEmail, fetchProgramFromServer, fetchProgramPaymentStatus } from './programApi.js';
import { persistProgramBridge, loadProgramBridge, programReportHref } from './programBridgeHandoff.js';
import {
  completeCheckoutForTest,
  createCheckoutSession,
  fetchCheckoutStatus,
  verifyCheckoutSession,
} from './checkoutApi.js';
import { QUESTIONNAIRE_WELCOME_URL } from './siteUrls.js';

const store = {
  builtPackage: null,
  email: '',
  saveError: '',
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

function programName() {
  return store.builtPackage?.intake?.preferredName || '';
}

function restoreBuiltPackage() {
  if (store.builtPackage) return;
  store.builtPackage = loadProgramBridge();
  const raw = sessionStorage.getItem('bnb_built_package');
  if (!store.builtPackage && raw) {
    try {
      store.builtPackage = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem('bnb_built_package');
    }
  }
}

function redirectToQuestionnaire() {
  window.location.replace(QUESTIONNAIRE_WELCOME_URL);
}

async function restoreBuiltPackageFromServer(email) {
  if (store.builtPackage) return true;
  if (!isValidEmail(email)) return false;
  const result = await fetchProgramFromServer(email);
  if (!result.ok || !result.package) return false;
  store.builtPackage = result.package;
  persistProgramBridge(store.builtPackage);
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
        persistProgramBridge(store.builtPackage);
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
          <p class="unlock-hint"><a href="${QUESTIONNAIRE_WELCOME_URL}">← Back to questionnaire</a></p>
        </div>
      </div>
    </div>`;
}

function isTestMode() {
  return location.hostname.includes('github.io') || location.hostname === 'localhost' || location.search.includes('test=1');
}

async function refreshCheckoutConfig() {
  const status = await fetchCheckoutStatus();
  store.apiReachable = status.reachable !== false;
  store.stripeConfigured = !!status.configured;
  store.checkoutTestBypass = isTestMode();
}

async function savePlanToServer() {
  const email = ensurePlanReadyEmail();
  if (!isValidEmail(email)) {
    store.saveError = 'Enter a valid email address.';
    return false;
  }
  restoreBuiltPackage();
  if (!store.builtPackage) {
    store.saveError = 'No diet to save.';
    return false;
  }
  store.saveBusy = true;
  store.saveError = '';
  const saved = await saveProgramToServer(email, store.builtPackage);
  store.saveBusy = false;
  if (!saved.ok) {
    store.saveError = saved.message || 'Could not save your plan.';
    return false;
  }
  if (saved.programId && store.builtPackage?.program) {
    store.builtPackage.program.id = saved.programId;
    persistProgramBridge(store.builtPackage);
  }
  persistAppEmail(email);
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
  root.innerHTML = renderPlanReady();
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
    }
    if (e.target.closest('[data-test-checkout]')) {
      completeTestCheckout();
    }
  });
}

bindGlobal();

(async () => {
  restoreBuiltPackage();
  store.email = getAppEmail() || store.builtPackage?.intake?.email || '';

  const checkoutParams = new URLSearchParams(location.search);
  const returningFromStripe = checkoutParams.has('checkout');

  if (!store.builtPackage && !returningFromStripe) {
    redirectToQuestionnaire();
    return;
  }

  if (!store.builtPackage && returningFromStripe) {
    const email = ensurePlanReadyEmail();
    if (isValidEmail(email)) {
      await restoreBuiltPackageFromServer(email);
    }
  }

  if (!store.builtPackage) {
    redirectToQuestionnaire();
    return;
  }

  sessionStorage.setItem('bnb_creator_phase', 'plan-ready');
  await preparePlanReadyState();
  render();
})();
