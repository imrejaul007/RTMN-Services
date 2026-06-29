# ConstitutionalOS

> **Mission, Values, Ethics, Red Lines, and Authority Boundaries for the SUTAR OS autonomous agent framework**

**Port:** 4855
**Package:** `@hojai/constitutional-os`

## Overview

ConstitutionalOS defines the "why and when NOT to act" for autonomous agents:
- **Missions** — Organizational mission statements with priority and source tracking
- **Values** — Core values ranked by weight for decision-making
- **Red Lines** — Hard stops, warnings, and approval-required rules
- **Authority** — Per-agent-type permission scopes and value limits
- **Escalation Paths** — Multi-level escalation procedures
- **Principles** — Decision-making principles with do/don't examples

## Quick Start

```bash
cd platform/sutar-os/core/constitutional-os
npm install
npm run dev
# Service runs on http://localhost:4855
```

---

## API Examples

### Health Check

```bash
curl http://localhost:4855/health
```

Response:
```json
{
  "status": "ok",
  "service": "constitutional-os",
  "port": 4855,
  "counts": {
    "missions": 3,
    "values": 5,
    "redLines": 8,
    "principles": 4,
    "logs": 156
  }
}
```

### Create Mission

```bash
curl -X POST http://localhost:4855/api/missions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "title": "Democratize AI for SMBs",
    "description": "Make enterprise-grade AI accessible to small and medium businesses",
    "priority": 1,
    "source": "founder_board",
    "active": true
  }'
```

Response:
```json
{
  "id": "mission_abc123",
  "title": "Democratize AI for SMBs",
  "description": "Make enterprise-grade AI accessible to small and medium businesses",
  "priority": 1,
  "source": "founder_board",
  "active": true,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Missions

```bash
curl http://localhost:4855/api/missions
```

Response:
```json
{
  "count": 3,
  "missions": [
    { "id": "mission_abc123", "title": "Democratize AI for SMBs", "priority": 1, "active": true }
  ]
}
```

### Create Value

```bash
curl -X POST http://localhost:4855/api/values \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "Customer First",
    "description": "Always prioritize customer needs over short-term revenue",
    "weight": 0.9
  }'
```

Response:
```json
{
  "id": "value_xyz789",
  "name": "Customer First",
  "description": "Always prioritize customer needs over short-term revenue",
  "weight": 0.9,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Values

```bash
curl http://localhost:4855/api/values
```

Response:
```json
{
  "count": 5,
  "values": [
    { "id": "value_xyz789", "name": "Customer First", "weight": 0.9 },
    { "id": "value_def456", "name": "Transparency", "weight": 0.8 }
  ]
}
```

### Create Red Line

```bash
curl -X POST http://localhost:4855/api/red-lines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "description": "Never share customer PII without explicit consent",
    "severity": "critical",
    "category": "privacy",
    "action": "deny"
  }'
```

Response:
```json
{
  "id": "redline_abc123",
  "description": "Never share customer PII without explicit consent",
  "severity": "critical",
  "category": "privacy",
  "action": "deny",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Check Action Against Red Lines

```bash
curl -X POST http://localhost:4855/api/check/data_share \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"context": {"customerId": "cust_123", "purpose": "marketing"}}'
```

Response:
```json
{
  "actionType": "data_share",
  "violated": true,
  "redLines": [
    { "id": "redline_abc123", "description": "Never share customer PII without explicit consent", "action": "deny" }
  ]
}
```

### Set Agent Authority

```bash
curl -X POST http://localhost:4855/api/authority \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentType": "negotiator",
    "maxDealValue": 50000,
    "maxDiscountPercent": 15,
    "requiresApprovalAbove": 25000
  }'
```

Response:
```json
{
  "id": "auth_xyz789",
  "agentType": "negotiator",
  "maxDealValue": 50000,
  "maxDiscountPercent": 15,
  "requiresApprovalAbove": 25000
}
```

### Get Authority for Agent Type

```bash
curl http://localhost:4855/api/authority/negotiator
```

Response:
```json
{
  "agentType": "negotiator",
  "maxDealValue": 50000,
  "maxDiscountPercent": 15,
  "requiresApprovalAbove": 25000
}
```

### Trigger Escalation

```bash
curl -X POST http://localhost:4855/api/escalations/high_value_deal/escalate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"reason": "Deal exceeds authority limit", "agentId": "agent_001"}'
```

Response:
```json
{
  "scenario": "high_value_deal",
  "escalated": true,
  "escalationPath": ["agent", "manager", "director"],
  "currentLevel": "manager"
}
```

### Agent Authorization Check

```bash
curl -X POST http://localhost:4855/api/agent/negotiator/authorize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"action": "close_deal", "value": 30000}'
```

Response:
```json
{
  "agentType": "negotiator",
  "action": "close_deal",
  "value": 30000,
  "authorized": true,
  "requiresApproval": true,
  "approver": "manager"
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 4855 | Service port |
| `NODE_ENV` | No | development | Environment |

---

**Last Updated:** 2026-06-28
