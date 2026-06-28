/**
 * FlowOS Agent Protocol - A2A + MCP Native
 *
 * Universal agent-to-agent communication:
 * - A2A (Agent-to-Agent) protocol
 * - MCP (Model Context Protocol) adapter
 * - Multi-model routing
 * - Capability registry
 * - Message bus
 *
 * Port: 5368
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5368;

app.use(cors());
app.use(express.json());

// Storage
const storage = {
  agents: new Map(),
  capabilities: new Map(),
  messages: new Map(),
  sessions: new Map(),
  models: new Map()
};

// Supported models
const DEFAULT_MODELS = {
  claude: { provider: 'anthropic', endpoint: 'https://api.anthropic.com', capabilities: ['reasoning', 'coding', 'analysis'] },
  gpt4: { provider: 'openai', endpoint: 'https://api.openai.com', capabilities: ['reasoning', 'coding', 'creative'] },
  gemini: { provider: 'google', endpoint: 'https://generativelanguage.googleapis.com', capabilities: ['reasoning', 'multimodal'] },
  qwen: { provider: 'alibaba', endpoint: '[image]', capabilities: ['reasoning', 'coding'] },
  deepseek: { provider: 'deepseek', endpoint: 'https://api.deepseek.com', capabilities: ['reasoning', 'coding', 'math'] }
};

// A2A Message Types
const MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
  NOTIFICATION: 'notification',
  ERROR: 'error'
};

// MCP Resource Types
const RESOURCE_TYPES = {
  FILE: 'file',
  DATABASE: 'database',
  API: 'api',
  MEMORY: 'memory',
  TWIN: 'twin'
};

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-protocol',
    version: '1.0.0',
    port: PORT,
    agents: storage.agents.size,
    models: storage.models.size,
    timestamp: new Date().toISOString()
  });
});

// ── Agent Registry ────────────────────────────────────────────────

/**
 * Register an agent
 * POST /api/agents
 */
app.post('/api/agents', (req, res) => {
  try {
    const { id, name, type, capabilities = [], endpoint, metadata = {} } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const agentId = id || 'agent_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    const agent = {
      id: agentId,
      name,
      type: type || 'generic',
      capabilities,
      endpoint,
      metadata,
      status: 'online',
      registeredAt: now,
      lastSeen: now
    };

    storage.agents.set(agentId, agent);

    // Register capabilities
    for (const cap of capabilities) {
      if (!storage.capabilities.has(cap)) {
        storage.capabilities.set(cap, []);
      }
      storage.capabilities.get(cap).push(agentId);
    }

    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get agent
 * GET /api/agents/:id
 */
app.get('/api/agents/:id', (req, res) => {
  const agent = storage.agents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Update last seen
  agent.lastSeen = new Date().toISOString();
  storage.agents.set(agent.id, agent);

  res.json(agent);
});

/**
 * List agents
 * GET /api/agents
 */
app.get('/api/agents', (req, res) => {
  const { type, capability, status } = req.query;

  let agents = Array.from(storage.agents.values());

  if (type) agents = agents.filter(a => a.type === type);
  if (status) agents = agents.filter(a => a.status === status);
  if (capability) {
    const agentIds = storage.capabilities.get(capability) || [];
    agents = agents.filter(a => agentIds.includes(a.id));
  }

  res.json({ count: agents.length, agents });
});

/**
 * Update agent
 * PUT /api/agents/:id
 */
app.put('/api/agents/:id', (req, res) => {
  const agent = storage.agents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const updates = req.body || {};
  const updated = { ...agent, ...updates, id: agent.id, lastSeen: new Date().toISOString() };
  storage.agents.set(agent.id, updated);

  res.json(updated);
});

/**
 * Delete agent
 * DELETE /api/agents/:id
 */
app.delete('/api/agents/:id', (req, res) => {
  if (!storage.agents.has(req.params.id)) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  storage.agents.delete(req.params.id);
  res.json({ success: true });
});

// ── Capabilities ────────────────────────────────────────────────

/**
 * Get capabilities
 * GET /api/capabilities
 */
app.get('/api/capabilities', (req, res) => {
  const capabilities = Array.from(storage.capabilities.entries()).map(([name, agents]) => ({
    name,
    agentCount: agents.length,
    agents
  }));

  res.json({ count: capabilities.length, capabilities });
});

/**
 * Find agents by capability
 * GET /api/capabilities/:name/agents
 */
app.get('/api/capabilities/:name/agents', (req, res) => {
  const agentIds = storage.capabilities.get(req.params.name) || [];
  const agents = agentIds.map(id => storage.agents.get(id)).filter(Boolean);

  res.json({ capability: req.params.name, count: agents.length, agents });
});

// ── A2A Messaging ────────────────────────────────────────────────

/**
 * Send message to agent
 * POST /api/messages
 */
app.post('/api/messages', (req, res) => {
  try {
    const { from, to, type = MESSAGE_TYPES.REQUEST, content, sessionId, metadata = {} } = req.body || {};

    if (!to || !content) {
      return res.status(400).json({ error: 'to and content are required' });
    }

    // Validate recipient exists
    const recipient = storage.agents.get(to);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient agent not found' });
    }

    const messageId = 'msg_' + crypto.randomUUID();
    const now = new Date().toISOString();

    const message = {
      id: messageId,
      from,
      to,
      type,
      content,
      sessionId: sessionId || 'session_' + crypto.randomUUID().slice(0, 8),
      metadata,
      status: 'delivered',
      createdAt: now,
      deliveredAt: now
    };

    if (!storage.messages.has(message.sessionId)) {
      storage.messages.set(message.sessionId, []);
    }
    storage.messages.get(message.sessionId).push(message);

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get message
 * GET /api/messages/:id
 */
app.get('/api/messages/:id', (req, res) => {
  for (const [sessionId, messages] of storage.messages) {
    const message = messages.find(m => m.id === req.params.id);
    if (message) {
      return res.json(message);
    }
  }

  res.status(404).json({ error: 'Message not found' });
});

/**
 * Get session messages
 * GET /api/sessions/:sessionId/messages
 */
app.get('/api/sessions/:sessionId/messages', (req, res) => {
  const messages = storage.messages.get(req.params.sessionId) || [];
  res.json({ sessionId: req.params.sessionId, count: messages.length, messages });
});

// ── MCP Protocol ────────────────────────────────────────────────

/**
 * Initialize MCP connection
 * POST /api/mcp/initialize
 */
app.post('/api/mcp/initialize', (req, res) => {
  const { clientId, capabilities = [], protocolVersion = '1.0' } = req.body || {};

  const sessionId = 'mcp_' + crypto.randomUUID();
  const now = new Date().toISOString();

  const session = {
    id: sessionId,
    clientId,
    protocolVersion,
    capabilities,
    status: 'initialized',
    createdAt: now
  };

  storage.sessions.set(sessionId, session);

  res.json({
    sessionId,
    serverCapabilities: {
      resources: Object.values(RESOURCE_TYPES),
      tools: true,
      prompts: true
    },
    protocolVersion: '1.0'
  });
});

/**
 * List MCP resources
 * GET /api/mcp/resources
 */
app.get('/api/mcp/resources', (req, res) => {
  const { sessionId, type } = req.query;

  if (!sessionId || !storage.sessions.has(sessionId)) {
    return res.status(400).json({ error: 'Invalid or missing sessionId' });
  }

  const resources = [
    { uri: 'memory://context', type: RESOURCE_TYPES.MEMORY, name: 'AI Context' },
    { uri: 'twin://workflow/state', type: RESOURCE_TYPES.TWIN, name: 'Workflow State' },
    { uri: 'file://workflows', type: RESOURCE_TYPES.FILE, name: 'Workflow Files' },
    { uri: 'api://flowos', type: RESOURCE_TYPES.API, name: 'FlowOS API' }
  ];

  const filtered = type ? resources.filter(r => r.type === type) : resources;

  res.json({ count: filtered.length, resources: filtered });
});

/**
 * Read MCP resource
 * GET /api/mcp/resources/:uri
 */
app.get('/api/mcp/resources/:uri', (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId || !storage.sessions.has(sessionId)) {
    return res.status(400).json({ error: 'Invalid or missing sessionId' });
  }

  const uri = decodeURIComponent(req.params.uri);
  const resourceType = uri.split('://')[0];

  // Simulate resource read
  const content = {
    memory: { context: { topic: 'workflow', data: { active: 42, completed: 98 } },
    twin: { workflow: { state: 'running', step: 3, total: 10 } },
    file: { workflows: [{ id: 'wf_1', name: 'Test' }] },
    api: { status: 'healthy', endpoints: 156 }
  }[resourceType] || {};

  res.json({
    uri,
    mimeType: 'application/json',
    content: JSON.stringify(content)
  });
});

/**
 * Call MCP tool
 * POST /api/mcp/tools/call
 */
app.post('/api/mcp/tools/call', (req, res) => {
  const { sessionId, tool, arguments: args = {} } = req.body || {};

  if (!sessionId || !tool) {
    return res.status(400).json({ error: 'sessionId and tool are required' });
  }

  // Simulate tool execution
  const results = {
    'workflow.execute': { executionId: 'exec_' + crypto.randomUUID().slice(0, 8), status: 'started' },
    'agent.send': { delivered: true, messageId: 'msg_' + crypto.randomUUID().slice(0, 8) },
    'memory.store': { stored: true, key: 'context_' + Date.now() },
    'twin.update': { updated: true, twin: 'workflow' }
  };

  const result = results[tool] || { executed: true, tool, args };

  res.json({
    tool,
    result,
    success: true
  });
});

// ── Multi-Model Router ──────────────────────────────────────────

/**
 * Register model
 * POST /api/models
 */
app.post('/api/models', (req, res) => {
  const { id, provider, endpoint, capabilities = [], metadata = {} } = req.body || {};

  if (!id || !provider) {
    return res.status(400).json({ error: 'id and provider are required' });
  }

  const model = {
    id,
    provider,
    endpoint,
    capabilities,
    metadata,
    status: 'active',
    registeredAt: new Date().toISOString()
  };

  storage.models.set(id, model);

  res.status(201).json(model);
});

/**
 * List models
 * GET /api/models
 */
app.get('/api/models', (req, res) => {
  const { capability } = req.query;

  let models = Array.from(storage.models.values());

  if (capability) {
    models = models.filter(m => m.capabilities.includes(capability));
  }

  res.json({ count: models.length, models });
});

/**
 * Route to model
 * POST /api/models/route
 */
app.post('/api/models/route', (req, res) => {
  const { prompt, requirements = [], strategy = 'balanced' } = req.body || {};

  const models = Array.from(storage.models.values());
  if (models.length === 0) {
    // Use default models
    const defaultModel = DEFAULT_MODELS.claude;
    return res.json({
      model: 'claude',
      provider: defaultModel.provider,
      endpoint: defaultModel.endpoint,
      reason: 'Using default model'
    });
  }

  // Simple routing based on strategy
  let selected = models[0];
  let reason = 'First available';

  switch (strategy) {
    case 'cheapest':
      selected = models.reduce((a, b) => (a.metadata?.cost < b.metadata?.cost ? a : b));
      reason = 'Lowest cost';
      break;
    case 'fastest':
      selected = models.reduce((a, b) => (a.metadata?.latency < b.metadata?.latency ? a : b));
      reason = 'Lowest latency';
      break;
    case 'capability':
      for (const req of requirements) {
        const found = models.find(m => m.capabilities.includes(req));
        if (found) {
          selected = found;
          reason = `Has ${req} capability`;
          break;
        }
      }
      break;
    default: // balanced
      reason = 'Balanced selection';
  }

  res.json({
    model: selected.id,
    provider: selected.provider,
    endpoint: selected.endpoint,
    reason
  });
});

// ── Agent Sessions ────────────────────────────────────────────────

/**
 * Create agent session
 * POST /api/sessions
 */
app.post('/api/sessions', (req, res) => {
  const { agentId, context = {} } = req.body || {};

  const sessionId = 'session_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  const session = {
    id: sessionId,
    agentId,
    context,
    status: 'active',
    messages: [],
    createdAt: now,
    lastActivity: now
  };

  storage.sessions.set(sessionId, session);

  res.status(201).json(session);
});

/**
 * Get session
 * GET /api/sessions/:id
 */
app.get('/api/sessions/:id', (req, res) => {
  const session = storage.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
});

/**
 * List sessions for agent
 * GET /api/agents/:id/sessions
 */
app.get('/api/agents/:id/sessions', (req, res) => {
  const sessions = Array.from(storage.sessions.values())
    .filter(s => s.agentId === req.params.id);

  res.json({ count: sessions.length, sessions });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`[agent-protocol] listening on :${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[agent-protocol] Shutting down...');
  server.close();
});

export { app };
