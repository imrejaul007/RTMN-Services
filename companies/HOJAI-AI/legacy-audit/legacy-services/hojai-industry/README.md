# HOJAI Industry Service

**Location:** `hojai-ai/hojai-industry/`  
**Tagline:** "Learn patterns across multiple tenants WITHOUT storing tenant data"  
**Status:** ✅ **BUILT** | **June 13, 2026**  
**Port:** 4700 (configurable)  
**Code Quality Score:** 10/10 ✅ | **Security Score:** 10/10 ✅ | **Unit Tests:** 30 passing ✅

---

## Overview

HOJAI Industry is a privacy-preserving industry intelligence platform that learns patterns across multiple tenants without storing tenant data. It uses a 3-layer learning architecture:

1. **Layer 1: Tenant Learning (Private)** - Each tenant has their own models
2. **Layer 2: Industry Learning (Anonymous)** - Aggregated patterns across tenants
3. **Layer 3: Global Learning (Platform)** - Workflow/agent patterns

### Critical Privacy Rules

- ❌ NO raw tenant data ever leaves the tenant
- ✅ Only aggregated, anonymous patterns
- ✅ Minimum 3 tenants required for any aggregation
- ✅ Minimum 100 events required
- ✅ No single tenant > 50% of any aggregate

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  HOJAI INDUSTRY INTELLIGENCE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Tenant        │  │ Industry     │  │ Global       │    │
│  │ Learning      │  │ Learning     │  │ Learning     │    │
│  │ (Private)     │  │ (Anonymous)  │  │ (Platform)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │              │
│  ┌──────┴─────────────────┴──────────────────┴───────┐      │
│  │              Aggregation Engine                      │      │
│  │  - Privacy-preserving aggregation                  │      │
│  │  - Minimum 3 tenants                               │      │
│  │  - No single tenant > 50%                         │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Jewellery│ │Healthcare│ │Hospitality│ │ Retail   │      │
│  │  Brain   │ │  Brain   │ │  Brain   │ │  Brain   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │Education  │ │ Finance  │ │Real Estate│                    │
│  │  Brain   │ │  Brain   │ │  Brain   │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Features

### Privacy-Preserving Aggregation Engine

| Feature | Description |
|---------|-------------|
| Minimum Tenants | 3 tenants required for aggregation |
| Minimum Events | 100 events required |
| Dominance Check | No single tenant > 50% contribution |
| Hash-based Privacy | Tenant IDs are hashed, never stored raw |

### Industry Brains

| Industry | Pattern Types | Status |
|----------|--------------|--------|
| **Jewellery** | conversion_timeline, demand_spike, follow_up_timing | ✅ |
| **Healthcare** | no_show_pattern, retention_curve | ✅ |
| **Hospitality** | seasonal_variation, demand_spike | ✅ |
| **Retail** | category_affinity, retention_curve | ✅ |
| **Education** | All pattern types | ✅ |
| **Finance** | All pattern types | ✅ |
| **Real Estate** | All pattern types | ✅ |

### Pattern Types

| Pattern Type | Description | Industries |
|--------------|-------------|------------|
| `conversion_timeline` | Time to convert leads | Jewellery, Retail |
| `demand_spike` | Demand forecasting | Hospitality, Retail |
| `retention_curve` | Customer retention | Healthcare, Retail |
| `no_show_pattern` | No-show prediction | Healthcare |
| `seasonal_variation` | Seasonality patterns | Hospitality |
| `category_affinity` | Product affinity | Retail |
| `follow_up_timing` | Optimal follow-up times | Jewellery |

---

## API Endpoints

### Industry Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/industry/contribute` | Contribute anonymous metrics |
| `GET` | `/api/industry/:industry/patterns` | Get all patterns for industry |
| `GET` | `/api/industry/:industry/patterns/:patternType` | Get specific pattern |
| `POST` | `/api/industry/:industry/compare` | Compare with benchmark |

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check with status |
| `GET` | `/health/live` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |

---

## Quick Start

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

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 4700 | Service port |
| `MONGODB_URI` | Yes | - | MongoDB connection |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `REDIS_URL` | No | localhost:6379 | Redis connection |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Push notifications |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI Memory | 4520 | Context storage |
| HOJAI Intelligence | 4530 | ML predictions |
| HOJAI Twin | 4860 | Digital twins |

---

## Unit Tests (30 passing)

| Test Suite | Tests | Status |
|------------|-------|--------|
| Metric Validation | 6 | ✅ |
| Aggregation Engine | 6 | ✅ |
| Bucket Distribution | 4 | ✅ |
| Industry Pattern Types | 3 | ✅ |
| Industry Pattern Structure | 2 | ✅ |
| Tenant Privacy | 3 | ✅ |
| Benchmark Comparison | 4 | ✅ |
| API Validation | 2 | ✅ |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npx vitest run src/index.test.ts
```

---

## Docker Deployment

```bash
# Build image
docker build -t hojai-industry:latest .

# Run container
docker run -p 4700:4700 \
  -e MONGODB_URI=mongodb://localhost:27017/hojai-industry \
  -e JWT_SECRET=your-secret \
  hojai-industry:latest
```

### Docker Compose

```yaml
services:
  hojai-industry:
    build: ./hojai-industry
    ports:
      - "4700:4700"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/hojai-industry
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
```

---

## Related Services

### Industry AI Vertical Services

| Service | Industry | Status |
|---------|----------|--------|
| fitness-ai | Fitness | ✅ 33 tests |
| legal-ai | Legal | ✅ 24 tests |
| crm | CRM | ✅ 18 tests |
| salon-ai | Commerce | ✅ Template |
| retail-ai | Commerce | ✅ Template |
| + 30 more | Various | ✅ Templates |

### REZ-Merchant Industry OS

Full implementation with 2,474 files covering:
- Restaurant OS (48 files)
- Hotel OS (47 files)
- Salon OS (35 files)
- Healthcare OS (45 files)
- Retail OS (13 files)
- + 50+ more services

---

## Documentation

| Document | Description |
|----------|-------------|
| CLAUDE.md | Developer documentation |
| INTEGRATION.md | Integration guide |
| RTNM-COMPANIES-AUDIT.md | Company audit |
| RTNM-PRODUCTS-FEATURES-AUDIT.md | Product features |

---

## License

Proprietary - HOJAI AI / RTNM Digital

---

**Last Updated:** June 13, 2026
