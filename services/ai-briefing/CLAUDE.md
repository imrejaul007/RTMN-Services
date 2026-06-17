# AI Briefing Service

**Version:** 1.0.0
**Port:** 4897
**Status:** Active

---

## Overview

The AI Briefing Service generates daily morning briefings for executives, providing:

- Daily briefing generation at 6 AM (configurable)
- Risk analysis and summary
- Opportunity identification
- AI-powered recommendations
- Customer at-risk alerts
- Product issue alerts
- Pending approvals overview
- Multi-channel delivery (email, WhatsApp, Slack)
- Multi-tenant support

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Briefing Service                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    API Layer                          │  │
│  │  /api/briefings  /api/schedule  /api/alerts          │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                               │
│  ┌──────────────────────────▼──────────────────────────┐  │
│  │                   Service Layer                       │  │
│  │  Generator │ RiskAnalyzer │ OpportunityFinder        │  │
│  │  Recommender │ Scheduler │ Notifier                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                               │
│  ┌──────────────────────────▼──────────────────────────┐  │
│  │                    Data Layer                         │  │
│  │  Briefing Model │ Alert Model │ MongoDB              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Briefings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/briefings/tenant/:tenantId` | Get all briefings for tenant |
| GET | `/api/briefings/:id` | Get briefing by ID |
| GET | `/api/briefings/tenant/:tenantId/date/:date` | Get briefing by date |
| POST | `/api/briefings/generate` | Generate new briefing |
| POST | `/api/briefings/:id/send` | Send briefing via channels |
| GET | `/api/briefings/stats/:tenantId` | Get briefing statistics |

### Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedule` | Get all schedules |
| GET | `/api/schedule/:tenantId` | Get tenant schedule |
| PUT | `/api/schedule/:tenantId` | Update schedule |
| PATCH | `/api/schedule/:tenantId/status` | Enable/disable |
| POST | `/api/schedule/:tenantId/test` | Send test notification |
| DELETE | `/api/schedule/:tenantId` | Remove schedule |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts/tenant/:tenantId` | Get tenant alerts |
| GET | `/api/alerts/:id` | Get alert by ID |
| GET | `/api/alerts/tenant/:tenantId/summary` | Get alert summary |
| GET | `/api/alerts/tenant/:tenantId/at-risk` | At-risk customer alerts |
| GET | `/api/alerts/tenant/:tenantId/product-issues` | Product issue alerts |
| POST | `/api/alerts` | Create alert |
| PATCH | `/api/alerts/:id/acknowledge` | Acknowledge alert |
| POST | `/api/alerts/bulk-acknowledge` | Bulk acknowledge |
| DELETE | `/api/alerts/:id` | Delete alert |

---

## Briefing Structure

```typescript
interface Briefing {
  id: string;
  tenantId: string;
  date: Date;
  summary: {
    headline: string;
    keyHighlights: string[];
    executiveSummary: string;
    quickWins: QuickWin[];
  };
  riskAnalysis: {
    overallRiskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    risks: RiskItem[];
    trendingRisks: RiskItem[];
  };
  opportunities: {
    totalOpportunities: number;
    opportunities: Opportunity[];
    topPriority: Opportunity[];
  };
  recommendations: Recommendation[];
  pendingApprovals: PendingApproval[];
  alerts: AlertSummary[];
  metrics: BriefingMetrics;
  deliveryStatus: DeliveryStatus[];
}
```

---

## Risk Categories

| Category | Description |
|----------|-------------|
| `customer_churn` | Customer retention risk |
| `financial` | Revenue/cost risk |
| `operational` | Process/efficiency risk |
| `compliance` | Regulatory/policy risk |
| `market` | Competitive/industry risk |
| `product` | Quality/feature risk |
| `supply_chain` | Vendor/logistics risk |
| `reputation` | Brand/image risk |

---

## Opportunity Types

| Type | Description |
|------|-------------|
| `revenue_growth` | New revenue sources |
| `cost_savings` | Expense reduction |
| `customer_expansion` | Upsell/cross-sell |
| `market_entry` | New markets/segments |
| `partnership` | Strategic alliances |
| `operational_efficiency` | Process improvements |
| `product_extension` | New features/services |

---

## Notification Channels

### Email
- HTML formatted briefing
- Key metrics dashboard
- AI recommendations
- Risk indicators

### WhatsApp
- Concise text summary
- Risk status indicator
- Key highlights
- Top action item

### Slack
- Rich block kit messages
- Interactive sections
- Metric attachments
- Alert summaries

---

## Multi-Tenant Support

Each tenant can have:
- Custom briefing schedule
- Preferred notification channels
- Custom recipients
- Risk thresholds
- Alert preferences

```typescript
// Example tenant configuration
{
  tenantId: "acme-corp",
  schedule: {
    time: "06:00",
    timezone: "America/New_York",
    channels: [
      { type: "email", enabled: true },
      { type: "slack", enabled: true }
    ]
  },
  riskThreshold: 60
}
```

---

## Environment Variables

```bash
PORT=4897
MONGODB_URI=mongodb://localhost:27017/ai-briefing

# Scheduling
BRIEFING_SCHEDULE_HOUR=6
BRIEFING_SCHEDULE_MINUTE=0

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=briefings@example.com
SMTP_PASS=password
EMAIL_FROM=briefings@rtmn.io

# WhatsApp
WHATSAPP_API_URL=https://api.whatsapp.example.com
WHATSAPP_API_TOKEN=token

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SLACK_BOT_TOKEN=xoxb-...

# Risk Thresholds
RISK_THRESHOLD_HIGH=80
RISK_THRESHOLD_MEDIUM=50
RISK_THRESHOLD_LOW=25
```

---

## Health Check

```bash
curl http://localhost:4897/health
```

Response:
```json
{
  "status": "ok",
  "service": "ai-briefing-service",
  "version": "1.0.0",
  "timestamp": "2026-06-16T10:00:00.000Z",
  "uptime": 3600,
  "mongodb": "connected"
}
```

---

## Generate Briefing Example

```bash
curl -X POST http://localhost:4897/api/briefings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp",
    "forceRegenerate": false
  }'
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| mongoose | ^8.0.3 | MongoDB ODM |
| node-cron | ^3.0.3 | Scheduling |
| helmet | ^7.1.0 | Security headers |
| cors | ^2.8.5 | CORS support |
| zod | ^3.22.4 | Validation |
| uuid | ^9.0.1 | ID generation |
| winston | ^3.11.0 | Logging |

---

## Related Services

| Service | Port | Integration |
|---------|------|-------------|
| Memory OS | 4703 | Historical context |
| Goal OS | 4242 | Objectives data |
| CorpID | 4702 | Identity |
| Event Bus | 4510 | Notifications |

---

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Start production
npm start
```

---

*Last Updated: June 16, 2026*
