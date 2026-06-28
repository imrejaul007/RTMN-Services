// Agent OS - Production agent runtime. Port 4892
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';
import { validateStateTransition } from './state-machine.js';
import { spawnAgent, killAgent } from './process-manager.js';
import { recordHeartbeat, getAgentHealth, markDeadAgents } from './health-monitor.js';
import { sendMessage, receiveMessages, getConversations } from './ipc.js';
import { getSandboxDir } from './sandbox.js';

const app = express();
const PORT = 4892;
app.use(express.json());

const agents = new Map();
const DATA_FILE = 'agents.json';

function loadAgents() { try { return readJson(DATA_FILE) || []; } catch { return []; } }
function saveAgents(list) { writeJson(DATA_FILE, list); }
function getList() {
  if (agents.size === 0) loadAgents().forEach(a => agents.set(a.id, a));
  return agents;
}

// Agent CRUD
app.get('/api/agents', (req, res) => {
  const list = Array.from(getList().values());
  res.json({ agents: list, count: list.length });
});

app.get('/api/agents/:id', (req, res) => {
  const a = getList().get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });
  res.json(a);
});

app.post('/api/agents', (req, res) => {
  const { name, type, config = {} } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const agent = {
    id: uuidv4(), name, type,
    state: 'idle', config,
    sandboxDir: getSandboxDir(uuidv4()),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastHeartbeat: null, exitCode: null, pid: null,
  };
  getList().set(agent.id, agent);
  saveAgents(Array.from(getList().values()));
  res.status(201).json(agent);
});

app.put('/api/agents/:id', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const { name, type, config } = req.body;
  if (name) agent.name = name;
  if (type) agent.type = type;
  if (config) agent.config = { ...agent.config, ...config };
  agent.updatedAt = new Date().toISOString();
  getList().set(agent.id, agent);
  saveAgents(Array.from(getList().values()));
  res.json(agent);
});

app.delete('/api/agents/:id', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (agent.state === 'running') killAgent(agent.id);
  getList().delete(req.params.id);
  saveAgents(Array.from(getList().values()));
  res.json({ deleted: true, id: req.params.id });
});

// Lifecycle
app.post('/api/agents/:id/start', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  try {
    validateStateTransition(agent.state, 'running');
    const pid = spawnAgent(agent);
    agent.pid = pid;
    agent.state = 'running';
    agent.updatedAt = new Date().toISOString();
    recordHeartbeat(agent.id);
    getList().set(agent.id, agent);
    saveAgents(Array.from(getList().values()));
    res.json({ state: agent.state, pid });
  } catch (err) {
    agent.state = 'error';
    agent.exitCode = err.message;
    getList().set(agent.id, agent);
    saveAgents(Array.from(getList().values()));
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/agents/:id/pause', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  try {
    validateStateTransition(agent.state, 'paused');
    agent.state = 'paused';
    agent.updatedAt = new Date().toISOString();
    getList().set(agent.id, agent);
    saveAgents(Array.from(getList().values()));
    res.json({ state: agent.state });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/agents/:id/resume', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  try {
    validateStateTransition(agent.state, 'running');
    agent.state = 'running';
    agent.updatedAt = new Date().toISOString();
    getList().set(agent.id, agent);
    saveAgents(Array.from(getList().values()));
    res.json({ state: agent.state });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/agents/:id/stop', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  try {
    validateStateTransition(agent.state, 'stopped');
    if (agent.pid) killAgent(agent.id);
    agent.pid = null;
    agent.state = 'stopped';
    agent.updatedAt = new Date().toISOString();
    getList().set(agent.id, agent);
    saveAgents(Array.from(getList().values()));
    res.json({ state: agent.state });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/agents/:id/execute', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (agent.state !== 'running') return res.status(400).json({ error: `Agent is ${agent.state}, not running` });
  const { task, input = {} } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });
  res.json({ executionId: uuidv4(), agentId: agent.id, task, status: 'success', output: `Result for: ${task}`, timestamp: new Date().toISOString() });
});

// Health
app.get('/api/agents/:id/health', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(getAgentHealth(agent));
});

app.get('/api/agents/:id/heartbeat', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  recordHeartbeat(agent.id);
  agent.lastHeartbeat = new Date().toISOString();
  getList().set(agent.id, agent);
  res.json({ heartbeat: agent.lastHeartbeat });
});

app.post('/api/health/cleanup', (req, res) => {
  const dead = markDeadAgents(getList());
  saveAgents(Array.from(getList().values()));
  res.json({ cleaned: dead.length, deadAgents: dead });
});

// IPC
app.post('/api/ipc/send', (req, res) => {
  const { from, to, message, type = 'text' } = req.body;
  if (!from || !to || !message) return res.status(400).json({ error: 'from, to, message required' });
  res.json(sendMessage({ from, to, message, type }));
});

app.get('/api/ipc/inbox/:agentId', (req, res) => {
  const msgs = receiveMessages(req.params.agentId);
  res.json({ messages: msgs, count: msgs.length });
});

app.get('/api/ipc/conversations/:agentId', (req, res) => {
  res.json({ conversations: getConversations(req.params.agentId) });
});

// Sandbox
app.get('/api/agents/:id/sandbox', (req, res) => {
  const agent = getList().get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({ sandboxDir: agent.sandboxDir });
});

// Stats
app.get('/api/stats', (req, res) => {
  const list = Array.from(getList().values());
  const states = list.reduce((acc, a) => { acc[a.state] = (acc[a.state] || 0) + 1; return acc; }, {});
  res.json({ total: list.length, byState: states });
});

// Health / ready
app.get('/health', (req, res) => res.json({ service: 'agent-os', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log(`Agent OS running on port ${PORT}`); });
export default server;
