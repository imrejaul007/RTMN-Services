/**
 * RuntimeOS - Port: 4860
 *
 * Agent lifecycle, scheduling, resource limits, scaling, hot swaps
 * Think: Kubernetes for AI employees
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4860', 10);
app.use(express.json());

// Types
interface Agent {
  id: string; name: string; type: string; version: string;
  status: 'starting' | 'running' | 'paused' | 'stopped' | 'error';
  memory: { current: number; limit: number };
  cpu: { current: number; limit: number };
  tokens: { daily: number; limit: number; reset: string };
  capabilities: string[]; permissions: string[];
  dependencies: string[]; health: number;
  restarts: number; lastHealth: string;
  createdAt: string; updatedAt: string;
}

interface Pod {
  id: string; name: string;
  agents: string[];
  resources: { cpu: number; memory: number; tokens: number };
  isolation: 'shared' | 'sandbox' | 'dedicated';
  scaling: { min: number; max: number; current: number };
}

interface Schedule {
  id: string; agentId: string;
  cron: string; payload: any;
  enabled: boolean; lastRun?: string; nextRun?: string;
  retries: number;
}

interface ResourceQuota {
  teamId: string; monthlyTokens: number;
  dailyCost: number; agents: number;
  storage: number;
}

// Storage
const agents = new Map<string, Agent>();
const pods = new Map<string, Pod>();
const schedules = new Map<string, Schedule>();
const quotas = new Map<string, ResourceQuota>();
const events: any[] = [];

app.get('/health', (_r, res) => {
  const running = Array.from(agents.values()).filter(a => a.status === 'running').length;
  res.json({
    status: 'healthy', service: 'runtime-os', version: '1.0.0',
    agents: { total: agents.size, running },
    pods: pods.size
  });
});

app.get('/ready', (_r, res) => res.json({ ready: true }));

// === AGENTS ===
app.get('/api/agents', (req, res) => {
  const { status, type } = req.query;
  let all = Array.from(agents.values());
  if (status) all = all.filter(a => a.status === status);
  if (type) all = all.filter(a => a.type === type);
  res.json({ success: true, data: { agents: all, total: all.length } });
});

app.post('/api/agents',requireAuth,  (req, res) => {
  const { name, type, capabilities, limits } = req.body;
  if (!name || !type) return res.status(400).json({ success: false, error: 'name and type required' });

  const agent: Agent = {
    id: uuidv4(), name, type, version: '1.0.0',
    status: 'starting',
    memory: { current: 0, limit: limits?.memory || 512 },
    cpu: { current: 0, limit: limits?.cpu || 2 },
    tokens: { daily: 0, limit: limits?.tokens || 100000, reset: new Date().toISOString() },
    capabilities: capabilities || [],
    permissions: [],
    dependencies: [],
    health: 100,
    restarts: 0,
    lastHealth: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  agents.set(agent.id, agent);
  logEvent('AGENT_CREATED', agent);
  res.status(201).json({ success: true, data: agent });
});

app.patch('/api/agents/:id/status',requireAuth,  (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  const { status } = req.body;
  if (status) agent.status = status;
  agent.updatedAt = new Date().toISOString();
  logEvent('STATUS_CHANGED', { agentId: agent.id, status });
  res.json({ success: true, data: agent });
});

app.post('/api/agents/:id/restart',requireAuth,  (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  agent.status = 'starting';
  agent.restarts++;
  agent.updatedAt = new Date().toISOString();
  setTimeout(() => { agent.status = 'running'; }, 1000);
  logEvent('AGENT_RESTARTED', { agentId: agent.id });
  res.json({ success: true, data: { agentId: agent.id, action: 'restarting' } });
});

app.delete('/api/agents/:id',requireAuth,  (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  agent.status = 'stopped';
  logEvent('AGENT_STOPPED', { agentId: req.params.id });
  res.json({ success: true, data: { deleted: req.params.id } });
});

// === RESOURCE MANAGEMENT ===
app.post('/api/agents/:id/resources',requireAuth,  (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  const { memory, cpu, tokens } = req.body;
  if (memory) agent.memory.limit = memory;
  if (cpu) agent.cpu.limit = cpu;
  if (tokens) agent.tokens.limit = tokens;
  res.json({ success: true, data: agent });
});

app.get('/api/quotas/:teamId', (req, res) => {
  const quota = quotas.get(req.params.teamId);
  res.json({ success: true, data: quota || { teamId: req.params.teamId, monthlyTokens: 0, dailyCost: 0, agents: 0, storage: 0 });
});

app.post('/api/quotas',requireAuth,  (req, res) => {
  const { teamId, monthlyTokens, agents: agentLimit, storage } = req.body;
  if (!teamId) return res.status(400).json({ success: false, error: 'teamId required' });
  const quota: ResourceQuota = { teamId, monthlyTokens: monthlyTokens || 1000000, dailyCost: 0, agents: agentLimit || 10, storage: storage || 100 };
  quotas.set(teamId, quota);
  res.status(201).json({ success: true, data: quota });
});

// === SCHEDULING ===
app.get('/api/schedule', (req, res) => {
  const { agentId } = req.query;
  let all = Array.from(schedules.values());
  if (agentId) all = all.filter(s => s.agentId === agentId);
  res.json({ success: true, data: { schedules: all } });
});

app.post('/api/schedule',requireAuth,  (req, res) => {
  const { agentId, cron, payload } = req.body;
  if (!agentId || !cron) return res.status(400).json({ success: false, error: 'agentId and cron required' });
  const schedule: Schedule = { id: uuidv4(), agentId, cron, payload, enabled: true, retries: 0 };
  schedules.set(schedule.id, schedule);
  logEvent('SCHEDULE_CREATED', schedule);
  res.status(201).json({ success: true, data: schedule });
});

app.patch('/api/schedule/:id',requireAuth,  (req, res) => {
  const schedule = schedules.get(req.params.id);
  if (!schedule) return res.status(404).json({ success: false, error: 'Schedule not found' });
  Object.assign(schedule, req.body);
  res.json({ success: true, data: schedule });
});

// === PODS (Agent Groups) ===
app.get('/api/pods', (_req, res) => res.json({ success: true, data: { pods: Array.from(pods.values() } }));

app.post('/api/pods',requireAuth,  (req, res) => {
  const { name, agents: agentIds, isolation, resources } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const pod: Pod = {
    id: uuidv4(), name,
    agents: agentIds || [],
    resources: resources || { cpu: 4, memory: 2048, tokens: 500000 },
    isolation: isolation || 'shared',
    scaling: { min: 1, max: 5, current: 1 }
  };
  pods.set(pod.id, pod);
  res.status(201).json({ success: true, data: pod });
});

app.patch('/api/pods/:id/scale',requireAuth,  (req, res) => {
  const pod = pods.get(req.params.id);
  if (!pod) return res.status(404).json({ success: false, error: 'Pod not found' });
  pod.scaling.current = req.body.instances || pod.scaling.current;
  logEvent('POD_SCALED', { podId: pod.id, instances: pod.scaling.current });
  res.json({ success: true, data: pod });
});

// === EVENTS ===
function logEvent(type: string, data: any) {
  events.push({ type, data, timestamp: new Date().toISOString(), id: uuidv4() });
  if (events.length > 10000) events.shift();
}

app.get('/api/events', (req, res) => {
  const { type, limit = 100 } = req.query;
  let filtered = events;
  if (type) filtered = filtered.filter(e => e.type === type);
  res.json({ success: true, data: { events: filtered.slice(-Number(limit) } });
});

app.use((_req: any, res: any) => res.status(404).json({ success: false, error: 'NOT_FOUND' }));

const server = app.listen(PORT, () => console.log(`RuntimeOS - Port ${PORT} | Agents: ${agents.size}`));
process.on('SIGTERM', () => server.close());
export default app;
