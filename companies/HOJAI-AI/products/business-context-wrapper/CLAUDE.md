# Business Context Wrapper

**Port:** 5451
**Purpose:** Wraps Genie Gateway for business owner Q&A — natural language answers with revenue impact

## What It Does

Takes natural language questions from business owners and answers them by combining data from multiple existing services:

```
Business Owner: "Why did revenue drop this week?"
    ↓
Business Context Wrapper (5451)
    ↓
Fetches: CXO OS + Sales OS + Marketing OS
    ↓
Wraps Genie Gateway with business context
    ↓
Returns: Answer + Root Cause + Recommendations + Revenue Impact
```

## Architecture

```
                    Business Owner Question
                              ↓
              Business Context Wrapper (5451)
                    ↓         ↓         ↓
              CXO OS      Sales OS   Marketing OS
              (5100)      (5055)      (5500)
                    ↓         ↓         ↓
              Business Context Data
                    ↓
              Genie Gateway (4701)
                    ↓
              Actionable Answer
                    ↓
              Dashboard / Widget
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/business/ask` | Natural language Q&A |
| GET | `/api/business/insights` | Proactive insights |
| GET | `/api/business/dashboard` | Quick stats |
| POST | `/api/business/recommend` | AI recommendations |

## Example Usage

```bash
# Ask a question
curl -X POST http://localhost:5451/api/business/ask \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "Why did revenue drop this week?",
    "companyId": "company-123",
    "period": "7d"
  }'

# Get proactive insights
curl http://localhost:5451/api/business/insights?companyId=company-123

# Get recommendations
curl -X POST http://localhost:5451/api/business/recommend \
  -H 'Content-Type: application/json' \
  -d '{"companyId": "company-123", "area": "conversion"}'
```

## Response Example

```json
{
  "success": true,
  "data": {
    "question": "Why did revenue drop this week?",
    "questionType": "revenue",
    "answer": "Revenue dropped 12% due to: (1) Mobile checkout failures +28%, (2) Returning customer purchases -18%, (3) Cart abandonment rate increased from 68% to 74%",
    "healthScore": 65,
    "recommendations": [
      {
        "area": "conversion",
        "action": "Add express checkout options (UPI, Wallets)",
        "impact": "Rs 40,000+/month",
        "priority": 1
      }
    ],
    "revenueImpact": 115000,
    "confidence": 0.85
  }
}
```

## Reuses

| Service | Port | Purpose |
|---|---|---|
| CXO OS | 5100 | Executive metrics |
| Sales OS | 5055 | Revenue data |
| Marketing OS | 5500 | Campaign data |
| Genie Gateway | 4701 | AI responses |

## Environment Variables

```bash
CXO_OS_URL=http://localhost:5100
SALES_OS_URL=http://localhost:5055
MARKETING_OS_URL=http://localhost:5500
GENIE_URL=http://localhost:4701
HOJAI_API_KEY=your-api-key
```

## Startup

```bash
cd companies/HOJAI-AI/products/business-context-wrapper
npm install
npm start  # Port 5451
```
