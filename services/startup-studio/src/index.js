// startup-studio (4267) - Startup studio platform.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'startup-studio';
const PORT = parseInt(process.env.PORT || '4267', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const studios = new Map();      // stId -> { id, name, thesis, partner_count, created }
const cohorts = new Map();      // coId -> { id, studio_id, name, start_date, end_date, status }
const companies = new Map();    // cpId -> { id, cohort_id, name, domain, founder_ids[], stage, valuation, created }
const programs = new Map();     // pId -> { id, studio_id, name, duration_weeks, curriculum[], mentors[] }
const milestones = new Map();   // mId -> { id, company_id, name, due_date, status, completed_at }
const mentors = new Map();      // mtId -> { id, name, expertise, bio, contact, availability }
const applications = new Map(); // appId -> { id, cohort_id, founder_name, email, pitch, status, score }

// Seed
(function seed() {
  const stId = uuid();
  studios.set(stId, { id: stId, name: 'E2E Studio', thesis: 'B2B SaaS for SMBs',
    partner_count: 4, created: new Date().toISOString() });
  const coId = uuid();
  cohorts.set(coId, { id: coId, studio_id: stId, name: 'Cohort 1',
    start_date: '2026-01-15', end_date: '2026-04-15', status: 'active' });
  const cpId = uuid();
  companies.set(cpId, { id: cpId, cohort_id: coId, name: 'Studio Co 1',
    domain: 'hr-tech', founder_ids: ['f-1', 'f-2'], stage: 'mvp', valuation: 2000000,
    created: new Date().toISOString() });
  milestones.set(uuid(), { id: uuid(), company_id: cpId, name: 'First paying customer',
    due_date: '2026-07-01', status: 'in-progress' });
  ['Product Mentor', 'Sales Mentor'].forEach(name => {
    const id = uuid();
    mentors.set(id, { id, name, expertise: name.includes('Product') ? 'product' : 'sales',
      bio: `Senior ${name}`, contact: `${name.toLowerCase().replace(' ', '')}@example.com`, availability: 'weekly' });
  });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/studios', '/api/cohorts', '/api/companies', '/api/programs', '/api/milestones', '/api/mentors', '/api/applications']
})));

// Studios
app.get('/api/studios', (_req, res) => res.json(ok({ studios: [...studios.values()] })));
app.post('/api/studios', (req, res) => {
  const { name, thesis = '', partner_count = 1 } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  studios.set(id, { id, name, thesis, partner_count, created: new Date().toISOString() });
  res.status(201).json(ok({ studio: studios.get(id) }));
});

// Cohorts
app.get('/api/cohorts', (req, res) => {
  let list = [...cohorts.values()];
  if (req.query.studio_id) list = list.filter(c => c.studio_id === req.query.studio_id);
  if (req.query.status) list = list.filter(c => c.status === req.query.status);
  res.json(ok({ cohorts: list }));
});
app.post('/api/cohorts', (req, res) => {
  const { studio_id, name, start_date, end_date } = req.body || {};
  if (!studio_id || !name || !start_date) return res.status(400).json(fail('studio_id + name + start_date required'));
  if (!studios.has(studio_id)) return res.status(400).json(fail('studio_id invalid'));
  const id = uuid();
  cohorts.set(id, { id, studio_id, name, start_date, end_date: end_date || null, status: 'planned' });
  res.status(201).json(ok({ cohort: cohorts.get(id) }));
});

// Companies
app.get('/api/companies', (req, res) => {
  let list = [...companies.values()];
  if (req.query.cohort_id) list = list.filter(c => c.cohort_id === req.query.cohort_id);
  if (req.query.stage) list = list.filter(c => c.stage === req.query.stage);
  res.json(ok({ companies: list }));
});
app.post('/api/companies', (req, res) => {
  const { cohort_id, name, domain, founder_ids = [], stage = 'idea' } = req.body || {};
  if (!cohort_id || !name) return res.status(400).json(fail('cohort_id + name required'));
  if (!cohorts.has(cohort_id)) return res.status(400).json(fail('cohort_id invalid'));
  const id = uuid();
  companies.set(id, { id, cohort_id, name, domain: domain || null, founder_ids, stage, valuation: 0,
    created: new Date().toISOString() });
  res.status(201).json(ok({ company: companies.get(id) }));
});
app.patch('/api/companies/:id', (req, res) => {
  const c = companies.get(req.params.id);
  if (!c) return res.status(404).json(fail('company not found'));
  ['stage', 'valuation', 'name', 'domain', 'founder_ids'].forEach(k => { if (req.body[k] !== undefined) c[k] = req.body[k]; });
  companies.set(c.id, c);
  res.json(ok({ company: c }));
});

// Programs
app.get('/api/programs', (req, res) => {
  let list = [...programs.values()];
  if (req.query.studio_id) list = list.filter(p => p.studio_id === req.query.studio_id);
  res.json(ok({ programs: list }));
});
app.post('/api/programs', (req, res) => {
  const { studio_id, name, duration_weeks = 12, curriculum = [], mentor_ids = [] } = req.body || {};
  if (!studio_id || !name) return res.status(400).json(fail('studio_id + name required'));
  if (!studios.has(studio_id)) return res.status(400).json(fail('studio_id invalid'));
  const id = uuid();
  programs.set(id, { id, studio_id, name, duration_weeks, curriculum, mentor_ids });
  res.status(201).json(ok({ program: programs.get(id) }));
});

// Milestones
app.get('/api/milestones', (req, res) => {
  let list = [...milestones.values()];
  if (req.query.company_id) list = list.filter(m => m.company_id === req.query.company_id);
  if (req.query.status) list = list.filter(m => m.status === req.query.status);
  res.json(ok({ milestones: list }));
});
app.get('/api/milestones/:id', (req, res) => {
  const m = milestones.get(req.params.id);
  if (!m) return res.status(404).json(fail('milestone not found'));
  res.json(ok({ milestone: m }));
});
app.post('/api/milestones', (req, res) => {
  const { company_id, name, due_date } = req.body || {};
  if (!company_id || !name) return res.status(400).json(fail('company_id + name required'));
  if (!companies.has(company_id)) return res.status(400).json(fail('company_id invalid'));
  const id = uuid();
  milestones.set(id, { id, company_id, name, due_date: due_date || null, status: 'open' });
  res.status(201).json(ok({ milestone: milestones.get(id) }));
});
app.patch('/api/milestones/:id', (req, res) => {
  const m = milestones.get(req.params.id);
  if (!m) return res.status(404).json(fail('milestone not found'));
  if (req.body.status) {
    m.status = req.body.status;
    if (req.body.status === 'completed') m.completed_at = new Date().toISOString();
  }
  milestones.set(m.id, m);
  res.json(ok({ milestone: m }));
});

// Mentors
app.get('/api/mentors', (req, res) => {
  let list = [...mentors.values()];
  if (req.query.expertise) list = list.filter(m => m.expertise === req.query.expertise);
  res.json(ok({ mentors: list }));
});
app.post('/api/mentors', (req, res) => {
  const { name, expertise = 'general', bio = '', contact, availability = 'monthly' } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  mentors.set(id, { id, name, expertise, bio, contact: contact || null, availability });
  res.status(201).json(ok({ mentor: mentors.get(id) }));
});

// Applications
app.get('/api/applications', (req, res) => {
  let list = [...applications.values()];
  if (req.query.cohort_id) list = list.filter(a => a.cohort_id === req.query.cohort_id);
  if (req.query.status) list = list.filter(a => a.status === req.query.status);
  res.json(ok({ applications: list }));
});
app.post('/api/applications', (req, res) => {
  const { cohort_id, founder_name, email, pitch, score = 0 } = req.body || {};
  if (!cohort_id || !founder_name || !email) return res.status(400).json(fail('cohort_id + founder_name + email required'));
  if (!cohorts.has(cohort_id)) return res.status(400).json(fail('cohort_id invalid'));
  const id = uuid();
  applications.set(id, { id, cohort_id, founder_name, email, pitch: pitch || '', score, status: 'submitted',
    submitted_at: new Date().toISOString() });
  res.status(201).json(ok({ application: applications.get(id) }));
});
app.patch('/api/applications/:id', (req, res) => {
  const a = applications.get(req.params.id);
  if (!a) return res.status(404).json(fail('application not found'));
  if (req.body.status) a.status = req.body.status;
  if (req.body.score !== undefined) a.score = req.body.score;
  applications.set(a.id, a);
  res.json(ok({ application: a }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
