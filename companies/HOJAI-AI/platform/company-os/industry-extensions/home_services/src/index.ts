/**
 * Home_services Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5140;
interface Store { bookings: Map<string,any>; technicians: Map<string,any>; services: Map<string,any>; customers: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { bookings: new Map(), technicians: new Map(), services: new Map(), customers: new Map() });
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

app.get('/api/technicians', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ technicians: Array.from(getStore(tid).technicians.values()) });
});
app.post('/api/technicians', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('tech'), tenantId: tid, ...req.body };
  getStore(tid).technicians.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/services', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ services: Array.from(getStore(tid).services.values()) });
});
app.post('/api/services', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('serv'), tenantId: tid, ...req.body };
  getStore(tid).services.set(item.id, item);
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
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'home_services-extension', port: PORT }));
app.listen(PORT, () => console.log('Home_services Extension running on port', PORT));
export default app;
