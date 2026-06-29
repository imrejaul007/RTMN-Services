/**
 * Travel Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5190;
interface Store { bookings: Map<string,any>; destinations: Map<string,any>; packages: Map<string,any>; customers: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { bookings: new Map(), destinations: new Map(), packages: new Map(), customers: new Map() });
  return stores.get(tid);
};

app.get('/api/bookings', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ bookings: Array.from(getStore(tid).bookings.values()) });
});
app.post('/api/bookings', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('book'), tenantId: tid, ...req.body };
  getStore(tid).bookings.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/destinations', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ destinations: Array.from(getStore(tid).destinations.values()) });
});
app.post('/api/destinations', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('dest'), tenantId: tid, ...req.body };
  getStore(tid).destinations.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/packages', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ packages: Array.from(getStore(tid).packages.values()) });
});
app.post('/api/packages', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('pack'), tenantId: tid, ...req.body };
  getStore(tid).packages.set(item.id, item);
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
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'travel-extension', port: PORT }));
app.listen(PORT, () => console.log('Travel Extension running on port', PORT));
export default app;
