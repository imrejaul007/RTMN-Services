import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { WorkflowExecutor } from '../executor/index.js';
import { readJson, writeJson } from '../store.js';

const router = Router();

// POST /api/workflows/:id/execute
router.post('/workflows/:id/execute', async (req, res) => {
  const workflows = readJson('workflows');
  const wf = workflows.find(w => w.id === req.params.id);
  if (!wf) return res.status(404).json({ error: 'workflow not found' });

  const exec = new WorkflowExecutor(wf);
  const result = await exec.execute();

  const execution = {
    id: uuid(),
    workflowId: wf.id,
    workflowName: wf.name,
    ...result,
    triggeredAt: new Date().toISOString()
  };

  const history = readJson('executions');
  history.push(execution);
  writeJson('executions', history);

  res.status(201).json(execution);
});

// GET /api/executions/:id
router.get('/executions/:id', (req, res) => {
  const history = readJson('executions');
  const exec = history.find(e => e.id === req.params.id);
  if (!exec) return res.status(404).json({ error: 'execution not found' });
  res.json(exec);
});

export default router;
