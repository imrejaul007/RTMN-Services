/**
 * Reflection Engine
 *
 * Port: 4796
 *
 * Weekly digest service. Generates a "what happened this week" reflection
 * that helps the user see patterns they couldn't see day-to-day.
 *
 * How it works:
 *   1. Pull last 7 days of activity from memory-substrate
 *   2. Aggregate by intent/category (conversations, goals, relationships, etc.)
 *   3. Ask the LLM to find patterns and write 3-5 insights
 *   4. Generate 2-3 questions for the user to reflect on
 *   5. Save the reflection; user can retrieve it via morning-briefing-v2 or directly
 *
 * Why this matters:
 *   - Day-to-day, the user is too close to see patterns.
 *   - A weekly digest is the difference between "Genie is a tool I use"
 *     and "Genie is helping me be a better version of myself".
 *   - It's also the seed for the Personal Intelligence Score (Phase 3) —
 *     the "Reflection" sub-score is computed from how often the user
 *     engages with these digests.
 *
 * Triggers (who calls this):
 *   - Cron job (Sunday 8pm user-local) — automated weekly digest
 *   - User explicitly asks "how was my week?"
 *   - Morning-briefing-v2 on Sunday morning shows yesterday's reflection
 *
 * Routes:
 *   POST /api/reflection/weekly     — generate this week's reflection
 *   GET  /api/reflection/:userId    — get latest reflection
 *   GET  /api/reflection/:userId/history — last 12 weeks
 *   POST /api/reflection/insight    — log user feedback on an insight ("useful", "obvious", "wrong")
 *   GET  /health
 *   GET  /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'node:crypto';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';
import { createLLMClient, withStructuredOutput } from '@rtmn/shared/lib/llm';

const PORT = parseInt(process.env.PORT || '4796', 10);
const MEMORY_SUBSTRATE_URL = process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791';
const INTENT_ENGINE_URL = process.env.INTENT_ENGINE_URL || 'http://localhost:4792';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

const log = createLogger('reflection-engine');

const reflections = new PersistentMap('reflections', { serviceName: 'reflection-engine' });
const insightFeedback = new PersistentMap('insight-feedback', { serviceName: 'reflection-engine' });

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// === Helper: pull activity from memory-substrate ===
async function getActivity(userId, days = 7) {
  // memory-substrate's audit log isn't directly queryable by date,
  // so we ask for the user's context (recent memories) and the
  // twin for goals/wellness/relationship state.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(
      `${MEMORY_SUBSTRATE_URL}/api/health-summary/${userId}`,
      { headers: { 'x-internal-token': INTERNAL_TOKEN }, signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!res.ok) return { memories_count: 0, relationships_count: 0, by_intent: {} };
    const data = await res.json();
    return data?.data || {};
  } catch (e) {
    log.warn('memory-substrate unavailable, using empty activity', { error: e.message });
    return { memories_count: 0, relationships_count: 0, by_intent: {} };
  }
}

// === Helper: get recent context for richer insights ===
async function getRecentContext(userId, days = 7) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(
      `${MEMORY_SUBSTRATE_URL}/api/context/${userId}?query=this%20week&limit=30`,
      { headers: { 'x-internal-token': INTERNAL_TOKEN }, signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.facts || data?.data?.memories || data?.data?.items || [];
  } catch (e) {
    return [];
  }
}

// === HEALTH ===
app.get('/health', (req, res) => send(res, 200, {
  status: 'healthy',
  service: 'reflection-engine',
  port: PORT,
  version: '1.0.0',
}));
app.get('/ready', (req, res) => send(res, 200, { ready: true }));

// === GENERATE WEEKLY REFLECTION ===
app.post('/api/reflection/weekly', requireAuth, async (req, res) => {
  const { userId, days = 7 } = req.body;
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId is required');

  const weekOf = new Date().toISOString().slice(0, 10);
  const reflectionId = `ref_${crypto.randomBytes(6).toString('hex')}`;

  // 1. Pull activity
  const [activity, recentMemories] = await Promise.all([
    getActivity(userId, days),
    getRecentContext(userId, days),
  ]);

  // 2. Compute stats from what we have
  const stats = {
    windowDays: days,
    memoriesCount: activity.memories_count || recentMemories.length || 0,
    relationshipsTracked: activity.relationships_count || 0,
    byIntent: activity.by_intent || {},
    factsSampled: recentMemories.slice(0, 20),
  };

  // 3. Generate insights via LLM
  let insights = [];
  let questions = [];
  let focus = 'Balance';
  let summary = '';

  try {
    const llm = createLLMClient({ provider: process.env.LLM_PROVIDER || 'anthropic' });

    const reflectionSchema = {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '1-2 sentence warm summary of the week' },
        insights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The insight (1-2 sentences)' },
              category: {
                type: 'string',
                enum: ['patterns', 'wins', 'struggles', 'relationships', 'goals', 'wellness', 'time', 'money'],
              },
              evidence: { type: 'string', description: 'What data point this insight is based on' },
            },
            required: ['text', 'category'],
          },
        },
        questions: {
          type: 'array',
          items: { type: 'string' },
          description: '2-3 reflective questions for the user',
        },
        nextWeekFocus: {
          type: 'string',
          description: '1-2 word focus for next week (e.g. "Relationships", "Recovery", "Shipping")',
        },
      },
      required: ['summary', 'insights', 'questions', 'nextWeekFocus'],
    };

    const result = await withStructuredOutput(llm, reflectionSchema, {
      messages: [
        {
          role: 'system',
          content: `You are the reflection layer for a personal AI called Genie. Given the user's activity from the past week, generate a warm, honest, and useful weekly digest.

Style guide:
- Be specific. Reference actual data points, not generic platitudes.
- Be honest. If the user struggled with something, say so. If they crushed it, celebrate.
- Use their own words when possible. The facts sampled below may include their language.
- 3-5 insights. Each tied to a category and a piece of evidence.
- 2-3 questions that help them reflect (not advice — open questions).
- Keep the summary under 30 words.
- nextWeekFocus is 1-2 words.
- If there's very little data (e.g. new user), acknowledge it warmly and suggest what to track next week.`,
        },
        {
          role: 'user',
          content: `User: ${userId}
Week of: ${weekOf}
Activity: ${JSON.stringify(stats, null, 2).slice(0, 3000)}

Generate this week's reflection.`,
        },
      ],
    });

    insights = result.insights || [];
    questions = result.questions || [];
    focus = result.nextWeekFocus || 'Balance';
    summary = result.summary || '';
  } catch (e) {
    // LLM unavailable — generate a templated reflection
    log.warn('LLM unavailable, using templated reflection', { error: e.message });
    summary = `This week you had ${stats.memoriesCount} new memories tracked.`;
    insights = [{
      text: `You engaged with Genie ${stats.memoriesCount} times this week. That's a solid habit forming.`,
      category: 'patterns',
      evidence: `${stats.memoriesCount} memories logged`,
    }];
    questions = [
      "What's one thing from this week you want to remember?",
      "Is there anything you want to do differently next week?",
    ];
    focus = 'Consistency';
  }

  // 4. Save
  const reflection = {
    id: reflectionId,
    userId,
    weekOf,
    generatedAt: new Date().toISOString(),
    stats,
    summary,
    insights,
    questions,
    nextWeekFocus: focus,
  };
  reflections.set(`${userId}:${weekOf}`, reflection);

  log.info(`reflection generated: ${reflectionId}`, { userId, insights: insights.length });

  send(res, 200, reflection);
});

// === GET LATEST REFLECTION ===
app.get('/api/reflection/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  // Look up most recent
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${userId}:${d.toISOString().slice(0, 10)}`;
    const r = reflections.get(key);
    if (r) return send(res, 200, r);
  }
  return sendErr(res, 404, 'NOT_FOUND', 'No reflection found in the last 14 days');
});

// === GET HISTORY (last 12 weeks) ===
app.get('/api/reflection/:userId/history', requireAuth, (req, res) => {
  const { userId } = req.params;
  const items = [];
  const today = new Date();
  for (let i = 0; i < 84; i += 7) {  // 12 weeks, stepping weekly
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${userId}:${d.toISOString().slice(0, 10)}`;
    const r = reflections.get(key);
    if (r) {
      items.push({
        weekOf: r.weekOf,
        summary: r.summary,
        nextWeekFocus: r.nextWeekFocus,
        insightCount: r.insights.length,
        generatedAt: r.generatedAt,
      });
    }
  }
  send(res, 200, { userId, weeks: items.length, reflections: items });
});

// === LOG FEEDBACK ON AN INSIGHT ===
app.post('/api/reflection/insight', requireAuth, (req, res) => {
  const { userId, reflectionId, insightIndex, feedback } = req.body;
  if (!userId || !reflectionId || insightIndex === undefined || !feedback) {
    return sendErr(res, 400, 'VALIDATION', 'userId, reflectionId, insightIndex, feedback required');
  }
  if (!['useful', 'obvious', 'wrong', 'loved'].includes(feedback)) {
    return sendErr(res, 400, 'VALIDATION', 'feedback must be one of: useful, obvious, wrong, loved');
  }
  const id = `${userId}:${reflectionId}:${insightIndex}`;
  insightFeedback.set(id, { userId, reflectionId, insightIndex, feedback, timestamp: new Date().toISOString() });
  send(res, 200, { id, feedback });
});

requireEnv(['PORT'], { allowDev: true });

const server = app.listen(PORT, () => {
  log.info(`reflection-engine listening on :${PORT}`);
});

installGracefulShutdown(server, 'reflection-engine');

export default app;
