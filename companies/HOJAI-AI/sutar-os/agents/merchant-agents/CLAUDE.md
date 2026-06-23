# CLAUDE.md - SUTAR OS Merchant AI Agents (v2.0.0)

> **Service:** `@rtmn/merchant-agents`
> **Port:** 4737
> **Status:** ✅ Enhanced with REZ Intelligence
> **Last updated:** 2026-06-23

## What this service does

**SUTAR OS - Merchant AI Agents** are business AI agents that handle customer negotiations, orders, and support for any business.

**Every merchant agent is now enriched with REZ Intelligence** (port 5370), giving it access to:
- Real-time merchant performance metrics
- Customer lifetime value + churn risk
- Revenue predictions + demand forecasts
- Personalized product recommendations
- Intent classification for incoming messages

## REZ Intelligence Integration (NEW in v2.0.0)

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `REZ_INTEL_URL` | `http://localhost:5370` | REZ Intelligence service URL |
| `REZ_INTEL_TIMEOUT_MS` | `3000` | Request timeout in ms |
| `REZ_INTEL_ENABLED` | `true` | Set to `false` to disable REZ Intelligence |

### New endpoints (6 REZ Intelligence endpoints)

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/merchants/:id/insights` | Local stats + REZ Intelligence merchant insights |
| `GET` | `/api/merchants/:id/customers/:customerId/insights` | Customer LTV + churn + history |
| `GET` | `/api/merchants/:id/predictions/revenue` | 30/60/90-day revenue forecast |
| `GET` | `/api/merchants/:id/recommendations?customerId=X` | Personalized product recommendations |
| `GET` | `/api/merchants/:id/next-best-action?customerId=X` | What agent should do next |
| `GET` | `/api/merchants/:id/pricing-recommendations?productId=X` | Dynamic pricing suggestions |
| `GET` | `/api/merchants/rez-intel-status` | Check REZ Intelligence service health |

### Enhanced message handler (POST /api/merchants/:id/message)

**Before:** Merchant agents processed messages with only local context.

**After:** Every incoming message is enriched with REZ Intelligence before processing:

```javascript
const enriched = await rezIntel.enrichAgentContext({
  agentRole: 'merchant-agent',
  userId: message.from,
  companyId: merchant.id,
  query: message.text,
  context: { merchantIndustry, merchantTier, messageType }
});
```

**What gets added to the response:**

For **QUERY** messages:
- `response.recommendations` - personalized product recommendations
- `response.predictions` - relevant predictions (LTV, demand, churn)

For **COUNTER** messages (negotiations):
- `response.pricing_guidance` - dynamic pricing recommendation

For **all** messages:
- `response.intent` - intent classification (buy, support, compare, etc.)

### Graceful degradation

**If REZ Intelligence is unavailable**, merchant-agents continues to work normally:
- `enriched` returns `null`
- Response doesn't include REZ Intelligence fields
- The `source` field in new endpoints shows "local only (rez-intel unavailable)"

No errors, no downtime, just no enrichment.

### New REZ Intelligence client file

`src/rez-intel-client.js` - The HTTP client wrapping all REZ Intelligence calls with:
- `enrichAgentContext()` - the killer endpoint (called per message)
- `getMerchantInsights()` - merchant performance
- `getCustomerInsights()` - LTV + churn + history
- `predictRevenue()` - revenue forecast
- `getProductRecommendations()` - personalized recommendations
- `getNextBestAction()` - what to do next
- `getPricingRecommendations()` - dynamic pricing
- `checkRezIntelHealth()` - health check

All calls have:
- AbortController timeout (graceful timeout)
- Try/catch with `null` return on error
- Configurable enable/disable via env var

## Updated /info endpoint

The `/info` endpoint now reports REZ Intelligence status:

```json
{
  "name": "SUTAR OS - Merchant AI Agents",
  "version": "2.0.0",
  "rezIntel": {
    "enabled": true,
    "url": "http://localhost:5370",
    "status": "healthy"
  },
  "capabilities": [
    "autonomous_negotiation",
    "order_management",
    "inventory_control",
    "dynamic_pricing",
    "customer_support",
    "returns_refunds",
    "rez_intelligence_enrichment",
    "personalized_recommendations",
    "revenue_prediction",
    "customer_lifetime_value",
    "next_best_action"
  ]
}
```

## Testing the integration

```bash
# 1. Start REZ Intelligence service
cd companies/RABTUL-Technologies/rez-intelligence-integration
npm install && npm run dev
# (running on port 5370)

# 2. Start merchant-agents
cd companies/HOJAI-AI/sutar-os/agents/merchant-agents
npm install && npm run dev
# (running on port 4737)

# 3. Check REZ Intelligence status
curl http://localhost:4737/api/merchants/rez-intel-status
# { "rezIntelEnabled": true, "rezIntelHealthy": true, ... }

# 4. Create a merchant
curl -X POST http://localhost:4737/api/merchants/restaurant \
  -H "Content-Type: application/json" \
  -d '{"businessId":"maya-1","businessName":"Maya Collective","industry":"restaurant"}'

# 5. Send a message (with REZ Intelligence enrichment)
curl -X POST http://localhost:4737/api/merchants/MERCHANT_ID/message \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"QUERY","from":"customer-1","text":"Do you have a table for 4 tonight?"}}'
# Response includes recommendations + predictions from REZ Intelligence

# 6. Get enriched insights
curl http://localhost:4737/api/merchants/MERCHANT_ID/insights
# Returns local stats + REZ Intelligence merchant insights
```

## Files changed

- `src/rez-intel-client.js` - NEW (REZ Intelligence HTTP client)
- `src/index.js` - ENHANCED (imports REZ client, message handler, 6 new endpoints, updated /info)

## Backward compatibility

- All existing endpoints still work
- Existing POST /api/merchants/:id/message still returns the same fields
- New fields are added on top when REZ Intelligence is available
- If REZ Intelligence is down, the service degrades gracefully (returns null for enrichment)

## Next steps

1. Add vitest tests for the REZ Intelligence client
2. Add a `/api/merchants/:id/orders/:orderId/insights` endpoint
3. Add a webhook handler for real-time REZ Intelligence events
4. Add caching for REZ Intelligence responses (5-minute TTL)
