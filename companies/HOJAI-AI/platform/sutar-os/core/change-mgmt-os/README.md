# ChangeMgmtOS

> **Change requests, approvals, rollout tracking, and rollback management for SUTAR OS deployments**

**Port:** 4864
**Package:** `@hojai/change-mgmt-os`

## Overview

ChangeMgmtOS provides GitHub PR-like capabilities for AI agent changes:
- **Change Lifecycle** — Draft → Submit → Approve → Test → Roll Out → Complete
- **Templates** — Pre-built change templates (Feature Release, Hotfix, Security Patch)
- **Phases** — Multi-phase rollout with progress tracking
- **Rollback** — One-click rollback with metrics tracking
- **Audit Logs** — Complete audit trail of all change actions

## Quick Start

```bash
cd platform/sutar-os/core/change-mgmt-os
npm install
npm run dev
# Service runs on http://localhost:4864
```

---

## API Examples

### Health Check

```bash
curl http://localhost:4864/health
```

Response:
```json
{
  "status": "ok",
  "service": "change-mgmt-os",
  "port": 4864,
  "counts": {
    "changes": 15,
    "pending": 3
  }
}
```

### Create Change

```bash
curl -X POST http://localhost:4864/api/changes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "title": "Update Negotiation BATNA Logic",
    "description": "Improve BATNA calculation for high-value deals",
    "type": "feature",
    "priority": "high",
    "owner": "ml_team",
    "phases": ["test", "staging", "production"]
  }'
```

Response:
```json
{
  "id": "change_abc123",
  "title": "Update Negotiation BATNA Logic",
  "status": "draft",
  "priority": "high",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Changes

```bash
curl "http://localhost:4864/api/changes?status=pending&priority=high"
```

Response:
```json
{
  "count": 3,
  "changes": [
    { "id": "change_abc123", "title": "Update Negotiation BATNA Logic", "status": "draft", "priority": "high" }
  ]
}
```

### Submit Change for Approval

```bash
curl -X POST http://localhost:4864/api/changes/change_abc123/submit \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "change_abc123",
  "status": "pending_approval",
  "submittedAt": "2026-06-28T12:00:00.000Z"
}
```

### Approve Change

```bash
curl -X POST http://localhost:4864/api/changes/change_abc123/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"approver": "engineering_manager", "notes": "LGTM"}'
```

Response:
```json
{
  "id": "change_abc123",
  "status": "approved",
  "approvedBy": "engineering_manager",
  "approvedAt": "2026-06-28T12:00:00.000Z"
}
```

### Start Rollout

```bash
curl -X POST http://localhost:4864/api/changes/change_abc123/start \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "change_abc123",
  "status": "rolling_out",
  "currentPhase": "test",
  "startedAt": "2026-06-28T12:00:00.000Z"
}
```

### Complete Phase

```bash
curl -X POST http://localhost:4864/api/changes/change_abc123/phases/test/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"metrics": {"errorRate": 0.01, "latency": 120}}'
```

Response:
```json
{
  "changeId": "change_abc123",
  "phase": "test",
  "status": "completed",
  "completedAt": "2026-06-28T12:30:00.000Z"
}
```

### Complete Change

```bash
curl -X POST http://localhost:4864/api/changes/change_abc123/complete \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "change_abc123",
  "status": "completed",
  "completedAt": "2026-06-28T14:00:00.000Z"
}
```

### Trigger Rollback

```bash
curl -X POST http://localhost:4864/api/changes/change_abc123/rollback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"reason": "Unexpected error rate spike in production"}'
```

Response:
```json
{
  "id": "change_abc123",
  "status": "rolled_back",
  "rollbackReason": "Unexpected error rate spike in production",
  "rolledBackAt": "2026-06-28T14:30:00.000Z"
}
```

### Get Change Statistics

```bash
curl http://localhost:4864/api/stats
```

Response:
```json
{
  "totalChanges": 45,
  "completed": 38,
  "rolledBack": 3,
  "avgCompletionTime": 86400,
  "byPriority": {
    "critical": 5,
    "high": 15,
    "medium": 20,
    "low": 5
  },
  "byType": {
    "feature": 25,
    "hotfix": 12,
    "security": 8
  }
}
```

---

## Change Lifecycle

```
draft → pending_approval → approved → rolling_out → completed
                         ↘ rejected   ↘           ↘ rolled_back
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 4864 | Service port |
| `NODE_ENV` | No | development | Environment |

---

**Last Updated:** 2026-06-28
