/**
 * Goal Conflict Engine (port 4151)
 *
 * Pairs with GoalOS (4242). GoalOS handles goal CRUD / decomposition / progress.
 * THIS service answers: "do my active goals fight each other? how badly? what
 * should I do about it?"
 *
 * 4 conflict types:
 *   1. resource  — two goals want more of the same scarce resource
 *   2. metric    — two goals' targets move in opposite directions on a dimension
 *   3. temporal  — overlapping deadlines whose cumulative workload exceeds capacity
 *   4. strategic — goals share tags the engine has flagged as opposing
 *
 * 4 resolution strategies per conflict:
 *   1. prioritize — keep the higher-priority goal, defer the other
 *   2. sequence   — split timeline so both can run
 *   3. compromise — set new targets that satisfy both
 *   4. kill       — recommend canceling one entirely
 *
 * Port: 4151
 * Pattern: in-memory Map (matches twin-capability-profile, skill-os, etc.)
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.GOAL_CONFLICT_ENGINE_PORT || 4151;
const GOALOS_URL = process.env.GOALOS_URL || 'http://localhost:4242';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================

const goals = new PersistentMap('goals', { serviceName: 'goal-conflict-engine' });        // goalId -> goal
const conflicts = new PersistentMap('conflicts', { serviceName: 'goal-conflict-engine' });    // conflictId -> conflict (with proposed resolutions)
const oppositions = new PersistentMap('oppositions', { serviceName: 'goal-conflict-engine' });  // tagA -> [tagB, ...]    strategic opposition map
const resolutions = new PersistentMap('resolutions', { serviceName: 'goal-conflict-engine' });  // resolutionId -> applied resolution
const audit = [];               // audit log

// =============================================================================
// SEED — 5 example goals that conflict with each other (so the API is non-empty)
// =============================================================================

const SEED_GOALS = [
  {
    id: 'g-revenue-q3',
    title: 'Maximize Q3 revenue',
    ownerCorpId: 'demo',
    priority: 'high',
    status: 'active',
    tags: ['growth', 'revenue'],
    metrics: {
      revenue:       { target: 5000000, direction: 'max' },
      // shared metric with g-cost-cut to create a metric conflict
      profit:        { target: 1200000, direction: 'max' }
    },
    resourceCost: { budget: 200000, headcount: 8, time: 90 },
    effort: 90,
    deadline: '2026-09-30',
    createdAt: new Date().toISOString()
  },
  {
    id: 'g-satisfaction',
    title: 'Maintain customer satisfaction ≥ 4.5',
    ownerCorpId: 'demo',
    priority: 'medium',
    status: 'active',
    tags: ['quality', 'satisfaction'],
    metrics: {
      satisfaction:  { target: 4.5, direction: 'max' }
    },
    resourceCost: { budget: 80000, headcount: 4, time: 90 },
    effort: 60,
    deadline: '2026-09-30',
    createdAt: new Date().toISOString()
  },
  {
    id: 'g-cost-cut',
    title: 'Cut operating costs by 20%',
    ownerCorpId: 'demo',
    priority: 'medium',
    status: 'active',
    tags: ['cost-cutting', 'efficiency'],
    metrics: {
      cost:          { target: -20, direction: 'min' },
      // also tracks profit (max), creating metric tension with g-revenue
      profit:        { target: 800000, direction: 'min' }
    },
    resourceCost: { budget: 0, headcount: 0, time: 60 },
    effort: 40,
    deadline: '2026-08-31',
    createdAt: new Date().toISOString()
  },
  {
    id: 'g-speed',
    title: 'Ship product v2 in 6 weeks',
    ownerCorpId: 'demo',
    priority: 'high',
    status: 'active',
    tags: ['speed', 'product'],
    metrics: { timeToMarket: { target: 42, direction: 'min' } },
    resourceCost: { budget: 50000, headcount: 6, time: 42 },
    effort: 80,
    deadline: '2026-08-15',
    createdAt: new Date().toISOString()
  },
  {
    id: 'g-safety',
    title: 'Zero safety incidents this quarter',
    ownerCorpId: 'demo',
    priority: 'high',
    status: 'active',
    tags: ['safety', 'quality'],
    metrics: { incidents: { target: 0, direction: 'min' } },
    resourceCost: { budget: 30000, headcount: 2, time: 90 },
    effort: 30,
    deadline: '2026-09-15',
    createdAt: new Date().toISOString()
  }
];

for (const g of SEED_GOALS) goals.set(g.id, g);

const SEED_OPPOSITIONS = {
  'cost-cutting': ['growth', 'speed'],
  'speed':        ['quality', 'safety'],
  'automation':   ['employment'],
  'growth':       ['cost-cutting'],
  'short-term':   ['long-term']
};
for (const [a, bs] of Object.entries(SEED_OPPOSITIONS)) {
  oppositions.set(a, bs);
}

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) { res.status(status).json({ success: false, error: code, message }); }

function priorityRank(p) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[p] || 0;
}

function auditLog(entry) {
  const a = { id: `aud-${uuidv4()}`, timestamp: nowIso(), ...entry };
  audit.push(a);
  if (audit.length > 5000) audit.shift();
  return a;
}

// Clamp a number to [0, 1]
function clamp01(n) { return Math.max(0, Math.min(1, n)); }

// =============================================================================
// CONFLICT DETECTION
// =============================================================================

/**
 * Resource conflict: sum of declared resourceCost > available in pool.
 * Pool shape: { budget?: number, headcount?: number, time?: number }
 */
function detectResourceConflicts(goalList, pool = {}) {
  const conflicts = [];
  const dims = ['budget', 'headcount', 'time'];
  for (const dim of dims) {
    const available = pool[dim];
    if (available == null) continue; // pool doesn't track this dim → skip
    const wants = goalList
      .filter(g => g.status === 'active' && g.resourceCost?.[dim] != null)
      .map(g => ({ id: g.id, title: g.title, priority: g.priority, want: g.resourceCost[dim] }))
      .sort((a, b) => b.want - a.want);
    const total = wants.reduce((s, x) => s + x.want, 0);
    if (total > available) {
      const overshoot = total - available;
      const severity = clamp01(overshoot / available);
      conflicts.push({
        id: `cf-res-${dim}-${uuidv4().slice(0, 8)}`,
        kind: 'resource',
        dimension: dim,
        available,
        demanded: total,
        overshoot,
        severity,
        affectedGoals: wants.map(w => w.id),
        summary: `${wants.length} active goals want ${total} ${dim} but only ${available} available (overshoot ${overshoot})`
      });
    }
  }
  return conflicts;
}

/**
 * Metric conflict: two goals' targets move in opposite directions on the same metric name.
 *   direction 'max' wants higher value, 'min' wants lower value.
 *   "Opposite" = one max, one min. Same = both max or both min (no conflict).
 */
function detectMetricConflicts(goalList) {
  const conflicts = [];
  const buckets = new PersistentMap('buckets', { serviceName: 'goal-conflict-engine' }); // metricName -> [goal]
  for (const g of goalList) {
    if (g.status !== 'active' || !g.metrics) continue;
    for (const [name, spec] of Object.entries(g.metrics)) {
      if (!spec || !spec.direction) continue;
      if (!buckets.has(name)) buckets.set(name, []);
      buckets.get(name).push({ goal: g, name, spec });
    }
  }
  for (const [name, entries] of buckets) {
    const maxs = entries.filter(e => e.spec.direction === 'max');
    const mins = entries.filter(e => e.spec.direction === 'min');
    if (maxs.length > 0 && mins.length > 0) {
      const involved = [...maxs, ...mins].map(e => e.goal);
      // severity: how incompatible? bigger when targets diverge a lot
      const allTargets = entries.map(e => e.spec.target);
      const spread = Math.max(...allTargets) - Math.min(...allTargets);
      const maxAbs = Math.max(...allTargets.map(Math.abs), 1);
      const severity = clamp01(spread / (maxAbs * 2));
      conflicts.push({
        id: `cf-met-${name}-${uuidv4().slice(0, 8)}`,
        kind: 'metric',
        metric: name,
        affectedGoals: involved.map(g => g.id),
        summary: `Metric "${name}" has both maximize and minimize goals: ${involved.map(g => `"${g.title}" (${g.metrics[name].direction} ${g.metrics[name].target})`).join(', ')}`,
        severity,
        maxGoals: maxs.map(e => e.goal.id),
        minGoals: mins.map(e => e.goal.id)
      });
    }
  }
  return conflicts;
}

/**
 * Temporal conflict: two goals have overlapping deadline windows with cumulative effort > capacity.
 * effort = days-of-work the goal needs. capacity = total workdays available across all goals in that window.
 * We don't know team size here; we use the sum of headcount as a proxy for capacity.
 */
function detectTemporalConflicts(goalList) {
  const conflicts = [];
  const dated = goalList
    .filter(g => g.status === 'active' && g.deadline && g.effort)
    .map(g => ({ ...g, _deadline: new Date(g.deadline) }))
    .filter(g => !isNaN(g._deadline))
    .sort((a, b) => a._deadline - b._deadline);
  if (dated.length < 2) return conflicts;
  // Find overlapping windows: any pair of goals whose deadline windows overlap AND effort sum > some threshold
  // Simpler heuristic: cumulative effort in a 30-day rolling window > 30 * max(headcount).
  const windowDays = 30;
  for (let i = 0; i < dated.length; i++) {
    const anchor = dated[i];
    const windowEnd = new Date(anchor._deadline.getTime() - (windowDays - 1) * 86400000);
    const inWindow = dated.filter(g => g._deadline >= windowEnd && g._deadline <= anchor._deadline);
    if (inWindow.length < 2) continue;
    const cumEffort = inWindow.reduce((s, g) => s + (g.effort || 0), 0);
    const maxHeadcount = Math.max(...inWindow.map(g => g.resourceCost?.headcount || 0), 1);
    const capacity = windowDays * maxHeadcount;
    if (cumEffort > capacity) {
      const overshoot = cumEffort - capacity;
      const severity = clamp01(overshoot / capacity);
      // dedupe by goal-set signature
      const sig = inWindow.map(g => g.id).sort().join('|');
      const id = `cf-tmp-${sig}-${anchor._deadline.toISOString().slice(0, 10)}`;
      if (conflicts.find(c => c.id === id)) continue;
      conflicts.push({
        id,
        kind: 'temporal',
        windowStart: windowEnd.toISOString().slice(0, 10),
        windowEnd: anchor._deadline.toISOString().slice(0, 10),
        cumulativeEffort: cumEffort,
        capacity,
        overshoot,
        severity,
        affectedGoals: inWindow.map(g => g.id),
        summary: `${inWindow.length} goals with deadlines in ${windowDays}-day window need ${cumEffort} effort-days but capacity is ${capacity}`
      });
    }
  }
  return conflicts;
}

/**
 * Strategic conflict: goals share tags that the opposition map flags as opposing.
 * Example: cost-cutting vs growth, speed vs quality.
 */
function detectStrategicConflicts(goalList) {
  const conflicts = [];
  for (let i = 0; i < goalList.length; i++) {
    for (let j = i + 1; j < goalList.length; j++) {
      const a = goalList[i];
      const b = goalList[j];
      if (a.status !== 'active' || b.status !== 'active') continue;
      const aTags = new Set(a.tags || []);
      const bTags = new Set(b.tags || []);
      const opposingPairs = [];
      for (const tag of aTags) {
        const opposites = oppositions.get(tag) || [];
        for (const opp of opposites) {
          if (bTags.has(opp)) opposingPairs.push([tag, opp]);
        }
      }
      if (opposingPairs.length > 0) {
        const sev = clamp01(opposingPairs.length * 0.5);
        conflicts.push({
          id: `cf-str-${a.id}-${b.id}`,
          kind: 'strategic',
          opposingPairs,
          affectedGoals: [a.id, b.id],
          summary: `Strategic tension between "${a.title}" and "${b.title}" on ${opposingPairs.map(p => p.join('↔')).join(', ')}`,
          severity: sev
        });
      }
    }
  }
  return conflicts;
}

/**
 * Run all 4 detectors and return a unified conflict set.
 * Each conflict gets a list of proposed resolutions attached.
 */
function detectAllConflicts(goalList, pool) {
  const all = [
    ...detectResourceConflicts(goalList, pool),
    ...detectMetricConflicts(goalList),
    ...detectTemporalConflicts(goalList),
    ...detectStrategicConflicts(goalList)
  ];
  for (const c of all) {
    c.resolutions = proposeResolutions(c, goalList);
    c.detectedAt = nowIso();
    c.status = 'open';
  }
  return all;
}

// =============================================================================
// RESOLUTION PROPOSALS
// =============================================================================

/**
 * For a given conflict, propose 4 strategies (where applicable).
 * Not all 4 make sense for every conflict kind — we return what's relevant.
 */
function proposeResolutions(conflict, goalList) {
  const byId = new Map(goalList.map(g => [g.id, g]));
  const involved = (conflict.affectedGoals || []).map(id => byId.get(id)).filter(Boolean);
  const out = [];
  const conflictConfidence = 0.7 + (conflict.severity || 0) * 0.3;

  // Strategy 1: PRIORITIZE — keep the highest-priority goal, defer the rest
  if (involved.length >= 2) {
    const sorted = [...involved].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
    const winner = sorted[0];
    const losers = sorted.slice(1);
    out.push({
      id: `r-pri-${uuidv4().slice(0, 8)}`,
      kind: 'prioritize',
      confidence: conflictConfidence,
      summary: `Keep "${winner.title}" (priority: ${winner.priority}); defer ${losers.map(l => `"${l.title}"`).join(', ')}`,
      expectedOutcome: `${winner.title} runs as planned; ${losers_summary(losers)} deferred to next cycle`,
      tradeoff: `Other goals lose momentum; team may disengage from deferred work`,
      affectedGoals: [winner.id, ...losers.map(l => l.id)],
      kept: winner.id,
      deferred: losers.map(l => l.id)
    });
  }

  // Strategy 2: SEQUENCE — split timeline so both can run
  if (involved.length >= 2 && (conflict.kind === 'temporal' || conflict.kind === 'resource')) {
    const sorted = [...involved].sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return da - db;
    });
    out.push({
      id: `r-seq-${uuidv4().slice(0, 8)}`,
      kind: 'sequence',
      confidence: conflictConfidence * 0.85,
      summary: `Run ${sorted.map(g => `"${g.title}"`).join(' → ')} sequentially in deadline order`,
      expectedOutcome: 'No overlap; each goal gets full team attention in turn',
      tradeoff: `Total calendar time extends; downstream goals start later`,
      affectedGoals: sorted.map(g => g.id),
      sequence: sorted.map(g => g.id)
    });
  }

  // Strategy 3: COMPROMISE — set new targets that satisfy both
  if (conflict.kind === 'metric' && conflict.metric) {
    out.push({
      id: `r-com-${uuidv4().slice(0, 8)}`,
      kind: 'compromise',
      confidence: conflictConfidence * 0.7,
      summary: `Set "${conflict.metric}" target to a midpoint that partially satisfies all goals`,
      expectedOutcome: 'Each goal achieves ~60-80% of its original target',
      tradeoff: 'No goal fully hits its target; requires re-baselining metrics',
      affectedGoals: conflict.affectedGoals,
      newTargets: involved.reduce((acc, g) => {
        const spec = g.metrics?.[conflict.metric];
        if (spec) acc[g.id] = { ...spec, target: spec.target * 0.75 };
        return acc;
      }, {})
    });
  } else if (conflict.kind === 'resource') {
    out.push({
      id: `r-com-${uuidv4().slice(0, 8)}`,
      kind: 'compromise',
      confidence: conflictConfidence * 0.65,
      summary: `Each affected goal reduces its ${conflict.dimension} ask proportionally to fit available pool`,
      expectedOutcome: 'All goals continue but at reduced scope',
      tradeoff: 'Each goal delivers ~80% of original scope; aggregate outcome close to plan',
      affectedGoals: conflict.affectedGoals,
      reductionFactor: conflict.available / conflict.demanded
    });
  }

  // Strategy 4: KILL — recommend canceling one
  if (involved.length >= 2) {
    // kill the lowest-priority one
    const sorted = [...involved].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
    const victim = sorted[0];
    out.push({
      id: `r-kil-${uuidv4().slice(0, 8)}`,
      kind: 'kill',
      confidence: 0.4 + (1 - conflict.severity) * 0.2, // only confident for low-severity, because killing is drastic
      summary: `Cancel "${victim.title}" (lowest priority) and reallocate its ${victim.resourceCost ? `resources (${formatResource(victim.resourceCost)})` : 'scope'} to the others`,
      expectedOutcome: 'Other goals get more resources; one goal dropped entirely',
      tradeoff: `Lost investment in "${victim.title}"; team morale impact on owners`,
      affectedGoals: conflict.affectedGoals,
      killed: victim.id
    });
  }

  return out;
}

function losers_summary(losers) {
  if (!losers || losers.length === 0) return '';
  if (losers.length === 1) return `"${losers[0].title}"`;
  return `${losers.slice(0, -1).map(l => `"${l.title}"`).join(', ')} and "${losers[losers.length - 1].title}"`;
}

function formatResource(r) {
  if (!r) return '';
  const parts = [];
  if (r.budget) parts.push(`$${r.budget.toLocaleString()}`);
  if (r.headcount) parts.push(`${r.headcount} people`);
  if (r.time) parts.push(`${r.time} days`);
  return parts.join(', ');
}

// =============================================================================
// ROUTES
// =============================================================================

// health
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'goal-conflict-engine',
    version: '1.0.0',
    port: PORT,
    timestamp: nowIso(),
    counts: {
      goals: goals.size,
      conflicts: conflicts.size,
      oppositions: oppositions.size,
      resolutions: resolutions.size,
      auditEntries: audit.length
    },
    capabilities: [
      'detect-resource-conflicts',
      'detect-metric-conflicts',
      'detect-temporal-conflicts',
      'detect-strategic-conflicts',
      'propose-resolutions',
      'apply-resolution',
      'sync-from-goalos',
      'manage-oppositions'
    ]
  });
});

app.get('/', (_req, res) => res.redirect('/health'));

// ── Goals ───────────────────────────────────────────────────────────────

// list goals
app.get('/api/goals', (req, res) => {
  const { owner, status, tag } = req.query;
  let list = Array.from(goals.values());
  if (owner) list = list.filter(g => g.ownerCorpId === owner);
  if (status) list = list.filter(g => g.status === status);
  if (tag) list = list.filter(g => (g.tags || []).includes(tag));
  res.json({ count: list.length, goals: list });
});

// get one goal
app.get('/api/goals/:id', (req, res) => {
  const g = goals.get(req.params.id);
  if (!g) return fail(res, 'not_found', `goal ${req.params.id} not found`, 404);
  res.json(g);
});

// create or upsert goal
app.post('/api/goals',requireAuth,  (req, res) => {
  const { id, title, ownerCorpId, priority, status, tags, metrics, resourceCost, effort, deadline } = req.body || {};
  if (!id || !title || !ownerCorpId) return fail(res, 'validation', 'id, title, ownerCorpId required');
  const g = {
    id, title, ownerCorpId,
    priority: priority || 'medium',
    status: status || 'active',
    tags: Array.isArray(tags) ? tags : [],
    metrics: metrics || {},
    resourceCost: resourceCost || {},
    effort: effort || 0,
    deadline: deadline || null,
    createdAt: goals.get(id)?.createdAt || nowIso(),
    updatedAt: nowIso()
  };
  goals.set(id, g);
  auditLog({ kind: 'goal-upsert', goalId: id, owner: ownerCorpId });
  res.status(201).json(g);
});

// ── Conflicts ───────────────────────────────────────────────────────────

// Detect conflicts (ad-hoc; doesn't store)
app.post('/api/conflicts/detect',requireAuth,  (req, res) => {
  const { goalIds, goals: inlineGoals, resourcePool, oppositionOverride } = req.body || {};
  let list;
  if (Array.isArray(inlineGoals) && inlineGoals.length > 0) {
    list = inlineGoals;
  } else if (Array.isArray(goalIds) && goalIds.length > 0) {
    list = goalIds.map(id => goals.get(id)).filter(Boolean);
    if (list.length === 0) return fail(res, 'not_found', 'none of the goalIds exist', 404);
  } else {
    list = Array.from(goals.values()).filter(g => g.status === 'active');
  }
  const originalOps = oppositionOverride ? new Map(Object.entries(oppositionOverride)) : null;
  if (originalOps) {
    // temporarily swap
    const saved = new Map(oppositions);
    oppositions.clear();
    for (const [k, v] of originalOps) oppositions.set(k, v);
    try {
      const conflicts = detectAllConflicts(list, resourcePool || {});
      return res.json({ count: conflicts.length, conflicts });
    } finally {
      oppositions.clear();
      for (const [k, v] of saved) oppositions.set(k, v);
    }
  }
  const conflicts = detectAllConflicts(list, resourcePool || {});
  res.json({ count: conflicts.length, conflicts });
});

// Detect and store
app.post('/api/conflicts/detect-and-store',requireAuth,  (req, res) => {
  const { goalIds, goals: inlineGoals, resourcePool } = req.body || {};
  let list;
  if (Array.isArray(inlineGoals) && inlineGoals.length > 0) {
    list = inlineGoals;
  } else if (Array.isArray(goalIds) && goalIds.length > 0) {
    list = goalIds.map(id => goals.get(id)).filter(Boolean);
  } else {
    list = Array.from(goals.values()).filter(g => g.status === 'active');
  }
  const newConflicts = detectAllConflicts(list, resourcePool || {});
  for (const c of newConflicts) conflicts.set(c.id, c);
  auditLog({ kind: 'conflicts-detected-stored', count: newConflicts.length });
  res.status(201).json({ count: newConflicts.length, conflicts: newConflicts });
});

// list stored conflicts
app.get('/api/conflicts', (req, res) => {
  const { kind, status, owner } = req.query;
  let list = Array.from(conflicts.values());
  if (kind) list = list.filter(c => c.kind === kind);
  if (status) list = list.filter(c => c.status === status);
  if (owner) {
    list = list.filter(c => (c.affectedGoals || []).some(gid => goals.get(gid)?.ownerCorpId === owner));
  }
  res.json({ count: list.length, conflicts: list });
});

// get one
app.get('/api/conflicts/:id', (req, res) => {
  const c = conflicts.get(req.params.id);
  if (!c) return fail(res, 'not_found', `conflict ${req.params.id} not found`, 404);
  res.json(c);
});

// apply a resolution
app.post('/api/conflicts/:id/resolve',requireAuth,  (req, res) => {
  const c = conflicts.get(req.params.id);
  if (!c) return fail(res, 'not_found', `conflict ${req.params.id} not found`, 404);
  const { strategyId, acceptedBy, note } = req.body || {};
  if (!strategyId) return fail(res, 'validation', 'strategyId required');
  const r = (c.resolutions || []).find(x => x.id === strategyId);
  if (!r) return fail(res, 'not_found', `strategy ${strategyId} not found in conflict ${c.id}`, 404);
  const resolutionId = `res-${uuidv4().slice(0, 8)}`;
  const applied = {
    id: resolutionId,
    conflictId: c.id,
    strategyId,
    strategyKind: r.kind,
    affectedGoals: r.affectedGoals,
    acceptedBy: acceptedBy || 'anonymous',
    note: note || '',
    appliedAt: nowIso(),
    summary: r.summary,
    expectedOutcome: r.expectedOutcome
  };
  resolutions.set(resolutionId, applied);
  c.status = 'resolved';
  c.resolvedAt = nowIso();
  c.resolutionId = resolutionId;
  auditLog({ kind: 'resolution-applied', conflictId: c.id, strategyKind: r.kind, acceptedBy: applied.acceptedBy });
  res.status(201).json({ resolution: applied, conflict: c });
});

// ── Resolutions ─────────────────────────────────────────────────────────
app.get('/api/resolutions', (req, res) => {
  const list = Array.from(resolutions.values());
  res.json({ count: list.length, resolutions: list });
});

// ── Oppositions ─────────────────────────────────────────────────────────
app.get('/api/oppositions', (_req, res) => {
  const out = {};
  for (const [k, v] of oppositions) out[k] = v;
  res.json({ count: oppositions.size, oppositions: out });
});

app.post('/api/oppositions',requireAuth,  (req, res) => {
  const { tag, opposes } = req.body || {};
  if (!tag || !Array.isArray(opposes)) return fail(res, 'validation', 'tag + opposes[] required');
  const existing = oppositions.get(tag) || [];
  const merged = Array.from(new Set([...existing, ...opposes]));
  oppositions.set(tag, merged);
  auditLog({ kind: 'opposition-add', tag, opposes });
  res.status(201).json({ tag, opposes: merged });
});

// ── GoalOS sync ─────────────────────────────────────────────────────────
app.post('/api/goals/sync-from-goalos',requireAuth,  async (req, res) => {
  // Try to fetch active goals from GoalOS (4242). If unreachable, return error.
  const owner = req.query.owner || req.body?.owner;
  try {
    const url = `${GOALOS_URL}/api/goals/status/active`;
    const r = await fetch(url, { timeout: 3000 });
    if (!r.ok) {
      return fail(res, 'goalos_unreachable', `GoalOS returned ${r.status}`, 502);
    }
    const data = await r.json();
    const list = Array.isArray(data) ? data : (data.goals || []);
    let synced = 0;
    for (const g of list) {
      // GoalOS goals have id, ownerCorpId, title, status, priority, deadline, metrics
      const enriched = {
        id: g.id,
        title: g.title,
        ownerCorpId: g.ownerCorpId || 'unknown',
        priority: g.priority || 'medium',
        status: g.status || 'active',
        tags: g.tags || [],
        metrics: g.metrics || {},
        resourceCost: g.resourceCost || {},
        effort: g.effort || 0,
        deadline: g.deadline || null,
        createdAt: g.createdAt || nowIso(),
        updatedAt: nowIso(),
        source: 'goalos'
      };
      goals.set(enriched.id, enriched);
      synced++;
    }
    auditLog({ kind: 'goalos-sync', synced, owner: owner || 'all' });
    res.json({ success: true, synced, total: goals.size });
  } catch (err) {
    fail(res, 'goalos_unreachable', `GoalOS unreachable at ${GOALOS_URL}: ${err.message}`, 502);
  }
});

// ── Audit ───────────────────────────────────────────────────────────────
app.get('/api/audit', (req, res) => {
  const { kind, limit } = req.query;
  let list = audit.slice().reverse();
  if (kind) list = list.filter(a => a.kind === kind);
  if (limit) list = list.slice(0, parseInt(limit));
  res.json({ count: list.length, audit: list });
});

// =============================================================================
// START
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`Goal Conflict Engine running on port ${PORT}`);
  console.log(`  ${goals.size} seed goals, ${oppositions.size} opposition rules`);
  console.log(`  Pre-seeded scenario: 5 goals with 4 conflict types detectable`);
});
installGracefulShutdown(server);
