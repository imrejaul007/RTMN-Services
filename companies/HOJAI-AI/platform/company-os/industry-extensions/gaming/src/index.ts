/**
 * Gaming Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5120;
interface Store { players: Map<string,any>; matches: Map<string,any>; tournaments: Map<string,any>; leaderboards: Map<string,any> }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { players: new Map(), matches: new Map(), tournaments: new Map(), leaderboards: new Map() });
  return stores.get(tid);
};

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

app.get('/api/tournaments', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ tournaments: Array.from(getStore(tid).tournaments.values()) });
});
app.post('/api/tournaments', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('tour'), tenantId: tid, ...req.body };
  getStore(tid).tournaments.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/leaderboards', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ leaderboards: Array.from(getStore(tid).leaderboards.values()) });
});
app.post('/api/leaderboards', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('lead'), tenantId: tid, ...req.body };
  getStore(tid).leaderboards.set(item.id, item);
  res.status(201).json(item);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'gaming-extension', port: PORT }));
app.listen(PORT, () => console.log('Gaming Extension running on port', PORT));
export default app;
