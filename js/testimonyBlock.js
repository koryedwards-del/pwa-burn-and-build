/** Shared testimony / quote card markup. */

export function parseQuoteBy(by) {
  const cleaned = String(by || '').replace(/^—\s*/, '').trim();
  const comma = cleaned.indexOf(',');
  if (comma === -1) return { name: cleaned, meta: '' };
  const name = cleaned.slice(0, comma).trim();
  let meta = cleaned.slice(comma + 1).trim();
  if (meta) meta = meta.charAt(0).toUpperCase() + meta.slice(1);
  return { name, meta };
}

export function renderTestimonyBlock({ quote, name = '', meta = '', className = '' }) {
  const extra = className ? ` ${className}` : '';
  return `
    <div class="testimony-block${extra}">
      <p class="testimony-text">&ldquo;${quote}&rdquo;</p>
      ${name ? `<div class="testimony-name">${name}</div>` : ''}
      ${meta ? `<div class="testimony-meta">${meta}</div>` : ''}
    </div>`;
}
