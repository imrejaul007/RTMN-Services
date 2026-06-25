/**
 * Genie Listening Modes Service
 * Manages Manual, Continuous, Passive, Smart modes
 * Port: 4768
 *
 * Endpoints:
 *   GET  /health                    - health
 *   GET  /api/modes                 - list all 4 listening modes with config
 *   GET  /api/modes/:mode           - get mode details
 *   GET  /api/current               - get current mode for a device/user
 *   POST /api/switch                - switch mode
 *   GET  /api/history               - mode change history
 *   POST /api/config                - update mode config (sensitivity, timeout, etc)
 *   GET  /api/config/:mode          - get mode config
 *   GET  /api/stats                 - per-mode usage statistics
 *   POST /api/auto                  - smart auto-switch based on context
 *
 * Phase 7+ device-integration hook:
 *   POST /api/integration/device-integration   - register webhook target
 *   GET  /api/integration/device-integration   - list registered webhooks
 *   DELETE /api/integration/device-integration  - clear all webhooks
 *
 *   When /api/switch or /api/auto changes a device's mode, we POST to each
 *   registered device-integration webhook so it can start/stop the wake-word
 *   session for that device:
 *     continuous + smart → start wake session (genieForward=true)
 *     manual + passive   → stop wake session
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// === device-integration hook (Phase 7+) ===
// When a mode switches, fan out the event to registered webhooks so the
// device-integration layer can start/stop wake-word sessions.
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const USE_DEVICE_INTEGRATION_HOOK = process.env.USE_DEVICE_INTEGRATION_HOOK !== 'false';
const DEVICE_HOOK_TIMEOUT_MS = parseInt(process.env.DEVICE_HOOK_TIMEOUT_MS || '3000', 10);

// Webhook registry: stored in memory (no persistence needed across restarts;
// device-integration re-registers on boot).
const deviceHooks = [];

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4768;
const SERVICE_NAME = 'genie-listening-modes';
const SERVICE_VERSION = '1.0.0';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

const MODES = {
  manual: {
    name: 'Manual',
    description: 'Tap-to-talk, lowest battery, full user control',
    battery: 'none',
    triggers: ['tap', 'button', 'gesture'],
    defaultTimeout: 0,
    privacy: 'high',
  },
  continuous: {
    name: 'Continuous',
    description: 'Always listening with wake-word detection',
    battery: 'high',
    triggers: ['wake-word', 'voice'],
    defaultTimeout: 0,
    privacy: 'medium',
  },
  passive: {
    name: 'Passive',
    description: 'Ambient context awareness, no proactive engagement',
    battery: 'low',
    triggers: ['environment', 'noise', 'motion'],
    defaultTimeout: 300,
    privacy: 'high',
  },
  smart: {
    name: 'Smart',
    description: 'Adaptive mode - switches based on context',
    battery: 'medium',
    triggers: ['context', 'time', 'location', 'activity'],
    defaultTimeout: 60,
    privacy: 'medium',
  },
};

const currentModes = new PersistentMap('current-modes', { serviceName: 'genie-listening-modes' });
const history = [];
const modeConfig = new PersistentMap('mode-config', { serviceName: 'genie-listening-modes' });
const webhookLog = new PersistentMap('webhook-log', { serviceName: 'genie-listening-modes' });

function seed() {
  ['user-001', 'user-002', 'user-003', 'user-004', 'user-005'].forEach(uid => {
    currentModes.set(uid, 'smart');
    history.push({
      id: uuidv4(),
      deviceId: uid,
      fromMode: 'manual',
      toMode: 'smart',
      reason: 'seed',
      timestamp: '2026-06-15T08:00:00Z',
    });
  });
  Object.keys(MODES).forEach(m => {
    modeConfig.set(m, { ...MODES[m] });
  });
}
seed();

function recordHistory(deviceId, fromMode, toMode, reason) {
  const entry = {
    id: uuidv4(),
    deviceId,
    fromMode,
    toMode,
    reason: reason || 'manual',
    timestamp: new Date().toISOString(),
  };
  history.push(entry);
  return entry;
}

// Decide which wake-word session state a mode implies.
//   continuous + smart → "start" (wake-word detection is desired)
//   manual + passive   → "stop"  (no wake-word detection; push-to-talk or ambient only)
function actionForMode(mode) {
  return (mode === 'continuous' || mode === 'smart') ? 'start' : 'stop';
}

// Fire-and-forget POST to each registered device-integration webhook.
async function fanoutModeChange(deviceId, fromMode, toMode, reason) {
  if (!USE_DEVICE_INTEGRATION_HOOK) return;
  if (!INTERNAL_TOKEN) return;
  const action = actionForMode(toMode);
  const payload = {
    deviceId,
    fromMode,
    toMode,
    reason,
    action,
    timestamp: new Date().toISOString(),
  };
  await Promise.allSettled(deviceHooks.map(async (hook) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), DEVICE_HOOK_TIMEOUT_MS);
      const r = await fetch(`${hook.url}/api/devices/${encodeURIComponent(deviceId)}/mode`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(tid);
      hook.lastStatus = r.status;
      hook.lastDeliveredAt = new Date().toISOString();
      hook.deliveries = (hook.deliveries || 0) + 1;
    } catch (e) {
      hook.lastError = e.message;
      hook.errors = (hook.errors || 0) + 1;
    }
  }));
}

function smartSuggest(context) {
  if (!context) return 'manual';
  const { time, location, activity, battery } = context;
  if (battery && battery < 20) return 'passive';
  if (activity === 'driving' || activity === 'walking') return 'continuous';
  if (activity === 'meeting' || activity === 'sleeping') return 'passive';
  if (location === 'home' && (time === 'evening' || time === 'night')) return 'passive';
  if (location === 'office' && time === 'work') return 'manual';
  return 'smart';
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    counts: {
      modes: Object.keys(MODES).length,
      devices: currentModes.size,
      history: history.length,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/modes', (req, res) => {
  res.json({ modes: MODES, total: Object.keys(MODES).length });
});

app.get('/api/modes/:mode', (req, res) => {
  const m = MODES[req.params.mode];
  if (!m) return res.status(404).json({ error: 'Mode not found', available: Object.keys(MODES) });
  res.json({ mode: req.params.mode, ...m });
});

app.get('/api/current', (req, res) => {
  const deviceId = req.query.deviceId || 'default';
  const mode = currentModes.get(deviceId) || 'manual';
  res.json({ deviceId, mode, config: modeConfig.get(mode) });
});

app.post('/api/switch',requireAuth,  (req, res) => {
  const { deviceId, mode, reason } = req.body;
  if (!mode) return res.status(400).json({ error: 'mode required' });
  if (!MODES[mode]) return res.status(400).json({ error: 'Invalid mode', available: Object.keys(MODES) });
  const did = deviceId || 'default';
  const from = currentModes.get(did) || 'manual';
  currentModes.set(did, mode);
  const h = recordHistory(did, from, mode, reason || 'manual');
  // Fire device-integration webhook (non-blocking — don't make the switch wait)
  fanoutModeChange(did, from, mode, reason || 'manual').catch(e => console.warn('[listening-modes] fanout error:', e.message));
  res.json({
    deviceId: did,
    mode,
    previousMode: from,
    action: actionForMode(mode),
    history: h,
  });
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const deviceId = req.query.deviceId;
  let filtered = history;
  if (deviceId) filtered = filtered.filter(h => h.deviceId === deviceId);
  res.json({ history: filtered.slice(-limit).reverse(), total: filtered.length });
});

app.post('/api/config',requireAuth,  (req, res) => {
  const { mode, ...updates } = req.body;
  if (!mode || !MODES[mode]) return res.status(400).json({ error: 'valid mode required' });
  const cfg = modeConfig.get(mode) || { ...MODES[mode] };
  const updated = { ...cfg, ...updates };
  modeConfig.set(mode, updated);
  res.json({ mode, config: updated });
});

app.get('/api/config/:mode', (req, res) => {
  const cfg = modeConfig.get(req.params.mode);
  if (!cfg) return res.status(404).json({ error: 'Mode not found' });
  res.json({ mode: req.params.mode, config: cfg });
});

app.get('/api/stats', (req, res) => {
  const stats = {};
  Object.keys(MODES).forEach(m => { stats[m] = 0; });
  history.forEach(h => { stats[h.toMode] = (stats[h.toMode] || 0) + 1; });
  const current = {};
  for (const [did, m] of currentModes) current[did] = m;
  res.json({ modeUsage: stats, currentDevices: current, totalSwitches: history.length });
});

app.post('/api/auto',requireAuth,  (req, res) => {
  const { deviceId, context } = req.body;
  const suggested = smartSuggest(context);
  const did = deviceId || 'default';
  const from = currentModes.get(did) || 'manual';
  currentModes.set(did, suggested);
  const h = recordHistory(did, from, suggested, 'auto-suggested');
  // Fire device-integration webhook (non-blocking)
  fanoutModeChange(did, from, suggested, 'auto-suggested').catch(e => console.warn('[listening-modes] fanout error:', e.message));
  res.json({ deviceId: did, suggested, previousMode: from, action: actionForMode(suggested), history: h });
});

// =================================================================
// Phase 7+: device-integration webhook registry
// =================================================================
app.post('/api/integration/device-integration',requireAuth,  (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  // De-dupe by url
  const existing = deviceHooks.find(h => h.url === url);
  if (existing) {
    return res.status(200).json({ registered: true, deduped: true, hook: existing });
  }
  const hook = {
    url,
    registeredAt: new Date().toISOString(),
    deliveries: 0,
    errors: 0,
  };
  deviceHooks.push(hook);
  res.status(201).json({ registered: true, hook });
});

app.get('/api/integration/device-integration', (req, res) => {
  res.json({
    enabled: USE_DEVICE_INTEGRATION_HOOK,
    hooks: deviceHooks,
    total: deviceHooks.length,
    healthy: USE_DEVICE_INTEGRATION_HOOK ? 'check /health on each target' : 'disabled',
  });
});

app.delete('/api/integration/device-integration', (req, res) => {
  const before = deviceHooks.length;
  deviceHooks.length = 0;
  res.json({ cleared: before });
});

// Phase A: persistent store endpoint for readiness demo data
app.get('/api/webhook-log', (req, res) => {
  const items = Array.from(webhookLog.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, webhookLog: items });
});

// Phase A: production-readiness routes (LLM + DB health + combined) — BEFORE 404 catch-all
installReadinessRoutes(app, { serviceName: 'genie-listening-modes' });

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Phase A: idempotent demo-data seeding (webhook-log; existing seed fn left intact)
const seedPlans = [
  {
    store: webhookLog,
    items: normalizeSeedData([
      { id: 'wh1', deviceId: 'dev-101', mode: 'smart', action: 'start', deliveredAt: '2026-06-22T08:00:00Z' },
      { id: 'wh2', deviceId: 'dev-102', mode: 'continuous', action: 'start', deliveredAt: '2026-06-22T09:15:00Z' },
      { id: 'wh3', deviceId: 'dev-103', mode: 'passive', action: 'stop', deliveredAt: '2026-06-22T10:30:00Z' },
      { id: 'wh4', deviceId: 'dev-104', mode: 'manual', action: 'stop', deliveredAt: '2026-06-22T11:45:00Z' },
      { id: 'wh5', deviceId: 'dev-105', mode: 'continuous', action: 'start', deliveredAt: '2026-06-22T12:00:00Z' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-listening-modes' });
if (seeded) console.log('[genie-listening-modes] demo data seeded');

app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.path }));



const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Genie Listening Modes v${SERVICE_VERSION}`);
  console.log(`  Listening on :${PORT}`);
  console.log(`  Modes: ${Object.keys(MODES).join(', ')}`);
  console.log(`  Active devices: ${currentModes.size}`);
  console.log(`${'='.repeat(60)}\n`);
});
installGracefulShutdown(server);
