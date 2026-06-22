# SUTAR OS Integration Guide

**Version:** 4.0.0
**Last Updated:** June 22, 2026

> **Change log v4.0 (2026-06-22):**
> - **Hub-first approach** — all examples now go through `localhost:4399/api/sutar/*` (and Phase C via `/api/nexha/*`)
> - Renumbered ports: trust=**4291**, contract=**4292**, negotiation=**4293**, economy=**4294**, decision=**4290**
> - **Added §Boundaries** — explicit list of systems SUTAR does NOT integrate with (REZ Merchant, AdBazaar, Copilot, RAZO, Voice, etc.) and the workaround for each
> - **Added do-app integration section** — the do-app's `hojaiClient.ts` is the canonical client for SUTAR
> - **Added Phase C backbone integration** — supplier-registry, logistics, warehouse-network, trade-finance

---

## Overview

This guide explains how to integrate SUTAR OS with your services, applications, and AI agents. **The recommended integration pattern is via the RTMN Unified Hub** at `localhost:4399`, not direct service calls.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration via Hub (recommended)](#integration-via-hub-recommended)
3. [Integration with RTMN Services](#integration-with-rtmn-services)
4. [Integration with do-app](#integration-with-do-app)
5. [Integration with HOJAI AI Foundation](#integration-with-hojai-ai-foundation)
6. [Integration with Industry OS](#integration-with-industry-os)
7. [Phase C Backbone (Nexha)](#phase-c-backbone-nexha)
8. [Building AI Agents](#building-ai-agents)
9. [Boundaries — what SUTAR does NOT integrate with](#boundaries--what-sutar-does-not-integrate-with)
10. [SUTAR Client SDK](#sutar-client-sdk)

---

## Quick Start

### 1. Call via the Hub (recommended)

```bash
# Capability map — what does each service handle?
curl http://localhost:4399/api/sutar/capabilities

# Direct  to any service (GET/POST/PUT/PATCH/DELETE)
curl -X POST http://localhost:4399/api/sutar/sutar-agent-teaming/api/teaming/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"price-compare","mission":"compare-prices","size":3}'

# Phase C backbone
curl "http://localhost:4399/api/nexha/sutar-warehouse-network/api/v1/warehouses?state=MH"
```

The Hub's `proxyToUpstream()` helper at [REZ-ecosystem-connector/src/index.ts:87-133](companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts#L87) handles the `express.json()` body-parsing pitfall and the URL path rewriting for you.

### 2. Direct service call (development only)

```bash
# SUTAR Gateway (capability map + service registry)
curl http://localhost:4140/health

# Individual services
curl http://localhost:4290/health    # Decision Engine
curl http://localhost:4291/health    # Trust Engine
curl http://localhost:4292/health    # Contract OS
curl http://localhost:4293/health    # Negotiation Engine
curl http://localhost:4294/health    # Economy OS
```

Direct calls bypass the Hub and are **not body-forwarding-safe**; use the Hub for any non-trivial request.

---

## Integration via Hub (recommended)

### Architecture

```
Your app
  │
  │  HTTP (axios/fetch)
  ▼
RTMN Hub (localhost:4399)
  │
  │  proxyToUpstream() — handles body + path + headers
  ▼
SUTAR service (localhost:4140, 4290, 4291, …, 4294, 4280, 4285, 4287, 4288, …)
```

### Example: Axios client

```typescript
import axios from 'axios';

const HUB_URL = process.env.RTMN_HUB_URL || 'http://localhost:4399';

// Form a team via Hub
async function formTeam(name: string, mission: string, size: number) {
  const response = await axios.post(
    `${HUB_URL}/api/sutar/sutar-agent-teaming/api/teaming/teams`,
    { name, mission, size }
  );
  return response.data;
}

// Get trust score via Hub
async function getTrustScore(entityId: string) {
  const response = await axios.get(
    `${HUB_URL}/api/sutar/sutar-trust-engine/api/trust/agent/${entityId}`
  );
  return response.data;
}

// Get warehouse availability via Hub
async function findWarehouses(state: string) {
  const response = await axios.get(
    `${HUB_URL}/api/nexha/sutar-warehouse-network/api/v1/warehouses`,
    { params: { state } }
  );
  return response.data;
}
```

### Hub capability map

```bash
curl http://localhost:4399/api/sutar/capabilities
```

Returns:
```json
{
  "capabilities": {
    "team-formation": ["sutar-agent-teaming"],
    "leader-election": ["sutar-agent-teaming"],
    "task-dag": ["sutar-agent-teaming"],
    "multi-agent-workflow": ["sutar-agent-teaming", "sutar-agent-orchestration"],
    "payment": ["sutar-agent-contracts"],
    "reputation": ["sutar-trust-engine"],
    "negotiation": ["sutar-negotiation"],
    "merchant-discovery": ["sutar-agent-marketplace"],
    "agent-registry": ["sutar-agent-network"],
    "analytics": ["sutar-agent-analytics"],
    "contract": ["sutar-contract-os"],
    "identity": ["sutar-agent-id"],
    "memory": ["sutar-memory-bridge"]
  },
  "services": { ... }
}
```

Use this map for capability-based routing — given a high-level intent, look up which SUTAR services handle it.

---

## Integration with RTMN Services

### Sales OS Integration

The Sales OS uses SUTAR for:
- **Deal Negotiation** — AI-powered deal closing
- **Lead Scoring** — Trust-based lead qualification
- **Contract Management** — Smart contracts for sales agreements
- **Performance Tracking** — Goal-based sales tracking
- **Karma scoring** — Rep reputation (via sutar-karma.js)

**File:** [services/sales-hub/src/services/sutarBridge.ts](services/sales-hub/src/services/sutarBridge.ts)

```typescript
import { SutarClient } from '@hojai/sutar-client';
import { SUTAR_CONFIG } from '../config/sutar';

const sutar = new SutarClient(SUTAR_CONFIG);

export class SutarBridge {
  // Negotiate a deal
  async negotiateDeal(dealData: DealData) {
    return await sutar.negotiation.start({
      parties: [dealData.buyerId, dealData.sellerId],
      subject: 'sales-deal',
      initialOffer: { price: dealData.amount, terms: dealData.terms }
    });
  }

  // Score a lead using trust engine (via Hub :4399 → :4291)
  async scoreLead(leadId: string) {
    const trust = await this.sutarClient.get(`/api/sutar/sutar-trust-engine/api/trust/agent/${leadId}`);
    return trust.trustScore;
  }

  // Create sales contract (via Hub → :4292)
  async createSalesContract(contractData: ContractData) {
    return await this.sutarClient.post('/api/sutar/sutar-contract-os/api/contracts', {
      type: 'sales-agreement',
      parties: [contractData.buyerId, contractData.sellerId],
      terms: contractData.terms
    });
  }
}
```

**Note:** Sales OS also has [industry-os/services/sales-os/integrations/sutar-karma.js](industry-os/services/sales-os/integrations/sutar-karma.js) which is a direct axios client to SUTAR's economy-os. Updated 2026-06-22 to port 4294 (renumbered from 4251).

### Restaurant OS Integration

The Restaurant OS uses SUTAR for:
- **Ingredient Sourcing** — supplier-registry (Phase C.1)
- **Dynamic Pricing** — Decision engine (sutar-decision-engine :4290) + sutar-pricing-intelligence (:4286, Phase C.6) for market-aggregated supplier price comparison
- **Reservation Negotiation** — Negotiation engine

**File:** [industry-os/services/restaurant-os/src/industry-integration.js](industry-os/services/restaurant-os/src/industry-integration.js)

```javascript
// Restaurant OS declares SUTAR URLs in RTMN_SERVICES config
// [src/index.js:53-54](industry-os/services/restaurant-os/src/index.js#L53)
// const RTMN_SERVICES = {
//   sutarOS: 'http://localhost:4140',  // SUTAR Gateway
//   sutarCore: 'http://localhost:4141',  // ⚠️ stale — no service on 4141
//   ...
// };
```

**Recommendation:** Use the Hub instead of these direct URLs.

```javascript
// Recommended: use Hub
class RestaurantSutarIntegration {
  async findBestSupplier(requirements) {
    // Via Hub → supplier-registry
    const response = await fetch(
      `http://localhost:4399/api/nexha/sutar-supplier-registry/api/v1/suppliers?` +
      `category=${requirements.ingredient}&minTrustScore=80`
    );
    const { suppliers } = await response.json();
    return suppliers[0];
  }

  async optimizeMenuPrice(menuItem) {
    // Via Hub → decision-engine (multi-option ranking)
    const response = await fetch('http://localhost:4399/api/sutar/sutar-decision-engine/api/v1/rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: 'menu-pricing',
        data: { item: menuItem.name, cost: menuItem.cost, demand: menuItem.demand },
        options: ['increase', 'decrease', 'maintain']
      })
    });
    return await response.json();
  }
}
```

---

## Integration with do-app

The do-app (consumer-facing mobile + Express backend at port 3001) is the canonical consumer of SUTAR. It uses a `hojaiClient` that wraps both SUTAR and Foundation calls.

**File:** [companies/do-app/backend/src/services/hojaiClient.ts](companies/do-app/backend/src/services/hojaiClient.ts)

```typescript
// SUTAR client (lines 416-422)
sutar: {
  listBusinesses: async (params) => { /* GET via Hub → sutar-agent-marketplace */ },
  getBusiness: async (id) => { /* GET via Hub → sutar-agent-marketplace */ },
},

// Nexha client (Phase C backbone)
nexha: {
  listSuppliers: async (params) => { /* GET via Hub → sutar-supplier-registry */ },
  getShippingQuote: async (req) => { /* POST via Hub → sutar-logistics */ },
  findWarehouses: async (params) => { /* GET via Hub → sutar-warehouse-network */ },
  getCreditOffer: async (req) => { /* POST via Hub → sutar-trade-finance */ },
  comparePrices: async (req) => { /* POST via Hub → sutar-pricing-intelligence (Phase C.6) */ },
  recommendPrice: async (req) => { /* POST via Hub → sutar-pricing-intelligence (Phase C.6) */ },
},

// SADA direct call (NOT via Hub)
sada: {
  getTrustScore: async (entityId) => { /* GET :4190 directly */ },
},
```

**Why some go via Hub and some don't:**
- **SUTAR + Nexha** — go via Hub (`/api/sutar/*` and `/api/nexha/*`) so request bodies and headers are forwarded correctly
- **SADA** — direct call to `:4190` for low-latency trust lookups (the Hub adds ~5-20ms overhead per request, and SADA lookups are hot-path)

See [do-app/INTEGRATION-WITH-RTMN.md](companies/do-app/docs/INTEGRATION-WITH-RTMN.md) for the full do-app ↔ RTMN integration spec.

---

## Integration with HOJAI AI Foundation

SUTAR's **4 Layer 2 services** are the SUTAR-scoped views of Foundation services. **You should normally use SUTAR's Layer 2 services, not the Foundation services directly**, because SUTAR applies its own authorization/audit envelope.

| If you need… | Use this SUTAR service (port) | Avoid (out of SUTAR scope) |
|---|---|---|
| AI agent identity | sutar-identity (4144) → CorpID (4702) | Calling CorpID directly |
| SUTAR-scoped digital twins | sutar-twin-os (4142) → TwinOS Hub (4705) | Individual Customer/Order/Wallet twins |
| Agent persistent memory | sutar-memory-bridge (4143) → MemoryOS (4703) | MemoryOS directly |
| Trust score with SADA fallback | sutar-trust-engine (4291) → SADA (4190) | Calling SADA directly (no fallback) |

**Example:**

```typescript
// ❌ Don't: call CorpID directly from a SUTAR consumer
const identity = await fetch('http://localhost:4702/api/identity/lookup/agent_123');

// ✅ Do: use sutar-identity via Hub
const identity = await fetch('http://localhost:4399/api/sutar/sutar-identity/api/identity/lookup/agent_123');
```

---

## Integration with Industry OS

Each Industry OS can integrate with SUTAR through the **unified-os-hub** (now at [companies/RABTUL-Technologies/REZ-ecosystem-connector](companies/RABTUL-Technologies/REZ-ecosystem-connector/)):

```typescript
// Hub provides SUTAR integration to all 24 industry OSes
export const sutarIntegrations = {
  sales: {
    negotiation: 'sutar-negotiation',           // :4293
    contracts: 'sutar-contract-os',            // :4292
    trust: 'sutar-trust-engine'                // :4291
  },
  restaurant: {
    sourcing: 'sutar-supplier-registry',       // :4280 (Phase C.1)
    pricing: 'sutar-decision-engine',          // :4290
    marketPrices: 'sutar-pricing-intelligence', // :4286 (Phase C.6)
    logistics: 'sutar-logistics',              // :4285 (Phase C.2)
    warehousing: 'sutar-warehouse-network',    // :4288 (Phase C.5)
    finance: 'sutar-trade-finance'             // :4287 (Phase C.4)
  },
  hotel: {
    booking: 'sutar-negotiation-engine',
    pricing: 'sutar-decision-engine',
    reviews: 'sutar-trust-engine'
  },
  healthcare: {
    appointments: 'sutar-negotiation-engine',
    contracts: 'sutar-contract-os',
    trust: 'sutar-trust-engine'
  },
  // ... all 24 industries
};
```

### Industry-specific use cases

| Industry | SUTAR Use Case | Services |
|---|---|---|
| **Sales** | Deal negotiation, lead scoring, contracts | sutar-negotiation, sutar-trust-engine, sutar-contract-os |
| **Restaurant** | Supplier sourcing, dynamic pricing, BNPL | sutar-supplier-registry, sutar-decision-engine, sutar-trade-finance |
| **Hotel** | Booking negotiation, pricing optimization | sutar-negotiation, sutar-decision-engine |
| **Healthcare** | Appointment scheduling, patient contracts | sutar-negotiation, sutar-contract-os |
| **Real Estate** | Property negotiation, lease contracts | sutar-negotiation, sutar-contract-os |
| **Legal** | Contract drafting, compliance checking | sutar-contract-os, sutar-policy-os |
| **Finance** | Loan approval, risk assessment | sutar-decision-engine, sutar-trade-finance |
| **Education** | Course pricing, enrollment contracts | sutar-decision-engine, sutar-contract-os |
| **Retail** | Inventory sourcing, dynamic pricing | sutar-supplier-registry, sutar-decision-engine |
| **Travel** | Booking negotiation, price optimization | sutar-negotiation, sutar-decision-engine |
| **Manufacturing** | Supplier contracts, quality contracts | sutar-supplier-registry, sutar-contract-os |
| **Construction** | Project contracts, vendor management | sutar-supplier-registry, sutar-contract-os |

---

## Phase C Backbone (Nexha)

The 4 Phase C services are the **real implementations of the Nexha commerce network**. They are registered in BOTH `SUTAR_SERVICES` and `NEXHA_SERVICES` maps.

```typescript
// Supplier lookup
const suppliers = await fetch(
  'http://localhost:4399/api/nexha/sutar-supplier-registry/api/v1/suppliers?category=cement&minTrustScore=80'
).then(r => r.json());

// Shipping quote (with cache-friendly signature)
const quote = await fetch('http://localhost:4399/api/nexha/sutar-logistics/api/v1/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: 'Mumbai',
    destination: 'Bengaluru',
    package: { weightKg: 10, volumeM3: 0.05 },
    serviceLevel: 'standard'
  })
}).then(r => r.json());

// Warehouse discovery + slot booking
const warehouses = await fetch(
  'http://localhost:4399/api/nexha/sutar-warehouse-network/api/v1/warehouses?state=MH&needsColdChain=true'
).then(r => r.json());

// BNPL credit offer
const offer = await fetch('http://localhost:4399/api/nexha/sutar-trade-finance/api/v1/credit-offers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entityId: 'ent_001',
    amount: 100000,
    termMonths: 3,
    trustScore: 78  // pre-fetched from SADA
  })
}).then(r => r.json());
```

See [API.md §13](API.md#13-sutar-phase-c-backbone-nexha-commerce-network) for the full Phase C endpoint reference.

---

## Building AI Agents

### Register an AI Agent

```javascript
// Via Hub
async function registerAgent(name, capabilities) {
  const response = await fetch('http://localhost:4399/api/sutar/sutar-agent-id/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, capabilities, type: 'service-provider' })
  });
  return await response.json();
}
```

### Form a Team

```javascript
async function formTeam(name, mission, size) {
  return await fetch('http://localhost:4399/api/sutar/sutar-agent-teaming/api/teaming/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mission, size })
  }).then(r => r.json());
}
```

### Negotiate with Other Agents

```javascript
async function startNegotiation(parties, subject, initialOffer) {
  return await fetch('http://localhost:4399/api/sutar/sutar-negotiation/api/v1/negotiations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parties, subject, initialOffer })
  }).then(r => r.json());
}

// ACP protocol for agent-to-agent messaging
// Message types: QUERY, QUOTE, COUNTER, ACCEPT, REJECT, ORDER, TRACK, DISPUTE
// See [acp-protocol/CLAUDE.md](companies/HOJAI-AI/sutar-os/agents/acp-protocol/CLAUDE.md)
```

### Build Trust Through Transactions

```javascript
// Complete several transactions to build trust
for (let i = 0; i < 10; i++) {
  await fetch('http://localhost:4399/api/sutar/sutar-contract-os/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'service-delivery',
      parties: [agentId, 'client_id'],
      terms: { service: 'translation', quantity: 100 }
    })
  });
}

// Get trust score (via Trust Engine → SADA federation)
const trust = await fetch(
  `http://localhost:4399/api/sutar/sutar-trust-engine/api/trust/agent/${agentId}`
).then(r => r.json());
console.log('Trust score:', trust.trustScore);
```

---

## Boundaries — what SUTAR does NOT integrate with

To avoid confusion: SUTAR OS has **NO direct integration** with these systems. If you need to compose them with SUTAR, do it at the Hub or app layer.

| System | Why no direct integration | Workaround |
|---|---|---|
| **REZ Merchant** (crm-hub, wallet, auth, checkout-sdk, care) | SUTAR's `economy-os` has its own payment primitives ([payment.service.ts:13](companies/HOJAI-AI/sutar-os/economy/sutar-economy-os/src/services/payment.service.ts#L13)) | Use shared Hub workflows: `/api/customer360`, `/api/workflow/lead-to-revenue` |
| **AdBazaar** (DSP :4990, Audience :4805, Attribution :4803, CDP :4901) | Out of SUTAR scope (advertising platform) | Use AdBazaar's own API or Hub `/api/ads/*`, `/api/audiences/*`, `/api/attribution/*`, `/api/cdp/*` |
| **Revenue Intelligence Copilot** (industry-os/services/revenue-intelligence-os/) | Reads Sales+Marketing+Operations only — no SUTAR refs in source | Use Revenue Copilot for revenue analysis; SUTAR is for autonomous agent economics |
| **RAZO Keyboard** (:4725) | Intent detection is independent | RAZO doesn't route through SUTAR |
| **Voice Twin** (:4876) | TTS/STT only | Use directly, no SUTAR integration |
| **Speech Intelligence** (:4870) | Mock ASR (no real STT) | Not in SUTAR scope |
| **Genie Gateway** (:4701) + 23 specialists (4709-4727) | Genie is a separate consumer-facing product | do-app's `hojaiClient` talks to Genie directly; SUTAR is the AI economic layer behind Genie |
| **Industry OS** (Restaurant, Hotel, Healthcare, …) | They reach SUTAR via Hub | Use `RTMN_SERVICES.sutarOS` config or Hub directly |
| **Customer Twin** (:4895), Order Twin (:4885), Wallet Twin (:4896) | These are individual twins; SUTAR's `sutar-twin-os` talks to TwinOS Hub (4705) | Use SUTAR's `sutar-twin-os` for SUTAR-scoped twins |
| **External clients** (e.g. Leverge) | Per RTMN External Clients Policy | Out of ecosystem; not a SUTAR concern |

---

## SUTAR Client SDK

### Installation (when available)

```bash
npm install @hojai/sutar-client
```

> **Note (2026-06-22):** The SUTAR Client SDK is not yet published. In the meantime, use the Hub HTTP API (`/api/sutar/<service>/*`) as shown above. The do-app's [hojaiClient.ts](companies/do-app/backend/src/services/hojaiClient.ts) is the reference implementation of a SUTAR client.

### Future SDK surface (planned)

```typescript
// Once @hojai/sutar-client is published
import { SutarClient } from '@hojai/sutar-client';

const sutar = new SutarClient({
  hub: 'http://localhost:4399',  // Hub URL
  apiKey: process.env.SUTAR_API_KEY,
  timeout: 30000,
  retries: 3
});

// Marketplace — MOVED to BLR AI Marketplace on 2026-06-21
// (see companies/HOJAI-AI/blr-ai-marketplace/services/)
// sutar.marketplace.listServices({ category, limit })
// sutar.marketplace.search({ query, filters })
// sutar.marketplace.createListing({ name, price, category })
// sutar.marketplace.purchase({ serviceId, paymentMethodId })
// sutar.marketplace.getService(serviceId)

// Decision Engine (:4290)
sutar.decision.evaluate({ context, data, options })
sutar.decision.checkPolicy({ policy, action, context })
sutar.decision.getHistory({ limit, offset })

// Negotiation Engine (:4293)
sutar.negotiation.start({ parties, subject, initialOffer })
sutar.negotiation.getStatus(negotiationId)
sutar.negotiation.submitOffer(negotiationId, offer)
sutar.negotiation.acceptOffer(negotiationId)
sutar.negotiation.rejectOffer(negotiationId, reason)

// Trust Engine (:4291)
sutar.trust.getAgentScore(agentId)
sutar.trust.submitFeedback({ agentId, rating, comment })
sutar.trust.getReputation(agentId)
sutar.trust.getSadaStatus()  // Federation health

// Discovery Engine (:4256)
sutar.discovery.listOpportunities({ category, minValue })
sutar.discovery.match({ agentId, capabilities, budget })
sutar.discovery.getRecommendations(agentId)

// Goal OS (:4242)
sutar.goals.create({ name, target, deadline })
sutar.goals.get(goalId)
sutar.goals.decompose(goalId)
sutar.goals.getProgress(goalId)

// Contract OS (:4292)
sutar.contract.create({ type, parties, terms })
sutar.contract.get(contractId)
sutar.contract.execute(contractId)
sutar.contract.terminate(contractId, reason)

// Economy OS (:4294)
sutar.economy.getBalance(agentId)
sutar.economy.transfer({ from, to, amount, currency })
sutar.economy.getTransactions({ agentId, limit })

// Phase C backbone
sutar.supplier.search({ category, minTrustScore })
sutar.supplier.create({ name, category, state, pincode })
sutar.logistics.quote({ origin, destination, package, serviceLevel })
sutar.logistics.book({ quoteId, senderId, recipientId })
sutar.warehouse.search({ state, needsColdChain })
sutar.warehouse.bookSlot({ slotId, warehouseId, entityId, packageRef })
sutar.tradeFinance.requestCreditOffer({ entityId, amount, termMonths, trustScore })
```

### Event Listeners (future)

```javascript
// Listen to negotiation events
sutar.on('negotiation.started', (negotiation) => {
  console.log('Negotiation started:', negotiation);
});

sutar.on('negotiation.completed', (result) => {
  console.log('Negotiation completed:', result);
});

// Listen to contract events
sutar.on('contract.executed', (contract) => {
  console.log('Contract executed:', contract);
});

// Listen to trust events
sutar.on('trust.score.changed', (data) => {
  console.log('Trust score changed:', data);
});
```

---

## Best Practices

### 1. Use the Hub, not direct service URLs

```javascript
// ❌ Don't: call SUTAR services directly (bypasses body-forwarding + auth)
const response = await fetch('http://localhost:4291/api/trust/agent/123');

// ✅ Do: use the Hub
const response = await fetch('http://localhost:4399/api/sutar/sutar-trust-engine/api/trust/agent/123');
```

### 2. Authentication

```javascript
const headers = {
  'Authorization': `Bearer ${process.env.SUTAR_TOKEN}`,
  'Content-Type': 'application/json'
};
```

For SADA direct calls (low-latency trust lookups):

```javascript
const sadaHeaders = {
  'Authorization': `Bearer ${process.env.SADA_TOKEN}`
};
```

### 3. Error Handling

```javascript
try {
  const result = await fetch(`${HUB_URL}/api/sutar/sutar-negotiation/api/v1/negotiations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (result.status === 401) {
    // Refresh SUTAR_TOKEN
  } else if (result.status === 429) {
    // Exponential backoff
    await new Promise(r => setTimeout(r, 1000));
  } else if (!result.ok) {
    const error = await result.json();
    console.error('SUTAR error:', error);
  }
} catch (err) {
  console.error('Network error:', err);
}
```

### 4. Caching

Cache capability map + service registry responses (they change rarely):

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedCapabilities() {
  const cached = cache.get('capabilities');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await fetch(`${HUB_URL}/api/sutar/capabilities`);
  const data = await response.json();
  cache.set('capabilities', { data, timestamp: Date.now() });
  return data;
}
```

### 5. Trust Federation Awareness

The Trust Engine has a 2s timeout to SADA. If SADA is down, it falls back to local scoring. Always check the SADA status before relying on trust scores in a critical path:

```javascript
async function isTrustFederationHealthy() {
  const response = await fetch(`${HUB_URL}/api/sutar/sutar-trust-engine/api/v1/sada/status`);
  const { sadaReachable } = await response.json();
  return sadaReachable;
}
```

---

## Troubleshooting

### Common Issues

**1. Connection Refused (Hub)**
- Check if RTMN Hub is running: `curl http://localhost:4399/health`
- Start the dev stack: `bash scripts/dev-stack.sh start`

**2. Connection Refused (SUTAR upstream)**
- Check the specific SUTAR service: `curl http://localhost:4291/health`
- Verify the service is in the Hub's `SUTAR_SERVICES` map: `curl http://localhost:4399/api/sutar/capabilities`

**3. 502 from Hub**
- Hub proxy can't reach upstream
- Check if the upstream service is running
- Check [Hub wiring audit 2026-06-22](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md) for stale port references

**4. Authentication Failed (401)**
- Verify `SUTAR_TOKEN` is set (services use `@rtmn/shared/auth` for JWT)
- Check token expiration

**5. Rate Limit Exceeded (429)**
- Default: 100 req/min per service
- Strict: 20 req/min for sensitive endpoints
- Implement exponential backoff

**6. SADA Federation Down**
- Trust Engine falls back to local scoring
- Check SADA status: `curl http://localhost:4399/api/sutar/sutar-trust-engine/api/v1/sada/status`
- If `sadaReachable: false`, your trust scores are local-only

---

## Support

- **Documentation:** [docs/sutar-os/](README.md) — this directory
- **Hub wiring audit:** [SUTAR-HUB-WIRING-AUDIT-2026-06-22.md](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md)
- **Status page:** Check `curl http://localhost:4399/api/sutar/capabilities` and `/api/nexha/capabilities`
- **GitHub:** https://github.com/imrejaul007/hojai-ai (SUTAR source) + https://github.com/imrejaul007/rtmn (Hub + docs)

---

*Last Updated: June 22, 2026*
*SUTAR OS Integration Guide v4.0*
