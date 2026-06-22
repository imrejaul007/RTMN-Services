# Supplier Agent - Features

**Company:** HOJAI AI
**Type:** L2 Specialist Employee
**Port:** 4850
**Status:** ✅ Built

---

## Core Features

### 1. RFQ Handling
- [x] Receive RFQ notifications
- [x] Validate requirements
- [x] Category matching
- [x] Inventory check
- [x] Response time tracking

### 2. Quote Generation
- [x] Base price calculation
- [x] Volume discounts
  - 100+ units: 15%
  - 50+ units: 10%
  - 20+ units: 5%
- [x] Delivery date estimation
- [x] Terms specification
- [x] Warranty details

### 3. Negotiation
- [x] Counter-offer logic
- [x] Multi-round (max 5)
- [x] Accept/reject thresholds
- [x] Final offer handling

### 4. Contract Management
- [x] Contract generation
- [x] Terms specification
- [x] SUTAR validation
- [x] Payment terms

---

## Supplier Categories

| Category | Items |
|----------|-------|
| AC | AC units, repairs, filters, gas refill |
| HVAC | Service, duct cleaning |
| Maintenance | General repairs, service |
| Parts | Spare parts, supplies |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rfq/receive` | Receive RFQ |
| POST | `/api/rfq/auto-respond` | Auto respond |
| GET | `/api/quotes/:quoteId` | Get quote |
| PUT | `/api/quotes/:quoteId/accept` | Accept quote |
| POST | `/api/negotiate` | Handle negotiation |
| GET | `/api/supplier/profile` | Get profile |

---

## Story Coverage

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 11 | Supplier receives RFQ, generates quote | ✅ |
| Ch 11 | Negotiation and contract | ✅ |

---

**Last Updated:** June 14, 2026
