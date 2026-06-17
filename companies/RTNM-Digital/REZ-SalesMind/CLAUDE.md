# REZ SalesMind

**Version:** 2.2.0
**Port:** 5170 (Professional OS)
**Status:** ✅ Production-Ready (50 security/quality fixes applied)

## Service Overview

AI-powered sales intelligence platform that unifies data from HOJAI AI, AdBazaar, REZ CRM Hub, and other RTMN ecosystem services to provide:

- Lead scoring and enrichment
- Prospect digital twins
- Real-time buying signal detection
- Sales forecasting
- Automated email sequences and proposals
- Pipeline intelligence and dashboards

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm build

# Start production
npm start
```

## API Endpoints

### Sales Intelligence
- `GET /api/sales/intelligence/:leadId` - Comprehensive sales intelligence
- `GET /api/sales/pre-call/:leadId` - Pre-call brief
- `GET /api/sales/twin/:leadId` - Prospect digital twin
- `GET /api/sales/talking-points/:leadId` - AI-generated talking points
- `GET /api/sales/next-action/:leadId` - Next best action
- `GET /api/sales/signals/:leadId` - Aggregated signals
- `GET /api/sales/signal-score/:leadId` - Signal score
- `GET /api/sales/buying-signals/:leadId` - Buying signals
- `GET /api/sales/pipeline` - Pipeline intelligence

### Leads
- `GET /api/leads` - List leads (paginated)
- `GET /api/leads/:leadId` - Get lead
- `POST /api/leads` - Create lead
- `PATCH /api/leads/:leadId/stage` - Update stage
- `POST /api/leads/:leadId/enrich` - AI enrichment
- `POST /api/leads/:leadId/score` - AI scoring

### AI Tools
- `POST /api/ai/email/generate` - Generate email
- `POST /api/ai/email/sequence` - Generate follow-up sequence
- `POST /api/ai/email/variants` - Generate A/B variants
- `POST /api/ai/proposal/generate` - Generate proposal
- `POST /api/ai/forecast/deal` - Forecast deal
- `POST /api/ai/forecast/pipeline` - Forecast pipeline
- `POST /api/ai/forecast/targets` - Generate weekly targets

### Insights
- `GET /api/insights/market/:industry` - Market insights
- `GET /api/insights/intent/:prospectId` - Intent signals
- `GET /api/insights/churn-risk/:prospectId` - Churn risk
- `GET /api/insights/pipeline-summary` - Pipeline summary
- `GET /api/insights/engagement/:leadId` - Engagement analytics

### Ecosystem
- `GET /api/ecosystem/prospecting/search?q=` - Prospect search
- `POST /api/ecosystem/communication/email` - Send email
- `POST /api/ecosystem/communication/sms` - Send SMS
- `POST /api/ecosystem/communication/call` - Make call
- `GET /api/ecosystem/intelligence/market-signals` - Market signals
- `GET /api/ecosystem/identity/profile/:id` - Identity profile
- `GET /api/ecosystem/crm/leads` - CRM leads
- `GET /api/ecosystem/crm/deals` - CRM deals
- `POST /api/ecosystem/workflow/run` - Run AI workflow
- `POST /api/ecosystem/workflow/outreach-sequence` - Execute sequence
- `POST /api/ecosystem/conversation/analyze` - Analyze conversation
- `GET /api/ecosystem/status` - Integration status

### Integrations
- `POST /api/integrations/slack/alert` - Send Slack alert
- `POST /api/integrations/linkedin/enrich` - LinkedIn enrichment
- `GET /api/integrations/gmail/emails` - Fetch emails
- `POST /api/integrations/zoom/meeting` - Create meeting

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/pipeline-chart` - Pipeline chart data
- `GET /api/dashboard/leaderboard` - Sales leaderboard

### Health
- `GET /health` - Health check (public)

## Authentication

All `/api/*` endpoints require `X-Internal-Token` header:

```bash
curl -H "X-Internal-Token: your-token" http://localhost:5170/api/leads
```

WebSocket: Pass token as query param:
```bash
ws://localhost:5170/ws?token=your-token
```

## Environment Variables

See `.env.example` for all configuration options.

**Required:**
- `INTERNAL_SERVICE_TOKEN` - Service authentication (required in production)

## Integration Status

| Service | Status | Port |
|---------|--------|------|
| REZ CRM Hub | ✅ Connected | 4056 |
| HOJAI Web Intel | ⚠️ Optional | 4595 |
| HOJAI Merchant Intel | ⚠️ Optional | 4751 |
| HOJAI Lead Service | ⚠️ Optional | 4752 |
| HOJAI Knowledge Graph | ⚠️ Optional | 4786 |
| HOJAI TwinOS | ⚠️ Optional | 4521 |
| REZ Identity Hub | ⚠️ Optional | 4702 |
| Genie Voice | ⚠️ Optional | 4760 |
| AssetMind | ⚠️ Optional | 5200 |
| AdBazaar | ⚠️ Optional | 4300-4303 |

*All integrations gracefully fallback when unavailable*

## Security

- ✅ `crypto.timingSafeEqual` for token comparison
- ✅ `AbortController` for fetch timeouts
- ✅ Input validation on all endpoints
- ✅ HTML entity escaping in email/proposal generation
- ✅ Rate limiting (100 req/min general, 20 req/min writes)
- ✅ Request body size limits (1MB JSON, URL-encoded)
- ✅ CORS configurable per environment
- ✅ Graceful shutdown handling
- ✅ No internal topology disclosure in status endpoint

## Port Assignment

Registered in RTMN Port Registry as **Professional OS (5170)**.

---

*Last Updated: June 17, 2026*
