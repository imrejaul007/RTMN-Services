/**
 * HOJAI Agents Service
 * Port: 4550
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4550', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
  skills: string[];
  status: 'idle' | 'running' | 'paused' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

interface AgentRun {
  id: string;
  agentId: string;
  input: any;
  output?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}

// In-memory store
const agents = new Map<string, Agent>();
const runs = new Map<string, AgentRun>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-agents', version: '1.0.0', uptime: process.uptime() });
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

// Agent CRUD
app.get('/api/agents', (req: Request, res: Response) => {
  const { type, status } = req.query;
  let list = Array.from(agents.values());

  if (type) list = list.filter(a => a.type === type);
  if (status) list = list.filter(a => a.status === status);

  res.json({ count: list.length, agents: list });
});

app.post('/api/agents', (req: Request, res: Response) => {
  const { name, type, description, skills } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  const agent: Agent = {
    id: uuidv4(),
    name,
    type,
    description,
    skills: skills || [],
    status: 'idle',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  agents.set(agent.id, agent);
  res.status(201).json({ success: true, agent });
});

app.get('/api/agents/:id', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

app.put('/api/agents/:id', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const { name, type, description, skills, status } = req.body;
  if (name) agent.name = name;
  if (type) agent.type = type;
  if (description !== undefined) agent.description = description;
  if (skills) agent.skills = skills;
  if (status) agent.status = status;
  agent.updatedAt = new Date();

  agents.set(agent.id, agent);
  res.json({ success: true, agent });
});

app.delete('/api/agents/:id', (req: Request, res: Response) => {
  const deleted = agents.delete(req.params.id);
  res.json({ success: deleted });
});

// Agent invocation
app.post('/api/agents/:id/run', async (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const { input } = req.body;

  const run: AgentRun = {
    id: uuidv4(),
    agentId: agent.id,
    input: input || {},
    status: 'pending',
    startedAt: new Date(),
  };

  runs.set(run.id, run);

  // Simulate agent execution
  agent.status = 'running';
  agents.set(agent.id, agent);

  setTimeout(() => {
    run.status = 'completed';
    run.output = { result: `Processed by ${agent.type} agent`, input };
    run.completedAt = new Date();
    runs.set(run.id, run);

    agent.status = 'idle';
    agents.set(agent.id, agent);
  }, 100);

  res.status(201).json({ success: true, runId: run.id, status: run.status });
});

// Get run
app.get('/api/runs/:id', (req: Request, res: Response) => {
  const run = runs.get(req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(run);
});

// Get agent runs
app.get('/api/agents/:id/runs', (req: Request, res: Response) => {
  const agentRuns = Array.from(runs.values()).filter(r => r.agentId === req.params.id);
  res.json({ count: agentRuns.length, runs: agentRuns });
});

// Agent types
app.get('/api/agent-types', (req: Request, res: Response) => {
  res.json({
    types: [
      { id: 'conversational', name: 'Conversational', description: 'Natural language interactions' },
      { id: 'task', name: 'Task', description: 'Execute specific tasks' },
      { id: 'automation', name: 'Automation', description: 'Automate workflows' },
      { id: 'analysis', name: 'Analysis', description: 'Data analysis and insights' },
      { id: 'custom', name: 'Custom', description: 'Build custom agents' },
    ],
  });
});

// Stats
app.get('/api/stats', (req: Request, res: Response) => {
  const agentStats = {
    total: agents.size,
    idle: Array.from(agents.values()).filter(a => a.status === 'idle').length,
    running: Array.from(agents.values()).filter(a => a.status === 'running').length,
  };

  const runStats = {
    total: runs.size,
    pending: Array.from(runs.values()).filter(r => r.status === 'pending').length,
    completed: Array.from(runs.values()).filter(r => r.status === 'completed').length,
    failed: Array.from(runs.values()).filter(r => r.status === 'failed').length,
  };

  res.json({ agents: agentStats, runs: runStats });
});

app.listen(PORT, () => {
  console.log(`\n🤖 HOJAI Agents Service (${PORT})\n`);
});

export default app;