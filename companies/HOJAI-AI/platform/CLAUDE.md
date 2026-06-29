# HOJAI Platform Complete

> Auto-generated docs. Last updated: June 29, 2026

## What's Built

| Component | Path | Status |
|-----------|------|--------|
| Flow Runtime | `runtime/flow-runtime/` | ✅ |
| Agent Runtime | `runtime/agent-runtime/` | ✅ |
| Auth Service | `services/auth-service/` | ✅ |
| Webhook Server | `services/webhook-server/` | ✅ |
| WebSocket Server | `services/websocket-server/` | ✅ |
| Cron Scheduler | `services/cron-scheduler/` | ✅ |
| Slack Connector | `integrations/slack/` | ✅ |
| CRM Connector | `integrations/crm-connector/` | ✅ |
| Email Connector | `integrations/email-connector/` | ✅ |
| Calendar Connector | `integrations/calendar-connector/` | ✅ |
| Agent Studio UI | `studio/hojai-studio/` | ✅ |
| Knowledge Studio | `studio/knowledge-studio/` | ✅ |
| Analytics | `studio/analytics/` | ✅ |
| Docker Compose | `docker/docker-compose.yml` | ✅ |
| Tests | `tests/` | ✅ |

## Quick Start

```bash
# Start all services
cd docker && docker-compose up -d

# Or individual services
cd services/auth-service && node src/index.js
cd services/webhook-server && node src/index.js
```

## Environment Variables

```
DATABASE_URL=postgresql://hojai:password@localhost:5432/hojai
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

## Ports

| Service | Port |
|---------|------|
| Auth | 4000 |
| Webhook | 4002 |
| WebSocket | 4001 |
| Flow Runtime | 4003 |
| Agent Runtime | 4004 |
| BAM | 4400 |
| Studio | 3001 |

## API Docs

See individual service README files.
