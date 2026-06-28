import { Router } from 'express';
import { getBaselines, getBaseline, saveBaseline, getRun } from '../metrics-store.js';

const router = Router();

// GET /api/baseline — get baseline(s)
router.get('/baseline', (req, res) => {
  const { service, suite } = req.query;
  if (service && suite) {
    const b = getBaseline(service, suite);
    return res.json(b || { message: 'No baseline found' });
  }
  const all = getBaselines();
  res.json({ baselines: all, total: all.length });
});

// POST /api/baseline — set baseline
router.post('/baseline', (req, res) => {
  const { service, suite, runId, metrics } = req.body;
  if (!service || !suite) return res.status(400).json({ error: 'service and suite are required' });

  let baselineMetrics = metrics;
  if (runId && !metrics) {
    const run = getRun(runId);
    if (!run) return res.status(404).json({ error: 'run not found' });
    if (!run.metrics) return res.status(400).json({ error: 'run has no metrics' });
    baselineMetrics = run.metrics;
  }
  if (!baselineMetrics) return res.status(400).json({ error: 'metrics or runId required' });

  const baseline = { service, suite, createdAt: new Date().toISOString(), metrics: baselineMetrics };
  saveBaseline(baseline);
  res.status(201).json(baseline);
});

export default router;
