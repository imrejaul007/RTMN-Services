# RTNM Digital - Nexha ProcurementOS Company Audit

**Version:** 1.0
**Date:** June 12, 2026
**Company:** Nexha
**Product:** ProcurementOS - Hotel Supply Procurement

---

## COMPANY OVERVIEW

**Name:** ProcurementOS
**Company:** Nexha
**Type:** Commerce & Procurement
**Port:** 4320
**Tagline:** "Smart Procurement for Hotels"

## ECOSYSTEM ROLE

```
RTNM Digital
├── Nexha
│   └── ProcurementOS ──────────→ provides procurement to all RTNM ecosystem
│       ├── StayOwn ──────────────→ Hotel supply procurement
│       ├── All Hotels ───────────→ Inventory management
│       └── REZ-Merchant ─────────→ Supplier network
```

---

## SERVICES

### Core Services

| Port | Service | Purpose | Status |
|------|---------|---------|--------|
| **4320** | procurement-os | Supply chain management | ✅ |

### Integration Services

| Service | Connected To | Purpose |
|---------|--------------|---------|
| **nexha-gateway** | All Nexha services | API gateway |
| **distribution-os** | Distribution network | Logistics |
| **franchise-os** | Franchise management | Multi-location |
| **manufacturing-os** | Manufacturing | Production tracking |

---

## RTNM INTEGRATIONS

### StayOwn Hotel OS Integration (NEW - June 2026)

ProcurementOS now integrates with StayOwn Hotel OS to provide hotel supply procurement.

#### Endpoints Added

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hotels/:hotelId/requirements` | GET | Get hotel supply requirements |
| `/api/hotels/:hotelId/orders` | POST | Submit hotel supply order |
| `/api/hotels/:hotelId/approved-suppliers` | GET | Get approved suppliers |
| `/api/orders/:orderId/hotel-tracking` | GET | Track hotel supply order |
| `/api/integration/stayown/status` | GET | Check StayOwn integration health |

#### Integration Flow

```
Hotel needs supplies
        ↓
GET /api/hotels/:hotelId/requirements
        ↓
ProcurementOS returns needed items
        ↓
POST /api/hotels/:hotelId/orders
        ↓
Order submitted to approved suppliers
        ↓
Order tracked via /api/orders/:id/hotel-tracking
```

#### Configuration

```bash
STAYOWN_URL=http://localhost:3899
```

---

## API ENDPOINTS

### Supplier Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/suppliers` | Register supplier |
| GET | `/api/suppliers` | List suppliers |
| GET | `/api/suppliers/:id` | Get supplier details |
| PUT | `/api/suppliers/:id` | Update supplier |

### Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketplace/products` | Browse products |
| POST | `/api/marketplace/orders` | Create order |
| GET | `/api/marketplace/orders/:id` | Get order details |

### RFQ Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rfq` | Create RFQ |
| GET | `/api/rfq/:id` | Get RFQ details |
| POST | `/api/rfq/:id/quotes` | Submit quote |

### Order Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders |
| POST | `/api/orders/:id/confirm` | Confirm order |
| PATCH | `/api/orders/:id/status` | Update order status |

### RTNM Integration (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hotels/:hotelId/requirements` | Hotel supply requirements |
| POST | `/api/hotels/:hotelId/orders` | Submit hotel order |
| GET | `/api/hotels/:hotelId/approved-suppliers` | Approved suppliers |
| GET | `/api/orders/:orderId/hotel-tracking` | Track hotel order |

---

## TECH STACK

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Security:** Helmet, CORS, Rate Limiting, RBAC
- **Auth:** RABTUL JWT + Internal Token

---

## RABTUL INTEGRATIONS

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | User authentication |
| RABTUL Payment | 4001 | Payment processing |

---

## RTNM ECOSYSTEM CONNECTIONS

### Connected Companies

| Company | Service | Integration Type |
|---------|---------|------------------|
| **StayOwn** | Hotel OS (3899) | Hotel procurement |
| **REZ-Merchant** | Merchant Platform | Supplier network |

### Connected HOJAI Services

| Service | Port | Purpose |
|---------|------|---------|
| Nexha Intelligence | - | ML predictions |

---

## FEATURES

### Core Features

| Feature | Description |
|---------|-------------|
| Supplier Management | Register, verify, rate suppliers |
| Marketplace | Browse, compare, order products |
| RFQ System | Request for quotes from multiple suppliers |
| Order Tracking | End-to-end order lifecycle |
| Inventory Sync | Real-time inventory updates |

### RTNM Integration Features (NEW)

| Feature | Description |
|---------|-------------|
| Hotel Requirements | Get hotel-specific supply needs |
| Supply Orders | Submit orders on behalf of hotels |
| Approved Suppliers | Access hotel-approved supplier list |
| Order Tracking | Track orders for hotel operations |

---

## ENVIRONMENT VARIABLES

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4320 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection |
| CORS_ORIGIN | No | * | CORS origins |
| RATE_LIMIT_WINDOW_MS | No | 60000 | Rate limit window |
| RATE_LIMIT_MAX_REQUESTS | No | 100 | Max requests per window |
| WEBHOOK_SECRET | No | default-webhook-secret | Webhook verification |
| STAYOWN_URL | No | http://localhost:3899 | StayOwn Hotel OS |

---

## QUICK START

```bash
cd nexha/procurement-os
npm install
npm run dev
# Service runs on port 4320
```


## SUTAR SimulationOS (HOJAI AI)

**Port:** 4241 | **Status:** ✅ Complete

### Overview
What-if analysis, Monte Carlo simulation, and scenario testing for business decisions. Part of the SUTAR OS 12-layer canonical architecture (Layer 5).

### Features

#### Scenario Planning
| Feature | Status | Description |
|---------|--------|-------------|
| Pricing Optimization | ✅ | Price elasticity testing and optimization |
| Offer Modeling | ✅ | Promotional offers and discount strategies |
| Cashback ROI | ✅ | Cashback rewards and return on investment |
| Bundle Pricing | ✅ | Bundle pricing strategy analysis |

#### Forecasting
| Feature | Status | Description |
|---------|--------|-------------|
| Demand Forecasting | ✅ | Forecast demand with seasonality |
| Cash Flow Forecasting | ✅ | Cash flow projections (inflows/outflows) |
| Revenue Forecasting | ✅ | Revenue forecasting with growth modeling |
| Cost Forecasting | ✅ | Cost structure and break-even analysis |

#### Risk Modeling
| Feature | Status | Description |
|---------|--------|-------------|
| Financial Risk | ✅ | Financial risk assessment and mitigation |
| Operational Risk | ✅ | Operational risk modeling |
| Market Risk | ✅ | Market volatility and competition risk |
| Compliance Risk | ✅ | Regulatory compliance and penalty risk |

#### Sensitivity Analysis
| Feature | Status | Description |
|---------|--------|-------------|
| What-If Analysis | ✅ | Parameter change impact analysis |
| Impact Assessment | ✅ | Scenario impact quantification |
| Recommendation Engine | ✅ | AI-powered recommendations |

#### Operations
| Feature | Status | Description |
|---------|--------|-------------|
| Staffing Optimization | ✅ | Workforce planning and optimization |
| Inventory Optimization | ✅ | Stock levels and carrying costs |
| Procurement Analysis | ✅ | Supplier comparison and sourcing |

### Supported Simulation Types
- PRICING, OFFER, CASHBACK, BUNDLE
- DEMAND, CASHFLOW, REVENUE, COST
- RISK, COMPLIANCE, STAFFING, INVENTORY, PROCUREMENT, CUSTOM

### API Endpoints
- `POST /api/v1/simulations` - Run Monte Carlo simulation
- `GET /api/v1/simulations` - List simulations
- `GET /api/v1/simulations/:id` - Get simulation result
- `POST /api/v1/simulations/:id/whatif` - What-if analysis
- `POST /api/v1/simulations/compare` - Compare scenarios

### Implementation Details
- **Technology:** Node.js, Express, TypeScript, Zod
- **Location:** `companies/hojai-ai/hojai-sutar-os/services/sutar-simulation-os/`
- **Lines of Code:** 1500+
- **Dependencies:** express, helmet, cors, express-rate-limit, zod, uuid

---
---

**Last Updated:** June 12, 2026
**Version:** 1.0

## SUTAR OS - Autonomous Economic Infrastructure (HOJAI AI)

**Company:** HOJAI AI
**Total Services:** 25
**Status:** Production Ready

### SUTAR OS 12-Layer Architecture

| Layer | Service | Port | Status | Features |
|-------|---------|------|--------|----------|
| Layer 3 | GoalOS | 4242 | Complete | Goal decomposition, OKR system |
| Layer 4 | Decision Engine | 4240 | Complete | Policy evaluation, Risk assessment |
| Layer 5 | SimulationOS | 4241 | Complete | Monte Carlo, What-if analysis |
| Layer 6 | Agent Network | 4155 | Complete | Registry, Capability matching |
| Layer 7 | Negotiation Engine | 4191 | Complete | RFQ, Quotes, Counter-offers |
| Layer 8 | Trust Engine | 4180 | Complete | Trust scoring, KYC |
| Layer 9 | Contract OS | 4190 | Complete | Contracts, Digital signatures |
| Layer 10 | Economy OS | 4251 | Complete | Karma points, Transactions |
| Layer 11 | Marketplace | 4250 | Complete | Service listing, Ratings |
| Layer 12 | Network Learning | 4243 | Complete | Pattern learning |
| - | Intent Bus | 4154 | Complete | Intent capture |
| - | Memory Bridge | 4143 | Complete | Context storage |
| - | Gateway | 4140 | Complete | API routing |

### SimulationOS Features (Port 4241)

| Category | Feature | Type | Status |
|----------|---------|------|--------|
| Scenario Planning | Pricing | PRICING | Complete |
| Scenario Planning | Offer | OFFER | Complete |
| Scenario Planning | Cashback | CASHBACK | Complete |
| Scenario Planning | Bundle | BUNDLE | Complete |
| Forecasting | Demand | DEMAND | Complete |
| Forecasting | Cash Flow | CASHFLOW | Complete |
| Forecasting | Revenue | REVENUE | Complete |
| Forecasting | Cost | COST | Complete |
| Risk Modeling | Financial Risk | RISK | Complete |
| Risk Modeling | Operational Risk | RISK | Complete |
| Risk Modeling | Market Risk | RISK | Complete |
| Risk Modeling | Compliance | COMPLIANCE | Complete |
| Operations | Staffing | STAFFING | Complete |
| Operations | Inventory | INVENTORY | Complete |
| Operations | Procurement | PROCUREMENT | Complete |
| Operations | Custom | CUSTOM | Complete |

### Decision Engine Features (Port 4240)

| Feature | Status |
|---------|--------|
| OFFER decision | Complete |
| CASHBACK decision | Complete |
| PERSONALIZATION decision | Complete |
| ROUTING decision | Complete |
| FRAUD decision | Complete |
| PRICING decision | Complete |
| NEXT_ACTION decision | Complete |
| RETENTION decision | Complete |
| APPROVAL decision | Complete |
| RISK decision | Complete |

---
