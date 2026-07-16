import { persistProgramBridge, loadProgramBridge } from '../../js/programBridgeHandoff.js';
import {
  fetchProgramFromServer,
  getAppEmail,
  isValidEmail,
  persistAppEmail,
} from '../../js/programApi.js';
import { CREATOR_CHECKOUT_URL, QUESTIONNAIRE_WELCOME_URL } from '../../js/siteUrls.js';

function programReady(pkg) {
  return !!(pkg?.intake?.leanBodyMass && pkg?.plan?.mealSlots?.length);
}

function gateEl() {
  return document.getElementById('access-gate');
}

function plannerRoot() {
  return document.getElementById('planner-root');
}

function showAccessGate({ email = '', error = '', hint = '' } = {}) {
  const gate = gateEl();
  const root = plannerRoot();
  if (!gate) return;
  gate.hidden = false;
  if (root) root.hidden = true;

  const form = gate.querySelector('#access-form');
  const input = gate.querySelector('#access-email');
  const errorEl = gate.querySelector('#access-error');
  const hintEl = gate.querySelector('#access-hint');
  const submit = gate.querySelector('#access-submit');

  if (input) input.value = email;
  if (errorEl) {
    errorEl.textContent = error;
    errorEl.hidden = !error;
  }
  if (hintEl) {
    hintEl.innerHTML = hint;
    hintEl.hidden = !hint;
  }
  if (submit) {
    submit.disabled = false;
    submit.textContent = 'Open menu planner';
  }
  input?.focus();
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
  submit.textContent = busy ? 'Opening…' : 'Open menu planner';
}

function accessMessage(result, email) {
  if (result.status === 403 && result.saved) {
    return {
      error: 'Your program is saved but checkout is not complete yet.',
      hint: `<a class="mp-access__link" href="${CREATOR_CHECKOUT_URL}">Complete purchase</a> to unlock the menu planner for <strong>${email}</strong>.`,
    };
  }
  if (result.status === 404 || (result.message && result.message.includes('No diet'))) {
    return {
      error: 'No program found for this email.',
      hint: `<a class="mp-access__link" href="${QUESTIONNAIRE_WELCOME_URL}">Create your diet</a> to get started.`,
    };
  }
  return {
    error: result.message || 'Could not load your program. Check your connection and try again.',
    hint: '',
  };
}

async function loadProgramForEmail(email) {
  const normalized = persistAppEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  const result = await fetchProgramFromServer(normalized);
  if (!result.ok || !result.package) {
    return result;
  }
  if (!programReady(result.package)) {
    return { ok: false, message: 'Your program is incomplete. Create a new diet to continue.' };
  }
  persistProgramBridge(result.package);
  return { ok: true, package: result.package, email: normalized };
}

function bindAccessForm(onProgramReady) {
  const form = gateEl()?.querySelector('#access-form');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = form.querySelector('#access-email');
    const email = String(input?.value || '').trim();
    if (!isValidEmail(email)) {
      showAccessGate({ email, error: 'Enter a valid email address.' });
      return;
    }

    setAccessBusy(true);
    const result = await loadProgramForEmail(email);
    setAccessBusy(false);

    if (!result.ok) {
      const { error, hint } = accessMessage(result, email);
      showAccessGate({ email, error, hint });
      return;
    }

    showPlanner();
    await onProgramReady(result.package);
  });
}

export async function bootMenuPlannerAccess(onProgramReady) {
  bindAccessForm(onProgramReady);

  const params = new URLSearchParams(location.search);
  const queryEmail = String(params.get('email') || '').trim();

  const bridged = loadProgramBridge();
  if (programReady(bridged)) {
    showPlanner();
    await onProgramReady(bridged);
    return;
  }

  const remembered = queryEmail || getAppEmail();
  if (isValidEmail(remembered)) {
    setAccessBusy(true);
    showAccessGate({ email: remembered });
    const result = await loadProgramForEmail(remembered);
    setAccessBusy(false);
    if (result.ok) {
      showPlanner();
      await onProgramReady(result.package);
      return;
    }
    const { error, hint } = accessMessage(result, remembered);
    showAccessGate({ email: remembered, error, hint });
    return;
  }

  showAccessGate();
}

export function openAccessGate() {
  showAccessGate({ email: getAppEmail() });
}
