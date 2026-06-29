/**
 * Legal Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5035;
interface Store { cases: Map<string,any>; clients: Map<string,any>; documents: Map<string,any>; billing: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { cases: new Map(), clients: new Map(), documents: new Map(), billing: new Map() });
  return stores.get(tid);
};

app.get('/api/cases', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ cases: Array.from(getStore(tid).cases.values()) });
});
app.post('/api/cases', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('case'), tenantId: tid, ...req.body };
  getStore(tid).cases.set(item.id, item);
  res.status(201).json(item);
});

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

app.get('/api/documents', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ documents: Array.from(getStore(tid).documents.values()) });
});
app.post('/api/documents', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('docu'), tenantId: tid, ...req.body };
  getStore(tid).documents.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/billing', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ billing: Array.from(getStore(tid).billing.values()) });
});
app.post('/api/billing', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('bill'), tenantId: tid, ...req.body };
  getStore(tid).billing.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'legal-extension', port: PORT }));
app.listen(PORT, () => console.log('Legal Extension running on port', PORT));
export default app;
