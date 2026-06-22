# Global Nexha + HOJAI — Comprehensive Addendum (filling all gaps)

> **Date:** 2026-06-22
>
> **Purpose:** This addendum fills in everything missing from the 4 core planning documents. It contains the detailed specs that make the platform actually buildable.

---

## A. CapabilityOS Specification v0.1 (concrete JSON schema + API)

This is the foundational standard. Every Nexha entity declares capabilities in this format. Every AI agent reads this format to discover counterparties.

### JSON-LD Context

```json
{
  "@context": {
    "@vocab": "https://hojai.ai/ns/capability#",
    "schema": "http://schema.org/",
    "hojai": "https://hojai.ai/ns/",
    "corpid": "https://hojai.ai/corpid/",
    "capability": "hojai:capability",
    "confidence": "hojai:confidence",
    "verified": "hojai:verified",
    "verifiedBy": "hojai:verifiedBy",
    "verifiedAt": "hojai:verifiedAt"
  }
}
```

### Full Capability Schema (canonical example)

```json
{
  "@context": "https://hojai.ai/ns/capability",
  "@type": "Company",
  "corpid": "corpid:abc-steel-mfg",
  "name": "ABC Steel Manufacturing Pvt Ltd",
  "legalName": "ABC Steel Manufacturing Private Limited",
  "description": "Hot-rolled and cold-rolled steel coil manufacturer serving South Asia and Middle East",
  "founded": "2015",
  "kyb": {
    "status": "verified",
    "verifiedBy": "corpid:kyb-verifier-onfido",
    "verifiedAt": "2026-06-15T10:30:00Z",
    "registrationNumber": "U27100MH2015PTC123456",
    "taxId": "27ABCDE1234F1Z5",
    "country": "IN"
  },
  "identifiers": {
    "duns": "123456789",
    "lei": "549300ABCDEFG123456",
    "vat": "IN27ABCDE1234F1Z5"
  },
  "capabilities": {
    "manufacturing": {
      "@type": "capability",
      "category": "manufacturing.steel",
      "products": [
        { "sku": "HR-COIL-001", "name": "Hot Rolled Steel Coil", "grades": ["SS400", "A36"] },
        { "sku": "CR-COIL-001", "name": "Cold Rolled Steel Coil", "grades": ["SPCC", "SPCD"] },
        { "sku": "STRUCT-001", "name": "Structural Steel", "grades": ["ASTM A36", "IS 2062"] }
      ],
      "capacity": {
        "tonsPerDay": 500,
        "maxOrderTons": 5000,
        "leadTimeDays": 7,
        "minimumOrderTons": 100
      },
      "facilities": [
        {
          "id": "fac-bhiwandi",
          "name": "Bhiwandi Plant",
          "location": { "city": "Bhiwandi", "state": "MH", "country": "IN", "lat": 19.296, "lng": 73.063 },
          "area_sqft": 50000,
          "machines": 25
        }
      ],
      "certifications": [
        { "name": "ISO 9001", "issuer": "BSI", "validUntil": "2027-12-31" },
        { "name": "ISO 14001", "issuer": "BSI", "validUntil": "2027-12-31" },
        { "name": "BIS", "issuer": "Bureau of Indian Standards", "validUntil": "2028-06-30" }
      ],
      "quality": {
        "defectRate": 0.002,
        "returnRate": 0.001,
        "customerSatisfaction": 4.5,
        "warrantyDays": 365
      }
    },
    "logistics": {
      "@type": "capability",
      "category": "logistics.delivery",
      "selfDeliver": false,
      "partners": ["BlueDart", "Maersk", "DHL"],
      "countriesServed": ["IN", "AE", "SA", "QA"],
      "deliveryRadiusKm": 5000
    },
    "export": {
      "@type": "capability",
      "category": "trade.export",
      "exportLicensed": true,
      "licenseNumber": "IEC-0312345678",
      "exportCountries": ["AE", "SA", "QA", "BH", "OM", "KW"],
      "incotermsSupported": ["FOB", "CIF", "EXW", "DDP"]
    }
  },
  "compliance": {
    "sanctionsClear": true,
    "sanctionsCheckedAt": "2026-06-15T10:30:00Z",
    "sanctionsCheckProvider": "OFAC + EU + UN",
    "esgScore": 78,
    "carbonFootprintTonsPerYear": 12500,
    "sustainabilityCertifications": ["ISO 14001"],
    "modernSlaveryStatement": "https://abcsteel.com/compliance/modern-slavery"
  },
  "interfaces": {
    "acpEndpoint": "acp://abc-steel.nexha/capability",
    "rfqEndpoint": "acp://abc-steel.nexha/rfq",
    "supportChannel": "support@abcsteel.com",
    "apiDocs": "https://api.abcsteel.com/docs"
  },
  "performance": {
    "responseLatencyP95Ms": 240,
    "rfqResponseRate": 0.95,
    "fulfillmentRate": 0.98,
    "onTimeDeliveryRate": 0.96
  },
  "pricing": {
    "currency": "INR",
    "typicalOrderValue": 2500000,
    "paymentTerms": ["30% advance, 70% on delivery", "LC at sight", "Net 30"],
    "priceList": "https://abcsteel.com/pricing"
  },
  "trust": {
    "aci": 87,
    "aciDimensions": {
      "trust": 92,
      "quality": 88,
      "delivery": 85,
      "responsiveness": 95,
      "financial": 89
    },
    "completedTransactions": 1247,
    "yearsActive": 11,
    "verifiedReviews": 342
  },
  "metadata": {
    "createdAt": "2026-06-15T10:30:00Z",
    "updatedAt": "2026-06-22T14:00:00Z",
    "version": "1.0",
    "schemaVersion": "capability-v1"
  }
}
```

### CapabilityOS Service (concrete API)

**Port:** 4270
**Path:** `companies/Nexha/services/capability-os/`

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/capabilities` | Register a new capability declaration (requires CorpID auth) |
| `GET` | `/api/v1/capabilities/:corpid` | Retrieve a company's full capability profile |
| `PUT` | `/api/v1/capabilities/:corpid` | Update capability declaration |
| `DELETE` | `/api/v1/capabilities/:corpid` | Withdraw a company from CapabilityOS |
| `POST` | `/api/v1/capabilities/search` | Search by capability filters |
| `GET` | `/api/v1/capabilities/:corpid/history` | Audit trail of changes |
| `POST` | `/api/v1/capabilities/attest` | Issue verifiable credential (SADA-signed) |
| `GET` | `/api/v1/capabilities/verify/:credential_id` | Verify a credential |
| `GET` | `/api/v1/schemas` | List available category schemas |
| `GET` | `/api/v1/schemas/:category` | Retrieve a category schema template |

**Storage:** Postgres + Elasticsearch for search

**Search query example:**

```json
POST /api/v1/capabilities/search
{
  "filters": {
    "category": "manufacturing.steel",
    "country": "IN",
    "minACI": 75,
    "minCapacity": { "tonsPerDay": 100 },
    "maxLeadTimeDays": 14,
    "certifications": ["ISO 9001"],
    "exportLicensed": true
  },
  "rankBy": "aci",  // or "proximity", "price", "response-time"
  "limit": 20
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "corpid": "corpid:abc-steel-mfg",
        "name": "ABC Steel Manufacturing",
        "matchScore": 94,
        "aci": 87,
        "highlights": {
          "capacity": "500 tons/day",
          "leadTime": "7 days",
          "certifications": ["ISO 9001", "BIS"]
        }
      },
      {
        "corpid": "corpid:xyz-steel",
        "name": "XYZ Steel Ltd",
        "matchScore": 89,
        "aci": 82,
        "highlights": {
          "capacity": "300 tons/day",
          "leadTime": "10 days",
          "certifications": ["ISO 9001"]
        }
      }
    ],
    "total": 47,
    "took": 23
  }
}
```

### Industry Pack: Manufacturing

`companies/Nexha/services/capability-os/industries/manufacturing.json`

Pre-built template that manufacturers can fork.

```json
{
  "industryPack": "manufacturing.v1",
  "requiredFields": [
    "capabilities.manufacturing.products",
    "capabilities.manufacturing.capacity.tonsPerDay",
    "capabilities.manufacturing.capacity.leadTimeDays",
    "certifications"
  ],
  "recommendedFields": [
    "capabilities.manufacturing.facilities",
    "capabilities.manufacturing.quality.defectRate",
    "interfaces.apiDocs"
  ],
  "sampleData": { /* ... example filled-in manufacturing capability ... */ }
}
```

**Year 1 Industry Packs (12):**

1. Manufacturing (steel, automotive, electronics, textiles)
2. Restaurant (menu, kitchen, delivery)
3. Hotel (rooms, amenities, services)
4. Logistics (fleet, warehouses, routes)
5. Healthcare (specialties, certifications)
6. Retail (products, stores, inventory)
7. Construction (projects, materials, equipment)
8. Agriculture (crops, equipment, land)
9. Education (programs, faculty, accreditation)
10. Professional Services (legal, accounting, consulting)
11. Software / SaaS (features, integrations, SLAs)
12. Wholesale / Distribution (catalog, regions, terms)

---

## B. Autonomous Commerce Index (ACI) — Full Formula

The scoring algorithm that powers ReputationOS.

### ACI v1.0 Formula

```
ACI(corpid, t) = weighted_average({
  trust(t),
  quality(t),
  delivery(t),
  responsiveness(t),
  financial(t),
  compliance(t),
  sustainability(t)
})
```

Each dimension is a function of time `t` (most recent events weighted higher).

### Trust Score (35% weight)

```typescript
trust(corpid, t) = (
  0.40 × payment_history_score(corpid, t) +
  0.30 × contract_fulfillment_score(corpid, t) +
  0.20 × dispute_free_streak(corpid, t) +
  0.10 × peer_endorsements(corpid, t)
) × decay(t)
```

- `payment_history_score`: ratio of on-time payments, weighted by recency
- `contract_fulfillment_score`: ratio of contracts completed without breach
- `dispute_free_streak`: months since last dispute, capped at 24
- `peer_endorsements`: count of positive references from other Nexhas
- `decay(t)`: exponential decay with half-life of 180 days

### Quality Score (20% weight)

```typescript
quality(corpid, t) = (
  0.50 × (1 - defect_rate(corpid, t)) +
  0.30 × customer_satisfaction_avg(corpid, t) +
  0.20 × return_rate_inverse(corpid, t)
)
```

### Delivery Score (15% weight)

```typescript
delivery(corpid, t) = (
  0.60 × on_time_delivery_rate(corpid, t) +
  0.40 × fill_rate(corpid, t)
)
```

### Responsiveness Score (10% weight)

```typescript
responsiveness(corpid, t) = (
  0.50 × rfq_response_rate(corpid, t) +
  0.30 × response_latency_score(corpid, t) +
  0.20 × quote_accuracy(corpid, t)
)
```

### Financial Score (10% weight)

```typescript
financial(corpid, t) = (
  0.50 × credit_score(corpid, t) +
  0.30 × revenue_growth(corpid, t) +
  0.20 × liquidity_ratio(corpid, t)
)
```

### Compliance Score (5% weight)

```typescript
compliance(corpid, t) = (
  0.40 × sanctions_clear(corpid) +
  0.30 × certifications_valid(corpid) +
  0.20 × regulatory_violations_inverse(corpid, t) +
  0.10 × kyb_current(corpid)
)
```

### Sustainability Score (5% weight)

```typescript
sustainability(corpid, t) = (
  0.40 × esg_score(corpid, t) +
  0.30 × carbon_footprint_trend(corpid, t) +
  0.30 × sustainability_certifications(corpid)
)
```

### Bayesian Smoothing for New Entities

For companies with fewer than 30 events:

```typescript
aci_smoothed(corpid, t) = (
  (N / (N + PRIOR_WEIGHT)) × aci_observed(corpid, t) +
  (PRIOR_WEIGHT / (N + PRIOR_WEIGHT)) × PRIOR_ACI
)

where:
  N = number of verified events
  PRIOR_WEIGHT = 30  // events needed to trust observed score
  PRIOR_ACI = 60     // industry-average starting score
```

### Trust Bootstrap Stages

| Stage | Name | Requirements | ACI Range |
|---|---|---|---|
| 0 | Founder Verified | CorpID, founder LinkedIn verified | 30-45 |
| 1 | Identity Verified | KYB complete | 40-55 |
| 2 | Capabilities Verified | CapabilityOS complete | 50-65 |
| 3 | Pilot Deals | 3+ completed transactions via escrow | 60-75 |
| 4 | Established | 100+ orders, 95%+ on-time | 70-90 |
| 5 | Network Effects | 1000+ transactions, named in cross-network deals | 85-95 |
| 6 | Industry Leader | Top 10% of industry | 90-100 |

---

## C. nexha-autonomous-logistics — Full Specification

The service that fills the KHAIRMOVE gap.

**Port:** 4293
**Path:** `companies/Nexha/services/nexha-autonomous-logistics/`

### Service Components

```
nexha-autonomous-logistics/
├── src/
│   ├── orchestrator/         # Logistics Orchestrator Agent
│   ├── carriers/             # Multi-carrier adapters (DHL, Maersk, FedEx, BlueDart, etc.)
│   ├── customs/              # Customs Agent (HS codes, country regulations)
│   ├── routing/              # Multi-modal routing engine
│   ├── tracking/             # Unified tracking across carriers
│   ├── insurance/            # Auto-bind cargo insurance
│   ├── carbon/               # Carbon footprint calculator
│   └── api/                  # HTTP API
└── tests/
```

### Logistics Orchestrator Agent

```typescript
class LogisticsOrchestrator extends BaseAgent {
  async planShipment(request: ShipmentRequest): Promise<ShipmentPlan> {
    // 1. Find available carriers and routes
    const carriers = await this.carrierRegistry.find({
      origin: request.origin,
      destination: request.destination,
      cargoType: request.cargo.type,
      weight: request.cargo.weightKg,
      dimensions: request.cargo.dimensionsCm,
      deadline: request.deadline
    });

    // 2. Generate multi-modal route options
    const routes = await this.routingEngine.generate(carriers, {
      optimize: request.optimizeFor, // 'cost' | 'speed' | 'carbon' | 'reliability'
      constraints: request.constraints
    });

    // 3. Score routes
    const scoredRoutes = await this.scoreRoutes(routes, {
      costWeight: 0.30,
      speedWeight: 0.30,
      carbonWeight: 0.15,
      reliabilityWeight: 0.25
    });

    // 4. Check customs requirements
    const customsRequirements = await this.customsAgent.check({
      origin: request.origin.country,
      destination: request.destination.country,
      hsCode: request.cargo.hsCode,
      value: request.cargo.declaredValue
    });

    // 5. Auto-bind insurance if requested
    let insurance;
    if (request.insurance) {
      insurance = await this.insurance.bind({
        cargoValue: request.cargo.declaredValue,
        route: scoredRoutes[0],
        coverageType: request.insurance.coverage
      });
    }

    return {
      recommendedRoute: scoredRoutes[0],
      alternatives: scoredRoutes.slice(1, 4),
      customsDocuments: customsRequirements.documents,
      insurance,
      estimatedCost: scoredRoutes[0].totalCost,
      estimatedDelivery: scoredRoutes[0].estimatedDelivery,
      carbonFootprint: scoredRoutes[0].carbonKg
    };
  }

  async bookShipment(plan: ShipmentPlan): Promise<BookingConfirmation> {
    // Book with each carrier in the multi-modal route
    const bookings = await Promise.all(
      plan.recommendedRoute.legs.map(leg =>
        this.carrierRegistry.book(leg.carrierId, leg.details)
      )
    );

    // Register tracking
    await this.tracking.register({
      shipmentId: bookings[0].shipmentId,
      legs: bookings
    });

    // Schedule customs clearance
    await this.customsAgent.scheduleClearance({
      shipmentId: bookings[0].shipmentId,
      documents: plan.customsDocuments
    });

    return {
      shipmentId: bookings[0].shipmentId,
      bookings,
      estimatedPickup: bookings[0].pickupTime,
      estimatedDelivery: bookings[bookings.length - 1].deliveryTime
    };
  }

  async trackShipment(shipmentId: string): Promise<ShipmentStatus> {
    return await this.tracking.getStatus(shipmentId);
  }

  async reroute(shipmentId: string, reason: string): Promise<RerouteResult> {
    const current = await this.trackShipment(shipmentId);
    const alternatives = await this.routingEngine.findAlternatives(current);

    if (alternatives.length === 0) {
      return { success: false, reason: 'no-alternatives' };
    }

    // Auto-execute if delay > threshold
    const delayHours = current.actualDelivery.diff(current.plannedDelivery, 'hours');
    if (delayHours > 24) {
      const newBooking = await this.bookShipment(alternatives[0]);
      return { success: true, newShipmentId: newBooking.shipmentId };
    }

    return { success: false, reason: 'delay-below-threshold', alternatives };
  }
}
```

### Multi-Carrier Adapters (built-in)

| Carrier | API Coverage | Region |
|---|---|---|
| DHL Express | Full | Global |
| FedEx | Full | Global |
| UPS | Full | Global |
| Maersk | Sea freight | Global |
| MSC | Sea freight | Global |
| CMA CGM | Sea freight | Global |
| Emirates SkyCargo | Air freight | Middle East / Asia |
| BlueDart | Domestic + regional | India |
| Delhivery | Domestic | India |
| Aramex | Regional | Middle East |
| SF Express | Domestic + regional | China |
| Yamato | Domestic | Japan |

**Year 2 expansion:** Add 20+ more regional carriers.

### Customs Agent

```typescript
class CustomsAgent extends BaseAgent {
  async checkRequirements(params: {
    origin: string;        // ISO country code
    destination: string;   // ISO country code
    hsCode: string;        // Harmonized System code
    value: number;         // declared value
    currency: string;
  }): Promise<CustomsRequirements> {
    // Look up HS code regulations
    const hsData = await this.hsCodeLookup.lookup(params.hsCode);

    // Get country-specific rules
    const destRules = await this.countryRules.get(params.destination);

    // Check trade agreements (preferential tariffs)
    const tradeAgreements = await this.tradeAgreements.findAgreements(
      params.origin, params.destination
    );

    // Determine required documents
    const documents = this.determineDocuments(hsData, destRules);

    // Calculate duties and taxes
    const duties = this.calculateDuties({
      hsData,
      destRules,
      tradeAgreements,
      value: params.value,
      currency: params.currency
    });

    // Check restrictions / sanctions
    const restrictions = await this.sanctionsCheck.check({
      hsCode: params.hsCode,
      origin: params.origin,
      destination: params.destination
    });

    return {
      documents,
      duties,
      estimatedClearanceTime: destRules.averageClearanceHours,
      restrictions,
      warnings: restrictions.warnings
    };
  }
}
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/shipments/plan` | Generate shipment plan (routes + cost + customs) |
| `POST` | `/api/v1/shipments/book` | Book a shipment |
| `GET` | `/api/v1/shipments/:id/track` | Track shipment status |
| `POST` | `/api/v1/shipments/:id/reroute` | Reroute shipment |
| `POST` | `/api/v1/shipments/:id/cancel` | Cancel shipment |
| `GET` | `/api/v1/carriers` | List available carriers |
| `POST` | `/api/v1/customs/check` | Check customs requirements |
| `POST` | `/api/v1/insurance/bind` | Bind cargo insurance |
| `GET` | `/api/v1/routes` | Multi-modal routing options |
| `POST` | `/api/v1/carbon/calculate` | Calculate carbon footprint |

---

## D. HOJAI Foundry CLI — Full Prompt Specification

The complete flow for `npx hojai create`.

### Interactive Flow (12 prompts)

```
1. What are you building?
   ❯ Marketplace (D2C)              [Layer 1]
     B2B Platform                    [Layer 2]
     Company (full business)          [Layer 8]
     Hotel Management                 [Layer 3 - Industry OS]
     Restaurant Management            [Layer 3]
     Logistics Platform               [Layer 2]
     Healthcare Platform              [Layer 3]
     Education Platform               [Layer 3]
     Manufacturing                    [Layer 3]
     Real Estate Platform             [Layer 3]
     CRM                              [Layer 4]
     ERP                              [Layer 4]
     POS                              [Layer 3]
     HRMS                             [Layer 4]
     Project Management               [Layer 4]
     Customer Support                 [Layer 4]
     Custom                           [All layers]

2. Business model?
   ❯ Marketplace
     D2C Storefront
     B2B Wholesale
     Hyperlocal
     Subscription
     Franchise
     Service Provider
     Platform
     Other

3. Primary industry vertical?
   ❯ General
     Manufacturing
     Retail
     Food & Beverage
     Hospitality
     Healthcare
     Education
     Logistics
     Construction
     Agriculture
     Real Estate
     Professional Services
     Software / SaaS
     Other

4. Which AI workforce? (multi-select)
   ☑ CEO Agent (orchestrator)
   ☑ Sales Agent
   ☑ Marketing Agent
   ☑ Procurement Agent
   ☑ Finance Agent
   ☐ Legal Agent
   ☑ Support Agent
   ☑ Operations Agent
   ☐ Warehouse Agent
   ☐ Quality Agent
   ☐ Analytics Agent
   ☐ Compliance Agent
   ☐ HR Agent
   ☐ CTO Agent

5. Add SUTAR Department OS modules? (multi-select)
   ☑ CRM
   ☑ ERP
   ☑ POS
   ☐ HRMS
   ☐ LMS
   ☐ Inventory Management
   ☑ Procurement
   ☑ Finance & Accounting
   ☑ Marketing Automation
   ☑ Customer Service

6. Add industry-specific modules?
   (depends on vertical selection; e.g., for Hospitality: Booking, Housekeeping, Concierge)

7. Brand name?
   › TradeFlow

8. Brand colors?
   › #3B82F6, #10B981

9. Primary region?
   ❯ Middle East
     South Asia
     Southeast Asia
     North America
     Europe
     Africa
     Latin America
     Global

10. Languages?
    › English, Arabic (comma-separated)

11. Currency?
    ❯ USD
      AED
      INR
      EUR
      GBP
      Other

12. Generate project?
    ❯ Yes
      Show me what's included first
```

### What Gets Generated

After 12 prompts and ~30 seconds:

```
tradeflow/
├── README.md                          # 30-min quickstart
├── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
├── hojai.ai.md                        # AI context file
├── .hojai/
│   ├── schema.json                    # machine-readable schema
│   └── capability.json                # CapabilityOS declaration
├── apps/
│   ├── backend/                       # Node + Express + TypeScript
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── buyer.ts
│   │   │   │   ├── seller.ts
│   │   │   │   ├── admin.ts
│   │   │   │   └── webhooks.ts
│   │   │   ├── services/
│   │   │   │   ├── catalog.ts
│   │   │   │   ├── order.ts
│   │   │   │   ├── payment.ts
│   │   │   │   └── notification.ts
│   │   │   ├── agents/                # SUTAR agents
│   │   │   │   ├── ceo.ts
│   │   │   │   ├── sales.ts
│   │   │   │   ├── procurement.ts
│   │   │   │   ├── finance.ts
│   │   │   │   ├── logistics.ts
│   │   │   │   └── support.ts
│   │   │   ├── nexha/                 # Nexha integration
│   │   │   │   └── network.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   └── rateLimit.ts
│   │   │   └── utils/
│   │   ├── tests/
│   │   └── Dockerfile
│   ├── frontend/                      # Next.js
│   │   ├── app/
│   │   │   ├── buyer/
│   │   │   ├── seller/
│   │   │   └── admin/
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   ├── mobile/                        # Flutter
│   │   ├── lib/
│   │   ├── android/
│   │   └── ios/
│   └── docs/
└── scripts/
    ├── dev.sh                         # Start everything
    ├── deploy.sh                      # Deploy to HOJAI Cloud
    └── federate.sh                    # Join Global Nexha
```

**Total time from `npx hojai create` to running app: 30 seconds.**

---

## E. The AI-Native Spec — Full `hojai.ai.md` Template

This is the file Claude Code / Cursor / Codex read to understand a HOJAI project.

```markdown
# HOJAI Project: {{projectName}}

This is a HOJAI-powered {{projectType}} for the {{industry}} industry in {{region}}.

## What this app does

{{naturalLanguageDescription}}

## Architecture

- **Backend:** Node.js + Express + TypeScript
- **Frontend:** Next.js (App Router)
- **Mobile:** Flutter
- **Database:** MongoDB (or Postgres if user prefers)
- **Cache:** Redis
- **AI:** HOJAI SUTAR ({{agentCount}} agents)
- **Identity:** HOJAI CorpID
- **Memory:** HOJAI MemoryOS
- **Network:** HOJAI Nexha (federated)
- **Payments:** HOJAI RABTUL

## SUTAR Agents

| Agent | Role | Capabilities |
|---|---|---|
| CEO Agent | Orchestrator | Coordinates other agents, strategic decisions |
| Sales Agent | Quotation, lead handling | RFQ processing, quote generation, negotiation |
| Procurement Agent | Sourcing | Supplier discovery, RFQ, order placement |
| Finance Agent | Money | Invoicing, payments, escrow, reconciliation |
| Logistics Agent | Shipping | Multi-carrier, customs, tracking |
| Support Agent | Customer service | Tickets, chat, escalation |

## HOJAI SDKs used

- `@hojai/foundation` — CorpID, Memory, Twin
- `@hojai/sutar` — Agent runtime
- `@hojai/commerce` — Catalog, Orders, Inventory
- `@hojai/nexha` — Discovery, Reputation, Federation
- `@hojai/payment` — Wallet, Escrow, BNPL
- `@hojai/logistics` — Multi-carrier, Customs (via nexha-autonomous-logistics)
- `@hojai/reputation` — ACI scoring

## Key directories

- `apps/backend/src/agents/` — SUTAR agent definitions (extend BaseAgent)
- `apps/backend/src/services/` — Business logic (pure functions, no HTTP)
- `apps/backend/src/routes/` — HTTP endpoints
- `apps/backend/src/nexha/` — Nexha network integration
- `apps/backend/src/middleware/` — Express middleware
- `apps/frontend/app/` — Next.js pages
- `apps/frontend/components/` — React components
- `apps/mobile/lib/` — Flutter app code
- `.hojai/capability.json` — CapabilityOS declaration
- `hojai.ai.md` — This file

## How to extend

### Add a new SUTAR agent

1. Create `apps/backend/src/agents/myagent.ts`:

```typescript
import { BaseAgent } from '@hojai/sutar';

export class MyAgent extends BaseAgent {
  constructor() {
    super({
      role: 'my-role',
      capabilities: ['...'],
      tools: ['@hojai/commerce', '@hojai/nexha']
    });
  }

  async execute(task: Task): Promise<Result> {
    // Your agent logic
  }
}
```

2. Register in `apps/backend/src/agents/index.ts`
3. Add to CEO Agent's workflow if needed

### Add a new API endpoint

1. Create `apps/backend/src/routes/myroute.ts`:

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { myService } from '../services/myservice';

export const myRouter = Router();
myRouter.get('/', requireAuth, async (req, res) => {
  const result = await myService.doSomething(req.user);
  res.json(result);
});
```

2. Mount in `apps/backend/src/index.ts`

### Update capability declaration

1. Edit `.hojai/capability.json`
2. Run `npm run capability:publish` to push to CapabilityOS

### Add a new page

1. Create folder `apps/frontend/app/mypage/`
2. Add `page.tsx` with the UI
3. Connect to API via `lib/api.ts`

## Conventions

- **Validation:** Use Zod schemas for all inputs
- **Auth:** Use `requireAuth` middleware on all `/api/v1/*` routes (except public webhooks)
- **Errors:** Throw typed errors; the error middleware handles responses
- **Logging:** Use `logger.info/error` from `@hojai/foundation`
- **Events:** All cross-agent communication via SUTAR's event bus
- **Tests:** Vitest for unit, supertest for API integration
- **TypeScript:** Strict mode, no `any`

## Environment variables

See `.env.example` for full list. Key ones:

- `CORPID_API_KEY` — issued by HOJAI Cloud
- `NEXHA_FEDERATION_TOKEN` — for joining Global Nexha
- `RABTUL_PAYMENT_KEY` — for payments
- `MONGODB_URL` — database connection

## Running locally

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev          # Starts backend
npm run dev:web      # Starts Next.js
npm run dev:mobile   # Starts Flutter
```

## Deploying

```bash
npx hojai deploy
```

Deploys to HOJAI Cloud at `{{projectName}}.hojai.app`.
```

---

## F. Federation Governance Model

Who decides what in the Global Nexha federation.

### Governance Bodies

**1. ACP Foundation (technical standards)**
- Owns the ACP specification
- Approves protocol changes (RFC process)
- Maintains conformance test suite
- **Members:** HOJAI (founding member), Nexha, 5 elected community seats
- **Decision-making:** Lazy consensus + 2/3 supermajority for breaking changes

**2. Federation Council (membership + policy)**
- Approves new federation members (Stage 4+)
- Handles disputes between federated Nexhas
- Sets transaction fee policy
- **Members:** 1 HOJAI rep, 1 Nexha rep, 5 elected industry reps, 3 elected regional reps
- **Decision-making:** Simple majority

**3. Trust Council (reputation integrity)**
- Reviews ACI disputes
- Audits Trust Bootstrap progressions
- Can revoke ACI scores for fraud
- **Members:** 3 SADA reps, 2 independent auditors, 1 industry rep
- **Decision-making:** 2/3 majority

### ACP Change Process (RFC)

**Stage 1: Idea** — Anyone can propose (GitHub issue)

**Stage 2: Draft** — Author writes RFC document (`rfcs/0001-my-feature.md`)

**Stage 3: Review** — Community + ACP Foundation review for 30 days

**Stage 4: Last Call** — Final comment period (14 days)

**Stage 5: Accepted/Rejected** — ACP Foundation votes

**Stage 6: Implementation** — Reference implementation + conformance tests

**Stage 7: Activation** — Spec versioned, reference impl shipped

### Membership Tiers

| Tier | Requirements | Benefits | Annual Fee |
|---|---|---|---|
| **Basic** | CorpID, KYB, Stage 1 Bootstrap | List in Global Directory, use DiscoveryOS | Free |
| **Verified** | Stage 3+ Bootstrap, 30+ transactions | Federation handshake, basic ACI | $500/yr |
| **Premium** | Stage 4+ Bootstrap, 100+ transactions, ACI > 75 | Priority discovery, premium ACI, opportunity matching | $2,000/yr |
| **Industry** | Federation Council approval | Multi-Nexha deployment, consortium dashboard | $50K-$500K/yr |
| **Government** | Custom | Multi-year transformation | Custom |

### Dispute Resolution Process

1. **Direct negotiation** — Parties attempt to resolve within 14 days
2. **Mediation** — Federation Council mediator assigned
3. **Arbitration** — Trust Council reviews evidence, issues binding decision
4. **Escalation** — ACP Foundation reviews if technical dispute

**Time-to-resolution target:** 30 days for most disputes.

---

## G. Marketing & Messaging Framework

### Buyer Personas and Their Outcomes

**Persona 1: SME Owner (restaurant, hotel, retail store)**
- **Pain:** Spends 10+ hours/week on procurement; can't find good suppliers
- **Outcome:** "Save 10 hours/week and cut costs by 10%"
- **Hook:** "Your AI workforce handles procurement 24/7"
- **Channel:** Local business networks, chambers of commerce, Facebook groups

**Persona 2: Enterprise Procurement Manager**
- **Pain:** Manual sourcing, slow cycles, limited supplier visibility
- **Outcome:** "Cut procurement cycle from 6 months to 6 weeks"
- **Hook:** "Find qualified suppliers globally in seconds, negotiate automatically"
- **Channel:** Industry conferences, LinkedIn, procurement publications

**Persona 3: Founder / Startup CEO**
- **Pain:** Can't afford to build infrastructure; wants to launch fast
- **Outcome:** "Launch your marketplace in 30 minutes, not 3 years"
- **Hook:** "Build an AI-native business with one prompt"
- **Channel:** Product Hunt, Hacker News, Twitter/X, dev communities

**Persona 4: Government Procurement Officer**
- **Pain:** Slow, manual, often corrupt procurement
- **Outcome:** "Cut cycle time by 80%; reduce fraud surface"
- **Hook:** "Transparent, AI-powered public procurement"
- **Channel:** Government tech conferences, RFPs, World Bank / UN workshops

**Persona 5: Developer**
- **Pain:** Wants to build AI apps but AI infrastructure is complex
- **Outcome:** "Build AI apps with simple SDKs; deploy in minutes"
- **Hook:** "The platform Claude Code, Cursor, and Codex know how to build on"
- **Channel:** GitHub, dev.to, Reddit, Discord, AI tool marketplaces

**Persona 6: Industry Network Operator (consortium, association)**
- **Pain:** Members want digital infrastructure but each operates alone
- **Outcome:** "Give your members an autonomous business network"
- **Hook:** "Launch an industry network in 90 days"
- **Channel:** Industry conferences, trade associations, B2B events

### Core Taglines (by audience)

| Audience | Tagline |
|---|---|
| **SME** | "Run your business with an AI workforce that works 24/7" |
| **Enterprise** | "Make your SAP/Oracle 10x more efficient with autonomous AI agents" |
| **Founder** | "Launch an AI-native business in 30 minutes" |
| **Government** | "Transparent, AI-powered procurement that saves time and reduces fraud" |
| **Developer** | "The platform AI coding assistants know how to build on" |
| **Industry Network** | "Give your members a global autonomous business network" |

### Brand Positioning

**One-liner (universal):** *"HOJAI is the platform for autonomous businesses."*

**For investors:** *"HOJAI is the Platform-as-an-Economy for the autonomous world — 14 layers, 1M+ businesses, $5T in autonomous commerce by Year 5."*

**For developers:** *"Build AI-native businesses with SDKs that Claude Code, Cursor, and Codex already understand."*

**For enterprises:** *"Add an AI workforce to your existing systems. No rip-and-replace."*

**For governments:** *"Modernize procurement with transparent, AI-powered autonomous commerce."*

---

## H. Cold-Start Outreach Plan (Concrete Next Steps)

### Month 1-3 Actions

**Week 1-2: Sign first anchor**
- Target: 1 restaurant chain in India or UAE (5+ locations)
- Outreach: Personal network, LinkedIn, food industry conferences
- Pitch: "Save 10 hours/week on procurement; let AI handle it"
- Pilot terms: Free for 6 months, case study in exchange

**Week 3-4: Sign first logistics anchor**
- Target: 1 logistics provider (regional, not DHL yet)
- Outreach: KHAIRMOVE existing relationships, freight forwarders
- Pitch: "Get inbound leads from AI customers 24/7"
- Pilot terms: Free nexha-autonomous-logistics access for 1 year

**Week 5-8: Sign first 3 platform founders**
- Targets: 1 B2B marketplace founder, 1 D2C founder, 1 SaaS founder
- Outreach: Founder communities, Product Hunt, Twitter/X
- Pitch: "Launch your marketplace in 30 minutes with HOJAI Foundry"
- Pilot terms: Free Foundry + Cloud credits for 6 months

**Week 9-12: Sign first industry network**
- Target: 1 industry consortium (hospitality or healthcare preferred)
- Outreach: StayOwn / RisaCare existing relationships
- Pitch: "Give your members an autonomous business network"
- Pilot terms: 50% off Year-1 fees, case study

### Month 4-6 Actions

- Convert 3 anchor pilots to paying customers
- Sign 10 more platform founders
- Sign 3 more industry networks
- Publish first 3 case studies
- First revenue: $50K-$200K

### Month 7-12 Targets

- 50 paying customers (mix of SMEs, founders, networks)
- $500K-$2M ARR
- 5 public case studies
- 1 government pilot
- 5 industry networks launched

---

## I. Risk-Adjusted Scenario Planning

### Best Case (everything works)

- Y5: 2M Nexhas, 10M platforms, $10B ARR, $10T autonomous GMV

### Expected Case (most things work)

- Y5: 1M Nexhas, 5M platforms, $7.4B ARR, $5T autonomous GMV (current plan)

### Conservative Case (some things work)

- Y5: 100K Nexhas, 500K platforms, $1B ARR, $500B autonomous GMV

### Failure Case (major issues)

- Y5: 10K Nexhas, 50K platforms, $50M ARR, $10B autonomous GMV

**Probability assessment:**
- Best: 10%
- Expected: 40%
- Conservative: 35%
- Failure: 15%

**Key risks that move us down scenarios:**
- Cold start fails (no anchor customers)
- Developer ecosystem fails (Foundry unused)
- Standards war (competitor wins)
- Regulatory backlash (governments restrict AI commerce)

**Mitigation per risk:**
- Cold start: Pre-commit to 3 anchor customers before launch
- Developer ecosystem: First 3 layers must be exceptional (not all 14)
- Standards: ACP must differentiate (agent-to-business, not agent-to-agent)
- Regulatory: Start in English common-law jurisdictions; expand later

---

## J. Funding Strategy

### Year 1 Funding Needs

| Need | Amount | Use |
|---|---|---|
| Engineering team | $5M | 13 engineers × $400K loaded |
| Cloud infrastructure | $1M | HOJAI Cloud |
| Marketing | $1M | Awareness, conferences, content |
| Legal | $0.5M | Entity formation, IP, contracts |
| Operations | $0.5M | Office, tools, misc |
| **Total** | **$8M** | **HOJAI pre-seed/seed** |

**Source:** Pre-seed round. Lead investor + 3-4 angels.

### Year 2 Funding Needs

| Need | Amount | Use |
|---|---|---|
| Engineering team | $15M | 25 engineers × $600K loaded |
| Sales team | $3M | Enterprise + government |
| Customer success | $1.5M | Onboarding, support |
| Marketing | $2M | Pipeline generation |
| Cloud | $3M | HOJAI Cloud (now at scale) |
| Legal | $1M | International expansion, contracts |
| Working capital | $2.5M | Buffer |
| **Total** | **$28M** | **HOJAI Series A** |

**Source:** Series A. Top-tier VC.

### Year 3 Funding Needs

| Need | Amount | Use |
|---|---|---|
| Engineering team | $30M | 50 engineers |
| Sales | $8M | Global sales team |
| Customer success | $3M | Enterprise CSM team |
| Marketing | $5M | Brand, demand gen |
| Cloud | $10M | HOJAI Cloud at scale |
| Legal | $2M | International, regulatory |
| Working capital | $5M | Buffer |
| **Total** | **$63M** | **HOJAI Series B** |

**Source:** Series B. Growth-stage VC.

### Year 4-5 Funding

HOJAI should be cash-flow positive by Year 4. Nexha may need a separate round (~$50M-$100M) at Year 3 to scale federation.

### Total Funding Required (5 years)

- HOJAI: ~$100M (across 3 rounds)
- Nexha: ~$50M-$100M (separate entity, separate cap table)
- RABTUL, KHAIRMOVE, etc.: Each may need smaller rounds independently

**Total RTMN Digital ecosystem funding (5 years): ~$200M-$300M**

---

## K. Compliance & Legal Considerations

### Regulatory Areas to Address

**1. Identity & KYC/KYB**
- GDPR (EU)
- CCPA (California)
- DPDPA (India)
- Country-specific data protection laws
- Solution: Use Onfido / Trulioo / Persona as KYC/KYB providers via SDK

**2. Payments & Financial Services**
- PCI DSS (card payments)
- PSD2 (EU payments)
- Open Banking regulations
- Country-specific banking licenses
- Solution: Partner with licensed banks; RABTUL orchestrates

**3. Cross-Border Commerce**
- Export controls (EAR, OFAC)
- Sanctions screening (OFAC, EU, UN)
- Customs regulations
- Trade agreements
- Solution: Customs Agent in nexha-autonomous-logistics + sanctions check

**4. AI & Data**
- EU AI Act
- Algorithmic accountability
- Data residency requirements
- AI transparency / explainability
- Solution: SUTAR's decision engine includes explainability; data residency configurable

**5. Industry-Specific**
- Healthcare: HIPAA (US), NDHM (India)
- Finance: SOX, Dodd-Frank
- Government procurement: Local procurement laws
- Solution: Industry Network templates include compliance packs

### Year 1 Compliance Priorities

1. **GDPR-compliant data handling** — for EU customers
2. **OFAC sanctions screening** — for all cross-border deals
3. **KYB verification** — for all federation members
4. **PCI DSS via payment partners** — for all payments
5. **SOC 2 Type II** — for enterprise sales (Year 2)

### International Expansion Order

**Year 1:** English common-law jurisdictions (US, UK, Singapore, UAE, India, Australia)
**Year 2:** EU (with GDPR compliance)
**Year 3:** GCC, South Asia, Southeast Asia
**Year 4:** Latin America, Africa
**Year 5:** Global

---

## L. Detailed Cold-Start Scripts & Pitch Decks

### Script 1: Pitch to Restaurant Chain Owner

```
Hi [Name],

I noticed [Restaurant Chain] sources from multiple suppliers across
[specific regions]. That probably takes 10-15 hours of your team's
time every week, and you might be paying 10-15% more than necessary
because you don't have visibility into better suppliers.

We built something that solves this. It's called Nexha — basically
an AI workforce for your business. Once you deploy it (takes 30
minutes), your AI Procurement Agent:

- Watches your inventory in real-time
- Finds the best suppliers globally (not just your current ones)
- Negotiates prices and terms automatically
- Arranges logistics and customs
- Tracks delivery and updates your books

The result: less manual work, better prices, faster turnaround.

We're piloting this with 3 restaurant chains in India and UAE. Want
to be one of them? Free for 6 months; we'd just want to use you as
a case study.

15-minute call next week?
```

### Script 2: Pitch to Logistics Provider CEO

```
Hi [Name],

Quick question: how much of your business comes from new customers
you found through marketing vs. existing relationships?

For most logistics providers, it's 80%+ existing relationships.
That's a growth ceiling — you're capped by the number of people
who know you.

We built Nexha, which is basically the network where AI agents
discover logistics services for autonomous businesses. When a
restaurant's AI needs to ship rice from India to Dubai, it queries
our network — and finds carriers like you automatically.

Result: inbound leads from AI customers, 24/7, no sales team
needed.

We're piloting with 3 logistics providers. Free nexha-autonomous-
logistics access for 1 year; we'd just want a case study.

20-minute call?
```

### Script 3: Pitch to Founder

```
Hi [Name],

Saw your tweet about wanting to build [X marketplace / Y platform].

We built something that might save you a year. It's called HOJAI
Foundry. You say "build me a [X marketplace]" and in 30 minutes
you have a working app with:

- Backend (auth, payments, catalog, orders)
- Frontend (Next.js portal)
- Mobile app (Flutter, iOS + Android)
- AI agents (sales, procurement, finance, logistics)
- Capability declaration (so AI agents worldwide can find you)
- Federation registration (so you can trade with other Nexhas)

It's open-source. You can extend it however you want.

Want to try it? Takes 30 minutes to get to a working MVP.

[Link to docs.hojai.ai]
```

### Script 4: Pitch to Government Procurement Officer

```
Dear [Name],

[Government Agency] processes [X] tenders per year, with average
cycle time of [Y] months. We believe this can drop to [Z] weeks
with AI-powered procurement.

We're building the Global Nexha federation — a network where
AI agents discover, evaluate, and award contracts to qualified
suppliers automatically. SUTAR handles compliance, bid evaluation,
and award recommendation. Humans approve final decisions.

We'd like to pilot with one government agency. Benefits:

- Cut procurement cycle from 6 months to 6 weeks
- Reduce fraud surface (AI evaluates, humans ratify)
- Reach qualified suppliers globally (not just local)
- Transparent audit trail for every decision

Free for Year 1; we'd jointly publish a case study.

30-minute meeting to discuss?
```

---

## M. The One-Liner for Every Audience

| Audience | One-liner |
|---|---|
| **Universal** | "HOJAI is the platform for autonomous businesses." |
| **SME** | "Run your business with an AI workforce that works 24/7." |
| **Enterprise** | "Add an AI workforce to your existing systems. No rip-and-replace." |
| **Founder** | "Launch an AI-native business in 30 minutes." |
| **Developer** | "The platform AI coding assistants know how to build on." |
| **Government** | "Transparent, AI-powered procurement." |
| **Investor** | "The Platform-as-an-Economy for the autonomous world." |
| **Industry Network** | "Give your members a global autonomous business network." |
| **Press** | "HOJAI is building the internet for autonomous businesses." |

---

## N. What's Still Missing (acknowledged)

Things I haven't fully spec'd yet (to be done in separate documents):

1. **Detailed financial model** — unit economics per product line, CAC/LTV by segment, scenario modeling
2. **Detailed legal structure** — entity formation, IP assignment, inter-company agreements
3. **Detailed GTM per industry** — vertical-specific sales playbooks
4. **Detailed pricing experiments** — A/B test plan for pricing tiers
5. **Detailed hiring plan** — per-role JD, comp bands, recruiting funnel
6. **Detailed partnership strategy** — banks, carriers, KYC providers, AI tools
7. **Detailed international expansion** — country-by-country rollout
8. **Detailed security architecture** — threat model, encryption, key management
9. **Detailed observability strategy** — metrics, traces, logs, SLOs
10. **Detailed data architecture** — Postgres schemas, MongoDB collections, Elasticsearch indices, Redis caching

These are intentionally deferred — they're either next-level details that don't affect the strategy, or they depend on specific operational decisions that need to be made during implementation.

---

*This addendum fills the spec-level gaps across all 4 planning documents. It contains concrete JSON schemas, formulas, API specs, prompt flows, pitch scripts, and funding plans.*

*Last updated: 2026-06-22*
