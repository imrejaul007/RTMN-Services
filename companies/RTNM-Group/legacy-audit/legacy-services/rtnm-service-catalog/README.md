# RTNM Service Catalog

Service Catalog for RTNM Economic Network. Every company publishes their services here with pricing, SLA, and API endpoints.

## Overview

The Service Catalog is a central registry for all services across the RTNM ecosystem. It provides:

- **Service Publishing**: Companies can publish their services with full metadata
- **Service Discovery**: Search and browse available services
- **Pricing Information**: View pricing models and rates
- **SLA Details**: Access service level agreements
- **API Endpoints**: Get API endpoint information for each service

## Features

- MongoDB-backed service storage
- Full-text search across services
- Category-based browsing
- Company-scoped service management
- Comprehensive SLA tracking
- Multi-tier pricing support
- Rate limiting and security

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB 6.0+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration

Create a `.env` file:

```env
PORT=6003
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rtnm_service_catalog
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker

```bash
# Build image
docker build -t rtnm-service-catalog .

# Run container
docker run -p 6003:6003 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/rtnm_service_catalog \
  rtnm-service-catalog
```

### Docker Compose

```yaml
version: '3.8'

services:
  catalog:
    build: .
    ports:
      - "6003:6003"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rtnm_service_catalog
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## API Reference

### Health Check

```
GET /health           # Basic health check
GET /health/ready     # Readiness check (includes MongoDB)
GET /health/live      # Liveness check
GET /metrics          # Service metrics
```

### Services

#### Publish a Service

```http
POST /api/services
Content-Type: application/json

{
  "corpId": "corp_abc123",
  "name": "Payment Gateway Service",
  "description": "Secure payment processing API",
  "category": "payments",
  "tags": ["payments", "api", "secure"],
  "pricing": {
    "model": "subscription",
    "rate": 99,
    "unit": "month",
    "currency": "USD"
  },
  "sla": {
    "uptime": 99.9,
    "responseTime": 200,
    "supportLevel": "premium"
  },
  "api": [
    {
      "endpoint": "/v1/payments",
      "method": "POST",
      "auth": "apiKey",
      "description": "Create a payment"
    }
  ],
  "capabilities": ["card-payments", "refunds", "webhooks"],
  "documentation": {
    "docsUrl": "https://docs.example.com",
    "supportUrl": "https://support.example.com"
  }
}
```

#### List Services

```http
GET /api/services?page=1&limit=20&status=active
```

#### Search Services

```http
GET /api/services/search?q=payment&category=payments&pricingModel=subscription
```

#### Get Service

```http
GET /api/services/:serviceId
```

#### Update Service

```http
PUT /api/services/:serviceId
Content-Type: application/json

{
  "pricing": {
    "model": "tiered",
    "rate": 149,
    "unit": "month"
  }
}
```

#### Delete Service

```http
DELETE /api/services/:serviceId
```

#### Get Company's Services

```http
GET /api/services/company/:corpId
```

#### Get Services by Category

```http
GET /api/services/category/payments
```

#### Get Categories

```http
GET /api/services/categories
```

#### Get Statistics

```http
GET /api/services/stats
```

## Data Models

### Service

| Field | Type | Description |
|-------|------|-------------|
| serviceId | string | Unique service identifier |
| corpId | string | Company identifier |
| name | string | Service name |
| description | string | Service description |
| category | string | Service category |
| tags | string[] | Searchable tags |
| pricing | object | Pricing configuration |
| sla | object | SLA configuration |
| api | object[] | API endpoints |
| capabilities | string[] | Service capabilities |
| documentation | object | Documentation URLs |
| status | string | Service status |
| version | string | Service version |

### Pricing Model

```typescript
{
  model: 'free' | 'subscription' | 'usage' | 'tiered' | 'enterprise';
  rate: number;
  unit: string;
  currency?: string;
  tiers?: Array<{
    name: string;
    price: number;
    features: string[];
  }>;
}
```

### SLA

```typescript
{
  uptime: number;        // percentage (e.g., 99.9)
  responseTime: number;  // milliseconds
  availability?: string;
  supportLevel?: 'basic' | 'standard' | 'premium' | 'enterprise';
}
```

## Project Structure

```
rtnm-service-catalog/
├── src/
│   ├── config/          # Configuration
│   ├── models/          # Mongoose models
│   ├── services/        # Business logic
│   ├── routes/          # Express routes
│   ├── utils/           # Utilities
│   └── index.ts         # App entry point
├── .github/
│   └── workflows/       # GitHub Actions
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## License

MIT
