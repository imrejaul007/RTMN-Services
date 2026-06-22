# Plan: Nexha Phase A — Wire the 4-Layer Pipeline

> **Date:** 2026-06-22
> **Audit:** NEXHA-3-LAYER-AUDIT.md (lossless, complete)
> **Goal:** Connect CoPilot → GoalOS → Flow Orchestrator → Agent Teaming → Nexha so the 14-step "Reduce ingredient cost 15%" flow actually fires end-to-end.
> **Scope:** ~510 LOC across 5 files. NO new agents. NO new foundation services. NO external clients.

---

## Background

The 4-layer architecture is 75% built but the pipeline between layers is broken:

| Step | Layer | Real code | Wired? |
|------|-------|-----------|:------:|
| CoPilot understands | CoPilot | 380 LOC, 22 endpoints | ❌ |
| GoalOS creates target | Foundation | 215+routes, Redis | ❌ |
| Flow Orchestrator | Foundation | 1,463 LOC, DAG executor | ❌ |
| Agent Teaming | SUTAR | 802 LOC, missions+DAGs | ❌ |
| Nexha → SUTAR bridge | Connect→Execute | 348 LOC, 13 services | ✅ |
| PolicyOS | Foundation | 2,043 LOC | ✅ |
| Procurement OS | Connect | 5,117 LOC | ✅ |
| Logistics | External | real | ✅ |

**End-to-end wiring: 28% (4 of 14 steps).** Phase A closes the 4 gaps.

---

## Architecture: The Wiring Chain

```
                    ┌─────────────────────────┐
   ┌────────┐       │  Phase A — NEW           │
   │ KPI    │       │  mission-control@4960    │
   │ breach ├──────►│  • Polls executive-copilot│
   └────────┘ 5min  │  • Creates goal          │
        ▲           │  • Registers sub         │
        │           └────────────┬─────────────┘
        │                        │ POST /api/events
        │                        ▼
        │           ┌─────────────────────────┐
        │           │  event-bus@4510 (exists) │
        │           └────────────┬─────────────┘
        │                        │ webhook to subscribers
        │                        ▼
        │           ┌─────────────────────────┐
        │           │  flow-orchestrator@4244  │
        │           │  • subscribed to         │
        │           │    'goal.created'        │
        │           │  • picks template        │
        │           │  • runs plan             │
        │           └────────────┬─────────────┘
        │                        │ POST /api/sutar/agent-teaming/api/teaming/missions
        │                        ▼
        │           ┌─────────────────────────┐
        │           │  agent-teaming@4853      │
        │           │  • subscribed            │
        │           │  • creates mission       │
        │           │  • forms team            │
        │           └────────────┬─────────────┘
        │                        │ POST /api/sutar/<service>/* (via gateway)
        │                        ▼
        │           ┌─────────────────────────┐
        │           │  Nexha + SUTAR           │
        │           │  procurement-os,         │
        │           │  policy-os, contracts,   │
        │           │  negotiation, logistics  │
        │           └─────────────────────────┘
```

---

## Files to create / modify

### 1. CREATE: `companies/HOJAI-AI/products/mission-control/src/index.js` (~300 LOC)

**Purpose:** The "Business Mission Control" cron. Polls executive-copilot KPIs every 5 minutes, detects threshold breaches, and fires a goal into GoalOS.

**Pattern source:** `companies/HOJAI-AI/products/copilots/executive-copilot/src/index.js` (380 LOC, has the same @rtmn/shared/security + requireAuth + PersistentMap pattern).

**Endpoints:**
- `GET /health` — service info, count of active missions
- `GET /` — redirect to /health
- `POST /api/missions/check-now` (auth) — manually trigger a check
- `GET /api/missions` — list missions (from memory)
- `GET /api/missions/:id` — one mission
- `GET /api/rules` — list threshold rules
- `PUT /api/rules/:id` (auth) — update a rule

**Default rules (4):**
1. If `kpi.procurement_cost_change > 0.10` (10% increase) → create goal "Reduce procurement cost"
2. If `kpi.customer_churn > 0.05` → create goal "Reduce churn"
3. If `kpi.revenue_change < -0.10` (10% drop) → create goal "Recover revenue"
4. If `kpi.inventory_turnover < 4` → create goal "Optimize inventory"

**Logic per check tick:**
```js
async function tick() {
  // 1. Fetch KPIs from executive-copilot
  const kpis = await fetch(`${EXEC_COPILOT}/api/kpis`).then(r => r.json());
  
  // 2. For each rule, evaluate
  for (const rule of RULES) {
    const kpi = kpis.kpis.find(k => k.id === rule.kpiId);
    if (!kpi) continue;
    if (rule.evaluate(kpi)) {
      // 3. Check we haven't already created a mission for this rule recently (dedupe window)
      if (recentlyFired(rule.id, 24 * 60 * 60 * 1000)) continue;
      
      // 4. Create goal in goal-os
      const goal = await fetch(`${GOAL_OS}/api/goals`, {
        method: 'POST',
        body: JSON.stringify({
          title: rule.goalTitle,
          description: rule.goalDescription,
          ownerCorpId: kpi.businessId || 'demo',
          category: rule.category,
          level: 'goal',
          priority: rule.priority,
          metrics: rule.metrics,
        })
      }).then(r => r.json());
      
      // 5. Record mission locally
      missions.set(goal.id, { id: goal.id, ruleId: rule.id, kpi, goal, firedAt: Date.now() });
    }
  }
}

setInterval(tick, POLL_INTERVAL_MS); // default 5 min
```

**Dependencies (port mappings):**
- `EXEC_COPILOT_URL` (default `http://localhost:4933`)
- `GOAL_OS_URL` (default `http://localhost:4242`)
- `EVENT_BUS_URL` (default `http://localhost:4510`)
- `POLL_INTERVAL_MS` (default `300000` = 5 min)

---

### 2. CREATE: `companies/HOJAI-AI/products/mission-control/package.json` (~20 LOC)

Standard package.json following the executive-copilot template:
- name: `rtmn-mission-control`
- main: `src/index.js`
- scripts: `start`, `dev`
- deps: express, cors, helmet, uuid, @rtmn/shared/lib/*

---

### 3. MODIFY: `companies/HOJAI-AI/platform/flow/goal-os/src/routes/goals.js` (+~30 LOC)

**Change:** After a goal is created (line ~166), emit a `goal.created` event to event-bus.

**Insertion point:** After `await redis.set(`goal:${goalId}`, JSON.stringify(goal));` in the POST `/` handler (currently line 166).

**New code (~30 LOC):**
```js
// Emit goal.created event to event-bus (Phase A wiring)
import { eventBusClient } from '../lib/event-bus-client.js';
// ...
await redis.set(`goal:${goalId}`, JSON.stringify(goal));
// ... existing indexes ...

// Fire-and-forget event emit (does not block goal creation)
eventBusClient.publish('goal.created', {
  goalId: goal.id,
  title: goal.title,
  category: goal.category,
  level: goal.level,
  priority: goal.priority,
  ownerCorpId: goal.ownerCorpId,
  deadline: goal.deadline,
  metrics: goal.metrics,
}).catch(err => console.warn('[goal-os] event emit failed:', err.message));

res.status(201).json(goal);
```

---

### 4. CREATE: `companies/HOJAI-AI/platform/flow/goal-os/src/lib/event-bus-client.js` (~25 LOC)

**Purpose:** Tiny client to publish events to event-bus.

```js
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const SOURCE = process.env.SERVICE_NAME || 'goal-os';

export const eventBusClient = {
  async publish(type, payload, headers = {}) {
    const r = await fetch(`${EVENT_BUS_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ type, source: SOURCE, payload }),
      signal: AbortSignal.timeout(3000),
    });
    return { ok: r.ok, status: r.status };
  }
};
```

---

### 5. CREATE: `companies/HOJAI-AI/platform/flow/flow-orchestrator/src/subscribers/goal-subscriber.js` (~80 LOC)

**Purpose:** Flow Orchestrator listens to `goal.created` and runs a matching plan template.

**On startup:**
1. Register subscription on event-bus: `typePattern: 'goal.created'`
2. Webhook target: `POST ${self}/api/_internal/goal-webhook`
3. On receive: lookup template by goal.category, instantiate it as a plan, run it via `runPlan`

```js
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const FLOW_PORT = process.env.PORT || 4244;
const SELF_URL = process.env.SELF_URL || `http://localhost:${FLOW_PORT}`;

// Map goal categories → flow templates
const GOAL_TO_TEMPLATE = {
  business: 'decide-and-act',
  operational: 'answer-question',
  commerce: 'negotiate-and-execute',
  ai: 'simulate-then-recommend',
  product: 'answer-question',
  personal: 'personal-assistant',
};

export async function registerGoalSubscriber() {
  const r = await fetch(`${EVENT_BUS_URL}/api/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typePattern: 'goal.created',
      webhookUrl: `${SELF_URL}/api/_internal/goal-webhook`,
      retryPolicy: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
    }),
  });
  return r.json();
}

export async function handleGoalEvent(event) {
  const goal = event.payload || {};
  const tplName = GOAL_TO_TEMPLATE[goal.category] || 'answer-question';
  
  // Instantiate template as a new plan
  const planRes = await fetch(`${SELF_URL}/api/templates/${tplName}/instantiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `goal-${goal.goalId}`, context: { goal } }),
  });
  const plan = await planRes.json();
  
  // Run the plan async
  await fetch(`${SELF_URL}/api/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId: plan.id, twinId: null, context: { goal } }),
  });
}
```

---

### 6. MODIFY: `companies/HOJAI-AI/platform/flow/flow-orchestrator/src/index.js` (+~20 LOC)

**Change:** Register subscriber on startup, add webhook handler.

**Insertion point 1:** After `installGracefulShutdown(server);` (~line 1421):
```js
// Phase A: subscribe to goal.created events
import { registerGoalSubscriber, handleGoalEvent } from './subscribers/goal-subscriber.js';
registerGoalSubscriber().catch(err => console.warn('[flow-orchestrator] subscriber registration failed:', err.message));
```

**Insertion point 2:** Add route handler near other routes:
```js
app.post('/api/_internal/goal-webhook', async (req, res) => {
  try {
    await handleGoalEvent(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

### 7. MODIFY: `companies/HOJAI-AI/sutar-os/agents/agent-teaming/src/index.js` (+~50 LOC)

**Change:** Subscribe to `goal.created` and create mission when goal category warrants.

**Logic:**
- On startup, register subscription for `goal.created` with webhook URL
- On receive, if goal.category ∈ ['business', 'operational', 'commerce'], create mission
- Mission name: `goal-${goal.goalId}`
- Template: `reduce-cost`, `recover-revenue`, or generic

---

### 8. MODIFY: `companies/HOJAI-AI/products/copilots/executive-copilot/src/index.js` (+~50 LOC)

**Change:** When `/api/decisions/analyze` returns `impact: 'high'`, auto-create goal in GoalOS.

**Insertion point:** In the existing `POST /api/decisions/analyze` handler.

---

## Total LOC

| File | LOC | Type |
|------|----:|------|
| `mission-control/src/index.js` | 300 | NEW |
| `mission-control/package.json` | 20 | NEW |
| `goal-os/src/routes/goals.js` | +30 | MOD |
| `goal-os/src/lib/event-bus-client.js` | 25 | NEW |
| `flow-orchestrator/src/subscribers/goal-subscriber.js` | 80 | NEW |
| `flow-orchestrator/src/index.js` | +20 | MOD |
| `agent-teaming/src/index.js` | +50 | MOD |
| `executive-copilot/src/index.js` | +50 | MOD |
| **TOTAL** | **~575 LOC** | **3 NEW + 4 MOD** |

Slightly over the 510 LOC estimate but well within the spirit.

---

## Execution order

1. **Step 1:** Create `mission-control/` service (new package, new src, package.json)
2. **Step 2:** Add `event-bus-client.js` to goal-os
3. **Step 3:** Modify `goals.js` to emit `goal.created` event
4. **Step 4:** Add goal-subscriber.js to flow-orchestrator
5. **Step 5:** Modify flow-orchestrator/src/index.js to register + handle webhook
6. **Step 6:** Modify agent-teaming to subscribe + create mission
7. **Step 7:** Modify executive-copilot to auto-create goal on high-impact decision
8. **Step 8:** Smoke-test the wiring chain end-to-end

---

## Verification

After each step:
- `wc -l` the modified file to confirm LOC
- `node -c` syntax check
- Manual test: start each service, fire a test event, verify it propagates

End-to-end test (Phase A success criteria):
```bash
# 1. Start services in order
node companies/HOJAI-AI/platform/observability/event-bus/src/index.js &  # 4510
node companies/HOJAI-AI/platform/flow/goal-os/src/index.js &            # 4242
node companies/HOJAI-AI/platform/flow/flow-orchestrator/src/index.js &  # 4244
node companies/HOJAI-AI/sutar-os/agents/agent-teaming/src/index.js &    # 4853
node companies/HOJAI-AI/products/copilots/executive-copilot/src/index.js & # 4933
node companies/HOJAI-AI/products/mission-control/src/index.js &         # 4960

# 2. Trigger a KPI breach
curl -X POST http://localhost:4960/api/missions/check-now

# 3. Verify goal was created
curl http://localhost:4242/api/goals/status/active

# 4. Verify plan was instantiated
curl http://localhost:4244/api/plans | jq '.plans[].name'

# 5. Verify mission was created in agent-teaming
curl http://localhost:4853/api/teaming/missions | jq '.missions[].name'

# 6. Verify event was logged in event-bus
curl http://localhost:4510/api/events?type=goal.created
```

---

## Risk mitigation

| Risk | Mitigation |
|------|------------|
| Event-bus not running | Wrap emit in try/catch; never block goal creation |
| Subscriber service down | Event-bus has retry + DLQ (already built) |
| Goal with unknown category | Default template `answer-question` |
| Infinite loop (goal → flow → goal) | Filter: only fire mission for `business/operational/commerce` categories |
| Existing tests break | All changes are additive; existing endpoints untouched |

---

## What I'm NOT doing (explicit non-goals)

- ❌ NOT building new agents
- ❌ NOT modifying any external client code
- ❌ NOT touching the 24 industry OS beyond restaurant-os
- ❌ NOT changing existing data models
- ❌ NOT adding new DB schemas
- ❌ NOT changing the gateway registry (no new ports yet)
- ❌ NOT refactoring existing well-working code (corpID, twin-os, etc.)

---

## Commit strategy

After Phase A completes and smoke-tests pass:
- 1 commit per logical change (mission-control, goal-os event, flow-orchestrator subscriber, agent-teaming subscriber, executive-copilot hook)
- Final integration commit on branch
- No force pushes

---

*Plan ready for approval. Approve to begin execution.*