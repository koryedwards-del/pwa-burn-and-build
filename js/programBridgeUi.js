/** Shared chrome for program report (pages 1–4). */

export const PROGRAM_BRIDGE_PAGES = [
  { id: 'welcome', label: 'Welcome', step: 1, reportPage: 0, reportQuery: 'welcome' },
  { id: 'projections', label: 'Projections', step: 2, reportPage: 1, reportQuery: 'projections' },
  { id: 'servings', label: 'Plan/Servings', step: 3, reportPage: 2, reportQuery: 'servings' },
  { id: 'menuplanner', label: 'Menu planner', step: 4, reportPage: 3, reportQuery: 'menuplanner' },
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

/** Date and time stamp for printouts (local timezone). */
export function formatPrintDateTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

export function programNavListHtml(activeId) {
  return PROGRAM_BRIDGE_PAGES.map((page) => {
    const isActive = page.id === activeId;
    return `
          <li class="pb-nav__item">
            <button
              type="button"
              class="pb-nav__btn${isActive ? ' is-active' : ''}"
              data-nav-page="${page.reportPage}"
              ${isActive ? ' aria-current="page"' : ''}
            >${page.step}. ${page.label}</button>
          </li>`;
  }).join('');
}

export function programNavHtml(activeId) {
  return `
    <ol class="pb-nav__list">
      ${programNavListHtml(activeId)}
    </ol>`;
}
