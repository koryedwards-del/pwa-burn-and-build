import { persistProgramBridge, loadProgramBridge } from '../../js/programBridgeHandoff.js';
import {
  fetchProgramFromServer,
  fetchProgramResumeCheckout,
  fetchProgramByIdFromServer,
  getAppEmail,
  isValidEmail,
  persistAppEmail,
} from '../../js/programApi.js';
import { getActiveProgramId, setActiveProgramId } from '../../js/programActive.js';
import { DESKTOP_CHECKOUT_URL } from '../../js/siteUrls.js';

const ACCESS_SCREENS = ['email', 'unpaid', 'missing', 'error'];

function programReady(pkg) {
  return !!(pkg?.intake?.leanBodyMass && pkg?.plan?.mealSlots?.length);
}

function gateEl() {
  return document.getElementById('access-gate');
}

function plannerRoot() {
  return document.getElementById('planner-root');
}

function showAccessScreen(screen, { email = '' } = {}) {
  const gate = gateEl();
  const root = plannerRoot();
  if (!gate) return;
  gate.hidden = false;
  if (root) root.hidden = true;

  ACCESS_SCREENS.forEach((id) => {
    const panel = gate.querySelector(`#access-screen-${id}`);
    if (panel) panel.hidden = id !== screen;
  });

  if (screen === 'email') {
    const input = gate.querySelector('#access-email');
    const errorEl = gate.querySelector('#access-form-error');
    const submit = gate.querySelector('#access-submit');
    if (input) input.value = email;
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'Go to your diet';
    }
    input?.focus();
  }

  if (screen === 'unpaid') {
    const label = gate.querySelector('#access-unpaid-email');
    if (label) label.textContent = email;
    gate.dataset.pendingEmail = email;
  }

  if (screen === 'missing') {
    const label = gate.querySelector('#access-missing-email');
    if (label) label.textContent = email;
  }
}

function showPlanner() {
  const gate = gateEl();
  const root = plannerRoot();
  if (gate) gate.hidden = true;
  if (root) root.hidden = false;
}

function setAccessBusy(busy) {
  const submit = gateEl()?.querySelector('#access-submit');
  if (!submit) return;
  submit.disabled = busy;
  submit.textContent = busy ? 'Checking…' : 'Go to your diet';
}

function showEmailValidationError(message) {
  const errorEl = gateEl()?.querySelector('#access-form-error');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearEmailValidationError() {
  const errorEl = gateEl()?.querySelector('#access-form-error');
  if (!errorEl) return;
  errorEl.textContent = '';
  errorEl.hidden = true;
}

function resolveAccessScreen(result) {
  if (result.status === 403 && result.saved) return 'unpaid';
  if (result.status === 404 || (result.message && result.message.includes('No diet'))) return 'missing';
  return 'error';
}

async function loadProgramForEmail(email) {
  const normalized = persistAppEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }

  const activeId = getActiveProgramId();
  if (activeId) {
    const activeResult = await fetchProgramByIdFromServer(normalized, activeId);
    if (activeResult.ok && activeResult.package && programReady(activeResult.package)) {
      persistProgramBridge(activeResult.package);
      setActiveProgramId(activeId);
      return { ok: true, package: activeResult.package, email: normalized };
    }
  }

  const result = await fetchProgramFromServer(normalized);
  if (!result.ok || !result.package) {
    return { ...result, email: normalized };
  }
  if (!programReady(result.package)) {
    return { ok: false, status: 404, message: 'Your program is incomplete.', email: normalized };
  }
  persistProgramBridge(result.package);
  setActiveProgramId(result.package?.program?.id || '');
  return { ok: true, package: result.package, email: normalized };
}

async function resumeDesktopCheckout(email) {
  const normalized = persistAppEmail(email);
  const button = gateEl()?.querySelector('#access-unpaid-checkout');
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening checkout…';
  }

  const result = await fetchProgramResumeCheckout(normalized);
  if (!result.ok || !result.package) {
    if (button) {
      button.disabled = false;
      button.textContent = 'Complete purchase — $149';
    }
    const message = result.message || 'Could not load your program for checkout.';
    const errorEl = gateEl()?.querySelector('#access-error-message');
    if (errorEl) errorEl.textContent = message;
    showAccessScreen('error');
    return;
  }

  persistProgramBridge(result.package);
  try {
    sessionStorage.setItem('bnb_creator_phase', 'plan-ready');
    sessionStorage.setItem('bnb_browse_mode', '1');
  } catch (err) {
    console.error(err);
  }
  window.location.href = DESKTOP_CHECKOUT_URL;
}

function bindAccessGate(onProgramReady) {
  const gate = gateEl();
  if (!gate || gate.dataset.bound === '1') return;
  gate.dataset.bound = '1';

  gate.querySelector('#access-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = gate.querySelector('#access-email');
    const email = String(input?.value || '').trim();
    clearEmailValidationError();

    if (!email) {
      showEmailValidationError('Enter a valid email address.');
      input?.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showEmailValidationError('Enter a valid email address.');
      input?.focus();
      return;
    }

    setAccessBusy(true);
    const result = await loadProgramForEmail(email);
    setAccessBusy(false);

    if (!result.ok) {
      if (result.message === 'Enter a valid email address.') {
        showEmailValidationError(result.message);
        input?.focus();
        return;
      }
      if (resolveAccessScreen(result) === 'error') {
        const messageEl = gate.querySelector('#access-error-message');
        if (messageEl) {
          messageEl.textContent = result.message || 'Check your connection and try again.';
        }
      }
      showAccessScreen(resolveAccessScreen(result), { email: result.email || email });
      return;
    }

    try {
      await onProgramReady(result.package);
      showPlanner();
    } catch (err) {
      console.error(err);
      const messageEl = gate.querySelector('#access-error-message');
      if (messageEl) {
        messageEl.textContent = 'Something went wrong loading the menu planner. Refresh and try again.';
      }
      showAccessScreen('error', { email: result.email || email });
    }
  });

  gate.querySelector('#access-unpaid-checkout')?.addEventListener('click', () => {
    const email = gate.dataset.pendingEmail || getAppEmail();
    if (!isValidEmail(email)) {
      showAccessScreen('email');
      return;
    }
    resumeDesktopCheckout(email).catch((err) => {
      console.error(err);
      const messageEl = gate.querySelector('#access-error-message');
      if (messageEl) messageEl.textContent = 'Something went wrong opening checkout. Try again.';
      showAccessScreen('error');
    });
  });

  gate.querySelector('#access-email')?.addEventListener('input', () => {
    clearEmailValidationError();
  });

  gate.querySelector('#access-submit')?.addEventListener('click', (event) => {
    // Ensure empty-email attempts show our message instead of doing nothing.
    const input = gate.querySelector('#access-email');
    if (!String(input?.value || '').trim()) {
      event.preventDefault();
      showEmailValidationError('Enter a valid email address.');
      input?.focus();
    }
  });

  gate.querySelectorAll('[data-access-screen]').forEach((button) => {
    button.addEventListener('click', () => {
      const screen = button.getAttribute('data-access-screen');
      const email = getAppEmail();
      showAccessScreen(screen, { email });
    });
  });
}

export async function bootMenuPlannerAccess(onProgramReady) {
  bindAccessGate(onProgramReady);

  const params = new URLSearchParams(location.search);
  const queryEmail = String(params.get('email') || '').trim();
  const handoff = params.get('handoff') === '1';

  const bridged = loadProgramBridge();
  if (handoff && programReady(bridged)) {
    try {
      await onProgramReady(bridged);
      showPlanner();
    } catch (err) {
      console.error(err);
      const messageEl = gateEl()?.querySelector('#access-error-message');
      if (messageEl) {
        messageEl.textContent = 'Something went wrong loading the menu planner. Refresh and try again.';
      }
      showAccessScreen('error');
    }
    if (params.has('handoff')) {
      params.delete('handoff');
      const qs = params.toString();
      history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
    }
    return;
  }

  const prefilled = queryEmail || getAppEmail();
  showAccessScreen('email', { email: isValidEmail(prefilled) ? prefilled : '' });
}

export function openAccessGate() {
  showAccessScreen('email', { email: getAppEmail() });
}
