import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';

const app: FastifyInstance = Fastify({ logger: true });
await app.register(cors);

// Stores
const buyers = new Map();
const preferences = new Map();
const history = new Map();

function initSampleData() {
  const sampleBuyers = [
    { id: 'b1', name: 'John Buyer', budget: 500000, type: 'individual', status: 'active' },
    { id: 'b2', name: 'Acme Corp', budget: 2000000, type: 'corporate', status: 'active' },
  ];
  sampleBuyers.forEach(b => buyers.set(b.id, { ...b, createdAt: new Date().toISOString() }));
}

app.get('/health', async () => ({ status: 'healthy', service: 'buyer-twin', version: '1.0.0' }));

// Buyers
app.get('/api/buyers', async (req, res) => {
  const { type, status, minBudget } = req.query as { type?: string; status?: string; minBudget?: string };
  let result = Array.from(buyers.values());
  if (type) result = result.filter((b: any) => b.type === type);
  if (status) result = result.filter((b: any) => b.status === status);
  if (minBudget) result = result.filter((b: any) => b.budget >= parseFloat(minBudget));
  return { success: true, count: result.length, buyers: result };
});

app.get('/api/buyers/:id', async (req, res) => {
  const buyer = buyers.get(req.params.id);
  if (!buyer) return res.code(404).send({ success: false, error: 'Buyer not found' });
  return { success: true, buyer };
});

app.post('/api/buyers', async (req, res) => {
  const { name, type, budget, contact, requirements } = req.body;
  if (!name) return res.code(400).send({ success: false, error: 'Name required' });
  const buyer = { id: uuidv4(), name, type: type || 'individual', budget: budget || 0, contact: contact || {}, requirements: requirements || {}, status: 'active', createdAt: new Date().toISOString() };
  buyers.set(buyer.id, buyer);
  return res.code(201).send({ success: true, buyer });
});

app.put('/api/buyers/:id', async (req, res) => {
  const buyer = buyers.get(req.params.id);
  if (!buyer) return res.code(404).send({ success: false, error: 'Buyer not found' });
  const updated = { ...buyer, ...req.body, id: buyer.id };
  buyers.set(buyer.id, updated);
  return { success: true, buyer: updated };
});

app.delete('/api/buyers/:id', async (req, res) => {
  if (!buyers.has(req.params.id)) return res.code(404).send({ success: false, error: 'Buyer not found' });
  buyers.delete(req.params.id);
  return { success: true, message: 'Buyer deleted' };
});

// Preferences
app.get('/api/buyers/:id/preferences', async (req, res) => {
  const prefs = Array.from(preferences.values()).filter((p: any) => p.buyerId === req.params.id);
  return { success: true, preferences: prefs };
});

app.post('/api/preferences', async (req, res) => {
  const { buyerId, type, value } = req.body;
  if (!buyerId || !type) return res.code(400).send({ success: false, error: 'buyerId and type required' });
  const pref = { id: uuidv4(), buyerId, type, value, createdAt: new Date().toISOString() };
  preferences.set(pref.id, pref);
  return res.code(201).send({ success: true, preference: pref });
});

// History
app.get('/api/buyers/:id/history', async (req, res) => {
  const hist = Array.from(history.values()).filter((h: any) => h.buyerId === req.params.id);
  return { success: true, history: hist };
});

app.post('/api/history', async (req, res) => {
  const { buyerId, action, details } = req.body;
  if (!buyerId || !action) return res.code(400).send({ success: false, error: 'buyerId and action required' });
  const entry = { id: uuidv4(), buyerId, action, details: details || {}, timestamp: new Date().toISOString() };
  history.set(entry.id, entry);
  return res.code(201).send({ success: true, history: entry });
});

const start = async () => {
  try { await app.listen({ port: 3013 }); console.log('💼 Buyer Twin running on port 3013'); }
  catch (err) { app.log.error(err); process.exit(1); }
};
initSampleData();
start();

export default app;
