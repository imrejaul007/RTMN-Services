/**
 * Agriculture Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5070;
interface Store { farms: Map<string,any>; crops: Map<string,any>; inventory: Map<string,any>; sales: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { farms: new Map(), crops: new Map(), inventory: new Map(), sales: new Map() });
  return stores.get(tid);
};

app.get('/api/farms', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ farms: Array.from(getStore(tid).farms.values()) });
});
app.post('/api/farms', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('farm'), tenantId: tid, ...req.body };
  getStore(tid).farms.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/crops', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ crops: Array.from(getStore(tid).crops.values()) });
});
app.post('/api/crops', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('crop'), tenantId: tid, ...req.body };
  getStore(tid).crops.set(item.id, item);
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

app.get('/api/sales', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ sales: Array.from(getStore(tid).sales.values()) });
});
app.post('/api/sales', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('sale'), tenantId: tid, ...req.body };
  getStore(tid).sales.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'agriculture-extension', port: PORT }));
app.listen(PORT, () => console.log('Agriculture Extension running on port', PORT));
export default app;
