# HOJAI SiteOS - Widget Intelligence Layer

Production-ready intelligence services for HOJAI SiteOS widget ecosystem.

## Services

| Service | Port | Description |
|---------|------|-------------|
| **widget-intelligence** | 5401 | Lead scoring engine with weighted signals, velocity bonuses, and recency decay |
| **widget-customer-twin** | 5402 | Complete Customer Twin with identity, behavior, signals, and predictive analytics |
| **widget-automation** | 5411 | Marketing automation rules engine with 5 core automation rules |
| **widget-analytics** | 5403 | Lightweight heatmap and session recording service |

## Quick Start

```bash
# Install dependencies for each service
cd widget-intelligence && npm install
cd widget-customer-twin && npm install
cd widget-automation && npm install
cd widget-analytics && npm install

# Start all services
cd widget-intelligence && npm start &
cd widget-customer-twin && npm start &
cd widget-automation && npm start &
cd widget-analytics && npm start &
```

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Widget Intelligence         │
                    │            (Port 5401)              │
                    ├─────────────────────────────────────┤
                    │  Lead Scoring:                      │
                    │  - Weighted signals                 │
                    │  - Velocity bonuses (1.5x, 1.3x)   │
                    │  - Recency decay (1.2x → 0.5x)     │
                    │  - Tier classification              │
                    └─────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Customer Twin      │    │   Automation        │    │   Analytics         │
│  (Port 5402)        │    │   (Port 5411)       │    │   (Port 5403)       │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│  Identity           │    │  Rules Engine:      │    │  Session Recording: │
│  Behavior           │    │  - Abandoned cart   │    │  - Clicks           │
│  Signals            │    │  - Welcome series   │    │  - Scrolls          │
│  Predictive         │    │  - Win back         │    │  - Mouse moves      │
│  Consent            │    │  - Post purchase    │    │  - Rage/dead clicks │
│                     │    │  - Birthday         │    │                     │
│                     │    │                     │    │  Heatmaps:          │
│                     │    │  Actions:           │    │  - Click density    │
│                     │    │  - WhatsApp         │    │  - Hotspots         │
│                     │    │  - Email            │    │  - Session replay   │
│                     │    │  - Slack notify     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Lead Scoring (widget-intelligence)

### Signal Weights

| Signal | Weight |
|--------|--------|
| checkout_start | +30 |
| email_subscribe | +25 |
| add_to_cart | +20 |
| compare_products | +20 |
| download_pdf | +20 |
| pricing_visit | +15 |
| whatsapp_click | +15 |
| repeat_visit | +10 |
| exit_intent | +10 |
| product_view | +5 |

### Velocity Bonus

- 3+ signals in 1 hour: **1.5x multiplier**
- 5+ signals in 1 day: **1.3x multiplier**

### Recency Decay

| Time Since Last Signal | Multiplier |
|------------------------|------------|
| < 1 hour | 1.2x |
| < 24 hours | 1.0x |
| < 7 days | 0.8x |
| > 7 days | 0.5x |

### API Endpoints

```bash
# Record a signal
POST /api/intelligence/signal
{
  "visitorId": "visitor-123",
  "type": "add_to_cart",
  "sessionId": "session-456"
}

# Get lead score
POST /api/intelligence/lead-score
{
  "visitorId": "visitor-123"
}

# Get lead profile
GET /api/intelligence/lead/:visitorId
```

## Customer Twin (widget-customer-twin)

### Twin Structure

```javascript
{
  visitorId: "visitor-123",
  identity: {
    name, email, phone, company,
    location, device, browser, language,
    identified, identifiedAt
  },
  behavior: {
    firstVisit, lastVisit, visitCount,
    pagesViewed, purchases, totalSpent,
    avgSessionDuration, preferredCategories
  },
  signals: {
    leadScore, intentLevel, churnRisk,
    ltv, purchaseProbability, engagementScore
  },
  predictive: {
    nextBestAction, predictedChurnDate,
    predictedLtv, recommendedProducts
  },
  consent: {
    marketing, whatsapp, dataRetention,
    gdprConsent, consentHistory
  }
}
```

### API Endpoints

```bash
# Identify visitor
POST /api/twin/:visitorId/identify
{
  "email": "user@example.com",
  "name": "John Doe"
}

# Record signal
POST /api/twin/:visitorId/signal
{
  "type": "product_view",
  "productId": "prod-123"
}

# Get twin
GET /api/twin/:visitorId

# Get summary
GET /api/twin/:visitorId/summary
```

## Automation (widget-automation)

### Core Rules

1. **Abandoned Cart** - 15min WhatsApp, 6hr email, 24hr coupon
2. **Welcome Series** - 3 emails over 7 days
3. **Win Back** - 60+ days inactive
4. **Post Purchase** - Follow-up + review request
5. **Birthday Campaign** - Celebratory outreach

### Rule Format

```javascript
{
  name: "Abandoned Cart Recovery",
  trigger: "cart_abandoned",
  conditions: [],
  actions: [
    { type: "whatsapp", delay: 15, template: "cart_recovery" },
    { type: "email", delay: 360, template: "cart_recovery_email" },
    { type: "email", delay: 1440, template: "cart_recovery_coupon" }
  ]
}
```

### API Endpoints

```bash
# Trigger a rule
POST /api/automation/trigger/:ruleId
{
  "visitorId": "visitor-123",
  "context": { "cartValue": 99.99 }
}

# Create custom rule
POST /api/automation/rules

# Get executions
GET /api/automation/executions/:visitorId
```

## Analytics (widget-analytics)

### Event Types

- `click` - Element clicks
- `scroll` - Page scrolling
- `mouse_move` - Mouse movements
- `rage_click` - 3+ rapid clicks on same element
- `dead_click` - Clicks on non-interactive elements
- `page_view` - Page impressions
- `session_start/end` - Session boundaries

### API Endpoints

```bash
# Create session
POST /api/analytics/session
{
  "visitorId": "visitor-123",
  "url": "/products/widget"
}

# Add event
POST /api/analytics/session/:sessionId/event
{
  "type": "click",
  "x": 100,
  "y": 200,
  "target": "button#buy"
}

# Get heatmap
GET /api/analytics/heatmap/:pageId

# Get sessions
GET /api/analytics/sessions/:visitorId
```

## Testing

```bash
# Run tests for all services
cd widget-intelligence && npm test
cd widget-customer-twin && npm test
cd widget-automation && npm test
cd widget-analytics && npm test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | Service-specific | HTTP port |
| `LOG_LEVEL` | info | Logging level |
| `NODE_ENV` | development | Environment |
| `ALLOWED_ORIGINS` | * | CORS origins |

## License

Proprietary - HOJAI AI