/**
 * Media Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5600;
interface Store { content: Map<string,any>; creators: Map<string,any>; campaigns: Map<string,any>; analytics: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { content: new Map(), creators: new Map(), campaigns: new Map(), analytics: new Map() });
  return stores.get(tid);
};

app.get('/api/content', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ content: Array.from(getStore(tid).content.values()) });
});
app.post('/api/content', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('cont'), tenantId: tid, ...req.body };
  getStore(tid).content.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/creators', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ creators: Array.from(getStore(tid).creators.values()) });
});
app.post('/api/creators', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('crea'), tenantId: tid, ...req.body };
  getStore(tid).creators.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/campaigns', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ campaigns: Array.from(getStore(tid).campaigns.values()) });
});
app.post('/api/campaigns', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('camp'), tenantId: tid, ...req.body };
  getStore(tid).campaigns.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/analytics', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ analytics: Array.from(getStore(tid).analytics.values()) });
});
app.post('/api/analytics', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('anal'), tenantId: tid, ...req.body };
  getStore(tid).analytics.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'media-extension', port: PORT }));
app.listen(PORT, () => console.log('Media Extension running on port', PORT));
export default app;
