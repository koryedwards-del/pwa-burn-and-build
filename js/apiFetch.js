/** Shared fetch with retries — handles Render cold starts. */

export async function fetchJson(url, options = {}, { retries = 3, delayMs = 1500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text.slice(0, 240) || `Request failed (${res.status}).` };
        }
      }
      return { res, data };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error('Network error');
}
