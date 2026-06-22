# HOJAI Cross-Company Journey Service

**Unified Customer Journey Tracking Across ALL RTNM Companies**

---

## Overview

The Cross-Company Journey Service creates a **UNIFIED JOURNEY** that tracks customers across **ALL RTNM Group companies** - the biggest moat REZ can build. This service captures every customer interaction across 20+ companies and provides deep analytics, pattern detection, and AI-powered predictions.

### Key Capabilities

- **Unified Timeline**: Track customer interactions across all companies in a single view
- **Cross-Company Patterns**: Detect behaviors that span multiple RTNM services
- **Health Scoring**: Real-time customer health metrics (RFM + behavioral)
- **Churn Prediction**: AI-powered churn risk detection
- **LTV Forecasting**: Predict customer lifetime value
- **Journey Velocity**: Track customer progress through journey phases
- **Webhook Integration**: Real-time event ingestion from any company

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOJAI CROSS-COMPANY JOURNEY                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐     │
│  │   Companies  │     │  Event Aggregator│     │  Pattern Detection  │     │
│  │   (Webhooks) │────▶│                  │────▶│                     │     │
│  └──────────────┘     └──────────────────┘     └─────────────────────┘     │
│                               │                            │                 │
│                               ▼                            ▼                 │
│  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐     │
│  │    Journey   │◀────│    MongoDB       │◀────│  Journey Analytics  │     │
│  │    Service   │     │                  │     │                     │     │
│  └──────────────┘     └──────────────────┘     └─────────────────────┘     │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────┐     ┌──────────────────┐                             │
│  │    Export    │     │  Company Registry │                             │
│  │    Service   │     │  (20+ companies) │                             │
│  └──────────────┘     └──────────────────┘                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Port & Service Info

| Property | Value |
|----------|-------|
| **Port** | 4598 |
| **Service Name** | hojai-cross-company-journey |
| **Company** | HOJAI AI (RTNM Group) |
| **Database** | MongoDB |

---

## Supported Companies

The service is pre-configured for all RTNM companies:

### Core Platform (RABTUL)
- `rez-auth` - Authentication & Identity
- `rez-payment` - Payment Processing
- `rez-wallet` - Digital Wallet

### Vertical Companies
- `rez-commerce` - Consumer & Merchant E-commerce
- `rez-stayown` - Hotel Hospitality
- `ridza` - Financial Marketplace
- `ridza-finance` - AI Finance OS
- `neXha` - Distribution Network
- `corpperks` - Enterprise SaaS
- `risacare` - Healthcare
- `khairmove` - Mobility Services
- `airzy` - Travel Services
- `risnaestate` - Real Estate
- `axom` - Life AI

### AI Services
- `genie` - Personal AI Assistant
- `razo` - Revenue AI OS
- `rez-intelligence` - 247+ AI/ML Services
- `hojai-core` - AI Infrastructure

### Consumer Apps
- `go4food` - Food Discovery

---

## API Endpoints

### Journey Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/journey/:customerId` | Get unified journey |
| `GET` | `/api/journey/:customerId/timeline` | Get unified timeline |
| `GET` | `/api/journey/:customerId/company/:companyId` | Company-specific timeline |
| `GET` | `/api/journey/:customerId/phases` | Journey phases |
| `GET` | `/api/journey/:customerId/milestones` | Key milestones |
| `GET` | `/api/journey/:customerId/health` | Health score |
| `POST` | `/api/journey/:customerId/event` | Track event |
| `GET` | `/api/journey/:customerId/analytics` | Full analytics |
| `GET` | `/api/journey/:customerId/patterns` | Detected patterns |
| `GET` | `/api/journey/:customerId/predictions` | AI predictions |
| `GET` | `/api/journey/:customerId/export` | Export journey |
| `GET` | `/api/journey/:customerId/summary` | AI summary |
| `POST` | `/api/journey/:customerId/share/:agentId` | Share with agent |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/journey/webhook/:companyId` | Receive webhook |
| `POST` | `/api/journey/webhook/:companyId/batch` | Batch webhooks |

### Company Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/journey/companies/list` | List companies |
| `GET` | `/api/journey/companies/:companyId` | Get company |
| `GET` | `/api/journey/companies/:companyId/stats` | Company stats |
| `POST` | `/api/journey/companies` | Register company |
| `PUT` | `/api/journey/companies/:companyId` | Update company |
| `DELETE` | `/api/journey/companies/:companyId` | Delete company |

---

## Event Types

| Event | Description |
|-------|-------------|
| `page_view` | Page viewed |
| `click` | Element clicked |
| `purchase` | Purchase completed |
| `signup` | User signed up |
| `login` | User logged in |
| `logout` | User logged out |
| `search` | Search performed |
| `form_submit` | Form submitted |
| `support_ticket` | Support ticket created |
| `review` | Review submitted |
| `referral` | Referral made |
| `subscription` | Subscription change |
| `payment` | Payment processed |
| `refund` | Refund issued |
| `feedback` | Feedback given |
| `cart_add` | Item added to cart |
| `cart_remove` | Item removed from cart |
| `checkout_start` | Checkout started |
| `checkout_complete` | Checkout completed |
| `custom` | Custom event |

---

## Channels

| Channel | Description |
|---------|-------------|
| `web` | Website |
| `mobile_app` | Mobile application |
| `whatsapp` | WhatsApp |
| `email` | Email |
| `sms` | SMS |
| `call` | Phone call |
| `social` | Social media |
| `pos` | Point of Sale |
| `api` | API integration |

---

## Journey Phases

1. **awareness** - Customer discovers the brand
2. **consideration** - Customer evaluates options
3. **decision** - Customer makes a decision
4. **purchase** - Transaction occurs
5. **retention** - Customer is retained
6. **advocacy** - Customer refers others
7. **churned** - Customer left
8. **reactivated** - Customer returned

---

## Usage Examples

### Track an Event

```bash
curl -X POST http://localhost:4598/api/journey/customer123/event \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "rez-commerce",
    "eventType": "purchase",
    "channel": "mobile_app",
    "properties": {
      "orderId": "ORD-12345",
      "totalAmount": 2999,
      "productCategory": "electronics"
    }
  }'
```

### Get Journey Summary

```bash
curl http://localhost:4598/api/journey/customer123
```

### Get Analytics

```bash
curl http://localhost:4598/api/journey/customer123/analytics
```

### Export Journey as HTML

```bash
curl "http://localhost:4598/api/journey/customer123/export?format=html" \
  -o journey-report.html
```

### Receive Webhook

```bash
curl -X POST http://localhost:4598/api/journey/webhook/rez-commerce \
  -H "Content-Type: application/json" \
  -d '{
    "event": "purchase",
    "data": {
      "customerId": "customer123",
      "eventType": "purchase",
      "channel": "web",
      "properties": {
        "totalAmount": 4999,
        "orderId": "ORD-67890"
      }
    }
  }'
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4598` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/hojai-journey` | MongoDB connection string |
| `NODE_ENV` | `development` | Environment |
| `LOG_LEVEL` | `info` | Log level |
| `CORS_ORIGIN` | `*` | CORS origin |
| `LOG_DIR` | `./logs` | Log directory |

---

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start service
npm start

# Development mode
npm run dev
```

---

## Database Indexes

The service creates the following MongoDB indexes:

- `UnifiedJourney`: customerId (unique), email, phone, phase, tags
- `JourneyEvent`: eventId (unique), customerId+timestamp, companyId+timestamp
- `CrossCompanyPattern`: patternId (unique), customerId+type
- `JourneySegment`: segmentId (unique), customerId+startDate
- `JourneyMilestone`: milestoneId (unique), customerId+type
- `Company`: companyId (unique), name, type+active

---

## Health Metrics

### Health Score (0-100)
- **Excellent (80-100)**: Highly engaged, low churn risk
- **Good (60-79)**: Active engagement
- **Fair (40-59)**: Some engagement, monitor closely
- **At Risk (20-39)**: Declining engagement
- **Critical (0-19)**: High churn risk

### Engagement Score (0-100)
Based on RFM (Recency, Frequency, Monetary) + behavioral signals.

### Churn Risk (0-1)
Probability of customer churning in the next 30-90 days.

---

## Pattern Detection

The service automatically detects:

- `seasonal_purchase` - Seasonal buying behavior
- `high_value_buyer` - Premium customers
- `browser` - Research before buying
- `abandoner` - Cart abandonment pattern
- `loyal` - Repeat purchasers
- `power_user` - Highly active users
- `cross_company_user` - Multi-company engagement
- `at_risk` - Potential churn
- `churning` - Active churn signals

---

## License

Proprietary - RTNM Group / HOJAI AI

---

## Support

For technical support, contact the HOJAI AI team.
