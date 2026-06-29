# CrisisOS

> **Incident management, war rooms, playbooks, and disaster recovery for SUTAR OS**

**Port:** 4863
**Package:** `@hojai/crisis-os`

## Overview

CrisisOS provides PagerDuty-like capabilities for AI agents:
- **Incidents** — Create, track, escalate, and resolve incidents with severity levels
- **Playbooks** — Automated response playbooks triggered by category/severity
- **War Rooms** — Real-time collaboration spaces during incidents
- **Backups** — Backup configuration and trigger management
- **Stats** — Incident analytics and resolution times

## Quick Start

```bash
cd platform/sutar-os/core/crisis-os
npm install
npm run dev
# Service runs on http://localhost:4863
```

---

## API Examples

### Health Check

```bash
curl http://localhost:4863/health
```

Response:
```json
{
  "status": "ok",
  "service": "crisis-os",
  "port": 4863,
  "uptime": 86400,
  "counts": {
    "incidents": 5,
    "playbooks": 12,
    "warRooms": 1
  }
}
```

### Create Incident

```bash
curl -X POST http://localhost:4863/api/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "title": "Agent Negotiation Failure",
    "description": "Negotiator agent repeatedly failing to reach agreements",
    "severity": "high",
    "category": "agent_behavior",
    "affectedAgents": ["agent_negotiator_001"],
    "assignee": "ops_team"
  }'
```

Response:
```json
{
  "id": "incident_abc123",
  "title": "Agent Negotiation Failure",
  "severity": "high",
  "status": "investigating",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Incidents

```bash
curl "http://localhost:4863/api/incidents?status=active&severity=high"
```

Response:
```json
{
  "count": 3,
  "incidents": [
    { "id": "incident_abc123", "title": "Agent Negotiation Failure", "severity": "high", "status": "investigating" }
  ]
}
```

### Update Incident

```bash
curl -X PATCH http://localhost:4863/api/incidents/incident_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"status": "identified", "assignee": "sre_team"}'
```

Response:
```json
{
  "id": "incident_abc123",
  "status": "identified",
  "assignee": "sre_team",
  "updatedAt": "2026-06-28T12:00:00.000Z"
}
```

### Add Timeline Entry

```bash
curl -X POST http://localhost:4863/api/incidents/incident_abc123/timeline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"note": "Identified root cause: incorrect BATNA configuration"}'
```

Response:
```json
{
  "entryId": "timeline_xyz789",
  "timestamp": "2026-06-28T12:00:00.000Z",
  "note": "Identified root cause: incorrect BATNA configuration"
}
```

### Escalate Incident

```bash
curl -X POST http://localhost:4863/api/incidents/incident_abc123/escalate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"reason": "Root cause requires agent retraining"}'
```

Response:
```json
{
  "id": "incident_abc123",
  "severity": "critical",
  "escalated": true,
  "escalatedAt": "2026-06-28T12:00:00.000Z"
}
```

### Execute Playbook

```bash
curl -X POST http://localhost:4863/api/playbooks/playbook_abc123/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"incidentId": "incident_abc123"}'
```

Response:
```json
{
  "playbookId": "playbook_abc123",
  "executionId": "exec_xyz789",
  "status": "running",
  "startedAt": "2026-06-28T12:00:00.000Z"
}
```

### Create War Room

```bash
curl -X POST http://localhost:4863/api/war-rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "incidentId": "incident_abc123",
    "name": "War Room - Negotiation Failure",
    "participants": ["ops_team", "sre_team", "ml_team"]
  }'
```

Response:
```json
{
  "id": "warroom_abc123",
  "incidentId": "incident_abc123",
  "name": "War Room - Negotiation Failure",
  "status": "active",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Join War Room

```bash
curl -X POST http://localhost:4863/api/war-rooms/warroom_abc123/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"participant": "security_team"}'
```

Response:
```json
{
  "warRoomId": "warroom_abc123",
  "participant": "security_team",
  "joinedAt": "2026-06-28T12:00:00.000Z"
}
```

### Trigger Backup

```bash
curl -X POST http://localhost:4863/api/backups/backup_abc123/trigger \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "backupId": "backup_abc123",
  "status": "in_progress",
  "startedAt": "2026-06-28T12:00:00.000Z"
}
```

### Get Incident Stats

```bash
curl http://localhost:4863/api/stats
```

Response:
```json
{
  "totalIncidents": 45,
  "activeIncidents": 5,
  "avgResolutionTime": 14400,
  "bySeverity": {
    "critical": 3,
    "high": 12,
    "medium": 20,
    "low": 10
  },
  "playbookExecutions": 23,
  "playbookSuccessRate": 0.87
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 4863 | Service port |
| `NODE_ENV` | No | development | Environment |

---

**Last Updated:** 2026-06-28
