/**
 * SkillOS — Lightweight HTTP client for upstream integrations.
 *
 * Used by the 4 routes that were stubs:
 *   - /api/skills/:id/memory  → MemoryOS (4703)
 *   - /api/skills/:id/twin    → TwinOS (4705)
 *   - /api/skills/:id/flow    → FlowOS (4244)
 *
 * Replaces axios with fetch (Node 18+ has fetch built in, no extra dep).
 * All calls have a 2s timeout and return a normalized {ok, status, data, error} shape.
 */

const DEFAULT_TIMEOUT_MS = 2000;

export async function httpJson(method, url, body = null, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || DEFAULT_TIMEOUT_MS);
  try {
    const init = {
      method,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || 'hojai-internal-service-token-change-me', ...(opts.headers || {}) },
    };
    if (body !== null) init.body = JSON.stringify(body);
    const res = await fetch(url, init);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(timeout);
  }
}

export const httpGet = (url, opts) => httpJson('GET', url, null, opts);
export const httpPost = (url, body, opts) => httpJson('POST', url, body, opts);
export const httpPut = (url, body, opts) => httpJson('PUT', url, body, opts);
export const httpDelete = (url, opts) => httpJson('DELETE', url, null, opts);
