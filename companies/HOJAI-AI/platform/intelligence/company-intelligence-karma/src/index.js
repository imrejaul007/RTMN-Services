// Company Intelligence: Karma (4163) — sustainability vertical
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4163;
const SERVICE = 'company-intelligence-karma';
const COMPANY = 'Karma';
const VERTICAL = 'sustainability';

const templates = new Map();
const projects = new Map();

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const ts = [
    { name: 'Carbon Footprint Calculator', kind: 'analytics', inputs: ['activity_type', 'quantity', 'unit'], outputs: ['co2e_kg'] },
    { name: 'ESG Score Aggregator', kind: 'rating', inputs: ['e_score', 's_score', 'g_score'], outputs: ['esg_total', 'rating'] },
    { name: 'Circular Economy Recommender', kind: 'recommender', inputs: ['waste_type', 'volume_kg'], outputs: ['reuse_paths'] },
    { name: 'SDG Mapping', kind: 'knowledge', inputs: ['project_description'], outputs: ['sdg_goals'] }
  ];
  ts.forEach(t => { const id = uuid(); templates.set(id, { id, company: COMPANY, vertical: VERTICAL, ...t, created_at: new Date().toISOString() }); });

  const projs = [
    { name: 'Plastic Neutral 2026', sdg: [12, 13, 14], status: 'active', esg_total: 78 },
    { name: 'Renewable Energy Pilot', sdg: [7, 13], status: 'planning', esg_total: 62 }
  ];
  projs.forEach(p => { const id = uuid(); projects.set(id, { id, ...p, created_at: new Date().toISOString() }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', company: COMPANY, vertical: VERTICAL, templates: templates.size, projects: projects.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/templates', (_q, r) => r.json(ok({ templates: [...templates.values()], count: templates.size })));
app.get('/api/templates/:id', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('not found'));
  res.json(ok({ template: t }));
});
app.post('/api/templates', (req, res) => {
  const { name, kind, inputs, outputs } = req.body || {};
  if (!name || !kind) return res.status(400).json(fail('name, kind required'));
  const id = uuid();
  const t = { id, company: COMPANY, vertical: VERTICAL, ...req.body, created_at: new Date().toISOString() };
  templates.set(id, t);
  res.status(201).json(ok({ template: t }));
});
app.post('/api/templates/:id/run', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('not found'));
  res.json(ok({ run: { template_id: t.id, ran_at: new Date().toISOString(), output: { mock: true } } }));
});

app.get('/api/projects', (_q, r) => r.json(ok({ projects: [...projects.values()], count: projects.size })));
app.post('/api/projects', (req, res) => {
  const { name, sdg, esg_total } = req.body || {};
  if (!name || !Array.isArray(sdg)) return res.status(400).json(fail('name, sdg[] required'));
  const id = uuid();
  const p = { id, ...req.body, status: 'planning', created_at: new Date().toISOString() };
  projects.set(id, p);
  res.status(201).json(ok({ project: p }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));