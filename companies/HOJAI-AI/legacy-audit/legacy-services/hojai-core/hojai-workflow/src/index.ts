/**
 * HOJAI Workflow Engine
 * Port: 4810
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4810', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'approval' | 'agent';
  config: any;
  next?: string[];
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep?: string;
  context: any;
  startedAt: Date;
}

const workflows = new Map<string, Workflow>();
const runs = new Map<string, WorkflowRun>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-workflow', version: '1.0.0', uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Workflow CRUD
app.get('/api/workflows', (req: Request, res: Response) => {
  const list = Array.from(workflows.values());
  res.json({ count: list.length, workflows: list });
});

app.post('/api/workflows', (req: Request, res: Response) => {
  const { name, steps } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const workflow: Workflow = {
    id: uuidv4(),
    name,
    steps: steps || [],
    status: 'draft',
    createdAt: new Date(),
  };

  workflows.set(workflow.id, workflow);
  res.status(201).json({ success: true, workflow });
});

app.get('/api/workflows/:id', (req: Request, res: Response) => {
  const wf = workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
});

app.post('/api/workflows/:id/trigger', (req: Request, res: Response) => {
  const wf = workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  const run: WorkflowRun = {
    id: uuidv4(),
    workflowId: wf.id,
    status: 'running',
    context: req.body || {},
    startedAt: new Date(),
  };

  runs.set(run.id, run);
  res.status(201).json({ success: true, run });
});

app.get('/api/runs/:id', (req: Request, res: Response) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

app.listen(PORT, () => {
  console.log(`\n⚙️ HOJAI Workflow Engine (${PORT})\n`);
});

export default app;