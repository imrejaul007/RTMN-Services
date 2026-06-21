/**
 * Inventory Proxy Route
 *
 * Proxies /api/inventory/* to the real inventory-twin-service on port 4016.
 * Replaces the old mock-data route that returned hardcoded chicken/rice/oil
 * inventories. After NEXHA-AUDIT-V2 Phase 7, the restaurant-os orchestrator
 * delegates inventory ops to the dedicated twin service.
 *
 * The previous mock route is kept as a fallback for when inventory-twin-service
 * is unreachable (returns 503). In production, this fallback should be removed
 * and inventory-twin-service should be a hard dependency.
 */

import { Router } from 'express';

const router = Router();

const INVENTORY_TWIN_URL = process.env.INVENTORY_TWIN_URL || 'http://localhost:4016';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUEST_TIMEOUT_MS = 10000;

async function proxyToTwin(req, res, next) {
  const pathSuffix = req.path.replace(/^\/+/, '');
  const queryIdx = req.url.indexOf('?');
  const queryString = queryIdx >= 0 ? req.url.substring(queryIdx) : '';
  const targetUrl = `${INVENTORY_TWIN_URL}/${pathSuffix}${queryString}`;

  const headers = {
    'content-type': req.headers['content-type'] || 'application/json',
  };
  if (INTERNAL_SERVICE_TOKEN) {
    headers['x-internal-token'] = INTERNAL_SERVICE_TOKEN;
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
      error: { code: 'INVENTORY_TWIN_UNREACHABLE', message: `inventory-twin-service unreachable: ${message}` },
    });
  }
}

router.use('/', proxyToTwin);

export default router;
