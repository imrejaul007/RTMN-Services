# Customer Graph 360 Service

Unified 360-degree customer view by aggregating data from all REZ ecosystem touchpoints.

## Overview

Customer Graph 360 creates a comprehensive view of each customer by aggregating data from:
- **RABTUL** - Purchases, payments, wallet transactions
- **BuzzLocal** - Local discovery, social engagement
- **Airzy** - Travel bookings, flight/hotel reservations
- **REZ Menu QR** - Restaurant dining, menu scanning
- **REZ Now** - Quick commerce, restaurant orders
- **RisaCare** - Healthcare appointments

## Features

- Unified customer profile across all apps
- Cross-app identity resolution
- Transaction aggregation
- Interaction timeline tracking
- Segment membership management
- Predictive analytics (churn risk, LTV, next purchase)

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Cache:** Redis
- **Validation:** Zod
- **Authentication:** JWT
- **Metrics:** Prometheus (prom-client)
- **Language:** TypeScript

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Set JWT_SECRET, MongoDB URI, Redis URL
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Build for production
npm run build
```

### Production

```bash
# Build and start
npm run build
npm start
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 4808 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/customer-graph-360 |
| `REDIS_URL` | Redis connection string | redis://localhost:6379 |
| `JWT_SECRET` | JWT signing secret | - |
| `RABTUL_SERVICE_URL` | RABTUL service URL | http://localhost:4002 |
| `BUZZLOCAL_SERVICE_URL` | BuzzLocal service URL | http://localhost:4500 |
| `AIRZY_SERVICE_URL` | Airzy service URL | http://localhost:4505 |
| `REZ_MENU_QR_SERVICE_URL` | REZ Menu QR URL | http://localhost:3014 |
| `REZ_NOW_SERVICE_URL` | REZ Now URL | http://localhost:3000 |
| `RISACARE_SERVICE_URL` | RisaCare URL | http://localhost:4600 |

## API Endpoints

All endpoints require JWT authentication (Bearer token).

### Get Customer 360 View

```
GET /api/customer/:userId
```

Returns complete customer profile including identity, transactions, interactions, preferences, segments, and predictions.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "identity": { ... },
    "profile": { ... },
    "transactions": { ... },
    "interactions": { ... },
    "preferences": { ... },
    "segments": { ... },
    "predictions": { ... },
    "lastSynced": "2026-06-06T12:00:00Z"
  }
}
```

### Sync Customer Data

```
POST /api/customer/:userId/sync
```

Syncs customer data from all connected services.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "syncedAt": "2026-06-06T12:00:00Z",
    "sources": ["RABTUL", "BUZZLOCAL", "AIRZY"],
    "recordsProcessed": 15
  }
}
```

### Get Interactions

```
GET /api/customer/:userId/interactions
```

Returns all app interactions and touchpoints.

### Get Purchases

```
GET /api/customer/:userId/purchases?limit=50&offset=0
```

Returns purchase history with pagination.

### Get Preferences

```
GET /api/customer/:userId/preferences
```

Returns customer preferences (channels, language, notifications, etc.).

### Get Segments

```
GET /api/customer/:userId/segments
```

Returns current and historical segment memberships.

### Enrich Customer Data

```
POST /api/customer/:userId/enrich
```

Runs predictive analytics to enrich customer data with:
- Churn risk score
- Lifetime value prediction
- Next purchase date prediction
- Product recommendations

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "enrichedFields": ["predictions.churnRisk", "predictions.lifetimeValue", "..."],
    "confidence": 0.85
  }
}
```

## Health & Metrics

### Health Check

```
GET /health
```

Returns service health status.

### Prometheus Metrics

```
GET /metrics
```

Returns Prometheus-format metrics.

## Data Model

### Customer360 Schema

```typescript
interface Customer360 {
  userId: string;
  identity: {
    userId: string;
    email?: string;
    phone?: string;
    alternateIds: string[];
    linkedAccounts: { provider: string; userId: string }[];
  };
  profile: {
    demographics: {
      age?: number;
      gender?: string;
      location: { city: string; state: string; country: string; lat?: number; lng?: number };
    };
    psychographics?: {
      interests: string[];
      values: string[];
      lifestyle: string[];
    };
  };
  transactions: {
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    lastPurchase: Date;
    favoriteCategories: string[];
    lifetimeValue: number;
    paymentMethods: string[];
  };
  interactions: {
    appsUsed: string[];
    lastActive: Date;
    engagementScore: number;
    touchpoints: {
      app: string;
      firstSeen: Date;
      lastSeen: Date;
      sessionCount: number;
    }[];
  };
  preferences: {
    channels: string[];
    language: string;
    notificationSettings: Record<string, boolean>;
    priceRange: { min: number; max: number };
    brands: string[];
  };
  segments: {
    current: string[];
    historical: { segment: string; from: Date; to?: Date }[];
  };
  predictions: {
    churnRisk: number;
    lifetimeValue: number;
    nextPurchaseDate: Date;
    productRecommendations: string[];
  };
  lastSynced: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Testing

```bash
# Run all tests with coverage
npm test

# Watch mode
npm run test:watch

# Run specific test file
npx jest tests/types.test.ts
```

## Project Structure

```
customer-graph-360/
├── src/
│   ├── index.ts           # Main entry point
│   ├── config/            # Configuration
│   │   └── index.ts
│   ├── types/             # TypeScript types
│   │   ├── customer360.ts
│   │   └── index.ts
│   ├── models/            # Mongoose models
│   │   ├── customer360.model.ts
│   │   └── index.ts
│   ├── services/          # Business logic
│   │   ├── customer.service.ts
│   │   └── index.ts
│   ├── routes/            # API routes
│   │   ├── customer.routes.ts
│   │   └── index.ts
│   ├── middleware/        # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── metrics.middleware.ts
│   │   └── index.ts
│   └── utils/             # Utilities
│       ├── logger.ts
│       ├── redis.ts
│       └── index.ts
├── tests/                 # Unit tests
│   ├── setup.ts
│   ├── types.test.ts
│   ├── services.test.ts
│   └── routes.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
└── README.md
```

## License

Internal - REZ Ecosystem