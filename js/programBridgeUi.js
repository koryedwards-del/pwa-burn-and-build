/** Shared chrome for program report (pages 1–3) and menu planner (page 4). */

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
          if (isActive) {
            return `
            <li class="pb-nav__item">
              <button type="button" class="pb-nav__btn is-active" aria-current="page">${page.step}. ${page.label}</button>
            </li>`;
          }
          return `
            <li class="pb-nav__item">
              <a class="pb-nav__btn" href="${page.href}">${page.step}. ${page.label}</a>
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
