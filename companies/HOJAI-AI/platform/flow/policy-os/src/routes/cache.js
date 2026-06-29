/**
 * PolicyOS — Cache Routes (Phase P2)
 *
 * Endpoints for distributed cache management.
 */

import {
  getCacheStats,
  invalidateEvalCache,
  invalidatePolicy,
  warmCache,
  disconnectCache,
} from '../services/cache.js';

export function registerCacheRoutes(app, { policies, customAuth }) {

  // GET /api/cache/stats — cache statistics
  app.get('/api/cache/stats', customAuth, async (req, res) => {
    const stats = await getCacheStats();
    res.json(stats);
  });

  // POST /api/cache/warm — repopulate cache from policy store
  app.post('/api/cache/warm', customAuth, async (req, res) => {
    const { ttlMs = 300000 } = req.body || {};
    await warmCache(policies, ttlMs);
    const stats = await getCacheStats();
    res.json({ ok: true, warmed: true, stats });
  });

  // POST /api/cache/invalidate — invalidate eval cache
  app.post('/api/cache/invalidate', customAuth, async (req, res) => {
    await invalidateEvalCache();
    res.json({ ok: true, invalidated: 'eval-cache' });
  });

  // POST /api/cache/invalidate/:policyId — invalidate specific policy cache
  app.post('/api/cache/invalidate/:policyId', customAuth, async (req, res) => {
    await invalidatePolicy(req.params.policyId);
    res.json({ ok: true, invalidated: `policy:${req.params.policyId}`, evalCacheAlso: true });
  });

  // POST /api/cache/disconnect — disconnect Redis (for graceful shutdown)
  app.post('/api/cache/disconnect', customAuth, async (req, res) => {
    await disconnectCache();
    res.json({ ok: true, message: 'Redis disconnected' });
  });
}
