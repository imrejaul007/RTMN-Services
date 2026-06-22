// AI Economy (4175)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4175;
const SERVICE = 'ai-economy';

const actors = new Map();      // actorId -> { id, name, type: agent|service|customer, balance, created_at }
const transactions = new Map(); // txId -> { id, from, to, amount, memo, ts }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const as = [
    { name: 'restaurant-merchant-agent', type: 'agent', balance: 5000 },
    { name: 'hotel-merchant-agent', type: 'agent', balance: 3500 },
    { name: 'sales-copilot', type: 'service', balance: 1200 },
    { name: 'cust-001', type: 'customer', balance: 250 }
  ];
  as.forEach(a => { const id = uuid(); actors.set(id, { id, ...a, created_at: new Date().toISOString() }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', actors: actors.size, transactions: transactions.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/actors', (_q, r) => r.json(ok({ actors: [...actors.values()], count: actors.size })));
app.get('/api/actors/:id', (req, res) => {
  const a = actors.get(req.params.id);
  if (!a) return res.status(404).json(fail('not found'));
  res.json(ok({ actor: a }));
});
app.post('/api/actors', (req, res) => {
  const { name, type } = req.body || {};
  if (!name || !type) return res.status(400).json(fail('name, type required'));
  const id = uuid();
  const a = { id, name, type, balance: 0, created_at: new Date().toISOString() };
  actors.set(id, a);
  res.status(201).json(ok({ actor: a }));
});

// Transfer between two actors
app.post('/api/transactions', (req, res) => {
  const { from, to, amount, memo } = req.body || {};
  if (!from || !to || !amount || amount <= 0) return res.status(400).json(fail('from, to, positive amount required'));
  const fa = actors.get(from);
  const ta = actors.get(to);
  if (!fa || !ta) return res.status(404).json(fail('actor not found'));
  if (fa.balance < amount) return res.status(409).json(fail('insufficient balance'));
  fa.balance -= amount;
  ta.balance += amount;
  const id = uuid();
  const tx = { id, from, to, amount, memo: memo || '', ts: new Date().toISOString() };
  transactions.set(id, tx);
  res.status(201).json(ok({ transaction: tx, from_balance: fa.balance, to_balance: ta.balance }));
});

app.get('/api/transactions', (req, res) => {
  const { actor } = req.query;
  let list = [...transactions.values()];
  if (actor) list = list.filter(t => t.from === actor || t.to === actor);
  res.json(ok({ transactions: list.slice(-100), count: list.length }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));