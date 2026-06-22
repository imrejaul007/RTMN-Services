// Planning Engine (4154) — decompose goals into ordered steps
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4154;
const SERVICE = 'planning-engine';

const plans = new Map();        // planId -> { id, goal, steps, constraints, status, created_at }
const stepTemplates = new Map(); // templateId -> reusable step definitions

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const templates = [
    { name: 'auth_check', service: 'corpid-service', action: 'verify_token', est_ms: 5 },
    { name: 'fetch_customer', service: 'customer-twin', action: 'get_profile', est_ms: 12 },
    { name: 'fetch_inventory', service: 'product-twin', action: 'check_availability', est_ms: 18 },
    { name: 'charge_payment', service: 'agent-wallets', action: 'charge', est_ms: 220 },
    { name: 'send_notification', service: 'notification-service', action: 'push', est_ms: 40 },
    { name: 'update_twin', service: 'twinos-hub', action: 'update', est_ms: 15 }
  ];
  templates.forEach(t => { const id = uuid(); stepTemplates.set(id, { id, ...t }); });

  const seeds = [
    {
      goal: 'Book a hotel room for guest',
      steps: [
        { order: 1, name: 'auth_check', depends_on: [], est_ms: 5 },
        { order: 2, name: 'fetch_customer', depends_on: [1], est_ms: 12 },
        { order: 3, name: 'fetch_inventory', depends_on: [1], est_ms: 18 },
        { order: 4, name: 'charge_payment', depends_on: [2, 3], est_ms: 220 },
        { order: 5, name: 'send_notification', depends_on: [4], est_ms: 40 },
        { order: 6, name: 'update_twin', depends_on: [5], est_ms: 15 }
      ],
      constraints: { max_total_ms: 500, retries: 1 }
    },
    {
      goal: 'Place restaurant order',
      steps: [
        { order: 1, name: 'auth_check', depends_on: [], est_ms: 5 },
        { order: 2, name: 'fetch_inventory', depends_on: [], est_ms: 18 },
        { order: 3, name: 'charge_payment', depends_on: [2], est_ms: 220 },
        { order: 4, name: 'send_notification', depends_on: [3], est_ms: 40 }
      ],
      constraints: { max_total_ms: 400 }
    }
  ];
  seeds.forEach(s => {
    const id = uuid();
    plans.set(id, { id, ...s, status: 'ready', created_at: new Date().toISOString() });
  });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', plans: plans.size, templates: stepTemplates.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.post('/api/plans', (req, res) => {
  const { goal, steps, constraints } = req.body || {};
  if (!goal || !Array.isArray(steps) || steps.length === 0) return res.status(400).json(fail('goal, steps[] required'));
  for (const s of steps) if (!s.name || s.order == null) return res.status(400).json(fail('each step needs name + order'));
  const id = uuid();
  const plan = { id, goal, steps, constraints: constraints || {}, status: 'ready', created_at: new Date().toISOString() };
  plans.set(id, plan);
  res.status(201).json(ok({ plan }));
});
app.get('/api/plans', (_q, r) => r.json(ok({ plans: [...plans.values()], count: plans.size })));
app.get('/api/plans/:id', (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json(fail('plan not found'));
  res.json(ok({ plan }));
});
app.delete('/api/plans/:id', (req, res) => {
  if (!plans.has(req.params.id)) return res.status(404).json(fail('not found'));
  plans.delete(req.params.id);
  res.json(ok({ deleted: req.params.id }));
});

// Critical path = steps that block the latest-finishing dependency chain
app.get('/api/plans/:id/critical-path', (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json(fail('not found'));
  const byOrder = [...plan.steps].sort((a, b) => a.order - b.order);
  const dur = (s) => s.est_ms || 10;
  // Walk in order, accumulate max finish time from predecessors
  const finish = new Map();
  for (const s of byOrder) {
    const preds = (s.depends_on || []).map(o => byOrder.find(x => x.order === o)).filter(Boolean);
    const predMax = preds.length ? Math.max(...preds.map(p => finish.get(p.order) || 0)) : 0;
    finish.set(s.order, predMax + dur(s));
  }
  const total = Math.max(...[...finish.values()]);
  res.json(ok({ plan_id: plan.id, total_ms: total, steps: byOrder.map(s => ({ ...s, finish_ms: finish.get(s.order) })) }));
});

// Validate dependencies form a DAG (no cycles)
app.get('/api/plans/:id/validate', (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json(fail('not found'));
  const orderToStep = new Map(plan.steps.map(s => [s.order, s]));
  const visiting = new Set();
  const visited = new Set();
  let cycle = null;
  function dfs(o) {
    if (visited.has(o)) return;
    if (visiting.has(o)) { cycle = o; return; }
    visiting.add(o);
    const s = orderToStep.get(o);
    if (s) for (const d of (s.depends_on || [])) dfs(d);
    visiting.delete(o);
    visited.add(o);
  }
  for (const s of plan.steps) dfs(s.order);
  res.json(ok({ valid: cycle === null, cycle_at: cycle }));
});

// Templates
app.get('/api/step-templates', (_q, r) => r.json(ok({ templates: [...stepTemplates.values()] })));

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));