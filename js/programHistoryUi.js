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

export function renderSidebarProgramCard(row, { isActive = false, isOpening = false, isCollapsed = true } = {}) {
  return `
    <div
      class="pb-program-card${isActive ? ' is-active' : ''}${isOpening ? ' is-opening' : ''}${isCollapsed ? ' is-collapsed' : ''}"
      data-program-card="${row.id}"
    >
      <button
        type="button"
        class="pb-program-card__top"
        data-toggle-program-card="${row.id}"
        aria-expanded="${isCollapsed ? 'false' : 'true'}"
        aria-label="${isCollapsed ? 'Show diet details' : 'Hide diet details'}"
      >
        <span class="pb-program-card__date">${row.testDateDisplay}</span>
        ${isActive ? '<span class="pb-program-card__tag">Active</span>' : ''}
        <span class="pb-program-card__toggle-icon" aria-hidden="true">▾</span>
      </button>
      <div class="pb-program-card__body" data-switch-program="${row.id}">
        ${renderHistoryCardRows(row.fieldRows)}
      </div>
    </div>`;
}
