# Nexha SDK Endpoint Mapping

> **Created:** June 30, 2026  
> **Phase:** Phase 0 - SDK Bridge Foundation  
> **Purpose:** Document how SDK module calls map to existing Nexha services

---

## Overview

This document maps the `@nexha/sdk` module calls to the actual backend service endpoints. The SDK provides a unified interface while routing to specialized microservices.

```
┌─────────────────────────────────────────────────────────────────┐
│                        @nexha/sdk                                │
│                  (Unified Client Interface)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  discovery.suppliers()  ──┐                                     │
│  trust.get()            ──┤                                     │
│  negotiation.start()    ──┼──► SDK Bridge ──► Microservices     │
│  contract.create()      ──┤        (4443)                      │
│  payment.initiate()     ──┤                                     │
│  logistics.track()      ──┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## SDK Module → Service Mapping

| SDK Module | SDK Method | SDK Endpoint | Backend Service | Backend Port | Actual Endpoint |
|------------|------------|--------------|-----------------|--------------|-----------------|
| **discovery** | `suppliers()` | `POST /v1/discover/suppliers` | nexha-discovery-os | **4272** | `POST /api/v1/discover` |
| **discovery** | `categories()` | `GET /v1/discover/categories` | nexha-discovery-os | **4272** | `GET /api/v1/stats` (custom) |
| **discovery** | `byCategory()` | `POST /v1/discover/category/:cat` | nexha-discovery-os | **4272** | `POST /api/v1/discover` |
| **discovery** | `byLocation()` | `POST /v1/discover/location/:loc` | nexha-discovery-os | **4272** | `POST /api/v1/discover` |
| **trust** | `get()` | `GET /v1/trust/:entityId` | nexha-reputation-os | **4271** | `GET /api/v1/scores/:subjectId` |
| **trust** | `isVerified()` | `GET /v1/trust/:entityId/verified` | nexha-reputation-os | **4271** | Custom logic |
| **trust** | `breakdown()` | `GET /v1/trust/:entityId/breakdown` | nexha-reputation-os | **4271** | Custom logic |
| **negotiation** | `start()` | `POST /v1/negotiate/start` | nexha-contract-network | **4381** | `POST /api/v1/contracts` |
| **negotiation** | `counter()` | `POST /v1/negotiate/:id/counter` | nexha-contract-network | **4381** | Custom (needs impl) |
| **negotiation** | `accept()` | `POST /v1/negotiate/:id/accept` | nexha-contract-network | **4381** | `POST /api/v1/contracts/:id/sign` |
| **negotiation** | `reject()` | `POST /v1/negotiate/:id/reject` | nexha-contract-network | **4381** | Custom (needs impl) |
| **negotiation** | `get()` | `GET /v1/negotiate/:id` | nexha-contract-network | **4381** | `GET /api/v1/contracts/:id` |
| **negotiation** | `list()` | `GET /v1/negotiations` | nexha-contract-network | **4381** | `GET /api/v1/contracts` |
| **contract** | `create()` | `POST /v1/contract/create` | nexha-contract-network | **4381** | `POST /api/v1/contracts` |
| **contract** | `get()` | `GET /v1/contract/:id` | nexha-contract-network | **4381** | `GET /api/v1/contracts/:id` |
| **contract** | `sign()` | `POST /v1/contract/:id/sign` | nexha-contract-network | **4381** | `POST /api/v1/contracts/:id/sign` |
| **contract** | `terminate()` | `POST /v1/contract/:id/terminate` | nexha-contract-network | **4381** | `POST /api/v1/contracts/:id/terminate` |
| **payment** | `initiate()` | `POST /v1/payment/initiate` | nexha-payment-network | **4382** | `POST /api/v1/payments` |
| **payment** | `get()` | `GET /v1/payment/:id` | nexha-payment-network | **4382** | `GET /api/v1/payments/:id` |
| **payment** | `release()` | `POST /v1/payment/:id/release` | nexha-payment-network | **4382** | Custom (needs impl) |
| **payment** | `refund()` | `POST /v1/payment/:id/refund` | nexha-payment-network | **4382** | `POST /api/v1/payments/:id/refund` |
| **logistics** | `track()` | `POST /v1/logistics/track` | nexha-autonomous-logistics | **4293** | `POST /api/v1/shipments/plan` |
| **logistics** | `book()` | `POST /v1/logistics/book` | nexha-autonomous-logistics | **4293** | `POST /api/v1/shipments/book` |
| **logistics** | `quote()` | `GET /v1/logistics/quote` | nexha-autonomous-logistics | **4293** | `GET /api/v1/routes` |

---

## Service Details

### 1. nexha-discovery-os (Port 4272)

**Purpose:** Federated search engine combining CapabilityOS + ReputationOS

**Endpoints:**
```
POST /api/v1/discover                    Search (body)
GET  /api/v1/discover                    Search (query params)
POST /api/v1/discover/enhanced           AI-enhanced search (NLP + vectors)
GET  /api/v1/index/:capabilityId        Get indexed capability
POST /api/v1/index                      Index/refresh a capability
POST /api/v1/index/bulk                  Bulk index
DELETE /api/v1/index/:capabilityId       Remove from index
GET  /api/v1/stats                       Index stats
POST /api/v1/nlp/analyze                 Analyze NLP query
GET  /api/v1/availability/:capabilityId  Get availability
POST /api/v1/compliance/check            Check compliance
```

**Features:**
- ✅ NLP query processing
- ✅ Vector embeddings for semantic search
- ✅ Real-time availability filtering
- ✅ Cross-border compliance checking
- ✅ Trust-boosted ranking

---

### 2. nexha-reputation-os (Port 4271)

**Purpose:** ACI (Autonomous Commerce Index) scoring engine

**Endpoints:**
```
POST /api/v1/ingest                     Ingest reputation signal
GET  /api/v1/scores/:subjectId          Get score for entity
GET  /api/v1/scores                      Query scores (with filters)
GET  /api/v1/scores/:subjectId/signals   Get signal log
GET  /api/v1/stats                       Federation stats
```

**Signal Types:**
- `transaction_success`, `transaction_failure`
- `dispute_raised`, `dispute_resolved_in_favor`, `dispute_resolved_against`
- `endorsement_received`, `endorsement_given`
- `verification_kyc`, `verification_business`
- `risk_event_low`, `risk_event_medium`, `risk_event_high`, `risk_event_critical`
- `compliance_violation`

**Trust Bands:**
- Platinum (900-1000)
- Gold (800-899)
- Silver (700-799)
- Bronze (600-699)
- Iron (500-599)
- Restricted (0-499)

---

### 3. nexha-contract-network (Port 4381)

**Purpose:** Smart contract management for autonomous commerce

**Endpoints:**
```
POST /api/v1/contracts                  Create contract
GET  /api/v1/contracts/:id              Get contract
GET  /api/v1/contracts                   List contracts
POST /api/v1/contracts/:id/sign          Sign contract
POST /api/v1/contracts/:id/terminate     Terminate contract
```

**Contract Status:**
- `draft`
- `pending_signature`
- `active`
- `expired`
- `terminated`

---

### 4. nexha-payment-network (Port 4382)

**Purpose:** Payment processing and settlement

**Endpoints:**
```
POST /api/v1/payments                   Create payment
GET  /api/v1/payments/:id               Get payment
GET  /api/v1/payments                    List payments
POST /api/v1/payments/:id/refund        Refund payment
GET  /api/v1/stats                       Payment stats
```

**Payment Status:**
- `pending`
- `processing`
- `completed`
- `failed`
- `refunded`

**Payment Methods:**
- `bank_transfer`
- `upi`
- `card`
- `wallet`
- `escrow`

---

### 5. nexha-autonomous-logistics (Port 4293)

**Purpose:** Multi-modal routing, customs, insurance

**Endpoints:**
```
POST /api/v1/shipments/plan             Generate shipment plan
POST /api/v1/shipments/book             Book planned shipment
GET  /api/v1/shipments/:id/track        Track shipment
POST /api/v1/shipments/:id/reroute      Reroute shipment
POST /api/v1/shipments/:id/cancel       Cancel shipment
GET  /api/v1/carriers                    List 12 built-in carriers
POST /api/v1/customs/check              Check customs requirements
POST /api/v1/insurance/bind             Bind cargo insurance
GET  /api/v1/routes                      Multi-modal routing options
POST /api/v1/carbon/calculate           Calculate carbon footprint
```

**Built-in Carriers (12):**
1. DHL
2. FedEx
3. Maersk
4. UPS
5. USPS
6. Royal Mail
7. Australia Post
8. Japan Post
9. India Post
10. SF Express
11. Delhivery
12. BlueDart

---

## SDK Bridge Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  SDK Bridge (nexha-agent-gateway)            │
│                          Port 4443                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Discovery   │    │    Trust    │    │ Negotiation │  │
│  │   Module    │    │   Module    │    │   Module    │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │          │
│         ▼                  ▼                  ▼          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               Request Router                         │  │
│  │  - Auth validation (NexhaKey)                       │  │
│  │  - Rate limiting                                    │  │
│  │  - Request/Response transformation                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                          │                                │
└──────────────────────────┼──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  discovery-os │  │reputation-os │  │  contract-   │
│    :4272     │  │    :4271     │  │   network    │
│              │  │              │  │   :4381      │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Request/Response Transformation

### Discovery Request

**SDK Format:**
```typescript
interface SupplierSearchParams {
  product?: string;
  location?: string;
  country?: string;
  min_trust?: number;
  category?: string;
  limit?: number;
}
```

**Backend Format (nexha-discovery-os):**
```typescript
interface DiscoveryQuery {
  q?: string;
  category?: string;
  tags?: string[];
  nexhaId?: string;
  region?: string;
  language?: string;
  minAciBand?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted' | 'any';
  verifiedOnly?: boolean;
  limit?: number;
  offset?: number;
  trustBoost?: number;
}
```

**Transformation:**
```typescript
// SDK → Backend
function transformDiscoveryRequest(params: SupplierSearchParams): DiscoveryQuery {
  return {
    q: params.product,
    region: params.location,
    category: params.category,
    minAciBand: params.min_trust ? trustToBand(params.min_trust) : undefined,
    limit: params.limit || 20,
  };
}
```

### Trust Request

**SDK Format:**
```typescript
interface TrustScore {
  entity_id: string;
  overall: number;  // 0-100
  breakdown: {
    identity: number;
    financial: number;
    transaction: number;
    community: number;
    legal: number;
  };
  verified: {
    government_id: boolean;
    business_license: boolean;
    bank_account: boolean;
    insurance: boolean;
  };
}
```

**Backend Format (nexha-reputation-os):**
```typescript
interface ReputationScore {
  subjectId: string;
  aci: number;  // 0-1000
  band: 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted';
  dimensions: {
    transactions: number;
    disputes: number;
    endorsements: number;
    verifications: number;
    risk: number;
  };
}
```

**Transformation:**
```typescript
// Backend → SDK
function transformTrustScore(reputation: ReputationScore): TrustScore {
  return {
    entity_id: reputation.subjectId,
    overall: reputation.aci / 10,  // Convert 0-1000 to 0-100
    breakdown: {
      identity: reputation.dimensions.verifications,
      financial: reputation.dimensions.transactions,
      transaction: reputation.dimensions.transactions,
      community: reputation.dimensions.endorsements,
      legal: reputation.dimensions.disputes,
    },
    verified: {
      government_id: reputation.dimensions.verifications >= 100,
      business_license: reputation.dimensions.verifications >= 50,
      bank_account: reputation.dimensions.transactions >= 10,
      insurance: false,
    },
  };
}
```

---

## Files

| File | Purpose |
|------|---------|
| `companies/Nexha/services/nexha-agent-gateway/src/routes/sdk-bridge.ts` | Main SDK bridge implementation |
| `companies/Nexha/services/nexha-agent-gateway/src/transforms/discovery.ts` | Discovery request/response transforms |
| `companies/Nexha/services/nexha-agent-gateway/src/transforms/trust.ts` | Trust request/response transforms |
| `companies/Nexha/services/nexha-agent-gateway/src/transforms/negotiation.ts` | Negotiation transforms |
| `companies/Nexha/services/nexha-agent-gateway/src/transforms/contract.ts` | Contract transforms |
| `companies/Nexha/services/nexha-agent-gateway/src/transforms/payment.ts` | Payment transforms |
| `companies/Nexha/services/nexha-agent-gateway/src/transforms/logistics.ts` | Logistics transforms |

---

## Testing

Run SDK bridge tests:
```bash
cd companies/Nexha/services/nexha-agent-gateway
npm test
```

---

*Last Updated: June 30, 2026*
