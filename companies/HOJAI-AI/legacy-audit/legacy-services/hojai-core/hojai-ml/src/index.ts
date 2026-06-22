/**
 * HOJAI ML Service - Machine Learning Pipeline
 * Port: 4760
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4760', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Model {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'training' | 'ready' | 'deprecated';
  metrics: Record<string, number>;
  createdAt: Date;
}

interface Prediction {
  id: string;
  modelId: string;
  input: any;
  output: any;
  confidence: number;
  timestamp: Date;
}

const models = new Map<string, Model>();
const predictions = new Map<string, Prediction>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-ml', version: '1.0.0', uptime: process.uptime() });
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

// Models
app.get('/api/models', (req: Request, res: Response) => {
  const { type, status } = req.query;
  let list = Array.from(models.values());

  if (type) list = list.filter(m => m.type === type);
  if (status) list = list.filter(m => m.status === status);

  res.json({ count: list.length, models: list });
});

app.post('/api/models', (req: Request, res: Response) => {
  const { name, type, version } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  const model: Model = {
    id: uuidv4(),
    name,
    type,
    version: version || '1.0.0',
    status: 'ready',
    metrics: {},
    createdAt: new Date(),
  };

  models.set(model.id, model);
  res.status(201).json({ success: true, model });
});

app.get('/api/models/:id', (req: Request, res: Response) => {
  const model = models.get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  res.json(model);
});

// Predictions
app.post('/api/predict', (req: Request, res: Response) => {
  const { modelId, input } = req.body;

  if (!modelId || !input) {
    return res.status(400).json({ error: 'modelId and input are required' });
  }

  const model = models.get(modelId);
  if (!model) return res.status(404).json({ error: 'Model not found' });

  // Simulate prediction
  const prediction: Prediction = {
    id: uuidv4(),
    modelId,
    input,
    output: { result: 'predicted_value', label: 'category_a' },
    confidence: 0.85 + Math.random() * 0.1,
    timestamp: new Date(),
  };

  predictions.set(prediction.id, prediction);
  res.status(201).json({ success: true, prediction });
});

app.get('/api/predictions', (req: Request, res: Response) => {
  const { modelId, limit = 100 } = req.query;
  let list = Array.from(predictions.values());

  if (modelId) list = list.filter(p => p.modelId === modelId);
  list = list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, Number(limit));

  res.json({ count: list.length, predictions: list });
});

// Training
app.post('/api/models/:id/train', (req: Request, res: Response) => {
  const model = models.get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });

  model.status = 'training';
  models.set(model.id, model);

  // Simulate training
  setTimeout(() => {
    model.status = 'ready';
    model.metrics = {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.80 + Math.random() * 0.15,
      recall: 0.75 + Math.random() * 0.2,
    };
    models.set(model.id, model);
  }, 2000);

  res.json({ success: true, status: 'training started' });
});

app.listen(PORT, () => {
  console.log(`\n🤖 HOJAI ML Service (${PORT})\n`);
});

export default app;