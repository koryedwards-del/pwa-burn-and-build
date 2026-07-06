import { computeWhatsPossible } from './previewCalculator.js';

const state = {
  gender: 'male',
  weight: '',
  bodyFat: '',
};

function $(id) {
  return document.getElementById(id);
}

function setGender(gender) {
  state.gender = gender;
  document.querySelectorAll('[data-calc-gender]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.calcGender === gender);
  });
}

function renderResults(result) {
  const resultsEl = $('calc-results');
  const errorEl = $('calc-error');
  const narrativeEl = $('calc-narrative');
  const tbodyEl = $('calc-table-body');

  if (!result.valid) {
    resultsEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = result.error;
    return;
  }

  errorEl.hidden = true;
  resultsEl.hidden = false;
  narrativeEl.innerHTML = result.narrative;
  tbodyEl.innerHTML = result.rows.map((row) => `
    <tr class="${row.isCurrent ? 'row-current' : ''}">
      <td>${row.timeline}</td>
      <td>${row.bodyFatDisplay}${row.badge ? `<span class="ace-badge">${row.badge}</span>` : ''}</td>
      <td>${row.weightDisplay}</td>
    </tr>`).join('');
}

function runCalculator() {
  const weightInput = $('calc-weight');
  const bfInput = $('calc-bf');
  state.weight = weightInput.value;
  state.bodyFat = bfInput.value;

  const result = computeWhatsPossible({
    gender: state.gender,
    weightLbs: state.weight,
    bodyFatPercent: state.bodyFat,
  });

  renderResults(result);
  if (result.valid) {
    $('calc-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function initCalculator() {
  setGender(state.gender);

  document.querySelectorAll('[data-calc-gender]').forEach((btn) => {
    btn.addEventListener('click', () => setGender(btn.dataset.calcGender));
  });

  $('calc-run')?.addEventListener('click', runCalculator);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalculator);
} else {
  initCalculator();
}
