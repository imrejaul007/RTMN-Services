import express from 'express';
import mongoose from 'mongoose';
import { modelService } from './services/modelService.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4540;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-ml';

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-ml' }));

// Models
app.post('/api/models', async (req, res) => {
  const model = await modelService.registerModel(req.body);
  res.status(201).json({ success: true, data: model });
});

app.get('/api/models', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const models = await modelService.getAvailableModels(tenantId, req.query.tier as any);
  res.json({ success: true, data: models });
});

// Routing
app.post('/api/models/route', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const model = await modelService.getBestModel({ tenantId, ...req.body });
  res.json({ success: true, data: model });
});

app.post('/api/routing-rules', async (req, res) => {
  const rule = await modelService.createRoutingRule(req.body);
  res.status(201).json({ success: true, data: rule });
});

// Inference
app.post('/api/infer', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const result = await modelService.infer({ tenantId, ...req.body });
  res.json({ success: true, data: result });
});

// Cost estimate
app.get('/api/cost-estimate', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const estimate = await modelService.getCostEstimate(tenantId, req.query.task as string, req.query.tokens ? parseInt(req.query.tokens as string) : undefined);
  res.json({ success: true, data: estimate });
});

// Prompt templates
app.post('/api/prompts', async (req, res) => {
  const template = await modelService.createPromptTemplate(req.body);
  res.status(201).json({ success: true, data: template });
});

app.post('/api/prompts/render', (req, res) => {
  const { template, variables } = req.body;
  const rendered = modelService.renderPrompt(template, variables);
  res.json({ success: true, data: rendered });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`[Hojai ML] Running on port ${PORT}`));
}

start().catch(console.error);
export default app;
