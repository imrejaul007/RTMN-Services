/**
 * genie-founder — Founder OS (C6)
 *
 * The AI CEO / Co-founder for the user-as-founder. Combines:
 *   - Founder Twin: digital twin of the user's founder journey
 *   - Dashboard: KPIs, milestones, OKRs, runway, team
 *   - Briefing: weekly founder briefing (Lenny's Newsletter style)
 *   - AI Board Advisor: 4 expert personas (VC, Operator, Customer, Mentor)
 *
 * Endpoints:
 *   GET    /health
 *   GET    /
 *   GET    /founder/get/:userId
 *   PUT    /founder/update/:userId
 *   GET    /founder/dashboard/:userId
 *   GET    /founder/briefing/:userId            (?type=weekly|monthly|quarterly)
 *   GET    /founder/board/:userId               (?topic=...)
 *   POST   /founder/board/ask/:userId
 *   GET    /founder/milestones/:userId
 *   POST   /founder/milestones/add/:userId
 *   POST   /founder/milestones/complete/:milestoneId/:userId
 *   GET    /founder/okrs/:userId
 *   POST   /founder/okrs/add/:userId
 *   GET    /founder/team/:userId
 *   POST   /founder/team/add/:userId
 */

const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { callLLM } = require('@rtmn/shared/lib/llm');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');

const founderRoutes = require('./routes/founder');
const boardRoutes = require('./routes/board');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4738', 10);
const SERVICE_NAME = 'genie-founder';

const founderStore = new PersistentMap('founder-profile', { serviceName: SERVICE_NAME });
const milestonesStore = new PersistentMap('founder-milestones', { serviceName: SERVICE_NAME });
const okrsStore = new PersistentMap('founder-okrs', { serviceName: SERVICE_NAME });
const teamStore = new PersistentMap('founder-team', { serviceName: SERVICE_NAME });
const adviceStore = new PersistentMap('founder-advice', { serviceName: SERVICE_NAME });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Public health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Founder OS', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Founder OS',
    tagline: 'Your AI Co-founder. Twin + Dashboard + Weekly Briefing + AI Board.',
    endpoints: [
      'GET    /founder/get/:userId',
      'PUT    /founder/update/:userId',
      'GET    /founder/dashboard/:userId',
      'GET    /founder/briefing/:userId (?type=weekly|monthly)',
      'GET    /founder/board/:userId',
      'POST   /founder/board/ask/:userId',
      'GET    /founder/milestones/:userId',
      'POST   /founder/milestones/add/:userId',
      'POST   /founder/milestones/complete/:milestoneId/:userId',
      'GET    /founder/okrs/:userId',
      'POST   /founder/okrs/add/:userId',
      'GET    /founder/team/:userId',
      'POST   /founder/team/add/:userId',
    ],
  });
});

app.use(requireAuth);

app.use('/founder', founderRoutes({
  founderStore, milestonesStore, okrsStore, teamStore,
}));

app.use('/founder/board', boardRoutes({ adviceStore, founderStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [founderStore, milestonesStore, okrsStore, teamStore, adviceStore],
});

// Seed: founder profile + milestones + OKRs + team + sample board advice
autoSeed([
  {
    store: founderStore,
    items: normalizeSeedData([
      {
        id: 'user-001',
        companyName: 'Acme AI',
        stage: 'seed',
        industry: 'B2B SaaS',
        foundedAt: '2026-01-15',
        mission: 'Make every small business AI-native.',
        vision: 'A world where 1-person companies have 1,000-person leverage.',
        values: ['Ship fast', 'Customer-led', 'AI-first', 'Small & mighty'],
        runwayMonths: 14,
        arr: 12000,
        customers: 8,
        teamSize: 3,
        updatedAt: new Date().toISOString(),
      },
    ]),
  },
  {
    store: milestonesStore,
    items: normalizeSeedData([
      { id: 'ms-1', userId: 'user-001', title: 'Ship MVP', status: 'done', completedAt: '2026-02-01', notes: 'v0.1 with auth + core flow' },
      { id: 'ms-2', userId: 'user-001', title: 'Get first 10 paying customers', status: 'done', completedAt: '2026-03-15', notes: 'Mix of inbound + manual outreach' },
      { id: 'ms-3', userId: 'user-001', title: 'Raise pre-seed $250K', status: 'done', completedAt: '2026-04-30', notes: '3 angels + 1 fund' },
      { id: 'ms-4', userId: 'user-001', title: 'Hit $1K MRR', status: 'in_progress', targetDate: '2026-08-01' },
      { id: 'ms-5', userId: 'user-001', title: 'Hire founding engineer', status: 'in_progress', targetDate: '2026-08-15' },
      { id: 'ms-6', userId: 'user-001', title: 'Close seed round $1.5M', status: 'todo', targetDate: '2026-12-31' },
    ]),
  },
  {
    store: okrsStore,
    items: normalizeSeedData([
      { id: 'okr-1', userId: 'user-001', objective: 'Reach $10K MRR by EOY', keyResults: [
        { id: 'kr-1', text: '50 paying customers', progress: 16 },
        { id: 'kr-2', text: 'Reduce churn from 8% to 4%', progress: 30 },
        { id: 'kr-3', text: 'Launch 2 integrations (Stripe, Slack)', progress: 50 },
      ], quarter: 'Q4 2026' },
      { id: 'okr-2', userId: 'user-001', objective: 'Build the founding team', keyResults: [
        { id: 'kr-4', text: 'Hire senior engineer', progress: 60 },
        { id: 'kr-5', text: 'Hire designer', progress: 20 },
      ], quarter: 'Q3 2026' },
    ]),
  },
  {
    store: teamStore,
    items: normalizeSeedData([
      { id: 'tm-1', userId: 'user-001', name: 'You (CEO)', role: 'Founder/CEO', equity: 70, joinedAt: '2026-01-15' },
      { id: 'tm-2', userId: 'user-001', name: 'Jamie', role: 'CTO', equity: 20, joinedAt: '2026-02-01' },
      { id: 'tm-3', userId: 'user-001', name: 'Sam', role: 'Founding Engineer', equity: 3, joinedAt: '2026-03-15' },
    ]),
  },
  {
    store: adviceStore,
    items: normalizeSeedData([
      {
        id: 'ba-seed-1', userId: 'user-001',
        persona: 'Operator', topic: 'Prioritization',
        question: 'Should I focus on growth or retention first?',
        advice: 'Retention first, always. If users churn in week 1, growth just fills a leaky bucket. Fix the activation flow, then scale what works.',
        createdAt: new Date().toISOString(),
      },
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Founder OS running on port ${PORT}`);
});

installGracefulShutdown(server);