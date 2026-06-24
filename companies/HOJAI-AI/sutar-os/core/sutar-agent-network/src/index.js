/**
 * SUTAR OS — Agent Network (port 4155)
 *
 * Network topology of agents + message routing between them. Distinct from
 * /services/acn-network (4801) which handles ACP protocol + agent registry.
 * The SUTAR Agent Network focuses on the runtime mesh: who is connected to
 * whom, what messages are flowing, what the routing graph looks like.
 *
 * Layer: 3 (Intent + Network + REZ Bridge)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');
const rezIntel = require('./rez-intel-client');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4155;
const SERVICE_NAME = 'sutar-agent-network';
setupSecurity(app, { serviceName: 'sutar-agent-network' });
// nodeId -> { agentId, capabilities, lastSeen, status }
const nodes = new PersistentMap('nodes', { serviceName: 'sutar-agent-network' });
// edgeId -> { from, to, type, weight }
const edges = new PersistentMap('edges', { serviceName: 'sutar-agent-network' });
// messageId -> message record
const messages = new PersistentMap('messages', { serviceName: 'sutar-agent-network' });

const EDGE_TYPES = ['peers', 'routes-to', 'publishes-to', 'claims-from'];

function seed() {
  const seedNodes = [
    { agentId: 'agent-restaurant-001', capabilities: ['transact'] },
    { agentId: 'agent-hotel-001', capabilities: ['transact'] },
    { agentId: 'agent-negotiator-001', capabilities: ['negotiate'] },
    { agentId: 'agent-recommender-001', capabilities: ['recommend'] },
  ];
  for (const n of seedNodes) {
    nodes.set(n.agentId, { ...n, lastSeen: new Date().toISOString(), status: 'online' });
  }
  // Sample mesh
  addEdge('agent-restaurant-001', 'agent-negotiator-001', 'routes-to', 8);
  addEdge('agent-hotel-001', 'agent-negotiator-001', 'routes-to', 5);
  addEdge('agent-recommender-001', 'agent-restaurant-001', 'peers', 3);
  addEdge('agent-recommender-001', 'agent-hotel-001', 'peers', 3);
}

function addEdge(from, to, type, weight = 5) {
  const id = `${from}->${to}:${type}`;
  edges.set(id, { id, from, to, type, weight, createdAt: new Date().toISOString() });
  return edges.get(id);
}

seed();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 3, port: PORT,
    counts: { nodes: nodes.size, edges: edges.size, messages: messages.size },
    capabilities: ['nodes-list', 'nodes-register', 'nodes-heartbeat', 'edges-add', 'edges-list', 'route', 'messages-send', 'messages-list'],
    timestamp: new Date().toISOString(),
  });
});

// ---------- Nodes ----------

app.get('/api/nodes', (_req, res) => {
  res.json({ count: nodes.size, nodes: Array.from(nodes.values()) });
});

app.post('/api/nodes',requireAuth,  (req, res) => {
  const { agentId, capabilities = [] } = req.body || {};
  if (!agentId) return res.status(400).json({ error: 'agentId required' });
  nodes.set(agentId, { agentId, capabilities, lastSeen: new Date().toISOString(), status: 'online' });
  res.status(201).json(nodes.get(agentId));
});

app.post('/api/nodes/:agentId/heartbeat',requireAuth,  (req, res) => {
  const n = nodes.get(req.params.agentId);
  if (!n) return res.status(404).json({ error: 'unknown node' });
  n.lastSeen = new Date().toISOString();
  n.status = 'online';
  res.json(n);
});

// ---------- Edges ----------

app.post('/api/edges',requireAuth,  (req, res) => {
  const { from, to, type, weight = 5 } = req.body || {};
  if (!from || !to || !type) return res.status(400).json({ error: 'from, to, type required' });
  if (!EDGE_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${EDGE_TYPES.join(',')}` });
  const e = addEdge(from, to, type, weight);
  res.status(201).json(e);
});

app.get('/api/edges', (req, res) => {
  const { from, to, type } = req.query;
  let list = Array.from(edges.values());
  if (from) list = list.filter(e => e.from === from);
  if (to) list = list.filter(e => e.to === to);
  if (type) list = list.filter(e => e.type === type);
  res.json({ count: list.length, edges: list });
});

// ---------- Routing ----------

// BFS from `from` to find the shortest weighted path to `to`
app.post('/api/route',requireAuth,  (req, res) => {
  const { from, to, intentType } = req.body || {};
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  if (!nodes.has(from)) return res.status(404).json({ error: `unknown node: ${from}` });
  if (!nodes.has(to)) return res.status(404).json({ error: `unknown node: ${to}` });
  if (from === to) return res.json({ from, to, hops: [], totalWeight: 0 });

  // BFS — minimal hop count (not weighted, since weights are subjective)
  const adj = new PersistentMap('adj', { serviceName: 'sutar-agent-network' });
  for (const e of edges.values()) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e);
  }

  const queue = [[from]];
  const visited = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    const neighbours = adj.get(last) || [];
    for (const e of neighbours) {
      if (visited.has(e.to)) continue;
      const newPath = [...path, e];
      if (e.to === to) {
        const totalWeight = newPath.slice(1).reduce((s, x) => s + (x.weight || 0), 0);
        return res.json({ from, to, intentType, hops: newPath, totalWeight });
      }
      visited.add(e.to);
      queue.push(newPath);
    }
  }
  res.json({ from, to, intentType, hops: [], totalWeight: 0, reachable: false });
});

// ---------- Messages ----------

app.post('/api/messages',requireAuth,  (req, res) => {
  const { from, to, intentType, payload, intentId } = req.body || {};
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  const id = uuid();
  const msg = {
    id, from, to, intentType, payload, intentId,
    deliveredAt: new Date().toISOString(),
    status: 'delivered',
  };
  messages.set(id, msg);
  res.status(201).json(msg);
});

app.get('/api/messages', (req, res) => {
  const { from, to, intentId } = req.query;
  let list = Array.from(messages.values());
  if (from) list = list.filter(m => m.from === from);
  if (to) list = list.filter(m => m.to === to);
  if (intentId) list = list.filter(m => m.intentId === intentId);
  res.json({ count: list.length, messages: list });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
});
installGracefulShutdown(server);
