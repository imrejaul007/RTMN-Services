# SiteOS Sales Pipeline & Quote System - Documentation

> Sales Pipeline and Quote Management microservice for HOJAI SiteOS

**Port:** 5485
**Type:** REST API Microservice
**Storage:** JSON file persistence (`/tmp/siteos-sales-{companyId}.json`)

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/siteos-commerce/sales-pipeline
npm install
npm start
```

## API Endpoints

### Health Check

```
GET /health
```

### Pipeline

```
GET  /api/pipeline             - Get pipeline view (grouped by stage)
```

### Deals

```
POST /api/deals                - Create deal
GET  /api/deals                - List deals (supports ?stage=&owner=&minValue=&maxValue=)
GET  /api/deals/:id            - Get deal
PUT  /api/deals/:id            - Update deal
PUT  /api/deals/:id/stage      - Move deal to different stage
PUT  /api/deals/:id/close      - Close deal (won/lost)
```

### Quotes

```
POST /api/quotes               - Create quote
GET  /api/quotes               - List quotes (supports ?status=&dealId=&contactId=)
GET  /api/quotes/:id           - Get quote
PUT  /api/quotes/:id           - Update quote
POST /api/quotes/:id/send      - Mark quote as sent
POST /api/quotes/:id/accept    - Mark quote as accepted
POST /api/quotes/:id/reject    - Mark quote as rejected
GET  /api/quotes/:id/pdf       - Get PDF-ready data
```

### Products (for quotes)

```
POST /api/products             - Add product
GET  /api/products             - List products
GET  /api/products/:id         - Get product
PUT  /api/products/:id         - Update product
```

### Analytics

```
GET  /api/analytics/pipeline   - Pipeline metrics (total value, deal count, avg deal size)
GET  /api/analytics/sales     - Sales rep performance
GET  /api/analytics/quotes    - Quote conversion rates
```

## Pipeline Stages

| ID | Name | Probability | Color |
|----|------|------------|-------|
| lead | Lead | 10% | #94A3B8 |
| qualified | Qualified | 25% | #3B82F6 |
| proposal | Proposal Sent | 50% | #F59E0B |
| negotiation | Negotiation | 75% | #8B5CF6 |
| won | Won | 100% | #22C55E |
| lost | Lost | 0% | #EF4444 |

## Deal Schema

```javascript
{
  dealId: uuid,
  companyId: string,
  title: string,
  description: string,
  value: number,
  currency: 'INR' | 'USD',
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost',
  probability: number,
  contactId: string,
  contactName: string,
  contactEmail: string,
  owner: string,
  products: [{ productId, name, quantity, unitPrice, discount }],
  expectedCloseDate: date,
  actualCloseDate?: date,
  lostReason?: string,
  notes: string[],
  activities: [{ type, description, timestamp }],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Quote Schema

```javascript
{
  quoteId: uuid,
  companyId: string,
  quoteNumber: string,
  dealId?: string,
  contactId: string,
  contactName: string,
  contactEmail: string,
  items: [{
    productId?: string,
    name: string,
    description: string,
    quantity: number,
    unitPrice: number,
    discount: number,
    tax: number,
    total: number
  }],
  subtotal: number,
  taxTotal: number,
  discountTotal: number,
  total: number,
  validUntil: date,
  terms: string,
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired',
  sentAt?: timestamp,
  respondedAt?: timestamp,
  createdAt: timestamp
}
```

## Product Schema

```javascript
{
  productId: uuid,
  companyId: string,
  name: string,
  description: string,
  sku: string,
  unitPrice: number,
  currency: 'INR' | 'USD',
  taxRate: number,
  category: string,
  active: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Features

### Deal Management
- Kanban-style pipeline with 6 stages
- Drag-and-drop deal movement between stages
- Deal value tracking with currency support
- Win/loss tracking with reasons
- Activity logging (calls, emails, notes)
- Owner assignment and filtering
- Probability-based weighted value

### Quote Generation
- Line-item quotes with product catalog
- Tax calculations (configurable rate)
- Discount support (per-item and total)
- Quote validity period
- Status tracking (draft → sent → viewed → accepted/rejected/expired)
- PDF-ready data export

### Analytics
- Pipeline value and deal count by stage
- Sales rep performance tracking
- Quote conversion rates
- Win/loss ratios
- Average deal size

### Commission Calculation
- Base commission rate: 5%
- Tiered bonuses based on deal value:
  - Deals under 10,000: 5%
  - Deals 10,000-50,000: 7%
  - Deals 50,000-100,000: 10%
  - Deals over 100,000: 12%

## Authentication

All API endpoints (except `/health`) require API key authentication.

**Header:** `X-API-Key: your-api-key`

Minimum API key length: 16 characters

## Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing required fields | Invalid request body |
| 400 | Invalid stage | Unknown stage value |
| 400 | Invalid currency | Currency must be INR or USD |
| 401 | API key required | Missing X-API-Key header |
| 401 | Invalid API key | API key too short |
| 404 | Deal not found | Deal ID doesn't exist |
| 404 | Quote not found | Quote ID doesn't exist |
| 404 | Product not found | Product ID doesn't exist |
| 500 | Internal server error | Server error |

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## File Structure

```
sales-pipeline/
├── package.json
├── vitest.config.js
├── CLAUDE.md
├── src/
│   └── index.js          # Main application
└── __tests__/
    └── unit/
        └── sales-pipeline.test.js
```

## Integration

This service is part of HOJAI SiteOS Commerce suite:

```
SiteOS Commerce
├── cart-service (5477)         # Shopping cart
├── product-catalog (5478)     # Product catalog
├── checkout-service (5479)     # Checkout flow
├── payment-gateway (5480)     # Payment processing
├── review-collection (5481)   # Review collection
├── loyalty-connector (5482)   # Loyalty program
└── sales-pipeline (5485)      # Sales pipeline & quotes
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5485 | Service port |
| TAX_RATE | 0.18 | Default tax rate (18%) |
| COMMISSION_BASE | 0.05 | Base commission rate (5%) |

## Changelog

- **v1.0.0** (2026-06-28): Initial release
  - Deal CRUD operations
  - Pipeline stage management
  - Quote generation and tracking
  - Product catalog for quotes
  - Analytics endpoints
  - Commission calculations
  - Multi-tenant storage
