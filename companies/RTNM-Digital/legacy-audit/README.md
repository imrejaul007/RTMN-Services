# RTNM-Digital — Integration Layer

**Part of:** RTNM Group
**Purpose:** Integration layer for the REZ ecosystem
**Version:** 1.0.0

---

> **RTNM-Digital vs RTNM-Group:**
> - **RTNM-Digital**: Integration layer (event bus, service contracts, orchestration)
> - **RTNM-Group**: Admin & Controls (admin panels, identity, finance, ops)

---

## What This Does

This is the **integration layer** that makes all REZ services work as one system:

```
REZ Business AI ────► Agent Orchestrator ────► 38 AI Agents
      │                   │
      └───────────────────┴──── Event Bus ────► All Services
                                │
                                ▼
                     ┌────────────────────────┐
                     │  Integration Hub      │
                     ├──────────────────────┤
                     │ • Unified Events     │
                     │ • Service Contracts  │
                     │ • Central Context    │
                     │ • Execution Pipeline │
                     │ • Observability     │
                     └──────────────────────┘
```

---

## Core Components

### 1. Unified Event Schema

Standardized events for all services:

```typescript
// Publish event
eventBus.publish({
  type: 'commerce.order.created',
  source: 'merchant-service',
  payload: { orderId: '123', amount: 500 }
});

// Subscribe
eventBus.subscribe('customer.churn_risk', (event) => {
  // Trigger retention
});
```

### 2. Service Contracts

Every service exposes:

| Service | Actions |
|---------|---------|
| Business AI | analyze_goals, execute_campaign, adjust_pricing |
| Agent Orchestrator | create_task, execute_task |
| Merchant Service | get_orders, get_products |
| Engagement | create_campaign, send_notification |
| Ad AI | create_ad, optimize_ad |

### 3. Central Context

Shared state all agents access:

```typescript
// Get merchant context
const merchant = centralContext.getMerchantContext('merchant-123');

// Get customer journey
const customer = centralContext.getCustomerContext('customer-456');
```

### 4. Execution Pipeline

Safe execution with:

```typescript
// Submit execution
const exec = pipeline.submit({
  merchantId: 'merchant-123',
  action: 'send_campaign',
  params: { campaignId: 'camp-1' },
  riskLevel: 'medium'
});

// Approve and execute
await pipeline.approve(exec.id, 'merchant');
await pipeline.execute(exec.id, executor);
```

Features:
- Risk assessment
- Approval workflow
- Retry logic
- Rollback support
- Audit logs

### 5. Observability

Monitor everything:

```typescript
// Record decision
observability.recordDecision({
  agentId: 'churn-agent',
  decision: 'Send win-back offer',
  reasoning: 'Customer inactive 18 days',
  confidence: 0.85
});

// Get dashboard
const summary = observability.getSummary();
```

---

## Event Schema

### Commerce Events
```
commerce.order.created
commerce.order.completed
commerce.inventory.low
commerce.payment.received
```

### Customer Events
```
customer.registered
customer.churn_risk
customer.segment_changed
customer.ltv_changed
```

### Marketing Events
```
marketing.campaign.launched
marketing.campaign.completed
marketing.offer.redeemed
```

### Market Events
```
market.weather.changed
market.event.detected
market.competitor.discount_detected
```

### System Events
```
system.agent.heartbeat
system.execution.completed
system.risk.detected
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  REZ INTEGRATION HUB                     │
├──────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │   Event    │ │  Service  │ │  Central  │  │
│  │   Bus      │ │ Registry  │ │  Context  │  │
│  └────────────┘ └────────────┘ └────────────┘  │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Execution │ │ Observ-   │ │  Service  │  │
│  │ Pipeline   │ │ ability   │ │ Contracts │  │
│  └────────────┘ └────────────┘ └────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────┘
         │               │                │
         ▼               ▼                ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│    AI      │    │  Business │    │   Media   │
│   Agents   │    │    AI     │    │   Network │
└────────────┘    └────────────┘    └────────────┘
```

---

## Integration Flow

### 1. Event Published
```
Customer orders → Merchant Service → Event Bus
```

### 2. Agents Notified
```
Event Bus → Agent Orchestrator → Business AI
```

### 3. Decision Made
```
Business AI → Analyze → Create campaign
```

### 4. Execution
```
Pipeline → Risk Check → Approval → Execute
```

### 5. Monitoring
```
Observability → Dashboard → Learn
```

---

## Services Connected

| Service | Actions | Events |
|---------|---------|---------|
| Business AI | 6 | 5 subscribed |
| Agent Orchestrator | 4 | 4 subscribed |
| Merchant Service | 8 | 2 subscribed |
| Engagement Platform | 7 | 3 subscribed |
| Ad AI | 5 | 3 subscribed |
| Notifications | 5 | 3 subscribed |
| Wallet | 4 | 3 subscribed |
| Identity Graph | 5 | 3 subscribed |

---

## Port

**Port: 4060** (planned)

---

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| REZ Business AI | 4059 | Execution layer |
| Agent Orchestrator | 4040 | Task coordination |
| Event Bus | Built-in | Real-time events |
| REZ SalesMind | 5150 | AI Sales Intelligence (HOJAI AI + AdBazaar + REZ CRM) |

---

## Services Overview

| Service | Port | Integrations |
|---------|------|--------------|
| **REZ SalesMind** | 5150 | HOJAI AI (4595, 4751, 4752, 4786), AdBazaar (4300-4303), REZ CRM Hub (6000, 4100, 4200, 6100) |
| **REZ Identity Hub** | 6000 | 26 data sources, conversation memory, pre-call intelligence |
| **REZ Integration Hub** | 4060 | Event bus, service contracts, orchestration |

---

*Version: 2.0.0*
