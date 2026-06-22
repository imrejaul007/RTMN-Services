// Knowledge Network (4173)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4173;
const SERVICE = 'knowledge-network';

const packs = new Map();      // packId -> { id, name, domain, contributor, facts, subscribers, created_at }
const contributors = new Map(); // contributorId -> { id, name, reputation, packs_count }
const subscriptions = new Map(); // subId -> { id, pack_id, subscriber, since }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const cs = [
    { name: 'Acme AI', reputation: 92, packs_count: 8 },
    { name: 'GCC Compliance', reputation: 88, packs_count: 5 }
  ];
  cs.forEach(c => { const id = uuid(); contributors.set(id, { id, ...c }); });

  const ps = [
    { name: 'GDPR Compliance Pack', domain: 'legal', contributor: 'Acme AI', facts: 124, subscribers: 45 },
    { name: 'GCC Hospitality', domain: 'hospitality', contributor: 'GCC Compliance', facts: 89, subscribers: 23 },
    { name: 'Indian Tax Rules', domain: 'finance', contributor: 'Acme AI', facts: 67, subscribers: 12 }
  ];
  ps.forEach(p => {
    const contrib = [...contributors.values()].find(c => c.name === p.contributor);
    const id = uuid();
    packs.set(id, { id, contributor_id: contrib?.id, ...p, created_at: new Date().toISOString() });
  });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', packs: packs.size, contributors: contributors.size, subscriptions: subscriptions.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/packs', (req, res) => {
  const { domain, contributor_id } = req.query;
  let list = [...packs.values()];
  if (domain) list = list.filter(p => p.domain === domain);
  if (contributor_id) list = list.filter(p => p.contributor_id === contributor_id);
  res.json(ok({ packs: list, count: list.length }));
});
app.get('/api/packs/:id', (req, res) => {
  const p = packs.get(req.params.id);
  if (!p) return res.status(404).json(fail('not found'));
  res.json(ok({ pack: p }));
});
app.post('/api/packs', (req, res) => {
  const { name, domain, contributor_id, facts } = req.body || {};
  if (!name || !domain || !contributor_id) return res.status(400).json(fail('name, domain, contributor_id required'));
  const id = uuid();
  const p = { id, name, domain, contributor_id, facts: facts || 0, subscribers: 0, created_at: new Date().toISOString() };
  packs.set(id, p);
  res.status(201).json(ok({ pack: p }));
});

app.get('/api/contributors', (_q, r) => r.json(ok({ contributors: [...contributors.values()], count: contributors.size })));
app.post('/api/contributors', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const c = { id, name, reputation: 50, packs_count: 0 };
  contributors.set(id, c);
  res.status(201).json(ok({ contributor: c }));
});

app.post('/api/subscriptions', (req, res) => {
  const { pack_id, subscriber } = req.body || {};
  if (!pack_id || !subscriber) return res.status(400).json(fail('pack_id, subscriber required'));
  const pack = packs.get(pack_id);
  if (!pack) return res.status(404).json(fail('pack not found'));
  const id = uuid();
  pack.subscribers += 1;
  const sub = { id, pack_id, subscriber, since: new Date().toISOString() };
  subscriptions.set(id, sub);
  res.status(201).json(ok({ subscription: sub }));
});
app.get('/api/subscriptions', (_q, r) => r.json(ok({ subscriptions: [...subscriptions.values()], count: subscriptions.size })));

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));