/**
 * HOJAI Data Service
 * Port: 4755
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4755', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Dataset {
  id: string;
  name: string;
  schema: Record<string, string>;
  records: any[];
  createdAt: Date;
}

const datasets = new Map<string, Dataset>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-data', version: '1.0.0', uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Create dataset
app.post('/api/datasets', (req: Request, res: Response) => {
  const { name, schema } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const dataset: Dataset = {
    id: uuidv4(),
    name,
    schema: schema || {},
    records: [],
    createdAt: new Date(),
  };

  datasets.set(dataset.id, dataset);
  res.status(201).json({ success: true, dataset });
});

// Get datasets
app.get('/api/datasets', (req: Request, res: Response) => {
  const list = Array.from(datasets.values());
  res.json({ count: list.length, datasets: list });
});

// Get dataset
app.get('/api/datasets/:id', (req: Request, res: Response) => {
  const dataset = datasets.get(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  res.json(dataset);
});

// Add records
app.post('/api/datasets/:id/records', (req: Request, res: Response) => {
  const dataset = datasets.get(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

  const { records } = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records array is required' });

  dataset.records.push(...records);
  datasets.set(dataset.id, dataset);

  res.json({ success: true, added: records.length, total: dataset.records.length });
});

// Query records
app.get('/api/datasets/:id/query', (req: Request, res: Response) => {
  const dataset = datasets.get(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

  const { limit = 100, offset = 0 } = req.query;
  const records = dataset.records.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ count: records.length, total: dataset.records.length, records });
});

app.listen(PORT, () => {
  console.log(`\n💾 HOJAI Data Service (${PORT})\n`);
});

export default app;