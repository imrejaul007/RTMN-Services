import { Router } from 'express';
import { getJobMetrics, getMetricsTrend, seedMockMetrics } from '../metrics-collector.js';

const router = Router();

router.get('/jobs/:id/metrics', (req, res) => {
  const { limit = 100 } = req.query;
  const metrics = getJobMetrics(req.params.id, parseInt(limit));
  res.json({ jobId: req.params.id, metrics, count: metrics.length });
});

router.get('/jobs/:id/metrics/trend', (req, res) => {
  const { limit = 50 } = req.query;
  const trend = getMetricsTrend(req.params.id, parseInt(limit));
  res.json({ jobId: req.params.id, trend, count: trend.length });
});

// Seed mock metrics for testing (in production, would come from GPU service)
router.post('/jobs/:id/metrics/seed', (req, res) => {
  const { steps = 100, epochs = 3 } = req.body;
  const seeded = seedMockMetrics(req.params.id, parseInt(steps), parseInt(epochs));
  res.json({ message: 'mock metrics seeded', count: seeded.length });
});

export default router;
