# Finance Copilot Service

**Version:** 1.0.0  
**Port:** 4930  
**Status:** Ready for Development

## Overview

Finance Copilot is an AI-powered financial analysis service that provides anomaly detection, cash flow forecasting, budget recommendations, refund analysis, and fraud risk scoring for the RTMN ecosystem.

## Features

- **Anomaly Detection** - Detects suspicious transactions and unusual patterns
- **Cash Flow Forecasting** - Predicts future cash flows with confidence scores
- **Budget Recommendations** - Provides AI-powered budget optimization suggestions
- **Refund Analysis** - Risk assessment for refund requests
- **Fraud Detection** - Real-time fraud risk scoring
- **Finance Insights** - Generated insights and recommendations

## Quick Start

```bash
# Install dependencies
cd services/finance-copilot
npm install

# Copy environment file
cp .env.example .env

# Build TypeScript
npm run build

# Start service
npm start

# Or run in development mode
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

### Anomaly Detection
```
GET  /api/finance/anomaly           # Get all alerts
GET  /api/finance/anomaly/stats     # Get anomaly statistics
POST /api/finance/anomaly/detect    # Detect anomalies in a transaction
PUT  /api/finance/anomaly/:id/resolve  # Resolve an alert
```

### Cash Flow Forecasting
```
GET  /api/finance/forecast              # Get forecasts
GET  /api/finance/forecast/generate     # Generate new forecast
GET  /api/finance/forecast/summary       # Get forecast summary
PUT  /api/finance/forecast/:id/actual   # Update with actual values
```

### Budget Management
```
GET  /api/finance/budget                # Get budget status
GET  /api/finance/budget/summary        # Get budget summary
GET  /api/finance/budget/recommend      # Get recommendations
POST /api/finance/budget/allocation     # Set budget allocation
GET  /api/finance/budget/category/:name  # Get category budget
```

### Refund Analysis
```
GET  /api/finance/refund/analysis       # Analyze a refund
GET  /api/finance/refund/:id            # Get analysis by ID
GET  /api/finance/refund/stats          # Get refund statistics
POST /api/finance/refund/batch          # Batch analyze refunds
```

### Fraud Detection
```
GET  /api/finance/fraud/risk             # Calculate risk score
GET  /api/finance/fraud/summary         # Get fraud summary
POST /api/finance/fraud/check           # Check transaction
GET  /api/finance/fraud/risk/:type/:id  # Get entity risk score
```

### Finance Insights
```
GET  /api/finance/insights              # Get all insights
GET  /api/finance/insights/summary     # Get insights summary
GET  /api/finance/insights/:id          # Get specific insight
```

## Example Requests

### Detect Transaction Anomaly
```bash
curl -X POST http://localhost:4930/api/finance/anomaly/detect \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TXN-12345",
    "type": "expense",
    "amount": 15000,
    "category": "shopping",
    "description": "Large purchase",
    "timestamp": "2026-06-16T10:30:00Z",
    "accountId": "ACC-001"
  }'
```

### Get Budget Recommendations
```bash
curl http://localhost:4930/api/finance/budget/recommend
```

### Check Fraud Risk
```bash
curl "http://localhost:4930/api/finance/fraud/risk?entityId=CUST-123&entityType=customer"
```

### Generate Cash Flow Forecast
```bash
curl "http://localhost:4930/api/finance/forecast/generate?horizon=30"
```

## Environment Variables

```bash
PORT=4930
MONGODB_URI=mongodb://localhost:27017/finance_copilot
OPENAI_API_KEY=sk-your-key-here
LOG_LEVEL=info
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Finance Copilot                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Anomaly    │  │  Forecasting │  │    Budget    │     │
│  │  Detection   │  │   Service   │  │   Service   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Refund    │  │     Fraud    │  │   Insights   │     │
│  │   Analysis   │  │  Detection   │  │   Generator │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    MongoDB Models                      │  │
│  │         Alert Model    │    Forecast Model          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| Security | Helmet, CORS |
| Logging | Winston |

## Service Registry

- **Service Name:** finance-copilot
- **Port:** 4930
- **Health:** `/health`
- **API Base:** `/api/finance`

## Future Enhancements

- OpenAI integration for natural language insights
- Real-time streaming alerts via WebSocket
- ML-based prediction models
- Integration with RABTUL payment services
- Multi-currency support

---

*Last Updated: June 16, 2026*
