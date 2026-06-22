/**
 * HOJAI Data Service
 * Port: 4590 - Centralized data management and ETL pipeline
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 4590;
const app: Express = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Types
interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'file' | 'stream';
  connectionConfig: Record<string, string>;
  schema: string[];
  lastSync: Date | null;
  status: 'active' | 'inactive' | 'syncing' | 'error';
}

interface DataPipeline {
  id: string;
  name: string;
  sourceId: string;
  destinationId: string;
  transformations: string[];
  schedule: string;
  lastRun: Date | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

interface Dataset {
  id: string;
  name: string;
  sourceId: string;
  schema: { field: string; type: string }[];
  rowCount: number;
  lastUpdated: Date;
  partitions: string[];
}

// In-memory storage
const dataSources: Map<string, DataSource> = new Map();
const pipelines: Map<string, DataPipeline> = new Map();
const datasets: Map<string, Dataset> = new Map();

// Middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
};

app.use(requestLogger);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-data',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ==================== DATA SOURCES ====================

// List all data sources
app.get('/api/datasources', (_req: Request, res: Response) => {
  const sources = Array.from(dataSources.values());
  res.json({ sources, count: sources.length });
});

// Create data source
app.post('/api/datasources', (req: Request, res: Response) => {
  const { name, type, connectionConfig, schema } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  const source: DataSource = {
    id: uuidv4(),
    name,
    type,
    connectionConfig: connectionConfig || {},
    schema: schema || [],
    lastSync: null,
    status: 'inactive'
  };

  dataSources.set(source.id, source);
  res.status(201).json({ source });
});

// Get data source by ID
app.get('/api/datasources/:id', (req: Request, res: Response) => {
  const source = dataSources.get(req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Data source not found' });
  }
  res.json({ source });
});

// Update data source
app.put('/api/datasources/:id', (req: Request, res: Response) => {
  const source = dataSources.get(req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Data source not found' });
  }

  const { name, type, connectionConfig, schema, status } = req.body;

  if (name) source.name = name;
  if (type) source.type = type;
  if (connectionConfig) source.connectionConfig = connectionConfig;
  if (schema) source.schema = schema;
  if (status) source.status = status;

  res.json({ source });
});

// Delete data source
app.delete('/api/datasources/:id', (req: Request, res: Response) => {
  const deleted = dataSources.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Data source not found' });
  }
  res.json({ success: true });
});

// Sync data source
app.post('/api/datasources/:id/sync', async (req: Request, res: Response) => {
  const source = dataSources.get(req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Data source not found' });
  }

  source.status = 'syncing';
  source.lastSync = new Date();

  // Simulate sync (in production, this would connect to actual source)
  setTimeout(() => {
    source.status = 'active';
    dataSources.set(source.id, source);
  }, 1000);

  res.json({ message: 'Sync started', source });
});

// ==================== DATA PIPELINES ====================

// List all pipelines
app.get('/api/pipelines', (_req: Request, res: Response) => {
  const pipelineList = Array.from(pipelines.values());
  res.json({ pipelines: pipelineList, count: pipelineList.length });
});

// Create pipeline
app.post('/api/pipelines', (req: Request, res: Response) => {
  const { name, sourceId, destinationId, transformations, schedule } = req.body;

  if (!name || !sourceId) {
    return res.status(400).json({ error: 'Name and sourceId are required' });
  }

  const pipeline: DataPipeline = {
    id: uuidv4(),
    name,
    sourceId,
    destinationId: destinationId || '',
    transformations: transformations || [],
    schedule: schedule || 'manual',
    lastRun: null,
    status: 'idle'
  };

  pipelines.set(pipeline.id, pipeline);
  res.status(201).json({ pipeline });
});

// Run pipeline
app.post('/api/pipelines/:id/run', async (req: Request, res: Response) => {
  const pipeline = pipelines.get(req.params.id);
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }

  pipeline.status = 'running';
  pipelines.set(pipeline.id, pipeline);

  // Simulate pipeline run (in production, this would execute actual transformations)
  setTimeout(() => {
    pipeline.status = 'completed';
    pipeline.lastRun = new Date();
    pipelines.set(pipeline.id, pipeline);
  }, 2000);

  res.json({ message: 'Pipeline started', pipeline });
});

// Delete pipeline
app.delete('/api/pipelines/:id', (req: Request, res: Response) => {
  const deleted = pipelines.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  res.json({ success: true });
});

// ==================== DATASETS ====================

// List all datasets
app.get('/api/datasets', (req: Request, res: Response) => {
  const datasetList = Array.from(datasets.values());
  const { sourceId } = req.query;

  let filtered = datasetList;
  if (sourceId) {
    filtered = datasetList.filter(d => d.sourceId === sourceId);
  }

  res.json({ datasets: filtered, count: filtered.length });
});

// Create dataset
app.post('/api/datasets', (req: Request, res: Response) => {
  const { name, sourceId, schema, partitions } = req.body;

  if (!name || !sourceId) {
    return res.status(400).json({ error: 'Name and sourceId are required' });
  }

  const dataset: Dataset = {
    id: uuidv4(),
    name,
    sourceId,
    schema: schema || [],
    rowCount: 0,
    lastUpdated: new Date(),
    partitions: partitions || ['default']
  };

  datasets.set(dataset.id, dataset);
  res.status(201).json({ dataset });
});

// Get dataset by ID
app.get('/api/datasets/:id', (req: Request, res: Response) => {
  const dataset = datasets.get(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }
  res.json({ dataset });
});

// Query dataset
app.post('/api/datasets/:id/query', (req: Request, res: Response) => {
  const dataset = datasets.get(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  const { filters, fields, limit } = req.body;

  // In production, this would execute actual query against the data store
  res.json({
    datasetId: dataset.id,
    query: { filters, fields, limit },
    rowCount: dataset.rowCount,
    message: 'Query executed successfully'
  });
});

// ==================== ANALYTICS ====================

// Get data statistics
app.get('/api/stats', (_req: Request, res: Response) => {
  res.json({
    dataSources: {
      total: dataSources.size,
      active: Array.from(dataSources.values()).filter(s => s.status === 'active').length,
      syncing: Array.from(dataSources.values()).filter(s => s.status === 'syncing').length
    },
    pipelines: {
      total: pipelines.size,
      idle: Array.from(pipelines.values()).filter(p => p.status === 'idle').length,
      running: Array.from(pipelines.values()).filter(p => p.status === 'running').length,
      completed: Array.from(pipelines.values()).filter(p => p.status === 'completed').length
    },
    datasets: {
      total: datasets.size,
      totalRows: Array.from(datasets.values()).reduce((sum, d) => sum + d.rowCount, 0)
    }
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`HOJAI Data Service running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`API: http://localhost:${PORT}/api/*`);
});

export default app;
