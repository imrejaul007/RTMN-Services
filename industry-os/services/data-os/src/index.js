/**
 * Data OS - Enterprise Data Infrastructure
 * Port: 4762
 *
 * Provides:
 * - Data pipelines
 * - Data warehouses
 * - Data governance
 * - Analytics and reporting
 * - Data quality
 * - Data lineage
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4762;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// In-memory stores
const pipelines = new Map();
const datasets = new Map();
const schemas = new Map();
const transforms = new Map();
const metrics = new Map();
const qualityRules = new Map();
const lineageRecords = new Map();
const dataSources = new Map();

// Seed sample data
function seedData() {
  // Sample data sources
  const sampleSources = [
    {
      id: 'source-crm',
      name: 'CRM Database',
      type: 'postgresql',
      connectionString: 'postgresql://crm-db.internal:5432/crm',
      tables: ['contacts', 'accounts', 'opportunities'],
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'connected'
    },
    {
      id: 'source-analytics',
      name: 'Analytics Platform',
      type: 'api',
      endpoint: 'https://analytics.hojai.ai/api',
      tables: ['events', 'sessions', 'conversions'],
      lastSync: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'connected'
    },
    {
      id: 'source-warehouse',
      name: 'Warehouse System',
      type: 'warehouse',
      connectionString: 's3://hojai-warehouse/data/',
      tables: ['inventory', 'orders', 'shipments'],
      lastSync: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      status: 'connected'
    }
  ];
  sampleSources.forEach(s => dataSources.set(s.id, s));

  // Sample pipelines
  const samplePipelines = [
    {
      id: 'pipeline-crm-sync',
      name: 'CRM to Data Lake Sync',
      description: 'Sync CRM data to data lake for analytics',
      source: 'source-crm',
      destination: 'datalake-crm',
      schedule: '0 */2 * * *', // Every 2 hours
      status: 'active',
      lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      recordsProcessed: 125000,
      errorRate: 0.001,
      createdAt: new Date().toISOString()
    },
    {
      id: 'pipeline-analytics-agg',
      name: 'Analytics Aggregation',
      description: 'Aggregate analytics events into hourly reports',
      source: 'source-analytics',
      destination: 'warehouse-analytics',
      schedule: '0 * * * *', // Hourly
      status: 'active',
      lastRun: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      recordsProcessed: 45000,
      errorRate: 0.0001,
      createdAt: new Date().toISOString()
    },
    {
      id: 'pipeline-inventory-sync',
      name: 'Inventory Sync',
      description: 'Sync inventory levels to commerce platform',
      source: 'source-warehouse',
      destination: 'commerce-inventory',
      schedule: '*/15 * * * *', // Every 15 minutes
      status: 'active',
      lastRun: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      recordsProcessed: 8500,
      errorRate: 0,
      createdAt: new Date().toISOString()
    }
  ];
  samplePipelines.forEach(p => pipelines.set(p.id, p));

  // Sample datasets
  const sampleDatasets = [
    {
      id: 'dataset-customers',
      name: 'Customer Master Data',
      description: 'Unified customer records from all sources',
      schema: ['id', 'email', 'name', 'company', 'created_at', 'last_activity'],
      rowCount: 125000,
      sizeBytes: 52428800, // 50MB
      source: 'datalake-crm',
      partition: 'date',
      refreshInterval: 'hourly',
      lastRefresh: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      quality: 99.8
    },
    {
      id: 'dataset-transactions',
      name: 'Transaction Records',
      description: 'All commerce transactions',
      schema: ['id', 'customer_id', 'amount', 'currency', 'status', 'created_at'],
      rowCount: 2500000,
      sizeBytes: 524288000, // 500MB
      source: 'warehouse-analytics',
      partition: 'month',
      refreshInterval: 'daily',
      lastRefresh: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      quality: 99.9
    },
    {
      id: 'dataset-events',
      name: 'User Events',
      description: 'All user interaction events',
      schema: ['id', 'user_id', 'event_type', 'properties', 'timestamp'],
      rowCount: 50000000,
      sizeBytes: 2147483648, // 2GB
      source: 'source-analytics',
      partition: 'hour',
      refreshInterval: 'realtime',
      lastRefresh: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      quality: 98.5
    }
  ];
  sampleDatasets.forEach(d => datasets.set(d.id, d));

  // Sample quality rules
  const sampleRules = [
    {
      id: 'rule-email-format',
      name: 'Valid Email Format',
      datasetId: 'dataset-customers',
      column: 'email',
      rule: 'is_valid_email',
      threshold: 99,
      currentScore: 99.8,
      status: 'passing'
    },
    {
      id: 'rule-amount-positive',
      name: 'Positive Amounts',
      datasetId: 'dataset-transactions',
      column: 'amount',
      rule: 'amount > 0',
      threshold: 99.5,
      currentScore: 100,
      status: 'passing'
    },
    {
      id: 'rule-no-duplicates',
      name: 'No Duplicate IDs',
      datasetId: 'dataset-customers',
      column: 'id',
      rule: 'unique(id)',
      threshold: 100,
      currentScore: 100,
      status: 'passing'
    }
  ];
  sampleRules.forEach(r => qualityRules.set(r.id, r));

  // Sample transforms
  const sampleTransforms = [
    {
      id: 'transform-enrich-customer',
      name: 'Enrich Customer Data',
      description: 'Add derived fields to customer data',
      input: 'dataset-customers',
      output: 'dataset-customers-enriched',
      operations: ['add_calculated_fields', 'join_external_data', 'anonymize_pii'],
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'transform-daily-summary',
      name: 'Daily Transaction Summary',
      description: 'Aggregate transactions into daily summaries',
      input: 'dataset-transactions',
      output: 'dataset-transactions-daily',
      operations: ['group_by_date', 'sum_amounts', 'count_transactions'],
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ];
  sampleTransforms.forEach(t => transforms.set(t.id, t));

  console.log(`[DataOS] Seeded: ${dataSources.size} sources, ${pipelines.size} pipelines, ${datasets.size} datasets`);
}

seedData();

// ==================== DATA SOURCES ====================

app.get('/api/sources', (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(dataSources.values());

  if (type) result = result.filter(s => s.type === type);
  if (status) result = result.filter(s => s.status === status);

  res.json({ success: true, count: result.length, data: result });
});

app.get('/api/sources/:id', (req, res) => {
  const source = dataSources.get(req.params.id);
  if (!source) {
    return res.status(404).json({ success: false, error: 'Data source not found' });
  }
  res.json({ success: true, data: source });
});

app.post('/api/sources', (req, res) => {
  const { name, type, connectionString, endpoint, tables } = req.body;
  if (!name || !type) {
    return res.status(400).json({ success: false, error: 'name and type required' });
  }

  const source = {
    id: `source-${uuidv4()}`,
    name,
    type,
    connectionString: connectionString || null,
    endpoint: endpoint || null,
    tables: tables || [],
    lastSync: null,
    status: 'pending'
  };

  dataSources.set(source.id, source);
  res.status(201).json({ success: true, data: source });
});

// ==================== PIPELINES ====================

app.get('/api/pipelines', (req, res) => {
  const { status, source } = req.query;
  let result = Array.from(pipelines.values());

  if (status) result = result.filter(p => p.status === status);
  if (source) result = result.filter(p => p.source === source);

  res.json({ success: true, count: result.length, data: result });
});

app.get('/api/pipelines/:id', (req, res) => {
  const pipeline = pipelines.get(req.params.id);
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' });
  }
  res.json({ success: true, data: pipeline });
});

app.post('/api/pipelines', (req, res) => {
  const { name, description, source, destination, schedule } = req.body;
  if (!name || !source || !destination) {
    return res.status(400).json({ success: false, error: 'name, source, destination required' });
  }

  const pipeline = {
    id: `pipeline-${uuidv4()}`,
    name,
    description: description || '',
    source,
    destination,
    schedule: schedule || null,
    status: 'draft',
    lastRun: null,
    recordsProcessed: 0,
    errorRate: 0,
    createdAt: new Date().toISOString()
  };

  pipelines.set(pipeline.id, pipeline);
  res.status(201).json({ success: true, data: pipeline });
});

app.post('/api/pipelines/:id/run', (req, res) => {
  const pipeline = pipelines.get(req.params.id);
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' });
  }

  // Simulate pipeline run
  pipeline.lastRun = new Date().toISOString();
  pipeline.status = 'running';

  // In real scenario, this would trigger actual pipeline execution
  setTimeout(() => {
    pipeline.status = 'active';
    pipeline.recordsProcessed += Math.floor(Math.random() * 10000);
    pipeline.errorRate = Math.random() * 0.01;
    pipelines.set(pipeline.id, pipeline);
  }, 2000);

  res.json({ success: true, data: pipeline });
});

app.put('/api/pipelines/:id', (req, res) => {
  const pipeline = pipelines.get(req.params.id);
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' });
  }

  const updated = { ...pipeline, ...req.body, id: pipeline.id };
  pipelines.set(pipeline.id, updated);

  res.json({ success: true, data: updated });
});

// ==================== DATASETS ====================

app.get('/api/datasets', (req, res) => {
  const { source, partition } = req.query;
  let result = Array.from(datasets.values());

  if (source) result = result.filter(d => d.source === source);
  if (partition) result = result.filter(d => d.partition === partition);

  res.json({ success: true, count: result.length, data: result });
});

app.get('/api/datasets/:id', (req, res) => {
  const dataset = datasets.get(req.params.id);
  if (!dataset) {
    return res.status(404).json({ success: false, error: 'Dataset not found' });
  }
  res.json({ success: true, data: dataset });
});

app.post('/api/datasets', (req, res) => {
  const { name, description, schema, source, partition, refreshInterval } = req.body;
  if (!name || !schema) {
    return res.status(400).json({ success: false, error: 'name and schema required' });
  }

  const dataset = {
    id: `dataset-${uuidv4()}`,
    name,
    description: description || '',
    schema,
    rowCount: 0,
    sizeBytes: 0,
    source: source || null,
    partition: partition || 'none',
    refreshInterval: refreshInterval || 'daily',
    lastRefresh: null,
    quality: 100
  };

  datasets.set(dataset.id, dataset);
  res.status(201).json({ success: true, data: dataset });
});

app.get('/api/datasets/:id/query', (req, res) => {
  const { sql, limit } = req.query;
  const dataset = datasets.get(req.params.id);

  if (!dataset) {
    return res.status(404).json({ success: false, error: 'Dataset not found' });
  }

  // Return schema for now - real implementation would execute SQL
  res.json({
    success: true,
    data: {
      dataset: dataset.name,
      query: sql || 'SELECT * FROM ' + dataset.name,
      schema: dataset.schema,
      preview: [],
      message: 'Query API - full SQL execution would be implemented with query engine'
    }
  });
});

// ==================== TRANSFORMS ====================

app.get('/api/transforms', (req, res) => {
  const { status, input } = req.query;
  let result = Array.from(transforms.values());

  if (status) result = result.filter(t => t.status === status);
  if (input) result = result.filter(t => t.input === input);

  res.json({ success: true, count: result.length, data: result });
});

app.post('/api/transforms', (req, res) => {
  const { name, description, input, output, operations } = req.body;
  if (!name || !input || !output) {
    return res.status(400).json({ success: false, error: 'name, input, output required' });
  }

  const transform = {
    id: `transform-${uuidv4()}`,
    name,
    description: description || '',
    input,
    output,
    operations: operations || [],
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  transforms.set(transform.id, transform);
  res.status(201).json({ success: true, data: transform });
});

// ==================== DATA QUALITY ====================

app.get('/api/quality/rules', (req, res) => {
  const { datasetId, status } = req.query;
  let result = Array.from(qualityRules.values());

  if (datasetId) result = result.filter(r => r.datasetId === datasetId);
  if (status) result = result.filter(r => r.status === status);

  res.json({ success: true, count: result.length, data: result });
});

app.post('/api/quality/rules', (req, res) => {
  const { name, datasetId, column, rule, threshold } = req.body;
  if (!name || !datasetId || !column) {
    return res.status(400).json({ success: false, error: 'name, datasetId, column required' });
  }

  const qualityRule = {
    id: `rule-${uuidv4()}`,
    name,
    datasetId,
    column,
    rule: rule || null,
    threshold: threshold || 95,
    currentScore: 100,
    status: 'passing',
    lastCheck: new Date().toISOString()
  };

  qualityRules.set(qualityRule.id, qualityRule);
  res.status(201).json({ success: true, data: qualityRule });
});

app.get('/api/quality/score/:datasetId', (req, res) => {
  const datasetRules = Array.from(qualityRules.values())
    .filter(r => r.datasetId === req.params.datasetId);

  if (datasetRules.length === 0) {
    return res.json({ success: true, data: { datasetId: req.params.datasetId, score: 100 } });
  }

  const avgScore = datasetRules.reduce((sum, r) => sum + r.currentScore, 0) / datasetRules.length;

  res.json({
    success: true,
    data: {
      datasetId: req.params.datasetId,
      score: Math.round(avgScore * 100) / 100,
      rulesChecked: datasetRules.length,
      passing: datasetRules.filter(r => r.status === 'passing').length,
      failing: datasetRules.filter(r => r.status === 'failing').length
    }
  });
});

// ==================== METRICS & ANALYTICS ====================

app.get('/api/metrics', (req, res) => {
  const { period } = req.query;
  const now = Date.now();

  // Simulated metrics
  const metricsData = {
    totalRecords: {
      value: 52500000,
      change: 2.3,
      trend: 'up'
    },
    pipelineRuns: {
      value: 1450,
      change: 5.1,
      trend: 'up'
    },
    dataQuality: {
      value: 99.4,
      change: 0.1,
      trend: 'up'
    },
    latency: {
      value: 120, // ms
      change: -8.2,
      trend: 'down' // lower is better
    }
  };

  res.json({ success: true, period: period || '24h', data: metricsData });
});

app.get('/api/metrics/pipelines', (req, res) => {
  const pipelineMetrics = Array.from(pipelines.values()).map(p => ({
    id: p.id,
    name: p.name,
    recordsProcessed: p.recordsProcessed,
    errorRate: p.errorRate,
    lastRun: p.lastRun,
    status: p.status
  }));

  res.json({ success: true, count: pipelineMetrics.length, data: pipelineMetrics });
});

// ==================== DATA LINEAGE ====================

app.get('/api/lineage/:datasetId', (req, res) => {
  const dataset = datasets.get(req.params.datasetId);
  if (!dataset) {
    return res.status(404).json({ success: false, error: 'Dataset not found' });
  }

  // Find upstream and downstream datasets
  const upstream = Array.from(pipelines.values())
    .filter(p => p.destination === req.params.datasetId)
    .map(p => ({ type: 'pipeline', id: p.id, name: p.name }));

  const downstream = Array.from(pipelines.values())
    .filter(p => p.source === req.params.datasetId)
    .map(p => ({ type: 'pipeline', id: p.id, name: p.name }));

  res.json({
    success: true,
    data: {
      dataset: dataset.name,
      upstream,
      downstream
    }
  });
});

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  const sourcesConnected = Array.from(dataSources.values())
    .filter(s => s.status === 'connected').length;

  res.json({
    status: 'healthy',
    service: 'data-os',
    port: PORT,
    stats: {
      sources: dataSources.size,
      pipelines: pipelines.size,
      datasets: datasets.size,
      qualityRules: qualityRules.size,
      sourcesConnected
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Data OS',
    version: '1.0.0',
    port: PORT,
    endpoints: [
      'GET /api/sources',
      'POST /api/sources',
      'GET /api/pipelines',
      'POST /api/pipelines',
      'POST /api/pipelines/:id/run',
      'GET /api/datasets',
      'GET /api/datasets/:id',
      'GET /api/datasets/:id/query',
      'GET /api/transforms',
      'GET /api/quality/rules',
      'GET /api/quality/score/:datasetId',
      'GET /api/metrics',
      'GET /api/metrics/pipelines',
      'GET /api/lineage/:datasetId'
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('[DataOS] Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[DataOS] Running on port ${PORT}`);
  console.log(`[DataOS] ${dataSources.size} sources, ${pipelines.size} pipelines, ${datasets.size} datasets`);
});

module.exports = app;
