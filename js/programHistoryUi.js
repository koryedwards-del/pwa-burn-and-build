/** Shared program history card markup — phone Previous Diets + desktop sidebar. */

export function renderHistoryCardRows(fieldRows = []) {
  return `
    <div class="history-grid">
      ${fieldRows.map((row, index) => `
        <div class="history-grid-row${index > 0 ? ' history-grid-row--divider' : ''}" style="--history-cols: ${row.length}">
          ${row.map((field) => `
            <div class="history-field">
              <span class="history-field-label">${field.label}</span>
              <span class="history-field-value${field.accent ? ' accent' : ''}">${field.value}</span>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;
}

export function renderSidebarProgramCard(row, { isActive = false, isOpening = false } = {}) {
  const aria = isActive ? ' aria-current="true"' : '';
  return `
    <li class="pb-nav__item">
      <button
        type="button"
        class="pb-nav__btn pb-nav__btn--aux${isOpening ? ' is-opening' : ''}"
        data-switch-program="${row.id}"
        aria-label="Switch to diet from ${row.testDateDisplay}${isActive ? ' (active)' : ''}"${aria}
        ${isActive ? ' disabled' : ''}
      >
        <span class="pb-nav__btn-line">${row.testDateDisplay}</span>
        ${isActive ? '<span class="pb-nav__btn-sub">Active</span>' : ''}
      </button>
    </li>`;
}
