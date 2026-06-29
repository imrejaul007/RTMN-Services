/**
 * Realestate Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5230;
interface Store { properties: Map<string,any>; listings: Map<string,any>; leads: Map<string,any>; viewings: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { properties: new Map(), listings: new Map(), leads: new Map(), viewings: new Map() });
  return stores.get(tid);
};

app.get('/api/properties', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ properties: Array.from(getStore(tid).properties.values()) });
});
app.post('/api/properties', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('prop'), tenantId: tid, ...req.body };
  getStore(tid).properties.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/listings', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ listings: Array.from(getStore(tid).listings.values()) });
});
app.post('/api/listings', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('list'), tenantId: tid, ...req.body };
  getStore(tid).listings.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/leads', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ leads: Array.from(getStore(tid).leads.values()) });
});
app.post('/api/leads', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('lead'), tenantId: tid, ...req.body };
  getStore(tid).leads.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/viewings', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ viewings: Array.from(getStore(tid).viewings.values()) });
});
app.post('/api/viewings', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('view'), tenantId: tid, ...req.body };
  getStore(tid).viewings.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'realestate-extension', port: PORT }));
app.listen(PORT, () => console.log('Realestate Extension running on port', PORT));
export default app;
