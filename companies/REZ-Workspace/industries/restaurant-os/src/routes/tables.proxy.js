/**
 * Tables Proxy Route
 *
 * Proxies /api/tables/* to the real table-twin-service (port 4012 by
 * default). Replaces the previous behaviour where /api/dashboard returned
 * hardcoded table stats (total: 25, occupied: 12, etc.) and the
 * "table"/"reservation" copilot intent returned canned text.
 *
 * After NEXHA-AUDIT-V2 Phase 8, the restaurant-os orchestrator delegates
 * table management to the dedicated table twin service. Endpoints mapped:
 *
 *   Orchestrator (5010)              →  Table Twin (4012)
 *   ─────────────────────────────────────────────────────────────────
 *   GET /api/tables                  →  GET /api/twins/table?restaurantId=…
 *   GET /api/tables/availability     →  GET /api/twins/table/availability/check?…
 *   GET /api/tables/:tableId         →  GET /api/twins/table/:tableId
 *   PUT /api/tables/:tableId/status  →  PUT /api/twins/table/:tableId/status
 *   POST /api/tables/:tableId/seat   →  POST /api/twins/table/:tableId/seat
 *   POST /api/tables/:tableId/clear  →  POST /api/twins/table/:tableId/clear
 *
 * Fail-open: if table-twin-service is unreachable, the proxy returns 503
 * with a clear error code so callers can fall back to the dashboard's
 * aggregated view (which still works because the dashboard fans out
 * independently).
 *
 * Service-to-service auth: uses x-internal-token. See NEXHA-DECISIONS.md D1
 * and the table-twin-service README for the internal-token setup.
 *
 * Refs NEXHA-VS-CODE-AUDIT-V2.md Phase 8 (wire verticals to table twin).
 */

import { Router } from 'express';

const router = Router();

const TABLE_TWIN_URL = process.env.TABLE_TWIN_URL || 'http://localhost:4012';
const TABLE_TWIN_INTERNAL_TOKEN =
  process.env.TABLE_TWIN_INTERNAL_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUEST_TIMEOUT_MS = 10000;

async function proxyToTwin(req, res, next) {
  // Strip leading slashes from req.path and rebuild the target URL.
  // The orchestrator prefix is /api/tables/* and the twin lives at
  // /api/twins/table/*. We map the orchestrator path to the twin path
  // so callers don't need to know about the twin URL structure.
  const orchPath = req.path.replace(/^\/+/, '');
  const twinPath = orchPath.length > 0 ? orchPath : '';
  const targetPath = twinPath ? `/api/twins/table/${twinPath}` : '/api/twins/table';

  const queryIdx = req.url.indexOf('?');
  const queryString = queryIdx >= 0 ? req.url.substring(queryIdx) : '';
  const targetUrl = `${TABLE_TWIN_URL}${targetPath}${queryString}`;

  const headers = {
    'content-type': req.headers['content-type'] || 'application/json',
  };
  if (TABLE_TWIN_INTERNAL_TOKEN) {
    headers['x-internal-token'] = TABLE_TWIN_INTERNAL_TOKEN;
  }
  if (req.headers['x-corp-id']) {
    headers['x-corp-id'] = req.headers['x-corp-id'];
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body);
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutHandle);

    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.status(upstream.status);
    res.setHeader('content-type', contentType);
    const text = await upstream.text();
    res.send(text);
  } catch (err) {
    clearTimeout(timeoutHandle);
    const message = err && err.message ? err.message : String(err);
    res.status(503).json({
      success: false,
      error: { code: 'TABLE_TWIN_UNREACHABLE', message: `table-twin-service unreachable: ${message}` },
    });
  }
}

router.use('/', proxyToTwin);

export default router;