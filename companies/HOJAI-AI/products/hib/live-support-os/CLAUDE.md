# live-support-os

> **Service:** Live Support OS
> **Port:** 4868
> **Layer:** 5 (Communication Cloud — Channel Services)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

**Human-in-the-loop escalation router** — the layer that decides when an AI
agent should hand off to a human, which queue, and which available agent
(skill-matched + language-matched). Builds a structured handoff package so
the human agent has full context.

Pure routing logic — no external provider required.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts (sessions, queues, agents, policies, handoffs) |
| GET | `/api/queues` | List support queues (4 seeded) |
| POST | `/api/queues` | Create a queue |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/available` | List available agents (filterable by skill) |
| PATCH | `/api/agents/:id/status` | Update agent status (available/busy/offline/break) |
| GET | `/api/policies` | List escalation policies (1 default seeded) |
| POST | `/api/policies` | Create a new policy |
| POST | `/api/sessions` | **Create a session — runs decision engine + assigns if escalation needed** |
| GET | `/api/sessions` | List sessions (filter by status/queue/agent) |
| GET | `/api/sessions/:id` | Get one session |
| POST | `/api/sessions/:id/close` | Close a session + free the agent |
| GET | `/api/handoffs/:id` | Get a handoff package |

## Decision Engine

The decision engine evaluates these triggers (in priority order):

| Trigger | Reason | Queue | Urgency |
|---------|--------|-------|---------|
| `priority === P0` | urgent_priority | q-vip | immediate |
| `userRequestedHuman === true` | user_request | q-general | normal |
| `sentiment === negative && aiConfidence < 0.7` | negative_sentiment | q-general | high |
| `category ∈ {legal, medical, fraud, account_takeover, data_export, cancel}` | sensitive_category | depends on category | high |
| `aiConfidence < 0.55` (configurable threshold) | low_ai_confidence | q-general | normal |

If none trigger: status becomes `ai_active` and the AI agent continues.

## Seeded Queues (4)

| ID | Name | Skills | Priority | SLA |
|----|------|--------|----------|-----|
| `q-billing` | Billing Support | billing, invoices, refunds | P2 | 30 min |
| `q-tech` | Technical Support | bugs, errors, integrations, api | P1 | 15 min |
| `q-vip` | VIP / Enterprise | enterprise, vip, sla | P0 | 5 min |
| `q-general` | General Support | general | P3 | 60 min |

## Seeded Agents (5)

| ID | Name | Skills | Max Concurrent |
|----|------|--------|----------------|
| `a-001` | Priya Sharma | billing, invoices, refunds, **hindi** | 3 |
| `a-002` | Marcus Lee | bugs, errors, api, integrations | 2 |
| `a-003` | Sofia Garcia | enterprise, vip, sla, **spanish** | 2 |
| `a-004` | Kenji Tanaka | general, **japanese** | 4 |
| `a-005` | Amira Hassan | billing, invoices, refunds, **arabic** | 3 |

## Agent Matching Score

`score = +3 per matching skill + 5 for language match - 2 per active session + capacityHeadroom tiebreaker`

Strong language preference (5 pts) ensures a Hindi-speaking customer gets
Priya over Kenji even if Kenji has more free capacity.

## Handoff Package

```json
{
  "customerId": "cust-5",
  "channel": "chat",
  "language": "hindi",
  "category": "billing",
  "priority": "P3",
  "sentiment": "neutral",
  "aiConfidence": 0.4,
  "reason": "low_ai_confidence",
  "history": [...],
  "recommendedNextActions": [
    "Acknowledge customer frustration if sentiment is negative",
    "Confirm customer identity via phone OTP",
    "Use hindi for response"
  ]
}
```

## Integration

- **ai-intelligence (4881)**: agent `liveSupportRouter` (create-session, decide-escalation, pick-agent, build-handoff, list-agents, list-queues, update-agent-status)
- **unified-os-hub (4399)**: `/api/live-support/*` → service URL
- **Email OS (4862)**: when triage returns `human_review`, route to live-support
- **Customer Success OS (4050)**: when churn risk is high, open a support session
- **Sales OS (5055)**: when sales escalation needed, route to q-vip

## Use Cases

1. AI confidence drops below 0.55 → route to general queue
2. Customer in Hindi gets Priya (Hindi speaker), not Kenji
3. P0 billing complaint → VIP queue with `assigned_urgent` status
4. Customer explicitly asks for human → immediate escalation
5. Sensitive category (legal, medical) → always escalate
