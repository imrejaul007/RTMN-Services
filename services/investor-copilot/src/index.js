// investor-copilot (4265) - Investor relations & cap table management.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'investor-copilot';
const PORT = parseInt(process.env.PORT || '4265', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const investors = new Map();   // invId -> { id, name, type, email, total_invested, rounds[], created }
const rounds = new Map();      // roundId -> { id, name, target_usd, raised_usd, share_price, status, opened_at, closed_at }
const allocations = new Map(); // allocId -> { id, round_id, investor_id, amount_usd, shares, status, created }
const communications = new Map(); // commId -> { id, subject, body, recipients[], sent_at, type }
const updates = new Map();     // updateId -> { id, title, body, period, metrics{}, published, created }
const metrics = new Map();     // metricId -> { id, name, value, unit, period, trend }

// Seed
(function seed() {
  const seedInvestors = [
    { name: 'Sequoia Capital', type: 'vc', email: 'ir@sequoia.example', total_invested: 5000000 },
    { name: 'Angel Syndicate', type: 'angel', email: 'angels@example.com', total_invested: 250000 },
    { name: 'Strategic Fund', type: 'corporate', email: 'corp@example.com', total_invested: 1000000 }
  ];
  seedInvestors.forEach(i => {
    const id = uuid();
    investors.set(id, { id, ...i, rounds: [], created: new Date().toISOString() });
  });
  const seedRounds = [
    { name: 'Seed', target_usd: 1000000, raised_usd: 1000000, share_price: 1.00, status: 'closed' },
    { name: 'Series A', target_usd: 5000000, raised_usd: 3500000, share_price: 5.00, status: 'open' }
  ];
  seedRounds.forEach(r => {
    const id = uuid();
    rounds.set(id, { id, ...r, opened_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
      closed_at: r.status === 'closed' ? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() : null });
  });
  // Allocate to seed investors
  const seedA = rounds.get([...rounds.keys()][0]);
  const seedB = rounds.get([...rounds.keys()][1]);
  allocations.set(uuid(), { id: uuid(), round_id: seedA.id, investor_id: [...investors.keys()][1], amount_usd: 250000, shares: 250000, status: 'completed' });
  allocations.set(uuid(), { id: uuid(), round_id: seedB.id, investor_id: [...investors.keys()][0], amount_usd: 3000000, shares: 600000, status: 'completed' });

  metrics.set(uuid(), { id: uuid(), name: 'MRR', value: 125000, unit: 'USD', period: 'monthly', trend: 'up' });
  metrics.set(uuid(), { id: uuid(), name: 'ARR', value: 1500000, unit: 'USD', period: 'annual', trend: 'up' });
  metrics.set(uuid(), { id: uuid(), name: 'Customers', value: 342, unit: 'count', period: 'monthly', trend: 'up' });

  updates.set(uuid(), { id: uuid(), title: 'Q1 2026 Update', body: 'Strong quarter, MRR grew 22%.', period: 'Q1 2026',
    metrics: { mrr: 125000, customers: 342 }, published: true, created: new Date().toISOString() });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/investors', '/api/rounds', '/api/allocations', '/api/communications', '/api/updates', '/api/metrics', '/api/cap-table']
})));

// Investors
app.get('/api/investors', (req, res) => {
  let list = [...investors.values()];
  if (req.query.type) list = list.filter(i => i.type === req.query.type);
  res.json(ok({ investors: list }));
});
app.get('/api/investors/:id', (req, res) => {
  const i = investors.get(req.params.id);
  if (!i) return res.status(404).json(fail('investor not found'));
  res.json(ok({ investor: i }));
});
app.post('/api/investors', (req, res) => {
  const { name, type = 'angel', email, total_invested = 0 } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const i = { id, name, type, email: email || null, total_invested, rounds: [], created: new Date().toISOString() };
  investors.set(id, i);
  res.status(201).json(ok({ investor: i }));
});

// Rounds
app.get('/api/rounds', (req, res) => {
  let list = [...rounds.values()];
  if (req.query.status) list = list.filter(r => r.status === req.query.status);
  res.json(ok({ rounds: list }));
});
app.post('/api/rounds', (req, res) => {
  const { name, target_usd, share_price, status = 'open' } = req.body || {};
  if (!name || !target_usd || !share_price) return res.status(400).json(fail('name + target_usd + share_price required'));
  const id = uuid();
  const r = { id, name, target_usd, raised_usd: 0, share_price, status, opened_at: new Date().toISOString(), closed_at: null };
  rounds.set(id, r);
  res.status(201).json(ok({ round: r }));
});
app.patch('/api/rounds/:id', (req, res) => {
  const r = rounds.get(req.params.id);
  if (!r) return res.status(404).json(fail('round not found'));
  ['name', 'target_usd', 'raised_usd', 'share_price', 'status'].forEach(k => { if (req.body[k] !== undefined) r[k] = req.body[k]; });
  if (req.body.status === 'closed' && !r.closed_at) r.closed_at = new Date().toISOString();
  rounds.set(r.id, r);
  res.json(ok({ round: r }));
});

// Allocations
app.get('/api/allocations', (req, res) => {
  let list = [...allocations.values()];
  if (req.query.round_id) list = list.filter(a => a.round_id === req.query.round_id);
  if (req.query.investor_id) list = list.filter(a => a.investor_id === req.query.investor_id);
  res.json(ok({ allocations: list }));
});
app.post('/api/rounds/:id/allocate', (req, res) => {
  const r = rounds.get(req.params.id);
  if (!r) return res.status(404).json(fail('round not found'));
  const { investor_id, amount_usd } = req.body || {};
  if (!investor_id || !amount_usd) return res.status(400).json(fail('investor_id + amount_usd required'));
  if (!investors.has(investor_id)) return res.status(400).json(fail('investor_id invalid'));
  const id = uuid();
  const shares = Math.floor(amount_usd / r.share_price);
  const a = { id, round_id: r.id, investor_id, amount_usd, shares, status: 'committed' };
  allocations.set(id, a);
  r.raised_usd += amount_usd;
  rounds.set(r.id, r);
  // Update investor totals
  const inv = investors.get(investor_id);
  inv.total_invested += amount_usd;
  if (!inv.rounds.includes(r.id)) inv.rounds.push(r.id);
  investors.set(inv.id, inv);
  res.status(201).json(ok({ allocation: a, round: r }));
});

// Communications
app.get('/api/communications', (_req, res) => res.json(ok({ communications: [...communications.values()] })));
app.post('/api/communications', (req, res) => {
  const { subject, body, recipients = [], type = 'update' } = req.body || {};
  if (!subject || !body) return res.status(400).json(fail('subject + body required'));
  const id = uuid();
  const c = { id, subject, body, recipients, type, sent_at: new Date().toISOString() };
  communications.set(id, c);
  res.status(201).json(ok({ communication: c }));
});

// Updates (quarterly investor updates)
app.get('/api/updates', (_req, res) => res.json(ok({ updates: [...updates.values()] })));
app.post('/api/updates', (req, res) => {
  const { title, body, period, metrics = {}, publish = false } = req.body || {};
  if (!title || !body) return res.status(400).json(fail('title + body required'));
  const id = uuid();
  const u = { id, title, body, period: period || 'monthly', metrics, published: publish,
    created: new Date().toISOString() };
  updates.set(id, u);
  res.status(201).json(ok({ update: u }));
});
app.patch('/api/updates/:id', (req, res) => {
  const u = updates.get(req.params.id);
  if (!u) return res.status(404).json(fail('update not found'));
  if (req.body.published !== undefined) u.published = req.body.published;
  if (req.body.body) u.body = req.body.body;
  updates.set(u.id, u);
  res.json(ok({ update: u }));
});

// Metrics
app.get('/api/metrics', (_req, res) => res.json(ok({ metrics: [...metrics.values()] })));
app.post('/api/metrics', (req, res) => {
  const { name, value, unit = 'count', period = 'monthly', trend = 'flat' } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const m = { id, name, value, unit, period, trend };
  metrics.set(id, m);
  res.status(201).json(ok({ metric: m }));
});

// Cap Table: derive from allocations
app.get('/api/cap-table', (_req, res) => {
  const totals = {};
  [...allocations.values()].forEach(a => {
    const inv = investors.get(a.investor_id);
    if (!inv) return;
    if (!totals[inv.id]) totals[inv.id] = { investor_id: inv.id, investor_name: inv.name, total_shares: 0, total_value: 0 };
    totals[inv.id].total_shares += a.shares;
    totals[inv.id].total_value += a.amount_usd;
  });
  const grandTotal = Object.values(totals).reduce((s, e) => s + e.total_shares, 0);
  const capTable = Object.values(totals).map(row => ({
    ...row,
    ownership_pct: grandTotal > 0 ? +((row.total_shares / grandTotal) * 100).toFixed(2) : 0
  })).sort((a, b) => b.total_shares - a.total_shares);
  res.json(ok({ cap_table: capTable, total_shares: grandTotal }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
