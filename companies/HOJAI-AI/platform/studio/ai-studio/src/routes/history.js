import { Router } from 'express';
import { readJson } from '../store.js';

const router = Router();

// GET /api/workflows/:id/history
router.get('/workflows/:id/history', (req, res) => {
  const history = readJson('executions').filter(e => e.workflowId === req.params.id)
    .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
  res.json({ executions: history, count: history.length });
});

export default router;
