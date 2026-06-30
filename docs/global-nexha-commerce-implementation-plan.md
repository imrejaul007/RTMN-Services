# Global Nexha Commerce — Phased Implementation Plan
> **Version:** 1.0
> **Date:** June 30, 2026
> **Status:** Ready to execute
> **Based on:** [global-nexha-commerce-audit.md](global-nexha-commerce-audit.md)

---

## Executive Summary

**83% of code already exists.** The gap is integration, not building from scratch.

| Phase | Focus | Duration | Priority |
|-------|--------|----------|----------|
| **Phase 0** | Foundation Fixes | 4 weeks | P0 |
| **Phase 1** | Unified CommerceOS | 8 weeks | P0 |
| **Phase 2** | Real BAM Workers | 12 weeks | P1 |
| **Phase 3** | Commerce Templates | 8 weeks | P1 |
| **Phase 4** | Commerce Studio UI | 6 weeks | P2 |
| **Phase 5** | Advanced Commerce | 12 weeks | P2 |
| **TOTAL** | | **50 weeks (~12 months)** | |

---

## What Exists Today

```
EXISTING CODEBASE
│
├── Foundation (17 services) — ✅ COMPLETE
│   └── CorpID, MemoryOS, TwinOS, FlowOS, PolicyOS
│
├── SUTAR OS (44 services) — ✅ COMPLETE
│   └── AI workforce, negotiation, contracts, trust
│
├── CompanyOS (30 services) — ✅ 85% COMPLETE
│   └── company-factory, industry-builder, department-packs
│
├── FederationOS (18 services) — ✅ COMPLETE
│   └── Discovery, ACP, Reputation, Commerce Graph
│
├── RABTUL (15 services) — ✅ 85% COMPLETE
│   └── wallet, payments, trust, treasury
│
├── 26 Industry OS — ✅ COMPLETE
│   └── Restaurant, Hotel, Healthcare, etc.
│
├── Genie + Hub (114 services) — ✅ COMPLETE
│   └── Genie AI, unified gateway
│
├── SiteOS Commerce (19 services) — ✅ BUILT
│   └── catalog, cart, checkout, payments
│
└── BLR AI Marketplace (8 services) — ⚠️ SCAFFOLDS
    └── listings, discovery, ROI calculator
```

---

## What Needs Building

```
MISSING / FRAGMENTED
│
├── Unified CommerceOS — ❌ NOT BUILT
│   └── Merge SiteOS (19) + Nexha commerce (5) + Twins (9)
│
├── Real BAM Workers — ❌ NOT BUILT
│   └── Vendor Acquisition, Catalog, Recommendation, Growth
│
├── Commerce Templates — ❌ NOT BUILT
│   └── Convert 26 Industry OS to Nexha templates
│
├── Commerce Studio UI — ❌ NOT BUILT
│   └── Wizard for creating commerce Nexhas
│
├── Product Graph — ❌ NOT BUILT
│   └── Universal Product ID system
│
└── Trade Finance — ❌ NOT BUILT
    └── Invoice discounting, Letter of Credit
```

---

## Phase 0: Foundation Fixes (Weeks 1-4)

> **Fix what's broken. Wire what's unwired.**

### Objectives
1. Wire RABTUL to RTMN Hub
2. Wire CommerceOS to Hub
3. Fix RTMN Hub routes for all commerce services
4. Create unified service registry

### Tasks

#### Week 1: Wire RABTUL to Hub

```
Tasks:
├── Add /api/wallet/* routes → REZ-wallet-service
├── Add /api/payment/* routes → REZ-payment-service
├── Add /api/escrow/* routes → REZ-escrow-service
├── Add /api/trust/* routes → rabtul-trust-engine:4180
├── Add /api/treasury/* routes → REZ-treasury-os:4055
└── Add /api/bnpl/* routes → REZ-bnpl-service
```

#### Week 2: Wire CommerceOS to Hub

```
Tasks:
├── Add /api/catalog/* routes → product-catalog:5476
├── Add /api/cart/* routes → cart-service:5477
├── Add /api/checkout/* routes → checkout-service:5478
├── Add /api/payments/* routes → payment-gateway:5479
├── Add /api/loyalty/* routes → loyalty-connector:5481
└── Add /api/orders/* routes → checkout-service:5478
```

#### Week 3: Wire Discovery + ACP to Hub

```
Tasks:
├── Add /api/discovery/* routes → nexha-discovery-os:4272
├── Add /api/capability/* routes → nexha-capability-os:4270
├── Add /api/reputation/* routes → nexha-reputation-os:4271
├── Add /api/acp/* routes → nexha-acp-messaging:4340
├── Add /api/negotiate/* routes → sutar-negotiation-engine:4293
└── Add /api/contracts/* routes → sutar-contract-os:4292
```

#### Week 4: Wire Industry + Company to Hub

```
Tasks:
├── Add /api/industry/* routes → Industry OS services
├── Add /api/company/* routes → company-os:4010
├── Add /api/factory/* routes → company-factory
├── Add /api/sutar/* routes → sutar-gateway:4140
└── Create unified service registry
```

### Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| RABTUL wired to Hub | 1 | ⏳ |
| CommerceOS wired to Hub | 2 | ⏳ |
| Discovery + ACP wired to Hub | 3 | ⏳ |
| Industry + Company wired to Hub | 4 | ⏳ |
| Unified service registry | 4 | ⏳ |

### Documentation

- [phase-0-rabtul-hub-wiring.md](phase-0-rabtul-hub-wiring.md)
- [phase-0-commerce-hub-wiring.md](phase-0-commerce-hub-wiring.md)

---

## Phase 1: Unified CommerceOS (Weeks 5-12)

> **Merge fragmented commerce services into one unified CommerceOS.**

### Objectives
1. Create unified CommerceOS service
2. Merge SiteOS Commerce (19 services)
3. Merge Nexha commerce (5 services)
4. Connect Commerce Twins
5. Build Universal Product ID system

### Architecture

```
COMMERCEOS (Unified)
│
├── Catalog Engine (5476)
│   ├── Product management
│   ├── Categories & taxonomy
│   ├── Search & discovery
│   ├── Variants & pricing
│   └── Universal Product ID
│
├── Inventory Engine
│   ├── Stock tracking
│   ├── Multi-location sync
│   ├── Reorder triggers
│   └── Low stock alerts
│
├── Order Engine (5478)
│   ├── Order capture
│   ├── Status tracking
│   ├── Cancellation logic
│   └── Returns handling
│
├── Checkout Engine (5479)
│   ├── Cart management
│   ├── Address validation
│   ├── Shipping options
│   └── Payment routing
│
├── Pricing Engine
│   ├── Base pricing
│   ├── Dynamic pricing
│   ├── Volume discounts
│   └── Competitor matching
│
├── Promotion Engine (5477)
│   ├── Discounts & coupons
│   ├── Bundle offers
│   ├── Flash sales
│   └── Loyalty points
│
├── Loyalty Engine (5481)
│   ├── Points system
│   ├── Tier management
│   ├── Rewards catalog
│   └── Referral tracking
│
├── Recommendation Engine
│   ├── Personalization
│   ├── Cross-sell
│   ├── Up-sell
│   └── Demand forecasting
│
└── Subscription Engine (5494)
    ├── Recurring billing
    ├── Plan management
    ├── Usage tracking
    └── Renewal automation
```

### Tasks

#### Week 5-6: Create CommerceOS Core

```bash
mkdir -p companies/HOJAI-AI/platform/commerce-os/

# Create unified CommerceOS gateway
# Path: platform/commerce-os/commerce-os-gateway/

Tasks:
├── Create commerce-os-gateway (port TBD)
├── Define unified API schema
├── Create CommerceOS module registry
├── Define service discovery
└── Create health endpoints
```

#### Week 7-8: Merge SiteOS Commerce

```bash
# Integrate existing SiteOS services:
├── product-catalog:5476 → Catalog Engine
├── cart-service:5477 → Promotion Engine
├── checkout-service:5478 → Order Engine
├── payment-gateway:5479 → Checkout Engine
├── loyalty-connector:5481 → Loyalty Engine
├── subscription-billing:5494 → Subscription Engine
└── review-collection:5480 → Trust integration
```

#### Week 9-10: Merge Nexha Commerce

```bash
# Integrate existing Nexha commerce:
├── nexha-catalog-os:4370 → Merge with Catalog Engine
├── nexha-order-os:4371 → Merge with Order Engine
├── nexha-inventory-os:4372 → Build Inventory Engine
├── nexha-pricing-os:4373 → Merge with Pricing Engine
├── nexha-commerce-runtime:4364 → Runtime integration
└── nexha-pricing-network:4286 → Pricing Intelligence
```

#### Week 11-12: Connect Commerce Twins + Product Graph

```bash
# Connect Commerce Twins:
├── commerce.customer → Customer Context
├── commerce.order → Order tracking
├── commerce.wallet → Payment integration
├── commerce.product → Product catalog
├── commerce.inventory → Inventory Engine
├── commerce.cart → Cart management
├── commerce.coupon → Promotion Engine
└── commerce.loyalty → Loyalty Engine

# Build Universal Product ID:
├── Product hash generation
├── Cross-marketplace linking
├── Specification normalization
└── GTIN/UPC integration
```

### Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| CommerceOS Gateway | 6 | ⏳ |
| Catalog Engine (merged) | 8 | ⏳ |
| Order Engine (merged) | 8 | ⏳ |
| Checkout + Payment | 8 | ⏳ |
| Inventory Engine | 10 | ⏳ |
| Pricing Engine | 10 | ⏳ |
| Promotion + Loyalty | 10 | ⏳ |
| Commerce Twins wired | 12 | ⏳ |
| Universal Product ID | 12 | ⏳ |

### Documentation

- [phase-1-commerce-os-spec.md](phase-1-commerce-os-spec.md)
- [phase-1-catalog-engine.md](phase-1-catalog-engine.md)
- [phase-1-inventory-engine.md](phase-1-inventory-engine.md)
- [phase-1-universal-product-id.md](phase-1-universal-product-id.md)

---

## Phase 2: Real BAM Workers (Weeks 13-24)

> **Build the AI workforce that powers every commerce Nexha.**

### Objectives
1. Build Vendor Acquisition Worker
2. Build Catalog Normalization Worker
3. Build Recommendation Engine
4. Build Growth Worker
5. Connect workers to CompanyOS

### BAM Worker Architecture

```
BAM PLATFORM
│
├── Vendor Acquisition Worker
│   ├── Prospect discovery
│   ├── Outreach automation
│   ├── Qualification scoring
│   ├── Contract generation
│   └── Onboarding workflow
│
├── Catalog Normalization Worker
│   ├── Image processing
│   ├── Description generation
│   ├── Category mapping
│   ├── Spec extraction
│   └── Quality scoring
│
├── Fraud Detection Worker
│   ├── Pattern analysis
│   ├── Anomaly detection
│   ├── Risk scoring
│   └── Alert routing
│
├── Recommendation Worker
│   ├── User behavior analysis
│   ├── Collaborative filtering
│   ├── Content-based matching
│   ├── A/B testing
│   └── Personalization
│
├── Customer Support Worker
│   ├── FAQ handling
│   ├── Refund processing
│   ├── Complaint escalation
│   └── Sentiment analysis
│
├── Pricing Worker
│   ├── Competitor monitoring
│   ├── Demand sensing
│   ├── Margin optimization
│   └── Dynamic pricing
│
├── Growth Worker
│   ├── Campaign creation
│   ├── A/B testing
│   ├── Conversion optimization
│   ├── Retention automation
│   └── Referral tracking
│
├── Trust Worker
│   ├── KYC verification
│   ├── Review aggregation
│   ├── ACI scoring
│   └── Compliance checking
│
└── Logistics Worker
    ├── Shipment tracking
    ├── Return processing
    ├── Delivery optimization
    └── ETA prediction
```

### Tasks

#### Week 13-16: Vendor Acquisition Worker

```bash
# Path: companies/HOJAI-AI/platform/bam/vendor-acquisition-worker/

Services:
├── vendor-prospector (port TBD)
│   ├── Web scraping
│   ├── Directory search
│   ├── Social discovery
│   └── Lead scoring
│
├── vendor-outreach (port TBD)
│   ├── Email automation
│   ├── WhatsApp integration
│   ├── Follow-up scheduling
│   └── Response parsing
│
├── vendor-qualifier (port TBD)
│   ├── Capability matching
│   ├── Trust scoring
│   ├── Compliance check
│   └── Capacity assessment
│
└── vendor-onboarder (port TBD)
    ├── Contract generation
    ├── Document collection
    ├── Catalog setup
    └── Activation workflow
```

#### Week 17-20: Catalog Normalization Worker

```bash
# Path: companies/HOJAI-AI/platform/bam/catalog-normalization-worker/

Services:
├── image-processor (port TBD)
│   ├── Background removal
│   ├── Quality enhancement
│   ├── Multiple angle generation
│   └── Compliance check
│
├── description-generator (port TBD)
│   ├── Title generation
│   ├── Bullet point creation
│   ├── SEO optimization
│   └── Language translation
│
├── spec-extractor (port TBD)
│   ├── OCR processing
│   ├── Attribute extraction
│   ├── Unit normalization
│   └── Comparison generation
│
└── quality-scorer (port TBD)
    ├── Completeness check
    ├── Quality scoring
    ├── Compliance validation
    └── Improvement suggestions
```

#### Week 21-24: Recommendation + Growth Workers

```bash
# Recommendation Worker
├── recommendation-engine (port TBD)
│   ├── User profiling
│   ├── Collaborative filtering
│   ├── Content-based matching
│   └── Real-time ranking
│
# Growth Worker
├── growth-engine (port TBD)
│   ├── Campaign creator
│   ├── Audience selector
│   ├── Budget optimizer
│   └── A/B manager
│
# Connect to CompanyOS
├── Wire workers to company-factory
├── Create worker catalog
├── Build worker marketplace
└── Add worker configuration UI
```

### Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| Vendor Acquisition Worker | 16 | ⏳ |
| Catalog Normalization Worker | 20 | ⏳ |
| Recommendation Worker | 22 | ⏳ |
| Growth Worker | 24 | ⏳ |
| BAM Worker Marketplace | 24 | ⏳ |

### Documentation

- [phase-2-bam-worker-spec.md](phase-2-bam-worker-spec.md)
- [phase-2-vendor-acquisition-worker.md](phase-2-vendor-acquisition-worker.md)
- [phase-2-catalog-normalization-worker.md](phase-2-catalog-normalization-worker.md)
- [phase-2-bam-marketplace.md](phase-2-bam-marketplace.md)

---

## Phase 3: Commerce Templates (Weeks 25-32)

> **Convert 26 Industry OS into commerce-enabled Nexha templates.**

### Objectives
1. Create Restaurant Commerce Template (reference)
2. Create 5 more industry templates
3. Build Template Builder
4. Create Vendor Liquidity Pools

### Template Architecture

```
COMMERCE TEMPLATE
│
├── Industry Config
│   ├── Industry type
│   ├── Commerce flows
│   ├── Trust requirements
│   └── Regulatory compliance
│
├── CommerceOS Modules
│   ├── Catalog Engine config
│   ├── Inventory Engine config
│   ├── Order Engine config
│   ├── Pricing Engine config
│   └── Loyalty Engine config
│
├── BAM Workers
│   ├── Industry-specific workers
│   ├── Worker configurations
│   └── Skill requirements
│
├── SUTAR Departments
│   ├── Department structure
│   ├── Agent hierarchy
│   └── Workflow templates
│
├── RABTUL Integration
│   ├── Payment methods
│   ├── Escrow rules
│   ├── Trade finance
│   └── Settlement terms
│
└── ACP Flows
    ├── Negotiation patterns
    ├── Contract templates
    └── Trust requirements
```

### Tasks

#### Week 25-26: Restaurant Commerce Template (Reference)

```bash
# Path: companies/HOJAI-AI/platform/commerce-templates/restaurant/

Template:
├── commerce-config.yaml
│   ├── industry: restaurant
│   ├── commerce_flows:
│   │   ├── order_to_delivery
│   │   ├── procurement_to_payment
│   │   └── reservation_to_checkout
│   ├── trust_requirements:
│   │   ├── fssai_license
│   │   ├── gst_registration
│   │   └── food_safety_certificate
│   └── regulatory:
│       ├── fssai_compliance
│       └── gst_invoicing
│
├── workers:
│   ├── chef-worker
│   ├── procurement-worker
│   ├── marketing-worker
│   ├── customer-worker
│   ├── finance-worker
│   └── delivery-worker
│
├── sutars:
│   ├── kitchen-department
│   ├── front-office-department
│   ├── procurement-department
│   └── finance-department
│
├── acp-flows:
│   ├── supplier-negotiation
│   ├── customer-order
│   └── delivery-tracking
│
└── rabtul:
    ├── customer-payments
    ├── supplier-payments
    └── escrow-for-events
```

#### Week 27-28: Hotel + Healthcare Templates

```bash
# Hotel Commerce Template
├── industry: hotel
├── commerce_flows:
│   ├── booking_to_checkout
│   ├── event_inquiry_to_contract
│   └── restaurant_order
├── workers:
│   ├── booking-worker
│   ├── revenue-worker
│   ├── housekeeping-worker
│   ├── concierge-worker
│   └── event-worker
└── rabtul:
    ├── guest-payments
    ├── corporate-billing
    └── commission-settlement

# Healthcare Commerce Template
├── industry: healthcare
├── commerce_flows:
│   ├── appointment_to_consultation
│   ├── prescription_to_pharmacy
│   └── lab_test_to_results
├── workers:
│   ├── doctor-worker
│   ├── pharmacy-worker
│   ├── insurance-worker
│   ├── lab-worker
│   └── billing-worker
└── rabtul:
    ├── insurance-settlement
    ├── emi-payments
    └── government-scheme
```

#### Week 29-30: Retail + Fashion + Automotive Templates

```bash
# Retail Commerce Template
├── industry: retail
├── commerce_flows:
│   ├── online-order
│   ├── in-store-purchase
│   └── omnichannel-sync
└── workers:
    ├── inventory-worker
    ├── pricing-worker
    ├── merchandising-worker
    └── loss-prevention-worker

# Fashion Commerce Template
├── industry: fashion
├── commerce_flows:
│   ├── design_to_production
│   ├── wholesale-order
│   └── d2c-sale
└── workers:
    ├── designer-worker
    ├── production-worker
    ├── wholesale-worker
    └── d2c-worker

# Automotive Commerce Template
├── industry: automotive
├── commerce_flows:
│   ├── vehicle-sale
│   ├── service-booking
│   └── spare-parts-order
└── workers:
    ├── sales-worker
    ├── service-worker
    ├── parts-worker
    └── finance-worker
```

#### Week 31-32: Remaining 21 Templates + Vendor Pools

```bash
# Create remaining templates:
├── education
├── agriculture
├── beauty
├── fitness
├── gaming
├── government
├── home-services
├── legal
├── manufacturing
├── non-profit
├── professional
├── sports
├── travel
├── entertainment
├── construction
├── financial
├── real-estate
├── transport
├── events
├── exhibitions
└── logistics

# Create Vendor Liquidity Pools:
├── electronics-vendors
├── fashion-vendors
├── food-vendors
├── healthcare-vendors
├── hospitality-vendors
├── automotive-vendors
└── general-merchandise-vendors
```

### Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| Restaurant Template | 26 | ⏳ |
| Hotel Template | 28 | ⏳ |
| Healthcare Template | 28 | ⏳ |
| Retail Template | 30 | ⏳ |
| Fashion Template | 30 | ⏳ |
| Automotive Template | 30 | ⏳ |
| 20 More Templates | 32 | ⏳ |
| Vendor Liquidity Pools | 32 | ⏳ |

### Documentation

- [phase-3-commerce-template-spec.md](phase-3-commerce-template-spec.md)
- [phase-3-restaurant-template.md](phase-3-restaurant-template.md)
- [phase-3-vendor-liquidity-pools.md](phase-3-vendor-liquidity-pools.md)

---

## Phase 4: Commerce Studio UI (Weeks 33-38)

> **Build the wizard that lets anyone create a commerce Nexha.**

### Objectives
1. Build Commerce Studio UI
2. Create template selector
3. Build worker configurator
4. Create deployment pipeline

### Studio Architecture

```
COMMERCE STUDIO UI
│
├── Landing Page
│   └── Hero + Features + Pricing
│
├── Template Marketplace
│   ├── Browse Templates
│   ├── Filter by Industry
│   ├── Template Preview
│   └── Template Details
│
├── Commerce Builder Wizard
│   ├── Step 1: Select Template
│   ├── Step 2: Configure Commerce
│   │   ├── Select CommerceOS modules
│   │   ├── Configure pricing
│   │   ├── Set up payments
│   │   └── Configure loyalty
│   ├── Step 3: Select Workers
│   │   ├── Browse BAM Workers
│   │   ├── Select Workers
│   │   └── Configure Workers
│   ├── Step 4: Set Up Trust
│   │   ├── Upload Documents
│   │   ├── KYC Verification
│   │   └── Configure Trust Rules
│   ├── Step 5: Connect Finance
│   │   ├── Bank Account
│   │   ├── Payment Gateway
│   │   └── Settlement Terms
│   └── Step 6: Review & Deploy
│
├── Dashboard
│   ├── Commerce Overview
│   ├── Order Management
│   ├── Inventory Management
│   ├── Worker Monitoring
│   └── Analytics
│
└── Settings
    ├── Profile
    ├── Team
    ├── Integrations
    └── Billing
```

### Tasks

#### Week 33-34: Studio Core + Template Marketplace

```bash
# Path: companies/HOJAI-AI/products/commerce-studio/

Frontend:
├── app/
│   ├── page.tsx (Landing)
│   ├── templates/
│   │   ├── page.tsx (Marketplace)
│   │   └── [templateId]/page.tsx
│   ├── builder/
│   │   ├── page.tsx (Wizard)
│   │   ├── step-1/page.tsx
│   │   ├── step-2/page.tsx
│   │   ├── step-3/page.tsx
│   │   ├── step-4/page.tsx
│   │   ├── step-5/page.tsx
│   │   └── step-6/page.tsx
│   └── dashboard/
│       └── page.tsx
│
Backend:
├── studio-gateway (port TBD)
├── template-service (port TBD)
└── deployment-service (port TBD)
```

#### Week 35-36: Commerce Builder Wizard

```bash
# Wizard Steps:
├── Step 1: Template Selection
│   └── Template cards with preview
├── Step 2: Commerce Configuration
│   ├── Module toggles
│   ├── Pricing config
│   └── Payment setup
├── Step 3: Worker Selection
│   ├── Worker cards
│   ├── Pricing display
│   └── Configuration
├── Step 4: Trust Setup
│   ├── Document upload
│   ├── KYC flow
│   └── Trust rules
├── Step 5: Finance Setup
│   ├── Bank connection
│   ├── Gateway config
│   └── Settlement terms
└── Step 6: Review & Deploy
    ├── Summary view
    ├── Pricing display
    └── Deploy button
```

#### Week 37-38: Dashboard + Deployment

```bash
# Dashboard:
├── commerce-overview
├── order-management
├── inventory-management
├── worker-monitoring
├── analytics
└── settings

# Deployment Pipeline:
├── template-compiler
├── worker-orchestrator
├── commerce-connector
└── deployment-automation
```

### Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| Studio UI Core | 34 | ⏳ |
| Template Marketplace | 34 | ⏳ |
| Commerce Builder Wizard | 36 | ⏳ |
| Dashboard | 36 | ⏳ |
| Deployment Pipeline | 38 | ⏳ |

### Documentation

- [phase-4-commerce-studio-spec.md](phase-4-commerce-studio-spec.md)
- [phase-4-studio-ui-components.md](phase-4-studio-ui-components.md)
- [phase-4-deployment-pipeline.md](phase-4-deployment-pipeline.md)

---

## Phase 5: Advanced Commerce (Weeks 39-50)

> **Build advanced commerce capabilities.**

### Objectives
1. Build Product Graph
2. Build Trade Finance
3. Build Cross-Border Commerce
4. Build Universal Distribution Engine

### Tasks

#### Week 39-42: Product Graph

```bash
# Universal Product ID System
├── product-graph-service (port TBD)
│   ├── Product ID generation
│   ├── Specification normalization
│   ├── Cross-reference linking
│   └── Duplicate detection
│
├── universal-product-registry (port TBD)
│   ├── GTIN/UPC integration
│   ├── Brand verification
│   ├── Category mapping
│   └── Compliance checking
│
└── product-intelligence (port TBD)
    ├── Price tracking
    ├── Review aggregation
    ├── Specification comparison
    └── Demand analysis
```

#### Week 43-46: Trade Finance

```bash
# Trade Finance Services
├── invoice-discounting (port TBD)
│   ├── Invoice upload
│   ├── Credit assessment
│   ├── Discount calculation
│   └── Payment tracking
│
├── letter-of-credit (port TBD)
│   ├── LC application
│   ├── Bank verification
│   ├── Shipment tracking
│   └── Payment settlement
│
├── working-capital (port TBD)
│   ├── Credit assessment
│   ├── Loan origination
│   ├── Repayment tracking
│   └── Risk scoring
│
└── insurance-service (port TBD)
    ├── Cargo insurance
    ├── Credit insurance
    └── Trade insurance
```

#### Week 47-50: Universal Distribution + Cross-Border

```bash
# Universal Distribution Engine
├── distribution-engine (port TBD)
│   ├── Channel management
│   ├── Inventory allocation
│   ├── Price synchronization
│   └── Order routing
│
├── cross-border-service (port TBD)
│   ├── Customs documentation
│   ├── Import/export compliance
│   ├── Duty calculation
│   └── Country regulations
│
└── fx-service (port TBD)
    ├── Currency conversion
    ├── Exchange rate hedging
    └── Multi-currency settlement
```

### Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| Product Graph | 42 | ⏳ |
| Invoice Discounting | 46 | ⏳ |
| Letter of Credit | 46 | ⏳ |
| Universal Distribution | 50 | ⏳ |
| Cross-Border Commerce | 50 | ⏳ |

### Documentation

- [phase-5-product-graph.md](phase-5-product-graph.md)
- [phase-5-trade-finance.md](phase-5-trade-finance.md)
- [phase-5-universal-distribution.md](phase-5-universal-distribution.md)

---

## Summary Roadmap

```
WEEK 1-4:   Phase 0 — Foundation Fixes
             ├── Wire RABTUL to Hub
             ├── Wire CommerceOS to Hub
             ├── Wire Discovery + ACP to Hub
             └── Wire Industry + Company to Hub

WEEK 5-12:  Phase 1 — Unified CommerceOS
             ├── CommerceOS Gateway
             ├── Catalog + Order + Checkout
             ├── Inventory + Pricing + Loyalty
             └── Commerce Twins + Product ID

WEEK 13-24: Phase 2 — Real BAM Workers
             ├── Vendor Acquisition Worker
             ├── Catalog Normalization Worker
             ├── Recommendation Worker
             └── Growth Worker + BAM Marketplace

WEEK 25-32: Phase 3 — Commerce Templates
             ├── Restaurant Template (reference)
             ├── Hotel + Healthcare Templates
             ├── Retail + Fashion + Automotive
             └── 20 More Templates + Vendor Pools

WEEK 33-38: Phase 4 — Commerce Studio UI
             ├── Studio UI Core
             ├── Template Marketplace
             ├── Commerce Builder Wizard
             └── Dashboard + Deployment

WEEK 39-50: Phase 5 — Advanced Commerce
             ├── Product Graph
             ├── Trade Finance
             └── Universal Distribution + Cross-Border

TOTAL:       50 weeks (~12 months)
```

---

## Key Dependencies

```
Phase 0
└── Must complete before Phase 1

Phase 1
├── Requires Phase 0
└── Must complete before Phase 2, 3, 4

Phase 2
├── Requires Phase 1
└── Must complete before Phase 4

Phase 3
├── Requires Phase 1
└── Must complete before Phase 4

Phase 4
├── Requires Phase 1, 2, 3
└── Can run in parallel after dependencies met

Phase 5
├── Requires Phase 4
└── Final phase
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | HIGH | Stick to phase deliverables |
| Integration complexity | MEDIUM | Start with Phase 0 wiring |
| Performance issues | MEDIUM | Add caching layer early |
| Testing gaps | HIGH | Add tests in each phase |
| Documentation debt | MEDIUM | Create MD files per phase |

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 0 | Hub routes wired | 100% commerce services |
| Phase 1 | CommerceOS API coverage | 100% modules |
| Phase 2 | BAM workers operational | 5 core workers |
| Phase 3 | Templates available | 26 industry templates |
| Phase 4 | Studio deploys Nexha | <7 days |
| Phase 5 | Cross-border enabled | 10+ countries |

---

*Document Version: 1.0*
*Created: June 30, 2026*
*Next Update: After Phase 0 completion*
