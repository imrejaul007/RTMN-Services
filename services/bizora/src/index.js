// bizora (4261) - Business Operations & Metrics Hub.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'bizora';
const PORT = parseInt(process.env.PORT || '4261', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const orgs = new Map();        // orgId -> { id, name, industry, size, plan, created }
const depts = new Map();       // deptId -> { id, org_id, name, headcount, budget_usd }
const kpis = new Map();        // kpiId -> { id, org_id, dept_id, name, value, target, unit, period }
const dashboards = new Map();  // dashId -> { id, org_id, name, widgets[] }
const alerts = new Map();      // alertId -> { id, org_id, kpi_id, threshold, direction, severity, status, triggered_at }
const reports = new Map();     // reportId -> { id, org_id, title, sections[], created }
const summaries = new Map();   // sumId -> { id, org_id, period, highlights[], risks[], actions[] }

// Seed
(function seed() {
  const orgId = uuid();
  orgs.set(orgId, { id: orgId, name: 'Acme Corp', industry: 'manufacturing', size: 500, plan: 'enterprise', created: new Date().toISOString() });
  ['Sales', 'Engineering', 'Marketing', 'Finance'].forEach(name => {
    const id = uuid();
    depts.set(id, { id, org_id: orgId, name, headcount: Math.floor(Math.random() * 80) + 5, budget_usd: Math.floor(Math.random() * 500000) + 50000 });
  });
  const seedKpis = [
    { name: 'MRR', value: 125000, target: 150000, unit: 'USD', period: 'monthly' },
    { name: 'Customer Count', value: 342, target: 400, unit: 'count', period: 'monthly' },
    { name: 'NPS', value: 62, target: 70, unit: 'score', period: 'quarterly' },
    { name: 'Churn Rate', value: 3.2, target: 2.5, unit: 'percent', period: 'monthly' }
  ];
  seedKpis.forEach(k => {
    const id = uuid();
    kpis.set(id, { id, org_id: orgId, dept_id: [...depts.keys()][0], ...k });
  });
  const dashId = uuid();
  dashboards.set(dashId, { id: dashId, org_id: orgId, name: 'Executive Overview', widgets: seedKpis.map(k => ({ kpi: k.name, type: 'tile' })) });

  // Trigger one alert
  const churnKpi = [...kpis.values()].find(k => k.name === 'Churn Rate');
  if (churnKpi) {
    const id = uuid();
    alerts.set(id, { id, org_id: orgId, kpi_id: churnKpi.id, threshold: 3.0, direction: 'above', severity: 'high', status: 'active', triggered_at: new Date().toISOString() });
  }
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/orgs', '/api/depts', '/api/kpis', '/api/dashboards', '/api/alerts', '/api/reports', '/api/summaries']
})));

// Orgs
app.get('/api/orgs', (_req, res) => res.json(ok({ orgs: [...orgs.values()] })));
app.post('/api/orgs', (req, res) => {
  const { name, industry = 'other', size = 1, plan = 'free' } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const o = { id, name, industry, size, plan, created: new Date().toISOString() };
  orgs.set(id, o);
  res.status(201).json(ok({ org: o }));
});

// Departments
app.get('/api/depts', (req, res) => {
  let list = [...depts.values()];
  if (req.query.org_id) list = list.filter(d => d.org_id === req.query.org_id);
  res.json(ok({ departments: list }));
});
app.post('/api/depts', (req, res) => {
  const { org_id, name, headcount = 0, budget_usd = 0 } = req.body || {};
  if (!org_id || !name) return res.status(400).json(fail('org_id + name required'));
  if (!orgs.has(org_id)) return res.status(400).json(fail('org_id invalid'));
  const id = uuid();
  const d = { id, org_id, name, headcount, budget_usd };
  depts.set(id, d);
  res.status(201).json(ok({ department: d }));
});

// KPIs
app.get('/api/kpis', (req, res) => {
  let list = [...kpis.values()];
  if (req.query.org_id) list = list.filter(k => k.org_id === req.query.org_id);
  if (req.query.dept_id) list = list.filter(k => k.dept_id === req.query.dept_id);
  res.json(ok({ kpis: list }));
});
app.post('/api/kpis', (req, res) => {
  const { org_id, dept_id, name, value = 0, target = 0, unit = 'count', period = 'monthly' } = req.body || {};
  if (!org_id || !name) return res.status(400).json(fail('org_id + name required'));
  if (!orgs.has(org_id)) return res.status(400).json(fail('org_id invalid'));
  const id = uuid();
  const k = { id, org_id, dept_id: dept_id || null, name, value, target, unit, period, updated: new Date().toISOString() };
  kpis.set(id, k);
  res.status(201).json(ok({ kpi: k }));
});
app.patch('/api/kpis/:id', (req, res) => {
  const k = kpis.get(req.params.id);
  if (!k) return res.status(404).json(fail('kpi not found'));
  const allowed = ['name', 'value', 'target', 'unit', 'period', 'dept_id'];
  allowed.forEach(field => { if (req.body[field] !== undefined) k[field] = req.body[field]; });
  k.updated = new Date().toISOString();
  kpis.set(k.id, k);
  // Check alert thresholds
  alerts.forEach(a => {
    if (a.kpi_id === k.id && a.status === 'active') {
      const triggered = a.direction === 'above' ? k.value > a.threshold : k.value < a.threshold;
      if (!triggered) { a.status = 'resolved'; a.resolved_at = new Date().toISOString(); alerts.set(a.id, a); }
    }
  });
  res.json(ok({ kpi: k }));
});

// Dashboards
app.get('/api/dashboards', (req, res) => {
  let list = [...dashboards.values()];
  if (req.query.org_id) list = list.filter(d => d.org_id === req.query.org_id);
  res.json(ok({ dashboards: list }));
});
app.post('/api/dashboards', (req, res) => {
  const { org_id, name, widgets = [] } = req.body || {};
  if (!org_id || !name) return res.status(400).json(fail('org_id + name required'));
  if (!orgs.has(org_id)) return res.status(400).json(fail('org_id invalid'));
  const id = uuid();
  const d = { id, org_id, name, widgets, created: new Date().toISOString() };
  dashboards.set(id, d);
  res.status(201).json(ok({ dashboard: d }));
});

// Alerts
app.get('/api/alerts', (req, res) => {
  let list = [...alerts.values()];
  if (req.query.status) list = list.filter(a => a.status === req.query.status);
  if (req.query.severity) list = list.filter(a => a.severity === req.query.severity);
  res.json(ok({ alerts: list }));
});
app.get('/api/alerts/:id', (req, res) => {
  const a = alerts.get(req.params.id);
  if (!a) return res.status(404).json(fail('alert not found'));
  res.json(ok({ alert: a }));
});
app.post('/api/alerts', (req, res) => {
  const { org_id, kpi_id, threshold, direction = 'above', severity = 'medium' } = req.body || {};
  if (!org_id || !kpi_id || threshold === undefined) return res.status(400).json(fail('org_id + kpi_id + threshold required'));
  if (!kpis.has(kpi_id)) return res.status(400).json(fail('kpi_id invalid'));
  const id = uuid();
  const a = { id, org_id, kpi_id, threshold, direction, severity, status: 'active', triggered_at: new Date().toISOString() };
  alerts.set(id, a);
  res.status(201).json(ok({ alert: a }));
});
app.patch('/api/alerts/:id', (req, res) => {
  const a = alerts.get(req.params.id);
  if (!a) return res.status(404).json(fail('alert not found'));
  if (req.body.status) a.status = req.body.status;
  if (req.body.status === 'resolved') a.resolved_at = new Date().toISOString();
  alerts.set(a.id, a);
  res.json(ok({ alert: a }));
});

// Reports
app.get('/api/reports', (_req, res) => res.json(ok({ reports: [...reports.values()] })));
app.post('/api/reports', (req, res) => {
  const { org_id, title, sections = [] } = req.body || {};
  if (!org_id || !title) return res.status(400).json(fail('org_id + title required'));
  const id = uuid();
  const r = { id, org_id, title, sections, created: new Date().toISOString() };
  reports.set(id, r);
  res.status(201).json(ok({ report: r }));
});

// AI-generated exec summary
app.post('/api/summaries', (req, res) => {
  const { org_id, period = 'monthly' } = req.body || {};
  if (!org_id) return res.status(400).json(fail('org_id required'));
  const orgKpis = [...kpis.values()].filter(k => k.org_id === org_id);
  const onTarget = orgKpis.filter(k => k.value >= k.target).length;
  const offTarget = orgKpis.filter(k => k.value < k.target).length;
  const orgAlerts = [...alerts.values()].filter(a => a.org_id === org_id && a.status === 'active');
  const highlights = orgKpis.filter(k => k.value >= k.target).map(k => `${k.name} ${k.value}${k.unit} on target`);
  const risks = orgKpis.filter(k => k.value < k.target).map(k => `${k.name} ${k.value}${k.unit} below target ${k.target}${k.unit}`);
  const actions = orgAlerts.map(a => `Address active alert on ${a.kpi_id} (${a.severity})`);
  const id = uuid();
  const s = { id, org_id, period, highlights, risks, actions, stats: { on_target: onTarget, off_target: offTarget, active_alerts: orgAlerts.length }, created: new Date().toISOString() };
  summaries.set(id, s);
  res.status(201).json(ok({ summary: s }));
});
app.get('/api/summaries', (_req, res) => res.json(ok({ summaries: [...summaries.values()] })));

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
