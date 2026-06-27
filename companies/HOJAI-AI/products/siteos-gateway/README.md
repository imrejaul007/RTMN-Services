# SiteOS Gateway

**Unified entry point connecting the HOJAI SiteOS widget to all RTMN services.**

## What is SiteOS Gateway?

SiteOS Gateway is a lightweight API gateway that routes widget requests to the appropriate backend services. Instead of widgets needing to know about 20+ different services, they make a single call to the gateway.

```
Widget → SiteOS Gateway → [MemoryOS | TwinOS | AgentOS | SalesOS | ...]
```

## Quick Start

```bash
# Install
npm install

# Configure environment
cp .env.example .env
# Edit .env with your service URLs

# Start
npm run dev

# Health check
curl http://localhost:5450/health
```

## Features

- **40+ API endpoints** routing to existing RTMN services
- **Service clients** for Memory, TwinOS, AgentOS, Sales, Marketing, and more
- **Consistent error handling** and response format
- **Configurable timeouts** per service type
- **Health checks** for the gateway and upstream services

## API Endpoints

| Category | Endpoints |
|----------|-----------|
| **Widget** | `/api/siteos/message`, `/api/siteos/intents` |
| **Memory** | `/api/siteos/memory/:visitorId` |
| **TwinOS** | `/api/siteos/twin/customer/:id`, `/api/siteos/twin/order/:id`, `/api/siteos/twin/wallet/:id` |
| **AgentOS** | `/api/siteos/agent/query`, `/api/siteos/agent/capabilities` |
| **Sales** | `/api/siteos/sales/lead/:id`, `/api/siteos/sales/score` |
| **Marketing** | `/api/siteos/marketing/campaign`, `/api/siteos/marketing/segments` |
| **Customer Success** | `/api/siteos/churn/:id`, `/api/siteos/health/:id` |
| **CXO** | `/api/siteos/customer360/:id`, `/api/siteos/kpis` |
| **FlowOS** | `/api/siteos/flow/execute`, `/api/siteos/flow/templates` |
| **Nexha** | `/api/siteos/nexus/discover`, `/api/siteos/nexus/reputation/:id` |
| **Voice** | `/api/siteos/voice/synthesize`, `/api/siteos/voice/transcribe` |
| **Analytics** | `/api/siteos/analytics/heatmaps`, `/api/siteos/analytics/events` |
| **Genie** | `/api/siteos/genie/ask`, `/api/siteos/genie/briefing/:userId` |

## Configuration

```bash
# Gateway port
SITEOS_GATEWAY_PORT=5450

# Service URLs (all optional - defaults to localhost)
MEMORY_OS_URL=http://localhost:4703
CUSTOMER_TWIN_URL=http://localhost:4895
ORDER_TWIN_URL=http://localhost:4885
WALLET_TWIN_URL=http://localhost:4896
AGENT_OS_URL=http://localhost:4802
SALES_OS_URL=http://localhost:5055
MARKETING_OS_URL=http://localhost:5500
CXO_OS_URL=http://localhost:5100
FLOW_OS_URL=http://localhost:7007
GENIE_URL=http://localhost:4701
VOICE_GATEWAY_URL=http://localhost:4880
```

## Example Usage

```javascript
// Query an AI agent
const res = await fetch('http://localhost:5450/api/siteos/agent/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What products are in stock?',
    context: { category: 'electronics' }
  })
});
const { data } = await res.json();

// Get customer 360 view
const res = await fetch('http://localhost:5450/api/siteos/customer360/cust-123');
const { data } = await res.json();

// Track analytics event
await fetch('http://localhost:5450/api/siteos/analytics/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'add_to_cart',
    properties: { productId: 'prod-456', price: 99.99 }
  })
});
```

## Response Format

All endpoints return a consistent response format:

```json
{
  "success": true,
  "data": { ... }
}
```

On error:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Services Connected

| Service | Port | Purpose |
|---------|------|---------|
| MemoryOS | 4703 | Visitor memory |
| Customer Twin | 4895 | Customer profiles |
| Order Twin | 4885 | Order tracking |
| Wallet Twin | 4896 | Payments/wallet |
| AgentOS | 4802 | AI agents |
| Sales OS | 5055 | CRM/leads |
| Marketing OS | 5500 | Campaigns |
| Customer Success | 4050 | Retention |
| CXO OS | 5100 | Analytics |
| FlowOS | 7007 | Workflows |
| Genie | 4701 | Personal AI |
| Voice Gateway | 4880 | Speech |
| Nexha Discovery | 4272 | Partner search |
| Analytics | 4750 | Tracking |

## License

MIT
