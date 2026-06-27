/**
 * Mission Control — CoPilot's proactive brain (Port 4960)
 *
 * The vision (per NEXHA-3-LAYER-AUDIT.md):
 *   "CoPilot continuously monitors the business and proactively launches missions."
 *
 * What this service does:
 *   1. Polls executive-copilot@4933 /api/kpis every POLL_INTERVAL_MS (default 5 min)
 *   2. Evaluates each threshold rule against current KPIs
 *   3. When a breach is detected, creates a Goal in goal-os@4242
 *   4. GoalOS emits `goal.created` to event-bus → Flow Orchestrator picks it up
 *   5. Agent Teaming creates a mission from the goal
 *   6. SUTAR agents execute the mission via Nexha
 *
 * Why this exists:
 *   Before this service, CoPilot was reactive — only answered when asked.
 *   The "Business Mission Control" from the vision didn't exist. This is it.
 *
 * Default Rules:
 *   - procurement_cost_change > +10%  → "Reduce procurement cost" goal
 *   - customer_churn > 5%            → "Reduce customer churn" goal
 *   - revenue_change < -10%          → "Recover revenue" goal
 *   - inventory_turnover < 4         → "Optimize inventory" goal
 *
 * Layer: CoPilot (Think)
 * Pattern: in-memory + Express 4 + PersistentMap + setInterval cron
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.PORT || '4960', 10);
const SERVICE_NAME = 'mission-control';

// =============================================================================
// CONFIG (overridable via env)
// =============================================================================

const EXEC_COPILOT_URL = process.env.EXEC_COPILOT_URL || 'http://localhost:4933';
const GOAL_OS_URL = process.env.GOAL_OS_URL || 'http://localhost:4242';
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '300000', 10); // 5 min default
const DEDUPE_WINDOW_MS = parseInt(process.env.DEDUPE_WINDOW_MS || (24 * 60 * 60 * 1000), 10); // 24h default
const DEFAULT_OWNER_CORP_ID = process.env.DEFAULT_OWNER_CORP_ID || 'demo-business-001';
const ENABLED = process.env.MISSION_CONTROL_DISABLED !== 'true'; // kill switch

// =============================================================================
// THRESHOLD RULES
// =============================================================================
// Each rule says: if a KPI breach is detected, create a goal with this title/category/metrics.
// The goal is then handled by flow-orchestrator + agent-teaming via the event bus.

const DEFAULT_RULES = [
  {
    id: 'procurement_cost_increase',
    kpiId: 'procurement_cost_change',
    description: 'Ingredient / supplier cost increased more than 10% — recommend supplier renegotiation',
    evaluate: (kpi) => typeof kpi.change === 'number' && kpi.change > 0.10,
    goalTitle: 'Reduce procurement cost by 10%',
    goalDescription: 'Procurement costs have increased by more than 10%. Launch supplier search + negotiation workflow.',
    category: 'commerce',
    level: 'goal',
    priority: 'high',
    metrics: { target: '-10%', baseline: 'current_cost' },
    templateHint: 'reduce-cost',
  },
  {
    id: 'customer_churn_high',
    kpiId: 'customer_churn',
    description: 'Customer churn exceeds 5% — launch retention campaign',
    evaluate: (kpi) => typeof kpi.value === 'number' && kpi.value > 0.05,
    goalTitle: 'Reduce customer churn below 5%',
    goalDescription: 'Monthly churn exceeds the 5% threshold. Launch customer success + retention workflow.',
    category: 'business',
    level: 'goal',
    priority: 'high',
    metrics: { target: '<5%', baseline: 'current_churn' },
    templateHint: 'recover-revenue',
  },
  {
    id: 'revenue_drop',
    kpiId: 'revenue_change',
    description: 'Revenue dropped more than 10% — recover',
    evaluate: (kpi) => typeof kpi.change === 'number' && kpi.change < -0.10,
    goalTitle: 'Recover revenue to baseline',
    goalDescription: 'Revenue dropped more than 10% this period. Launch pricing + campaign + supplier-cost review.',
    category: 'business',
    level: 'goal',
    priority: 'critical',
    metrics: { target: 'baseline', baseline: 'previous_period' },
    templateHint: 'recover-revenue',
  },
  {
    id: 'inventory_slow',
    kpiId: 'inventory_turnover',
    description: 'Inventory turnover below 4 — optimize stock',
    evaluate: (kpi) => typeof kpi.value === 'number' && kpi.value < 4,
    goalTitle: 'Optimize inventory turnover above 4',
    goalDescription: 'Inventory is turning over too slowly. Run demand forecast + reorder optimization.',
    category: 'operational',
    level: 'goal',
    priority: 'medium',
    metrics: { target: '>4', baseline: 'current_turnover' },
    templateHint: 'optimize-inventory',
  },
];

// In-memory stores (file-persisted via PersistentMap)
const rules = new PersistentMap('rules', { serviceName: SERVICE_NAME });
const missions = new PersistentMap('missions', { serviceName: SERVICE_NAME });
const recentFires = new PersistentMap('recent-fires', { serviceName: SERVICE_NAME });
const tickHistory = new PersistentMap('tick-history', { serviceName: SERVICE_NAME });

// Seed default rules on startup if empty
function seedRules() {
  if (rules.size > 0) return;
  for (const r of DEFAULT_RULES) rules.set(r.id, r);
  console.log(`[${SERVICE_NAME}] Seeded ${DEFAULT_RULES.length} default threshold rules`);
}
seedRules();

// =============================================================================
// HTTP HELPERS
// =============================================================================

async function callJSON(url, opts = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = text; }
    return { ok: r.ok, status: r.status, body };
  } catch (err) {
    return { ok: false, status: 0, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(t);
  }
}

// =============================================================================
// CORE LOGIC — the "tick" that watches KPIs and fires missions
// =============================================================================

/**
 * One check tick. Fetches KPIs from executive-copilot, evaluates each rule,
 * and fires a goal for any breach. Dedupe within DEDUPE_WINDOW_MS.
 */
async function runTick(opts = {}) {
  const tickId = uuidv4();
  const startedAt = new Date().toISOString();
  const log = { tickId, startedAt, breaches: [], errors: [] };

  // 1. Fetch KPIs from executive-copilot
  const kpiResp = await callJSON(`${EXEC_COPILOT_URL}/api/kpis`);
  if (!kpiResp.ok) {
    log.errors.push({ stage: 'fetch-kpis', status: kpiResp.status, error: kpiResp.error || 'unknown' });
    tickHistory.set(tickId, log);
    if (tickHistory.size > 200) {
      const arr = Array.from(tickHistory.keys());
      for (let i = 0; i < arr.length - 200; i += 1) tickHistory.delete(arr[i]);
    }
    return log;
  }
  const kpis = (kpiResp.body && kpiResp.body.kpis) || [];

  // 2. For each rule, find the matching KPI and evaluate
  for (const [ruleId, rule] of rules.entries()) {
    const kpi = kpis.find((k) => k.id === rule.kpiId);
    if (!kpi) continue;
    if (!rule.evaluate(kpi)) continue;

    // 3. Dedupe — don't fire the same rule more than once per window
    const lastFire = recentFires.get(ruleId);
    if (lastFire && (Date.now() - lastFire.firedAt) < DEDUPE_WINDOW_MS) {
      log.breaches.push({ ruleId, kpiId: rule.kpiId, status: 'deduped', lastFiredAt: new Date(lastFire.firedAt).toISOString() });
      continue;
    }

    // 4. Create a goal in goal-os
    const goalResp = await callJSON(`${GOAL_OS_URL}/api/goals`, {
      method: 'POST',
      body: JSON.stringify({
        title: rule.goalTitle,
        description: rule.goalDescription,
        ownerCorpId: DEFAULT_OWNER_CORP_ID,
        category: rule.category,
        level: rule.level,
        priority: rule.priority,
        metrics: { ...rule.metrics, trigger: { ruleId, kpiId: rule.kpiId, kpi } },
      }),
    });

    if (!goalResp.ok || !goalResp.body || !goalResp.body.id) {
      log.breaches.push({ ruleId, kpiId: rule.kpiId, status: 'goal-create-failed', error: goalResp.error || `status ${goalResp.status}` });
      log.errors.push({ stage: 'create-goal', ruleId, status: goalResp.status });
      continue;
    }

    const goal = goalResp.body;
    const mission = {
      id: uuidv4(),
      ruleId,
      kpiId: rule.kpiId,
      kpi,
      goalId: goal.id,
      goal,
      templateHint: rule.templateHint,
      status: 'fired',
      firedAt: new Date().toISOString(),
    };
    missions.set(mission.id, mission);
    recentFires.set(ruleId, { missionId: mission.id, goalId: goal.id, firedAt: Date.now() });

    log.breaches.push({ ruleId, kpiId: rule.kpiId, status: 'fired', goalId: goal.id, missionId: mission.id });
  }

  log.completedAt = new Date().toISOString();
  log.durationMs = Date.now() - new Date(startedAt).getTime();
  tickHistory.set(tickId, log);
  if (tickHistory.size > 200) {
    const arr = Array.from(tickHistory.keys());
    for (let i = 0; i < arr.length - 200; i += 1) tickHistory.delete(arr[i]);
  }
  return log;
}

// =============================================================================
// EXPRESS APP
// =============================================================================

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

requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health + info
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    enabled: ENABLED,
    pollIntervalMs: POLL_INTERVAL_MS,
    dedupeWindowMs: DEDUPE_WINDOW_MS,
    config: {
      execCopilotUrl: EXEC_COPILOT_URL,
      goalOsUrl: GOAL_OS_URL,
      eventBusUrl: EVENT_BUS_URL,
      defaultOwnerCorpId: DEFAULT_OWNER_CORP_ID,
    },
    counts: {
      rules: rules.size,
      missions: missions.size,
      recentFires: recentFires.size,
      tickHistory: tickHistory.size,
    },
    capabilities: [
      'mission-check-now',
      'mission-list',
      'mission-get',
      'rule-list',
      'rule-update',
      'tick-history',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ── Missions ────────────────────────────────────────────────────────────────

app.post('/api/missions/check-now', requireAuth, async (_req, res) => {
  if (!ENABLED) return res.status(503).json({ error: 'mission-control is disabled (MISSION_CONTROL_DISABLED=true)' });
  const log = await runTick({ manual: true });
  res.json(log);
});

app.get('/api/missions', (_req, res) => {
  const arr = Array.from(missions.values()).sort((a, b) => new Date(b.firedAt) - new Date(a.firedAt));
  res.json({ missions: arr.slice(-200), total: arr.length });
});

app.get('/api/missions/:id', (req, res) => {
  const m = missions.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'mission not found' });
  res.json(m);
});

app.get('/api/missions/recent-fires', (_req, res) => {
  const arr = Array.from(recentFires.entries()).map(([ruleId, fire]) => ({
    ruleId,
    ...fire,
    firedAt: new Date(fire.firedAt).toISOString(),
    ageMs: Date.now() - fire.firedAt,
  }));
  res.json({ recentFires: arr });
});

// ── Rules ───────────────────────────────────────────────────────────────────

app.get('/api/rules', (_req, res) => {
  // Don't leak the evaluate function (it's code, not data)
  const arr = Array.from(rules.values()).map(({ evaluate, ...rest }) => ({
    ...rest,
    evaluateType: evaluate ? 'function' : null,
  }));
  res.json({ rules: arr });
});

app.put('/api/rules/:id', requireAuth, (req, res) => {
  const rule = rules.get(req.params.id);
  if (!rule) return res.status(404).json({ error: 'rule not found' });
  const allowed = ['description', 'goalTitle', 'goalDescription', 'category', 'level', 'priority', 'metrics', 'templateHint'];
  const updated = { ...rule };
  for (const k of allowed) {
    if (req.body[k] !== undefined) updated[k] = req.body[k];
  }
  rules.set(req.params.id, updated);
  res.json({ ...updated, evaluateType: updated.evaluate ? 'function' : null });
});

app.delete('/api/rules/:id', requireAuth, (req, res) => {
  if (!rules.has(req.params.id)) return res.status(404).json({ error: 'rule not found' });
  rules.delete(req.params.id);
  res.status(204).end();
});

// ── Tick history (debug / observability) ────────────────────────────────────

app.get('/api/tick-history', (_req, res) => {
  const arr = Array.from(tickHistory.values()).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  res.json({ ticks: arr.slice(-50), total: arr.length });
});

// =============================================================================
// CRON — start the watcher
// =============================================================================

let timer = null;
function startWatcher() {
  if (!ENABLED) {
    console.log(`[${SERVICE_NAME}] DISABLED — not starting watcher (set MISSION_CONTROL_DISABLED=false to enable)`);
    return;
  }
  if (timer) return;
  console.log(`[${SERVICE_NAME}] Starting watcher — every ${POLL_INTERVAL_MS}ms`);
  // Run one tick immediately, then schedule
  runTick({ initial: true }).catch((err) => console.error(`[${SERVICE_NAME}] initial tick failed:`, err.message));
  timer = setInterval(() => {
    runTick().catch((err) => console.error(`[${SERVICE_NAME}] tick failed:`, err.message));
  }, POLL_INTERVAL_MS);
}

function stopWatcher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log(`[${SERVICE_NAME}] Watcher stopped`);
  }
}

// =============================================================================
// START
// =============================================================================

const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
  startWatcher();
});
installGracefulShutdown(server);

// Manual test endpoint to trigger tick for smoke tests
app.post('/api/_test/tick', requireAuth, async (_req, res) => {
  const log = await runTick({ test: true });
  res.json(log);
});

// 404 + error handling
app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}]`, err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// Graceful shutdown
process.on('SIGTERM', () => { stopWatcher(); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { stopWatcher(); server.close(() => process.exit(0)); });

module.exports = { app, runTick, startWatcher, stopWatcher };
