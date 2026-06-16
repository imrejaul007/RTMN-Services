# RABTUL Technologies - Financial Services Platform

**Last Updated:** June 16, 2026  
**Location:** `companies/RABTUL-Technologies/`  
**Status:** ✅ **PRODUCTION READY** - 112+ Services | 20 Connected to RTMN OS

---

## Overview

RABTUL Technologies provides the financial infrastructure for the RTMN ecosystem. Connected via **Layer 4 (Financial)** to all 25 Industry OS services.

---

## Connected Services (20)

### Authentication & Identity (1)

| Service | Port | Purpose |
|---------|------|---------|
| auth | 4002 | JWT authentication, session management |

### Wallet & Payments (3)

| Service | Port | Purpose |
|---------|------|---------|
| wallet | 4004 | Digital wallet, balance management |
| walletService | 4005 | Wallet operations, transfers |
| paymentGateway | 4006 | Payment processing, refunds |

### Accounting & Finance (4)

| Service | Port | Purpose |
|---------|------|---------|
| accounting | 4010 | Chart of accounts, ledgers |
| expenseService | 4011 | Expense tracking, approval |
| invoiceService | 4012 | Invoice generation, management |
| lending | 4020 | Lending platform, loans |

### Credit & Procurement (2)

| Service | Port | Purpose |
|---------|------|---------|
| creditService | 4021 | Credit scoring, limits |
| procurementPayment | 4007 | Procurement payment processing |

### Contract & Distribution (2)

| Service | Port | Purpose |
|---------|------|---------|
| contractMgmt | 4030 | Contract lifecycle management |
| distributionOS | 4040 | Distribution management |

### Infrastructure (5)

| Service | Port | Purpose |
|---------|------|---------|
| graphqlFed | 4000 | GraphQL Federation |
| eventBus | 4510 | Event Bus (Pub/Sub) |
| fileStorage | 4050 | File storage, CDN |
| ecosystemConnector | 4399 | Ecosystem connector |
| notificationService | 4005 | Notifications |

---

## RTMN OS Endpoints

```
# Finance & Accounting
GET  /api/finance/accounting     - Get accounts
GET  /api/finance/expenses       - Get expenses
POST /api/finance/expenses       - Submit expense
GET  /api/finance/invoices       - Get invoices
POST /api/finance/invoices       - Create invoice

# Wallet & Payments
GET  /api/finance/wallet         - Get wallet balance
POST /api/finance/wallet/topup   - Top up wallet
POST /api/finance/wallet/transfer - Transfer funds
POST /api/finance/payment        - Process payment
POST /api/finance/payment/refund - Refund payment

# Credit & Lending
GET  /api/finance/credit        - Get credit info
POST /api/finance/credit/apply  - Apply for credit

# Procurement
GET  /api/finance/procurement   - Get procurement
POST /api/finance/procurement   - Create procurement
```

---

## Industry OS Integration

All 25 Industry OS services connect to RABTUL via Layer 4:

| Industry OS | Connection |
|-------------|------------|
| Restaurant OS | Payment, Wallet, Accounting |
| Hotel OS | Payment, Invoice, Credit |
| Healthcare OS | Payment, Insurance, Claims |
| Retail OS | Payment, Loyalty, Credits |
| Legal OS | Invoice, Contract Payment |
| Education OS | Payment, Financial Aid |
| All 24 Industries | Full financial suite |

---

## Additional Services (92+)

RABTUL provides 92+ additional services including:
- Banking integrations
- Payment gateway connections
- Lending platform
- Insurance services
- Investment management
- Treasury services

---

*Last Updated: June 16, 2026*
