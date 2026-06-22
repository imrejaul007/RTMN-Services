// Data Catalog (4165) — searchable dataset registry
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4165;
const SERVICE = 'data-catalog';

const datasets = new Map();  // id -> { id, name, industry, owner, schema, rows, freshness, tags }
const tags = new Map();      // tag -> count

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const inds = ['restaurant', 'hotel', 'healthcare', 'retail', 'legal', 'education', 'automotive', 'beauty', 'fitness', 'realestate', 'manufacturing', 'finance'];
  const dsNames = ['orders', 'customers', 'products', 'transactions', 'reviews', 'inventory', 'appointments', 'leads', 'campaigns', 'incidents', 'subscriptions', 'payments', 'shipments', 'refunds', 'tickets'];
  inds.forEach((ind, i) => {
    dsNames.forEach((name, j) => {
      const id = uuid();
      const ds = {
        id, name: `${ind}_${name}`, industry: ind,
        owner: `${ind}-os`, schema: [{ field: 'id', type: 'string' }, { field: 'created_at', type: 'timestamp' }, { field: name, type: 'varies' }],
        rows: Math.floor(Math.random() * 100000), freshness_hours: Math.floor(Math.random() * 48),
        tags: [ind, name], created_at: new Date().toISOString()
      };
      datasets.set(id, ds);
      ds.tags.forEach(t => tags.set(t, (tags.get(t) || 0) + 1));
    });
  });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', datasets: datasets.size, industries: 12 })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.post('/api/datasets', (req, res) => {
  const { name, industry, owner, schema } = req.body || {};
  if (!name || !industry || !owner) return res.status(400).json(fail('name, industry, owner required'));
  const id = uuid();
  const ds = { id, ...req.body, rows: 0, freshness_hours: 0, tags: [industry, name], created_at: new Date().toISOString() };
  datasets.set(id, ds);
  res.status(201).json(ok({ dataset: ds }));
});
app.get('/api/datasets', (req, res) => {
  const { industry, owner, q, tag } = req.query;
  let list = [...datasets.values()];
  if (industry) list = list.filter(d => d.industry === industry);
  if (owner) list = list.filter(d => d.owner === owner);
  if (q) list = list.filter(d => d.name.toLowerCase().includes(String(q).toLowerCase()));
  if (tag) list = list.filter(d => d.tags && d.tags.includes(tag));
  res.json(ok({ datasets: list.slice(-200), count: list.length }));
});
app.get('/api/datasets/:id', (req, res) => {
  const d = datasets.get(req.params.id);
  if (!d) return res.status(404).json(fail('not found'));
  res.json(ok({ dataset: d }));
});
app.get('/api/tags', (_q, r) => r.json(ok({ tags: [...tags.entries()].map(([k, v]) => ({ name: k, count: v })) })));
app.get('/api/industries', (_q, r) => {
  const inds = new Set([...datasets.values()].map(d => d.industry));
  r.json(ok({ industries: [...inds] }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));