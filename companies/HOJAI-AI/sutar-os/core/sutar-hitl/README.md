# SUTAR Human-in-the-Loop (HITL)

> **Approval gates, escalation paths, delegation, and override capabilities for autonomous operations**

**Port:** 4607
**Layer:** Human-in-the-Loop
**Package:** `@hojai/sutar-hitl`

## Overview

SUTAR HITL provides:
- Approval gates for critical agent actions
- Auto-approval for low-risk, low-value actions
- Escalation paths for urgent decisions
- Delegation to other approvers
- Override capabilities with role-based access
- Comprehensive audit trail

## Quick Start

```bash
cd sutar-os/core/sutar-hitl
npm install
npm run dev
# Service runs on http://localhost:4607
```

## Features

| Feature | Status |
|---------|--------|
| Approval gates | ✅ Implemented |
| Auto-approval | ✅ Implemented |
| Escalation | ✅ Implemented |
| Delegation | ✅ Implemented |
| Override | ✅ Implemented |
| Audit trail | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4607/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-hitl",
  "port": 4607,
  "layer": "Human-in-the-Loop",
  "pendingGates": 3,
  "totalGates": 45,
  "auditEvents": 234,
  "activeDelegations": 2,
  "activeEscalations": 1,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Create Approval Gate

```bash
curl -X POST http://localhost:4607/api/gates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentId": "agent-restaurant-001",
    "action": "sign_contract",
    "description": "Sign vendor contract for vegetable supply",
    "value": 50000,
    "currency": "INR",
    "riskScore": 0.35,
    "urgency": "normal"
  }'
```

Response:
```json
{
  "gateId": "gate_abc123",
  "requestId": "req_xyz789",
  "agentId": "agent-restaurant-001",
  "action": "sign_contract",
  "description": "Sign vendor contract for vegetable supply",
  "value": 50000,
  "currency": "INR",
  "riskScore": 0.35,
  "status": "pending",
  "priority": "medium",
  "approvers": ["default_approver"],
  "currentApprover": "default_approver",
  "deadline": "2026-06-29T12:00:00.000Z",
  "slaHours": 24,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Pending Gates

```bash
curl "http://localhost:4607/api/gates?status=pending&priority=high"
```

Response:
```json
{
  "total": 3,
  "returned": 3,
  "gates": [
    {
      "gateId": "gate_abc123",
      "action": "sign_contract",
      "status": "pending",
      "priority": "medium",
      "value": 50000,
      "currentApprover": "default_approver"
    }
  ]
}
```

### Get Gate Details

```bash
curl http://localhost:4607/api/gates/gate_abc123
```

Response:
```json
{
  "gateId": "gate_abc123",
  "agentId": "agent-restaurant-001",
  "action": "sign_contract",
  "description": "Sign vendor contract for vegetable supply",
  "value": 50000,
  "riskScore": 0.35,
  "status": "pending",
  "priority": "medium",
  "approvers": ["default_approver"],
  "currentApprover": "default_approver",
  "deadline": "2026-06-29T12:00:00.000Z",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Approve Gate

```bash
curl -X POST http://localhost:4607/api/gates/gate_abc123/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "approverId": "manager@restaurant.com",
    "notes": "Approved after vendor verification"
  }'
```

Response:
```json
{
  "gateId": "gate_abc123",
  "status": "approved",
  "approvedAt": "2026-06-28T12:30:00.000Z",
  "decidedBy": "manager@restaurant.com",
  "decisionNotes": "Approved after vendor verification"
}
```

### Reject Gate

```bash
curl -X POST http://localhost:4607/api/gates/gate_abc123/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "approverId": "manager@restaurant.com",
    "reason": "vendor_verification_failed",
    "notes": "Vendor KYC not complete"
  }'
```

Response:
```json
{
  "gateId": "gate_abc123",
  "status": "rejected",
  "rejectedAt": "2026-06-28T12:30:00.000Z",
  "decidedBy": "manager@restaurant.com",
  "decisionNotes": "Vendor KYC not complete",
  "rejectionReason": "vendor_verification_failed"
}
```

### Escalate Gate

```bash
curl -X POST http://localhost:4607/api/gates/gate_abc123/escalate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "escalatorId": "default_approver",
    "reason": "urgent_timeline",
    "escalateTo": "senior_manager"
  }'
```

Response:
```json
{
  "gate": {
    "gateId": "gate_abc123",
    "status": "escalated",
    "escalatedTo": "senior_manager"
  },
  "escalation": {
    "escalationId": "esc_xyz789",
    "gateId": "gate_abc123",
    "reason": "urgent_timeline",
    "escalatedTo": "senior_manager",
    "slaHours": 4,
    "status": "active"
  }
}
```

### Delegate Gate

```bash
curl -X POST http://localhost:4607/api/gates/gate_abc123/delegate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "toApprover": "colleague@restaurant.com",
    "reason": "on_leave"
  }'
```

Response:
```json
{
  "gate": {
    "gateId": "gate_abc123",
    "currentApprover": "colleague@restaurant.com"
  },
  "delegation": {
    "delegationId": "del_xyz789",
    "gateId": "gate_abc123",
    "fromApprover": "default_approver",
    "toApprover": "colleague@restaurant.com",
    "reason": "on_leave",
    "active": true
  }
}
```

### Override Gate (Admin Only)

```bash
curl -X POST http://localhost:4607/api/gates/gate_abc123/override \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "overrideBy": "admin@sutar.ai",
    "role": "admin",
    "decision": "approved",
    "reason": "business_emergency"
  }'
```

Response:
```json
{
  "gateId": "gate_abc123",
  "status": "approved",
  "approvedAt": "2026-06-28T12:30:00.000Z",
  "decidedBy": "admin@sutar.ai",
  "decisionNotes": "business_emergency",
  "overridden": true,
  "originalStatus": "rejected"
}
```

### Get Audit Trail

```bash
curl "http://localhost:4607/api/audit?actorType=human&limit=10"
```

Response:
```json
{
  "total": 234,
  "returned": 10,
  "events": [
    {
      "id": "audit_xyz789",
      "timestamp": "2026-06-28T12:30:00.000Z",
      "actor": "manager@restaurant.com",
      "actorType": "human",
      "action": "gate_approved",
      "resource": "hitl_gate",
      "resourceId": "gate_abc123",
      "outcome": "success",
      "metadata": {
        "value": 50000,
        "action": "sign_contract"
      }
    }
  ]
}
```

### Create Delegation

```bash
curl -X POST http://localhost:4607/api/delegations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "fromApprover": "manager@restaurant.com",
    "toApprover": "colleague@restaurant.com",
    "reason": "vacation",
    "scope": "all"
  }'
```

Response:
```json
{
  "delegationId": "del_abc123",
  "fromApprover": "manager@restaurant.com",
  "toApprover": "colleague@restaurant.com",
  "reason": "vacation",
  "scope": "all",
  "active": true,
  "createdAt": "2026-06-28T12:00:00.000Z",
  "expiresAt": "2026-07-05T12:00:00.000Z"
}
```

### List Active Escalations

```bash
curl "http://localhost:4607/api/escalations?status=active"
```

Response:
```json
{
  "total": 1,
  "escalations": [
    {
      "escalationId": "esc_xyz789",
      "gateId": "gate_abc123",
      "reason": "urgent_timeline",
      "escalatedTo": "senior_manager",
      "slaHours": 4,
      "status": "active"
    }
  ]
}
```

---

## Auto-Approval Thresholds

| Threshold | Value | Description |
|-----------|-------|-------------|
| `value_usd` | < $1,000 | Auto-approve deals under $1K |
| `risk_score` | < 0.2 | Auto-approve low-risk actions |
| `data_access_level` | `internal` | Auto-approve internal data only |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HITL_PORT` | 4607 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (security)

---

**Last Updated:** 2026-06-28
