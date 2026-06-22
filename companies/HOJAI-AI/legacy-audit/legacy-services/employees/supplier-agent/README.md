# Supplier Agent

**Company:** HOJAI AI
**Type:** L2 Specialist Employee
**Industry:** Procurement/Supply Chain
**Port:** 4850
**Status:** ✅ Built (June 14, 2026)

---

## Overview

Supplier Agent is an autonomous agent that responds to RFQs and manages the supplier side of procurement.

### Tagline
> "Autonomous RFQ response with intelligent pricing and negotiation"

---

## Capabilities

### RFQ Handling
- [x] Receive RFQ notifications
- [x] Validate RFQ requirements
- [x] Category matching
- [x] Inventory check

### Quote Generation
- [x] Base price calculation
- [x] Volume discount application
- [x] Delivery date estimation
- [x] Terms specification

### Negotiation
- [x] Counter-offer generation
- [x] Multi-round negotiation
- [x] Accept/reject logic
- [x] Final offer handling

### Contract Management
- [x] Contract generation
- [x] Terms specification
- [x] Validity period
- [x] SUTAR validation

---

## Services Connected

| Service | Port | Purpose |
|---------|------|---------|
| Procurement Agent | 4786 | RFQ source |
| Nexha | 4320 | Network |
| SUTAR | 4518 | Trust validation |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/rfq/receive` | Receive RFQ |
| POST | `/api/rfq/auto-respond` | Auto respond to RFQ |
| GET | `/api/quotes/:quoteId` | Get quote |
| PUT | `/api/quotes/:quoteId/accept` | Accept quote |
| POST | `/api/negotiate` | Handle negotiation |
| GET | `/api/supplier/profile` | Get supplier profile |

---

## Quick Start

```bash
cd employees/supplier-agent
npm install
npm run dev
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4850 | Service port |
| SUPPLIER_ID | sup-ac-1 | Supplier ID |
| SUPPLIER_NAME | CoolAir Solutions | Supplier name |
| PROCUREMENT_AGENT_URL | http://localhost:4786 | Procurement Agent |
| NEXHA_URL | http://localhost:4320 | Nexha |
| SUTAR_URL | http://localhost:4518 | SUTAR |

---

## Story Coverage

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 11 | Supplier responds to RFQ | ✅ Working |

---

**Last Updated:** June 14, 2026
