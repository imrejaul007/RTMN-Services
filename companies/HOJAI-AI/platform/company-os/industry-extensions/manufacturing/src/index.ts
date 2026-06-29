/**
 * Manufacturing Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5150;
interface Store { production: Map<string,any>; inventory: Map<string,any>; quality: Map<string,any>; compliance: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { production: new Map(), inventory: new Map(), quality: new Map(), compliance: new Map() });
  return stores.get(tid);
};

app.get('/api/production', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ production: Array.from(getStore(tid).production.values()) });
});
app.post('/api/production', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('prod'), tenantId: tid, ...req.body };
  getStore(tid).production.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/inventory', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ inventory: Array.from(getStore(tid).inventory.values()) });
});
app.post('/api/inventory', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('inve'), tenantId: tid, ...req.body };
  getStore(tid).inventory.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/quality', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ quality: Array.from(getStore(tid).quality.values()) });
});
app.post('/api/quality', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('qual'), tenantId: tid, ...req.body };
  getStore(tid).quality.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/compliance', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ compliance: Array.from(getStore(tid).compliance.values()) });
});
app.post('/api/compliance', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('comp'), tenantId: tid, ...req.body };
  getStore(tid).compliance.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'manufacturing-extension', port: PORT }));
app.listen(PORT, () => console.log('Manufacturing Extension running on port', PORT));
export default app;
