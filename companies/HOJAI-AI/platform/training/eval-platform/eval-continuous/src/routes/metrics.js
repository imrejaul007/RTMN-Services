import { Router } from 'express';
import { getMetricsTrend, getCurrentMetrics } from '../metrics-store.js';

const router = Router();

// GET /api/metrics — current metrics
router.get('/metrics', (req, res) => {
  const { service, suite } = req.query;
  const data = getCurrentMetrics(service, suite);
  if (!data) return res.json({ current: null, baseline: null, compare: null, message: 'No runs found' });
  res.json(data);
});

// GET /api/metrics/trend — metrics over time
router.get('/metrics/trend', (req, res) => {
  const { service, suite, limit = 20 } = req.query;
  const trend = getMetricsTrend(service, suite, parseInt(limit));
  res.json({ trend, count: trend.length });
});

export default router;
