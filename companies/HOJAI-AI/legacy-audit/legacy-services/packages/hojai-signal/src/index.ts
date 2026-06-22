import express from 'express';
import mongoose from 'mongoose';
import { signalService } from './services/signalService.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4515;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-signal';

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-signal' }));

// Validate and process event
app.post('/api/signal/validate', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const result = await signalService.processEvent(tenantId, req.body);
  res.status(201).json({ success: true, data: result });
});

// Batch validate
app.post('/api/signal/validate/batch', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const results = await Promise.all(req.body.events.map((e: any) => signalService.processEvent(tenantId, e)));
  res.status(201).json({ success: true, data: { processed: results.length, results } });
});

// Quality metrics
app.get('/api/signal/metrics', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const metrics = await signalService.getQualityMetrics(tenantId, req.query.period as any || 'day');
  res.json({ success: true, data: metrics });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`[Hojai Signal] Running on port ${PORT}`));
}

start().catch(console.error);
export default app;
