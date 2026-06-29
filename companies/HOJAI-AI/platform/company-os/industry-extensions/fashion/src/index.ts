/**
 * Fashion Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5095;
interface Store { catalog: Map<string,any>; orders: Map<string,any>; inventory: Map<string,any>; collections: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { catalog: new Map(), orders: new Map(), inventory: new Map(), collections: new Map() });
  return stores.get(tid);
};

app.get('/api/catalog', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ catalog: Array.from(getStore(tid).catalog.values()) });
});
app.post('/api/catalog', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('cata'), tenantId: tid, ...req.body };
  getStore(tid).catalog.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/orders', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ orders: Array.from(getStore(tid).orders.values()) });
});
app.post('/api/orders', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('orde'), tenantId: tid, ...req.body };
  getStore(tid).orders.set(item.id, item);
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

app.get('/api/collections', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ collections: Array.from(getStore(tid).collections.values()) });
});
app.post('/api/collections', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('coll'), tenantId: tid, ...req.body };
  getStore(tid).collections.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'fashion-extension', port: PORT }));
app.listen(PORT, () => console.log('Fashion Extension running on port', PORT));
export default app;
