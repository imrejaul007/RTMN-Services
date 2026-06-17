# AdBazaar - AI-Powered Commerce & Intent Intelligence Network

> **Version:** 3.0.0 | **Last Updated:** June 16, 2026  
> **Status:** ✅ **PRODUCTION READY** - 65+ Services, 850+ Files
> **New Services:** Inventory Service, Programmatic API, SSP, DSP, Attribution, Verification, Audience Marketplace

---

## 🎯 What Makes AdBazaar Different

| Feature | Traditional Ad Networks | AdBazaar |
|---------|------------------------|----------|
| **Intent Exchange** | ❌ | ✅ **Unique** |
| **Audience Twins** | ❌ | ✅ AI behavioral simulation |
| **Commerce Ads** | Clicks only | Click-to-book-to-pay |
| **Hyperlocal Targeting** | City level | **Apartment level** |
| **Retail Media** | ❌ | ✅ In-store + digital |
| **AI Campaign Agents** | ❌ | ✅ Autonomous optimization |
| **Creator QR** | ❌ | ✅ Shoppable codes |
| **BPO Integration** | ❌ | ✅ Native support |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADBAZAAR ECOSYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    AI INTELLIGENCE LAYER                           │ │
│  │                                                                      │ │
│  │  ┌─────────────────┐      ┌─────────────────────────────────────┐ │ │
│  │  │ HOJAI AI        │─────►│  REZ Intelligence Services           │ │ │
│  │  │ Gateway         │      │  • Intent Service (4018)             │ │ │
│  │  │ :4560           │      │  • Predictive Service (4141)         │ │ │
│  │  │                 │      │  • Identity Service (4050)           │ │ │
│  │  │ • Circuit       │      │  • Signals Service (4142)            │ │ │
│  │  │   Breakers      │      │  • Segments Service (4126)           │ │ │
│  │  │ • Redis Cache   │      │  • Commerce Service (4129)           │ │ │
│  │  │ • Rate Limit    │      │  • Decision Service (4027)            │ │ │
│  │  │ • Auth          │      │  • Attribution Service (4100)        │ │ │
│  │  └─────────────────┘      └─────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    INTENT EXCHANGE LAYER                           │ │
│  │                                                                      │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │ │
│  │  │ Intent Signal   │  │ Intent          │  │ Intent          │      │ │
│  │  │ Aggregator      │  │ Prediction      │  │ Marketplace     │      │ │
│  │  │ :4800           │  │ Engine          │  │ :4802           │      │ │
│  │  │                 │  │ :4801           │  │                 │      │ │
│  │  │ • 6 sources     │  │ • ML scoring    │  │ • Buy/sell      │      │ │
│  │  │ • Deduplication │  │ • Segmentation  │  │   audiences    │      │ │
│  │  │ • Enrichment    │  │ • Lookalikes    │  │ • Bidding       │      │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│  ┌──────────────────────────────��──────────────────────────────────────┐ │
│  │                    CAMPAIGN EXECUTION LAYER                         │ │
│  │                                                                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │ REZ-ads-    │  │ REZ-        │  │ REZ-        │  │ REZ-        │  │ │
│  │  │ service     │  │ marketing   │  │ decision-   │  │ gamification│  │ │
│  │  │ :4007       │  │ :4000       │  │ service     │  │ -service   │  │ │
│  │  │             │  │             │  │ :4027       │  │ :3001       │  │ │
│  │  │ • Serve ads │  │ • Campaigns │  │ • Targeting │  │ • Achievements│ │
│  │  │ • Click     │  │ • Broadcasts│  │ • Frequency │  │ • Streaks   │  │ │
│  │  │   tracking  │  │ • Audience  │  │ • Actions   │  │ • Rewards   │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Services Inventory

### Core Intelligence Services

| Service | Port | Files | Purpose |
|---------|------|-------|---------|
| **hojai-ai-gateway-v2** | 4560 | 12 | Central AI hub, connects to 8 REZ services |
| **intent-signal-aggregator** | 4800 | 16 | Collects signals from 6 sources |
| **intent-prediction-engine** | 4801 | 14 | ML scoring, segmentation, lookalikes |
| **intent-marketplace** | 4802 | 18 | Buy/sell audience segments |
| **intent-attribution** | 4803 | 14 | Multi-touch attribution tracking |

### DOOH Platform Services (NEW)

| Service | Port | Purpose |
|---------|------|---------|
| **adbazaar-inventory-service** | 4900 | Screen management, location intelligence |
| **adbazaar-programmatic-api** | 4940 | OpenRTB 2.5 exchange |
| **adbazaar-attribution-service** | 4950 | Multi-touch attribution |
| **adbazaar-verification-service** | 4970 | CV-based ad verification |
| **adbazaar-audience-marketplace** | 4960 | Buy/sell audience segments |
| **adbazaar-ssp** | 4980 | Supply-side platform |
| **adbazaar-dsp** | 4990 | Demand-side platform |

### Campaign Services

| Service | Port | Files | Purpose |
|---------|------|-------|---------|
| **REZ-ads-service** | 4007 | 30 | Core ad serving & tracking |
| **REZ-marketing** | 4000 | 74 | Campaigns, broadcasts, analytics |
| **REZ-decision-service** | 4027 | 42 | Targeting, frequency, actions |
| **REZ-gamification-service** | 3001 | 29 | Achievements, streaks, rewards |
| **REZ-economic-engine** | 5003 | 32 | Merchant coins, economics |

### Integration Services

| Service | Port | Files | Purpose |
|---------|------|-------|---------|
| **REZ-crm-hub** | 4056 | 20 | CRM, HubSpot/Zoho sync |
| **instagram-shop-integration** | 5080 | 20 | IG shopping, products, orders |
| **REZ-feedback-service** | - | 24 | Feedback collection & analysis |
| **REZ-lead-intelligence** | - | 12 | Lead scoring & nurturing |

### Programmatic & RTB

| Service | Port | Files | Purpose |
|---------|------|-------|---------|
| **openrtb-exchange-service** | - | 16 | OpenRTB bid exchange |
| **REZ-rtb-service** | - | 6 | Real-time bidding |
| **REZ-programmatic-bidding** | - | 10 | Programmatic ad buying |
| **rez-dsp-bidder** | - | 12 | DSP bidder implementation |

### Voice & Automation

| Service | Port | Files | Purpose |
|---------|------|-------|---------|
| **rez-voice-cart-recovery** | - | 19 | Voice-based cart recovery |
| **rez-voice-billing** | - | 20 | Voice commerce billing |
| **rez-chatbot-builder-ui** | - | - | Chatbot creation UI |

---

## 🧠 HOJAI AI Intelligence

### How HOJAI Powers AdBazaar

HOJAI AI provides intelligence through the **HOJAI AI Gateway** (port 4560), which acts as a central hub connecting AdBazaar to 8 REZ Intelligence services:

#### 1. Intent Prediction
```
User Action → Signal Aggregator → Intent Service → HOJAI Gateway → Campaign Decision
```
- Predicts user intent (browse, purchase, research, loyalty, re-engage)
- Confidence scoring (0-1)
- Real-time intent updates

#### 2. Behavior Prediction
```
User Profile → Predictive Service → Churn/LTV Models → Audience Segmentation
```
- Churn probability (low/medium/high)
- Lifetime Value (LTV) scoring
- Next purchase category prediction

#### 3. Audience Intelligence
```
Signal Data → Segments Service → Lookalike Engine → Marketplace Segments
```
- Pre-built segments (Active Buyers, Dormant Interest, Near Purchase)
- Custom segment generation
- Quality scoring (72-98)
- Conversion rate prediction

#### 4. Campaign Optimization
```
Campaign Request → Decision Service → Targeting Engine → Ad Selection
```
- Budget optimization
- CTR/CPM prediction
- ROAS forecasting
- Creative performance prediction

### HOJAI AI Endpoints

| Endpoint | Method | Purpose | Cache TTL |
|----------|--------|---------|-----------|
| `/api/intent/predict` | POST | Intent prediction | 5 min |
| `/api/behavior/predict` | POST | Churn & LTV | 10 min |
| `/api/audience/segments` | POST | Segment generation | 3 min |
| `/api/targeting/optimize` | POST | Targeting params | No cache |
| `/api/campaign/predict` | POST | Campaign metrics | No cache |
| `/api/creative/generate` | POST | Ad copy generation | No cache |
| `/api/leads/score` | POST | Lead scoring | No cache |
| `/api/fraud/detect` | POST | Fraud detection | No cache |
| `/api/content/personalize` | POST | Content personalization | No cache |
| `/api/action/next-best` | POST | Next best action | No cache |
| `/api/recommendations` | POST | Product recommendations | 3 min |

---

## 🔌 Signal Sources

AdBazaar collects intent signals from these ecosystem services:

| Source | Description | Signal Types |
|-------|-------------|--------------|
| **buzzlocal** | Local discovery | search, view, wishlist |
| **airzy** | Travel/Airzy | search, view, cart_add |
| **rez-menu-qr** | QR menu/ordering | view, cart_add, fulfilled |
| **rez-now** | Quick commerce | search, cart_add, checkout_start |
| **risacare** | Healthcare | search, view, wishlist |
| **corpperks** | Corporate benefits | view, cart_add, fulfilled |

---

## 📊 API Documentation

### Quick Start

```bash
# Start HOJAI AI Gateway
cd hojai-ai-gateway-v2
npm install
npm run dev

# Start Intent Signal Aggregator
cd intent-signal-aggregator
npm install
npm run dev

# Start Intent Prediction Engine
cd intent-prediction-engine
npm install
npm run dev
```

### Environment Variables

```bash
# HOJAI AI Gateway
PORT=4560
ADMIN_TOKEN=your-admin-token
HOJAI_API_KEYS=key1,key2
REDIS_URL=redis://localhost:6379
REZ_INTENT_SERVICE_URL=http://localhost:4018
REZ_PREDICTIVE_SERVICE_URL=http://localhost:4141
# ... (see .env.example)

# Intent Signal Aggregator
PORT=4800
MONGODB_URI=mongodb://localhost:27017/intent-signals
REDIS_URL=redis://localhost:6379
INTERNAL_SERVICE_TOKENS_JSON={"service":"token"}
```

### Example API Calls

#### Predict User Intent
```bash
curl -X POST http://localhost:4560/api/intent/predict \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-admin-token" \
  -d '{
    "userId": "user-123",
    "context": {
      "category": "DINING",
      "recentSearches": ["pizza", "italian restaurant"]
    }
  }'
```

#### Ingest Intent Signal
```bash
curl -X POST http://localhost:4800/api/signals/ingest \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service: hojai-ai-gateway" \
  -H "X-Internal-Token: your-token" \
  -d '{
    "source": "buzzlocal",
    "sourceService": "rez-search",
    "userId": "user-123",
    "eventType": "search",
    "category": "DINING",
    "intentKey": "italian-restaurant",
    "intentQuery": "italian restaurant near me"
  }'
```

#### Get Audience Segments
```bash
curl -X POST http://localhost:4560/api/audience/segments \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-admin-token" \
  -d '{
    "criteria": {
      "category": "RETAIL",
      "minQualityScore": 80,
      "maxPrice": 2.00
    }
  }'
```

---

## 🚀 Deployment

### Development
```bash
# Install dependencies for all services
for dir in */; do
  cd "$dir"
  if [ -f package.json ]; then
    npm install
  fi
  cd ..
done

# Start individual services
cd hojai-ai-gateway-v2 && npm run dev
cd intent-signal-aggregator && npm run dev
```

### Production (Render)

```yaml
# render.yaml
services:
  - type: web
    name: hojai-ai-gateway
    env: node
    region: singapore
    plan: starter
    envVars:
      - key: PORT
        value: 4560
      - key: ADMIN_TOKEN
        sync: false
      - key: REDIS_URL
        fromService:
          type: redis
          name: adbazaar-redis
```

---

## 📈 Monitoring

### Health Checks

All services expose standard health endpoints:

| Endpoint | Purpose |
|----------|---------|
| `/health` | Basic health check |
| `/health/live` | Liveness probe |
| `/health/ready` | Readiness probe |
| `/metrics` | Prometheus metrics |

### Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `hojai_http_requests_total` | Counter | Total HTTP requests |
| `hojai_http_request_duration_seconds` | Histogram | Request latency |
| `hojai_ai_predictions_total` | Counter | AI predictions by type |
| `hojai_cache_hits_total` | Counter | Cache hits |
| `hojai_cache_misses_total` | Counter | Cache misses |
| `hojai_circuit_breaker_state` | Gauge | Circuit breaker status |

---

## 🔒 Security

### Authentication

Services use internal service tokens for authentication:

```bash
# Header format
X-Internal-Service: service-name
X-Internal-Token: service-token
```

### Rate Limiting

- Default: 100 requests per minute
- Configurable via environment variables
- Returns `429 Too Many Requests` when exceeded

### Circuit Breakers

Each REZ service connection has a circuit breaker:
- Opens after 5 consecutive failures
- Stays open for 60 seconds
- Returns fallback data when open

---

## 📝 License

Proprietary - RTMN Ecosystem

---

## 🆘 Support

- **Documentation**: [API-DOCUMENTATION.md](API-DOCUMENTATION.md)
- **Service Registry**: http://localhost:4399/api/services
- **Slack**: #adbazaar-support
