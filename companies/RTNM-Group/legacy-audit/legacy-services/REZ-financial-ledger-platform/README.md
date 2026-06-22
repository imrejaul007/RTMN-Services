# REZ-financial-ledger-platform

> Double-Entry Accounting Platform
> **Status:** Scaffold - Implementation Required

---

## Overview

REZ-financial-ledger-platform provides double-entry bookkeeping, revenue recognition (ASC 606/IFRS 15), and settlement management for the ReZ ecosystem.

## Features

- [x] Package.json configured
- [x] TypeScript configured
- [x] Render deployment configured
- [ ] Double-entry ledger
- [ ] Revenue recognition (ASC 606/IFRS 15)
- [ ] Multi-currency support
- [ ] Payout management
- [ ] Settlement reconciliation

## Accounting Principles

### Double-Entry Bookkeeping

Every transaction has:
- **Debit** entry
- **Credit** entry
- Sum of debits = Sum of credits

### Account Types

| Type | Debit | Credit |
|------|-------|--------|
| Asset | + | - |
| Liability | - | + |
| Equity | - | + |
| Revenue | - | + |
| Expense | + | - |

## API Endpoints

### Ledger

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ledger/entries` | Create entry |
| GET | `/api/v1/ledger/entries` | Query entries |
| GET | `/api/v1/ledger/balance/:accountId` | Get balance |
| GET | `/api/v1/ledger/trial-balance` | Trial balance |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/transactions` | Create transaction |
| GET | `/api/v1/transactions/:id` | Get transaction |
| GET | `/api/v1/transactions/history` | Transaction history |

### Revenue Recognition

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/revenue/recognize` | Recognize revenue |
| GET | `/api/v1/revenue/schedule/:contractId` | Get schedule |

### Settlements

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/settlements` | Create settlement |
| GET | `/api/v1/settlements/:id` | Get settlement |
| POST | `/api/v1/settlements/:id/process` | Process settlement |

## Database Schema

```typescript
// Ledger Entry (Double-Entry)
interface LedgerEntry {
  _id: ObjectId;
  transactionId: string;
  accountId: string;
  accountType: AccountType;
  debit: Decimal128;
  credit: Decimal128;
  currency: string;   // ISO 4217
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Account
interface Account {
  _id: ObjectId;
  accountId: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: Decimal128;
  isActive: boolean;
}

// Transaction
interface Transaction {
  _id: ObjectId;
  transactionId: string;
  type: TransactionType;
  entries: LedgerEntry[];
  status: 'pending' | 'posted' | 'reversed';
  postedAt?: Date;
  createdAt: Date;
}

// Revenue Contract
interface RevenueContract {
  _id: ObjectId;
  contractId: string;
  customerId: string;
  totalValue: Decimal128;
  performanceObligations: PerformanceObligation[];
  allocation: Record<string, Decimal128>;
  recognizedRevenue: Decimal128;
  status: 'active' | 'completed';
}

// Performance Obligation
interface PerformanceObligation {
  id: string;
  description: string;
  standaloneSellingPrice: Decimal128;
  satisfiedAt?: Date;
  satisfactionProgress?: number;
}
```

## Multi-Currency Support

Uses Decimal.js for precision:

```typescript
import Decimal from 'decimal.js';

const amount = new Decimal('123.45');
const converted = amount.times(exchangeRate).toDecimalPlaces(2);
```

## Revenue Recognition (ASC 606)

### Steps

1. **Identify Contract** - Agreement with customer
2. **Identify Performance Obligations** - Distinct goods/services
3. **Determine Transaction Price** - Variable consideration
4. **Allocate Price** - Based on standalone selling prices
5. **Recognize Revenue** - When performance obligations satisfied

## Environment Variables

```bash
NODE_ENV=production
PORT=4010
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
DEFAULT_CURRENCY=INR
EXCHANGE_RATE_API=xxx
```

## Setup

```bash
npm install
npm run build
npm start
```

## TODO

- [ ] Create src/index.ts
- [ ] Create ledger service
- [ ] Create account service
- [ ] Implement double-entry validation
- [ ] Add revenue recognition engine
- [ ] Implement settlement reconciliation
- [ ] Add multi-currency conversion
- [ ] Configure audit logging

---

**Last Updated:** 2026-05-13
**Status:** Scaffold Only
