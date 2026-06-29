/**
 * Construction Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5210;
interface Store { projects: Map<string,any>; contractors: Map<string,any>; materials: Map<string,any>; payments: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { projects: new Map(), contractors: new Map(), materials: new Map(), payments: new Map() });
  return stores.get(tid);
};

app.get('/api/projects', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ projects: Array.from(getStore(tid).projects.values()) });
});
app.post('/api/projects', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('proj'), tenantId: tid, ...req.body };
  getStore(tid).projects.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/contractors', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ contractors: Array.from(getStore(tid).contractors.values()) });
});
app.post('/api/contractors', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('cont'), tenantId: tid, ...req.body };
  getStore(tid).contractors.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/materials', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ materials: Array.from(getStore(tid).materials.values()) });
});
app.post('/api/materials', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('mate'), tenantId: tid, ...req.body };
  getStore(tid).materials.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/payments', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ payments: Array.from(getStore(tid).payments.values()) });
});
app.post('/api/payments', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('paym'), tenantId: tid, ...req.body };
  getStore(tid).payments.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'construction-extension', port: PORT }));
app.listen(PORT, () => console.log('Construction Extension running on port', PORT));
export default app;
