/**
 * Events Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4751;
interface Store { events: Map<string,any>; venues: Map<string,any>; tickets: Map<string,any>; attendees: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { events: new Map(), venues: new Map(), tickets: new Map(), attendees: new Map() });
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

app.get('/api/attendees', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ attendees: Array.from(getStore(tid).attendees.values()) });
});
app.post('/api/attendees', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('atte'), tenantId: tid, ...req.body };
  getStore(tid).attendees.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'events-extension', port: PORT }));
app.listen(PORT, () => console.log('Events Extension running on port', PORT));
export default app;
