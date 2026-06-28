import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { runEvalSuite, createRunningRun } from '../eval-runner.js';
import { saveRun, getRuns, getRun } from '../metrics-store.js';

const router = Router();

// POST /api/runs — trigger an eval run
router.post('/runs', async (req, res) => {
  const { service, suite = 'default', async: asyncRun = false } = req.body;
  if (!service) return res.status(400).json({ error: 'service is required' });

  if (asyncRun) {
    const run = createRunningRun(service, suite);
    saveRun(run);
    // Simulate async completion
    setTimeout(async () => {
      const result = await runEvalSuite(service, suite);
      run.status = result.status;
      run.completedAt = result.completedAt;
      run.metrics = result.metrics;
      run.verdict = result.verdict;
      saveRun(run);
    }, 500);
    return res.status(202).json({ run, message: 'Run started asynchronously' });
  }

  const result = await runEvalSuite(service, suite);
  saveRun(result);
  res.status(201).json(result);
});

// GET /api/runs — list all runs
router.get('/runs', (req, res) => {
  const { service, suite, status, limit = 50 } = req.query;
  let runs = getRuns();
  if (service) runs = runs.filter(r => r.service === service);
  if (suite) runs = runs.filter(r => r.suite === suite);
  if (status) runs = runs.filter(r => r.status === status);
  runs = runs.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)).slice(0, parseInt(limit));
  res.json({ runs, total: runs.length });
});

// GET /api/runs/:id — get run details
router.get('/runs/:id', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  res.json(run);
});

export default router;
