import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { forwardChain, backwardChain } from './rules/ruleEngine.js';
import { findAllPaths, shortestPath } from './path/pathQuery.js';
import { computeTransitiveClosure, getReachableFrom, getReachableFromEntities } from './closure/transitiveClosure.js';
import { predictLinks, calculatePageRank, calculateNetworkMetrics } from './prediction/linkPrediction.js';
import { optimizeQuery, executePlan } from './query/queryPlanner.js';

const app = express();
const PORT = process.env.PORT || 4753;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory graph store (replace with DB in production)
const graph = {
  nodes: new Map<string, any>(),
  edges: new Map<string, any>()
};

// In-memory rules store
const rules = new Map<string, any>();

// In-memory facts store
const facts: any[] = [];

// ============= RULE ENGINE =============

// POST /reason/rules - Create rule
app.post('/reason/rules', (req, res) => {
  const rule = { ...req.body, id: req.body.id || `rule-${Date.now()}`, enabled: true };
  rules.set(rule.id, rule);
  res.json(rule);
});

// GET /reason/rules - List rules
app.get('/reason/rules', (req, res) => {
  res.json({ rules: Array.from(rules.values()) });
});

// DELETE /reason/rules/:id - Delete rule
app.delete('/reason/rules/:id', (req, res) => {
  rules.delete(req.params.id);
  res.json({ success: true });
});

// POST /reason/forward - Forward chaining
app.post('/reason/forward', (req, res) => {
  const { ruleIds } = req.body;
  const selectedRules = ruleIds
    ? Array.from(rules.values()).filter(r => ruleIds.includes(r.id))
    : Array.from(rules.values());

  const result = forwardChain(selectedRules, facts);
  facts.push(...result.newFacts);
  res.json({ newFacts: result.newFacts, actions: result.actions });
});

// POST /reason/backward - Backward chaining
app.post('/reason/backward', (req, res) => {
  const { goal, attribute, value } = req.body;
  if (!goal && !attribute) {
    return res.status(400).json({ error: 'goal or (attribute + value) required' });
  }

  const targetGoal = goal || { attribute, value };
  const result = backwardChain(Array.from(rules.values()), targetGoal, facts);
  res.json(result);
});

// ============= QUERY PLANNER =============

// POST /reason/query - Execute optimized query
app.post('/reason/query', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'query required' });
  }

  const plan = optimizeQuery(query);
  const results = await executePlan(plan, { nodes: Array.from(graph.nodes.values()), edges: Array.from(graph.edges.values()) });

  res.json({ plan, results });
});

// ============= PATH QUERYING =============

// GET /reason/paths/:start/:end - Find paths between entities
app.get('/reason/paths/:start/:end', (req, res) => {
  const { start, end } = req.params;
  const { maxDepth, type } = req.query;

  const allPaths = findAllPaths(
    start,
    end,
    { nodes: Array.from(graph.nodes.values()), edges: Array.from(graph.edges.values()) },
    maxDepth ? parseInt(maxDepth as string) : 5
  );

  res.json({ paths: allPaths });
});

// GET /reason/shortest-path/:start/:end - Shortest path
app.get('/reason/shortest-path/:start/:end', (req, res) => {
  const { start, end } = req.params;

  const path = shortestPath(
    start,
    end,
    { nodes: Array.from(graph.nodes.values()), edges: Array.from(graph.edges.values()) }
  );

  res.json({ path });
});

// ============= TRANSITIVE CLOSURE =============

// GET /reason/closure/:entity - Transitive closure
app.get('/reason/closure/:entity', (req, res) => {
  const { entity } = req.params;

  const nodes = Array.from(graph.nodes.keys());
  const edges = Array.from(graph.edges.values()).map(e => ({
    source: e.source,
    target: e.target
  }));

  const closure = computeTransitiveClosure(nodes, edges);
  const reachable = getReachableFrom(entity, closure);
  const reachableFrom = getReachableFromEntities(entity, closure);

  res.json({ reachable, reachableFrom });
});

// ============= LINK PREDICTION =============

// GET /reason/predict/:entity - Link prediction
app.get('/reason/predict/:entity', (req, res) => {
  const { entity } = req.params;
  const { threshold } = req.query;

  const nodeData = Array.from(graph.nodes.values()).map(n => ({
    id: n.id,
    neighbors: Array.from(graph.edges.values())
      .filter(e => e.source === n.id || e.target === n.id)
      .map(e => e.source === n.id ? e.target : e.source)
  }));

  const predictions = predictLinks(nodeData, threshold ? parseFloat(threshold as string) : 0.5);

  res.json({ predictions });
});

// GET /reason/metrics/:entity - Network metrics
app.get('/reason/metrics/:entity', (req, res) => {
  const { entity } = req.params;

  const nodeData = Array.from(graph.nodes.values()).map(n => ({
    id: n.id,
    neighbors: Array.from(graph.edges.values())
      .filter(e => e.source === n.id || e.target === n.id)
      .map(e => e.source === n.id ? e.target : e.source)
  }));

  const edges = Array.from(graph.edges.values()).map(e => ({
    source: e.source,
    target: e.target
  }));

  const metrics = calculateNetworkMetrics(entity, nodeData, edges);

  res.json(metrics);
});

// ============= GRAPH MANAGEMENT =============

// POST /graph/nodes - Add node
app.post('/graph/nodes', (req, res) => {
  const node = { ...req.body, id: req.body.id || `node-${Date.now()}` };
  graph.nodes.set(node.id, node);
  res.json(node);
});

// GET /graph/nodes - List nodes
app.get('/graph/nodes', (req, res) => {
  const { type, limit } = req.query;
  let nodes = Array.from(graph.nodes.values());

  if (type) {
    nodes = nodes.filter(n => n.type === type);
  }
  if (limit) {
    nodes = nodes.slice(0, parseInt(limit as string));
  }

  res.json({ nodes });
});

// POST /graph/edges - Add edge
app.post('/graph/edges', (req, res) => {
  const edge = { ...req.body, id: req.body.id || `edge-${Date.now()}` };
  graph.edges.set(edge.id, edge);
  res.json(edge);
});

// GET /graph/edges - List edges
app.get('/graph/edges', (req, res) => {
  res.json({ edges: Array.from(graph.edges.values()) });
});

// ============= FACTS MANAGEMENT =============

// POST /facts - Add fact
app.post('/facts', (req, res) => {
  const fact = { ...req.body, timestamp: new Date() };
  facts.push(fact);
  res.json(fact);
});

// GET /facts - List facts
app.get('/facts', (req, res) => {
  const { attribute } = req.query;
  let result = facts;

  if (attribute) {
    result = result.filter(f => f.attribute === attribute);
  }

  res.json({ facts: result });
});

// ============= HEALTH =============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'reasoning-engine',
    port: PORT,
    stats: {
      nodes: graph.nodes.size,
      edges: graph.edges.size,
      rules: rules.size,
      facts: facts.length
    }
  });
});

app.listen(PORT, () => {
  console.log(`Reasoning Engine running on port ${PORT}`);
});

export default app;
