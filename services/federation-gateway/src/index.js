// Federation Gateway (4174)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4174;
const SERVICE = 'federation-gateway';

const regions = new Map();  // regionId -> { id, name, base_url, status }
const queries = new Map();  // queryId -> { id, query, results: [{ region, status, data }], ts }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const rs = [
    { name: 'us-east', base_url: 'http://us-east.hojai.ai', status: 'online' },
    { name: 'eu-west', base_url: 'http://eu-west.hojai.ai', status: 'online' },
    { name: 'gcc-central', base_url: 'http://gcc.hojai.ai', status: 'online' },
    { name: 'ap-south', base_url: 'http://ap.hojai.ai', status: 'degraded' }
  ];
  rs.forEach(r => { const id = uuid(); regions.set(id, { id, ...r, added_at: new Date().toISOString() }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', regions: regions.size, queries: queries.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/regions', (_q, r) => r.json(ok({ regions: [...regions.values()], count: regions.size })));
app.post('/api/regions', (req, res) => {
  const { name, base_url } = req.body || {};
  if (!name || !base_url) return res.status(400).json(fail('name, base_url required'));
  const id = uuid();
  const r = { id, name, base_url, status: 'online', added_at: new Date().toISOString() };
  regions.set(id, r);
  res.status(201).json(ok({ region: r }));
});

// Fan out a query to all online regions (simulated)
app.post('/api/query', (req, res) => {
  const { query } = req.body || {};
  if (!query) return res.status(400).json(fail('query required'));
  const id = uuid();
  const online = [...regions.values()].filter(r => r.status === 'online');
  const results = online.map(r => ({
    region: r.name, status: 200, data: { echoed: query, latency_ms: Math.floor(Math.random() * 200) + 10 }
  }));
  const q = { id, query, regions_queried: online.length, results, ts: new Date().toISOString() };
  queries.set(id, q);
  res.status(201).json(ok({ query: q }));
});

app.get('/api/queries', (_q, r) => r.json(ok({ queries: [...queries.values()].slice(-50), count: queries.size })));
app.get('/api/queries/:id', (req, res) => {
  const q = queries.get(req.params.id);
  if (!q) return res.status(404).json(fail('not found'));
  res.json(ok({ query: q }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));