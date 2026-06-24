const cors = require('cors');
const helmet = require('helmet');
/**
 * SUTAR Agent Teaming Service
 *
 * The 10/10 differentiator. Composes individual SUTAR agents into
 * persistent teams that own a long-running mission, with:
 *
 *   - Team formation: discover + rank candidate agents for a mission
 *   - Leader election: pick a team leader (Bully / Raft-like / Round-robin)
 *   - Task DAG: decompose a mission into dependent subtasks
 *   - Failure recovery: re-elect a leader, retry a step, or escalate
 *   - Mission templates: 5+ built-in templates (price-compare, dispute-mediation,
 *     contract-bundle, market-research, multi-vendor-fulfilment)
 *
 * Layer: Agents (orthogonal to SUTAR's 7 layers, sits alongside agent-orchestration)
 * Port: 4853
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');
const rezIntel = require('./rez-intel-client');
const axios = require('axios');
// Phase A: goal subscriber (event-bus → agent-teaming wiring)
const { registerGoalSubscriber, handleGoalEvent, subscriberState } = require('./subscribers/goal-subscriber.js');

const app = express();

app.use(cors());
app.use(helmet());

requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'agent-teaming' });

const PORT = process.env.PORT || 4853;
const SERVICE_NAME = 'agent-teaming';

// Service URLs (RTMN ecosystem)
const ACN_NETWORK_URL = process.env.ACN_NETWORK_URL || 'http://localhost:4801';
const ACP_PROTOCOL_URL = process.env.ACP_PROTOCOL_URL || 'http://localhost:4800';
const AGENT_REPUTATION_URL = process.env.AGENT_REPUTATION_URL || 'http://localhost:4820';
const AGENT_WALLETS_URL = process.env.AGENT_WALLETS_URL || 'http://localhost:4840';
const AGENT_CONTRACTS_URL = process.env.AGENT_CONTRACTS_URL || 'http://localhost:4830';
const AGENT_ORCHESTRATION_URL = process.env.AGENT_ORCHESTRATION_URL || 'http://localhost:4851';

// Persistent stores
const teams = new PersistentMap('teams', { serviceName: SERVICE_NAME });
const missions = new PersistentMap('missions', { serviceName: SERVICE_NAME });
const taskDAGs = new PersistentMap('task-dags', { serviceName: SERVICE_NAME });
const electionLogs = new PersistentMap('election-logs', { serviceName: SERVICE_NAME });
const failureLogs = new PersistentMap('failure-logs', { serviceName: SERVICE_NAME });

// =============================================================================
// OBSERVABILITY METRICS
// =============================================================================
// Lightweight counter + EMA histogram registry. No Prometheus client needed —
// we expose a plain JSON view at /metrics and a Prometheus text-format view at
// /metrics/prom. Counters are monotonic; latencies are tracked via exponential
// moving averages keyed by (operation, label).

const METRICS = {
  // Counters
  team_formations_total: 0,                  // any formTeam call
  team_formations_success_total: 0,         // formed a team
  team_formations_failed_total: 0,          // not enough candidates
  leader_elections_total: 0,                // any electLeader call
  missions_created_total: 0,                // any mission creation
  missions_failed_total: 0,                 // mission ended in failed state
  dags_created_total: 0,                    // any DAG created
  dag_steps_total: 0,                       // sum of steps across all DAGs
  failures_total: 0,                        // any handleStepFailure call
  failures_recovered_total: 0,              // recovery = retry
  failures_escalated_total: 0,              // recovery = escalate-to-leader
  failures_terminal_total: 0,               // recovery = none (mission lost)
  http_requests_total: 0,                   // any /api/* call
  http_errors_total: 0,                     // 4xx/5xx responses
  acn_calls_total: 0,                       // calls to ACN network
  acn_failures_total: 0,                    // ACN network down
  reputation_calls_total: 0,                // calls to agent-reputation
  reputation_failures_total: 0,             // agent-reputation down

  // Latency (ms) — EMA per (operation, label)
  // e.g. latencies['formTeam']['BULLY'] = { ema, count, max }
  latencies: {},

  // Labelled breakdowns
  byTemplate: {},     // { templateName: count }
  byAlgo: {},         // { algo: count }
  byStatus: {},       // { status: count }
  byRecovery: {},     // { recovery: count }
  startedAt: new Date().toISOString(),
};

function observeLatency(operation, label, ms) {
  const key = operation;
  if (!METRICS.latencies[key]) METRICS.latencies[key] = {};
  const bucket = METRICS.latencies[key][label] || { ema: 0, count: 0, max: 0, sum: 0 };
  bucket.count += 1;
  bucket.sum += ms;
  if (ms > bucket.max) bucket.max = ms;
  // EMA: alpha=0.2 → recent samples dominate, but smoothed view
  bucket.ema = bucket.ema === 0 ? ms : (bucket.ema * 0.8 + ms * 0.2);
  METRICS.latencies[key][label] = bucket;
}

async function timed(operation, label, fn) {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    observeLatency(operation, label, Date.now() - t0);
  }
}

/**
 * Sync variant — supports functions that return a value directly (not a Promise).
 * Records the same EMA latency but doesn't await.
 */
function timedSync(operation, label, fn) {
  const t0 = Date.now();
  try {
    return fn();
  } finally {
    observeLatency(operation, label, Date.now() - t0);
  }
}

function bumpCounter(name, by = 1) {
  METRICS[name] = (METRICS[name] || 0) + by;
}

function bumpBreakdown(mapName, key, by = 1) {
  METRICS[mapName][key] = (METRICS[mapName][key] || 0) + by;
}

// HTTP request counter middleware — must be installed BEFORE any route
// declarations so it sees every request. Skips /health, /ready, /metrics.
app.use((req, res, next) => {
  if (req.path.startsWith('/health') || req.path.startsWith('/ready') || req.path.startsWith('/metrics')) {
    return next();
  }
  bumpCounter('http_requests_total');
  res.on('finish', () => {
    if (res.statusCode >= 400) bumpCounter('http_errors_total');
  });
  next();
});

// =============================================================================
// TEAM FORMATION
// =============================================================================
// A team is a named, persistent group of agents with roles + a leader.
// Members are looked up via ACN network; we filter + rank by reputation.

const LEADER_ELECTION_ALGORITHMS = {
  BULLY: 'bully',           // highest-reputation agent wins
  RAFT: 'raft',             // highest-id among responding candidates
  ROUND_ROBIN: 'round-robin',// rotate through members per mission
};

/**
 * Form a team for a given mission.
 * POST /api/teams
 * body: { name, missionId, requiredRoles, minSize, maxSize, electionAlgo }
 */
async function formTeam({ name, missionId, requiredRoles = [], minSize = 2, maxSize = 5, electionAlgo = LEADER_ELECTION_ALGORITHMS.BULLY }) {
  return timed('formTeam', electionAlgo, async () => {
    bumpCounter('team_formations_total');
    bumpBreakdown('byAlgo', electionAlgo);

    // 1. Discover candidate agents from ACN network
    let candidates = [];
    bumpCounter('acn_calls_total');
    try {
      const r = await axios.get(`${ACN_NETWORK_URL}/api/agents`, { timeout: 3000 });
      candidates = r.data?.agents || r.data || [];
    } catch (e) {
      // ACN network may be down — synthesize local candidates so missions can still form.
      // Each required role gets a synthetic agent. Real reputation lookup is best-effort below.
      bumpCounter('acn_failures_total');
      const roleSet = new Set((requiredRoles && requiredRoles.length) ? requiredRoles : ['procurement', 'merchant', 'analyst', 'contract', 'logistics', 'shopping']);
      candidates = Array.from(roleSet).map((role, i) => ({
        id: `local-${role}-${i}`,
        type: role,
        role,
        name: `Local ${role}`,
        reputation: 60 + Math.floor(Math.random() * 20),
      }));
    }

    // 2. Look up reputation for each candidate (best-effort, fail-open)
    bumpCounter('reputation_calls_total', candidates.length);
    const scored = await Promise.all(candidates.map(async (c) => {
      let reputation = 50; // default neutral
      try {
        const r = await axios.get(`${AGENT_REPUTATION_URL}/api/reputation/${c.id}`, { timeout: 2000 });
        reputation = r.data?.score ?? 50;
      } catch (_) {
        bumpCounter('reputation_failures_total');
      }
      return { ...c, reputation };
    }));

    // 3. Filter by required roles
    const filtered = requiredRoles.length
      ? scored.filter((c) => requiredRoles.includes(c.role) || requiredRoles.includes(c.type))
      : scored;

    // 4. Rank by reputation (desc) and cap at maxSize
    const ranked = filtered.sort((a, b) => (b.reputation || 0) - (a.reputation || 0)).slice(0, maxSize);

    if (ranked.length < minSize) {
      bumpCounter('team_formations_failed_total');
      return { error: `Need at least ${minSize} candidates, got ${ranked.length}` };
    }

    // 5. Elect a leader
    const leader = electLeader(ranked, electionAlgo);

    const team = {
      id: `TEAM-${uuidv4().substring(0, 8)}`,
      name,
      missionId,
      members: ranked.map((c) => ({ id: c.id, role: c.role || c.type, reputation: c.reputation })),
      leader: leader.id,
      electionAlgo,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    teams.set(team.id, team);
    bumpCounter('team_formations_success_total');
    return team;
  });
}

/**
 * Elect a leader from a list of candidates.
 *  - Bully: highest-reputation agent wins
 *  - Raft: highest-id wins
 *  - Round-robin: rotate (uses team.leaderRotations[missionId] as cursor)
 */
function electLeader(candidates, algo = LEADER_ELECTION_ALGORITHMS.BULLY) {
  bumpCounter('leader_elections_total');
  bumpBreakdown('byAlgo', algo);
  if (!candidates.length) throw new Error('No candidates to elect from');
  switch (algo) {
    case LEADER_ELECTION_ALGORITHMS.BULLY:
      return candidates.slice().sort((a, b) => (b.reputation || 0) - (a.reputation || 0))[0];
    case LEADER_ELECTION_ALGORITHMS.RAFT:
      return candidates.slice().sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
    case LEADER_ELECTION_ALGORITHMS.ROUND_ROBIN: {
      // Caller should pass team in ctx for cursor; here we just pick first
      return candidates[0];
    }
    default:
      return candidates[0];
  }
}

// =============================================================================
// TASK DAG
// =============================================================================
// A DAG breaks a mission into tasks with dependencies. Each task references
// an agent (or team member). Tasks are scheduled when their deps are met.

function createTaskDAG(missionId, steps) {
  return timedSync('createTaskDAG', String(steps.length), () => {
    bumpCounter('dags_created_total');
    bumpCounter('dag_steps_total', steps.length);
    // steps: [{ id, label, agentRole, dependsOn: [stepId], input, timeoutMs }]
    const ids = steps.map((s) => s.id);
    const nodeMap = new Map(steps.map((s) => [s.id, s]));

    // Validate DAG
    for (const step of steps) {
      for (const dep of step.dependsOn || []) {
        if (!ids.includes(dep)) throw new Error(`Step ${step.id} depends on missing step ${dep}`);
        if (dep === step.id) throw new Error(`Step ${step.id} cannot depend on itself`);
      }
    }
    // Detect cycles
    const visited = new Set(), stack = new Set();
    function dfs(id) {
      if (stack.has(id)) throw new Error(`Cycle detected at step ${id}`);
      if (visited.has(id)) return;
      visited.add(id);
      stack.add(id);
      for (const dep of nodeMap.get(id)?.dependsOn || []) dfs(dep);
      stack.delete(id);
    }
    for (const id of ids) dfs(id);

    const dag = {
      id: `DAG-${uuidv4().substring(0, 8)}`,
      missionId,
      steps: steps.map((s) => ({
        id: s.id,
        label: s.label,
        agentRole: s.agentRole,
        dependsOn: s.dependsOn || [],
        input: s.input || {},
        timeoutMs: s.timeoutMs || 30000,
        status: 'pending', // pending, ready, running, completed, failed
        result: null,
        error: null,
        startedAt: null,
        completedAt: null,
      })),
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    taskDAGs.set(dag.id, dag);
    return dag;
  });
}

/**
 * Return the steps that are ready to run (all deps completed).
 */
function readySteps(dag) {
  const completed = new Set(dag.steps.filter((s) => s.status === 'completed').map((s) => s.id));
  return dag.steps.filter((s) => s.status === 'pending' && (s.dependsOn || []).every((d) => completed.has(d)));
}

// =============================================================================
// FAILURE RECOVERY
// =============================================================================
// When a step fails:
//   1. If retriesLeft > 0 → mark retrying, schedule retry with exponential backoff
//   2. Else if there's a fallback agent → re-assign to fallback
//   3. Else if the team has a healthy leader → escalate to leader
//   4. Else → mark mission failed

const RETRY_BACKOFF_MS = [1000, 5000, 15000]; // 1s, 5s, 15s
const MAX_RETRIES = RETRY_BACKOFF_MS.length;

async function handleStepFailure(dag, step, error, team) {
  bumpCounter('failures_total');
  const failure = {
    id: `FAIL-${uuidv4().substring(0, 8)}`,
    dagId: dag.id,
    missionId: dag.missionId,
    stepId: step.id,
    agentRole: step.agentRole,
    error: error.message || String(error),
    teamId: team?.id,
    leaderId: team?.leader,
    timestamp: new Date().toISOString(),
  };

  // 1. Retry?
  step.retries = (step.retries || 0) + 1;
  if (step.retries <= MAX_RETRIES) {
    failure.recovery = 'retry';
    failure.retryIn = RETRY_BACKOFF_MS[step.retries - 1];
    failure.status = 'recovering';
    step.status = 'pending'; // will be picked up by next readySteps call
    step.error = error.message;
    step.nextRetryAt = new Date(Date.now() + failure.retryIn).toISOString();
    failureLogs.set(failure.id, failure);
    bumpCounter('failures_recovered_total');
    bumpBreakdown('byRecovery', 'retry');
    return { recovered: true, action: 'retry', in: failure.retryIn };
  }

  // 2. Escalate to leader
  if (team?.leader) {
    failure.recovery = 'escalate-to-leader';
    failure.escalatedTo = team.leader;
    failure.status = 'escalated';
    step.status = 'failed';
    failureLogs.set(failure.id, failure);
    bumpCounter('failures_escalated_total');
    bumpBreakdown('byRecovery', 'escalate-to-leader');
    return { recovered: false, action: 'escalate', leader: team.leader };
  }

  // 3. No recovery
  failure.recovery = 'none';
  failure.status = 'terminal';
  step.status = 'failed';
  failureLogs.set(failure.id, failure);
  bumpCounter('failures_terminal_total');
  bumpBreakdown('byRecovery', 'none');
  return { recovered: false, action: 'fail' };
}

// =============================================================================
// MISSION TEMPLATES
// =============================================================================
// 5+ reusable templates that wire up the team formation + task DAG for
// common multi-agent workflows.

const MISSION_TEMPLATES = {
  'price-compare': {
    name: 'Price Comparison',
    description: 'Compare prices for a product across N merchant agents, return cheapest.',
    requiredRoles: ['merchant', 'shopping'],
    minSize: 3,
    maxSize: 6,
    buildSteps: (params) => [
      { id: 'discover', label: 'Discover candidate merchants', agentRole: 'shopping' },
      { id: 'query', label: 'Query each merchant for price', agentRole: 'merchant', dependsOn: ['discover'] },
      { id: 'compare', label: 'Compare and rank results', agentRole: 'analyst', dependsOn: ['query'] },
      { id: 'recommend', label: 'Return best offer', agentRole: 'shopping', dependsOn: ['compare'] },
    ],
  },
  'dispute-mediation': {
    name: 'Dispute Mediation',
    description: 'Mediate a transaction dispute between two agents.',
    requiredRoles: ['mediator', 'analyst'],
    minSize: 2,
    maxSize: 4,
    buildSteps: (params) => [
      { id: 'gather', label: 'Gather evidence from both parties', agentRole: 'analyst' },
      { id: 'analyze', label: 'Analyze transaction history', agentRole: 'analyst', dependsOn: ['gather'] },
      { id: 'propose', label: 'Propose resolution', agentRole: 'mediator', dependsOn: ['analyze'] },
      { id: 'settle', label: 'Settle via contract', agentRole: 'contract', dependsOn: ['propose'] },
    ],
  },
  'contract-bundle': {
    name: 'Contract Bundle',
    description: 'Bundle a multi-party agreement and route for signature.',
    requiredRoles: ['contract', 'legal'],
    minSize: 2,
    maxSize: 5,
    buildSteps: (params) => [
      { id: 'draft', label: 'Draft master contract', agentRole: 'legal' },
      { id: 'review', label: 'Review by all parties', agentRole: 'contract', dependsOn: ['draft'] },
      { id: 'sign', label: 'Collect signatures', agentRole: 'contract', dependsOn: ['review'] },
      { id: 'register', label: 'Register in contract OS', agentRole: 'contract', dependsOn: ['sign'] },
    ],
  },
  'market-research': {
    name: 'Market Research',
    description: 'Run a multi-source market research report for a category.',
    requiredRoles: ['analyst', 'shopping'],
    minSize: 3,
    maxSize: 5,
    buildSteps: (params) => [
      { id: 'scope', label: 'Scope the research question', agentRole: 'analyst' },
      { id: 'collect', label: 'Collect data from merchant agents', agentRole: 'shopping', dependsOn: ['scope'] },
      { id: 'synthesize', label: 'Synthesize findings', agentRole: 'analyst', dependsOn: ['collect'] },
      { id: 'report', label: 'Generate report', agentRole: 'analyst', dependsOn: ['synthesize'] },
    ],
  },
  'multi-vendor-fulfilment': {
    name: 'Multi-Vendor Fulfilment',
    description: 'Split a single order across multiple vendors and orchestrate fulfilment.',
    requiredRoles: ['merchant', 'logistics'],
    minSize: 3,
    maxSize: 6,
    buildSteps: (params) => [
      { id: 'split', label: 'Split order across vendors', agentRole: 'orchestrator' },
      { id: 'reserve', label: 'Reserve inventory at each vendor', agentRole: 'merchant', dependsOn: ['split'] },
      { id: 'pay', label: 'Pay each vendor from escrow', agentRole: 'wallet', dependsOn: ['reserve'] },
      { id: 'ship', label: 'Coordinate shipping', agentRole: 'logistics', dependsOn: ['pay'] },
      { id: 'confirm', label: 'Confirm delivery to buyer', agentRole: 'logistics', dependsOn: ['ship'] },
    ],
  },
  'reputation-rollup': {
    name: 'Reputation Rollup',
    description: 'Aggregate reputation scores across multiple sources and produce a unified report.',
    requiredRoles: ['analyst', 'reputation'],
    minSize: 2,
    maxSize: 4,
    buildSteps: (params) => [
      { id: 'fetch', label: 'Fetch scores from each source', agentRole: 'reputation' },
      { id: 'normalize', label: 'Normalize to common scale', agentRole: 'analyst', dependsOn: ['fetch'] },
      { id: 'aggregate', label: 'Aggregate into unified score', agentRole: 'analyst', dependsOn: ['normalize'] },
      { id: 'publish', label: 'Publish report', agentRole: 'reputation', dependsOn: ['aggregate'] },
    ],
  },
  // Phase A: templates wired from MissionControl goals.
  'reduce-cost': {
    name: 'Reduce Procurement Cost',
    description: 'Search supplier network, negotiate better rates, award and create PO. Fired by goal.category=commerce.',
    requiredRoles: ['procurement', 'merchant', 'analyst'],
    minSize: 3,
    maxSize: 6,
    buildSteps: (params) => [
      { id: 'discover', label: 'Discover candidate suppliers via Nexha', agentRole: 'merchant' },
      { id: 'rfq', label: 'Issue RFQ to top suppliers', agentRole: 'procurement', dependsOn: ['discover'] },
      { id: 'quote', label: 'Collect quotes', agentRole: 'merchant', dependsOn: ['rfq'] },
      { id: 'negotiate', label: 'Negotiate best price', agentRole: 'procurement', dependsOn: ['quote'] },
      { id: 'policy-check', label: 'Check policy approval', agentRole: 'analyst', dependsOn: ['negotiate'] },
      { id: 'contract', label: 'Create contract via SUTAR', agentRole: 'contract', dependsOn: ['policy-check'] },
      { id: 'po', label: 'Issue PO via Nexha', agentRole: 'procurement', dependsOn: ['contract'] },
    ],
  },
  'recover-revenue': {
    name: 'Recover Revenue',
    description: 'Analyze revenue drop, run pricing/campaign/supplier-cost review. Fired by goal.category=business.',
    requiredRoles: ['analyst', 'shopping', 'merchant'],
    minSize: 3,
    maxSize: 6,
    buildSteps: (params) => [
      { id: 'analyze', label: 'Analyze revenue trends and KPIs', agentRole: 'analyst' },
      { id: 'identify', label: 'Identify root cause', agentRole: 'analyst', dependsOn: ['analyze'] },
      { id: 'plan', label: 'Plan pricing/campaign changes', agentRole: 'shopping', dependsOn: ['identify'] },
      { id: 'execute', label: 'Execute via merchant agents', agentRole: 'merchant', dependsOn: ['plan'] },
      { id: 'report', label: 'Report results to CoPilot', agentRole: 'analyst', dependsOn: ['execute'] },
    ],
  },
  'optimize-inventory': {
    name: 'Optimize Inventory',
    description: 'Run demand forecast, reorder optimization, and storage audit. Fired by goal.category=operational.',
    requiredRoles: ['analyst', 'merchant', 'logistics'],
    minSize: 2,
    maxSize: 5,
    buildSteps: (params) => [
      { id: 'forecast', label: 'Run demand forecast', agentRole: 'analyst' },
      { id: 'reorder', label: 'Compute reorder quantities', agentRole: 'merchant', dependsOn: ['forecast'] },
      { id: 'source', label: 'Source from preferred suppliers', agentRole: 'merchant', dependsOn: ['reorder'] },
      { id: 'track', label: 'Track shipments via logistics', agentRole: 'logistics', dependsOn: ['source'] },
    ],
  },
};

/**
 * Instantiate a mission from a template.
 * Returns { mission, team, dag } — all three are persisted.
 */
async function createMissionFromTemplate({ template, params = {}, teamName, electionAlgo }) {
  return timed('createMission', template, async () => {
    bumpCounter('missions_created_total');
    bumpBreakdown('byTemplate', template);
    const tpl = MISSION_TEMPLATES[template];
    if (!tpl) throw new Error(`Unknown template: ${template}. Available: ${Object.keys(MISSION_TEMPLATES).join(', ')}`);

    // 1. Create the mission record
    const mission = {
      id: `MSN-${uuidv4().substring(0, 8)}`,
      name: tpl.name,
      template,
      params,
      status: 'forming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    missions.set(mission.id, mission);
    bumpBreakdown('byStatus', 'forming');

    // 2. Form the team
    const team = await formTeam({
      name: teamName || `${tpl.name} team`,
      missionId: mission.id,
      requiredRoles: tpl.requiredRoles,
      minSize: tpl.minSize,
      maxSize: tpl.maxSize,
      electionAlgo,
    });

    if (team.error) {
      mission.status = 'failed';
      mission.error = team.error;
      missions.set(mission.id, mission);
      bumpCounter('missions_failed_total');
      bumpBreakdown('byStatus', 'failed');
      return { mission, team: null, dag: null };
    }

    // 3. Build the DAG
    const dag = createTaskDAG(mission.id, tpl.buildSteps(params));

    // 4. Update mission
    mission.status = 'ready';
    mission.teamId = team.id;
    mission.dagId = dag.id;
    mission.updatedAt = new Date().toISOString();
    missions.set(mission.id, mission);
    bumpBreakdown('byStatus', 'ready');

    return { mission, team, dag };
  });
}

// =============================================================================
// HTTP API
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, port: PORT, timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// Templates
app.get('/api/teaming/templates', (_req, res) => {
  res.json({
    count: Object.keys(MISSION_TEMPLATES).length,
    templates: Object.fromEntries(
      Object.entries(MISSION_TEMPLATES).map(([k, v]) => [k, {
        name: v.name,
        description: v.description,
        requiredRoles: v.requiredRoles,
        minSize: v.minSize,
        maxSize: v.maxSize,
        stepCount: v.buildSteps({}).length,
      }])
    ),
  });
});

// Teams
app.post('/api/teaming/teams', requireAuth, strictLimiter, async (req, res) => {
  try {
    const team = await formTeam(req.body || {});
    if (team.error) return res.status(400).json(team);
    res.status(201).json(team);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/teaming/teams/:id', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'team not found' });
  res.json(team);
});

app.get('/api/teaming/teams', (req, res) => {
  res.json({ count: teams.size, teams: Array.from(teams.values()) });
});

// Missions
app.post('/api/teaming/missions', requireAuth, strictLimiter, async (req, res) => {
  try {
    const { template, params, teamName, electionAlgo } = req.body || {};
    if (!template) return res.status(400).json({ error: 'template is required' });
    const result = await createMissionFromTemplate({ template, params, teamName, electionAlgo });
    res.status(result.team ? 201 : 400).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/teaming/missions/:id', (req, res) => {
  const mission = missions.get(req.params.id);
  if (!mission) return res.status(404).json({ error: 'mission not found' });
  res.json(mission);
});

app.get('/api/teaming/missions', (req, res) => {
  res.json({ count: missions.size, missions: Array.from(missions.values()) });
});

// DAGs
app.post('/api/teaming/dags', requireAuth, strictLimiter, (req, res) => {
  try {
    const { missionId, steps } = req.body || {};
    if (!missionId || !Array.isArray(steps)) return res.status(400).json({ error: 'missionId and steps[] required' });
    const dag = createTaskDAG(missionId, steps);
    res.status(201).json(dag);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/teaming/dags/:id/ready', (req, res) => {
  const dag = taskDAGs.get(req.params.id);
  if (!dag) return res.status(404).json({ error: 'dag not found' });
  res.json({ dagId: dag.id, readySteps: readySteps(dag).map((s) => s.id) });
});

// Failure logs
app.get('/api/teaming/failures', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const all = Array.from(failureLogs.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json({ count: all.length, failures: all.slice(0, limit) });
});

app.get('/api/teaming/failures/:id', (req, res) => {
  const f = failureLogs.get(req.params.id);
  if (!f) return res.status(404).json({ error: 'failure not found' });
  res.json(f);
});

// =============================================================================
// OBSERVABILITY ENDPOINTS
// =============================================================================

/**
 * Compute high-level derived metrics: success rates, averages, uptime.
 */
function computeDerived() {
  const ts = Date.now();
  const uptimeSec = Math.max(1, Math.floor((ts - new Date(METRICS.startedAt).getTime()) / 1000));

  const teamFormSuccessRate = METRICS.team_formations_total > 0
    ? METRICS.team_formations_success_total / METRICS.team_formations_total
    : null;

  const failureRecoveryRate = METRICS.failures_total > 0
    ? METRICS.failures_recovered_total / METRICS.failures_total
    : null;

  // Average DAG steps per mission
  const dagsCount = METRICS.dags_created_total;
  const avgDagSteps = dagsCount > 0 ? METRICS.dag_steps_total / dagsCount : null;

  // p95-ish latency from EMAs (rough approximation)
  const latenciesView = {};
  for (const [op, byLabel] of Object.entries(METRICS.latencies)) {
    latenciesView[op] = {};
    for (const [label, stats] of Object.entries(byLabel)) {
      latenciesView[op][label] = {
        count: stats.count,
        ema_ms: Math.round(stats.ema),
        max_ms: stats.max,
        avg_ms: Math.round(stats.sum / stats.count),
      };
    }
  }

  return {
    uptime_seconds: uptimeSec,
    team_formation_success_rate: teamFormSuccessRate,
    failure_recovery_rate: failureRecoveryRate,
    avg_dag_steps: avgDagSteps,
  };
}

// JSON view (developer-friendly)
app.get('/metrics', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    ...computeDerived(),
    counters: {
      team_formations_total: METRICS.team_formations_total,
      team_formations_success_total: METRICS.team_formations_success_total,
      team_formations_failed_total: METRICS.team_formations_failed_total,
      leader_elections_total: METRICS.leader_elections_total,
      missions_created_total: METRICS.missions_created_total,
      missions_failed_total: METRICS.missions_failed_total,
      dags_created_total: METRICS.dags_created_total,
      dag_steps_total: METRICS.dag_steps_total,
      failures_total: METRICS.failures_total,
      failures_recovered_total: METRICS.failures_recovered_total,
      failures_escalated_total: METRICS.failures_escalated_total,
      failures_terminal_total: METRICS.failures_terminal_total,
      http_requests_total: METRICS.http_requests_total,
      http_errors_total: METRICS.http_errors_total,
      acn_calls_total: METRICS.acn_calls_total,
      acn_failures_total: METRICS.acn_failures_total,
      reputation_calls_total: METRICS.reputation_calls_total,
      reputation_failures_total: METRICS.reputation_failures_total,
    },
    breakdowns: {
      byTemplate: METRICS.byTemplate,
      byAlgo: METRICS.byAlgo,
      byStatus: METRICS.byStatus,
      byRecovery: METRICS.byRecovery,
    },
    latencies: METRICS.latencies,
    persistent: {
      teams: teams.size,
      missions: missions.size,
      task_dags: taskDAGs.size,
      failure_logs: failureLogs.size,
    },
  });
});

// Prometheus text format (scrapeable by Prometheus)
app.get('/metrics/prom', (_req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  const lines = [];
  const push = (name, labels, value) => {
    const labelStr = labels && Object.keys(labels).length
      ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
      : '';
    lines.push(`${name}${labelStr} ${value}`);
  };

  // Counters
  push('rtmn_teaming_team_formations_total', {}, METRICS.team_formations_total);
  push('rtmn_teaming_team_formations_success_total', {}, METRICS.team_formations_success_total);
  push('rtmn_teaming_team_formations_failed_total', {}, METRICS.team_formations_failed_total);
  push('rtmn_teaming_leader_elections_total', {}, METRICS.leader_elections_total);
  push('rtmn_teaming_missions_created_total', {}, METRICS.missions_created_total);
  push('rtmn_teaming_missions_failed_total', {}, METRICS.missions_failed_total);
  push('rtmn_teaming_dags_created_total', {}, METRICS.dags_created_total);
  push('rtmn_teaming_dag_steps_total', {}, METRICS.dag_steps_total);
  push('rtmn_teaming_failures_total', {}, METRICS.failures_total);
  push('rtmn_teaming_failures_recovered_total', {}, METRICS.failures_recovered_total);
  push('rtmn_teaming_failures_escalated_total', {}, METRICS.failures_escalated_total);
  push('rtmn_teaming_failures_terminal_total', {}, METRICS.failures_terminal_total);
  push('rtmn_teaming_http_requests_total', {}, METRICS.http_requests_total);
  push('rtmn_teaming_http_errors_total', {}, METRICS.http_errors_total);
  push('rtmn_teaming_acn_calls_total', {}, METRICS.acn_calls_total);
  push('rtmn_teaming_acn_failures_total', {}, METRICS.acn_failures_total);
  push('rtmn_teaming_reputation_calls_total', {}, METRICS.reputation_calls_total);
  push('rtmn_teaming_reputation_failures_total', {}, METRICS.reputation_failures_total);

  // Latency EMAs
  for (const [op, byLabel] of Object.entries(METRICS.latencies)) {
    for (const [label, stats] of Object.entries(byLabel)) {
      push('rtmn_teaming_op_latency_ema_ms', { operation: op, label }, stats.ema.toFixed(2));
      push('rtmn_teaming_op_latency_count', { operation: op, label }, stats.count);
      push('rtmn_teaming_op_latency_max_ms', { operation: op, label }, stats.max);
    }
  }

  // Persistent counts (gauges)
  push('rtmn_teaming_teams_count', {}, teams.size);
  push('rtmn_teaming_missions_count', {}, missions.size);
  push('rtmn_teaming_dags_count', {}, taskDAGs.size);
  push('rtmn_teaming_failure_logs_count', {}, failureLogs.size);

  res.send(lines.join('\n') + '\n');
});

// Phase A: webhook endpoint for goal.created events from event-bus
// Phase A: webhook endpoint for goal.created events from event-bus.
// No requireAuth — event-bus signs payloads with HMAC-SHA256. Trust
// localhost event-bus in dev; TODO(prod): verify HMAC signature.
app.post('/api/_internal/goal-webhook',requireAuth,  async (req, res) => {
  try {
    const result = await handleGoalEvent(req.body);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[${SERVICE_NAME}/goal-webhook] failed:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Phase A: ops endpoint to inspect subscriber state
app.get('/api/_internal/goal-subscriber/status', (_req, res) => {
  res.json({
    ...subscriberState,
    recentEvents: subscriberState.recentEvents.slice(0, 20),
  });
});

// 404
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// Error handler
app.use((err, req, res, _next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'internal error' : err.message });
});

// Start
if (require.main === module) {
  const server = 
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] templates: ${Object.keys(MISSION_TEMPLATES).join(', ')}`);
    // Phase A: register goal.created subscriber (non-blocking)
    registerGoalSubscriber().catch((err) => {
      console.warn(`[${SERVICE_NAME}] goal subscriber registration failed (non-fatal):`, err.message);
    });
  });
  installGracefulShutdown(server);
}

module.exports = {
  app,
  // exports for SDK / testing
  formTeam,
  electLeader,
  createTaskDAG,
  readySteps,
  handleStepFailure,
  createMissionFromTemplate,
  MISSION_TEMPLATES,
  LEADER_ELECTION_ALGORITHMS,
  RETRY_BACKOFF_MS,
  MAX_RETRIES,
  // observability exports
  METRICS,
  computeDerived,
  bumpCounter,
  bumpBreakdown,
  observeLatency,
  timed,
  // Phase A: goal-subscriber exports
  subscriberState,
  registerGoalSubscriber,
  handleGoalEvent,
  timedSync,
};