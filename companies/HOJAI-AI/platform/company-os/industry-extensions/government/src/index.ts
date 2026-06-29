/**
 * Government Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5130;
interface Store { citizens: Map<string,any>; services: Map<string,any>; permits: Map<string,any>; complaints: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { citizens: new Map(), services: new Map(), permits: new Map(), complaints: new Map() });
  return stores.get(tid);
};

app.get('/api/citizens', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ citizens: Array.from(getStore(tid).citizens.values()) });
});
app.post('/api/citizens', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('citi'), tenantId: tid, ...req.body };
  getStore(tid).citizens.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/services', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ services: Array.from(getStore(tid).services.values()) });
});
app.post('/api/services', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('serv'), tenantId: tid, ...req.body };
  getStore(tid).services.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/permits', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ permits: Array.from(getStore(tid).permits.values()) });
});
app.post('/api/permits', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('perm'), tenantId: tid, ...req.body };
  getStore(tid).permits.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/complaints', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ complaints: Array.from(getStore(tid).complaints.values()) });
});
app.post('/api/complaints', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('comp'), tenantId: tid, ...req.body };
  getStore(tid).complaints.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'government-extension', port: PORT }));
app.listen(PORT, () => console.log('Government Extension running on port', PORT));
export default app;
