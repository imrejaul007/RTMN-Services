/**
 * Fitness Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5110;
interface Store { members: Map<string,any>; classes: Map<string,any>; trainers: Map<string,any>; subscriptions: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { members: new Map(), classes: new Map(), trainers: new Map(), subscriptions: new Map() });
  return stores.get(tid);
};

app.get('/api/members', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ members: Array.from(getStore(tid).members.values()) });
});
app.post('/api/members', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('memb'), tenantId: tid, ...req.body };
  getStore(tid).members.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/classes', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ classes: Array.from(getStore(tid).classes.values()) });
});
app.post('/api/classes', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('clas'), tenantId: tid, ...req.body };
  getStore(tid).classes.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/trainers', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ trainers: Array.from(getStore(tid).trainers.values()) });
});
app.post('/api/trainers', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('trai'), tenantId: tid, ...req.body };
  getStore(tid).trainers.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/subscriptions', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ subscriptions: Array.from(getStore(tid).subscriptions.values()) });
});
app.post('/api/subscriptions', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('subs'), tenantId: tid, ...req.body };
  getStore(tid).subscriptions.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'fitness-extension', port: PORT }));
app.listen(PORT, () => console.log('Fitness Extension running on port', PORT));
export default app;
