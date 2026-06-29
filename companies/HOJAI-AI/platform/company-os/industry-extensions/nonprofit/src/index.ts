/**
 * Nonprofit Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5160;
interface Store { donors: Map<string,any>; campaigns: Map<string,any>; beneficiaries: Map<string,any>; volunteers: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { donors: new Map(), campaigns: new Map(), beneficiaries: new Map(), volunteers: new Map() });
  return stores.get(tid);
};

app.get('/api/donors', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ donors: Array.from(getStore(tid).donors.values()) });
});
app.post('/api/donors', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('dono'), tenantId: tid, ...req.body };
  getStore(tid).donors.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/campaigns', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ campaigns: Array.from(getStore(tid).campaigns.values()) });
});
app.post('/api/campaigns', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('camp'), tenantId: tid, ...req.body };
  getStore(tid).campaigns.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/beneficiaries', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ beneficiaries: Array.from(getStore(tid).beneficiaries.values()) });
});
app.post('/api/beneficiaries', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('bene'), tenantId: tid, ...req.body };
  getStore(tid).beneficiaries.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/volunteers', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ volunteers: Array.from(getStore(tid).volunteers.values()) });
});
app.post('/api/volunteers', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('volu'), tenantId: tid, ...req.body };
  getStore(tid).volunteers.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'nonprofit-extension', port: PORT }));
app.listen(PORT, () => console.log('Nonprofit Extension running on port', PORT));
export default app;
