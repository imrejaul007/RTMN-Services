/**
 * Quality OS - Engineering Quality Metrics
 * Port: 5272
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5272;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// In-memory stores
const metrics = new Map();
const debts = new Map();
const testCoverages = new Map();
const qualityGates = new Map();

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'quality-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['quality_metrics', 'debt_tracking', 'test_coverage', 'quality_gates']
}));

// Quality Metrics Routes
app.post('/api/metrics', (req, res) => {
  const { service, complexity, maintainability, duplicatedCode, bugs, timestamp } = req.body;
  if (!service) return res.status(400).json({ error: 'service required' });

  const metric = {
    id: `met-${uuidv4().slice(0, 8)}`,
    service,
    complexity: complexity || 0,
    maintainability: maintainability || 0,
    duplicatedCode: duplicatedCode || 0,
    bugs: bugs || 0,
    timestamp: timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  metrics.set(metric.id, metric);
  res.status(201).json(metric);
});

app.get('/api/metrics', (req, res) => {
  let list = Array.from(metrics.values());
  if (req.query.service) list = list.filter(m => m.service === req.query.service);
  res.json({ count: list.length, metrics: list });
});

app.get('/api/metrics/service/:service', (req, res) => {
  const serviceMetrics = Array.from(metrics.values())
    .filter(m => m.service === req.params.service)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (serviceMetrics.length === 0) return res.status(404).json({ error: 'No metrics found' });

  const latest = serviceMetrics[0];
  const trends = serviceMetrics.slice(0, 10).map(m => ({
    timestamp: m.timestamp,
    complexity: m.complexity,
    maintainability: m.maintainability
  }));

  res.json({ service: req.params.service, latest, trends });
});

// Technical Debt Routes
app.post('/api/debts', (req, res) => {
  const { service, title, description, severity, effort, category } = req.body;
  if (!service || !title) return res.status(400).json({ error: 'service and title required' });

  const debt = {
    id: `debt-${uuidv4().slice(0, 8)}`,
    service,
    title,
    description: description || '',
    severity: severity || 'medium',
    effort: effort || null,
    category: category || 'code',
    status: 'open',
    createdAt: new Date().toISOString(),
    resolvedAt: null
  };

  debts.set(debt.id, debt);
  res.status(201).json(debt);
});

app.get('/api/debts', (req, res) => {
  let list = Array.from(debts.values());
  if (req.query.service) list = list.filter(d => d.service === req.query.service);
  if (req.query.severity) list = list.filter(d => d.severity === req.query.severity);
  if (req.query.status) list = list.filter(d => d.status === req.query.status);
  res.json({ count: list.length, debts: list });
});

app.patch('/api/debts/:id', (req, res) => {
  const debt = debts.get(req.params.id);
  if (!debt) return res.status(404).json({ error: 'Not found' });

  Object.assign(debt, req.body);
  if (req.body.status === 'resolved') {
    debt.resolvedAt = new Date().toISOString();
  }
  debts.set(debt.id, debt);
  res.json(debt);
});

app.get('/api/debts/summary', (req, res) => {
  const allDebts = Array.from(debts.values());
  const bySeverity = {};
  const byCategory = {};

  allDebts.forEach(d => {
    bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
    byCategory[d.category] = (byCategory[d.category] || 0) + 1;
  });

  res.json({
    total: allDebts.length,
    open: allDebts.filter(d => d.status === 'open').length,
    resolved: allDebts.filter(d => d.status === 'resolved').length,
    bySeverity,
    byCategory
  });
});

// Test Coverage Routes
app.post('/api/coverage', (req, res) => {
  const { service, branchCoverage, lineCoverage, functionCoverage, timestamp } = req.body;
  if (!service) return res.status(400).json({ error: 'service required' });

  const coverage = {
    id: `cov-${uuidv4().slice(0, 8)}`,
    service,
    branchCoverage: branchCoverage || 0,
    lineCoverage: lineCoverage || 0,
    functionCoverage: functionCoverage || 0,
    timestamp: timestamp || new Date().toISOString()
  };

  testCoverages.set(coverage.id, coverage);
  res.status(201).json(coverage);
});

app.get('/api/coverage/service/:service', (req, res) => {
  const coverageList = Array.from(testCoverages.values())
    .filter(c => c.service === req.params.service)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    service: req.params.service,
    history: coverageList.slice(0, 30),
    current: coverageList[0] || null
  });
});

// Quality Gates Routes
app.post('/api/gates', (req, res) => {
  const { name, thresholds, enabled } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const gate = {
    id: `gate-${uuidv4().slice(0, 8)}`,
    name,
    thresholds: thresholds || { minCoverage: 80, maxComplexity: 15 },
    enabled: enabled !== false,
    lastCheck: null,
    lastResult: null,
    createdAt: new Date().toISOString()
  };

  qualityGates.set(gate.id, gate);
  res.status(201).json(gate);
});

app.get('/api/gates', (req, res) => {
  const list = Array.from(qualityGates.values());
  res.json({ count: list.length, gates: list });
});

app.post('/api/gates/:id/check', (req, res) => {
  const gate = qualityGates.get(req.params.id);
  if (!gate) return res.status(404).json({ error: 'Not found' });

  const { coverage, complexity } = req.body;

  const result = {
    passed: true,
    checks: []
  };

  if (gate.thresholds.minCoverage && coverage !== undefined) {
    const passed = coverage >= gate.thresholds.minCoverage;
    result.checks.push({
      name: 'minCoverage',
      expected: gate.thresholds.minCoverage,
      actual: coverage,
      passed
    });
    if (!passed) result.passed = false;
  }

  if (gate.thresholds.maxComplexity && complexity !== undefined) {
    const passed = complexity <= gate.thresholds.maxComplexity;
    result.checks.push({
      name: 'maxComplexity',
      expected: gate.thresholds.maxComplexity,
      actual: complexity,
      passed
    });
    if (!passed) result.passed = false;
  }

  gate.lastCheck = new Date().toISOString();
  gate.lastResult = result;
  qualityGates.set(gate.id, gate);

  res.json({ gate, result });
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    metrics: metrics.size,
    debts: debts.size,
    openDebts: Array.from(debts.values()).filter(d => d.status === 'open').length,
    coverageReports: testCoverages.size,
    qualityGates: qualityGates.size
  });
});

app.listen(PORT, () => {
  console.log(`[QualityOS] Quality OS running on port ${PORT}`);
  console.log('Capabilities: Quality Metrics, Debt Tracking, Test Coverage, Quality Gates');
});
