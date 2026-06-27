# SiteOS Gateway - Service Documentation

## Overview

**Service:** SiteOS Gateway
**Port:** 5450
**Type:** Unified API Gateway
**Package:** `@hojai/siteos-gateway`

SiteOS Gateway is the **glue layer** that connects the HOJAI SiteOS widget to all existing RTMN services. It provides a unified entry point for widget requests, routing them to the appropriate backend services.

## Purpose

The SiteOS Gateway eliminates the need for widgets to know about every service in the RTMN ecosystem. Instead of making 20+ separate API calls, widgets make a single call to the gateway, which handles all upstream service communication.

```
┌─────────────────────────────────────────────────────────────┐
│                     SiteOS Widget                           │
│                   (Any website/app)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  SiteOS Gateway (:5450)                     │
│                   "The Glue Layer"                          │
│                                                              │
│  Routes requests to:                                         │
│  • MemoryOS (4703)                                           │
│  • TwinOS (4895, 4885, 4896)                                │
│  • AgentOS (4802, 4813, 4804)                               │
│  • Sales OS (5055)                                           │
│  • Marketing OS (5500)                                       │
│  • Customer Success OS (4050)                                │
│  • CXO OS (5100)                                            │
│  • FlowOS (7007)                                            │
│  • Genie (4701, 4712, 4713)                                 │
│  • Voice Gateway (4880)                                     │
│  • Analytics (4750)                                          │
│  • Nexha Platform (4272, 4271)                              │
└─────────────────────────────────────────────────────────────┘
```

## What This Service Builds

SiteOS Gateway is a **pure routing layer** — it does not contain any business logic. All intelligence comes from existing services.

### Responsibilities

1. **Route requests** to the correct upstream service
2. **Aggregate responses** from multiple services when needed
3. **Handle errors** gracefully with consistent error formats
4. **Add headers** for authentication and tracing
5. **Enforce timeouts** per service type

### What It Does NOT Build

- No business logic (delegated to upstream services)
- No data storage (uses MemoryOS, TwinOS, etc.)
- No AI/ML (delegated to AgentOS, Genie)
- No widget UI (handled by SiteOS widget itself)

## Reuses Existing Services

| Service | Port | Purpose |
|---------|------|---------|
| **MemoryOS** | 4703 | Visitor memory and context |
| **Customer Twin** | 4895 | Customer profile, LTV, churn |
| **Order Twin** | 4885 | Order lifecycle, shipments |
| **Wallet Twin** | 4896 | Wallet balance, transactions |
| **AgentOS** | 4802 | AI agent execution |
| **Capability Store** | 4804 | Agent capability registry |
| **Sales OS** | 5055 | Lead management, scoring |
| **Marketing OS** | 5500 | Campaigns, segments |
| **Customer Success OS** | 4050 | Churn, NPS, health |
| **CXO OS** | 5100 | Customer 360, KPIs |
| **FlowOS** | 7007 | Workflow execution |
| **Genie** | 4701 | Personal AI assistant |
| **Genie Briefing** | 4712 | Daily briefings |
| **Genie Search** | 4713 | Universal search |
| **Voice Gateway** | 4880 | TTS/STT |
| **Analytics** | 4750 | Heatmaps, events |
| **Nexha Discovery** | 4272 | Partner discovery |
| **Nexha Reputation** | 4271 | Reputation scoring |
| **Widget Backend** | 5380 | Widget message handling |

## API Routes

### Widget Routes
```
POST /api/siteos/message      → Widget Backend
GET  /api/siteos/intents     → Widget Backend
```

### Memory Routes
```
GET  /api/siteos/memory/:visitorId     → MemoryOS
POST /api/siteos/memory                → MemoryOS
DELETE /api/siteos/memory/:visitorId/:memoryId → MemoryOS
```

### Twin Routes
```
GET  /api/siteos/twin/customer/:id          → Customer Twin
GET  /api/siteos/twin/customer/:id/ltv      → Customer Twin
GET  /api/siteos/twin/customer/:id/churn    → Customer Twin
GET  /api/siteos/twin/order/:id              → Order Twin
GET  /api/siteos/twin/order/:id/shipment     → Order Twin
GET  /api/siteos/twin/wallet/:id             → Wallet Twin
GET  /api/siteos/twin/wallet/:id/transactions → Wallet Twin
```

### Agent Routes
```
POST /api/siteos/agent/query         → AgentOS
GET  /api/siteos/agent/capabilities  → Capability Store
POST /api/siteos/agent/execute       → Agent Execution
```

### Sales Routes
```
GET  /api/siteos/sales/lead/:id      → Sales OS
POST /api/siteos/sales/score         → Sales OS
POST /api/siteos/sales/lead          → Sales OS
GET  /api/siteos/sales/deals         → Sales OS
```

### Marketing Routes
```
POST /api/siteos/marketing/campaign   → Marketing OS
GET  /api/siteos/marketing/campaigns  → Marketing OS
GET  /api/siteos/marketing/segments   → Marketing OS
GET  /api/siteos/marketing/segments/:id/insights → Marketing OS
```

### Customer Success Routes
```
GET  /api/siteos/churn/:customerId    → Customer Success OS
GET  /api/siteos/health/:customerId   → Customer Success OS
GET  /api/siteos/nps/:customerId      → Customer Success OS
GET  /api/siteos/journey/:customerId  → Customer Success OS
```

### CXO Routes
```
GET  /api/siteos/customer360/:id      → CXO OS
GET  /api/siteos/kpis                 → CXO OS
```

### Flow Routes
```
POST /api/siteos/flow/execute         → FlowOS
GET  /api/siteos/flow/templates       → FlowOS Canonical
```

### Nexha Routes
```
GET  /api/siteos/nexus/discover          → Nexha Discovery
GET  /api/siteos/nexus/reputation/:id     → Nexha Reputation
```

### Voice Routes
```
GET  /api/siteos/voice/synthesize   → Voice Gateway
POST /api/siteos/voice/transcribe   → Voice Gateway
```

### Analytics Routes
```
GET  /api/siteos/analytics/heatmaps  → Analytics
GET  /api/siteos/analytics/events    → Analytics
POST /api/siteos/analytics/track     → Analytics
```

### Genie Routes
```
POST /api/siteos/genie/ask          → Genie
GET  /api/siteos/genie/briefing/:userId → Genie Briefing
GET  /api/siteos/genie/search       → Genie Search
```

## Configuration

Environment variables (see `src/config.js`):

```bash
# Gateway
SITEOS_GATEWAY_PORT=5450
HOJAI_API_KEY=your-api-key

# Service URLs
MEMORY_OS_URL=http://localhost:4703
CUSTOMER_TWIN_URL=http://localhost:4895
ORDER_TWIN_URL=http://localhost:4885
WALLET_TWIN_URL=http://localhost:4896
AGENT_OS_URL=http://localhost:4802
SALES_OS_URL=http://localhost:5055
MARKETING_OS_URL=http://localhost:5500
CUSTOMER_SUCCESS_OS_URL=http://localhost:4050
CXO_OS_URL=http://localhost:5100
FLOW_OS_URL=http://localhost:7007
GENIE_URL=http://localhost:4701
VOICE_GATEWAY_URL=http://localhost:4880

# Timeouts (ms)
DEFAULT_TIMEOUT=30000
MEMORY_TIMEOUT=5000
TWIN_TIMEOUT=10000
AGENT_TIMEOUT=60000
FLOW_TIMEOUT=120000
```

## Startup

```bash
# Install dependencies
npm install

# Start in development
npm run dev

# Start in production
npm start

# Health check
curl http://localhost:5450/health

# Readiness check (checks critical services)
curl http://localhost:5450/ready
```

## Example Widget Usage

```javascript
// Query customer memory and get AI response
const response = await fetch('http://localhost:5450/api/siteos/agent/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What are my recent orders?',
    context: { visitorId: 'visitor-123' }
  })
});

// Get customer 360 view
const customer360 = await fetch('http://localhost:5450/api/siteos/customer360/ cust-456');

// Track user event
await fetch('http://localhost:5450/api/siteos/analytics/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'page_view',
    properties: { page: '/products', referrer: 'google' }
  })
});
```

## File Structure

```
siteos-gateway/
├── package.json
├── CLAUDE.md
├── README.md
├── .env.example
└── src/
    ├── index.js          # Express app entry point
    ├── config.js         # Service URLs and configuration
    ├── service-clients.js # All upstream service clients
    └── routes/
        └── siteos.js     # All API routes
```

## Status

- **Status:** Production Ready
- **Gateway Port:** 5450
- **Dependencies:** None (stateless proxy)
- **Tests:** See `__tests__/`
