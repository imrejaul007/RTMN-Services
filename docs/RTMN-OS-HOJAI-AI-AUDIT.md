# RTMN OS — HOJAI AI Integration Audit

> **Audit Date:** June 20, 2026
> **Scope:** All 45 RTMN Operational Systems (Department + Industry + Foundation)
> **Question:** "How should each RTMN OS consume HOJAI AI services?"
> **Status:** 🟡 Most call HOJAI Foundation (Memory/Twin) directly; few use ai-intelligence or flow-orchestrator

---

## Executive Summary

RTMN OS services fall into 3 integration tiers with HOJAI AI:

| Tier | Pattern | Used By | Maturity |
|---|---|---|---|
| **Tier 1 — Foundation Direct** | Direct HTTP to MemoryOS (4703) / TwinOS (4705) | ~30 services via shared `industry-integration` | ✅ Mature |
| **Tier 2 — AI Capability** | Calls ai-intelligence (4881) for intent/sentiment/prediction/recommendation | Only sales-os + a few others | 🟡 Partial |
| **Tier 3 — Plan-Based** | Calls flow-orchestrator (4244) for multi-step plans | 0 services | ❌ Not adopted |

**Goal:** Promote all RTMN services from Tier 1 → Tier 3 where it adds value, with Tier 2 as the universal default.

---

## Tier 1 — Foundation Direct (Current Default)

### What's Wired

Most RTMN services include `industryIntegration` which provides:

```js
memoryOs: 'http://localhost:4703',  // MemoryOS
twinOs: 'http://localhost:4705',    // TwinOS Hub
```

**Pattern (used by hotel-os, beauty-os, restaurant-os, etc.):**

```js
// 1. Save data to memory
await clients.memoryOs.post('/api/store', { key: 'hotel:room:room_014', value: roomData });

// 2. Create/update twin
await clients.twinOs.post('/api/twins', { twinType: 'room', id: room.id, data: roomData });

// 3. Read twin back
const { data } = await clients.twinOs.get(`/api/twins/${twinType}/${id}`);
```

**Coverage:** ~30 of 45 services use this pattern (per `industryIntegration.registerRoutes`).

### What's Missing

| Gap | Impact |
|---|---|
| No `intent-agent` calls | RTMN services can't detect "is this customer comparing rooms or ready to book?" |
| No `sentiment-agent` calls | Can't flag negative customer feedback for escalation |
| No `prediction-agent` calls | Hotel can't predict cancellation risk; restaurant can't predict no-show |
| No `recommendation-agent` calls | No upsell suggestions, no next-best-action |

---

## Tier 2 — AI Capability via ai-intelligence (4881)

### What ai-intelligence offers (53 agents as of June 2026)

| Agent | Endpoint | Use Case in RTMN |
|---|---|---|
| `intent` | POST `/api/analyze` | Detect user intent (browse/buy/book/support) |
| `sentiment` | POST `/api/analyze` | Flag negative reviews, escalate angry customers |
| `retrieval` | POST `/api/analyze` | Answer "what was my last order?" from memory |
| `prediction` | POST `/api/analyze` | Churn risk, demand forecast, price elasticity |
| `recommendation` | POST `/api/analyze` | Next best action, cross-sell, upsell |
| `leadScoring` | POST `/api/analyze` | Qualify inbound leads |
| `churnPrediction` | POST `/api/analyze` | Flag at-risk customers in CS |
| `pricingOptimization` | POST `/api/analyze` | Dynamic pricing for hospitality |
| `contractAnalyzer` | POST `/api/analyze` | Legal OS contract review |
| `whatsappOrchestrator` | POST `/api/analyze` | Multi-turn WhatsApp conversations |
| `emailTriager` | POST `/api/analyze` | Auto-prioritize support inbox |
| `meetingAssistant` | POST `/api/analyze` | Extract action items from transcripts |
| `translator` | POST `/api/analyze` | Multi-language customer support |
| `liveSupportRouter` | POST `/api/analyze` | When to escalate to human agent |
| `+ 39 more` | POST `/api/analyze` | See [ai-intelligence/src/index.ts](../../companies/HOJAI-AI/services/ai-intelligence/src/index.ts) |

### Integration Pattern (Recommended)

```js
// In any RTMN service handler:
const analyze = await fetch('http://localhost:4881/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    intent: 'sentiment',  // which agent to run
    text: customerMessage,
    context: { customerId, tenantId, service: 'hotel-os' }
  })
});
const { sentiment, score, suggestedAction } = await analyze.json();

if (sentiment === 'negative' && score < -0.5) {
  // Escalate to live-support-os (4868) or notify concierge
  await fetch('http://localhost:4868/api/sessions', { method: 'POST', body: JSON.stringify({...}) });
}
```

---

## Per-Service Integration Recommendations

### Department OS (Horizontal)

| Service | Port | Should Call ai-intelligence For | Priority |
|---|---|---|---|
| **sales-os** | 5055 | lead scoring, churn prediction, pricing, contract analysis, commission | 🔴 Already wired |
| **marketing-os** | 5500 | campaign optimization, audience segmentation, content generation | 🔴 High |
| **customer-success-os** | 4050 | churn prediction, NPS sentiment, expansion recommendations | 🔴 High |
| **procurement-os** | 5096 | supplier risk, contract intelligence, demand forecasting | 🟡 Medium |
| **workforce-os** | 5077 | resume screening, attrition prediction, performance analysis | 🟡 Medium |
| **finance-os** | 4801 | anomaly detection, financial forecasting | 🟡 Medium |
| **operations-os** | 5250 | incident prediction, resource optimization, process mining | 🟡 Medium |
| **cxo-os** | 5100 | strategic forecasting, competitor analysis | 🟢 Lower (uses aggregated data) |
| **revenue-intelligence-os** | 5400 | demand forecasting, pricing, cohort analysis | 🔴 High |

### Industry OS — Promoted (Hotel, Restaurant, Beauty)

| Service | Port | Should Call ai-intelligence For | Tier |
|---|---|---|---|
| **hotel-os** | 5025 | sentiment (guest reviews), prediction (cancellation risk), recommendation (room upgrade), translator (multi-language), live-support-router (complaints) | Tier 2 |
| **restaurant-os** | 5010 | prediction (no-show risk), recommendation (dish upsell), sentiment (reviews) | Tier 2 |
| **beauty-os** | 5090 | recommendation (service add-on), sentiment (review), live-support-router (complaint) | Tier 2 |

### Industry OS — Stubs (need full rewrite before AI integration)

| Service | Port | Future AI Integration |
|---|---|---|
| healthcare-os | 5020 | triage, clinical decision support, symptom checker |
| retail-os | 5030 | recommendation engine, demand forecast, visual search |
| legal-os | 5035 | contract analysis, case law retrieval, document summarization |
| education-os | 5060 | student performance prediction, adaptive content, plagiarism detection |
| event-banquet-os | 4751 | attendee prediction, sentiment analysis, recommendation |
| exhibition-os | 5040 | lead scoring, attendee matching, follow-up automation |
| (and 19 more stubs) | various | TBD per industry |

### Foundation Services

| Service | Port | Already Wires ai-intelligence? |
|---|---|---|
| **CorpID** | 4702 | No — pure identity |
| **MemoryOS** | 4703 | No — pure memory |
| **TwinOS Hub** | 4705 | No — pure twin registry |

---

## Tier 3 — Plan-Based via flow-orchestrator (4244)

### What flow-orchestrator offers

Plan-based orchestration: a single API call invokes a sequence of steps across multiple services. Each step is a typed action (memory.read, twin.update, intelligence.analyze, comms.send, etc.).

```js
// Instead of this (Tier 1):
await memoryOs.post('/api/store', { key, value });
await twinOs.post('/api/twins', { twinType, id, data });
await intelligence.post('/api/analyze', { intent: 'sentiment', text });

// RTMN service can call this (Tier 3):
await flowOrchestrator.post('/api/plans/execute', {
  planId: 'guest-checkin-comprehensive',
  inputs: { guestId, roomId, businessId }
});
// Orchestrator handles: memory write + twin update + sentiment analysis + welcome email + WhatsApp message
```

### Why RTMN should adopt Tier 3

| Benefit | Current Pain (Tier 1) |
|---|---|
| Single API call for multi-step flows | RTMN services do 5+ HTTP calls per business action |
| Plan versioning + A/B testing | Hard-coded flows can't be experimented on |
| Audit trail of every step | Each service logs separately, hard to trace |
| Automatic retry + circuit breaker | RTMN services reimplement this per service |
| Plan marketplace (buy plans from Salar OS) | RTMN services reinvent workflows |

### Recommended Adoption Path

1. **Phase A** (Q3 2026): Wrap top 5 RTMN service flows as plan templates
   - `hotel.guest-checkin` (memory + twin + email + WhatsApp)
   - `restaurant.order-confirmed` (memory + twin + kitchen notify + loyalty)
   - `beauty.appointment-reminder` (memory + twin + WhatsApp + live-support check)
   - `sales.lead-qualified` (memory + twin + CRM + sales coach notify)
   - `cso.churn-flagged` (memory + twin + sentiment + live-support escalation)

2. **Phase B** (Q4 2026): Move all RTMN services to declare their flows as plan templates. Service code becomes thin handlers that invoke plans.

3. **Phase C** (Q1 2027): Plans become marketplace listings — RTMN services buy plans from Salar OS instead of building.

---

## Action Items (Next 90 Days)

| # | Action | Owner | Effort |
|---|---|---|---|
| 1 | Add `ai-intelligence` client to `industryIntegration` shared lib | Platform team | 1 day |
| 2 | Wire sentiment + prediction agents into hotel-os (5025) | Hotel team | 2 days |
| 3 | Wire recommendation + sentiment into restaurant-os (5010) | Restaurant team | 2 days |
| 4 | Wire recommendation into beauty-os (5090) | Beauty team | 1 day |
| 5 | Create 5 plan templates in flow-orchestrator (4244) | SUTAR team | 5 days |
| 6 | Migrate top 3 RTMN services to use plans | RTMN team | 1 week |
| 7 | Add `rtmn.os.uses_ai_intelligence` and `rtmn.os.uses_flow_orchestrator` tags to service registry | Platform team | 1 day |

---

## How to Verify a Service is Properly Integrated

```bash
# Does it call MemoryOS?
grep -l "memoryOs\|memory-os\|4703" industry-os/services/<svc>/src/index.js

# Does it call TwinOS?
grep -l "twinOs\|twin-os\|twinOS\|4705" industry-os/services/<svc>/src/index.js

# Does it call ai-intelligence?
grep -l "aiIntelligence\|ai-intelligence\|4881" industry-os/services/<svc>/src/index.js

# Does it call flow-orchestrator?
grep -l "flowOrchestrator\|flow-orchestrator\|4244" industry-os/services/<svc>/src/index.js
```

A "fully integrated" RTMN service hits all 4. Currently **0 services** are fully integrated. **sales-os** is closest (3 of 4).

---

*See also:*
- [RTMN Architecture](../../CLAUDE.md) — high-level overview
- [HOJAI AI CLAUDE.md](../../companies/HOJAI-AI/CLAUDE.md) — HOJAI AI services
- [Architecture v2](../../companies/HOJAI-AI/divisions/02-infrastructure-cloud/CLAUDE.md) — Flow Orchestrator spec
- [Division 9 Depth Pass](../../companies/HOJAI-AI/divisions/09-industry-solutions/CLAUDE.md) — which industries are ready for AI integration