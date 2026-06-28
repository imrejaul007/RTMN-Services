/**
 * Workflow Builder - Visual workflow designer
 * Port 4680
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4680;
app.use(express.json());

const workflows = new Map();

app.get('/api/workflows', (req, res) => res.json({ workflows: Array.from(workflows.values()) }));
app.post('/api/workflows', (req, res) => {
  const { name, steps, triggers } = req.body;
  const workflow = { id: uuidv4(), name, steps: steps || [], triggers: triggers || [], status: 'draft', createdAt: new Date().toISOString() };
  workflows.set(workflow.id, workflow);
  res.json(workflow);
});
app.get('/api/workflows/:id', (req, res) => {
  const wf = workflows.get(req.params.id);
  wf ? res.json(wf) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/workflows/:id/execute', (req, res) => {
  const wf = workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Not found' });
  res.json({ executionId: uuidv4(), workflowId: wf.id, status: 'running' });
});

app.listen(PORT, () => console.log(`Workflow Builder running on port ${PORT}`));
export default app;