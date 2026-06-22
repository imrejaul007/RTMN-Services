# HOJAI Product Intelligence - Service Documentation

**Company:** HOJAI AI  
**Product:** Product Intelligence  
**Port:** 4755  
**Version:** 1.0.0  
**Status:** ✅ **BUILT** (June 13, 2026)

---

## Overview

**HOJAI Product Intelligence** provides unified product analytics and insights from multiple data sources. It consolidates product management, feature tracking, feedback analysis, and AI-powered prioritization.

### Key Capabilities

- **Product Management** - Create, update, and track products
- **Feature Tracking** - Track features with priority, status, effort estimates
- **Feedback Analysis** - Collect and analyze user feedback with sentiment detection
- **Roadmap Management** - Plan and track product roadmap items
- **Metrics Dashboard** - Track product metrics over time
- **AI Prioritization** - RICE scoring for feature prioritization
- **Analytics** - Comprehensive product and cross-product analytics

---

## Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x (Mongoose ODM) |
| Validation | Zod 3.x |
| Logging | Pino |
| Security | Helmet, CORS, Rate Limiting |
| Auth | JWT + API Key |

### Directory Structure

```
hojai-product-intelligence/
├── src/
│   ├── index.ts          # Main Express server
│   └── types/
│       └── index.ts      # Zod validation schemas
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── CLAUDE.md
```

---

## Data Models

### Product

```typescript
{
  id: string;              // UUID
  name: string;            // 1-200 chars
  description?: string;     // max 2000 chars
  category: string;        // max 100 chars
  subcategory?: string;
  status: 'active' | 'draft' | 'archived' | 'discontinued';
  version: string;
  tags: string[];
  metadata: object;
  ownerId?: string;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### ProductFeature

```typescript
{
  id: string;
  productId: string;
  name: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  estimatedEffort?: number;  // story points
  actualEffort?: number;
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  dependencies: string[];   // feature IDs
}
```

### ProductFeedback

```typescript
{
  id: string;
  productId: string;
  featureId?: string;
  userId?: string;
  content: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  source: 'in_app' | 'email' | 'support_ticket' | 'social' | 'review' | 'survey';
  rating?: number;          // 1-5 NPS-style
  category?: string;
  status: 'new' | 'reviewed' | 'accepted' | 'rejected' | 'duplicate';
  response?: string;
  responderId?: string;
  respondedAt?: Date;
  metadata: object;
}
```

### RoadmapItem

```typescript
{
  id: string;
  productId: string;
  title: string;
  description?: string;
  targetDate: Date;
  type: 'feature' | 'improvement' | 'bug_fix' | 'milestone' | 'release';
  status: 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  features: string[];
  progress: number;         // 0-100
  completedAt?: Date;
}
```

### ProductMetric

```typescript
{
  id: string;
  productId: string;
  metricType: 'daily_active_users' | 'monthly_active_users' | 'sessions' | ...;
  value: number;
  unit?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recordedAt: Date;
}
```

---

## API Endpoints

### Health Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Full health check |
| GET | `/health/live` | No | Liveness probe |
| GET | `/health/ready` | No | Readiness probe |

### Product Endpoints (v1)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/products` | Yes | List products (paginated) |
| POST | `/api/v1/products` | Yes | Create product |
| GET | `/api/v1/products/:id` | Yes | Get product |
| PUT | `/api/v1/products/:id` | Yes | Update product |
| DELETE | `/api/v1/products/:id` | Yes | Delete product |
| GET | `/api/v1/products/:id/analytics` | Yes | Product analytics |
| GET | `/api/v1/products/:id/features` | Yes | List features |
| POST | `/api/v1/products/:id/features` | Yes | Create feature |
| GET | `/api/v1/products/:id/features/:fid` | Yes | Get feature |
| PUT | `/api/v1/products/:id/features/:fid` | Yes | Update feature |
| DELETE | `/api/v1/products/:id/features/:fid` | Yes | Delete feature |
| POST | `/api/v1/products/:id/features/prioritize` | Yes | RICE prioritization |
| GET | `/api/v1/products/:id/roadmap` | Yes | List roadmap |
| POST | `/api/v1/products/:id/roadmap` | Yes | Create roadmap item |
| GET | `/api/v1/products/:id/roadmap/:rid` | Yes | Get roadmap item |
| PUT | `/api/v1/products/:id/roadmap/:rid` | Yes | Update roadmap item |
| DELETE | `/api/v1/products/:id/roadmap/:rid` | Yes | Delete roadmap item |
| GET | `/api/v1/products/:id/metrics` | Yes | List metrics |
| POST | `/api/v1/products/:id/metrics` | Yes | Record metric |

### Feedback Endpoints (v1)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/feedback` | Yes | List feedback (paginated) |
| POST | `/api/v1/feedback` | Yes | Create feedback |
| GET | `/api/v1/feedback/:id` | Yes | Get feedback |
| POST | `/api/v1/feedback/:id/respond` | Yes | Respond to feedback |

### Analytics Endpoints (v1)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/analytics` | Yes | Cross-product analytics |

---

## AI Features

### Sentiment Detection

Auto-detects sentiment from feedback content:
- **Positive**: Contains "great", "love", "excellent", "amazing"
- **Negative**: Contains "bad", "hate", "terrible", "awful"
- **Neutral**: Default when no keywords match

### RICE Scoring

Feature prioritization using RICE framework:
- **Reach**: Number of users impacted
- **Impact**: Impact on users (0-3 scale)
- **Confidence**: Confidence in estimates (0-1)
- **Effort**: Story points required

Formula: `(Reach * Impact * Confidence) / Effort`

Recommendations:
- Score >= 50: **Implement** (do immediately)
- Score >= 20: **Schedule** (plan for later)
- Score >= 5: **Reconsider** (evaluate carefully)
- Score < 5: **Reject** (not worth the effort)

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4755 | Service port |
| NODE_ENV | No | development | Environment |
| LOG_LEVEL | No | info | Logging level |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| HOJAI_PRODUCT_INTELLIGENCE_API_KEY | Yes | - | API key for service auth |
| CORS_ORIGIN | No | - | Comma-separated allowed origins |
| RATE_LIMIT_MAX | No | 100 | Max requests per window |
| RATE_LIMIT_WINDOW | No | 60000 | Rate limit window (ms) |

---

## Integration Points

### HOJAI Ecosystem

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI Core | 4500-4610 | API Gateway, Event, Memory |
| HOJAI ExpertOS | 4550 | Agent runtime |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| Genie Voice | 4760 | Voice AI |

### RABTUL Services

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | JWT authentication |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Notifications |

---

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production
npm start
```

---

## Docker Deployment

### Quick Start

```bash
# Build
docker build -t hojai-product-intelligence .

# Run with environment
docker run -p 4755:3000 \
  -e MONGODB_URI=mongodb://host:27017/product-intelligence \
  -e JWT_SECRET=your-secret \
  -e HOJAI_PRODUCT_INTELLIGENCE_API_KEY=your-api-key \
  hojai-product-intelligence
```

### Docker Compose

```bash
docker-compose up -d
```

---

## License

Proprietary - RTNM Digital

---

## Related Documents

| Document | Location | Description |
|----------|----------|-------------|
| README.md | ./README.md | Quick start guide |
| RTNM-COMPANIES-AUDIT.md | ../../../RTNM-COMPANIES-AUDIT.md | RTNM ecosystem audit |
| RTNM-PRODUCTS-FEATURES-AUDIT.md | ../../../RTNM-PRODUCTS-FEATURES-AUDIT.md | Products & features |
| COMPANIES-AUDIT.md | ../../COMPANIES-AUDIT.md | HOJAI AI companies |
| PRODUCTS-FEATURES-AUDIT.md | ../../PRODUCTS-FEATURES-AUDIT.md | HOJAI products |

---

**Last Updated:** June 13, 2026  
**Built by:** Claude Code (AI Assistant)
