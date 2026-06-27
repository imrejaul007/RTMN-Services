/**
 * Genie Thinking Engine - Deep Reasoning & Analysis
 *
 * This service powers Genie's Intelligence OS pillar.
 * It provides:
 * - Deep thinking
 * - Brainstorming
 * - Decision analysis
 * - SWOT analysis
 * - Root cause analysis
 * - First-principles thinking
 * - Scenario simulation
 * - Research assistance
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import { installReadinessRoutes, autoSeed, normalizeSeedData } from '@rtmn/shared/lib/genie-readiness';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import analysisRoutes from './routes/analysis.js';
import brainstormingRoutes from './routes/brainstorming.js';
import decisionRoutes from './routes/decision.js';
import researchRoutes from './routes/research.js';

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
const PORT = process.env.PORT || 4719;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


app.use(requireAuth);// Storage
const storage = {
  sessions: new PersistentMap('collection-1', { serviceName: 'genie-thinking-engine' }),
  analyses: new PersistentMap('collection-2', { serviceName: 'genie-thinking-engine' }),
  decisions: new PersistentMap('collection-3', { serviceName: 'genie-thinking-engine' })
};

app.locals.storage = storage;

// Seed demo data (idempotent — only fills empty stores)
const seedPlans = [
  {
    store: storage.sessions,
    items: normalizeSeedData([
      { id: 'session-th-1', userId: 'user-001', topic: 'Q3 product launch strategy', mode: 'deep-thinking', startedAt: '2026-06-20T09:00:00Z' },
      { id: 'session-th-2', userId: 'user-002', topic: 'Should we expand to Bangalore?', mode: 'decision-analysis', startedAt: '2026-06-20T11:30:00Z' },
      { id: 'session-th-3', userId: 'user-001', topic: 'Refactor billing module', mode: 'first-principles', startedAt: '2026-06-21T08:15:00Z' },
      { id: 'session-th-4', userId: 'user-003', topic: 'Hiring vs contracting decision', mode: 'swot-analysis', startedAt: '2026-06-21T14:00:00Z' },
      { id: 'session-th-5', userId: 'user-002', topic: 'Reduce churn in month 2', mode: 'root-cause', startedAt: '2026-06-22T10:45:00Z' },
    ]),
  },
  {
    store: storage.analyses,
    items: normalizeSeedData([
      { id: 'analysis-th-1', sessionId: 'session-th-1', type: 'swot', topic: 'Q3 product launch', result: { strengths: ['Strong brand', 'Tech talent'], weaknesses: ['Limited budget'], opportunities: ['New market segment'], threats: ['Competitor X launch'] } },
      { id: 'analysis-th-2', sessionId: 'session-th-3', type: 'first-principles', topic: 'Refactor billing', result: { conclusion: 'Decouple invoice generation from payment processing' } },
      { id: 'analysis-th-3', sessionId: 'session-th-5', type: 'root-cause', topic: 'Month 2 churn', result: { rootCause: 'Onboarding email cadence drops after day 7' } },
      { id: 'analysis-th-4', sessionId: 'session-th-4', type: 'swot', topic: 'Hiring decision', result: { strengths: ['Team bandwidth'], weaknesses: ['Onboarding cost'], opportunities: ['Long-term IP'], threats: ['Slow time-to-market'] } },
      { id: 'analysis-th-5', sessionId: 'session-th-2', type: 'cost-benefit', topic: 'Bangalore expansion', result: { npv: 2500000, paybackMonths: 18 } },
    ]),
  },
  {
    store: storage.decisions,
    items: normalizeSeedData([
      { id: 'decision-th-1', sessionId: 'session-th-2', decision: 'expand-to-bangalore', outcome: 'proceed-with-pilot', confidence: 0.78, decidedAt: '2026-06-20T12:00:00Z' },
      { id: 'decision-th-2', sessionId: 'session-th-4', decision: 'hire-vs-contract', outcome: 'hire-2-engineers', confidence: 0.82, decidedAt: '2026-06-21T15:00:00Z' },
      { id: 'decision-th-3', sessionId: 'session-th-3', decision: 'refactor-billing', outcome: 'deferred-q4', confidence: 0.55, decidedAt: '2026-06-21T10:00:00Z' },
      { id: 'decision-th-4', sessionId: 'session-th-1', decision: 'launch-q3', outcome: 'go', confidence: 0.91, decidedAt: '2026-06-20T17:00:00Z' },
      { id: 'decision-th-5', sessionId: 'session-th-5', decision: 'onboarding-fix', outcome: 'redesign-email-cadence', confidence: 0.88, decidedAt: '2026-06-22T11:30:00Z' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-thinking-engine' });
if (seeded) console.log('[genie-thinking-engine] demo data seeded');

// Routes
app.use('/', analysisRoutes);
app.use('/', brainstormingRoutes);
app.use('/', decisionRoutes);
app.use('/', researchRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-thinking-engine',
    port: PORT,
    version: '1.0.0',
    capabilities: [
      'deep-thinking',
      'brainstorming',
      'decision-analysis',
      'swot-analysis',
      'root-cause',
      'first-principles',
      'scenario-simulation',
      'research'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'genie-thinking-engine' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Readiness routes — /api/llm-health, /api/db-health, /api/readiness
installReadinessRoutes(app, { serviceName: 'genie-thinking-engine' });

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE THINKING ENGINE v1.0.0                    ║
║                                                                ║
║  🧠 Deep Reasoning & Analysis                               ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Features:                                                     ║
║  • Deep Thinking                                               ║
║  • Brainstorming                                               ║
║  • Decision Analysis                                           ║
║  • SWOT Analysis                                               ║
║  • Root Cause Analysis                                         ║
║  • First Principles                                            ║
║  • Scenario Simulation                                         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
