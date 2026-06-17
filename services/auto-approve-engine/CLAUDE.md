# Auto-Approve Engine

**Port:** 4982  
**Status:** Service Created  
**Purpose:** Policy-based auto-approval with trust scores, VIP tiers, and manager escalation

---

## Overview

The Auto-Approve Engine is a policy-driven approval system that automatically evaluates and processes approval requests based on customer trust scores, VIP tiers, and configurable business rules.

## Features

- **Trust Score Integration** - Fetches customer trust scores from TwinOS Hub (port 4705)
- **VIP Tier System** - Diamond, Platinum, Gold, Silver, Bronze, None
- **Policy-Based Approvals** - Configurable rules engine with priority-based evaluation
- **Manager Escalation** - Automatic escalation based on amount, trust score, or VIP tier
- **Audit Trail** - Complete logging of all approval decisions
- **Customer Ops Bridge** - Integration with customer operations services

---

## API Endpoints

### Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/approvals/request` | Create new approval request |
| GET | `/api/approvals/:id` | Get approval by ID |
| GET | `/api/approvals/applicant/:applicantId` | Get approvals by applicant |
| GET | `/api/approvals` | List approvals (with filters) |
| PATCH | `/api/approvals/:id/status` | Update approval status |
| POST | `/api/approvals/:id/escalate` | Escalate to manager |
| POST | `/api/approvals/:id/cancel` | Cancel approval request |
| GET | `/api/approvals/stats/summary` | Get approval statistics |

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules` | List all rules |
| GET | `/api/rules/:id` | Get rule by ID |
| GET | `/api/rules/type/:requestType` | Get rules by request type |
| POST | `/api/rules` | Create new rule |
| PUT | `/api/rules/:id` | Update rule |
| PATCH | `/api/rules/:id/toggle` | Toggle rule active status |
| DELETE | `/api/rules/:id` | Delete rule |
| POST | `/api/rules/reset` | Reset to default rules |
| PATCH | `/api/rules/reorder` | Reorder rule priorities |
| POST | `/api/rules/test` | Test rule evaluation |

---

## Request Types

- `TRANSACTION` - Payment/transaction approval
- `REFUND` - Refund request
- `CREDIT_INCREASE` - Credit limit increase
- `ACCOUNT_UPGRADE` - Account tier upgrade
- `LOAN_APPLICATION` - Loan request
- `PAYMENT_PLAN` - Payment plan setup
- `SERVICE_ACCESS` - Service access request

---

## Approval Statuses

- `PENDING` - Awaiting evaluation
- `APPROVED` - Approved (auto or manual)
- `REJECTED` - Rejected (auto or manual)
- `ESCALATED` - Escalated to manager
- `CANCELLED` - Cancelled by request

## Decisions

- `AUTO_APPROVED` - Automatically approved
- `AUTO_REJECTED` - Automatically rejected
- `MANUAL_REVIEW` - Requires manual review
- `ESCALATED` - Escalated for manager review

---

## VIP Tier Benefits

| Tier | Trust Score | Auto-Approve Limit | Refund Limit | Dedicated Manager |
|------|-------------|-------------------|--------------|-------------------|
| Diamond | 95+ | 1,000,000 | 500,000 | Yes |
| Platinum | 85+ | 500,000 | 250,000 | No |
| Gold | 70+ | 100,000 | 50,000 | No |
| Silver | 50+ | 50,000 | 10,000 | No |
| Bronze | 30+ | 10,000 | 5,000 | No |
| None | <30 | 0 | 0 | No |

---

## Escalation Matrix

| Condition | Escalates To |
|-----------|--------------|
| Amount > 1,000,000 | Director |
| Amount > 500,000 | VP |
| Amount > 100,000 | Senior Manager |
| Trust Score < 20 | Compliance Officer |
| Trust Score < 40 | Risk Manager |
| VIP Diamond | Senior Manager |
| VIP Platinum | Account Manager |

---

## Example Request

```bash
curl -X POST http://localhost:4982/api/approvals/request \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "REQ-12345",
    "requestType": "TRANSACTION",
    "entityId": "TXN-67890",
    "entityType": "transaction",
    "applicantId": "CUST-001",
    "applicantName": "John Doe",
    "amount": 50000,
    "metadata": {
      "merchantId": "MERCH-001",
      "category": "electronics"
    }
  }'
```

## Example Response

```json
{
  "record": {
    "id": "uuid-123",
    "requestId": "REQ-12345",
    "requestType": "TRANSACTION",
    "status": "APPROVED",
    "decision": "AUTO_APPROVED",
    "trustScore": 85,
    "vipTier": "PLATINUM"
  },
  "decision": "AUTO_APPROVED",
  "autoApprove": true,
  "requiresManualReview": false
}
```

---

## Dependencies

- TwinOS Hub (port 4705) - Trust score data
- Customer Ops Bridge (port 3016) - Customer operations
- Event Bus (port 4510) - Event publishing

---

## Environment Variables

```
PORT=4982
TRUST_SCORE_SERVICE_URL=http://localhost:4705
CUSTOMER_OPS_URL=http://localhost:3016
MANAGER_SERVICE_URL=http://localhost:4703
EVENT_BUS_URL=http://localhost:4510
LOG_LEVEL=info
```
