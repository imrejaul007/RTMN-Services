# HOJAI Product Intelligence

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4755 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI Product Intelligence** provides unified product analytics and insights from multiple data sources. It is a core service within the **HOJAI AI** ecosystem.

### Key Features

- 📦 **Product Management** - Create, track, and manage products
- 🎯 **Feature Tracking** - Track features with priority, status, and dependencies
- 💬 **Feedback Analysis** - Collect and analyze user feedback with sentiment detection
- 🗺️ **Roadmap Management** - Plan and track product roadmap items
- 📊 **Metrics Dashboard** - Track product metrics over time
- 🤖 **AI Prioritization** - RICE scoring for feature prioritization
- 📈 **Analytics** - Comprehensive product analytics and insights

---

## Quick Start

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

**Default Port:** `4755`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4755 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| HOJAI_PRODUCT_INTELLIGENCE_API_KEY | Yes | - | API key for service auth |
| CORS_ORIGIN | No | - | Comma-separated allowed origins |

---

## Authentication

All `/api/*` endpoints require authentication:

```bash
# JWT Token
curl -H "Authorization: Bearer <token>" http://localhost:4755/api/v1/products

# API Key
curl -H "X-API-Key: <api-key>" http://localhost:4755/api/v1/products
```

Health endpoints (`/health/*`) are publicly accessible.

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Full health check with memory stats |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

### Products (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List all products |
| POST | `/api/v1/products` | Create new product |
| GET | `/api/v1/products/:id` | Get product by ID |
| PUT | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Delete product |
| GET | `/api/v1/products/:id/analytics` | Get product analytics |

### Features (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products/:productId/features` | List features |
| POST | `/api/v1/products/:productId/features` | Create feature |
| GET | `/api/v1/products/:productId/features/:id` | Get feature |
| PUT | `/api/v1/products/:productId/features/:id` | Update feature |
| DELETE | `/api/v1/products/:productId/features/:id` | Delete feature |
| POST | `/api/v1/products/:productId/features/prioritize` | Prioritize features |

### Feedback (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/feedback` | List all feedback |
| POST | `/api/v1/feedback` | Create feedback |
| GET | `/api/v1/feedback/:id` | Get feedback |
| POST | `/api/v1/feedback/:id/respond` | Respond to feedback |

### Roadmap (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products/:productId/roadmap` | List roadmap items |
| POST | `/api/v1/products/:productId/roadmap` | Create roadmap item |
| GET | `/api/v1/products/:productId/roadmap/:id` | Get roadmap item |
| PUT | `/api/v1/products/:productId/roadmap/:id` | Update roadmap item |
| DELETE | `/api/v1/products/:productId/roadmap/:id` | Delete roadmap item |

### Metrics (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products/:productId/metrics` | List metrics |
| POST | `/api/v1/products/:productId/metrics` | Record metric |

### Analytics (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics` | Cross-product analytics |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x
- **Database:** MongoDB 6.x (Mongoose ODM)
- **Validation:** Zod 3.x
- **Logging:** Pino
- **Security:** Helmet, CORS, Rate Limiting

---

## Docker Deployment

```bash
# Build image
docker build -t hojai-product-intelligence .

# Run container
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

## Security Features

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| API Key Auth | ✅ |
| Rate Limiting (100/min) | ✅ |
| Input Validation (Zod) | ✅ |
| NoSQL Injection Prevention | ✅ |
| Mass Assignment Protection | ✅ |
| CORS Configuration | ✅ |
| Graceful Shutdown | ✅ |
| Request Correlation IDs | ✅ |
| Non-root Docker User | ✅ |
| Resource Limits | ✅ |

---

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm test -- --coverage
```

**Test Results:** ✅ **30 tests passing**

| Test Suite | Tests | Status |
|-----------|-------|--------|
| Product Schema Validation | 6 | ✅ |
| Product Feature Schema | 3 | ✅ |
| Product Feedback Schema | 7 | ✅ |
| Roadmap Item Schema | 2 | ✅ |
| Product Metric Schema | 2 | ✅ |
| RICE Scoring | 7 | ✅ |
| Create Request Schemas | 4 | ✅ |
| **Total** | **30** | **✅** |

---

## License

Proprietary - RTNM Digital

---

**Last Updated:** June 13, 2026
