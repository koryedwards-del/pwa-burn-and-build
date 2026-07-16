/** Shared chrome for program report (pages 1–3) and menu planner (page 4). */

import { formatWakeDisplay, parseWakeTime } from './onboardingEngine.js';

export const PROGRAM_BRIDGE_PAGES = [
  { id: 'welcome', label: 'Welcome', step: 1, reportPage: 0, reportQuery: 'welcome' },
  { id: 'projections', label: 'Projections', step: 2, reportPage: 1, reportQuery: 'projections' },
  { id: 'servings', label: 'Plan/Servings', step: 3, reportPage: 2, reportQuery: 'servings' },
  { id: 'menuplanner', label: 'Menu planner', step: 4, href: '../menuplanner/?handoff=1' },
];

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatProgramDateLong(iso) {
  if (!iso) {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function programClientName(pkg) {
  return pkg?.intake?.preferredName || 'You';
}

export function programMetaHtml(pkg) {
  const name = escapeHtml(programClientName(pkg));
  const date = escapeHtml(formatProgramDateLong(
    pkg?.program?.issuedAt || pkg?.program?.foodPlanCreatedDate,
  ));
  return `
    <header class="pb-doc__head">
      <p class="pb-doc__meta">
        Prepared exclusively for: <strong>${name}</strong> · On: <strong>${date}</strong>
      </p>
    </header>`;
}

export function programSettingsHtml(pkg = null) {
  if (!pkg?.intake) {
    return `
      <h2 class="pb-side-card__title">Settings</h2>
      <p class="pb-side-card__empty">Sign in to adjust settings.</p>`;
  }

  const wakeTime = pkg.intake.wakeTime || pkg.intake.defaultWakeTime || '06:00';
  const wakeEnabled = pkg.intake.wakeTimeEnabled !== false;
  const { hour12, minute, ampm } = parseWakeTime(wakeTime);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const hourOpts = hours.map((h) => `<option value="${h}"${h === hour12 ? ' selected' : ''}>${h}</option>`).join('');
  const minOpts = minutes.map((m) => `<option value="${m}"${m === minute ? ' selected' : ''}>${m}</option>`).join('');

  return `
    <h2 class="pb-side-card__title">Settings</h2>
    <div class="pb-settings" aria-label="Settings">
      <button
        type="button"
        class="pb-settings-toggle${wakeEnabled ? ' is-on' : ''}"
        data-pb-wake-enabled
        aria-pressed="${wakeEnabled ? 'true' : 'false'}"
      >
        <span class="pb-settings-toggle__label">Wake time</span>
        <span class="pb-settings-toggle__pill" aria-hidden="true"></span>
      </button>
      <div class="pb-settings-wake${wakeEnabled ? '' : ' is-disabled'}" data-pb-wake-panel>
        <p class="pb-settings-field-label">Time</p>
        <div class="pb-wake-picker">
          <select class="pb-wake-select" data-wake-part="hour" aria-label="Wake hour"${wakeEnabled ? '' : ' disabled'}>${hourOpts}</select>
          <span class="pb-wake-colon">:</span>
          <select class="pb-wake-select" data-wake-part="minute" aria-label="Wake minute"${wakeEnabled ? '' : ' disabled'}>${minOpts}</select>
          <select class="pb-wake-select pb-wake-select--ampm" data-wake-part="ampm" aria-label="AM or PM"${wakeEnabled ? '' : ' disabled'}>
            <option value="AM"${ampm === 'AM' ? ' selected' : ''}>AM</option>
            <option value="PM"${ampm === 'PM' ? ' selected' : ''}>PM</option>
          </select>
        </div>
        <p class="pb-wake-display" data-pb-wake-display>${escapeHtml(formatWakeDisplay(wakeTime))}</p>
      </div>
    </div>`;
}

/** @deprecated Use programSettingsHtml */
export function programLinksHtml() {
  return programSettingsHtml();
}

export function programNavHtml(activeId, { reportHref = '' } = {}) {
  const stepHref = (query) => {
    if (!reportHref) return `?page=${query}`;
    const root = reportHref.endsWith('/') ? reportHref.slice(0, -1) : reportHref;
    return `${root}/?page=${query}`;
  };

  return `
    <ol class="pb-nav__list">
      ${PROGRAM_BRIDGE_PAGES.map((page) => {
        const isActive = page.id === activeId;
        if (page.href) {
          return `
            <li class="pb-nav__item">
              <a class="pb-nav__btn${isActive ? ' is-active' : ''}" href="${page.href}">${page.step}. ${page.label}</a>
            </li>`;
        }
        if (activeId === 'menuplanner') {
          return `
            <li class="pb-nav__item">
              <a class="pb-nav__btn${isActive ? ' is-active' : ''}" href="${stepHref(page.reportQuery)}">${page.step}. ${page.label}</a>
            </li>`;
        }
        return `
          <li class="pb-nav__item">
            <button
              type="button"
              class="pb-nav__btn${isActive ? ' is-active' : ''}"
              data-nav-page="${page.reportPage}"
            >${page.step}. ${page.label}</button>
          </li>`;
      }).join('')}
    </ol>`;
}
