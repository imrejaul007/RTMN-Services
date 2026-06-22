# Nexha — Buyer-Seller Agent Audit

**Date:** June 15, 2026
**Auditor:** Claude Code

---

## What's Actually Built

### Nexha Services (All Built)

| Service | Port | Buyer/Seller | Capabilities |
|---------|------|--------------|-------------|
| **distribution-os** | 4300 | Logistics | Route, delivery, tracking |
| **franchise-os** | 4310 | Franchise | Royalty, compliance |
| **procurement-os** | 4320 | **BOTH** | RFQ, Agent, Deal, Capability |
| **manufacturing-os** | 4330 | Manufacturing | BOM, production |
| **trade-finance** | 4340 | Finance | BNPL, FX, disputes |
| **intelligence** | 4350 | AI | Forecasting, fraud, churn |
| **ecosystem-connector** | 4399 | Event Bus | Orchestration |
| **nexha-gateway** | 5002 | API Gateway | Routing |

### Nexha Agent Services

| Service | Type | Buyer/Seller | Status |
|---------|------|--------------|--------|
| `agent.service.ts` | SupplierAgent | **SELLER** | ✅ Built |
| `deal.service.ts` | DealStateMachine | **BOTH** | ✅ Built |
| `procurement.service.ts` | Capability Matching | **SELLER** | ✅ Built |

---

## Buyer vs Seller Capabilities

### BUYER (Procurement Agent)

| Task | Nexha | SUTAR | Status |
|------|-------|-------|--------|
| Monitor inventory | Ecosystem Orchestrator | GoalOS | ⚠️ Manual trigger |
| Create goal | Manual | GoalOS | ❌ Not integrated |
| Find suppliers | Capability Matching | Discovery Engine | ⚠️ Partial |
| Send RFQ | Supplier Agent | Intent Bus | ✅ Built |
| Compare quotes | Manual | Negotiation Engine | ❌ Not integrated |
| Arrange payment | BNPL + Credit | EconomyOS | ⚠️ Partial |
| Track delivery | Delivery Tracking | Monitoring | ✅ Built |
| Score supplier | Scoring Engine | Reputation | ❌ Not connected |

### SELLER (Supplier Agent)

| Task | Nexha | SUTAR | Status |
|-------|-------|-------|--------|
| Receive RFQ | Supplier Agent | Intent Bus | ❌ No webhook |
| Check inventory | Manual | Memory Bridge | ❌ Not integrated |
| Generate quote | Manual | Contract OS | ❌ Not integrated |
| Negotiate | Manual | Negotiation Engine | ❌ Not integrated |
| Accept/reject | Manual | Policy OS | ❌ Not integrated |
| Build reputation | Manual | Reputation | ❌ Not integrated |
| Track payment | BNPL | Economy OS | ⚠️ Partial |

---

## What Nexha Has That Works

### ProcurementOS — Supplier Agent (SELLER-Side)

```typescript
// ✅ Built - sendRFQToSupplier
async sendRFQToSupplier({
  supplierId, supplierName, email, phone,
  rfqId, rfqNumber, dealId,
  items, totalAmount, deadline,
  preferredChannel: 'email' | 'sms' | 'whatsapp' | 'api'
})

// ✅ Built - registerAgent (supplier webhook)
registerAgent(supplierId, { webhookUrl?, apiKey?, slaHours? })

// ✅ Built - recordSupplierResponse
recordSupplierResponse({ dealId, supplierId, quotedAmount, deliveryDays, paymentTerms })

// ✅ Built - negotiation session
getSession(dealId)
getMessages(dealId)
sendReminder(dealId, supplierId, message)
sendCounterOffer(dealId, counterAmount, deliveryDays, paymentTerms)
```

### ProcurementOS — Deal State Machine (BOTH)

```typescript
// ✅ Built - 17 states
rfq_created → invitations_sent → quotes_received → negotiating
→ awarded → order_created → processing → shipped → delivered
→ fulfilled → payment_settled → completed

// ✅ Built - full lifecycle
createDeal() → recordQuote() → awardDeal()
updateFulfillment() → settlePayment() → completeDeal()
getBestQuote() → getStats()
```

### ProcurementOS — Capability Matching (SELLER DISCOVERY)

```typescript
// ✅ Built - 7-dimension scoring
matchSuppliers({ category, minQuantity, maxPrice })

// ✅ Built - capability service
CapabilityService with 7 dimensions:
  - category_score (0-20)
  - capacity_score (0-20)
  - lead_time_score (0-15)
  - delivery_score (0-15)
  - payment_terms_score (0-10)
  - certifications_score (0-10)
  - min_order_score (0-10)
```

### DistributionOS — Route + Delivery (LOGISTICS)

```typescript
// ✅ Built - route optimization
optimizeRoute(routeId, stops[])

// ✅ Built - delivery tracking
recordDeliveryUpdate(vanSaleId, update: { lat, lng, status, eta? })
getDeliveryUpdates(vanSaleId)
```

### TradeFinance — BNPL + Credit (PAYMENT)

```typescript
// ✅ Built - credit line
checkCreditAvailability(merchantId, amount)
settleBNPLPayment(poId, amount)

// ✅ Built - FX conversion
fxService.convert(from, to, amount)
```

### Intelligence — ML Forecasting (ANALYTICS)

```typescript
// ✅ Built - demand forecasting
ForecastService.demandForecast(productId, days, historicalData, seasonality)

// ✅ Built - MAPE accuracy tracking
ForecastService.calculateMAPE(actuals, predictions)

// ✅ Built - fraud detection
FraudService.detectRisk(profile, velocity)

// ✅ Built - churn prediction
ChurnService.predictChurn(merchantId)
```

### Ecosystem Connector — Orchestration (AGENT COORDINATION)

```typescript
// ✅ Built - event chains
emitDemandSignal() → handleInventoryLow()

// ✅ Built - workflow handlers
handleQuoteReceived()
handleDealAwarded()
handlePaymentReceived()
```

---

## What SUTAR Has That Nexha Needs

### SUTAR Services (25+ Built)

| Service | Purpose | Nexha Integration |
|---------|---------|------------------|
| `sutar-identity-os` | Business/Agent IDs | ❌ Not connected |
| `sutar-trust-engine` | Trust scoring | ❌ Not connected |
| `sutar-reputation-aggregator` | Multi-dim reviews | ❌ Not connected |
| `sutar-contract-os` | Auto-contracts | ❌ Not connected |
| `sutar-memory-bridge` | Commerce memory | ❌ Not connected |
| `sutar-goal-os` | Goal decomposition | ❌ Not connected |
| `sutar-intent-bus` | RFQ routing | ❌ Not connected |
| `sutar-negotiation-engine` | Counter-offers | ❌ Not connected |
| `sutar-discovery-engine` | Supplier matching | ❌ Not connected |
| `sutar-flow-os` | Workflow automation | ⚠️ Partial |

---

## What Needs to Be Built

### BUYER Agent Enhancements

| Task | Current | Needed |
|------|---------|--------|
| Inventory → Goal | Manual trigger | Auto-goal OS trigger |
| Goal → Discovery | Manual search | Auto-discovery engine |
| Discovery → Intent Bus | Direct call | Intent Bus routing |
| Quote → Negotiation | Manual | Auto-negotiation |
| Negotiation → Contract | Manual | Auto-contract OS |
| Contract → Payment | Manual BNPL | Auto-economy OS |

### SELLER Agent Enhancements

| Task | Current | Needed |
|------|---------|--------|
| RFQ receipt | Supplier Agent (outbound only) | Webhook endpoint (inbound) |
| Inventory check | Manual | Memory Bridge integration |
| Quote generation | Manual | Contract OS template |
| Counter-offer | Manual | Negotiation Engine |
| Accept/reject | Manual | Policy OS validation |
| Reputation building | Manual | Auto-reputation aggregator |

---

## Missing: Nexha-Commerce Network Bridge

```typescript
// What should exist but doesn't:

// 1. Commerce Identity → SUTAR Identity
interface NexhaCommerceBridge {
  // Events flow TO SUTAR
  emitInventoryLow(productId, quantity, urgency)
  emitRFQCreated(rfqId, requirements)
  emitQuoteReceived(dealId, supplierId, quote)
  emitOrderDelivered(orderId, metrics)

  // Events flow FROM SUTAR
  onGoalDecomposed(goalId, tasks)
  onSupplierMatched(supplierId, confidence)
  onNegotiationProgress(dealId, counteroffer)
  onContractGenerated(contractId, terms)
  onReputationUpdated(entityId, scores)
}

// 2. Supplier Agent → SUTAR Intent Bus
interface SupplierAgentBridge {
  // Inbound from suppliers
  receiveRFQ(rfqId, supplierId, response)
  submitQuote(quoteId, terms)
  acceptTerms(contractId)

  // Outbound to suppliers
  sendRFQ(rfqId, supplierIds[])
  requestCounter(supplierId, terms)
  confirmOrder(orderId)
}

// 3. Reputation → Commerce Graph
interface ReputationBridge {
  updateSupplierScore(supplierId, metrics)
  updateBuyerScore(buyerId, metrics)
  getNetworkInsights(entityId)
}
```

---

## Priority Build Order

### 1. Supplier Webhook Endpoint (1 week)

```typescript
// No auth required - guest access
POST /api/suppliers/rfq-webhook
{
  "supplier_id": "GST-123",      // Guest ID OK
  "rfq_id": "rfq-456",
  "action": "receive" | "quote" | "accept" | "reject"
}
```

### 2. Auto-Quote from Inventory (1 week)

```typescript
// When supplier receives RFQ, auto-generate from pricing DB
POST /api/suppliers/auto-quote
{
  "supplier_id": "GST-123",
  "rfq_id": "rfq-456",
  "generate": true,
  "inventory_check": true
}
```

### 3. Nexha-SUTAR Event Bridge (2 weeks)

```typescript
// Emit events to SUTAR services
eventBus.subscribe('inventory.low_stock', async (event) => {
  await sutarGoalOS.decompose({
    type: 'purchase',
    product: event.data.productId,
    quantity: event.data.threshold
  })
})
```

### 4. Auto-Negotiation (2 weeks)

```typescript
// SUTAR Negotiation Engine handles counter-offers
negotiationEngine.start({ buyerId, sellerId, rfqId, targetPrice })

negotiationEngine.onCounterOffer((offer) => {
  // Update deal state machine
  dealStateMachine.recordQuote({
    dealId: offer.dealId,
    supplierId: offer.supplierId,
    quotedAmount: offer.amount
  })
})
```

### 5. Auto-Reputation (1 week)

```typescript
// Post-transaction reputation update
eventBus.subscribe('order.delivered', async (event) => {
  await reputationAggregator.update({
    entityId: event.data.supplierId,
    type: 'supplier',
    metrics: {
      delivery_score: event.data.onTime ? +2 : -5,
      quality_score: event.data.qualityPass ? +2 : -5
    }
  })
})
```

---

## Summary

**Buyer Agent (Procurement):** 60% automated
- RFQ sending ✅
- Supplier matching ✅
- Deal state machine ✅
- Payment (BNPL) ✅
- Delivery tracking ✅
- Negotiation ❌
- Auto-goal ❌
- Auto-contract ❌

**Seller Agent (Supplier):** 20% automated
- RFQ receipt webhook ❌
- Inventory auto-check ❌
- Quote generation ❌
- Counter-offers ❌
- Policy validation ❌
- Auto-reputation ❌

**Missing:** Nexha-SUTAR bridge service connecting commerce events to autonomous workforce.

---

**Last Updated:** June 15, 2026
