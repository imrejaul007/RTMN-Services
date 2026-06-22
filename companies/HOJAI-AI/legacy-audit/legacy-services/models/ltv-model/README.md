# HOJAI AI LTV Model Service

Customer Lifetime Value (LTV) prediction service using CatBoost machine learning.

## Overview

This service predicts customer lifetime value based on transaction history and engagement metrics. It uses a CatBoost-inspired algorithm to provide accurate LTV estimates and customer tier classification.

## Quick Start

```bash
# Install dependencies
cd hojai-ai/models/ltv-model
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict` | Predict LTV for a customer |
| POST | `/api/train` | Train the model with new data |
| GET | `/api/model/:id` | Get model information |
| GET | `/api/health` | Health check |

## Endpoints Detail

### POST /api/predict

Predict LTV for a customer.

**Request Body:**
```json
{
  "customerId": "cust_123",
  "features": {
    "totalRevenue": 15000,
    "orderCount": 45,
    "averageOrderValue": 333,
    "daysActive": 365,
    "retentionRate": 0.85
  }
}
```

**Response:**
```json
{
  "customerId": "cust_123",
  "ltv": 45000,
  "confidence": 0.92,
  "tier": "gold",
  "prediction": {
    "threeMonth": 11250,
    "sixMonth": 22500,
    "twelveMonth": 45000
  },
  "modelVersion": "1.0.0-catboost",
  "timestamp": "2026-05-30T10:30:00.000Z"
}
```

### POST /api/train

Train the model with new customer data.

**Request Body:**
```json
{
  "samples": [
    {
      "customerId": "cust_123",
      "features": {
        "totalRevenue": 15000,
        "orderCount": 45,
        "averageOrderValue": 333,
        "daysActive": 365,
        "retentionRate": 0.85
      },
      "actualLTV": 48000
    }
  ]
}
```

**Response:**
```json
{
  "modelId": "ltv-model-uuid",
  "status": "completed",
  "metrics": {
    "mse": 12450.5,
    "rmse": 111.58,
    "mae": 8950.25,
    "r2": 0.847,
    "mape": 12.35
  },
  "trainingSamples": 1500,
  "timestamp": "2026-05-30T10:35:00.000Z"
}
```

### GET /api/model/:id

Get model information and metrics.

**Response:**
```json
{
  "id": "ltv-model-uuid",
  "version": "1.0.0-catboost",
  "status": "active",
  "createdAt": "2026-05-30T10:00:00.000Z",
  "updatedAt": "2026-05-30T10:35:00.000Z",
  "metrics": {
    "mse": 12450.5,
    "rmse": 111.58,
    "mae": 8950.25,
    "r2": 0.847,
    "mape": 12.35
  },
  "featureImportance": [
    { "feature": "totalRevenue", "importance": 0.30 },
    { "feature": "orderCount", "importance": 0.20 },
    { "feature": "averageOrderValue", "importance": 0.25 },
    { "feature": "daysActive", "importance": 0.15 },
    { "feature": "retentionRate", "importance": 0.10 }
  ]
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "hojai-ltv-model",
  "version": "1.0.0-catboost",
  "uptime": 3600,
  "timestamp": "2026-05-30T10:30:00.000Z",
  "checks": {
    "memory": true,
    "model": true
  }
}
```

## Customer Tiers

Customers are classified into tiers based on predicted LTV:

| Tier | LTV Range |
|------|-----------|
| Bronze | < $5,000 |
| Silver | $5,000 - $15,000 |
| Gold | $15,000 - $50,000 |
| Platinum | >= $50,000 |

## Features

| Feature | Description | Weight |
|---------|-------------|--------|
| totalRevenue | Total revenue from customer | 30% |
| orderCount | Number of orders placed | 20% |
| averageOrderValue | Average order value | 25% |
| daysActive | Days since first purchase | 15% |
| retentionRate | Customer retention rate (0-1) | 10% |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4741 | Server port |
| HOST | 0.0.0.0 | Server host |
| LOG_LEVEL | info | Log level (debug, info, warn, error) |
| CORS_ORIGIN | * | CORS allowed origin |
| MODEL_VERSION | 1.0.0-catboost | Model version string |

## Example Usage with curl

```bash
# Health check
curl http://localhost:4741/api/health

# Predict LTV
curl -X POST http://localhost:4741/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_123",
    "features": {
      "totalRevenue": 15000,
      "orderCount": 45,
      "averageOrderValue": 333,
      "daysActive": 365,
      "retentionRate": 0.85
    }
  }'

# Get model info
curl http://localhost:4741/api/model/ltv-model-1

# Train model
curl -X POST http://localhost:4741/api/train \
  -H "Content-Type: application/json" \
  -d '{
    "samples": [
      {
        "customerId": "cust_123",
        "features": {
          "totalRevenue": 15000,
          "orderCount": 45,
          "averageOrderValue": 333,
          "daysActive": 365,
          "retentionRate": 0.85
        },
        "actualLTV": 48000
      }
    ]
  }'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOJAI LTV Model Service                   │
├─────────────────────────────────────────────────────────────┤
│  Express Server (Port 4741)                                │
│  ├── Security (Helmet, CORS)                               │
│  ├── Validation (Zod schemas)                              │
│  ├── Logging (Winston)                                     │
│  └── Routes                                                │
│       ├── POST /api/predict → LTVModelService.predict()   │
│       ├── POST /api/train → LTVModelService.train()        │
│       ├── GET /api/model/:id → LTVModelService.getModel()  │
│       └── GET /api/health → Health check                   │
├─────────────────────────────────────────────────────────────┤
│  LTVModelService (CatBoost Mock)                           │
│  ├── calculateBaseLTV() - Core prediction logic            │
│  ├── calculateTimeframePredictions() - 3/6/12 month        │
│  ├── determineTier() - Customer segmentation               │
│  └── calculateConfidence() - Prediction confidence          │
└─────────────────────────────────────────────────────────────┘
```

## Integration

This service is part of HOJAI AI's MLOps infrastructure and can be integrated with:

- HOJAI Feature Store (Port 4710)
- HOJAI Model Registry (Port 4711)
- Customer 360 services
- Marketing automation platforms
- CRM systems

## License

Internal - HOJAI AI
