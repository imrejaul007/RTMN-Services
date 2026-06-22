/**
 * Health Connector Service
 *
 * Port: 4803
 *
 * Phase 5.1 of Personal Intelligence OS. Bridges Apple Health, Google Fit,
 * Whoop, Oura, and manual entries into the Genie brain. **Opt-in by default.**
 *
 * Storage: PersistentMap. Per-user namespace.
 *
 * Routes:
 *   POST   /api/health/:userId/reading              — record one reading
 *   POST   /api/health/:userId/readings             — batch record
 *   GET    /api/health/:userId/readings             — list (filterable)
 *   GET    /api/health/:userId/summary              — today's daily summary
 *   GET    /api/health/:userId/trend                — N-day trend
 *   GET    /api/health/:userId/correlations         — mood↔body correlations
 *   GET    /api/health/:userId/nudges               — predictive nudges
 *   GET    /api/health/:userId/preferences          — opt-in registry
 *   PUT    /api/health/:userId/preferences          — toggle sources
 *   DELETE /api/health/:userId                      — full disconnect
 *   GET    /api/health/sources                      — list supported sources
 *   GET    /health
 *   GET    /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import {
  requireAuth,
} from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';
import {
  SOURCES,
  SOURCE_LIST,
  SOURCE_METRICS,
  normalizeReading,
  dailySummary,
  weeklyTrend,
  findCorrelations,
  nudgeForSleepDebt,
  nudgeForWorkoutGoal,
  defaultPrefs,
  setSourceEnabled,
  isSourceEnabled,
} from '../lib/health.js';

const PORT = parseInt(process.env.PORT || '4803', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const log = createLogger('health-connector');

const readings = new PersistentMap('health-readings', { serviceName: 'health-connector' });
const preferences = new PersistentMap('health-preferences', { serviceName: 'health-connector' });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) =>
  res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) =>
  res.status(s).json({
    success: false,
    error: { code, message: msg },
    meta: { timestamp: new Date().toISOString() },
  });

// ---------- helpers ----------

function readingKey(userId, readingId) {
  return `${userId}:${readingId}`;
}

function getOrCreatePrefs(userId) {
  let p = preferences.get(userId);
  if (!p) {
    p = defaultPrefs();
    preferences.set(userId, p);
  }
  return p;
}

function listUserReadings(userId) {
  const list = [];
  for (const [, v] of readings) {
    if (v && v.userId === userId) list.push(v);
  }
  return list.sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));
}

function requireInternal(req, res, next) {
  if (INTERNAL_TOKEN && req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return sendErr(res, 401, 'unauthorized', 'Internal token required');
  }
  next();
}

// ---------- routes ----------

app.get('/health', (_req, res) => send(res, 200, { status: 'healthy', service: 'health-connector' }));
app.get('/ready', (_req, res) => send(res, 200, { status: 'ready', service: 'health-connector' }));

// Public catalog of supported sources
app.get('/api/health/sources', requireInternal, (_req, res) =>
  send(res, 200, { sources: SOURCE_LIST, metrics: SOURCE_METRICS })
);

// Preferences (opt-in registry)
app.get('/api/health/:userId/preferences', requireAuth, (req, res) => {
  const prefs = getOrCreatePrefs(req.params.userId);
  send(res, 200, prefs);
});

app.put('/api/health/:userId/preferences', requireAuth, (req, res) => {
  try {
    const { enabledSources, writeEnabled, digestHourUtc } = req.body || {};
    let next = getOrCreatePrefs(req.params.userId);
    if (Array.isArray(enabledSources)) {
      for (const s of enabledSources) {
        if (!SOURCE_LIST.includes(s)) {
          return sendErr(res, 400, 'invalid_source', `Unknown source: ${s}`);
        }
        next = setSourceEnabled(next, s, true);
      }
      for (const s of SOURCE_LIST) {
        if (!enabledSources.includes(s)) next = setSourceEnabled(next, s, false);
      }
    }
    if (writeEnabled && typeof writeEnabled === 'object') {
      next = { ...next, writeEnabled: { ...next.writeEnabled, ...writeEnabled } };
    }
    if (typeof digestHourUtc === 'number' && digestHourUtc >= 0 && digestHourUtc < 24) {
      next = { ...next, digestHourUtc };
    }
    preferences.set(req.params.userId, next);
    send(res, 200, next);
  } catch (e) {
    sendErr(res, 400, 'update_failed', e.message);
  }
});

// Single reading
app.post('/api/health/:userId/reading', requireAuth, (req, res) => {
  try {
    const normalized = normalizeReading(req.body || {});
    const prefs = getOrCreatePrefs(req.params.userId);
    if (!isSourceEnabled(prefs, normalized.source)) {
      return sendErr(
        res,
        403,
        'source_disabled',
        `Source ${normalized.source} is not enabled. Update preferences first.`
      );
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const reading = { id, userId: req.params.userId, ...normalized };
    readings.set(readingKey(req.params.userId, id), reading);
    send(res, 201, reading);
  } catch (e) {
    sendErr(res, 400, 'invalid_reading', e.message);
  }
});

// Batch readings
app.post('/api/health/:userId/readings', requireAuth, (req, res) => {
  const list = Array.isArray(req.body?.readings) ? req.body.readings : null;
  if (!list) return sendErr(res, 400, 'invalid_body', 'Body must include readings: []');
  const prefs = getOrCreatePrefs(req.params.userId);
  const stored = [];
  const errors = [];
  for (let i = 0; i < list.length; i++) {
    try {
      const normalized = normalizeReading(list[i]);
      if (!isSourceEnabled(prefs, normalized.source)) {
        errors.push({ index: i, error: `source_disabled:${normalized.source}` });
        continue;
      }
      const id = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      const reading = { id, userId: req.params.userId, ...normalized };
      readings.set(readingKey(req.params.userId, id), reading);
      stored.push(reading);
    } catch (e) {
      errors.push({ index: i, error: e.message });
    }
  }
  send(res, 201, { stored: stored.length, errors, readings: stored });
});

// List readings (filterable)
app.get('/api/health/:userId/readings', requireAuth, (req, res) => {
  let list = listUserReadings(req.params.userId);
  const { source, metric, since, until, limit } = req.query;
  if (source) list = list.filter((r) => r.source === source);
  if (metric) list = list.filter((r) => r.metric === metric);
  if (since) list = list.filter((r) => r.takenAt >= since);
  if (until) list = list.filter((r) => r.takenAt <= until);
  const cap = Math.min(parseInt(limit || '100', 10) || 100, 500);
  send(res, 200, { count: list.length, readings: list.slice(0, cap) });
});

// Daily summary for today (or ?date=YYYY-MM-DD)
app.get('/api/health/:userId/summary', requireAuth, (req, res) => {
  const list = listUserReadings(req.params.userId);
  const dateStr = req.query.date || undefined;
  send(res, 200, dailySummary(list, dateStr));
});

// N-day trend
app.get('/api/health/:userId/trend', requireAuth, (req, res) => {
  const list = listUserReadings(req.params.userId);
  const days = Math.min(parseInt(req.query.days || '7', 10) || 7, 90);
  send(res, 200, { days, trend: weeklyTrend(list, days) });
});

// Correlations (mood↔body)
app.get('/api/health/:userId/correlations', requireAuth, (req, res) => {
  const list = listUserReadings(req.params.userId);
  const days = Math.min(parseInt(req.query.days || '14', 10) || 14, 60);
  send(res, 200, { days, correlations: findCorrelations(list, days) });
});

// Predictive nudges
app.get('/api/health/:userId/nudges', requireAuth, (req, res) => {
  const list = listUserReadings(req.params.userId);
  const days = Math.min(parseInt(req.query.days || '7', 10) || 7, 30);
  const trend = weeklyTrend(list, days);
  const nudges = [];
  const sleepNudge = nudgeForSleepDebt(trend);
  if (sleepNudge) nudges.push(sleepNudge);
  const workoutNudge = nudgeForWorkoutGoal(trend);
  if (workoutNudge) nudges.push(workoutNudge);
  send(res, 200, { days, nudges });
});

// Full disconnect — DELETE everything for a user
app.delete('/api/health/:userId', requireAuth, (req, res) => {
  let deleted = 0;
  for (const [k, v] of readings) {
    if (v && v.userId === req.params.userId) {
      readings.delete(k);
      deleted += 1;
    }
  }
  preferences.delete(req.params.userId);
  send(res, 200, { disconnected: true, readingsDeleted: deleted });
});

// ---------- startup ----------

requireEnv(['INTERNAL_SERVICE_TOKEN'], { soft: true }); // optional in dev
installGracefulShutdown({ server: app, log });

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => log.info(`health-connector listening on :${PORT}`));
}

export default app;
