# HOJAI Platform

> AI Workforce Platform - Build agents, workflows, integrations in minutes.

## Quick Start

```bash
cd docker && docker-compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | REST API |
| Auth Service | 4000 | JWT + RBAC |
| Webhook Server | 4002 | External triggers |
| WebSocket | 4001 | Real-time |
| BAM | 4400 | Marketplace |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    HOJAI Platform                    │
├─────────────────────────────────────────────────┤
│  Agent Runtime   │  Flow Runtime   │  Webhook Server │
│  Slack          │  CRM          │  Email        │
│  Calendar       │  Calendar     │  Knowledge    │
│  Analytics      │  Auth         │  Notifications│
└─────────────────────────────────────────────────┘
         │            │              │
         ▼            ▼              ▼
    ┌────────┐  ┌──────────┐  ┌──────────┐
    │ Studio │  │  Studio  │  │  BAM     │
    │  UI   │  │  Visual  │  │ Marketplace│
    └────────┘  │ Builder  │  └──────────┘
                  └──────────┘
```

## Agents

### Built-in Agents

| Agent | Description |
|--------|-------------|
| SDR Agent | Lead qualification |
| Support Agent | Ticket handling |
| Finance Agent | Invoice processing |
| Marketing Agent | Content creation |
| HR Agent | Recruitment |
| Brief Agent | Executive reports |

### Agent Capabilities

```typescript
agent.instructions = 'You are an expert SDR...';
agent.tools = ['crm', 'email', 'calendar'];
agent.llm = { provider: 'anthropic', model: 'claude-3-5-sonnet' };
```

## Workflows

Pre-built templates: 100+.

```typescript
flow.trigger = { type: 'webhook' };
flow.nodes = [trigger, agent, condition, action, notification];
```

## Integrations

| Integration | Status |
|-------------|--------|
| Slack | ✅ Messages, channels, DMs |
| CRM (HubSpot) | ✅ Contacts, deals, pipelines |
| Email (SendGrid) | ✅ Templates, batch send |
| Calendar (Google) | ✅ Events, availability |

## Database

PostgreSQL with Drizzle ORM.

```typescript
tenants, users, workflows, executions, agents, conversations, integrations, audit_logs
```

## Security

- JWT tokens (7d expiry)
- RBAC (owner/admin/manager/member/viewer)
- Multi-tenant isolation
- API keys for external access

## Development

```bash
# All services
docker-compose up -d

# Individual service
cd services/auth-service && npm start

# Tests
npm test
```

## Environment

```
DATABASE_URL=postgresql://hojai:xxx@localhost:5432/hojai
JWT_SECRET=change-me
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
SLACK_BOT_TOKEN=xoxb-xxx
HUBSPOT_ACCESS_TOKEN=pat-xxx
SENDGRID_API_KEY=SG.xxx
```

## License

MIT
