# Sales Copilot Service

AI-powered sales assistant providing lead prioritization, talking points, recommendations, email generation, and sales forecasting.

**Version:** 1.0.0
**Port:** 4928
**Status:** Production Ready

---

## Overview

The Sales Copilot is an AI-powered service that helps sales teams:
- Prioritize leads based on multiple factors
- Generate AI-powered talking points
- Create personalized email templates
- Get next best action recommendations
- Generate sales forecasts
- Analyze competitive positioning

---

## API Endpoints

### Talking Points

```
GET /api/sales/talking-points/:leadId
```
Generate AI-powered talking points for a specific lead.

Query Parameters:
- `context` - Additional context for personalization
- `industry` - Lead's industry for tailored points
- `recentNotes` - Recent notes for relevance

### Lead Prioritization

```
GET /api/sales/prioritize
```
Prioritize leads based on AI analysis.

Query Parameters:
- `leads` - JSON array of leads
- `limit` - Maximum number of results
- `factors` - Comma-separated factor list

### Recommendations

```
GET /api/sales/recommend/:leadId
```
Get AI recommendations for a specific lead.

Query Parameters:
- `type` - Recommendation type filter
- `limit` - Maximum number of results
- `status` - Filter by status

```
POST /api/sales/recommend/:leadId
```
Create a new recommendation.

### Email Generation

```
POST /api/sales/email/generate
```
Generate AI-powered sales email.

Request Body:
```json
{
  "leadId": "string",
  "templateType": "introductory|follow_up|proposal|discovery|re_engagement",
  "context": "optional context",
  "tone": "formal|casual|aggressive|friendly",
  "goal": "optional goal"
}
```

### Sales Forecasting

```
POST /api/sales/forecast
```
Generate sales forecast.

Request Body:
```json
{
  "period": "weekly|monthly|quarterly",
  "deals": [
    {
      "leadId": "string",
      "companyName": "string",
      "amount": 50000,
      "stage": "qualified",
      "closeDate": "2024-12-31",
      "probability": 0.6
    }
  ]
}
```

---

## Features

### Lead Prioritization Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Recency | 25% | How recently the lead was contacted |
| Engagement Score | 25% | Level of interaction with content |
| Deal Size | 20% | Potential revenue from the deal |
| Stage Progress | 15% | Pipeline stage advancement |
| Fit Score | 15% | Alignment with ICP |

### Email Templates

| Template | Use Case | Best For |
|----------|----------|----------|
| Introductory | First contact | Cold outreach |
| Follow Up | Re-engage | No response |
| Discovery | Qualify | Understanding needs |
| Proposal | Send quote | Closing stage |
| Re-engagement | Win back | Dormant leads |

### Recommendation Types

- `next_best_action` - Suggested next step
- `talking_points` - Discussion topics
- `email_template` - Email content
- `competitive_insight` - Competitive positioning
- `pricing_suggestion` - Pricing optimization
- `timing_suggestion` - Best time to contact

---

## Environment Variables

```bash
PORT=4928
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sales-copilot
OPENAI_API_KEY=sk-your-api-key
LOG_LEVEL=info
```

---

## Running the Service

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Health Check

```
GET /health
```

Returns service health status.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Sales Copilot                          │
├─────────────────────────────────────────────────────────────┤
│  Routes                                                      │
│  ├── Talking Points Route                                   │
│  ├── Prioritize Route                                       │
│  ├── Recommend Route                                        │
│  ├── Email Route                                            │
│  └── Forecast Route                                         │
├─────────────────────────────────────────────────────────────┤
│  Services                                                    │
│  ├── Talking Points Service (AI generation)                 │
│  ├── Prioritization Service (Lead scoring)                   │
│  ├── Recommendation Service (Next best action)               │
│  ├── Email Generator Service (Template generation)           │
│  └── Forecast Service (Sales predictions)                    │
├─────────────────────────────────────────────────────────────┤
│  Models                                                      │
│  ├── Conversation (Lead interactions)                       │
│  └── Recommendation (AI suggestions)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration with RTMN Ecosystem

The Sales Copilot integrates with:
- **Memory OS (4703)** - For persistent context
- **Agent Economy (4251)** - For karma-based incentives
- **Event Bus (4510)** - For real-time notifications

---

## Example Usage

### Generate Talking Points

```bash
curl "http://localhost:4928/api/sales/talking-points/lead-001?industry=technology"
```

### Prioritize Leads

```bash
curl "http://localhost:4928/api/sales/prioritize?limit=5"
```

### Generate Email

```bash
curl -X POST "http://localhost:4928/api/sales/email/generate" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"lead-001","templateType":"follow_up","tone":"friendly"}'
```

### Get Forecast

```bash
curl -X POST "http://localhost:4928/api/sales/forecast" \
  -H "Content-Type: application/json" \
  -d '{"period":"monthly","deals":[{"leadId":"lead-001","companyName":"Acme","amount":50000,"stage":"qualified","closeDate":"2024-12-31","probability":0.6}]}'
```

---

## License

MIT
