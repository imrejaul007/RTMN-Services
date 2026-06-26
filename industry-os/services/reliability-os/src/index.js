/**
 * Reliability OS - Chaos Engineering & SLO Tracking
 * Port: 5274
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5274;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory stores
const experiments = new Map();
const slos = new Map();
const incidents = new Map();
const healthChecks = new Map();

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'reliability-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['chaos_engineering', 'slo_tracking', 'incident_management', 'health_checks', 'circuit_breakers']
}));

// Chaos Experiments Routes
app.post('/api/experiments', (req, res) => {
  const { name, target, action, duration, intensity } = req.body;
  if (!name || !target || !action) {
    return res.status(400).json({ error: 'name, target, and action required' });
  }

  const experiment = {
    id: `exp-${uuidv4().slice(0, 8)}`,
    name,
    target,
    action,
    duration: duration || 60,
    intensity: intensity || 50,
    status: 'draft',
    results: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null
  };

  experiments.set(experiment.id, experiment);
  res.status(201).json(experiment);
});

app.get('/api/experiments', (req, res) => {
  let list = Array.from(experiments.values());
  if (req.query.status) list = list.filter(e => e.status === req.query.status);
  if (req.query.target) list = list.filter(e => e.target === req.query.target);
  res.json({ count: list.length, experiments: list });
});

app.get('/api/experiments/:id', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });
  res.json(experiment);
});

app.post('/api/experiments/:id/start', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });
  if (experiment.status !== 'draft' && experiment.status !== 'scheduled') {
    return res.status(400).json({ error: 'Experiment already started or completed' });
  }

  experiment.status = 'running';
  experiment.startedAt = new Date().toISOString();
  experiments.set(experiment.id, experiment);

  // Simulate experiment completion
  setTimeout(() => {
    experiment.status = 'completed';
    experiment.completedAt = new Date().toISOString();
    experiment.results = {
      impact: Math.random() * 30,
      recovered: true,
      duration: experiment.duration
    };
    experiments.set(experiment.id, experiment);
  }, 5000);

  res.json(experiment);
});

app.post('/api/experiments/:id/stop', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });

  experiment.status = 'stopped';
  experiment.completedAt = new Date().toISOString();
  experiments.set(experiment.id, experiment);
  res.json(experiment);
});

// SLO Routes
app.post('/api/slos', (req, res) => {
  const { service, name, target, window, metric } = req.body;
  if (!service || !name || target === undefined) {
    return res.status(400).json({ error: 'service, name, and target required' });
  }

  const slo = {
    id: `slo-${uuidv4().slice(0, 8)}`,
    service,
    name,
    target: parseFloat(target),
    window: window || '30d',
    metric: metric || 'availability',
    currentValue: 100,
    status: 'ok',
    budget: {
      total: 30 * 24 * 60 * 60, // 30 days in seconds
      consumed: 0,
      remaining: 30 * 24 * 60 * 60
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  slos.set(slo.id, slo);
  res.status(201).json(slo);
});

app.get('/api/slos', (req, res) => {
  let list = Array.from(slos.values());
  if (req.query.service) list = list.filter(s => s.service === req.query.service);
  if (req.query.status) list = list.filter(s => s.status === req.query.status);
  res.json({ count: list.length, slos: list });
});

app.get('/api/slos/:id', (req, res) => {
  const slo = slos.get(req.params.id);
  if (!slo) return res.status(404).json({ error: 'Not found' });
  res.json(slo);
});

app.post('/api/slos/:id/report', (req, res) => {
  const slo = slos.get(req.params.id);
  if (!slo) return res.status(404).json({ error: 'Not found' });

  const { value, timestamp } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'value required' });

  slo.currentValue = parseFloat(value);
  slo.updatedAt = timestamp || new Date().toISOString();

  // Check if SLO is breached
  if (slo.currentValue < slo.target) {
    slo.status = 'breached';
    // Consume error budget
    const budgetConsumed = (1 - slo.currentValue / 100) * slo.budget.total;
    slo.budget.consumed += budgetConsumed;
    slo.budget.remaining -= budgetConsumed;
  } else {
    slo.status = 'ok';
  }

  slos.set(slo.id, slo);
  res.json(slo);
});

// Incident Management Routes
app.post('/api/incidents', (req, res) => {
  const { title, severity, service, description } = req.body;
  if (!title || !severity) {
    return res.status(400).json({ error: 'title and severity required' });
  }

  const incident = {
    id: `inc-${uuidv4().slice(0, 8)}`,
    title,
    severity,
    service: service || 'unknown',
    description: description || '',
    status: 'investigating',
    assignee: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    timeline: [{ status: 'investigating', timestamp: new Date().toISOString() }]
  };

  incidents.set(incident.id, incident);
  res.status(201).json(incident);
});

app.get('/api/incidents', (req, res) => {
  let list = Array.from(incidents.values());
  if (req.query.status) list = list.filter(i => i.status === req.query.status);
  if (req.query.severity) list = list.filter(i => i.severity === req.query.severity);
  if (req.query.service) list = list.filter(i => i.service === req.query.service);
  res.json({ count: list.length, incidents: list });
});

app.patch('/api/incidents/:id', (req, res) => {
  const incident = incidents.get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });

  if (req.body.status) {
    incident.timeline.push({ status: req.body.status, timestamp: new Date().toISOString() });
    incident.status = req.body.status;
    if (req.body.status === 'resolved') {
      incident.resolvedAt = new Date().toISOString();
    }
  }

  if (req.body.assignee) incident.assignee = req.body.assignee;

  incidents.set(incident.id, incident);
  res.json(incident);
});

// Health Checks Routes
app.post('/api/health-checks', (req, res) => {
  const { service, endpoint, interval, timeout } = req.body;
  if (!service || !endpoint) {
    return res.status(400).json({ error: 'service and endpoint required' });
  }

  const healthCheck = {
    id: `hc-${uuidv4().slice(0, 8)}`,
    service,
    endpoint,
    interval: interval || 60,
    timeout: timeout || 5000,
    status: 'active',
    lastCheck: null,
    lastResult: null,
    consecutiveFailures: 0,
    createdAt: new Date().toISOString()
  };

  healthChecks.set(healthCheck.id, healthCheck);
  res.status(201).json(healthCheck);
});

app.get('/api/health-checks', (req, res) => {
  const list = Array.from(healthChecks.values());
  res.json({ count: list.length, healthChecks: list });
});

app.post('/api/health-checks/:id/check', (req, res) => {
  const healthCheck = healthChecks.get(req.params.id);
  if (!healthCheck) return res.status(404).json({ error: 'Not found' });

  // Simulate health check
  const healthy = Math.random() > 0.1;
  healthCheck.lastCheck = new Date().toISOString();
  healthCheck.lastResult = healthy ? 'healthy' : 'unhealthy';
  healthCheck.consecutiveFailures = healthy ? 0 : healthCheck.consecutiveFailures + 1;

  if (healthCheck.consecutiveFailures >= 3) {
    healthCheck.status = 'failing';
  } else {
    healthCheck.status = 'active';
  }

  healthChecks.set(healthCheck.id, healthCheck);
  res.json(healthCheck);
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    experiments: experiments.size,
    activeExperiments: Array.from(experiments.values()).filter(e => e.status === 'running').length,
    slos: slos.size,
    breachedSlos: Array.from(slos.values()).filter(s => s.status === 'breached').length,
    incidents: incidents.size,
    openIncidents: Array.from(incidents.values()).filter(i => i.status !== 'resolved').length,
    healthChecks: healthChecks.size
  });
});

app.listen(PORT, () => {
  console.log(`[ReliabilityOS] Reliability OS running on port ${PORT}`);
  console.log('Capabilities: Chaos Engineering, SLO Tracking, Incident Management, Health Checks');
});
