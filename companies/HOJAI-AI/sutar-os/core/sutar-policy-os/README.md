# SUTAR Policy OS

> **Business policy registry and enforcement for autonomous agents**

**Port:** 4254
**Layer:** 5 (Marketplace + Economy)
**Package:** `@hojai/sutar-policy-os`

## Overview

SUTAR Policy OS provides:
- Policy creation and versioning
- Policy evaluation against context
- Condition-based rule matching
- Quick policy compliance checks

## Quick Start

```bash
cd sutar-os/core/sutar-policy-os
npm install
npm run dev
# Service runs on http://localhost:4254
```

## Features

| Feature | Status |
|---------|--------|
| Policy creation | ✅ Implemented |
| Policy evaluation | ✅ Implemented |
| Condition matching | ✅ Implemented |
| Scope filtering | ✅ Implemented |
| Categories | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4254/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-policy-os",
  "port": 4254,
  "layer": "Marketplace + Economy",
  "policies": 8,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Create Policy

```bash
curl -X POST http://localhost:4254/api/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "High Value Deal Approval",
    "description": "Require approval for deals over 50000",
    "category": "financial",
    "priority": "high",
    "rules": [
      {
        "type": "value_limit",
        "value": 50000,
        "action": "require_approval"
      }
    ],
    "conditions": [
      {
        "field": "deal.value",
        "operator": "gt",
        "value": 50000
      }
    ],
    "scope": {
      "agents": ["*"],
      "tenants": ["*"]
    }
  }'
```

Response:
```json
{
  "id": "policy_abc123",
  "name": "High Value Deal Approval",
  "description": "Require approval for deals over 50000",
  "category": "financial",
  "priority": "high",
  "status": "active",
  "rules": [...],
  "conditions": [...],
  "version": 1,
  "createdAt": "2026-06-28T12:00:00.000Z",
  "updatedAt": "2026-06-28T12:00:00.000Z"
}
```

### List Policies

```bash
curl "http://localhost:4254/api/policies?category=financial&status=active"
```

Response:
```json
{
  "total": 8,
  "returned": 3,
  "policies": [
    {
      "id": "policy_abc123",
      "name": "High Value Deal Approval",
      "category": "financial",
      "priority": "high",
      "status": "active"
    }
  ]
}
```

### Get Policy

```bash
curl http://localhost:4254/api/policies/policy_abc123
```

Response:
```json
{
  "id": "policy_abc123",
  "name": "High Value Deal Approval",
  "category": "financial",
  "priority": "high",
  "status": "active",
  "rules": [...],
  "conditions": [...],
  "version": 1
}
```

### Update Policy

```bash
curl -X PUT http://localhost:4254/api/policies/policy_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "description": "Updated: require approval for deals over 100000",
    "rules": [
      {
        "type": "value_limit",
        "value": 100000,
        "action": "require_approval"
      }
    ]
  }'
```

Response:
```json
{
  "id": "policy_abc123",
  "name": "High Value Deal Approval",
  "version": 2,
  "updatedAt": "2026-06-28T12:30:00.000Z"
}
```

### Evaluate Policy

```bash
curl -X POST http://localhost:4254/api/policies/policy_abc123/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "deal": {
      "value": 75000,
      "type": "supply"
    },
    "agentId": "agent-001",
    "tenantId": "tenant-001"
  }'
```

Response:
```json
{
  "policyId": "policy_abc123",
  "result": "require_approval",
  "reason": "Value exceeds policy limit"
}
```

### Quick Policy Check

```bash
curl "http://localhost:4254/api/policies/check?agentId=agent-001&tenantId=tenant-001&deal.value=75000" \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "context": {
    "agentId": "agent-001",
    "tenantId": "tenant-001",
    "deal.value": 75000
  },
  "finalResult": "require_approval",
  "policiesChecked": 3,
  "denied": 1,
  "requiresApproval": 1,
  "results": [
    { "policyId": "policy_abc123", "result": "require_approval" }
  ]
}
```

### List Policy Categories

```bash
curl http://localhost:4254/api/categories
```

Response:
```json
{
  "categories": [
    { "id": "negotiation", "name": "Negotiation Policies" },
    { "id": "contract", "name": "Contract Policies" },
    { "id": "financial", "name": "Financial Policies" },
    { "id": "compliance", "name": "Compliance Policies" },
    { "id": "security", "name": "Security Policies" },
    { "id": "operational", "name": "Operational Policies" }
  ]
}
```

---

## Condition Operators

| Operator | Description |
|----------|-------------|
| `eq` | Equal to |
| `ne` | Not equal to |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `in` | Value in array |
| `contains` | String contains |
| `required` | Field is required |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POLICY_PORT` | 4254 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (security)

---

**Last Updated:** 2026-06-28
