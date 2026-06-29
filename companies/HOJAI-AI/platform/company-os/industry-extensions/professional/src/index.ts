/**
 * Professional Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5170;
interface Store { clients: Map<string,any>; projects: Map<string,any>; invoices: Map<string,any>; tasks: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { clients: new Map(), projects: new Map(), invoices: new Map(), tasks: new Map() });
  return stores.get(tid);
};

app.get('/api/clients', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ clients: Array.from(getStore(tid).clients.values()) });
});
app.post('/api/clients', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('clie'), tenantId: tid, ...req.body };
  getStore(tid).clients.set(item.id, item);
  res.status(201).json(item);
});

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

app.get('/api/invoices', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ invoices: Array.from(getStore(tid).invoices.values()) });
});
app.post('/api/invoices', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('invo'), tenantId: tid, ...req.body };
  getStore(tid).invoices.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/tasks', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ tasks: Array.from(getStore(tid).tasks.values()) });
});
app.post('/api/tasks', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('task'), tenantId: tid, ...req.body };
  getStore(tid).tasks.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'professional-extension', port: PORT }));
app.listen(PORT, () => console.log('Professional Extension running on port', PORT));
export default app;
