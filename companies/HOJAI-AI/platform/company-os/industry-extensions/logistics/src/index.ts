/**
 * Logistics Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5240;
interface Store { shipments: Map<string,any>; routes: Map<string,any>; drivers: Map<string,any>; warehouses: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { shipments: new Map(), routes: new Map(), drivers: new Map(), warehouses: new Map() });
  return stores.get(tid);
};

app.get('/api/shipments', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ shipments: Array.from(getStore(tid).shipments.values()) });
});
app.post('/api/shipments', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('ship'), tenantId: tid, ...req.body };
  getStore(tid).shipments.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/routes', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ routes: Array.from(getStore(tid).routes.values()) });
});
app.post('/api/routes', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('rout'), tenantId: tid, ...req.body };
  getStore(tid).routes.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/drivers', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ drivers: Array.from(getStore(tid).drivers.values()) });
});
app.post('/api/drivers', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('driv'), tenantId: tid, ...req.body };
  getStore(tid).drivers.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/warehouses', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ warehouses: Array.from(getStore(tid).warehouses.values()) });
});
app.post('/api/warehouses', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('ware'), tenantId: tid, ...req.body };
  getStore(tid).warehouses.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'logistics-extension', port: PORT }));
app.listen(PORT, () => console.log('Logistics Extension running on port', PORT));
export default app;
