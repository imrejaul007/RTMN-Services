// ngo-os (5274) - Non-profit Management.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'ngo-os';
const PORT = parseInt(process.env.PORT || '5274', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const orgs = new Map();         // orgId -> { id, name, mission, ein, cause, founded }
const programs = new Map();     // pgId -> { id, org_id, name, description, budget, beneficiaries_target, status }
const beneficiaries = new Map(); // bId -> { id, program_id, name, age, location, enrolled_at }
const donations = new Map();    // dId -> { id, org_id, donor_name, donor_email, amount, currency, recurring, status, created }
const volunteers = new Map();   // vId -> { id, org_id, name, email, skills[], hours_logged, joined }
const campaigns = new Map();    // cId -> { id, org_id, name, goal_usd, raised_usd, end_date, status }
const grants = new Map();       // gId -> { id, org_id, funder, amount, status, awarded_at, period }
const impact = new Map();       // imId -> { id, program_id, metric_name, value, unit, period }

// Seed
(function seed() {
  const orgId = uuid();
  orgs.set(orgId, { id: orgId, name: 'Hope Foundation', mission: 'End hunger',
    ein: '12-3456789', cause: 'food-security', founded: '2015-03-15' });
  const pgId = uuid();
  programs.set(pgId, { id: pgId, org_id: orgId, name: 'School Lunch Program',
    description: 'Daily meals for school children', budget: 50000,
    beneficiaries_target: 500, status: 'active' });
  campaigns.set(uuid(), { id: uuid(), org_id: orgId, name: 'Summer Drive',
    goal_usd: 25000, raised_usd: 8500, end_date: '2026-08-31', status: 'active' });
  grants.set(uuid(), { id: uuid(), org_id: orgId, funder: 'Ford Foundation', amount: 100000,
    status: 'active', awarded_at: '2026-01-15', period: '2026' });
  impact.set(uuid(), { id: uuid(), program_id: pgId, metric_name: 'Meals served',
    value: 125000, unit: 'meals', period: '2026-Q1' });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/orgs', '/api/programs', '/api/beneficiaries', '/api/donations',
              '/api/volunteers', '/api/campaigns', '/api/grants', '/api/impact']
})));

// Orgs
app.get('/api/orgs', (_req, res) => res.json(ok({ orgs: [...orgs.values()] })));
app.post('/api/orgs', (req, res) => {
  const { name, mission = '', ein = '', cause = 'general', founded } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  orgs.set(id, { id, name, mission, ein, cause, founded: founded || new Date().toISOString().slice(0, 10) });
  res.status(201).json(ok({ org: orgs.get(id) }));
});

// Programs
app.get('/api/programs', (req, res) => {
  let list = [...programs.values()];
  if (req.query.org_id) list = list.filter(p => p.org_id === req.query.org_id);
  if (req.query.status) list = list.filter(p => p.status === req.query.status);
  res.json(ok({ programs: list }));
});
app.post('/api/programs', (req, res) => {
  const { org_id, name, description = '', budget = 0, beneficiaries_target = 0 } = req.body || {};
  if (!org_id || !name) return res.status(400).json(fail('org_id + name required'));
  if (!orgs.has(org_id)) return res.status(400).json(fail('org_id invalid'));
  const id = uuid();
  programs.set(id, { id, org_id, name, description, budget, beneficiaries_target, status: 'planned' });
  res.status(201).json(ok({ program: programs.get(id) }));
});

// Beneficiaries
app.get('/api/beneficiaries', (req, res) => {
  let list = [...beneficiaries.values()];
  if (req.query.program_id) list = list.filter(b => b.program_id === req.query.program_id);
  res.json(ok({ beneficiaries: list }));
});
app.post('/api/beneficiaries', (req, res) => {
  const { program_id, name, age = null, location = '' } = req.body || {};
  if (!program_id || !name) return res.status(400).json(fail('program_id + name required'));
  if (!programs.has(program_id)) return res.status(400).json(fail('program_id invalid'));
  const id = uuid();
  beneficiaries.set(id, { id, program_id, name, age, location, enrolled_at: new Date().toISOString() });
  res.status(201).json(ok({ beneficiary: beneficiaries.get(id) }));
});

// Donations
app.get('/api/donations', (req, res) => {
  let list = [...donations.values()];
  if (req.query.org_id) list = list.filter(d => d.org_id === req.query.org_id);
  if (req.query.recurring) list = list.filter(d => String(d.recurring) === req.query.recurring);
  res.json(ok({ donations: list }));
});
app.post('/api/donations', (req, res) => {
  const { org_id, donor_name, donor_email, amount, currency = 'USD', recurring = false, campaign_id = null } = req.body || {};
  if (!org_id || !donor_name || !amount) return res.status(400).json(fail('org_id + donor_name + amount required'));
  if (!orgs.has(org_id)) return res.status(400).json(fail('org_id invalid'));
  if (amount <= 0) return res.status(400).json(fail('amount must be positive'));
  const id = uuid();
  donations.set(id, { id, org_id, donor_name, donor_email: donor_email || null, amount, currency, recurring, campaign_id,
    status: 'completed', created: new Date().toISOString() });
  // If campaign, increment raised
  if (campaign_id && campaigns.has(campaign_id)) {
    const c = campaigns.get(campaign_id);
    c.raised_usd += amount;
    campaigns.set(c.id, c);
  }
  res.status(201).json(ok({ donation: donations.get(id) }));
});

// Volunteers
app.get('/api/volunteers', (req, res) => {
  let list = [...volunteers.values()];
  if (req.query.org_id) list = list.filter(v => v.org_id === req.query.org_id);
  res.json(ok({ volunteers: list }));
});
app.post('/api/volunteers', (req, res) => {
  const { org_id, name, email, skills = [] } = req.body || {};
  if (!org_id || !name) return res.status(400).json(fail('org_id + name required'));
  if (!orgs.has(org_id)) return res.status(400).json(fail('org_id invalid'));
  const id = uuid();
  volunteers.set(id, { id, org_id, name, email: email || null, skills, hours_logged: 0,
    joined: new Date().toISOString() });
  res.status(201).json(ok({ volunteer: volunteers.get(id) }));
});
app.patch('/api/volunteers/:id', (req, res) => {
  const v = volunteers.get(req.params.id);
  if (!v) return res.status(404).json(fail('volunteer not found'));
  if (req.body.hours_logged !== undefined) v.hours_logged += req.body.hours_logged;
  volunteers.set(v.id, v);
  res.json(ok({ volunteer: v }));
});

// Campaigns
app.get('/api/campaigns', (req, res) => {
  let list = [...campaigns.values()];
  if (req.query.org_id) list = list.filter(c => c.org_id === req.query.org_id);
  if (req.query.status) list = list.filter(c => c.status === req.query.status);
  res.json(ok({ campaigns: list }));
});
app.get('/api/campaigns/:id', (req, res) => {
  const c = campaigns.get(req.params.id);
  if (!c) return res.status(404).json(fail('campaign not found'));
  res.json(ok({ campaign: c }));
});
app.post('/api/campaigns', (req, res) => {
  const { org_id, name, goal_usd, end_date } = req.body || {};
  if (!org_id || !name || goal_usd === undefined) return res.status(400).json(fail('org_id + name + goal_usd required'));
  if (!orgs.has(org_id)) return res.status(400).json(fail('org_id invalid'));
  const id = uuid();
  campaigns.set(id, { id, org_id, name, goal_usd, raised_usd: 0, end_date: end_date || null, status: 'active' });
  res.status(201).json(ok({ campaign: campaigns.get(id) }));
});

// Grants
app.get('/api/grants', (req, res) => {
  let list = [...grants.values()];
  if (req.query.org_id) list = list.filter(g => g.org_id === req.query.org_id);
  res.json(ok({ grants: list }));
});
app.post('/api/grants', (req, res) => {
  const { org_id, funder, amount, period } = req.body || {};
  if (!org_id || !funder || !amount) return res.status(400).json(fail('org_id + funder + amount required'));
  if (!orgs.has(org_id)) return res.status(400).json(fail('org_id invalid'));
  const id = uuid();
  grants.set(id, { id, org_id, funder, amount, status: 'pending', awarded_at: null, period: period || null });
  res.status(201).json(ok({ grant: grants.get(id) }));
});
app.patch('/api/grants/:id', (req, res) => {
  const g = grants.get(req.params.id);
  if (!g) return res.status(404).json(fail('grant not found'));
  if (req.body.status) {
    g.status = req.body.status;
    if (req.body.status === 'active' && !g.awarded_at) g.awarded_at = new Date().toISOString();
  }
  grants.set(g.id, g);
  res.json(ok({ grant: g }));
});

// Impact Metrics
app.get('/api/impact', (req, res) => {
  let list = [...impact.values()];
  if (req.query.program_id) list = list.filter(i => i.program_id === req.query.program_id);
  res.json(ok({ impact: list }));
});
app.post('/api/impact', (req, res) => {
  const { program_id, metric_name, value, unit = 'count', period = 'monthly' } = req.body || {};
  if (!program_id || !metric_name) return res.status(400).json(fail('program_id + metric_name required'));
  if (!programs.has(program_id)) return res.status(400).json(fail('program_id invalid'));
  const id = uuid();
  impact.set(id, { id, program_id, metric_name, value, unit, period });
  res.status(201).json(ok({ impact_record: impact.get(id) }));
});

// Aggregate stats
app.get('/api/stats', (_req, res) => {
  const totalDonations = [...donations.values()].reduce((s, d) => s + d.amount, 0);
  const totalBeneficiaries = beneficiaries.size;
  const totalVolunteerHours = [...volunteers.values()].reduce((s, v) => s + v.hours_logged, 0);
  const activeCampaigns = [...campaigns.values()].filter(c => c.status === 'active').length;
  const totalGrants = [...grants.values()].reduce((s, g) => s + g.amount, 0);
  res.json(ok({ stats: {
    total_donations_usd: totalDonations,
    total_beneficiaries: totalBeneficiaries,
    total_volunteer_hours: totalVolunteerHours,
    active_campaigns: activeCampaigns,
    total_grants_usd: totalGrants
  } }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
