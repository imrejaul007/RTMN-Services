# LoopOS - Persistent Autonomous Execution Layer

> **Version:** 1.0.0
> **Built:** June 29, 2026
> **Path:** `platform/flow/loop-os/`
> **Purpose:** Convert RTMN from task-based → persistent autonomous execution

---

## Overview

LoopOS implements **Loop Engineering** for HOJAI AI — the concept that AI agents should continuously discover work, execute tasks, verify results, persist state, and improve autonomously without manual prompting.

```
Traditional AI:        Human → Prompt → AI → Response → Done
LoopOS AI:             Human → Design Loop → Scheduler → Execute → Verify → Learn → Repeat
```

LoopOS provides the **autonomous execution infrastructure** that turns individual AI agents into self-managing AI employees.

---

## Architecture

```
LoopOS (Platform/flow/loop-os/)
│
├── loop-scheduler/        (Port 4721) — Cron-based persistent execution
├── loop-state/            (Port 4722) — State persistence + checkpoints
├── verification-engine/    (Port 4723) — Maker→Checker→Guardian pattern
├── budget-engine/         (Port 4724) — Token/spend/tool limits
└── fleet-os/             (Port 4725) — AI employee organization
```

### How They Connect

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LoopOS Flow                                  │
│                                                                      │
│  Scheduler ──► State Manager ──► Verification ──► Budget Check   │
│       │              │                │                │            │
│       │              │                │                │            │
│       └──────────────┴────────────────┴────────────────┘            │
│                              │                                      │
│                    Fleet OS (permissions)                            │
│                              │                                      │
│                    Execute Action                                    │
│                              │                                      │
│                    Record Outcome                                   │
│                              │                                      │
│                    Learn + Improve                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Services

### 1. Loop Scheduler (4721)

**Purpose:** Persistent autonomous execution engine

```javascript
// Create a loop
POST /api/loops
{
  "name": "Lead Qualification",
  "frequency": "*/5 * * * *",      // Every 5 minutes
  "targetTwinId": "sales-agent-001",
  "actions": [
    { "name": "check_leads" },
    { "name": "score_leads" },
    { "name": "assign_leads" }
  ],
  "budgetId": "budget-sales",
  "verificationPolicy": "high_risk",
  "maxRetries": 3
}
```

**Key Features:**
- Cron-based scheduling
- Manual trigger available
- Pause/resume/stop controls
- Execution history tracking
- Per-loop budget association

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/loops` | Create loop |
| GET | `/api/loops` | List loops |
| GET | `/api/loops/:id` | Get loop |
| PUT | `/api/loops/:id` | Update loop |
| DELETE | `/api/loops/:id` | Delete loop |
| POST | `/api/loops/:id/trigger` | Manual trigger |
| POST | `/api/loops/:id/stop` | Stop execution |
| POST | `/api/loops/:id/pause` | Pause loop |
| POST | `/api/loops/:id/resume` | Resume loop |
| GET | `/api/loops/:id/executions` | Execution history |

---

### 2. Loop State Manager (4722)

**Purpose:** Persist state between loop executions

```javascript
// Initialize state
POST /api/states
{
  "loopId": "loop-abc123",
  "goal": "Qualify and route leads",
  "initialContext": { "lastProcessedId": "lead-500" }
}

// Create checkpoint
POST /api/states/loop-abc123/checkpoints
{ "reason": "Before major processing step" }

// Restore from checkpoint
POST /api/checkpoints/cp-xyz/checkpoint-restore
```

**State Machine:**
```
idle → running → verifying → pending_approval → completed
                  ↓              ↓
               failed ←─────── cancelled
```

**Key Features:**
- State machine transitions with validation
- Checkpoint creation and restore
- Action recording with cost/token tracking
- Human approval workflow
- State history for debugging

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/states` | Initialize state |
| GET | `/api/states/:loopId` | Get state |
| PUT | `/api/states/:loopId` | Update state |
| POST | `/api/states/:loopId/transition` | State transition |
| POST | `/api/states/:loopId/checkpoints` | Create checkpoint |
| GET | `/api/states/:loopId/checkpoints` | List checkpoints |
| POST | `/api/checkpoints/:id/restore` | Restore checkpoint |
| POST | `/api/states/:loopId/actions` | Record action |
| POST | `/api/states/:loopId/approvals` | Request approval |
| POST | `/api/approvals/:id/respond` | Respond to approval |

---

### 3. Verification Engine (4723)

**Purpose:** Maker → Checker → Guardian verification pattern

```javascript
// Submit for verification
POST /api/verify
{
  "makerAgentId": "sales-agent-001",
  "content": "Proposal to offer 20% discount",
  "action": "send_discount_email",
  "riskLevel": "high",
  "policyId": "policy-sales"
}
```

**Verification Pipeline:**
```
Maker Agent
    ↓ (creates output)
Checker Agent (validates correctness)
    ↓ (checks accuracy)
Guardian Agent (policy/compliance)
    ↓ (checks rules)
Human Gate (if risk threshold exceeded)
    ↓
Execution or Rejection
```

**Guardian Types:**
- `security` — SQL injection, XSS, secrets detection
- `compliance` — Regulatory compliance
- `legal` — Legal review
- `privacy` — PII/GDPR checks
- `brand` — Brand voice/tone
- `policy` — Internal policy compliance

**Verification Policies:**
```javascript
// Create policy
POST /api/policies
{
  "name": "Sales Team Policy",
  "level": "maker_checker_guardian",
  "guardians": ["compliance", "brand", "security"],
  "riskThreshold": 0.5,
  "requireHumanAboveRisk": 0.8,
  "autoFailOnGuardian": true
}
```

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/verify` | Submit for verification |
| GET | `/api/verification/:id` | Get result |
| GET | `/api/verifications` | List verifications |
| POST | `/api/verification/:id/approve` | Human approve |
| POST | `/api/verification/:id/reject` | Human reject |
| POST | `/api/policies` | Create policy |
| GET | `/api/approvals` | Pending approvals |

---

### 4. Budget Engine (4724)

**Purpose:** Token, cost, and tool limits per AI agent

```javascript
// Create budget
POST /api/budgets
{
  "twinId": "sales-agent-001",
  "dailyTokens": 500000,
  "monthlyTokens": 15000000,
  "dailySpend": 100,
  "monthlySpend": 3000,
  "maxToolCalls": 1000,
  "riskLevel": "medium",
  "approvalThreshold": 50
}

// Check before action
POST /api/budgets/sales-agent-001/check
{ "tokens": 5000, "spend": 1.5, "toolCalls": 10 }

// Deduct after action
POST /api/budgets/sales-agent-001/deduct
{ "tokens": 5000, "spend": 1.5, "action": "generate_proposal" }
```

**Budget Limits:**
- Token limits (daily/monthly)
- Monetary spend limits (daily/monthly)
- Tool call limits
- Approval thresholds by risk

**Budget Status:**
- `active` — Normal operation
- `warning` — >80% used
- `exceeded` — >100% used
- `frozen` — Manually frozen
- `depleted` — Fully used

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/budgets` | Create budget |
| GET | `/api/budgets/:twinId` | Get budget + usage |
| PUT | `/api/budgets/:twinId` | Update budget |
| POST | `/api/budgets/:twinId/check` | Check if allowed |
| POST | `/api/budgets/:twinId/deduct` | Deduct usage |
| GET | `/api/budgets/:twinId/remaining` | Get remaining quota |
| GET | `/api/budgets/:twinId/usage` | Usage history |
| POST | `/api/budgets/:twinId/reset` | Reset usage |

---

### 5. Fleet Manager (4725)

**Purpose:** AI employee organization management

```javascript
// Create fleet
POST /api/fleets
{
  "name": "Sales Team",
  "department": "revenue",
  "ownerTwinId": "sales-director-001"
}

// Add agent to fleet
POST /api/fleets/fleet-abc/agents
{
  "twinId": "sales-agent-001",
  "role": "closer",
  "capabilities": [
    { "name": "negotiation", "proficiency": 0.9 },
    { "name": "crm", "proficiency": 0.95 }
  ],
  "reportsTo": "agent-manager-001",
  "initialTrustScore": 75
}
```

**Autonomy Levels:**
| Level | Name | Description |
|-------|------|-------------|
| 1 | Restricted | Needs approval for everything |
| 2 | Assisted | Routine auto, complex needs approval |
| 3 | Supervised | Most tasks, escalation for edge cases |
| 4 | Delegated | Full autonomy with reporting |
| 5 | Fully Autonomous | Complete autonomy |

**Fleet Health Dashboard:**
```javascript
GET /api/fleets/:id/health
{
  "fleetId": "fleet-abc",
  "totalAgents": 15,
  "healthyAgents": 12,
  "degradedAgents": 2,
  "offlineAgents": 1,
  "avgTrustScore": 78,
  "avgAutonomyLevel": 3.2,
  "totalCost": 12500.50
}
```

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/fleets` | Create fleet |
| GET | `/api/fleets` | List fleets |
| GET | `/api/fleets/:id` | Get fleet |
| PUT | `/api/fleets/:id` | Update fleet |
| POST | `/api/fleets/:id/agents` | Add agent |
| GET | `/api/fleets/:id/health` | Fleet health |
| POST | `/api/fleets/:id/escalate` | Escalate issue |
| POST | `/api/capabilities` | Register capability |
| GET | `/api/capabilities/:cap/agents` | Find by capability |

---

## Integration with Existing Stack

```
CorpID (4702)
    ↓
MemoryOS (4703)
    ↓
TwinOS (4705)
    ↓
GoalOS (4297/4242)
    ↓
LoopOS ← NEW
├── Scheduler (4721)
├── State (4722)
├── Verification (4723)
├── Budget (4724)
└── Fleet (4725)
    ↓
VerificationOS (4866)
    ↓
TrustOS
    ↓
SimulationOS (4300)
    ↓
SUTAR OS
    ↓
Nexha
```

---

## Startup

```bash
# Start all LoopOS services
cd companies/HOJAI-AI/platform/flow/loop-os

# Start individual services
cd loop-scheduler && npm start   # Port 4721
cd loop-state && npm start      # Port 4722
cd verification-engine && npm start  # Port 4723
cd budget-engine && npm start   # Port 4724
cd fleet-os && npm start        # Port 4725

# Or use the combined startup
node loop-scheduler/src/index.js &
node loop-state/src/index.js &
node verification-engine/src/index.js &
node budget-engine/src/index.js &
node fleet-os/src/index.js &
```

---

## Example: End-to-End Loop

```javascript
// 1. Create a budget for the agent
POST /api/budgets (4724)
{ "twinId": "sales-agent-001", "dailyTokens": 500000 }

// 2. Create a fleet for the team
POST /api/fleets (4725)
{ "name": "Sales Team", "department": "revenue" }

// 3. Add agent to fleet
POST /api/fleets/:id/agents (4725)
{ "twinId": "sales-agent-001", "role": "sales_rep" }

// 4. Create a verification policy
POST /api/policies (4723)
{ "name": "Sales Policy", "guardians": ["compliance", "brand"] }

// 5. Initialize loop state
POST /api/states (4722)
{ "loopId": "loop-sales-001", "goal": "Qualify and close deals" }

// 6. Create the loop
POST /api/loops (4721)
{
  "name": "Daily Lead Qualification",
  "frequency": "0 9 * * *",  // 9 AM daily
  "targetTwinId": "sales-agent-001",
  "actions": [
    { "name": "fetch_leads" },
    { "name": "score_leads" },
    { "name": "send_proposals" }
  ],
  "budgetId": "sales-agent-001",
  "verificationPolicy": "sales-policy"
}

// The loop now runs automatically!
// - Scheduler triggers at 9 AM
// - State Manager tracks progress
// - Budget Engine limits tokens/spend
// - Verification validates outputs
// - Fleet tracks agent health
```

---

## Key Concepts

### Maker-Checker-Guardian Pattern

Never trust a single AI agent output:

```
BAD:  Agent → Output → Execute (unacceptable for enterprises)

GOOD: Maker Agent → Checker Agent → Guardian Agent → Human Gate → Execute
```

### Progressive Autonomy

New AI employees start restricted and earn more autonomy:

```
Level 1: Restricted    → Needs approval for everything
Level 2: Assisted       → Routine auto, complex needs approval
Level 3: Supervised     → Most tasks, escalation for edge cases
Level 4: Delegated      → Full autonomy with reporting
Level 5: Fully Autonomous → Complete autonomy
```

### Budget Enforcement

Every AI employee has hard limits:

```
Token limits:     500k/day, 15M/month
Spend limits:      $100/day, $3000/month
Tool call limits: 1000/day
Risk thresholds:   Auto-escalate above 80% budget
```

---

## Status

| Service | Port | Status | Tests |
|---------|------|--------|-------|
| Loop Scheduler | 4721 | ✅ Built | ✅ |
| Loop State | 4722 | ✅ Built | ✅ |
| Verification Engine | 4723 | ✅ Built | ✅ |
| Budget Engine | 4724 | ✅ Built | ✅ |
| Fleet Manager | 4725 | ✅ Built | ✅ |

---

## Next Steps

1. **Connect to TwinOS** — Agents should be TwinOS entities
2. **Connect to SimulationOS** — Validate agents in simulation before production
3. **Connect to TrustOS** — Trust scores drive autonomy levels
4. **Build Loop Templates** — Pre-built loops for common use cases
5. **Build Loop Marketplace** — Share loops across organizations

---

*LoopOS transforms HOJAI from a collection of AI services into an autonomous operating system for AI-native organizations.*
