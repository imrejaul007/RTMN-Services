# Sales Hub - Central Sales Orchestration

**Version:** 1.0.0
**Port:** 5180
**Status:** Development

## Overview

Sales Hub is the central orchestration layer for the RTMN sales ecosystem. It pulls data from all sources and provides unified sales intelligence, lead scoring, customer conversion, and AI-powered recommendations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SALES HUB (5180)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │
│  │   LEADS     │  │   DEALS     │  │ CUSTOMERS   │                    │
│  │  /api/leads │  │ /api/deals  │  │/api/customers│                   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                    │
│         │                 │                 │                            │
│  ┌──────▼─────────────────▼─────────────────▼──────┐                   │
│  │              AI SCORING & ROUTING              │                   │
│  │     Lead Scoring │ Deal Scoring │ Rep Routing  │                   │
│  └────────────────────────┬──────────────────────┘                   │
│                           │                                             │
│  ┌────────────────────────▼──────────────────────┐                   │
│  │              BRIDGE CONNECTIONS                 │                   │
│  ├──────────┬───────────┬───────────┬────────────┤                   │
│  │SalesMind │ Sales OS  │ CustomerOps│ BrandPulse │                   │
│  ├──────────┴───────────┴───────────┴────────────┤                   │
│  │       SUTAR OS  │  Trust  │  Journey           │                   │
│  └─────────────────────────────────────────────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Connected Services

| Bridge | Service | Purpose |
|--------|---------|---------|
| **SalesMind** | SalesMind (3000) | AI enrichment, intent data, email generation |
| **SalesOS** | Service Registry (4399) | Territories, reps, quotas |
| **CustomerOps** | TwinOS Hub (4705) | Customer/Buyer twins, relationships |
| **BrandPulse** | AdBazaar (4056) | Brand analytics, sentiment |
| **SUTAR** | SUTAR OS (4140) | Goals, karma, autonomous actions |
| **Trust** | CorpID (4702) | Trust scores, verification |
| **Journey** | Memory OS (4703) | Journey tracking, touchpoints |

## API Endpoints

### Leads
```
GET    /api/leads              - List leads with filtering
GET    /api/leads/stats        - Lead statistics
GET    /api/leads/:id          - Get single lead
POST   /api/leads              - Create lead (auto-enriches)
PUT    /api/leads/:id          - Update lead
POST   /api/leads/:id/qualify  - Qualify lead
POST   /api/leads/:id/convert  - Convert to customer
POST   /api/leads/:id/touchpoint - Add touchpoint
```

### Deals
```
GET    /api/deals              - List deals
GET    /api/deals/stats        - Deal statistics
GET    /api/deals/pipeline     - Pipeline view
GET    /api/deals/report       - Deal report
GET    /api/deals/:id          - Get single deal
POST   /api/deals              - Create deal
PUT    /api/deals/:id          - Update deal
POST   /api/deals/:id/stage    - Change stage
POST   /api/deals/:id/activity - Add activity
POST   /api/deals/:id/stakeholder - Add stakeholder
```

### Customers
```
GET    /api/customers          - List customers
GET    /api/customers/stats    - Customer statistics
GET    /api/customers/segments - Segment analysis
GET    /api/customers/health   - Health overview
GET    /api/customers/:id      - Get single customer
POST   /api/customers          - Create customer
PUT    /api/customers/:id      - Update customer
POST   /api/customers/:id/health - Update health
POST   /api/customers/:id/upgrade - Upgrade tier
POST   /api/customers/:id/activity - Add activity
```

### Recommendations
```
GET    /api/recommendations/leads         - Lead recommendations
GET    /api/recommendations/deals         - Deal recommendations
GET    /api/recommendations/customers     - Customer recommendations
GET    /api/recommendations/next-best-action - NBA for entity
GET    /api/recommendations/territory     - Territory recommendations
```

### Insights
```
GET    /api/insights/overview    - Sales overview
GET    /api/insights/pipeline   - Pipeline insights
GET    /api/insights/team       - Team performance
GET    /api/insights/forecasting - Sales forecasting
GET    /api/insights/conversion - Conversion funnel
GET    /api/insights/sources    - Lead source analysis
```

### Bridge Status
```
GET    /api/bridges/status      - All bridge health
```

## Lead Scoring

### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Engagement | 30% | Touchpoints, activity, source |
| Technical | 25% | Company tech stack, size, industry |
| Budget | 25% | Budget range, clarity |
| Authority | 20% | Title, decision-making power |
| Timing | 15% | Purchase timeline |
| Trust | 10% | Trust score from CorpID |
| Brand | 10% | Brand affinity from BrandPulse |

### Grade Scale

| Grade | Score | Description |
|-------|-------|-------------|
| A | 90-100 | Hot lead, ready to buy |
| B | 75-89 | High quality, needs nurturing |
| C | 60-74 | Medium quality, needs qualification |
| D | 40-59 | Low quality, continue nurturing |
| F | 0-39 | Poor fit, consider removing |

## Data Enrichment Flow

```
Lead Created
    │
    ├─► SalesMind ──► Company info, intent data
    │
    ├─► CustomerOps ──► Buyer twin, relationships
    │
    ├─► BrandPulse ──► Brand affinity, sentiment
    │
    ├─► Trust ──► Trust score, verification
    │
    └─► AI Scoring ──► Final score, grade, recommendations
              │
              └─► Routing ──► Territory, Rep assignment
```

## Lead Conversion Flow

```
Qualified Lead
    │
    ├─► Create Customer Account
    │
    ├─► Create Customer Twin (CustomerOps)
    │
    ├─► Create Deal (if applicable)
    │
    ├─► Track Journey (MemoryOS)
    │
    └─► Log Goal Event (SUTAR)
              │
              ├─► Update Goals
              ├─► Award Karma
              └─► Notify Reps
```

## Environment Variables

```bash
# Server
PORT=5180
NODE_ENV=development

# Service URLs
REZ_SALES_MIND_URL=http://localhost:3000
SALES_OS_URL=http://localhost:4399
CUSTOMER_OPS_URL=http://localhost:4705
BRANDPULSE_URL=http://localhost:4056
SUTAR_OS_URL=http://localhost:4140
TRUST_SERVICE_URL=http://localhost:4702
JOURNEY_SERVICE_URL=http://localhost:4703

# Scoring Weights
LEAD_ENGAGEMENT_WEIGHT=0.3
LEAD_TECHNICAL_WEIGHT=0.25
LEAD_BUDGET_WEIGHT=0.25
LEAD_AUTHORITY_WEIGHT=0.2
```

## Running

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build & Start
npm run build
npm start

# Health check
curl http://localhost:5180/health

# API info
curl http://localhost:5180/api
```

## Testing

```bash
# Create lead
curl -X POST http://localhost:5180/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@techcorp.com",
    "company": "TechCorp",
    "industry": "Technology",
    "companySize": "201-500",
    "source": "linkedin"
  }'

# Get lead stats
curl http://localhost:5180/api/leads/stats

# Get recommendations
curl http://localhost:5180/api/recommendations/leads

# Get insights
curl http://localhost:5180/api/insights/overview
```

## Key Features

1. **Unified Lead Scoring** - Combines signals from all connected services
2. **Auto Enrichment** - Pulls company, intent, and trust data automatically
3. **AI Recommendations** - Next best actions for leads, deals, and customers
4. **Territory Routing** - Intelligent rep assignment based on capacity and skills
5. **Customer Conversion** - Seamless lead-to-customer journey
6. **Sales Insights** - Pipeline, forecasting, and team analytics
7. **Bridge Health** - Real-time status of all service connections

## Future Enhancements

- Real-time scoring updates
- Webhook integrations
- Advanced forecasting models
- Multi-currency support
- Advanced territory rules engine
