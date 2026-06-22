/**
 * Ambient Briefings Service
 *
 * Port: 4801
 *
 * Phase 4 — fills the gaps between the morning briefing (7am) and the next
 * morning. Generates mid-day, evening, weekend-prep, weekly-recap, and
 * monthly briefings.
 *
 * Why a separate service:
 *   - Different cadence (1pm, 7pm, Fri 6pm, Sun 8pm) than morning (7am)
 *   - Different content (recap vs plan-ahead)
 *   - Different tone (casual mid-day, reflective evening)
 *
 * Composition strategy:
 *   - Calls morning-briefing-v2's downstream services for live data
 *   - Composes its own message (different template per kind)
 *   - Reuses the LLM client for the personal note
 *   - Falls back to a structured template if LLM is unavailable
 *
 * Routes:
 *   POST /api/ambient/:kind            — generate a briefing of the given kind
 *   GET  /api/ambient/schedule         — what kinds fire today
 *   POST /api/ambient/preferences      — set quiet hours / disable kinds
 *   GET  /api/ambient/preferences/:userId
 *   GET  /api/ambient/history/:userId  — last 30 days
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
import { createLLMClient } from '@rtmn/shared/lib/llm';
import { kindFor, KINDS, describeKind, alreadySentToday, markSent, fallbackMessage } from '../lib/kinds.js';

const PORT = parseInt(process.env.PORT || '4801', 10);
const MORNING_BRIEFING_URL = process.env.MORNING_BRIEFING_URL || 'http://localhost:4794';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const log = createLogger('ambient-briefings');

// history: persistent; sentLog + prefs: persistent
const history   = new PersistentMap('ambient-briefings-history', { serviceName: 'ambient-briefings' });
const sentLog   = new PersistentMap('ambient-briefings-sent-log', { serviceName: 'ambient-briefings' });
const prefs     = new PersistentMap('ambient-briefings-prefs', { serviceName: 'ambient-briefings' });

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// ---------- helpers ----------

async function tryFetch(url, options = {}, timeoutMs = 3000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    log.warn(`downstream ${url} unavailable: ${e.message}`);
    return null;
  }
}

function internalHeaders(extra = {}) {
  return { 'content-type': 'application/json', 'x-internal-token': INTERNAL_TOKEN, ...extra };
}

function defaultPrefs(userId) {
  return {
    userId,
    enabled: true,
    kinds: {
      'mid-day':       true,
      'evening':       true,
      'weekend-prep':  true,
      'weekly-recap':  true,
      'monthly':       true,
    },
    quietHoursStart: 22, // 10pm
    quietHoursEnd:   7,  // 7am
    timezone: 'UTC',
  };
}

// ---------- routes ----------

app.get('/health', (req, res) => send(res, 200, { status: 'healthy', service: 'ambient-briefings', port: PORT }));

// SCHEDULE — what kinds fire today
app.get('/api/ambient/schedule', requireAuth, (req, res) => {
  const tz = req.query.tz || 'UTC';
  const now = new Date();
  // Use Intl to compute local hour + weekday
  let hour, weekday;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', weekday: 'short', hour12: false });
    const parts = fmt.formatToParts(now);
    hour = parseInt(parts.find((p) => p.type === 'hour').value, 10);
    const wd = parts.find((p) => p.type === 'weekday').value;
    weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(wd);
  } catch {
    hour = now.getUTCHours();
    weekday = now.getUTCDay();
  }
  const currentKind = kindFor(hour, weekday);
  // Build today's full schedule
  const today = [];
  for (const [name, meta] of Object.entries(KINDS)) {
    today.push({ kind: name, label: meta.label, icon: meta.icon });
  }
  send(res, 200, {
    timezone: tz,
    now: { hour, weekday, iso: now.toISOString() },
    currentKind,
    todaySchedule: today,
  });
});

// PREFERENCES — defined before the /:kind route so it isn't matched as a kind
app.get('/api/ambient/preferences/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const p = prefs.get(userId) || defaultPrefs(userId);
  send(res, 200, p);
});

app.post('/api/ambient/preferences', requireAuth, (req, res) => {
  const { userId, ...patch } = req.body || {};
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId required');
  const current = prefs.get(userId) || defaultPrefs(userId);
  const merged = {
    ...current,
    ...patch,
    userId, // never overwrite
    kinds: { ...(current.kinds || {}), ...(patch.kinds || {}) },
  };
  prefs.set(userId, merged);
  send(res, 200, merged);
});

// GENERATE — produce a briefing (must come AFTER /preferences so it's not
// matched as a kind)
app.post('/api/ambient/:kind', requireAuth, async (req, res) => {
  const { kind } = req.params;
  const { userId } = req.body || {};
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId required');
  if (!KINDS[kind]) return sendErr(res, 400, 'VALIDATION', `Unknown kind: ${kind}. Valid: ${Object.keys(KINDS).join(', ')}`);

  // Check user prefs
  const p = prefs.get(userId) || defaultPrefs(userId);
  if (!p.enabled || !p.kinds?.[kind]) {
    return sendErr(res, 403, 'DISABLED', `Briefing kind "${kind}" disabled for user`);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (alreadySentToday(sentLog, userId, kind, today)) {
    return sendErr(res, 409, 'ALREADY_SENT', `${kind} already sent today`);
  }

  // Fetch fresh data from morning-briefing-v2's downstream sources
  const [calendar, relationships, wellness, memoryCtx, goals, piScore] = await Promise.all([
    tryFetch(`${process.env.GENIE_CALENDAR_URL || 'http://localhost:4709'}/api/events/today?userId=${userId}`, { headers: internalHeaders() }),
    tryFetch(`${process.env.GENIE_RELATIONSHIP_URL || 'http://localhost:4747'}/api/relationships/due?userId=${userId}`, { headers: internalHeaders() }),
    tryFetch(`${process.env.GENIE_WELLNESS_URL || 'http://localhost:4723'}/api/wellness/today?userId=${userId}`, { headers: internalHeaders() }),
    tryFetch(`${process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791'}/api/context/${userId}?query=briefing&limit=10`, { headers: internalHeaders() }),
    tryFetch(`${process.env.GENIE_GOAL_URL || 'http://localhost:4763'}/api/goals/${userId}?status=active`, { headers: internalHeaders() }),
    tryFetch(`${process.env.PI_SCORE_URL || 'http://localhost:4798'}/api/pi-score/${userId}/widget`, { headers: internalHeaders() }),
  ]);

  const sections = {
    calendar: {
      available: !!calendar,
      events: calendar?.data?.events || calendar?.events || [],
      summary: `${(calendar?.data?.events || calendar?.events || []).length} events today`,
    },
    relationships: {
      available: !!relationships,
      dueOutreach: relationships?.data?.due || relationships?.due || [],
      summary: `${(relationships?.data?.due || relationships?.due || []).length} people to reach out to`,
    },
    wellness: {
      available: !!wellness,
      snapshot: wellness?.data || wellness || null,
      summary: wellness ? 'Wellness check-in available' : 'Wellness offline',
    },
    goals: {
      available: !!goals,
      active: goals?.data?.items || goals?.items || [],
      summary: `${(goals?.data?.items || goals?.items || []).length} active goals`,
    },
    memory: {
      available: !!memoryCtx,
      recentFacts: memoryCtx?.data?.facts || memoryCtx?.facts || [],
    },
    piScore: {
      available: !!piScore,
      widget: piScore?.data || null,
      summary: piScore?.data
        ? `${piScore.data.levelEmoji || ''} Genie is a ${piScore.data.levelName} (${piScore.data.overall}/100)`
        : 'PI Score offline',
    },
  };

  // Compose personal note via LLM (kind-specific tone)
  const meta = KINDS[kind];
  let personalNote = '';
  let message = '';
  try {
    const llm = createLLMClient({ provider: process.env.LLM_PROVIDER || 'anthropic' });
    const userName = sections.memory.recentFacts.find((f) => /name is|i am|i'm called/i.test(f.content))?.content || 'friend';
    const prompt = `${meta.promptHint.replace('{userName}', userName)}

Calendar: ${sections.calendar.summary}
Goals: ${sections.goals.summary}
Relationships: ${sections.relationships.summary}
${sections.piScore.available ? `PI Score: ${sections.piScore.summary}` : ''}

Tone: ${meta.tone}. Keep it 2-3 sentences. Don't be saccharine. Reference something specific if available.`;

    const result = await llm.complete({ messages: [{ role: 'user', content: prompt }], maxTokens: 200 });
    personalNote = result.text.trim();
  } catch (e) {
    log.warn(`LLM unavailable for ${kind}, using template`, { error: e.message });
    personalNote = fallbackMessage(kind, sections);
  }
  message = [
    `${meta.icon} ${meta.greeting}`,
    '',
    personalNote,
    '',
    `📅 ${sections.calendar.summary}`,
    `🎯 ${sections.goals.summary}`,
    `💌 ${sections.relationships.summary}`,
    sections.piScore.available ? `🌱 ${sections.piScore.summary}` : null,
  ].filter(Boolean).join('\n');

  // Persist + return
  const id = `amb_${crypto.randomBytes(6).toString('hex')}`;
  const briefing = {
    id,
    kind,
    label: meta.label,
    icon: meta.icon,
    userId,
    date: today,
    generatedAt: new Date().toISOString(),
    sections,
    personalNote,
    message,
  };
  history.set(`${userId}:${kind}:${today}`, briefing);
  markSent(sentLog, userId, kind, today);

  send(res, 200, briefing);
});

// HISTORY
app.get('/api/ambient/history/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const items = [];
  for (const [, v] of history) {
    if (v && v.userId === userId) items.push(v);
  }
  items.sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''));
  send(res, 200, { userId, count: items.length, briefings: items.slice(0, 30) });
});

// 404
app.use((req, res) => sendErr(res, 404, 'NOT_FOUND', `${req.method} ${req.path} not found`));

requireEnv(['PORT'], { allowDev: true });
const server = app.listen(PORT, () => log.info(`ambient-briefings listening on :${PORT}`));
installGracefulShutdown(server, 'ambient-briefings');
export default app;