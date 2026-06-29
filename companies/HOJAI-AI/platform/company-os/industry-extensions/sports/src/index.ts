/**
 * Sports Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5180;
interface Store { teams: Map<string,any>; matches: Map<string,any>; players: Map<string,any>; tickets: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { teams: new Map(), matches: new Map(), players: new Map(), tickets: new Map() });
  return stores.get(tid);
};

app.get('/api/teams', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ teams: Array.from(getStore(tid).teams.values()) });
});
app.post('/api/teams', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('team'), tenantId: tid, ...req.body };
  getStore(tid).teams.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/matches', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ matches: Array.from(getStore(tid).matches.values()) });
});
app.post('/api/matches', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('matc'), tenantId: tid, ...req.body };
  getStore(tid).matches.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/players', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ players: Array.from(getStore(tid).players.values()) });
});
app.post('/api/players', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('play'), tenantId: tid, ...req.body };
  getStore(tid).players.set(item.id, item);
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
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'sports-extension', port: PORT }));
app.listen(PORT, () => console.log('Sports Extension running on port', PORT));
export default app;
