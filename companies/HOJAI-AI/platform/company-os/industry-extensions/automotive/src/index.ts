/**
 * Automotive Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5080;
interface Store { vehicles: Map<string,any>; service: Map<string,any>; inventory: Map<string,any>; customers: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { vehicles: new Map(), service: new Map(), inventory: new Map(), customers: new Map() });
  return stores.get(tid);
};

app.get('/api/vehicles', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ vehicles: Array.from(getStore(tid).vehicles.values()) });
});
app.post('/api/vehicles', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('vehi'), tenantId: tid, ...req.body };
  getStore(tid).vehicles.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/service', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ service: Array.from(getStore(tid).service.values()) });
});
app.post('/api/service', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('serv'), tenantId: tid, ...req.body };
  getStore(tid).service.set(item.id, item);
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

app.get('/api/customers', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ customers: Array.from(getStore(tid).customers.values()) });
});
app.post('/api/customers', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('cust'), tenantId: tid, ...req.body };
  getStore(tid).customers.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'automotive-extension', port: PORT }));
app.listen(PORT, () => console.log('Automotive Extension running on port', PORT));
export default app;
