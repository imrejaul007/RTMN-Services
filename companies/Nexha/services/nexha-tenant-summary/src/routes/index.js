/**
 * Routes for nexha-tenant-summary (ADR-0011 Phase 13, 2026-06-23).
 *
 * All routes are tenant-scoped. The tenantId comes from:
 *   1. URL path (/tenants/:tenantId/summary)
 *   2. Query param (?tenantId=...)
 *   3. x-tenant-id header
 *   4. JWT claim (user.tenantId)
 *
 * Plus a top-level health check that fans out to all upstream services.
 */

import express from 'express';
import { requireAuth, tenantFrom } from '../middleware/auth.js';
import { buildSummary, checkUpstreams, FANOUT_TARGETS } from '../services/summaryService.js';

const router = express.Router();

router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────

/**
 * GET /sources — list of upstream services this aggregator calls.
 */
router.get('/sources', (_req, res) => {
  res.json({
    success: true,
    sources: FANOUT_TARGETS.map((t) => ({
      key: t.key,
      label: t.label,
      service: t.service,
      path: t.path,
    })),
    total: FANOUT_TARGETS.length,
  });
});

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────

/**
 * GET /tenants/:tenantId/summary — fan-out and merge.
 */
router.get('/tenants/:tenantId/summary', async (req, res) => {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'tenantId required' } });
  }

  try {
    const summary = await buildSummary({
      tenantId,
      hubUrl: process.env.RTMN_HUB_URL || 'http://localhost:4399',
      headers: {
        authorization: req.headers.authorization || '',
        'x-internal-token': req.headers['x-internal-token'] || '',
      },
    });
    res.json({ success: true, ...summary });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
    });
  }
});

/**
 * GET /tenants/:tenantId/summary/:section — single-section view.
 * Useful when a client only wants the directory or missions, not everything.
 */
router.get('/tenants/:tenantId/summary/:section', async (req, res) => {
  const { tenantId, section } = req.params;
  const target = FANOUT_TARGETS.find((t) => t.key === section);
  if (!target) {
    return res.status(404).json({ success: false, error: { code: 'UNKNOWN_SECTION', message: `unknown section: ${section}` } });
  }
  try {
    const path = target.path.replaceAll(':tenantId', encodeURIComponent(tenantId));
    const url = `${process.env.RTMN_HUB_URL || 'http://localhost:4399'}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), parseInt(process.env.UPSTREAM_TIMEOUT_MS || '3000', 10));
    try {
      const response = await fetch(url, {
        method: target.method,
        headers: {
          authorization: req.headers.authorization || '',
          'x-internal-token': req.headers['x-internal-token'] || '',
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      res.json({ success: true, section, tenantId, data: target.transform(data) });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    res.status(err.name === 'AbortError' ? 504 : 502).json({
      success: false,
      error: { code: err.name === 'AbortError' ? 'TIMEOUT' : 'UPSTREAM_ERROR', message: err.message },
    });
  }
});

/**
 * GET /health/upstreams — fan-out health check (no auth required for ops dashboards).
 * Auth is still required by the middleware; if you want public, mount outside.
 */
router.get('/health/upstreams', async (_req, res) => {
  try {
    const health = await checkUpstreams({
      hubUrl: process.env.RTMN_HUB_URL || 'http://localhost:4399',
    });
    res.json({ success: true, ...health });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

export default router;