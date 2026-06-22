# REZ Financial Ledger Platform - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Finance

---

## Overview

Enterprise-grade financial ledger platform with double-entry accounting, revenue recognition, payouts, settlements, and reconciliation. Provides immutable financial records with full audit capability.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 REZ Financial Ledger Platform                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Ledger Engine    → Double-entry bookkeeping                          │
│  ├── Account Manager  → Chart of accounts                                 │
│  ├── Transaction Log  → Immutable journal entries                         │
│  ├── Reconciliation   → Auto-matching and adjustments                     │
│  └── Revenue Recognition → ASC 606 / IFRS 15 compliance                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Account
```typescript
{
  accountId: string
  accountNumber: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  subtype: string
  balance: number
  currency: string
  isActive: boolean
}
```

### JournalEntry
```typescript
{
  entryId: string
  transactionId: string
  date: Date
  description: string
  entries: {
    accountId: string
    debit: number
    credit: number
  }[]
  postedBy: string
  createdAt: Date
}
```

### Settlement
```typescript
{
  settlementId: string
  parties: string[]
  totalAmount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  entries: string[]
  completedAt?: Date
}
```

---

## API Endpoints

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/accounts` | Create account |
| GET | `/accounts` | List accounts |
| GET | `/accounts/:id` | Account details |
| GET | `/accounts/:id/balance` | Current balance |

### Journal
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/journal` | Create entry |
| GET | `/journal/:id` | Get entry |
| POST | `/journal/post` | Post to ledger |

### Settlements
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/settlements` | Create settlement |
| GET | `/settlements/:id` | Settlement details |
| POST | `/settlements/:id/process` | Process settlement |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/trial-balance` | Trial balance |
| GET | `/reports/income` | Income statement |
| GET | `/reports/balance-sheet` | Balance sheet |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "decimal.js": "^10.4.3",
  "typescript": "^5.3.3",
  "uuid": "^9.0.1",
  "zod": "^3.22.4"
}
```

---

## Status

- [x] Double-entry accounting
- [x] Revenue recognition
- [x] Payout processing
- [x] Settlements
- [x] Reconciliation
- [x] Financial reporting

