/**
 * Exhibitions Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5040;
interface Store { exhibitions: Map<string,any>; stalls: Map<string,any>; exhibitors: Map<string,any>; visitors: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { exhibitions: new Map(), stalls: new Map(), exhibitors: new Map(), visitors: new Map() });
  return stores.get(tid);
};

app.get('/api/exhibitions', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ exhibitions: Array.from(getStore(tid).exhibitions.values()) });
});
app.post('/api/exhibitions', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('exhi'), tenantId: tid, ...req.body };
  getStore(tid).exhibitions.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/stalls', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ stalls: Array.from(getStore(tid).stalls.values()) });
});
app.post('/api/stalls', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('stal'), tenantId: tid, ...req.body };
  getStore(tid).stalls.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/exhibitors', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ exhibitors: Array.from(getStore(tid).exhibitors.values()) });
});
app.post('/api/exhibitors', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('exhi'), tenantId: tid, ...req.body };
  getStore(tid).exhibitors.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/visitors', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ visitors: Array.from(getStore(tid).visitors.values()) });
});
app.post('/api/visitors', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('visi'), tenantId: tid, ...req.body };
  getStore(tid).visitors.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'exhibitions-extension', port: PORT }));
app.listen(PORT, () => console.log('Exhibitions Extension running on port', PORT));
export default app;
