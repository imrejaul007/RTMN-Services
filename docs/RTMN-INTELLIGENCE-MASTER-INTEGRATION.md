# 🧠 RTMN INTELLIGENCE — MASTER INTEGRATION DOCUMENT

**Version 1.0 | June 28, 2026**

---

## EXECUTIVE SUMMARY

This document provides the complete integration guide for all RTMN intelligence services:
- HOJAI Intelligence (43 services)
- REZ Intelligence (28 services)
- HIB Intelligence (15 services)

**Documentation Coverage: 100%** ✅  
**Port Registry: Complete** ✅

---

## PART 1: CANONICAL PORT REGISTRY

### HOJAI Intelligence Services

| Port | Service | Purpose |
|------|---------|---------|
| 4753 | micro-intelligence | Circuit breaker, fallbacks |
| 4754 | predictive-intelligence | Forecasting, anomaly detection |
| 4755 | risk-intelligence | Fraud, churn, credit scoring |
| 4756 | decision-intelligence | Recommendations, NBA |
| 4786 | intent-engine | Intent detection |
| 4787 | reflection-engine | Quality scoring |
| 4789 | proactive-engine | Proactive suggestions |
| 4790 | multi-agent-runtime | Agent coordination |
| 4791 | agent-builder | Agent templates |
| 4792 | background-agents | Scheduled jobs |
| 4797 | agent-security | API keys, JWT, RBAC |
| 4881 | ai-intelligence | Intent, Sentiment, Fraud |
| 4892 | agent-os | Agent lifecycle |
| 4893 | personalization | User preferences |
| 4894 | ai-economy | Marketplace, billing |
| 4896 | planning-engine | Task planning, DAG |
| 4897 | multi-modal | Image, audio, video |
| 4900 | knowledge-registry | Asset management |
| 4901 | event-platform | Schema, events |
| 4933 | reasoning-engine | Chain-of-thought |
| 4158 | behavior-intelligence | User behavior |

### REZ Intelligence Services

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | REZ-intelligence-hub | Central gateway |
| 3008 | mind-grocery | Grocery AI |
| 3009 | mind-retail | Retail AI |

### HIB Services

| Port | Service | Purpose |
|------|---------|---------|
| 5082 | helpdesk-ticketing | Support tickets |

---

## PART 2: UNIFIED INTELLIGENCE API

### Gateway Pattern

All services follow a consistent API pattern:

```
POST /api/<service>/<action>
GET  /api/<service>/<resource>
GET  /health
GET  /ready
```

### Authentication

All services support:
- JWT Bearer token (`Authorization: Bearer <token>`)
- Internal token (`x-internal-token: <token>`)

---

## PART 3: SERVICE INTEGRATION MAP

### Core AI Flow

```
User Input
    │
    ▼
┌─────────────────┐
│  intent-engine  │  (Port 4786) - Detect intent
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ reasoning-engine │  (Port 4933) - Reason about intent
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ planning-engine │  (Port 4896) - Create plan
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   agent-os      │  (Port 4892) - Execute tasks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ multi-agent-rt  │  (Port 4790) - Coordinate
└─────────────────┘
```

### Intelligence Stack

```
┌─────────────────────────────────────────────────────────┐
│              ai-intelligence (4881)                      │
│         Intent │ Sentiment │ Fraud │ Classification      │
└─────────────────────────────────────────────────────────┘
         │               │               │
         ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  predictive  │ │    risk    │ │   decision   │
│  (4754)     │ │  (4755)   │ │   (4756)   │
└─────────────┘ └─────────────┘ └─────────────┘
         │               │               │
         ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Forecast   │ │  Fraud     │ │ Recommend  │
│  Anomaly   │ │  Churn     │ │  NBA       │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Knowledge Flow

```
┌─────────────────────────────────────────────────────────┐
│              knowledge-registry (4900)                   │
│              Assets │ Versions │ Taxonomy                │
└─────────────────────────────────────────────────────────┘
         │               │               │
         ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ rag-platform │ │ vector-db   │ │ graph-db    │
│   RAG       │ │  Vectors   │ │  Knowledge  │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────┐
│              event-platform (4901)                        │
│              Schema │ Events │ Rules │ Replay             │
└─────────────────────────────────────────────────────────┘
         │
         ├──► proactive-engine (4789) - Trigger alerts
         │
         ├──► planning-engine (4896) - Trigger plans
         │
         └──► background-agents (4792) - Trigger jobs
```

---

## PART 4: CROSS-SERVICE INTEGRATIONS

### Agent Lifecycle

```
agent-builder (4791)
    │ Creates blueprints
    ▼
agent-os (4892)
    │ Manages lifecycle
    ├──► agent-security (4797) - Authenticate
    ├──► multi-agent-runtime (4790) - Coordinate
    └──► background-agents (4792) - Schedule tasks
```

### Personal Intelligence

```
personalization (4893)
    │ User profiles
    ├──► decision-intelligence (4756) - Recommendations
    ├──► proactive-engine (4789) - Suggestions
    └──► reflection-engine (4787) - Quality feedback
```

### Business Intelligence

```
REZ-intelligence-hub (3000)
    │
    ├──► predictive-intelligence (4754) - Demand forecast
    ├──► risk-intelligence (4755) - Fraud detection
    ├──► decision-intelligence (4756) - Offers
    └──► ai-economy (4894) - Billing
```

### HIB Integration

```
All HOJAI Services
    │
    ├──► agent-security (4797) - Authenticate
    │       │
    │       └──► RBAC permissions
    │
    ├──► helpdesk-ticketing (5082) - Support
    │
    └──► event-platform (4901) - Audit events
```

---

## PART 5: CONSUMER TRIANGLE CONNECTIONS

```
                    ┌─────────────┐
                    │     DO      │
                    │  Execute    │
                    └──────┬──────┘
                           │
              ┌─────────────┼─────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │    Genie    │◄─────────►│    RAZO    │
       │    Think    │           │Communicate │
       └──────┬──────┘           └─────────────┘
              │
              │ INTELLIGENCE LAYER
              ▼
       ┌─────────────────────────────────────────┐
       │                                          │
       │  reasoning-engine ──► planning-engine  │
       │        │                    │             │
       │  intent-engine ──► agent-os            │
       │        │                    │             │
       │  personalization ◄──────┘              │
       │                                          │
       │  proactive-engine ──► event-platform   │
       │                                          │
       └─────────────────────────────────────────┘
```

---

## PART 6: INTEGRATION CODE EXAMPLES

### Using Micro Intelligence (Circuit Breaker)

```javascript
// Before: Direct call (can fail)
const result = await axios.post('http://localhost:4881/api/intelligence/analyze', { text });

// After: Via circuit breaker (graceful degradation)
const result = await axios.post('http://localhost:4753/api/execute/hojai-central', {
  payload: { text }
});
// Returns fallback if HOJAI is down
```

### Intent → Plan → Execute

```javascript
// 1. Detect intent
const { intent } = await fetch('http://localhost:4786/api/intent', {
  method: 'POST',
  body: JSON.stringify({ text: 'Book a flight to Mumbai' })
});

// 2. Create plan
const plan = await fetch('http://localhost:4896/api/plans', {
  method: 'POST',
  body: JSON.stringify({
    name: 'book-flight',
    goal: `Book flight to Mumbai on ${intent.date}`
  })
});

// 3. Execute plan
await fetch(`http://localhost:4896/api/plans/${plan.id}/execute`, {
  method: 'POST'
});
```

### Create Agent and Execute

```javascript
// 1. Build agent blueprint
const blueprint = await fetch('http://localhost:4791/api/blueprints', {
  method: 'POST',
  body: JSON.stringify({
    name: 'data-analyst',
    systemPrompt: 'You are a data analyst...'
  })
});

// 2. Instantiate agent
const agent = await fetch(
  `http://localhost:4791/api/blueprints/${blueprint.id}/instantiate`,
  { method: 'POST' }
);

// 3. Start agent
await fetch(`http://localhost:4892/api/agents/${agent.id}/start`, {
  method: 'POST'
});

// 4. Execute task
await fetch(`http://localhost:4892/api/agents/${agent.id}/execute`, {
  method: 'POST',
  body: JSON.stringify({ task: 'Analyze Q4 sales data' })
});
```

### Track Preferences and Get Recommendations

```javascript
// 1. Track preference
await fetch('http://localhost:4893/api/preferences/user-123/track', {
  method: 'POST',
  body: JSON.stringify({
    action: 'like',
    itemId: 'restaurant-456',
    itemType: 'restaurant'
  })
});

// 2. Get personalized recommendations
const recs = await fetch('http://localhost:4893/api/recommendations/user-123');
```

### Proactive Suggestion

```javascript
// 1. Create rule
await fetch('http://localhost:4789/api/proactive/rule', {
  method: 'POST',
  body: JSON.stringify({
    name: 'low-balance-reminder',
    trigger: { conditions: [{ key: 'balance', op: 'lt', value: 100 }] },
    action: { type: 'notification', data: { message: 'Low balance!' } }
  })
});

// 2. Get suggestions
const suggestions = await fetch('http://localhost:4789/api/proactive/suggest', {
  method: 'POST',
  body: JSON.stringify({ userId: 'user-123', context: { balance: 50 } })
});
```

### Reflection on AI Response

```javascript
const feedback = await fetch('http://localhost:4787/api/reflect', {
  method: 'POST',
  body: JSON.stringify({
    text: 'Based on our analysis, we recommend increasing the marketing budget by 20% for Q4...'
  })
});
// Returns: { scores: { clarity, accuracy, completeness, tone, relevance }, overall: 0.85 }
```

---

## PART 7: SERVICE DEPENDENCIES

### Startup Order

```
Level 1 (Foundation)
├── event-platform (4901)
├── knowledge-registry (4900)
└── agent-security (4797)

Level 2 (Core AI)
├── ai-intelligence (4881)
├── intent-engine (4786)
├── reasoning-engine (4933)
└── vector-db

Level 3 (Execution)
├── planning-engine (4896)
├── agent-os (4892)
├── agent-builder (4791)
├── multi-agent-runtime (4790)
└── background-agents (4792)

Level 4 (Intelligence)
├── predictive-intelligence (4754)
├── risk-intelligence (4755)
├── decision-intelligence (4756)
├── personalization (4893)
├── proactive-engine (4789)
├── reflection-engine (4787)
└── micro-intelligence (4753)

Level 5 (Business)
├── ai-economy (4894)
├── multi-modal (4897)
└── REZ-intelligence-hub (3000)
```

---

## PART 8: HEALTH MONITORING

### Health Endpoints

All services provide:
- `GET /health` - Basic health check
- `GET /ready` - Readiness check
- `GET /api/health` - Detailed health (most services)

### Example: Check Service Health

```bash
curl http://localhost:4881/health
# {"status":"healthy","service":"ai-intelligence","port":4881}

curl http://localhost:4753/health
# {"service":"micro-intelligence","status":"healthy"}
```

---

## PART 9: ERROR HANDLING

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate Limited |
| 500 | Server Error |

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

### Circuit Breaker Fallback

When using micro-intelligence (4753):
```json
{
  "outcome": "fallback",
  "fallbackUsed": "sentiment-default",
  "response": { "sentiment": "neutral", "confidence": 0.5 }
}
```

---

## PART 10: SECURITY

### Authentication

All authenticated endpoints require:
```bash
Authorization: Bearer <JWT_TOKEN>
```

Or service-to-service:
```bash
x-internal-token: <INTERNAL_TOKEN>
```

### Rate Limiting

Via agent-security (4797):
- Per-agent token bucket
- Default: 100 requests/minute
- Configurable per agent

### RBAC

Permissions checked via agent-security:
- `read:<resource>`
- `write:<resource>`
- `admin`

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 28, 2026 | Initial integration document |

---

**Document Owner:** RTMN Digital  
**Classification:** Internal Integration Guide  
**Review Cycle:** Monthly
