# HOJAI AI - Complete AI Infrastructure Platform

**Version:** 4.0 | **Date:** June 17, 2026  
**Status:** ✅ COMPLETE - FinanceOS + 20 Services

---

## HOJAI FinanceOS - Complete Financial Intelligence Platform

**Tagline:** *"The AI Financial Operating System that understands every rupee spent"*

```
FinanceOS Suite (Ports 5250-5305)
├── ExpenseOS (5250)         - Multi-channel expense capture
├── Approval Workflow (5255)  - Multi-level approvals
├── Reimbursement OS (5260)   - Claims & payouts
├── VendorOS (5265)           - Vendor management
├── ProcurementOS (5275)      - Purchase orders
├── ContractOS (5285)         - Contract lifecycle
├── Finance Twin Hub (5270)   - Digital twins
├── Spend Intelligence (5280)  - Analytics
├── TreasuryOS (5295)         - Cash management
├── AuditOS (5305)            - Financial audits
├── Corporate Card OS (5290)   - Virtual cards
└── Finance AI Agents (4900-4906)
```

---

## FinanceOS Services

| Port | Service | MongoDB | Purpose |
|------|---------|---------|---------|
| 5250 | ExpenseOS | expense | Multi-channel expense capture |
| 5255 | Approval Workflow | approval | Multi-level approvals |
| 5260 | Reimbursement OS | reimbursement | Claims & payouts |
| 5265 | VendorOS | vendor | Vendor management |
| 5275 | ProcurementOS | procurement | Purchase orders |
| 5285 | ContractOS | contracts | Contract lifecycle |
| 5270 | Finance Twin Hub | finance-twins | Digital twins |
| 5280 | Spend Intelligence | spend | Analytics |
| 5295 | TreasuryOS | treasury | Cash management |
| 5305 | AuditOS | audit | Financial audits |
| 5290 | Corporate Card OS | corporate-cards | Virtual cards |

---

## Quick Start

```bash
# Install dependencies
cd services/expense-os && npm install && npm start

# Start any FinanceOS service
cd services/vendor-os && npm install && npm start
```

---

## Environment Variables

- `PORT` - HTTP port (service-specific)
- `MONGO_URI` - MongoDB connection string

---

## API Base URLs

| Service | URL |
|---------|-----|
| ExpenseOS | http://localhost:5250 |
| VendorOS | http://localhost:5265 |
| ProcurementOS | http://localhost:5275 |
| ContractOS | http://localhost:5285 |
| TreasuryOS | http://localhost:5295 |
| AuditOS | http://localhost:5305 |

---

## Health Check

All services expose `/health` endpoint:

```bash
curl http://localhost:5250/health
```

---

**Last Updated:** June 17, 2026