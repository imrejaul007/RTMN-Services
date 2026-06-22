/**
 * HOJAI Analytics Service
 * Port: 4750
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4750', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
}

const metrics = new Map<string, Metric[]>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-analytics', version: '1.0.0', uptime: process.uptime() });
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

// Record metric
app.post('/api/metrics', (req: Request, res: Response) => {
  const { name, value, unit, tags } = req.body;
  if (!name || value === undefined) return res.status(400).json({ error: 'name and value are required' });

  const metric: Metric = {
    id: uuidv4(),
    name,
    value,
    unit: unit || 'count',
    timestamp: new Date(),
    tags: tags || {},
  };

  if (!metrics.has(name)) metrics.set(name, []);
  metrics.get(name)!.push(metric);

  res.status(201).json({ success: true, metric });
});

// Get metrics
app.get('/api/metrics', (req: Request, res: Response) => {
  const { name, startDate, endDate, limit = 100 } = req.query;

  if (name) {
    const list = (metrics.get(name as string) || []).slice(-Number(limit));
    return res.json({ count: list.length, metrics: list });
  }

  const all = Array.from(metrics.entries()).map(([n, m]) => ({
    name: n,
    latest: m[m.length - 1],
    count: m.length,
  }));

  res.json({ count: all.length, metrics: all });
});

// Aggregate
app.get('/api/analytics/aggregate', (req: Request, res: Response) => {
  const { name, operation = 'avg' } = req.query;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const list = metrics.get(name as string) || [];
  if (list.length === 0) return res.json({ value: 0 });

  let value = 0;
  switch (operation) {
    case 'sum':
      value = list.reduce((sum, m) => sum + m.value, 0);
      break;
    case 'avg':
      value = list.reduce((sum, m) => sum + m.value, 0) / list.length;
      break;
    case 'min':
      value = Math.min(...list.map(m => m.value));
      break;
    case 'max':
      value = Math.max(...list.map(m => m.value));
      break;
    default:
      value = list[list.length - 1].value;
  }

  res.json({ name, operation, value, count: list.length });
});

app.listen(PORT, () => {
  console.log(`\n📊 HOJAI Analytics Service (${PORT})\n`);
});

export default app;