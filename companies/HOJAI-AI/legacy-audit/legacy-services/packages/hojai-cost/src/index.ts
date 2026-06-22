import express from 'express';
import mongoose from 'mongoose';
import { costService } from './services/costService.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4516;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-cost';

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-cost' }));

app.post('/api/costs', async (req, res) => {
  const cost = await costService.trackCost(req.body);
  res.status(201).json({ success: true, data: cost });
});

app.get('/api/costs/summary', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const summary = await costService.getCostSummary(tenantId, {
    start: new Date(req.query.start as string),
    end: new Date(req.query.end as string)
  });
  res.json({ success: true, data: summary });
});

app.get('/api/costs/by-user', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const byUser = await costService.getCostByUser(tenantId, {
    start: new Date(req.query.start as string),
    end: new Date(req.query.end as string)
  });
  res.json({ success: true, data: byUser });
});

app.post('/api/budgets', async (req, res) => {
  const budget = await costService.createBudget(req.body);
  res.status(201).json({ success: true, data: budget });
});

app.get('/api/budgets', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const budgets = await costService.getBudgets(tenantId);
  res.json({ success: true, data: budgets });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`[Hojai Cost] Running on port ${PORT}`));
}

start().catch(console.error);
export default app;
