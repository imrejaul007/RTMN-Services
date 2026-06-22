# SUTAR OS + Nexha - How They Work Together

> **⚠️ DEPRECATED (2026-06-22)** — This document is from June 18, 2026 and predates:
> - The Phase A Hub (REZ-ecosystem-connector on port 4399)
> - The Phase C backbone services (sutar-supplier-registry 4280, sutar-logistics 4285, sutar-warehouse-network 4288, sutar-trade-finance 4287)
> - The 2026-06-22 port renumber (trust 4180→4291, contract 4185→4292, negotiation 4191→4293, economy 4251→4294, decision 4240→4290)
> - The 2026-06-21 marketplace move to BLR AI Marketplace
> - The `proxyToUpstream()` body-forwarding fix in the Hub
>
> **Use the new authoritative docs:**
> - [docs/sutar-os/README.md](docs/sutar-os/README.md) — service inventory + boundaries
> - [docs/sutar-os/ARCHITECTURE.md](docs/sutar-os/ARCHITECTURE.md) — 7 layers + Hub-as-bridge + Foundation bridges
> - [docs/sutar-os/HUB-CAPABILITY-MAP.md](docs/sutar-os/HUB-CAPABILITY-MAP.md) — capability-based routing
> - [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) — honest inventory of what runs
>
> This file is kept only for historical reference. Do NOT cite its port numbers or service locations.

**Last Updated:** June 18, 2026 (DEPRECATED)

---

## What is SUTAR OS?

**SUTAR** = **S**ecure **U**niversal **T**rusted **A**gent & **R**eputation

It's a **decentralized identity and reputation system** for commerce networks.

### Core Functions:

```
┌─────────────────────────────────────────────────────────────┐
│                         SUTAR OS                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   CorpID    │    │    Trust    │    │   Policy    │   │
│  │  (Identity) │    │   Score     │    │  (Access)   │   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            │                               │
│                     ┌──────▼──────┐                        │
│                     │  Event Bus  │                        │
│                     │  (Pub/Sub)  │                        │
│                     └─────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### SUTAR API Endpoints:

```bash
# 1. Issue Identity (CorpID)
POST /corpid/issue
{
  "type": "buyer",        # or "supplier", "seller"
  "businessName": "ABC Corp",
  "email": "abc@corp.com"
}
Response: { "corpId": "BUY-ABC123XYZ" }

# 2. Link Trust Score
POST /trust/link
{ "corpId": "BUY-ABC123", "subject": "buyer" }
Response: { "trustScoreId": "trust_abc123" }

# 3. Sync Reputation Data
POST /trust/sync
{
  "corpId": "BUY-ABC123",
  "subject": "buyer",
  "overallScore": 85,
  "breakdown": {
    "delivery_score": 90,
    "quality_score": 80,
    "payment_score": 85
  }
}

# 4. Policy Evaluation
POST /policy/evaluate
{ "action": "buyer.credit_limit.change", "corpId": "BUY-ABC123", "context": { "newLimit": 50000 } }
Response: { "allowed": true, "reason": "policy p5 allows" }

# 5. Event Bus
POST /events/publish
{ "topic": "marketplace.order.created", "payload": {...} }
```

---

## What is Nexha?

**Nexha** = Unified Commerce Network Infrastructure

It's the **operating system for B2B commerce networks** connecting manufacturers, distributors, franchises, and merchants.

### Nexha Architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXHA ECOSYSTEM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                    Nexha Gateway (5002)                      │     │
│  │              Single entry point for all services             │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                              │                                      │
│     ┌────────────────────────┼────────────────────────┐            │
│     │                        │                        │            │
│     ▼                        ▼                        ▼            │
│ ┌──────────┐          ┌──────────┐          ┌──────────┐          │
│ │Distribution│          │ Franchise│          │Procurement│          │
│ │    OS    │          │    OS    │          │    OS    │          │
│ │  (4300)  │          │  (4310)  │          │  (4320)  │          │
│ └──────────┘          └──────────┘          └──────────┘          │
│                                                      │            │
│     ┌────────────────────────┼────────────────┐    │            │
│     │                        │                │    │            │
│     ▼                        ▼                ▼    │            │
│ ┌──────────┐          ┌──────────┐    ┌──────────┐  │            │
│ │Manufacturing│        │Trade     │    │Intelligence│  │            │
│ │    OS    │          │Finance   │    │  (4350)   │  │            │
│ │  (4330)  │          │  (4340)  │    │           │  │            │
│ └──────────┘          └──────────┘    └──────────┘  │            │
│                                                      │            │
│     ┌───────────────────────────────────────────────┘            │
│     │                                                                │
│     ▼                                                                │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │                    Ecosystem Connector (4399)                  │     │
│ │              Event Bus + Cross-OS Orchestration              │     │
│ └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Nexha Services:

| Service | Port | Purpose |
|---------|------|---------|
| **Nexha Gateway** | 5002 | Unified API entry |
| **DistributionOS** | 4300 | Van sales, routes, delivery |
| **FranchiseOS** | 4310 | Multi-location franchise mgmt |
| **ProcurementOS** | 4320 | B2B marketplace, RFQ, agents |
| **ManufacturingOS** | 4330 | Production, BOM |
| **TradeFinance** | 4340 | BNPL, credit, FX |
| **Intelligence** | 4350 | AI predictions, fraud detection |
| **Connector** | 4399 | Event bus, cross-OS |
| **Portal** | 4388 | B2B Marketplace UI |
| **NextaBizz** | 3000 | B2B Procurement Platform |

---

## How SUTAR + Nexha Work Together

### The Agentic Marketplace Pattern

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENTIC MARKETPLACE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   BUYER                              SELLER                          │
│   (Department OS)                    (Supplier)                       │
│       │                                  │                           │
│       ▼                                  ▼                           │
│ ┌──────────────┐                   ┌──────────────┐                 │
│ │  BUYER AGENT │                   │ SELLER AGENT │                 │
│ │  • RFQ Create│                   │ • Auto-Quote │                 │
│ │  • Match     │                   │ • Counter    │                 │
│ │  • Award     │                   │ • Negotiate  │                 │
│ └──────┬───────┘                   └──────┬───────┘                 │
│        │                                    │                         │
│        └────────────────┬─────────────────┘                          │
│                         │                                            │
│                         ▼                                            │
│              ┌─────────────────────┐                                 │
│              │   NEXHA OS          │                                 │
│              │   ProcurementOS     │                                 │
│              │   (4320)            │                                 │
│              └──────────┬──────────┘                                 │
│                         │                                            │
│                         ▼                                            │
│              ┌─────────────────────┐                                 │
│              │      SUTAR OS       │                                 │
│              │   (Identity+Trust)   │                                 │
│              └──────────┬──────────┘                                 │
│                         │                                            │
│     ┌───────────────────┼───────────────────┐                       │
│     │                   │                   │                        │
│     ▼                   ▼                   ▼                        │
│ ┌────────┐        ┌──────────┐        ┌──────────┐                   │
│ │ CorpID │        │  Trust   │        │  Policy  │                   │
│ │ Issue  │        │  Score   │        │ Evaluate │                   │
│ │ ID     │        │ Reputation│       │ Access   │                   │
│ └────────┘        └──────────┘        └──────────┘                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Complete Workflow Example

### 1. Buyer Creates RFQ

```bash
POST /api/marketplace/rfq
{
  "buyerId": "buyer-corp",
  "products": [{"name": "Rice", "quantity": "50 bags"}],
  "timeline": "1 week"
}
```

**What happens internally:**

```
1. Nexha ProcurementOS receives RFQ
         ↓
2. SUTAR /corpid/issue → Creates BUY-XXX ID if new
         ↓
3. SUTAR /trust/link → Links buyer's trust score
         ↓
4. Nexha matches suppliers based on:
   - Trust score (from SUTAR)
   - Capability match
   - Historical performance
         ↓
5. Invitations sent to matched suppliers
```

### 2. Supplier Registers & Quotes

```bash
POST /api/marketplace/supplier
{
  "businessName": "Rice Mills Inc",
  "email": "sales@ricemills.com",
  "products": [{"name": "Rice", "category": "food"}]
}
```

**What happens internally:**

```
1. SUTAR /corpid/issue → Creates SUP-XXX ID
         ↓
2. SUTAR /trust/sync → Initial trust score
         ↓
3. Nexha Procurement registers supplier
         ↓
4. Supplier Agent auto-generates quote
         ↓
5. SUTAR trust updated with supplier reputation
```

### 3. Deal Award & Fulfillment

```bash
POST /api/marketplace/deal/award
{
  "dealId": "DEAL-123",
  "supplierId": "SUP-XXX"
}
```

**What happens internally:**

```
1. SUTAR /policy/evaluate → Check if credit limit OK
         ↓
2. Nexha awards deal to supplier
         ↓
3. Order created in ProcurementOS
         ↓
4. SUTAR /events/publish → "deal.awarded"
         ↓
5. RTMN Finance OS notified → Create invoice
         ↓
6. RTMN Operations OS notified → Track fulfillment
```

### 4. Payment Settlement

```bash
POST /api/marketplace/deal/payment
{
  "dealId": "DEAL-123",
  "amount": 50000,
  "method": "bank_transfer"
}
```

**What happens internally:**

```
1. Nexha TradeFinance processes payment
         ↓
2. SUTAR /trust/sync → Update supplier score
   - delivery_score: +10 (delivered on time)
   - payment_score: +10 (paid promptly)
         ↓
3. SUTAR /events/publish → "payment.settled"
         ↓
4. RTMN Finance OS → Record transaction
         ↓
5. Supplier reputation updated
```

---

## Deal State Machine (17 States)

```
rfq_created
    ↓
invitations_sent
    ↓
quotes_received
    ↓
negotiating ←──────────────────┐
    ↓                         │
awarded                        │
    ↓                         │ (counter-offers)
order_created                  │
    ↓                         │
processing ────────────────────│
    ↓                         │
shipped ───────────────────────│
    ↓                         │
delivered ─────────────────────│
    ↓                         │
fulfilled ─────────────────────┘
    ↓
payment_settled
    ↓
completed
```

---

## SUTAR Policy Examples

| Action | Policy | Result |
|--------|--------|--------|
| `supplier.status.verified` | p2 | ✅ Allow |
| `supplier.status.active` | p1 | ✅ Allow |
| `supplier.status.blacklisted` | p4 | ✅ Allow |
| `buyer.credit_limit.change` (< 10 Cr) | p5 | ✅ Allow |
| `buyer.credit_limit.change` (> 10 Cr) | Guardrail | ❌ Deny |

---

## Current Running Services

| Service | Port | Status |
|---------|------|--------|
| SUTAR Mock | 4799 | ✅ Running |
| Commerce Identity | 8000 | ✅ Running |
| Nexha Portal | 3000 | ✅ Running |
| Nexha ProcurementOS | 4320 | ❌ Not started |
| Nexha TradeFinance | 4340 | ❌ Not started |
| Nexha Intelligence | 4350 | ❌ Not started |
| Nexha Connector | 4399 | ❌ Not started |

---

## How to Test

```bash
# 1. Issue a CorpID
curl -X POST http://localhost:4799/corpid/issue \
  -H "Content-Type: application/json" \
  -d '{"type": "buyer", "businessName": "Test Corp"}'

# 2. Link Trust Score
curl -X POST http://localhost:4799/trust/link \
  -H "Content-Type: application/json" \
  -d '{"corpId": "BUY-XXX", "subject": "buyer"}'

# 3. Sync Trust Data
curl -X POST http://localhost:4799/trust/sync \
  -H "Content-Type: application/json" \
  -d '{"corpId": "BUY-XXX", "subject": "buyer", "overallScore": 85}'

# 4. Evaluate Policy
curl -X POST http://localhost:4799/policy/evaluate \
  -H "Content-Type: application/json" \
  -d '{"action": "buyer.credit_limit.change", "corpId": "BUY-XXX"}'

# 5. Publish Event
curl -X POST http://localhost:4799/events/publish \
  -H "Content-Type: application/json" \
  -d '{"topic": "test.event", "payload": {"message": "hello"}}'

# 6. Check Stats
curl http://localhost:4799/stats
```

---

## Summary

| Component | Role |
|-----------|------|
| **SUTAR OS** | Identity + Trust + Policy + Events |
| **Nexha Gateway** | Single entry point |
| **ProcurementOS** | Buyer/Seller Agents + RFQ + Deals |
| **TradeFinance** | BNPL + Payments |
| **Intelligence** | AI + Predictions |
| **Connector** | Event Bus + Cross-OS sync |

**Together they create:** A trust-based B2B marketplace where every participant has verified identity, reputation scores, and policy-based access control.

---

*SUTAR + Nexha = Trust Infrastructure for Commerce Networks*
