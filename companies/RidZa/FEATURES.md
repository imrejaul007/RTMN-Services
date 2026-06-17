# RidZa - Financial Services Platform

**Last Updated:** June 17, 2026  
**Location:** `companies/RidZa/`  
**Status:** ✅ **PRODUCTION READY**  
**Tagline:** "Islamic & Conventional Financial Services"

---

## Overview

RidZa provides comprehensive financial services for the RTMN ecosystem. It connects via Layer 4 (Financial) and includes lending, insurance, investments, and remittance services with Islamic finance options.

---

## Core Services

### Finance AI Agents

| Service | Port | Purpose |
|---------|------|---------|
| finance-cfo | 4900 | AI CFO insights |
| finance-accountant | 4901 | Accounting automation |
| finance-budget-coach | 4906 | Budget planning |

### Islamic Finance

| Service | Port | Purpose |
|---------|------|---------|
| ridza-islamic-finance | 4250 | Islamic finance products |
| halal-investment | 4251 | Sharia-compliant investments |
| zakah-calculator | 4252 | Zakah calculations |

### Remittance

| Service | Port | Purpose |
|---------|------|---------|
| ridza-remittance | 4260 | Cross-border transfers |

---

## Features

### Lending Services

| Feature | Description | Status |
|---------|-------------|--------|
| Personal Loans | Instant loans | ✅ |
| Business Loans | SME financing | ✅ |
| Islamic Financing | Sharia-compliant | ✅ |
| Loan Calculator | EMI calculations | ✅ |
| Credit Scoring | AI scoring | ✅ |

### Insurance Services

| Feature | Description | Status |
|---------|-------------|--------|
| Health Insurance | Medical coverage | ✅ |
| Life Insurance | Protection | ✅ |
| Property Insurance | Asset protection | ✅ |
| Travel Insurance | Trip coverage | ✅ |
| Claim Processing | AI claims | ✅ |

### Investments

| Feature | Description | Status |
|---------|-------------|--------|
| Mutual Funds | Diversified funds | ✅ |
| Islamic Funds | Sharia funds | ✅ |
| Portfolio Management | AI advisory | ✅ |
| SIP Calculator | Systematic plans | ✅ |

### Remittance

| Feature | Description | Status |
|---------|-------------|--------|
| International Transfers | Global reach | ✅ |
| Exchange Rates | Real-time rates | ✅ |
| Transfer Tracking | Track payments | ✅ |
| Multi-Currency | Multiple currencies | ✅ |

### Islamic Finance

| Feature | Description | Status |
|---------|-------------|--------|
| Murabaha | Cost-plus financing | ✅ |
| Ijara | Lease-to-own | ✅ |
| Musharaka | Partnership financing | ✅ |
| Zakah Calculator | Calculate charity | ✅ |
| Halal Verification | Sharia compliance | ✅ |

---

## API Endpoints

### Loans

```
GET  /api/loans                  - List loans
POST /api/loans/apply            - Apply for loan
GET  /api/loans/:id              - Get loan details
POST /api/loans/:id/repay        - Make repayment
```

### Insurance

```
GET  /api/insurance              - List policies
POST /api/insurance/apply        - Apply for insurance
GET  /api/insurance/:id          - Get policy
POST /api/insurance/:id/claim    - File claim
```

### Remittance

```
POST /api/remittance/send        - Send money
GET  /api/remittance/:id         - Track transfer
GET  /api/remittance/rates       - Get exchange rates
```

### Islamic Finance

```
GET  /api/islamic/products       - List products
POST /api/islamic/apply          - Apply for financing
GET  /api/islamic/zakah          - Calculate zakah
```

---

## RTMN Ecosystem Integration

### Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Wallet | 4004 | Fund transfers |
| RABTUL Payment | 4001 | Payment processing |
| AssetMind | 5200 | Wealth management |
| FinanceOS | 5250 | Expense tracking |
| TwinOS Hub | 4705 | Financial twins |

### Layer Integration

| RTMN Layer | Connection |
|------------|------------|
| Layer 4 (Finance) | Core financial |
| Layer 12 (Twins) | Financial twins |

---

## Related Documentation

- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md) - Company registry
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features
- [INDUSTRY-OS-FULL-DETAILS.md](../../INDUSTRY-OS-FULL-DETAILS.md) - Industry integration

---

*Last Updated: June 17, 2026*
*RidZa - Part of RTMN Ecosystem*