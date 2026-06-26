/**
 * Architecture OS - System Design & Dependency Mapping
 * Port: 5270
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5270;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory stores
const designs = new Map();
const dependencies = new Map();
const patterns = new Map();
const services = new Map();

// Seed patterns
patterns.set('microservices', {
  id: 'microservices',
  name: 'Microservices Architecture',
  description: 'Decompose into small, independent services',
  pros: ['Independent deploy', 'Technology flexibility', 'Fault isolation'],
  cons: ['Complexity', 'Network latency', 'Data consistency']
});
patterns.set('event-driven', {
  id: 'event-driven',
  name: 'Event-Driven Architecture',
  description: 'Services communicate via events',
  pros: ['Loose coupling', 'Scalability', 'Audit trail'],
  cons: ['Eventual consistency', 'Debugging complexity']
});

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'architecture-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['system_design', 'dependency_mapping', 'pattern_library', 'capacity_planning']
}));

// System Design Routes
app.post('/api/designs', (req, res) => {
  const { name, description, components, connections, technology } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const design = {
    id: `design-${uuidv4().slice(0, 8)}`,
    name,
    description: description || '',
    components: components || [],
    connections: connections || [],
    technology: technology || {},
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  designs.set(design.id, design);
  res.status(201).json(design);
});

app.get('/api/designs', (req, res) => {
  const list = Array.from(designs.values());
  res.json({ count: list.length, designs: list });
});

app.get('/api/designs/:id', (req, res) => {
  const design = designs.get(req.params.id);
  if (!design) return res.status(404).json({ error: 'Not found' });
  res.json(design);
});

app.put('/api/designs/:id', (req, res) => {
  const design = designs.get(req.params.id);
  if (!design) return res.status(404).json({ error: 'Not found' });

  Object.assign(design, req.body);
  design.updatedAt = new Date().toISOString();
  designs.set(design.id, design);
  res.json(design);
});

// Dependency Mapping
app.post('/api/dependencies', (req, res) => {
  const { from, to, type, latency, reliability } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const dep = {
    id: `dep-${uuidv4().slice(0, 8)}`,
    from,
    to,
    type: type || 'sync',
    latency: latency || 0,
    reliability: reliability || 99.9,
    createdAt: new Date().toISOString()
  };

  dependencies.set(dep.id, dep);
  res.status(201).json(dep);
});

app.get('/api/dependencies', (req, res) => {
  const list = Array.from(dependencies.values());
  if (req.query.from) {
    return res.json({ dependencies: list.filter(d => d.from === req.query.from) });
  }
  if (req.query.to) {
    return res.json({ dependencies: list.filter(d => d.to === req.query.to) });
  }
  res.json({ count: list.length, dependencies: list });
});

app.get('/api/dependencies/graph', (req, res) => {
  const graph = {
    nodes: [],
    edges: []
  };

  const nodeSet = new Set();
  dependencies.forEach(dep => {
    nodeSet.add(dep.from);
    nodeSet.add(dep.to);
    graph.edges.push({ from: dep.from, to: dep.to, type: dep.type });
  });

  nodeSet.forEach(node => {
    graph.nodes.push({ id: node, services: 1 });
  });

  res.json(graph);
});

// Pattern Library
app.get('/api/patterns', (req, res) => {
  res.json({ count: patterns.size, patterns: Array.from(patterns.values()) });
});

app.get('/api/patterns/:id', (req, res) => {
  const pattern = patterns.get(req.params.id);
  if (!pattern) return res.status(404).json({ error: 'Not found' });
  res.json(pattern);
});

app.post('/api/patterns', (req, res) => {
  const { id, name, description, pros, cons } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });

  const pattern = { id, name, description: description || '', pros: pros || [], cons: cons || [] };
  patterns.set(id, pattern);
  res.status(201).json(pattern);
});

// Capacity Planning
app.post('/api/capacity/estimate', (req, res) => {
  const { users, requestsPerUser, avgResponseTime, dataSize } = req.body;

  const estimates = {
    servers: Math.ceil((users * requestsPerUser) / 1000),
    bandwidth: `${Math.ceil((users * requestsPerUser * avgResponseTime) / 1024)} Mbps`,
    storage: `${Math.ceil(dataSize / 1024)} GB`,
    memory: `${Math.ceil(users / 100)} GB`
  };

  res.json({ estimates });
});

// Service Registry
app.post('/api/services', (req, res) => {
  const { name, type, port, dependencies, metadata } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const service = {
    id: `svc-${uuidv4().slice(0, 8)}`,
    name,
    type: type || 'api',
    port: port || null,
    dependencies: dependencies || [],
    metadata: metadata || {},
    status: 'active',
    createdAt: new Date().toISOString()
  };

  services.set(service.id, service);
  res.status(201).json(service);
});

app.get('/api/services', (req, res) => {
  res.json({ count: services.size, services: Array.from(services.values()) });
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    designs: designs.size,
    dependencies: dependencies.size,
    patterns: patterns.size,
    services: services.size
  });
});

app.listen(PORT, () => {
  console.log(`[ArchitectureOS] Architecture OS running on port ${PORT}`);
  console.log('Capabilities: System Design, Dependency Mapping, Pattern Library, Capacity Planning');
});
