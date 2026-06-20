// company-builder-suite (4268) - End-to-end company building automation.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'company-builder-suite';
const PORT = parseInt(process.env.PORT || '4268', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const entities = new Map();      // entId -> { id, name, type, state, ein, formed_at, status }
const registrations = new Map(); // regId -> { id, entity_id, type, agency, status, filed_at, approved_at }
const eins = new Map();          // einId -> { id, entity_id, ein, issued_at }
const bankAccounts = new Map(); // baId -> { id, entity_id, bank_name, account_last4, routing_last4, opened_at }
const equity = new Map();        // eqId -> { id, entity_id, holder, shares, class, issued_at }
const payroll = new Map();       // prId -> { id, entity_id, employee, amount, period, status, paid_at }
const compliance = new Map();    // cmpId -> { id, entity_id, type, jurisdiction, due_date, status, filed_at }

// Seed
(function seed() {
  const entId = uuid();
  entities.set(entId, { id: entId, name: 'Acme Inc', type: 'c-corp', state: 'DE',
    ein: null, formed_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), status: 'active' });
  eins.set(uuid(), { id: uuid(), entity_id: entId, ein: '12-3456789', issued_at: new Date().toISOString() });
  bankAccounts.set(uuid(), { id: uuid(), entity_id: entId, bank_name: 'Mercury', account_last4: '4242', routing_last4: '1234', opened_at: new Date().toISOString() });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/entities', '/api/registrations', '/api/eins', '/api/bank-accounts', '/api/equity', '/api/payroll', '/api/compliance']
})));

// Entities
app.get('/api/entities', (_req, res) => res.json(ok({ entities: [...entities.values()] })));
app.get('/api/entities/:id', (req, res) => {
  const e = entities.get(req.params.id);
  if (!e) return res.status(404).json(fail('entity not found'));
  res.json(ok({ entity: e }));
});
app.post('/api/entities', (req, res) => {
  const { name, type = 'c-corp', state = 'DE' } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const e = { id, name, type, state, ein: null, formed_at: new Date().toISOString(), status: 'pending' };
  entities.set(id, e);
  res.status(201).json(ok({ entity: e }));
});
app.patch('/api/entities/:id', (req, res) => {
  const e = entities.get(req.params.id);
  if (!e) return res.status(404).json(fail('entity not found'));
  ['name', 'type', 'state', 'status', 'ein'].forEach(k => { if (req.body[k] !== undefined) e[k] = req.body[k]; });
  entities.set(e.id, e);
  res.json(ok({ entity: e }));
});

// Registrations (state filings, foreign qualifications)
app.get('/api/registrations', (req, res) => {
  let list = [...registrations.values()];
  if (req.query.entity_id) list = list.filter(r => r.entity_id === req.query.entity_id);
  res.json(ok({ registrations: list }));
});
app.post('/api/registrations', (req, res) => {
  const { entity_id, type, agency } = req.body || {};
  if (!entity_id || !type || !agency) return res.status(400).json(fail('entity_id + type + agency required'));
  if (!entities.has(entity_id)) return res.status(400).json(fail('entity_id invalid'));
  const id = uuid();
  registrations.set(id, { id, entity_id, type, agency, status: 'filed', filed_at: new Date().toISOString(), approved_at: null });
  res.status(201).json(ok({ registration: registrations.get(id) }));
});
app.patch('/api/registrations/:id', (req, res) => {
  const r = registrations.get(req.params.id);
  if (!r) return res.status(404).json(fail('registration not found'));
  if (req.body.status) {
    r.status = req.body.status;
    if (req.body.status === 'approved') r.approved_at = new Date().toISOString();
  }
  registrations.set(r.id, r);
  res.json(ok({ registration: r }));
});

// EINs
app.get('/api/eins', (req, res) => {
  let list = [...eins.values()];
  if (req.query.entity_id) list = list.filter(e => e.entity_id === req.query.entity_id);
  res.json(ok({ eins: list }));
});
app.post('/api/eins', (req, res) => {
  const { entity_id, ein } = req.body || {};
  if (!entity_id || !ein) return res.status(400).json(fail('entity_id + ein required'));
  if (!entities.has(entity_id)) return res.status(400).json(fail('entity_id invalid'));
  const id = uuid();
  eins.set(id, { id, entity_id, ein, issued_at: new Date().toISOString() });
  // Update entity.ein
  const e = entities.get(entity_id);
  e.ein = ein;
  entities.set(e.id, e);
  res.status(201).json(ok({ ein_record: eins.get(id) }));
});

// Bank Accounts
app.get('/api/bank-accounts', (req, res) => {
  let list = [...bankAccounts.values()];
  if (req.query.entity_id) list = list.filter(b => b.entity_id === req.query.entity_id);
  res.json(ok({ bank_accounts: list }));
});
app.post('/api/bank-accounts', (req, res) => {
  const { entity_id, bank_name, account_last4, routing_last4 } = req.body || {};
  if (!entity_id || !bank_name) return res.status(400).json(fail('entity_id + bank_name required'));
  if (!entities.has(entity_id)) return res.status(400).json(fail('entity_id invalid'));
  const id = uuid();
  bankAccounts.set(id, { id, entity_id, bank_name, account_last4: account_last4 || null,
    routing_last4: routing_last4 || null, opened_at: new Date().toISOString() });
  res.status(201).json(ok({ bank_account: bankAccounts.get(id) }));
});

// Equity (cap table issuances)
app.get('/api/equity', (req, res) => {
  let list = [...equity.values()];
  if (req.query.entity_id) list = list.filter(e => e.entity_id === req.query.entity_id);
  res.json(ok({ equity: list }));
});
app.post('/api/equity', (req, res) => {
  const { entity_id, holder, shares, class: cls = 'common' } = req.body || {};
  if (!entity_id || !holder || shares === undefined) return res.status(400).json(fail('entity_id + holder + shares required'));
  if (!entities.has(entity_id)) return res.status(400).json(fail('entity_id invalid'));
  const id = uuid();
  equity.set(id, { id, entity_id, holder, shares, class: cls, issued_at: new Date().toISOString() });
  res.status(201).json(ok({ equity_issuance: equity.get(id) }));
});

// Payroll
app.get('/api/payroll', (req, res) => {
  let list = [...payroll.values()];
  if (req.query.entity_id) list = list.filter(p => p.entity_id === req.query.entity_id);
  res.json(ok({ payroll: list }));
});
app.post('/api/payroll', (req, res) => {
  const { entity_id, employee, amount, period } = req.body || {};
  if (!entity_id || !employee || !amount || !period) return res.status(400).json(fail('entity_id + employee + amount + period required'));
  if (!entities.has(entity_id)) return res.status(400).json(fail('entity_id invalid'));
  const id = uuid();
  payroll.set(id, { id, entity_id, employee, amount, period, status: 'pending' });
  res.status(201).json(ok({ payroll_run: payroll.get(id) }));
});
app.patch('/api/payroll/:id', (req, res) => {
  const p = payroll.get(req.params.id);
  if (!p) return res.status(404).json(fail('payroll run not found'));
  if (req.body.status) {
    p.status = req.body.status;
    if (req.body.status === 'paid') p.paid_at = new Date().toISOString();
  }
  payroll.set(p.id, p);
  res.json(ok({ payroll_run: p }));
});

// Compliance
app.get('/api/compliance', (req, res) => {
  let list = [...compliance.values()];
  if (req.query.entity_id) list = list.filter(c => c.entity_id === req.query.entity_id);
  res.json(ok({ compliance: list }));
});
app.post('/api/compliance', (req, res) => {
  const { entity_id, type, jurisdiction, due_date } = req.body || {};
  if (!entity_id || !type) return res.status(400).json(fail('entity_id + type required'));
  if (!entities.has(entity_id)) return res.status(400).json(fail('entity_id invalid'));
  const id = uuid();
  compliance.set(id, { id, entity_id, type, jurisdiction: jurisdiction || 'US', due_date: due_date || null, status: 'pending' });
  res.status(201).json(ok({ compliance_item: compliance.get(id) }));
});
app.patch('/api/compliance/:id', (req, res) => {
  const c = compliance.get(req.params.id);
  if (!c) return res.status(404).json(fail('compliance item not found'));
  if (req.body.status) {
    c.status = req.body.status;
    if (req.body.status === 'filed') c.filed_at = new Date().toISOString();
  }
  compliance.set(c.id, c);
  res.json(ok({ compliance_item: c }));
});

// Build summary
app.get('/api/entities/:id/build-summary', (req, res) => {
  const e = entities.get(req.params.id);
  if (!e) return res.status(404).json(fail('entity not found'));
  const einRecord = [...eins.values()].find(x => x.entity_id === e.id);
  const bank = [...bankAccounts.values()].find(x => x.entity_id === e.id);
  const regs = [...registrations.values()].filter(x => x.entity_id === e.id);
  const eqTotal = [...equity.values()].filter(x => x.entity_id === e.id).reduce((s, x) => s + x.shares, 0);
  const checklist = [
    { item: 'Entity formed', done: e.status !== 'pending' },
    { item: 'EIN obtained', done: !!einRecord },
    { item: 'Bank account opened', done: !!bank },
    { item: 'Initial registration filed', done: regs.length > 0 },
    { item: 'Equity issued', done: eqTotal > 0 }
  ];
  const doneCount = checklist.filter(c => c.done).length;
  res.json(ok({ entity: e, checklist, completion_pct: +((doneCount / checklist.length) * 100).toFixed(1) }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
