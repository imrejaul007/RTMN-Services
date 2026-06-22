# Procurement Agent

**Company:** HOJAI AI
**Type:** L2 Specialist Employee
**Industry:** Procurement/Supply Chain
**Port:** 4786
**Status:** ✅ Connected & Working (June 14, 2026)

---

## Overview

Procurement Agent is an AI employee that handles procurement operations with intelligent supplier matching, negotiation, and contract generation.

### Tagline
> "AI-powered procurement with smart supplier matching and negotiation"

---

## Capabilities

### RFQ Management
- [x] Create RFQs (Request for Quote)
- [x] Supplier matching by category
- [x] Deadline management
- [x] Quote tracking
- [x] Status monitoring

### Negotiation
- [x] Calculate target prices
- [x] Volume discount strategies
- [x] Counter-offer handling
- [x] Savings calculations
- [x] Multi-round negotiation

### Supplier Management
- [x] Supplier discovery
- [x] Category matching
- [x] Trust score evaluation
- [x] Rating-based selection
- [x] Contract generation

### Auto-Procurement
- [x] Low stock detection
- [x] Auto-RFQ creation
- [x] Multi-supplier comparison
- [x] Best price selection
- [x] Contract auto-generation

---

## Services Connected

| Service | Connects To | Port | Purpose |
|---------|-------------|------|---------|
| **Procurement OS** | Nexha Procurement OS | 4320 | RFQ, deals, suppliers |
| **Auth** | RABTUL Auth | 4002 | Authentication |
| **Payment** | RABTUL Payment | 4001 | Payments |

---

## Integration Points

| Connected Service | Port | Purpose | Status |
|-------------------|------|---------|---------|
| Nexha Procurement OS | 4320 | RFQ, suppliers, deals | ✅ Connected |
| RABTUL Auth | 4002 | Authentication | ✅ Connected |
| RABTUL Payment | 4001 | Payments | ✅ Connected |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/rfq` | Create RFQ |
| GET | `/api/rfq` | List active RFQs |
| GET | `/api/rfq/:rfqId` | Get RFQ status |
| POST | `/api/negotiate` | Calculate negotiation strategy |
| POST | `/api/negotiate/counter` | Submit counter offer |
| GET | `/api/suppliers` | Find suppliers |
| POST | `/api/suppliers/evaluate` | Evaluate supplier |
| POST | `/api/suppliers/contract` | Generate contract |

---

## Supplier Categories

| Category | Suppliers | Description |
|----------|-----------|-------------|
| AC/HVAC | 3 | Cooling equipment vendors |
| Plumbing | 2 | Water/hardware suppliers |
| Electrical | 2 | Wiring/safety suppliers |
| Linen | 2 | Hotel textile suppliers |
| Food | 2 | Produce/meat suppliers |
| General | 3 | Multi-category suppliers |

---

## Negotiation Strategies

| Strategy | Target Discount | Max Rounds |
|----------|---------------|------------|
| standard | 10% | 3 |
| aggressive | 20% | 5 |
| friendly | 5% | 2 |

---

## Quick Start

```bash
cd companies/hojai-ai/employees/procurement-agent
npm install
npm start
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4786 | Service port |
| PROCUREMENT_OS_URL | http://localhost:4320 | Nexha Procurement OS |
| INTERNAL_SERVICE_TOKEN | dev-token | Service authentication |

---

## Example Usage

### Create RFQ

```bash
curl -X POST http://localhost:4786/api/rfq \
  -H "Content-Type: application/json" \
  -d '{
    "item": "500 towels",
    "quantity": 500,
    "category": "linen",
    "hotelId": "pentouz-indiranagar"
  }'
```

### Negotiate Price

```bash
curl -X POST http://localhost:4786/api/negotiate \
  -H "Content-Type: application/json" \
  -d '{
    "currentPrice": 25000,
    "strategy": "standard"
  }'
```

### Find Suppliers

```bash
curl "http://localhost:4786/api/suppliers?category=ac"
```

---

## Story Coverage

| Chapter | Story Component | Status |
|---------|----------------|--------|
| Ch 11 | Procurement → Nexha | ✅ Working |

---

**Last Updated:** June 14, 2026
