/** Resolve API origin — GitHub Pages serves static files; API lives on Render. */

const RENDER_API_ORIGIN = 'https://program-creator-3tzd.onrender.com';

const STATIC_SITE_HOSTS = new Set([
  'burnandbuilddiet.com',
  'www.burnandbuilddiet.com',
]);

export function getApiBaseUrl() {
  const cfg = typeof window !== 'undefined' ? window.BNB_CONFIG : null;
  if (cfg?.apiBaseUrl) return String(cfg.apiBaseUrl).replace(/\/$/, '');

  if (typeof window !== 'undefined' && STATIC_SITE_HOSTS.has(window.location.hostname)) {
    return RENDER_API_ORIGIN;
  }

  return '';
}

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}
