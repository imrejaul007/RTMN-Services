// Goal OS Canonical (4157) — canonical goal templates for all Department/Industry OS
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4157;
const SERVICE = 'goal-os-canonical';

const templates = new Map(); // id -> { id, name, metric, target, period, kpis }
const goals = new Map();     // goalId -> { id, template_id, owner, target, current, status, history }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const ts = [
    { name: 'Revenue Growth', metric: 'mrr', target: 100000, period: 'monthly', kpis: ['new_mrr', 'expansion_mrr', 'churn_mrr'] },
    { name: 'Customer Retention', metric: 'retention_rate', target: 0.9, period: 'monthly', kpis: ['logo_retention', 'revenue_retention'] },
    { name: 'Expansion Revenue', metric: 'expansion_pct', target: 0.15, period: 'quarterly', kpis: ['upsell_count', 'cross_sell_count'] },
    { name: 'NPS Improvement', metric: 'nps', target: 50, period: 'quarterly', kpis: ['promoters', 'passives', 'detractors'] },
    { name: 'Churn Reduction', metric: 'churn_rate', target: 0.03, period: 'monthly', kpis: ['voluntary_churn', 'involuntary_churn'] }
  ];
  ts.forEach(t => { const id = uuid(); templates.set(id, { id, ...t, created_at: new Date().toISOString() }); });

  const goals = [
    { template_name: 'Revenue Growth', owner: 'sales-os', current: 75000, target: 100000 },
    { template_name: 'Customer Retention', owner: 'customer-success-os', current: 0.87, target: 0.9 },
    { template_name: 'NPS Improvement', owner: 'cxo-os', current: 42, target: 50 }
  ];
  goals.forEach(g => {
    const tpl = [...templates.values()].find(t => t.name === g.template_name);
    if (!tpl) return;
    const id = uuid();
    goals_map_set(id, { id, template_id: tpl.id, template_name: tpl.name, owner: g.owner, target: g.target, current: g.current, period: tpl.period, kpis: tpl.kpis, status: 'tracking', history: [{ ts: new Date().toISOString(), value: g.current }] });
  });
}

function goals_map_set(id, g) { goals.set(id, g); }

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', templates: templates.size, goals: goals.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.post('/api/templates', (req, res) => {
  const { name, metric, target, period, kpis } = req.body || {};
  if (!name || !metric || target == null || !period) return res.status(400).json(fail('name, metric, target, period required'));
  const id = uuid();
  const t = { id, name, metric, target, period, kpis: kpis || [], created_at: new Date().toISOString() };
  templates.set(id, t);
  res.status(201).json(ok({ template: t }));
});
app.get('/api/templates', (_q, r) => r.json(ok({ templates: [...templates.values()], count: templates.size })));
app.get('/api/templates/:id', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('not found'));
  res.json(ok({ template: t }));
});

// Instantiate a goal from a template
app.post('/api/goals', (req, res) => {
  const { template_id, owner, target, current } = req.body || {};
  const t = templates.get(template_id);
  if (!t) return res.status(404).json(fail('template not found'));
  const id = uuid();
  const g = { id, template_id, template_name: t.name, owner: owner || 'unassigned', target: target != null ? target : t.target, current: current != null ? current : 0, period: t.period, kpis: t.kpis, status: 'tracking', history: [{ ts: new Date().toISOString(), value: current || 0 }] };
  goals.set(id, g);
  res.status(201).json(ok({ goal: g }));
});
app.get('/api/goals', (_q, r) => r.json(ok({ goals: [...goals.values()], count: goals.size })));
app.get('/api/goals/:id', (req, res) => {
  const g = goals.get(req.params.id);
  if (!g) return res.status(404).json(fail('not found'));
  res.json(ok({ goal: g, progress_pct: g.target ? Math.min(100, (g.current / g.target) * 100) : 0 }));
});
app.patch('/api/goals/:id', (req, res) => {
  const g = goals.get(req.params.id);
  if (!g) return res.status(404).json(fail('not found'));
  if (req.body.current != null) {
    g.current = req.body.current;
    g.history.push({ ts: new Date().toISOString(), value: g.current });
    if (g.target && g.current >= g.target) g.status = 'achieved';
  }
  if (req.body.status) g.status = req.body.status;
  res.json(ok({ goal: g }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));