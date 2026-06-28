import { Router } from 'express';
import { isGated, getRun } from '../metrics-store.js';

const router = Router();

// GET /api/gates/:service — check if deployment is gated
router.get('/gates/:service', (req, res) => {
  const { service } = req.params;
  const { suite } = req.query;
  const gated = isGated(service, suite);
  res.json({
    service,
    suite: suite || 'all',
    gated,
    message: gated ? 'Deployment is gated — eval results do not pass threshold' : 'Deployment is clear',
    checkedAt: new Date().toISOString()
  });
});

// POST /api/gates — check multiple services
router.post('/gates', (req, res) => {
  const { services } = req.body;
  if (!services || !Array.isArray(services)) return res.status(400).json({ error: 'services array required' });
  const results = services.map(s => ({
    service: typeof s === 'string' ? s : s.service,
    suite: typeof s === 'string' ? undefined : s.suite,
    gated: isGated(typeof s === 'string' ? s : s.service, typeof s === 'string' ? undefined : s.suite)
  }));
  const allClear = results.every(r => !r.gated);
  res.json({ results, allClear, checkedAt: new Date().toISOString() });
});

export default router;
