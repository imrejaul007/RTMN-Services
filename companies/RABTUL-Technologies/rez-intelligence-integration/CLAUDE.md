# CLAUDE.md — REZ Intelligence Integration

> **Service:** `@rtmn/rez-intelligence-integration`
> **Port:** 5370
> **Status:** ✅ Built (v1.0.0)
> **Last updated:** 2026-06-23

## What this service does

**Wires HOJAI AI's existing intelligence services into SUTAR agents** so every AI employee in every HOJAI-generated company has access to real-time business intelligence.

This is the **integration layer** that connects:

```
SUTAR agents (Sales, Support, Procurement, Finance, etc.)
    ↓ calls
REZ Intelligence Integration (5370)
    ↓ routes to
REZ-Intelligence-Bridge (5369) + Intent Engine (4800) + others
    ↓ returns
Real-time merchant, customer, revenue, product intelligence
    ↓
SUTAR agents make smarter decisions
```

## The killer feature: `/api/v1/agent/enrich`

**This is the endpoint every SUTAR agent calls before responding to anything.**

```bash
POST /api/v1/agent/enrich
{
  "agentRole": "sales-agent",
  "userId": "cust-123",
  "companyId": "maya-collective",
  "query": "What should I recommend to this customer?",
  "context": { "currentProduct": "hoodie" }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant_intelligence": {
      "revenue_30d": 125000,
      "top_products": ["hoodie", "sweatpants"],
      "churn_risk_customers": 12,
      "growth_rate": 0.15
    },
    "customer_intelligence": {
      "ltv": 450,
      "purchase_history": [...],
      "preferences": ["black", "size-M"],
      "engagement_score": 0.78
    },
    "predictions": {
      "next_purchase_probability": 0.65,
      "expected_order_value": 85,
      "best_time_to_contact": "2026-06-25T18:00"
    },
    "recommendations": {
      "products": [...],
      "next_best_action": "send_personalized_offer",
      "channel": "whatsapp",
      "messaging": "Personalized message..."
    },
    "intent": {
      "intent": "buy",
      "confidence": 0.92,
      "entities": {...}
    },
    "enriched_at": "2026-06-23T10:30:00Z"
  }
}
```

**SUTAR agents use this enriched context to make better decisions.**

## Endpoints

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health + downstream services status |

### Agent Context Enrichment

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/agent/enrich` | **The killer endpoint** — enrich agent context with REZ Intelligence |

### Insights

| Method | Path | Description | Used by |
|---|---|---|---|
| `POST` | `/api/v1/insights/merchant` | Merchant performance + competitive benchmarks | Sales, Finance, Procurement |
| `POST` | `/api/v1/insights/customer` | Customer behavior + LTV + churn risk | Sales, Support, CS |
| `POST` | `/api/v1/insights/competitive` | Industry benchmarks | Sales, Marketing, CEO |
| `POST` | `/api/v1/insights/product` | Product performance + reviews | Sales, Marketing, Inventory |

### Predictions

| Method | Path | Description | Used by |
|---|---|---|---|
| `POST` | `/api/v1/predictions/revenue` | Revenue forecast (30/60/90 days) | Finance, CEO, Sales |
| `POST` | `/api/v1/predictions/churn` | Customer churn probability | Sales, Support, CS |
| `POST` | `/api/v1/predictions/ltv` | Customer lifetime value | Sales, Marketing |
| `POST` | `/api/v1/predictions/demand` | Product demand forecast | Inventory, Procurement |

### Recommendations

| Method | Path | Description | Used by |
|---|---|---|---|
| `POST` | `/api/v1/recommendations/products` | Personalized product recommendations | Sales, Marketing |
| `POST` | `/api/v1/recommendations/next-best-action` | What agent should do next | All SUTAR agents |
| `POST` | `/api/v1/recommendations/pricing` | Dynamic pricing suggestions | Sales, Finance |

### Intent

| Method | Path | Description | Used by |
|---|---|---|---|
| `POST` | `/api/v1/intent/classify` | Classify user intent | HOJAI Widget, SUTAR agents |
| `POST` | `/api/v1/intent/route` | Classify + route to appropriate agent | HOJAI Widget, FlowOS |

## How SUTAR agents use this

### Example: Sales Agent

```typescript
import { REZIntelligence } from '@rtmn/rez-intelligence-integration';

class SalesAgent extends BaseAgent {
  async handleCustomerMessage(customerId: string, message: string) {
    // 1. Enrich context with REZ Intelligence
    const enriched = await REZIntelligence.enrichAgentContext({
      agentRole: 'sales-agent',
      customerId,
      companyId: this.companyId,
      query: message
    });

    // 2. Use enriched context to make smart response
    const response = await this.generateResponse({
      customerMessage: message,
      customerHistory: enriched.customer_intelligence.purchase_history,
      customerPreferences: enriched.customer_intelligence.preferences,
      recommendedProducts: enriched.recommendations.products,
      predictedValue: enriched.predictions.expected_order_value,
      bestChannel: enriched.recommendations.channel,
      bestMessage: enriched.recommendations.messaging
    });

    return response;
  }
}
```

### Example: Procurement Agent

```typescript
class ProcurementAgent extends BaseAgent {
  async decideWhatToBuy() {
    // 1. Get demand forecast
    const demand = await REZIntelligence.predictDemand({
      companyId: this.companyId,
      productId: 'rice',
      timeRange: '30d'
    });

    // 2. Get merchant benchmarks
    const merchants = await REZIntelligence.getMerchantInsights({
      companyId: this.companyId,
      timeRange: '30d'
    });

    // 3. Use both to decide
    return this.makeProcurementDecision(demand, merchants);
  }
}
```

## Configuration

```bash
# .env
PORT=5370
NODE_ENV=production
LOG_LEVEL=info

# Downstream services
REZ_INTEL_BRIDGE_URL=http://localhost:5369
INTENT_ENGINE_URL=http://localhost:4800
RAG_PLATFORM_URL=http://localhost:4805
PREDICTION_ENGINE_URL=http://localhost:4806
KNOWLEDGE_GRAPH_URL=http://localhost:4802
```

## Integration with downstream services

This service aggregates data from:

| Service | Port | What |
|---|---|---|
| **REZ-Intelligence-Bridge** | 5369 | Merchant + media + customer intelligence |
| **Intent Engine** | 4800 | Intent classification + routing |
| **RAG Platform** | 4805 | Retrieval-augmented generation |
| **Prediction Engine** | 4806 | Revenue + churn + LTV predictions |
| **Knowledge Graph** | 4802 | Graph queries |

If any downstream service is down, this service returns `null` for that section (graceful degradation).

## Build & Deploy

```bash
# Install
npm install

# Build
npm run build

# Dev
npm run dev

# Start
npm start

# Test
npm test
```

## Architecture decisions

1. **Stateless service** — no database, all state in downstream services
2. **Parallel calls** — uses `Promise.allSettled` for graceful degradation
3. **Caching** — Redis-backed caching for frequently-accessed insights (TODO)
4. **Rate limiting** — 1000 req/min per agent (TODO)
5. **Authentication** — internal service token (TODO)
6. **Monitoring** — Winston logger + metrics to be added

## Future work

- [ ] Add Redis caching for frequently-accessed insights
- [ ] Add rate limiting per agent role
- [ ] Add Prometheus metrics endpoint
- [ ] Add OpenTelemetry tracing
- [ ] Add authentication (internal service token)
- [ ] Build a BAM package around this service
- [ ] Add tests (vitest) — current count: 0
- [ ] Add CI/CD pipeline

## Related docs

- [rez-intelligence-local-economy.md](../../../.claude/plans/rez-intelligence-local-economy.md) — How REZ Intelligence fits in the larger vision
- [skillos-usage.md](../../../.claude/plans/skillos-usage.md) — How SUTAR agents use skills
- [global-nexha-addendum.md](../../../.claude/plans/global-nexha-addendum.md) — Full specs for REZ Economy
