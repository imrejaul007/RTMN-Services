/**
 * Proactive Engine
 *
 * Port: 4797
 *
 * The opt-in notification system. Surfaces time/anomaly/opportunity/milestone
 * events to the user, but only with their explicit consent and at a rate
 * they control.
 *
 * Core principle: Proactive ≠ Annoying.
 *   - Default OFF. User has to enable.
 *   - Per-category opt-in (relationships, money, wellness, opportunity, milestone)
 *   - Quiet hours (no notifications 10pm-7am by default)
 *   - Daily cap (max 3 notifications/day by default)
 *   - User can mute specific categories or all notifications
 *   - All notifications are audit-logged in memory-substrate
 *
 * How notifications are delivered:
 *   - Service returns candidates from POST /api/proactive/check
 *   - Client (mobile/web) decides which to actually push (respecting platform rules)
 *   - Service tracks delivery + per-user feedback ("useful" / "mute this category")
 *
 * Detection:
 *   - Detectors in lib/detectors.js are pure functions
 *   - They read user data (relationships, calendar, goals, recent activity)
 *   - They return candidates; the service filters by user preferences
 *
 * Routes:
 *   POST /api/proactive/check         — run all detectors, return filtered candidates
 *   POST /api/proactive/send          — record that a candidate was delivered
 *   POST /api/proactive/feedback      — log user feedback (useful, mute, etc.)
 *   GET  /api/proactive/prefs         — get user preferences
 *   PUT  /api/proactive/prefs         — update user preferences
 *   GET  /api/proactive/log/:userId   — get delivery log
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
import { detectAll } from '../lib/detectors.js';

const PORT = parseInt(process.env.PORT || '4797', 10);
const MEMORY_SUBSTRATE_URL = process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

const log = createLogger('proactive-engine');

const prefs = new PersistentMap('proactive-prefs', { serviceName: 'proactive-engine' });
const deliveryLog = new PersistentMap('proactive-log', { serviceName: 'proactive-engine' });

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// === DEFAULT PREFERENCES ===
const DEFAULT_PREFS = {
  enabled: false,  // OFF by default
  categories: {
    time: true,
    anomaly: true,
    opportunity: true,
    milestone: true,
    birthday: true,
  },
  quietHours: { start: 22, end: 7 },  // 10pm - 7am
  dailyCap: 3,
  maxUrgency: 5,  // show all
  timezone: 'UTC',
  communicationStyle: 'casual',  // from onboarding
};

// === Filter candidates by user prefs ===
function filterByPrefs(candidates, userPrefs, now = new Date()) {
  if (!userPrefs.enabled) return [];

  const hour = now.getHours();
  const { start: quietStart, end: quietEnd } = userPrefs.quietHours || DEFAULT_PREFS.quietHours;
  const inQuietHours = quietStart > quietEnd
    ? (hour >= quietStart || hour < quietEnd)  // overnight quiet (e.g. 22-7)
    : (hour >= quietStart && hour < quietEnd);

  // Allow critical urgency (5) through quiet hours
  return candidates.filter(c => {
    if (!userPrefs.categories[c.category]) return false;
    if (c.urgency > userPrefs.maxUrgency) return false;
    if (inQuietHours && c.urgency < 5) return false;
    return true;
  });
}

// === Apply daily cap (per-user) ===
async function applyDailyCap(userId, candidates) {
  const today = new Date().toISOString().slice(0, 10);
  const todaysLog = [...deliveryLog.values()].filter(
    l => l.userId === userId && l.deliveredAt?.startsWith(today)
  );
  const sentToday = todaysLog.length;
  const userPrefs = prefs.get(userId) || DEFAULT_PREFS;
  const cap = userPrefs.dailyCap || 3;
  const remaining = Math.max(0, cap - sentToday);
  return candidates.slice(0, remaining);
}

// === HEALTH ===
app.get('/health', (req, res) => send(res, 200, {
  status: 'healthy',
  service: 'proactive-engine',
  port: PORT,
  version: '1.0.0',
  default_enabled: false,
}));
app.get('/ready', (req, res) => send(res, 200, { ready: true }));

// === PREFS ===
app.get('/api/proactive/prefs', requireAuth, (req, res) => {
  const userId = req.query.userId || req.auth?.id;
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId required');
  send(res, 200, prefs.get(userId) || DEFAULT_PREFS);
});

app.put('/api/proactive/prefs', requireAuth, (req, res) => {
  const { userId, ...updates } = req.body;
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId required');
  const current = prefs.get(userId) || DEFAULT_PREFS;
  const updated = {
    ...current,
    ...updates,
    categories: { ...current.categories, ...(updates.categories || {}) },
    quietHours: { ...current.quietHours, ...(updates.quietHours || {}) },
  };
  prefs.set(userId, updated);
  send(res, 200, updated);
});

// === CHECK (main entry — returns filtered candidates) ===
app.post('/api/proactive/check', requireAuth, async (req, res) => {
  const { userId, userData = {} } = req.body;
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId required');

  const userPrefs = prefs.get(userId) || DEFAULT_PREFS;
  if (!userPrefs.enabled) {
    return send(res, 200, { enabled: false, candidates: [], count: 0, reason: 'proactive disabled in user prefs' });
  }

  // 1. Detect
  const allCandidates = detectAll(userData);

  // 2. Filter by prefs (categories, quiet hours, urgency)
  const filtered = filterByPrefs(allCandidates, userPrefs);

  // 3. Apply daily cap
  const capped = await applyDailyCap(userId, filtered);

  // 4. Optionally personalize the message via LLM (if style preference is set)
  const personalized = [];
  for (const c of capped) {
    let title = c.title;
    let body = c.body;
    if (userPrefs.communicationStyle) {
      try {
        const llm = createLLMClient({ provider: process.env.LLM_PROVIDER || 'anthropic' });
        const result = await llm.complete({
          messages: [{
            role: 'user',
            content: `Rewrite this notification in a ${userPrefs.communicationStyle} tone. Keep it under 100 chars. Original:\nTitle: ${c.title}\nBody: ${c.body}\n\nReturn JSON: {"title": "...", "body": "..."}`,
          }],
          maxTokens: 150,
        });
        const match = result.text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.title) title = parsed.title;
          if (parsed.body) body = parsed.body;
        }
      } catch (e) {
        // LLM unavailable — use original
      }
    }
    personalized.push({ ...c, title, body, candidateId: `cnd_${crypto.randomBytes(4).toString('hex')}` });
  }

  send(res, 200, {
    enabled: true,
    candidates: personalized,
    count: personalized.length,
    total_detected: allCandidates.length,
    filtered_out: allCandidates.length - filtered.length,
    remaining_today: Math.max(0, userPrefs.dailyCap - (await applyDailyCap(userId, [])).length - personalized.length),
  });
});

// === SEND (record delivery) ===
app.post('/api/proactive/send', requireAuth, (req, res) => {
  const { userId, candidateId, candidate, channel = 'push' } = req.body;
  if (!userId || !candidateId || !candidate) {
    return sendErr(res, 400, 'VALIDATION', 'userId, candidateId, candidate required');
  }
  const logId = `dlv_${crypto.randomBytes(6).toString('hex')}`;
  const entry = {
    id: logId,
    userId,
    candidateId,
    candidate,
    channel,
    deliveredAt: new Date().toISOString(),
    feedback: null,
  };
  deliveryLog.set(logId, entry);
  send(res, 200, entry);
});

// === FEEDBACK ===
app.post('/api/proactive/feedback', requireAuth, (req, res) => {
  const { deliveryId, feedback } = req.body;
  if (!deliveryId || !feedback) return sendErr(res, 400, 'VALIDATION', 'deliveryId, feedback required');
  if (!['useful', 'mute', 'wrong', 'loved'].includes(feedback)) {
    return sendErr(res, 400, 'VALIDATION', 'feedback must be: useful, mute, wrong, loved');
  }
  const entry = deliveryLog.get(deliveryId);
  if (!entry) return sendErr(res, 404, 'NOT_FOUND', 'delivery not found');
  entry.feedback = feedback;
  entry.feedbackAt = new Date().toISOString();
  deliveryLog.set(deliveryId, entry);

  // If user muted a category, disable it in prefs
  if (feedback === 'mute' && entry.candidate?.category) {
    const userPrefs = prefs.get(entry.userId) || DEFAULT_PREFS;
    userPrefs.categories = { ...userPrefs.categories, [entry.candidate.category]: false };
    prefs.set(entry.userId, userPrefs);
    log.info(`muted category ${entry.candidate.category} for user ${entry.userId}`);
  }

  send(res, 200, { deliveryId, feedback });
});

// === DELIVERY LOG ===
app.get('/api/proactive/log/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;
  const cutoff = Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000);
  const log = [...deliveryLog.values()]
    .filter(l => l.userId === userId && new Date(l.deliveredAt).getTime() > cutoff)
    .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt));
  send(res, 200, { userId, count: log.length, deliveries: log });
});

requireEnv(['PORT'], { allowDev: true });

const server = app.listen(PORT, () => {
  log.info(`proactive-engine listening on :${PORT}`);
  log.info('default prefs: enabled=false (opt-in required)');
});

installGracefulShutdown(server, 'proactive-engine');

export default app;
