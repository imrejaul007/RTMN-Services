# REZ Capital Service - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Finance

---

## Overview

Restaurant lending backend service providing capital access to merchants. Handles loan applications, credit assessment, disbursement, and repayment tracking.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REZ Capital Service                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Loan Processor   → Application handling                              │
│  ├── Credit Assessor  → Merchant credit scoring                            │
│  ├── Disbursement     → Fund transfer management                          │
│  └── Repayment Track  → EMI and schedule tracking                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Loan
```typescript
{
  loanId: string
  merchantId: string
  amount: number
  tenure: number
  interestRate: number
  purpose: string
  status: 'pending' | 'approved' | 'disbursed' | 'rejected' | 'closed'
  disbursedAt?: Date
  createdAt: Date
}
```

### Repayment
```typescript
{
  repaymentId: string
  loanId: string
  amount: number
  dueDate: Date
  paidAt?: Date
  status: 'pending' | 'paid' | 'overdue'
}
```

---

## API Endpoints

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/loans/apply` | Apply for loan |
| GET | `/loans/:id` | Get loan details |
| GET | `/loans/merchant/:merchantId` | Merchant loans |
| POST | `/loans/:id/approve` | Approve loan |
| POST | `/loans/:id/disburse` | Disburse funds |

### Repayments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/repayments/loan/:loanId` | Loan repayments |
| POST | `/repayments` | Make repayment |

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
  "axios": "^1.7.0",
  "dotenv": "^16.3.1",
  "jsonwebtoken": "^9.0.2",
  "express-validator": "^7.0.1",
  "winston": "^3.11.0"
}
```

---

## Status

- [x] Loan applications
- [x] Credit assessment
- [x] Disbursement
- [x] Repayment tracking

