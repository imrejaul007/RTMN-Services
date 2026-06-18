# Customer Intelligence Service (CDP)

**Version:** 1.0.0  
**Port:** 4885  
**Status:** Production Ready

---

## Overview

The Customer Intelligence Service (CDP) is a Customer Data Platform that serves as the single source of truth for every customer in the RTMN ecosystem. It provides comprehensive customer management, identity resolution, risk scoring, segmentation, and analytics capabilities.

---

## Features

### Customer Management
- Full CRUD operations for customer records
- Customer 360 view (unified customer profile)
- Behavior tracking and event logging
- Address and preference management
- Multi-identity support per customer

### Identity Resolution
- Intelligent customer matching based on email, phone, device ID, etc.
- Automatic merging of duplicate customer records
- Identity linking across multiple touchpoints
- Confidence scoring for identity matches
- Single customer view across all channels

### Risk Scoring
- Real-time fraud risk assessment
- Churn risk prediction
- Credit risk evaluation
- Configurable risk thresholds
- Risk factor breakdown with explanations
- Actionable recommendations

### Segmentation
- Pre-built segment rules (VIP, At-Risk, New Customers, etc.)
- Custom segment creation
- Dynamic segment membership
- Batch segment refresh
- Segment analytics and distribution

### Analytics & Metrics
- Customer metrics dashboard
- Revenue breakdown statistics
- Engagement score distribution
- Tier and status distribution
- Daily new customer trends
- Top customers by various metrics

---

## Quick Start

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## API Endpoints

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers (paginated) |
| GET | `/api/customers/search` | Search customers |
| GET | `/api/customers/:id` | Get customer by ID |
| GET | `/api/customers/:id/360` | Get Customer 360 view |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Block customer |
| POST | `/api/customers/:id/identities` | Add identity |
| POST | `/api/customers/:id/behaviors` | Add behavior event |
| POST | `/api/customers/:id/preferences` | Set preference |
| POST | `/api/customers/:id/addresses` | Add address |

### Identity Resolution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/identity/resolve` | Resolve customer identity |
| POST | `/api/identity/link` | Link two customers |
| GET | `/api/identity/:customerId` | Get linked customers |
| POST | `/api/identity/match-score` | Calculate match score |
| POST | `/api/identity/compare` | Compare two customers |

### Risk Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/risk/score/:customerId` | Get risk score |
| POST | `/api/risk/calculate` | Calculate risk |
| POST | `/api/risk/batch-calculate` | Batch calculate |
| GET | `/api/risk/distribution` | Get risk distribution |
| GET | `/api/risk/high-risk` | Get high-risk customers |
| GET | `/api/risk/events/:customerId` | Get risk events |
| POST | `/api/risk/events` | Create risk event |
| POST | `/api/risk/events/:eventId/resolve` | Resolve event |
| GET | `/api/risk/trends` | Get risk trends |

### Segmentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/segments` | List all segments |
| GET | `/api/segments/summaries` | Get segment summaries |
| GET | `/api/segments/distribution` | Get distribution |
| GET | `/api/segments/:id` | Get segment details |
| GET | `/api/segments/:id/customers` | Get customers in segment |
| POST | `/api/segments/query` | Custom segment query |
| POST | `/api/segments/:id/assign` | Assign segment |
| POST | `/api/segments/refresh` | Refresh all segments |
| POST | `/api/segments/refresh/:customerId` | Refresh customer segments |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics/summary` | Get metrics summary |
| GET | `/api/metrics/tier-distribution` | Tier distribution |
| GET | `/api/metrics/status-distribution` | Status distribution |
| GET | `/api/metrics/revenue-breakdown` | Revenue stats |
| GET | `/api/metrics/engagement-distribution` | Engagement scores |
| GET | `/api/metrics/top-customers` | Top customers |
| GET | `/api/metrics/daily-new-customers` | Daily new customers |

---

## Environment Variables

```bash
# Service Configuration
PORT=4885
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/hojai-cdp

# Risk Thresholds
RISK_HIGH_THRESHOLD=70
RISK_MEDIUM_THRESHOLD=40
RISK_LOW_THRESHOLD=20

# Identity Resolution
IDENTITY_MATCH_CONFIDENCE_THRESHOLD=0.85

# Security
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGINS=http://localhost:3000

# Logging
LOG_LEVEL=info
```

---

## Data Models

### Customer
- `customerId` - Unique identifier (CUST-XXXXXXXX)
- `type` - individual | business | guest
- `status` - active | inactive | churned | blocked
- `tier` - standard | premium | enterprise | vip
- `identities[]` - Multiple identity records
- `addresses[]` - Address records
- `preferences[]` - Preference key-value pairs
- `behaviors[]` - Behavior event history
- `metrics` - Computed metrics (orders, revenue, engagement)
- `riskScore` - Risk assessment scores
- `segments[]` - Assigned segments

### IdentityLink
- Links customer records for identity resolution
- Supports merge, resolve, and associate link types
- Tracks confidence scores

### RiskEvent
- Records fraud attempts, chargebacks, disputes, etc.
- Severity levels: low, medium, high, critical
- Supports resolution workflow

---

## Risk Scoring Factors

### Fraud Risk (40% weight)
- Previous fraud events
- Identity verification status
- Number of linked identities
- Account age vs activity
- Order velocity

### Churn Risk (35% weight)
- Days since last activity
- Engagement score
- Purchase frequency
- Customer status

### Credit Risk (25% weight)
- Payment history (via events)
- Average order value
- Customer tier
- Lifetime value

---

## Pre-built Segments

| Segment | Description |
|---------|-------------|
| New Customers | Acquired in last 30 days |
| Highly Engaged | Engagement score >= 70 |
| At Risk | Churn risk >= 60 |
| VIP Customers | VIP tier with LTV >= 50000 |
| Premium Customers | Premium/Enterprise/VIP tier |
| High Value | Lifetime value >= 10000 |
| Inactive | No activity in 60+ days |
| Churned | Status = churned |
| Frequent Buyers | 5+ orders |
| One-Time Buyers | Exactly 1 order |
| High Risk | Overall risk >= 70 |
| Low Engagement | Engagement < 30 |
| Recently Active | Active in last 7 days |
| Business | Type = business |
| Blocked | Status = blocked |

---

## Health Check

```bash
curl http://localhost:4885/health
```

Response:
```json
{
  "service": "hojai-customer-intelligence",
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "uptime": 12345
}
```

---

## RTMN Ecosystem Integration

This service is part of the RTMN ecosystem and integrates with:

- **Service Registry** (port 4399) - Service discovery
- **Event Bus** (port 4510) - Pub/Sub messaging
- **Memory OS** (port 4703) - AI memory storage
- **CorpID** (port 4702) - Identity verification

---

## License

MIT
