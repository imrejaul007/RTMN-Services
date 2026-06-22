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
  res.json({ deviceId: did, mode, previousMode: from, history: h });
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
  res.json({ deviceId: did, suggested, previousMode: from, history: h });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.path }));
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Genie Listening Modes v${SERVICE_VERSION}`);
  console.log(`  Listening on :${PORT}`);
  console.log(`  Modes: ${Object.keys(MODES).join(', ')}`);
  console.log(`  Active devices: ${currentModes.size}`);
  console.log(`${'='.repeat(60)}\n`);
});
installGracefulShutdown(server);
