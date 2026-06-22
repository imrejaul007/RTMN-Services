/**
 * Learning OS v2 Service
 *
 * Port: 4800
 *
 * Ebbinghaus-style spaced repetition for facts Genie has learned about the
 * user. Surfaces facts the user is about to forget (retention < threshold)
 * so Genie can re-ask or re-show in the morning briefing.
 *
 * Why:
 *   - "Genie remembers everything" is not always useful; the user forgets too
 *   - Re-surfacing just before forgetting locks in the memory
 *   - Drives the "did you remember" cards in morning briefing
 *
 * Routes:
 *   POST /api/learning/facts                    — add or update a fact
 *   GET  /api/learning/facts/:userId            — list all facts
 *   DELETE /api/learning/facts/:userId/:factId  — forget a fact
 *   POST /api/learning/review                   — mark a fact as remembered/forgotten
 *   GET  /api/learning/due/:userId              — facts about to be forgotten
 *   GET  /api/learning/stats/:userId            — counts by stability tier
 *   POST /api/learning/seed/:userId             — demo data (dev only)
 *   GET  /health
 *   GET  /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';
import { retention, review, dueForReview, stabilityTier } from '../lib/ebbinghaus.js';

const PORT = parseInt(process.env.PORT || '4800', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const log = createLogger('learning-os-v2');

const facts = new PersistentMap('learning-os-v2-facts', { serviceName: 'learning-os-v2' });

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// ---------- helpers ----------

function factKey(userId, factId) { return `${userId}:${factId}`; }

function getFact(userId, factId) {
  return facts.get(factKey(userId, factId)) || null;
}

function setFact(userId, factId, data) {
  const existing = getFact(userId, factId);
  const merged = {
    factId,
    userId,
    text: '',
    category: 'general',
    importance: 50,
    stability: 86400,  // 1 day
    reviews: 0,
    lastRemembered: null,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...existing,
    ...data,
  };
  facts.set(factKey(userId, factId), merged);
  return merged;
}

function allFactsForUser(userId) {
  const list = [];
  for (const [, v] of facts) {
    if (v && v.userId === userId) list.push(v);
  }
  return list;
}

function enrich(fact, nowIso = new Date().toISOString()) {
  const r = retention(fact, nowIso);
  const tier = stabilityTier(fact.stability || 86400);
  return {
    ...fact,
    retention: Math.round(r * 1000) / 1000,
    stabilityDays: Math.round((fact.stability || 86400) / 86400 * 10) / 10,
    stabilityTier: tier.tier,
    stabilityColor: tier.color,
    dueForReview: r < 0.7,
  };
}

// ---------- routes ----------

app.get('/health', (req, res) => send(res, 200, { status: 'healthy', service: 'learning-os-v2', port: PORT }));

// Add or update fact
app.post('/api/learning/facts', requireAuth, (req, res) => {
  const body = req.body || {};
  if (!body.userId) return sendErr(res, 400, 'VALIDATION', 'userId is required');
  if (!body.factId) return sendErr(res, 400, 'VALIDATION', 'factId is required');
  if (!body.text)   return sendErr(res, 400, 'VALIDATION', 'text is required');
  const saved = setFact(body.userId, body.factId, {
    text: body.text,
    category: body.category || 'general',
    importance: body.importance,
    stability: body.stability, // optional override
  });
  send(res, 200, enrich(saved));
});

// List facts
app.get('/api/learning/facts/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const list = allFactsForUser(userId).map((f) => enrich(f));
  // Sort by retention asc (most urgent first)
  list.sort((a, b) => a.retention - b.retention);
  send(res, 200, { userId, count: list.length, facts: list });
});

// Forget a fact
app.delete('/api/learning/facts/:userId/:factId', requireAuth, (req, res) => {
  const { userId, factId } = req.params;
  const key = factKey(userId, factId);
  const had = facts.get(key);
  if (!had) return sendErr(res, 404, 'NOT_FOUND', `No fact ${factId}`);
  facts.delete(key);
  send(res, 200, { deleted: true, factId });
});

// Review (remembered or forgotten)
app.post('/api/learning/review', requireAuth, (req, res) => {
  const body = req.body || {};
  if (!body.userId)   return sendErr(res, 400, 'VALIDATION', 'userId required');
  if (!body.factId)   return sendErr(res, 400, 'VALIDATION', 'factId required');
  if (typeof body.remembered !== 'boolean') return sendErr(res, 400, 'VALIDATION', 'remembered (bool) required');

  const existing = getFact(body.userId, body.factId);
  if (!existing) return sendErr(res, 404, 'NOT_FOUND', `No fact ${body.factId}`);

  const updated = review(existing, body.remembered, body.options || {});
  facts.set(factKey(body.userId, body.factId), updated);
  send(res, 200, enrich(updated));
});

// Facts due for review
app.get('/api/learning/due/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const threshold = Number(req.query.threshold || 0.7);
  const limit = Number(req.query.limit || 10);
  const list = allFactsForUser(userId);
  const due = dueForReview(list, { threshold, limit });
  send(res, 200, {
    userId,
    threshold,
    due: due.map((d) => ({
      ...enrich(d.fact),
      retention: Math.round(d.retention * 1000) / 1000,
      daysSinceReview: Math.round((Date.now() - d.fact.lastReviewedAt) / 86400000 * 10) / 10,
    })),
  });
});

// Stats
app.get('/api/learning/stats/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const list = allFactsForUser(userId);
  const byTier = {};
  let totalReviews = 0;
  for (const f of list) {
    const tier = stabilityTier(f.stability || 86400).tier;
    byTier[tier] = (byTier[tier] || 0) + 1;
    totalReviews += f.reviews || 0;
  }
  const due = dueForReview(list, { threshold: 0.7, limit: 1000 }).length;
  send(res, 200, {
    userId,
    totalFacts: list.length,
    totalReviews,
    dueForReview: due,
    byStabilityTier: byTier,
  });
});

// Seed (dev only)
app.post('/api/learning/seed/:userId', requireAuth, (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return sendErr(res, 403, 'FORBIDDEN', 'Seed disabled in production');
  }
  const { userId } = req.params;
  const now = Date.now();
  const seed = [
    { factId: 'bday-mom',     text: "Mom's birthday is March 14",              category: 'family',  importance: 95, stability: 90 * 86400, lastReviewedAt: now - 30*86400000 },
    { factId: 'allergy-peanut', text: 'Has a peanut allergy',                   category: 'health',  importance: 100, stability: 365 * 86400, lastReviewedAt: now - 100*86400000 },
    { factId: 'lang-pref',    text: 'Prefers Hindi for casual chat',            category: 'preferences', importance: 70, stability: 7 * 86400, lastReviewedAt: now - 14*86400000 },
    { factId: 'project-x',    text: 'Working on Project X (deadline Q3)',      category: 'work',    importance: 80, stability: 2 * 86400, lastReviewedAt: now - 5*86400000 },
    { factId: 'team-mate',    text: 'Alex is the lead on the recommendation engine', category: 'work', importance: 60, stability: 5 * 86400, lastReviewedAt: now - 7*86400000 },
  ];
  for (const f of seed) {
    setFact(userId, f.factId, f);
  }
  send(res, 200, { seeded: seed.length });
});

// 404
app.use((req, res) => sendErr(res, 404, 'NOT_FOUND', `${req.method} ${req.path} not found`));

requireEnv(['PORT'], { allowDev: true });
const server = app.listen(PORT, () => log.info(`learning-os-v2 listening on :${PORT}`));
installGracefulShutdown(server, 'learning-os-v2');
export default app;
