# REZ BNPL Service - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Finance

---

## Overview

Buy Now Pay Later (BNPL) service enabling customers to purchase products and pay in installments. Supports multiple tenure options, interest calculations, and payment scheduling.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REZ BNPL Service                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── BNPL Calculator   → Interest and tenure calculations                 │
│  ├── Payment Scheduler → Installment tracking                             │
│  ├── Credit Evaluator  → Customer credit assessment                       │
│  └── Reconciliation   → Payment matching                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### BNPLPlan
```typescript
{
  planId: string
  userId: string
  orderId: string
  totalAmount: number
  tenure: number
  interestRate: number
  emiAmount: number
  installments: Installment[]
  status: 'active' | 'completed' | 'defaulted'
  createdAt: Date
}
```

### Installment
```typescript
{
  installmentId: string
  planId: string
  amount: number
  dueDate: Date
  paidAt?: Date
  status: 'pending' | 'paid' | 'overdue'
}
```

---

## API Endpoints

### BNPL
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/plans/calculate` | Calculate BNPL plan |
| POST | `/plans` | Create BNPL plan |
| GET | `/plans/:id` | Get plan details |
| GET | `/plans/user/:userId` | User's plans |
| POST | `/plans/:id/pay` | Make payment |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "zod": "^3.22.0",
  "bullmq": "^5.0.0",
  "ioredis": "^5.3.0"
}
```

---

## Status

- [x] Plan creation
- [x] EMI calculation
- [x] Payment scheduling
- [x] Installment tracking

