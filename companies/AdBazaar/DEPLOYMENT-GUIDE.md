# AdBazaar Deployment Guide

> **Version:** 3.0.0 | **Last Updated:** June 16, 2026

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+
- npm or yarn

### Clone & Install

```bash
cd companies/AdBazaar

# Install dependencies for all services
for dir in */; do
  if [ -f "$dir/package.json" ]; then
    echo "Installing $dir..."
    cd "$dir" && npm install && cd ..
  fi
done
```

### Start All Services

```bash
# Start HOJAI AI Gateway
cd hojai-ai-gateway-v2 && npm run dev &

# Start Intent Signal Aggregator
cd intent-signal-aggregator && npm run dev &

# Start Inventory Service
cd adbazaar-inventory-service && npm run dev &

# Start Programmatic API
cd adbazaar-programmatic-api && npm run dev &

# Start Attribution Service
cd adbazaar-attribution-service && npm run dev &

# Start Audience Marketplace
cd adbazaar-audience-marketplace && npm run dev &
```

---

## 📦 Service Details

### 1. HOJAI AI Gateway (Port 4560)

**Purpose:** Central AI intelligence hub connecting AdBazaar to REZ Intelligence services.

**Configuration:**
```bash
cd hojai-ai-gateway-v2
cp .env.example .env
# Edit .env with your values
```

**Environment Variables:**
```env
PORT=4560
ADMIN_TOKEN=your-secure-token
HOJAI_API_KEYS=key1,key2
REDIS_URL=redis://localhost:6379
REZ_INTENT_SERVICE_URL=http://localhost:4018
REZ_PREDICTIVE_SERVICE_URL=http://localhost:4141
REZ_IDENTITY_SERVICE_URL=http://localhost:4050
REZ_SIGNAL_SERVICE_URL=http://localhost:4142
REZ_SEGMENT_SERVICE_URL=http://localhost:4126
REZ_COMMERCE_SERVICE_URL=http://localhost:4129
REZ_DECISION_SERVICE_URL=http://localhost:4027
REZ_ATTRIBUTION_SERVICE_URL=http://localhost:4100
```

**Key Endpoints:**
- `POST /api/intent/predict` - Predict user intent
- `POST /api/behavior/predict` - Churn & LTV prediction
- `POST /api/audience/segments` - Generate audience segments
- `POST /api/campaign/predict` - Campaign performance prediction
- `POST /api/leads/score` - Lead scoring
- `POST /api/fraud/detect` - Fraud detection
- `POST /api/recommendations` - Product recommendations

---

### 2. Intent Signal Aggregator (Port 4800)

**Purpose:** Collects and processes intent signals from the REZ ecosystem.

**Configuration:**
```bash
cd intent-signal-aggregator
cp .env.example .env
```

**Environment Variables:**
```env
PORT=4800
MONGODB_URI=mongodb://localhost:27017/intent-signals
REDIS_URL=redis://localhost:6379
INTERNAL_SERVICE_TOKENS_JSON={"intent-signal-aggregator":"token","hojai-ai-gateway":"token"}
```

**Signal Sources:**
- `buzzlocal` - Local discovery
- `airzy` - Travel
- `rez-menu-qr` - QR ordering
- `rez-now` - Quick commerce
- `risacare` - Healthcare
- `corpperks` - Corporate

**Key Endpoints:**
- `POST /api/signals/ingest` - Ingest single signal
- `POST /api/signals/batch` - Batch ingest
- `GET /api/signals/stats` - Get statistics
- `GET /api/signals/user/:userId` - Get user signals

---

### 3. Inventory Service (Port 4900)

**Purpose:** Manages physical DOOH inventory (screens, billboards, locations).

**Configuration:**
```bash
cd adbazaar-inventory-service
cp .env.example .env
```

**Environment Variables:**
```env
PORT=4900
MONGODB_URI=mongodb://localhost:27017/adbazaar-inventory
HOJAI_GATEWAY_URL=http://localhost:4560
ADMIN_TOKEN=your-secure-token
INTERNAL_SERVICE_TOKENS_JSON={"adbazaar-inventory-service":"token"}
```

**Screen Types:**
- `billboard_digital`
- `bus_shelter`
- `bus_interior`
- `metro_screen`
- `airport_display`
- `airport_gate`
- `airport_lounge`
- `mall_kiosk`
- `restaurant_tv`
- `hotel_lobby`
- `gym_screen`
- `office_elevator`
- `cab_tablet`

**Key Endpoints:**
- `POST /api/inventory/screens` - Register screen
- `GET /api/inventory/screens` - List screens
- `GET /api/inventory/screens/:id` - Get screen details
- `GET /api/inventory/search` - Search screens
- `GET /api/locations/areas` - List areas
- `GET /api/locations/cities` - List cities with screens

---

### 4. Programmatic API (Port 4940)

**Purpose:** OpenRTB 2.5 compliant DOOH exchange.

**Configuration:**
```bash
cd adbazaar-programmatic-api
cp .env.example .env
```

**Environment Variables:**
```env
PORT=4940
REDIS_URL=redis://localhost:6379
INVENTORY_SERVICE_URL=http://localhost:4900
HOJAI_GATEWAY_URL=http://localhost:4560
AUCTION_TIMEOUT=100
MIN_BID=0.5
FLOOR_PRICE=1
```

**Key Endpoints:**
- `POST /openrtb/bid` - Bid request (OpenRTB)
- `POST /bid/quote` - Get bid quote
- `POST /bid/place` - Place bid
- `GET /admin/floor-prices` - Get floor prices

---

### 5. Attribution Service (Port 4950)

**Purpose:** Multi-touch attribution for DOOH campaigns.

**Configuration:**
```bash
cd adbazaar-attribution-service
# No .env needed for basic setup
```

**Key Endpoints:**
- `POST /api/track` - Track impression/interaction
- `POST /api/conversion` - Track conversion
- `GET /api/report/:campaignId` - Get attribution report
- `GET /api/roas/:campaignId` - Get ROAS breakdown
- `POST /api/visits` - Record store visit

**Attribution Models:**
- First Touch
- Last Touch
- Linear
- Time Decay
- Position Based

---

### 6. Audience Marketplace (Port 4960)

**Purpose:** Buy and sell audience segments.

**Key Endpoints:**
- `GET /api/segments` - List segments
- `GET /api/segments/:id` - Get segment details
- `POST /api/segments/create` - Create custom segment
- `POST /api/purchase` - Purchase segment access

**Pre-built Segments:**
| Segment | Quality | CPM | Description |
|---------|---------|-----|-------------|
| Active Buyers | 95 | $2.50 | High purchase intent |
| Dormant Interest | 72 | $0.75 | Past interest, win-back |
| Near Purchase | 98 | $4.00 | Checkout started |
| Travel Enthusiasts | 88 | $2.00 | Travel researchers |
| Dining Out | 85 | $1.50 | Restaurant lovers |
| Health & Fitness | 82 | $1.75 | Wellness focused |

---

### 7. Verification Service (Port 4970)

**Purpose:** Computer Vision-based ad verification.

**Key Endpoints:**
- `POST /api/verify` - Verify ad display (multipart image)
- `POST /api/verify/url` - Verify from image URL
- `GET /api/proof/:campaignId` - Get proof of play
- `POST /api/compliance/check` - Check compliance

---

### 8. SSP Service (Port 4980)

**Purpose:** Supply-Side Platform for media owners.

**Key Endpoints:**
- `GET /api/inventory` - Get screen inventory
- `POST /api/inventory/screens` - Add screen
- `GET /api/campaigns` - See campaigns on screens
- `GET /api/earnings` - View earnings
- `POST /api/earnings/withdraw` - Request withdrawal

---

### 9. DSP Service (Port 4990)

**Purpose:** Demand-Side Platform for advertisers.

**Key Endpoints:**
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/launch` - Launch campaign
- `GET /api/audiences` - Get available audiences
- `POST /api/targeting/suggest` - AI targeting suggestions
- `GET /api/reports/:campaignId` - Performance report

---

## 🔌 Service Integration

### How Services Connect

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADBAZAAR SERVICE MESH                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    HOJAI AI LAYER                                 │   │
│   │                                                                      │   │
│   │   ┌───────────────┐                                               │   │
│   │   │ HOJAI AI     │◄──── REZ Intelligence Services                 │   │
│   │   │ Gateway      │                                               │   │
│   │   │ :4560        │────► Intent Signal Aggregator (4800)           │   │
│   │   └───────────────┘────► Intent Prediction Engine (4801)           │   │
│   │          │                                                             │   │
│   │          │                    ┌───────────────┐                       │   │
│   │          └───────────────────►│ Inventory     │                       │   │
│   │                               │ Service       │                       │   │
│   │                               │ :4900        │                       │   │
│   │                               └───────┬───────┘                       │   │
│   └─────────────────────────────────────│───────────────────────────────┘   │
│                                          │                                   │
│   ┌─────────────────────────────────────│───────────────────────────────┐   │
│   │                    PROGRAMMATIC LAYER                                │   │
│   │                                                                      │   │
│   │   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐        │   │
│   │   │ Programmatic  │◄──│ SSP          │───►│ DSP          │        │   │
│   │   │ API          │   │ :4980        │   │ :4990        │        │   │
│   │   │ :4940        │   └───────────────┘   └───────────────┘        │   │
│   │   └───────────────┘                                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                          │                                   │
│   ┌─────────────────────────────────────│───────────────────────────────┐   │
│   │                    INTELLIGENCE LAYER                             │   │
│   │                                                                      │   │
│   │   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐        │   │
│   │   │ Attribution   │   │ Audience      │   │ Verification  │        │   │
│   │   │ Service      │   │ Marketplace    │   │ Service       │        │   │
│   │   │ :4950        │   │ :4960         │   │ :4970         │        │   │
│   │   └───────────────┘   └───────────────┘   └───────────────┘        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Port Configuration

| Service | Port | Connects To |
|---------|------|-------------|
| hojai-ai-gateway | 4560 | REZ Intelligence (4018, 4141, 4050, 4142, 4126, 4129, 4027, 4100) |
| intent-signal-aggregator | 4800 | HOJAI Gateway, MongoDB, Redis |
| intent-prediction-engine | 4801 | HOJAI Gateway, MongoDB |
| inventory-service | 4900 | HOJAI Gateway, MongoDB |
| programmatic-api | 4940 | Inventory Service, Redis |
| attribution-service | 4950 | HOJAI Gateway |
| audience-marketplace | 4960 | HOJAI Gateway |
| verification-service | 4970 | (Standalone) |
| ssp | 4980 | Inventory Service |
| dsp | 4990 | Inventory Service, HOJAI Gateway |

---

## 🐳 Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Infrastructure
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  # AdBazaar Services
  hojai-gateway:
    build: ./hojai-ai-gateway-v2
    ports:
      - "4560:4560"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  intent-aggregator:
    build: ./intent-signal-aggregator
    ports:
      - "4800:4800"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/intent-signals
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis

  inventory-service:
    build: ./adbazaar-inventory-service
    ports:
      - "4900:4900"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/adbazaar-inventory
      - HOJAI_GATEWAY_URL=http://hojai-gateway:4560
    depends_on:
      - mongodb
      - hojai-gateway

  programmatic-api:
    build: ./adbazaar-programmatic-api
    ports:
      - "4940:4940"
    environment:
      - REDIS_URL=redis://redis:6379
      - INVENTORY_SERVICE_URL=http://inventory-service:4900
      - HOJAI_GATEWAY_URL=http://hojai-gateway:4560
    depends_on:
      - redis
      - inventory-service

  attribution-service:
    build: ./adbazaar-attribution-service
    ports:
      - "4950:4950"

  audience-marketplace:
    build: ./adbazaar-audience-marketplace
    ports:
      - "4960:4960"

  verification-service:
    build: ./adbazaar-verification-service
    ports:
      - "4970:4970"

  ssp:
    build: ./adbazaar-ssp
    ports:
      - "4980:4980"

  dsp:
    build: ./adbazaar-dsp
    ports:
      - "4990:4990"

volumes:
  mongodb_data:
```

### Deploy

```bash
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f hojai-gateway
```

---

## ☁️ Cloud Deployment (Render)

### render.yaml

```yaml
services:
  # Infrastructure
  - type: redis
    name: adbazaar-redis
    plan: starter

  # Core Services
  - type: web
    name: hojai-gateway
    env: node
    region: singapore
    plan: starter
    envVars:
      - key: PORT
        value: 4560
      - key: REDIS_URL
        fromService:
          type: redis
          name: adbazaar-redis
      - key: ADMIN_TOKEN
        sync: false
      - key: NODE_ENV
        value: production

  - type: web
    name: intent-aggregator
    env: node
    region: singapore
    plan: starter
    envVars:
      - key: PORT
        value: 4800
      - key: NODE_ENV
        value: production
    buildCommand: npm install && npm run build
    startCommand: npm start

  - type: web
    name: inventory-service
    env: node
    region: singapore
    plan: starter
    envVars:
      - key: PORT
        value: 4900
      - key: NODE_ENV
        value: production
    buildCommand: npm install && npm run build
    startCommand: npm start

  - type: web
    name: programmatic-api
    env: node
    region: singapore
    plan: starter
    envVars:
      - key: PORT
        value: 4940
      - key: NODE_ENV
        value: production
    buildCommand: npm install && npm run build
    startCommand: npm start
```

---

## 🔍 Health Checks

All services expose standard health endpoints:

```bash
# Basic health
curl http://localhost:4560/health

# Liveness
curl http://localhost:4560/health/live

# Readiness
curl http://localhost:4560/health/ready

# Detailed (HOJAI Gateway)
curl http://localhost:4560/health/detailed

# Prometheus metrics
curl http://localhost:4560/metrics
```

---

## 📊 Monitoring

### Prometheus Metrics

Each service exposes metrics at `/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request latency |
| `ai_predictions_total` | Counter | AI predictions |
| `cache_hits_total` | Counter | Cache hits |
| `cache_misses_total` | Counter | Cache misses |
| `circuit_breaker_state` | Gauge | Circuit status |

### Dashboard

Import `grafana-dashboard.json` into Grafana for pre-built dashboards.

---

## 🔒 Security

### Authentication

```bash
# Admin token
curl -H "X-Admin-Token: your-token" ...

# Internal service token
curl -H "X-Internal-Service: service-name" \
     -H "X-Internal-Token: service-token" ...
```

### Rate Limiting

Default: 100 requests/minute per client

Headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1623840000
```

---

## 🧪 Testing

```bash
# Test HOJAI Gateway
curl -X POST http://localhost:4560/api/intent/predict \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-token" \
  -d '{"userId": "test-user", "context": {"category": "DINING"}}'

# Test Intent Aggregator
curl -X POST http://localhost:4800/api/signals/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "buzzlocal",
    "sourceService": "test",
    "userId": "test-user",
    "eventType": "search",
    "category": "DINING",
    "intentKey": "pizza"
  }'

# Test Inventory
curl http://localhost:4900/api/inventory/screens

# Test Programmatic API
curl -X POST http://localhost:4940/openrtb/bid \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-req-1",
    "imp": [{"id": "1", "tagid": "screen_001"}]
  }'
```

---

## 🐛 Troubleshooting

### Service Won't Start

1. Check MongoDB connection:
```bash
mongosh mongodb://localhost:27017
```

2. Check Redis connection:
```bash
redis-cli ping
```

3. Check environment variables:
```bash
cat .env
```

### High Latency

1. Check circuit breakers:
```bash
curl http://localhost:4560/api/circuit-breakers
```

2. Check cache hit rate:
```bash
curl http://localhost:4560/api/cache/stats
```

3. Check database indexes:
```javascript
db.screens.getIndexes()
```

### Out of Memory

1. Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

2. Check Redis memory:
```bash
redis-cli info memory
```

---

## 📞 Support

- **Documentation:** `/docs`
- **API Reference:** [API-DOCUMENTATION.md](API-DOCUMENTATION.md)
- **Slack:** #adbazaar-support
- **Email:** adbazaar@rtmn.io
