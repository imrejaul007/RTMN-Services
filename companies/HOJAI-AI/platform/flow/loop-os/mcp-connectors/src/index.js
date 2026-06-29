/**
 * LoopOS MCP Connectors Service
 * Model Context Protocol - Tools for AI agents
 * Port: 4746
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4746;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Tool categories
const CATEGORIES = {
  DATA: 'data',
  API: 'api',
  COMPUTE: 'compute',
  COMMUNICATION: 'communication',
  STORAGE: 'storage',
  MONITORING: 'monitoring',
  AI: 'ai',
  INTEGRATION: 'integration'
};

// In-memory stores
const toolRegistry = new Map();    // toolId -> Tool
const toolIndex = new Map();       // category -> Set<toolId>
const agentTools = new Map();     // agentId -> Set<toolId>
const toolUsage = new Map();       // toolId -> usage stats

// Pre-built MCP servers
const MCP_SERVERS = {
  filesystem: { type: 'local', capabilities: ['read', 'write', 'list', 'search'] },
  database: { type: 'connector', capabilities: ['query', 'insert', 'update', 'delete'] },
  api: { type: 'gateway', capabilities: ['http', 'rest', 'graphql'] },
  slack: { type: 'webhook', capabilities: ['send', 'list_channels', 'search'] },
  email: { type: 'smtp', capabilities: ['send', 'list', 'search'] },
  calendar: { type: 'oauth', capabilities: ['read', 'write', 'list_events'] },
  crm: { type: 'api', capabilities: ['leads', 'contacts', 'deals', 'tasks'] },
  github: { type: 'oauth', capabilities: ['repos', 'issues', 'prs', 'actions'] },
  database_sql: { type: 'connector', capabilities: ['query', 'transaction'] },
  vector_store: { type: 'embedding', capabilities: ['upsert', 'search', 'delete'] }
};

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-mcp-connectors',
  version: '1.0.0',
  port: PORT,
  registeredTools: toolRegistry.size,
  availableServers: Object.keys(MCP_SERVERS).length
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── MCP Server Registration ─────────────────────────────

/**
 * Register MCP server
 * POST /api/servers
 */
app.post('/api/servers', requireAuth, (req, res) => {
  const { name, type, capabilities, config = {} } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `server-${randomUUID().slice(0, 8)}`;

  const server = {
    id,
    name,
    type: type || 'generic',
    capabilities: capabilities || [],
    config,
    status: 'active',
    tools: [],
    createdAt: new Date().toISOString()
  };

  MCP_SERVERS[name] = { ...server, type: server.type === 'generic' ? 'custom' : server.type };

  logger.info(`MCP Server registered: ${id} (${name})`);
  res.status(201).json(server);
});

/**
 * List MCP servers
 * GET /api/servers
 */
app.get('/api/servers', (req, res) => {
  const servers = Object.entries(MCP_SERVERS).map(([name, config]) => ({
    name,
    ...config
  }));
  res.json({ count: servers.length, servers });
});

// ── Tool Registry ─────────────────────────────────────

/**
 * Register a tool
 * POST /api/tools
 */
app.post('/api/tools', requireAuth, (req, res) => {
  const {
    name,
    category,
    description,
    server,
    action,
    inputSchema,
    outputSchema,
    credentials,
    config = {}
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `tool-${randomUUID().slice(0, 8)}`;

  const tool = {
    id,
    name,
    category: category || CATEGORIES.API,
    description: description || '',
    server: server || 'generic',
    action,
    inputSchema: inputSchema || { type: 'object', properties: {} },
    outputSchema: outputSchema || { type: 'object' },
    credentials,
    config,
    status: 'active',
    usage: { calls: 0, errors: 0, avgDuration: 0 },
    createdAt: new Date().toISOString()
  };

  toolRegistry.set(id, tool);

  // Index by category
  if (!toolIndex.has(category)) {
    toolIndex.set(category, new Set());
  }
  toolIndex.get(category).add(id);

  // Initialize usage tracking
  toolUsage.set(id, { calls: 0, errors: 0, totalDuration: 0 });

  logger.info(`Tool registered: ${id} (${name})`);
  res.status(201).json(tool);
});

/**
 * Get tool
 * GET /api/tools/:id
 */
app.get('/api/tools/:id', (req, res) => {
  const tool = toolRegistry.get(req.params.id);
  if (!tool) return res.status(404).json({ error: 'tool not found' });
  res.json(tool);
});

/**
 * List tools
 * GET /api/tools
 */
app.get('/api/tools', (req, res) => {
  const { category, server, status, search } = req.query;
  let items = [...toolRegistry.values()];

  if (category) items = items.filter(t => t.category === category);
  if (server) items = items.filter(t => t.server === server);
  if (status) items = items.filter(t => t.status === status);
  if (search) {
    const term = search.toLowerCase();
    items = items.filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term)
    );
  }

  res.json({ count: items.length, tools: items });
});

/**
 * Update tool
 * PUT /api/tools/:id
 */
app.put('/api/tools/:id', requireAuth, (req, res) => {
  const tool = toolRegistry.get(req.params.id);
  if (!tool) return res.status(404).json({ error: 'tool not found' });

  const updates = req.body || {};
  Object.assign(tool, updates);

  res.json(tool);
});

/**
 * Delete tool
 * DELETE /api/tools/:id
 */
app.delete('/api/tools/:id', requireAuth, (req, res) => {
  const tool = toolRegistry.get(req.params.id);
  if (!tool) return res.status(404).json({ error: 'tool not found' });

  toolRegistry.delete(req.params.id);
  toolIndex.delete(tool.category);

  res.json({ deleted: true });
});

// ── Agent-Tool Bindings ────────────────────────────────

/**
 * Grant tool to agent
 * POST /api/agents/:agentId/tools
 */
app.post('/api/agents/:agentId/tools', requireAuth, (req, res) => {
  const { toolId, permissions = {} } = req.body || {};

  if (!toolId) return res.status(400).json({ error: 'toolId is required' });

  const tool = toolRegistry.get(toolId);
  if (!tool) return res.status(404).json({ error: 'tool not found' });

  if (!agentTools.has(req.params.agentId)) {
    agentTools.set(req.params.agentId, new Map());
  }

  agentTools.get(req.params.agentId).set(toolId, {
    grantedAt: new Date().toISOString(),
    permissions
  });

  logger.info(`Tool ${toolId} granted to agent ${req.params.agentId}`);
  res.json({ granted: true });
});

/**
 * Revoke tool from agent
 * DELETE /api/agents/:agentId/tools/:toolId
 */
app.delete('/api/agents/:agentId/tools/:toolId', requireAuth, (req, res) => {
  const agentToolMap = agentTools.get(req.params.agentId);
  if (!agentToolMap) return res.status(404).json({ error: 'agent not found' });

  agentToolMap.delete(req.params.toolId);
  res.json({ revoked: true });
});

/**
 * Get tools for agent
 * GET /api/agents/:agentId/tools
 */
app.get('/api/agents/:agentId/tools', (req, res) => {
  const toolMap = agentTools.get(req.params.agentId);
  if (!toolMap) return res.json({ count: 0, tools: [] });

  const tools = [];
  for (const [toolId, grant] of toolMap) {
    const tool = toolRegistry.get(toolId);
    if (tool) {
      tools.push({ ...tool, grantedAt: grant.grantedAt, permissions: grant.permissions });
    }
  }

  res.json({ count: tools.length, tools });
});

// ── Tool Execution ─────────────────────────────────────

/**
 * Execute tool
 * POST /api/execute
 */
app.post('/api/execute', requireAuth, async (req, res) => {
  const { agentId, toolId, params = {}, timeout = 30000 } = req.body || {};

  if (!toolId) return res.status(400).json({ error: 'toolId is required' });

  const tool = toolRegistry.get(toolId);
  if (!tool) return res.status(404).json({ error: 'tool not found' });

  // Check agent permissions
  if (agentId) {
    const agentToolMap = agentTools.get(agentId);
    if (!agentToolMap || !agentToolMap.has(toolId)) {
      return res.status(403).json({ error: 'Agent does not have access to this tool' });
    }
  }

  const startTime = Date.now();

  try {
    const result = await executeTool(tool, params, timeout);

    // Track usage
    const usage = toolUsage.get(toolId) || { calls: 0, errors: 0, totalDuration: 0 };
    usage.calls++;
    usage.totalDuration += Date.now() - startTime;
    usage.avgDuration = Math.round(usage.totalDuration / usage.calls);
    toolUsage.set(toolId, usage);

    res.json({
      success: true,
      toolId,
      result,
      duration: Date.now() - startTime
    });

  } catch (err) {
    // Track errors
    const usage = toolUsage.get(toolId) || { calls: 0, errors: 0, totalDuration: 0 };
    usage.errors++;
    toolUsage.set(toolId, usage);

    logger.error(`Tool execution failed: ${toolId}`, err);
    res.status(500).json({
      success: false,
      toolId,
      error: err.message
    });
  }
});

/**
 * Batch execute multiple tools
 * POST /api/execute/batch
 */
app.post('/api/execute/batch', requireAuth, async (req, res) => {
  const { agentId, tasks = [] } = req.body || {};

  if (!tasks.length) return res.status(400).json({ error: 'tasks are required' });

  const results = [];

  for (const task of tasks) {
    const { toolId, params, parallel = false } = task;

    try {
      const tool = toolRegistry.get(toolId);
      if (!tool) {
        results.push({ toolId, success: false, error: 'Tool not found' });
        continue;
      }

      const result = await executeTool(tool, params);
      results.push({ toolId, success: true, result });
    } catch (err) {
      results.push({ toolId, success: false, error: err.message });
    }
  }

  res.json({ count: results.length, results });
});

// ── Tool Execution Engine ────────────────────────────────

async function executeTool(tool, params, timeout = 30000) {
  const { server, action, credentials, config } = tool;

  switch (server) {
    case 'filesystem':
      return executeFilesystem(action, params);
    case 'api':
      return executeAPI(action, params, config);
    case 'database':
      return executeDatabase(action, params, credentials);
    case 'http':
      return executeHTTP(action, params, config);
    default:
      return executeGeneric(tool, params);
  }
}

async function executeFilesystem(action, params) {
  const fs = await import('fs/promises');
  const path = await import('path');

  switch (action) {
    case 'read':
      return { content: await fs.readFile(params.path, 'utf-8') };

    case 'write':
      await fs.writeFile(params.path, params.content);
      return { success: true, path: params.path };

    case 'list':
      const files = await fs.readdir(params.path || '.');
      return { files };

    case 'exists':
      try {
        await fs.access(params.path);
        return { exists: true };
      } catch {
        return { exists: false };
      }

    case 'mkdir':
      await fs.mkdir(params.path, { recursive: true });
      return { success: true, path: params.path };

    case 'delete':
      await fs.unlink(params.path);
      return { success: true };

    default:
      throw new Error(`Unknown filesystem action: ${action}`);
  }
}

async function executeAPI(action, params, config) {
  const baseURL = config?.baseURL || params.baseURL;

  if (!baseURL) {
    throw new Error('API baseURL not configured');
  }

  const response = await axios({
    method: params.method || 'GET',
    url: `${baseURL}${params.path || ''}`,
    data: params.body,
    params: params.query,
    headers: params.headers,
    timeout: config?.timeout || 30000
  });

  return { data: response.data, status: response.status };
}

async function executeDatabase(action, params, credentials) {
  // Simulated database operations
  // In production, this would use actual DB drivers
  switch (action) {
    case 'query':
      return { rows: [], columns: [], rowCount: 0, message: 'Query executed (simulated)' };

    case 'insert':
      return { inserted: true, id: randomUUID().slice(0, 8) };

    case 'update':
      return { updated: true, affected: Math.floor(Math.random() * 10) + 1 };

    case 'delete':
      return { deleted: true };

    default:
      throw new Error(`Unknown database action: ${action}`);
  }
}

async function executeHTTP(action, params, config) {
  const { url, method = 'GET', headers = {}, body } = params;

  const response = await axios({
    method,
    url,
    headers,
    data: body,
    timeout: config?.timeout || 30000
  });

  return { data: response.data, status: response.status, headers: response.headers };
}

async function executeGeneric(tool, params) {
  // Generic tool execution - in production this would call the actual tool
  return {
    success: true,
    message: `Executed ${tool.name}`,
    params,
    output: { result: 'success' }
  };
}

// ── Tool Search & Discovery ─────────────────────────────

/**
 * Discover tools by capability
 * GET /api/discover
 */
app.get('/api/discover', (req, res) => {
  const { capability, category, q } = req.query;

  let candidates = [...toolRegistry.values()].filter(t => t.status === 'active');

  if (capability) {
    candidates = candidates.filter(t =>
      t.capabilities?.includes(capability) ||
      t.name.toLowerCase().includes(capability.toLowerCase())
    );
  }

  if (category) {
    candidates = candidates.filter(t => t.category === category);
  }

  if (q) {
    const term = q.toLowerCase();
    candidates = candidates.filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term)
    );
  }

  res.json({
    count: candidates.length,
    tools: candidates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      server: t.server
    }))
  });
});

/**
 * Get tool schema (for LLM tool calling)
 * GET /api/tools/:id/schema
 */
app.get('/api/tools/:id/schema', (req, res) => {
  const tool = toolRegistry.get(req.params.id);
  if (!tool) return res.status(404).json({ error: 'tool not found' });

  res.json({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema
  });
});

// ── Tool Usage Analytics ────────────────────────────────

/**
 * Get tool usage stats
 * GET /api/analytics/tools
 */
app.get('/api/analytics/tools', (req, res) => {
  const { limit = 20 } = req.query;

  const stats = [...toolUsage.entries()]
    .map(([toolId, usage]) => {
      const tool = toolRegistry.get(toolId);
      return {
        toolId,
        name: tool?.name,
        calls: usage.calls,
        errors: usage.errors,
        avgDuration: usage.avgDuration,
        errorRate: usage.calls > 0 ? Math.round((usage.errors / usage.calls) * 100) : 0
      };
    })
    .sort((a, b) => b.calls - a.calls)
    .slice(0, Number(limit));

  res.json({ count: stats.length, stats });
});

/**
 * Get MCP protocol manifest
 * GET /api/manifest
 */
app.get('/api/manifest', (req, res) => {
  const tools = [...toolRegistry.values()].map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }));

  res.json({
    protocol: 'mcp',
    version: '1.0',
    tools,
    servers: Object.keys(MCP_SERVERS)
  });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS MCP Connectors listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
