# HOJAI AI Governance Dashboard

Enterprise AI governance, usage analytics, and policy enforcement.

**Port: 4630**

## Features

- **Usage Analytics**: Track AI usage across teams and departments
- **Budget Control**: Set and monitor monthly budgets per team
- **Policy Management**: Create and enforce AI usage policies
- **Content Filtering**: Block prohibited content with keyword filters
- **Cost Attribution**: Track cost per team, user, and service
- **Alert System**: Real-time alerts for budget and policy violations
- **Compliance Dashboard**: Overview of governance metrics

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/usage/overview` | Get usage overview |
| POST | `/api/usage/record` | Record AI usage |
| GET | `/api/usage/teams/:teamId` | Get team usage |
| GET | `/api/policies` | List policies |
| POST | `/api/policies` | Create policy |
| PUT | `/api/policies/:id` | Update policy |
| POST | `/api/policies/check` | Check compliance |
| GET | `/api/teams` | List teams |
| POST | `/api/teams` | Create team |
| GET | `/api/alerts` | Get alerts |
| POST | `/api/alerts/:id/acknowledge` | Acknowledge alert |
| GET | `/api/dashboard` | Dashboard summary |

## Quick Start

```bash
npm install
npm run build
npm start
```

## Policy Types

| Type | Description |
|------|-------------|
| `usage_limit` | Limit requests per user/team |
| `content_filter` | Block prohibited keywords |
| `access_control` | Restrict service access |
| `cost_control` | Set spending limits |

## Use Cases

```bash
# Record usage
curl -X POST http://localhost:4630/api/usage/record \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "teamId": "engineering",
    "service": "gpt-4",
    "tokensUsed": 1500,
    "cost": 0.03
  }'

# Check policy compliance
curl -X POST http://localhost:4630/api/policies/check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "teamId": "engineering",
    "content": "Generate a report..."
  }'
```
