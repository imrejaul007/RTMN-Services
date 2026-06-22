# HOJAI AI Churn Model Service

Customer churn prediction model service for the HOJAI AI platform.

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/ReZ\ Full\ App/hojai-ai/models/churn-model

# Install dependencies
npm install

# Start development server
npm run dev
```

## API Endpoints

### Health Check
```bash
GET /api/health
```

### Predict Churn
```bash
POST /api/predict
Content-Type: application/json

{
  "customerId": "cust_123",
  "features": {
    "daysSinceLastPurchase": 30,
    "totalOrders": 15,
    "averageOrderValue": 2500,
    "engagementScore": 65,
    "supportTickets": 2
  }
}
```

### Train Model
```bash
POST /api/train
Content-Type: application/json

{
  "samples": [
    {
      "customerId": "cust_123",
      "features": {
        "daysSinceLastPurchase": 30,
        "totalOrders": 15,
        "averageOrderValue": 2500,
        "engagementScore": 65,
        "supportTickets": 2
      },
      "label": false
    }
  ]
}
```

### Get Model Info
```bash
GET /api/model/churn-model-xxx
```

## Response Format

```typescript
interface ChurnPredictionResponse {
  customerId: string;
  probability: number;      // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  factors: Array<{
    name: string;
    impact: number;
  }>;
  confidence: number;
  modelVersion: string;
  timestamp: string;
}
```

## Architecture

```
┌─────────────────────────────────────────────┐
│              Express Server (4740)           │
├─────────────────────────────────────────────┤
│  Routes: /api/predict, /api/train, /health │
├─────────────────────────────────────────────┤
│           ChurnModelService                  │
│  - predict()  - train()  - getModelInfo()  │
├─────────────────────────────────────────────┤
│           Mock XGBoost Engine                │
│  - Feature normalization                     │
│  - Probability calculation                   │
│  - Risk level classification                 │
│  - Factor impact analysis                    │
└─────────────────────────────────────────────┘
```

## Risk Thresholds

| Probability | Risk Level |
|-------------|------------|
| < 0.3       | low        |
| 0.3 - 0.7  | medium     |
| >= 0.7      | high       |
