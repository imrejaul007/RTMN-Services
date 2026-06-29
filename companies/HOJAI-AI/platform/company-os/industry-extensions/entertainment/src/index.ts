/**
 * Entertainment Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5200;
interface Store { events: Map<string,any>; tickets: Map<string,any>; venues: Map<string,any>; bookings: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { events: new Map(), tickets: new Map(), venues: new Map(), bookings: new Map() });
  return stores.get(tid);
};

app.get('/api/events', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ events: Array.from(getStore(tid).events.values()) });
});
app.post('/api/events', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('even'), tenantId: tid, ...req.body };
  getStore(tid).events.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/tickets', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ tickets: Array.from(getStore(tid).tickets.values()) });
});
app.post('/api/tickets', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('tick'), tenantId: tid, ...req.body };
  getStore(tid).tickets.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/venues', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ venues: Array.from(getStore(tid).venues.values()) });
});
app.post('/api/venues', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('venu'), tenantId: tid, ...req.body };
  getStore(tid).venues.set(item.id, item);
  res.status(201).json(item);
});

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
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'entertainment-extension', port: PORT }));
app.listen(PORT, () => console.log('Entertainment Extension running on port', PORT));
export default app;
