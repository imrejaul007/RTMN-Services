/**
 * BLR AI Marketplace — Founder OS (port 4260)
 *
 * Founder-specific AI twin + workflows. Founders get a digital twin that
 * tracks their KPIs (runway, burn, team morale), suggests investor
 * outreach, drafts board updates, and helps with hiring decisions.
 *
 * Layer: 4 (Decision + Simulation + Learning + Flow + Founder)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4260;
const SERVICE_NAME = 'sutar-founder-os';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const founders = new PersistentMap('founders', { serviceName: 'blr-founder-os' });       // founderId -> founder
const kpis = new PersistentMap('kpis', { serviceName: 'blr-founder-os' });           // founderId -> kpi snapshots
const playbooks = new PersistentMap('playbooks', { serviceName: 'blr-founder-os' });      // playbookId -> playbook (workflow templates)
const audit = [];

const PLAYBOOK_TEMPLATES = [
  { id: 'weekly-board-update', title: 'Weekly Board Update', description: 'Draft a status update from current KPIs and team activity.', steps: ['collect-kpis', 'collect-blockers', 'collect-wins', 'draft-update'] },
  { id: 'investor-outreach', title: 'Investor Outreach', description: 'Identify 10 investors matching stage + sector, draft personalized emails.', steps: ['match-investors', 'draft-emails', 'schedule-follow-ups'] },
  { id: 'hiring-decision', title: 'Hiring Decision', description: 'Score a candidate against the role and team dynamics.', steps: ['collect-resume', 'score-fit', 'compare-team', 'recommend'] },
  { id: 'runway-extension', title: 'Extend Runway', description: 'Find the 3 highest-leverage cost reductions or revenue accelerations.', steps: ['analyze-burn', 'simulate-cuts', 'rank-by-impact'] },
];

function seed() {
  // One sample founder so the service is never empty
  const fid = 'founder-reja-001';
  founders.set(fid, {
    founderId: fid,
    name: 'Rejaul Karim',
    company: 'HOJAI AI',
    role: 'CEO & Founder',
    stage: 'seed',
    sector: 'AI Infrastructure',
    teamSize: 8,
    createdAt: new Date().toISOString(),
  });
  kpis.set(fid, {
    founderId: fid,
    snapshots: [
      { date: '2026-06-01', runwayMonths: 14, burnRateUsd: 22000, revenueUsd: 4500, customers: 12, teamMorale: 7.5 },
      { date: '2026-06-15', runwayMonths: 13, burnRateUsd: 23500, revenueUsd: 5800, customers: 14, teamMorale: 7.8 },
    ],
  });
  for (const p of PLAYBOOK_TEMPLATES) {
    playbooks.set(p.id, { ...p, createdAt: new Date().toISOString() });
  }
}
seed();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 4, port: PORT,
    counts: { founders: founders.size, kpiFounders: kpis.size, playbooks: playbooks.size, audit: audit.length },
    capabilities: ['founders-list', 'founders-get', 'founders-create', 'kpis-record', 'kpis-latest', 'kpis-trend', 'playbooks-list', 'playbooks-run'],
    timestamp: new Date().toISOString(),
  });
});

// ---------- Founders ----------

app.get('/api/founders', (_req, res) => {
  res.json({ count: founders.size, founders: Array.from(founders.values()) });
});

app.get('/api/founders/:id', (req, res) => {
  const f = founders.get(req.params.id);
  if (!f) return res.status(404).json({ error: 'unknown founder' });
  res.json(f);
});

app.post('/api/founders',requireAuth,  (req, res) => {
  const { name, company, role = 'CEO', stage = 'pre-seed', sector = '', teamSize = 1 } = req.body || {};
  if (!name || !company) return res.status(400).json({ error: 'name and company required' });
  const id = `founder-${uuid().slice(0, 8)}`;
  const f = { founderId: id, name, company, role, stage, sector, teamSize, createdAt: new Date().toISOString() };
  founders.set(id, f);
  kpis.set(id, { founderId: id, snapshots: [] });
  audit.push({ kind: 'create-founder', founderId: id, at: Date.now() });
  res.status(201).json(f);
});

// ---------- KPIs ----------

app.post('/api/founders/:id/kpis',requireAuth,  (req, res) => {
  const { date, runwayMonths, burnRateUsd, revenueUsd = 0, customers = 0, teamMorale = 5 } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date required' });
  const f = founders.get(req.params.id);
  if (!f) return res.status(404).json({ error: 'unknown founder' });
  const k = kpis.get(req.params.id);
  k.snapshots.push({ date, runwayMonths, burnRateUsd, revenueUsd, customers, teamMorale });
  k.snapshots.sort((a, b) => a.date.localeCompare(b.date));
  audit.push({ kind: 'kpi-snapshot', founderId: req.params.id, date, at: Date.now() });
  res.status(201).json(k);
});

app.get('/api/founders/:id/kpis/latest', (req, res) => {
  const k = kpis.get(req.params.id);
  if (!k || k.snapshots.length === 0) return res.status(404).json({ error: 'no kpis' });
  res.json(k.snapshots[k.snapshots.length - 1]);
});

app.get('/api/founders/:id/kpis/trend', (req, res) => {
  const k = kpis.get(req.params.id);
  if (!k) return res.status(404).json({ error: 'unknown founder' });
  res.json({ founderId: req.params.id, snapshots: k.snapshots });
});

// ---------- Playbooks ----------

app.get('/api/playbooks', (_req, res) => {
  res.json({ count: playbooks.size, playbooks: Array.from(playbooks.values()) });
});

app.get('/api/playbooks/:id', (req, res) => {
  const p = playbooks.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'unknown playbook' });
  res.json(p);
});

// Run a playbook for a founder — returns a structured draft
app.post('/api/founders/:id/playbooks/:pid/run',requireAuth,  (req, res) => {
  const f = founders.get(req.params.id);
  if (!f) return res.status(404).json({ error: 'unknown founder' });
  const p = playbooks.get(req.params.pid);
  if (!p) return res.status(404).json({ error: 'unknown playbook' });
  const k = kpis.get(req.params.id);
  const latest = k?.snapshots?.[k.snapshots.length - 1] || {};

  let draft;
  switch (p.id) {
    case 'weekly-board-update':
      draft = {
        title: `Weekly Update — ${f.company}`,
        body: `Runway: ${latest.runwayMonths ?? '?'} months. Burn: $${latest.burnRateUsd ?? '?'}/mo. Revenue: $${latest.revenueUsd ?? '?'}/mo. Customers: ${latest.customers ?? '?'}. Morale: ${latest.teamMorale ?? '?'}/10.`,
        nextSteps: ['Close Series A conversations', 'Hire 2 senior engineers', 'Hit $10k MRR by end of quarter'],
      };
      break;
    case 'investor-outreach':
      draft = {
        targetCount: 10,
        matchCriteria: { stage: f.stage, sector: f.sector, checkSize: '$500k-$2M' },
        emailTemplate: `Subject: ${f.company} — ${f.sector} at ${f.stage}\n\nHi {investor_name},\n\nWe're building ${f.company}, an AI infrastructure company at the ${f.stage} stage. Current traction: ${latest.customers ?? '?'} customers, $${latest.revenueUsd ?? '?'}/mo revenue, ${latest.runwayMonths ?? '?'} months runway.\n\nWould you be open to a 20-min intro call?\n\nBest,\n${f.name}`,
      };
      break;
    case 'hiring-decision':
      draft = {
        scoreFit: 0.78,
        reasoning: 'Strong technical background, prior startup experience, complementary to current team dynamics.',
        recommendation: 'proceed-to-onsite',
      };
      break;
    case 'runway-extension':
      draft = {
        leverage: [
          { action: 'Reduce AWS spend by switching to reserved instances', impactMonths: 1.5, risk: 'low' },
          { action: 'Hire 2 contract engineers instead of full-time', impactMonths: 2.0, risk: 'medium' },
          { action: 'Raise $250k SAFE from existing investors', impactMonths: 4.0, risk: 'medium' },
        ],
      };
      break;
    default:
      draft = { note: 'no template available' };
  }

  audit.push({ kind: 'run-playbook', founderId: req.params.id, playbookId: req.params.pid, at: Date.now() });
  res.json({ founderId: req.params.id, playbook: p.id, draft, generatedAt: new Date().toISOString() });
});

app.get('/api/audit', (_req, res) => {
  res.json({ count: audit.length, audit: audit.slice(-100) });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
});
installGracefulShutdown(server);
