/**
 * PI Score Service
 *
 * Port: 4798
 *
 * The "this is getting smarter" layer. Computes a 0-100 score with
 * 7 sub-scores and assigns a level (1-6). Updated in real-time
 * (on demand from runtime/genie or morning-briefing-v2).
 *
 * Why a score at all:
 *   - Gamification done right: user watches Genie grow
 *   - Trust calibration: low score honestly tells the user "Genie doesn't know you yet"
 *   - Differentiation: no other AI product has this
 *
 * Routes:
 *   GET  /api/pi-score/:userId           — current score
 *   POST /api/pi-score/:userId/compute   — force a fresh computation
 *   GET  /api/pi-score/:userId/history   — last 30 days
 *   GET  /api/pi-score/:userId/widget    — formatted for the Genie widget
 *   GET  /api/pi-score/levels            — list all 6 levels + unlocks
 *   POST /api/pi-score/feedback          — log learning/feedback events
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
import {
  computeMemoryScore,
  computeContextScore,
  computeLearningScore,
  computeRelationshipsScore,
  computeGoalsScore,
  computeWellnessScore,
  computeReflectionScore,
  computeOverall,
  getLevel,
  getNextLevel,
  computeDelta,
  LEVELS,
} from '../lib/scoring.js';

const PORT = parseInt(process.env.PORT || '4798', 10);
const MEMORY_SUBSTRATE_URL = process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791';
const RELATIONSHIP_GRAPH_URL = process.env.RELATIONSHIP_GRAPH_URL || 'http://localhost:4799';
const REFLECTION_ENGINE_URL = process.env.REFLECTION_ENGINE_URL || 'http://localhost:4796';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

const log = createLogger('pi-score');

const scoreHistory = new PersistentMap('pi-score-history', { serviceName: 'pi-score' });
const cachedScores = new PersistentMap('pi-score-cached', { serviceName: 'pi-score' });
const feedbackEvents = new PersistentMap('pi-score-feedback', { serviceName: 'pi-score' });

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// === Helper: fetch JSON with timeout, return null on failure ===
async function tryFetch(url, options = {}, timeoutMs = 3000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// === Helper: gather raw counts from upstream services ===
async function gatherRawCounts(userId) {
  // Memory substrate: health summary
  const memSummary = await tryFetch(`${MEMORY_SUBSTRATE_URL}/api/health-summary/${userId}`, {
    headers: { 'x-internal-token': INTERNAL_TOKEN },
  });
  const memData = memSummary?.data || {};

  // Relationship graph: people tracked
  const relGraph = await tryFetch(`${RELATIONSHIP_GRAPH_URL}/api/relationships/${userId}/summary`, {
    headers: { 'x-internal-token': INTERNAL_TOKEN },
  });
  const relData = relGraph?.data || {};

  // Reflection: insights surfaced
  const refLog = await tryFetch(`${REFLECTION_ENGINE_URL}/api/reflection/${userId}/history`, {
    headers: { 'x-internal-token': INTERNAL_TOKEN },
  });
  const refData = refLog?.data || {};

  // Feedback events
  const feedback = [...feedbackEvents.values()].filter(e => e.userId === userId);

  return {
    memory: {
      memoryCount: memData.memories_count || 0,
      avgConfidence: memData.avg_confidence || 0.5,
      highImportanceCount: memData.high_importance_count || 0,
    },
    context: {
      totalRetrievals: memData.total_retrievals || 0,
      usefulRetrievals: memData.useful_retrievals || 0,
      avgContextItems: memData.avg_context_items || 0,
    },
    learning: {
      feedbackCount: feedback.length,
      positiveFeedback: feedback.filter(f => f.feedback === 'useful' || f.feedback === 'loved').length,
      correctionsAccepted: feedback.filter(f => f.feedback === 'accepted_correction').length,
    },
    relationships: {
      peopleTracked: relData.people_count || 0,
      recentlyContacted: relData.recently_contacted || 0,
      accuracyScore: relData.accuracy_score || 0.5,
    },
    goals: {
      activeGoals: relData.active_goals || 0,  // piggyback on relationship summary for now
      progressUpdates: relData.goal_progress_updates || 0,
      completedGoals: relData.completed_goals || 0,
    },
    wellness: {
      sleepDays: relData.wellness_sleep_days || 0,
      moodDays: relData.wellness_mood_days || 0,
      workoutDays: relData.wellness_workout_days || 0,
      waterDays: relData.wellness_water_days || 0,
    },
    reflection: {
      insightsSurfaced: refData.total_insights || 0,
      insightsActedOn: refData.insights_acted_on || 0,
      reflectionsRead: refData.weeks || 0,
    },
  };
}

// === Compute a fresh score from raw counts ===
function computeScore(rawCounts) {
  const components = {
    memory: computeMemoryScore(rawCounts.memory),
    context: computeContextScore(rawCounts.context),
    learning: computeLearningScore(rawCounts.learning),
    relationships: computeRelationshipsScore(rawCounts.relationships),
    goals: computeGoalsScore(rawCounts.goals),
    wellness: computeWellnessScore(rawCounts.wellness),
    reflection: computeReflectionScore(rawCounts.reflection),
  };
  const overall = computeOverall(components);
  return { overall, components, level: getLevel(overall), nextLevel: getNextLevel(overall), computedAt: new Date().toISOString() };
}

// === HEALTH ===
app.get('/health', (req, res) => send(res, 200, { status: 'healthy', service: 'pi-score', port: PORT }));
app.get('/ready', (req, res) => send(res, 200, { ready: true }));

// === LEVELS LIST ===
app.get('/api/pi-score/levels', (req, res) => send(res, 200, { levels: LEVELS }));

// === CURRENT SCORE (cached if < 1 hour old) ===
app.get('/api/pi-score/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const cached = cachedScores.get(userId);
  if (cached && Date.now() - new Date(cached.computedAt).getTime() < 3600000) {
    return send(res, 200, { ...cached, cached: true });
  }
  // Recompute
  const raw = await gatherRawCounts(userId);
  const score = computeScore(raw);
  const previous = scoreHistory.get(`${userId}:${score.computedAt.slice(0, 10)}`) || scoreHistory.get(userId);
  const delta = computeDelta(score, previous);
  const result = { userId, ...score, delta };
  cachedScores.set(userId, result);
  return send(res, 200, { ...result, cached: false });
});

// === FORCE RECOMPUTE ===
app.post('/api/pi-score/:userId/compute', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const raw = await gatherRawCounts(userId);
  const score = computeScore(raw);
  const today = score.computedAt.slice(0, 10);
  const previous = scoreHistory.get(`${userId}:${today}`);
  const delta = computeDelta(score, previous);
  const result = { userId, ...score, delta };
  cachedScores.set(userId, result);
  scoreHistory.set(`${userId}:${today}`, result);
  return send(res, 200, result);
});

// === HISTORY (last 30 days) ===
app.get('/api/pi-score/:userId/history', requireAuth, (req, res) => {
  const { userId } = req.params;
  const items = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${userId}:${d.toISOString().slice(0, 10)}`;
    const r = scoreHistory.get(key);
    if (r) items.push({ date: d.toISOString().slice(0, 10), overall: r.overall, components: r.components, level: r.level });
  }
  send(res, 200, { userId, days: items.length, history: items });
});

// === WIDGET FORMAT (mobile/web card) ===
app.get('/api/pi-score/:userId/widget', requireAuth, async (req, res) => {
  const { userId } = req.params;
  let score = cachedScores.get(userId);
  if (!score || Date.now() - new Date(score.computedAt).getTime() > 3600000) {
    const raw = await gatherRawCounts(userId);
    const fresh = computeScore(raw);
    score = { userId, ...fresh };
    cachedScores.set(userId, score);
  }
  // Format for widget
  const widget = {
    userId,
    title: 'Your Genie',
    overall: score.overall,
    level: score.level,
    levelName: score.level?.name,
    levelEmoji: score.level?.emoji,
    nextLevel: score.nextLevel ? {
      name: score.nextLevel.name,
      pointsToNext: score.nextLevel.minScore - score.overall,
    } : null,
    components: Object.entries(score.components || {}).map(([key, value]) => ({
      key,
      value,
      label: key.charAt(0).toUpperCase() + key.slice(1),
    })),
    progressToNext: score.nextLevel
      ? Math.round((score.overall - score.level.minScore) / (score.nextLevel.minScore - score.level.minScore) * 100)
      : 100,
  };
  send(res, 200, widget);
});

// === LOG FEEDBACK (learning/learning events) ===
app.post('/api/pi-score/feedback', requireAuth, (req, res) => {
  const { userId, feedback, context = {} } = req.body;
  if (!userId || !feedback) return sendErr(res, 400, 'VALIDATION', 'userId and feedback required');
  if (!['useful', 'obvious', 'wrong', 'loved', 'accepted_correction'].includes(feedback)) {
    return sendErr(res, 400, 'VALIDATION', 'invalid feedback type');
  }
  const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  feedbackEvents.set(id, { userId, feedback, context, timestamp: new Date().toISOString() });
  // Invalidate cache so the next score reflects the new feedback
  cachedScores.delete(userId);
  send(res, 200, { id, userId, feedback });
});

requireEnv(['PORT'], { allowDev: true });
const server = app.listen(PORT, () => log.info(`pi-score listening on :${PORT}`));
installGracefulShutdown(server, 'pi-score');
export default app;
