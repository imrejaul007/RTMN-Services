import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';

const app: FastifyInstance = Fastify({ logger: true });
await app.register(cors);

// Stores
const deals = new Map();
const stages = new Map();
const activities = new Map();

const defaultStages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
defaultStages.forEach(s => stages.set(s, { id: s, name: s.replace('_', ' '), count: 0 }));

function initSampleData() {
  const sampleDeals = [
    { id: 'd1', title: 'Enterprise Deal A', value: 100000, stage: 'qualified', probability: 50 },
    { id: 'd2', title: 'SMB Deal B', value: 25000, stage: 'proposal', probability: 75 },
  ];
  sampleDeals.forEach(d => deals.set(d.id, { ...d, createdAt: new Date().toISOString() }));
}

app.get('/health', async () => ({ status: 'healthy', service: 'deal-twin', version: '1.0.0' }));

// Deals
app.get('/api/deals', async (req, res) => {
  const { stage, minValue } = req.query as { stage?: string; minValue?: string };
  let result = Array.from(deals.values());
  if (stage) result = result.filter((d: any) => d.stage === stage);
  if (minValue) result = result.filter((d: any) => d.value >= parseFloat(minValue));
  return { success: true, count: result.length, deals: result };
});

app.get('/api/deals/:id', async (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.code(404).send({ success: false, error: 'Deal not found' });
  return { success: true, deal };
});

app.post('/api/deals', async (req, res) => {
  const { title, value, stage, probability, customerId } = req.body;
  if (!title || value === undefined) return res.code(400).send({ success: false, error: 'Title and value required' });
  const deal = { id: uuidv4(), title, value, stage: stage || 'lead', probability: probability || 10, customerId: customerId || null, createdAt: new Date().toISOString() };
  deals.set(deal.id, deal);
  return res.code(201).send({ success: true, deal });
});

app.put('/api/deals/:id', async (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.code(404).send({ success: false, error: 'Deal not found' });
  const updated = { ...deal, ...req.body, id: deal.id };
  deals.set(deal.id, updated);
  return { success: true, deal: updated };
});

app.patch('/api/deals/:id/stage', async (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.code(404).send({ success: false, error: 'Deal not found' });
  const { stage, probability } = req.body;
  if (stage) deal.stage = stage;
  if (probability !== undefined) deal.probability = probability;
  deal.updatedAt = new Date().toISOString();
  deals.set(deal.id, deal);
  return { success: true, deal };
});

app.delete('/api/deals/:id', async (req, res) => {
  if (!deals.has(req.params.id)) return res.code(404).send({ success: false, error: 'Deal not found' });
  deals.delete(req.params.id);
  return { success: true, message: 'Deal deleted' };
});

// Stages
app.get('/api/stages', async () => ({ success: true, stages: Array.from(stages.values()) }));

// Analytics
app.get('/api/analytics', async () => {
  const allDeals = Array.from(deals.values());
  const totalValue = allDeals.reduce((sum: number, d: any) => sum + d.value, 0);
  const weightedValue = allDeals.reduce((sum: number, d: any) => sum + (d.value * d.probability / 100), 0);
  return { success: true, analytics: { totalDeals: allDeals.length, totalValue, weightedValue, byStage: Object.fromEntries(stages) } };
});

const start = async () => {
  try { await app.listen({ port: 3014 }); console.log('📊 Deal Twin running on port 3014'); }
  catch (err) { app.log.error(err); process.exit(1); }
};
initSampleData();
start();

export default app;
