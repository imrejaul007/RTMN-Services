# SafetyOS

> **Kill switches, rate limits, behavior monitoring, and containment for AI agents**

**Port:** 4862
**Package:** `@hojai/safety-os`

## Overview

SafetyOS provides "airbag for AI agents":
- **Kill Switches** — Global and per-agent safety switches
- **Rate Limiting** — Per-agent-type and per-action rate limits
- **Behavior Rules** — Pattern-based detection for spam, compliance, safety
- **Containment** — Isolate and release suspicious agents
- **Emergency Stop** — Global stop/resume for all agents

## Quick Start

```bash
cd platform/sutar-os/core/safety-os
npm install
npm run dev
# Service runs on http://localhost:4862
```

---

## API Examples

### Health Check

```bash
curl http://localhost:4862/health
```

Response:
```json
{
  "status": "ok",
  "service": "safety-os",
  "port": 4862,
  "counts": {
    "killSwitches": 3,
    "rateLimits": 12,
    "contained": 0
  }
}
```

### Create Kill Switch

```bash
curl -X POST http://localhost:4862/api/killswitches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "Block High Value Deals",
    "scope": "agent_type",
    "agentType": "negotiator",
    "action": "hard_stop",
    "reason": "Suspicious activity detected"
  }'
```

Response:
```json
{
  "id": "killswitch_abc123",
  "name": "Block High Value Deals",
  "scope": "agent_type",
  "agentType": "negotiator",
  "action": "hard_stop",
  "enabled": true,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Kill Switches

```bash
curl "http://localhost:4862/api/killswitches?enabled=true"
```

Response:
```json
{
  "count": 2,
  "killSwitches": [
    { "id": "killswitch_abc123", "name": "Block High Value Deals", "enabled": true }
  ]
}
```

### Trigger Kill Switch

```bash
curl -X POST http://localhost:4862/api/killswitches/killswitch_abc123/trigger \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"reason": "Manual trigger for investigation"}'
```

Response:
```json
{
  "id": "killswitch_abc123",
  "enabled": false,
  "triggered": true,
  "triggeredAt": "2026-06-28T12:00:00.000Z"
}
```

### Re-enable Kill Switch

```bash
curl -X POST http://localhost:4862/api/killswitches/killswitch_abc123/enable \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "killswitch_abc123",
  "enabled": true,
  "enabledAt": "2026-06-28T12:00:00.000Z"
}
```

### Create Rate Limit

```bash
curl -X POST http://localhost:4862/api/ratelimits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentType": "negotiator",
    "action": "send_message",
    "limitPerMinute": 10,
    "limitPerHour": 500
  }'
```

Response:
```json
{
  "id": "ratelimit_xyz789",
  "agentType": "negotiator",
  "action": "send_message",
  "limitPerMinute": 10,
  "limitPerHour": 500,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Check Rate Limit

```bash
curl -X POST http://localhost:4862/api/check/negotiator/send_message \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "agentType": "negotiator",
  "action": "send_message",
  "allowed": true,
  "remaining": 8,
  "resetsAt": "2026-06-28T12:01:00.000Z"
}
```

### Create Behavior Rule

```bash
curl -X POST http://localhost:4862/api/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "Block Profanity",
    "category": "content_safety",
    "pattern": "profanity_regex",
    "action": "block",
    "severity": "high"
  }'
```

Response:
```json
{
  "id": "rule_abc123",
  "name": "Block Profanity",
  "category": "content_safety",
  "action": "block",
  "enabled": true
}
```

### Contain Agent

```bash
curl -X POST http://localhost:4862/api/contain/agent_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"reason": "Suspicious behavior detected"}'
```

Response:
```json
{
  "agentId": "agent_abc123",
  "status": "contained",
  "containedAt": "2026-06-28T12:00:00.000Z",
  "reason": "Suspicious behavior detected"
}
```

### Check Containment Status

```bash
curl http://localhost:4862/api/containment/agent_abc123
```

Response:
```json
{
  "agentId": "agent_abc123",
  "status": "contained",
  "containedSince": "2026-06-28T12:00:00.000Z"
}
```

### Release Agent from Containment

```bash
curl -X POST http://localhost:4862/api/release/agent_abc123 \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "agentId": "agent_abc123",
  "status": "released",
  "releasedAt": "2026-06-28T12:00:00.000Z"
}
```

### Emergency Stop All Agents

```bash
curl -X POST http://localhost:4862/api/emergency/stop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"reason": "Security incident - all agents paused"}'
```

Response:
```json
{
  "status": "stopped",
  "reason": "Security incident - all agents paused",
  "stoppedAt": "2026-06-28T12:00:00.000Z",
  "agentsAffected": 23
}
```

### Resume from Emergency

```bash
curl -X POST http://localhost:4862/api/emergency/resume \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "status": "resumed",
  "resumedAt": "2026-06-28T12:30:00.000Z",
  "agentsResumed": 23
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 4862 | Service port |
| `NODE_ENV` | No | development | Environment |

---

**Last Updated:** 2026-06-28
