/**
 * Relationship Graph Service
 *
 * Port: 4799
 *
 * The relationship memory for Genie. Tracks people × strength ×
 * last_contact × context. Powers "who matters to me" queries, "reach out
 * to X" suggestions, and the relationships component of PI Score.
 *
 * Why a separate service:
 *   - Relationships evolve independently of conversations
 *   - "Who I should call" is a recurring query that benefits from its own cache
 *   - Integrates with PI Score and Reflection as a single source of truth
 *
 * Storage: PersistentMap (in-memory + disk). For production this would be
 * backed by TwinOS people twins or a graph DB.
 *
 * Routes:
 *   GET    /api/relationships/:userId                    — list all (sorted)
 *   GET    /api/relationships/:userId/person/:personId   — get one
 *   POST   /api/relationships/:userId/person             — add or update
 *   DELETE /api/relationships/:userId/person/:personId   — remove
 *   POST   /api/relationships/:userId/interaction        — log an interaction (bumps strength)
 *   GET    /api/relationships/:userId/stale              — "reach out" candidates
 *   GET    /api/relationships/:userId/by-context/:tag    — people by context
 *   GET    /api/relationships/:userId/summary            — stats for PI Score
 *   POST   /api/relationships/:userId/seed               — demo data (dev only)
 *   GET    /health
 *   GET    /ready
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
import {
  computeStrength,
  strengthLevel,
  daysSinceLastContact,
  staleRelationships,
  peopleByContext,
  summary,
} from '../lib/strength.js';

const PORT = parseInt(process.env.PORT || '4799', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const log = createLogger('relationship-graph');

// Two stores: one for relationship records, one for interaction log.
const relationships = new PersistentMap('relationship-graph-people', { serviceName: 'relationship-graph' });
const interactions = new PersistentMap('relationship-graph-interactions', { serviceName: 'relationship-graph' });

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// ---------- helpers ----------

function relKey(userId, personId) { return `${userId}:${personId}`; }

function getRel(userId, personId) {
  return relationships.get(relKey(userId, personId)) || null;
}

function setRel(userId, personId, data) {
  const existing = getRel(userId, personId);
  const merged = {
    personId,
    userId,
    baseStrength: 50,
    importance: 50,
    contexts: [],
    interactions: 0,
    notes: '',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...existing,
    ...data,
  };
  relationships.set(relKey(userId, personId), merged);
  return merged;
}

function allRelForUser(userId) {
  const list = [];
  for (const [, v] of relationships) {
    if (v && v.userId === userId) list.push(v);
  }
  return list;
}

function enrich(rel, now = new Date().toISOString()) {
  const strength = computeStrength(rel, now);
  const lvl = strengthLevel(strength);
  const days = daysSinceLastContact(rel, now);
  return {
    ...rel,
    strength,
    strengthLevel: lvl.level,
    strengthColor: lvl.color,
    daysSinceContact: days === Infinity ? null : days,
  };
}

// ---------- routes ----------

app.get('/health', (req, res) => send(res, 200, { status: 'healthy', service: 'relationship-graph', port: PORT }));

// LIST all relationships for a user, sorted by strength desc
app.get('/api/relationships/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const list = allRelForUser(userId).map((r) => enrich(r));
  list.sort((a, b) => b.strength - a.strength);
  send(res, 200, { userId, count: list.length, relationships: list });
});

// GET single person
app.get('/api/relationships/:userId/person/:personId', requireAuth, (req, res) => {
  const { userId, personId } = req.params;
  const r = getRel(userId, personId);
  if (!r) return sendErr(res, 404, 'NOT_FOUND', `No relationship for ${personId}`);
  send(res, 200, enrich(r));
});

// POST upsert
app.post('/api/relationships/:userId/person', requireAuth, (req, res) => {
  const { userId } = req.params;
  const body = req.body || {};
  if (!body.personId) return sendErr(res, 400, 'VALIDATION', 'personId is required');
  const personId = String(body.personId).trim().toLowerCase().replace(/\s+/g, '-');
  const saved = setRel(userId, personId, {
    name: body.name || personId,
    baseStrength: body.baseStrength,
    importance: body.importance,
    contexts: Array.isArray(body.contexts) ? body.contexts : [],
    notes: body.notes || '',
    lastContactAt: body.lastContactAt || new Date().toISOString(),
  });
  send(res, 200, enrich(saved));
});

// DELETE person
app.delete('/api/relationships/:userId/person/:personId', requireAuth, (req, res) => {
  const { userId, personId } = req.params;
  const key = relKey(userId, personId);
  const had = relationships.get(key);
  if (!had) return sendErr(res, 404, 'NOT_FOUND', `No relationship for ${personId}`);
  relationships.delete(key);
  send(res, 200, { deleted: true, personId });
});

// LOG an interaction
app.post('/api/relationships/:userId/interaction', requireAuth, (req, res) => {
  const { userId } = req.params;
  const body = req.body || {};
  if (!body.personId) return sendErr(res, 400, 'VALIDATION', 'personId is required');
  const personId = String(body.personId).trim().toLowerCase().replace(/\s+/g, '-');
  const rel = getRel(userId, personId);
  if (!rel) {
    // auto-create a basic relationship for new contacts
    setRel(userId, personId, {
      name: body.name || personId,
      baseStrength: 30,
      lastContactAt: new Date().toISOString(),
    });
  } else {
    const updated = setRel(userId, personId, {
      ...rel,
      interactions: (rel.interactions || 0) + 1,
      lastContactAt: body.at || new Date().toISOString(),
    });
    void updated;
  }

  // log the interaction
  const ixId = `ix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  interactions.set(ixId, {
    id: ixId,
    userId,
    personId,
    kind: body.kind || 'contact',
    note: body.note || '',
    at: body.at || new Date().toISOString(),
  });

  send(res, 200, enrich(getRel(userId, personId)));
});

// STALE: "reach out" candidates
app.get('/api/relationships/:userId/stale', requireAuth, (req, res) => {
  const { userId } = req.params;
  const minStrength = Number(req.query.minStrength || 30);
  const minDays = Number(req.query.minDays || 7);
  const limit = Number(req.query.limit || 10);
  const list = staleRelationships(allRelForUser(userId), { minStrength, minDaysSince: minDays, limit });
  send(res, 200, { userId, count: list.length, candidates: list });
});

// BY CONTEXT: people tagged with a context
app.get('/api/relationships/:userId/by-context/:tag', requireAuth, (req, res) => {
  const { userId, tag } = req.params;
  const list = peopleByContext(allRelForUser(userId), tag).map((r) => enrich(r));
  list.sort((a, b) => b.strength - a.strength);
  send(res, 200, { userId, tag, count: list.length, people: list });
});

// SUMMARY: stats for PI Score
app.get('/api/relationships/:userId/summary', requireAuth, (req, res) => {
  const { userId } = req.params;
  const list = allRelForUser(userId);
  const s = summary(list);
  // PI Score also wants goal/wellness counts; they piggyback here
  send(res, 200, {
    ...s,
    active_goals: 0,
    completed_goals: 0,
    goal_progress_updates: 0,
    wellness_sleep_days: 0,
    wellness_mood_days: 0,
    wellness_workout_days: 0,
    wellness_water_days: 0,
  });
});

// SEED: demo data (dev only — gated by env)
app.post('/api/relationships/:userId/seed', requireAuth, (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return sendErr(res, 403, 'FORBIDDEN', 'Seed disabled in production');
  }
  const { userId } = req.params;
  const now = Date.now();
  const seed = [
    { personId: 'mom',       name: 'Mom',         baseStrength: 95, importance: 100, contexts: ['family'],     lastContactAt: new Date(now - 3*86400000).toISOString(),  interactions: 50, notes: 'Calls every Sunday' },
    { personId: 'dad',       name: 'Dad',         baseStrength: 85, importance: 95,  contexts: ['family'],     lastContactAt: new Date(now - 14*86400000).toISOString(), interactions: 30, notes: '' },
    { personId: 'alex',      name: 'Alex Chen',   baseStrength: 75, importance: 80,  contexts: ['work','tennis'], lastContactAt: new Date(now - 2*86400000).toISOString(),  interactions: 40, notes: 'Workout buddy' },
    { personId: 'priya',     name: 'Priya Singh', baseStrength: 70, importance: 75,  contexts: ['work'],       lastContactAt: new Date(now - 30*86400000).toISOString(), interactions: 20, notes: 'Project lead' },
    { personId: 'jordan',    name: 'Jordan Lee',  baseStrength: 50, importance: 50,  contexts: ['social'],     lastContactAt: new Date(now - 60*86400000).toISOString(), interactions: 8,  notes: 'Old college friend' },
    { personId: 'sam',       name: 'Sam Park',    baseStrength: 30, importance: 30,  contexts: ['work'],       lastContactAt: new Date(now - 90*86400000).toISOString(), interactions: 3,  notes: 'Former colleague' },
  ];
  let n = 0;
  for (const r of seed) {
    setRel(userId, r.personId, r);
    n++;
  }
  send(res, 200, { seeded: n });
});

// 404 handler
app.use((req, res) => sendErr(res, 404, 'NOT_FOUND', `${req.method} ${req.path} not found`));

requireEnv(['PORT'], { allowDev: true });
const server = app.listen(PORT, () => log.info(`relationship-graph listening on :${PORT}`));
installGracefulShutdown(server, 'relationship-graph');
export default app;
