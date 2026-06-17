# Product Twin Service

**Version:** 1.0.0
**Port:** 4889
**Status:** Production Ready
**Last Updated:** June 16, 2026

---

## Overview

The Product Twin service manages comprehensive product knowledge including specifications, warranty information, known issues, documentation, parts/inventory, and support metrics. It provides AI-powered quality scoring and insights.

---

## Quick Start

```bash
# Install dependencies
cd services/product-twin
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your MongoDB URI

# Run in development
npm run dev

# Run in production
npm run build
npm start

# Health check
curl http://localhost:4889/health
```

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCT TWIN SERVICE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Products   │  │  Specifications│ │     Known Issues     │  │
│  │   (CRUD)     │  │   (Tech Specs) │ │  (Bugs, Severity)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │     Parts    │  │ Documentation │ │         FAQs         │  │
│  │  (Inventory) │  │ (Manuals, etc)│ │   (Product Help)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              INSIGHTS SERVICE                             │  │
│  │   - AI Quality Score (A+ to F)                           │  │
│  │   - Support Metrics Analysis                             │  │
│  │   - Comparative Insights                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Product
- Basic product info (name, SKU, brand, category)
- Pricing (base, MSRP, currency)
- Warranty tracking (type, duration, status)
- Support metrics (tickets, resolution time, return rate, satisfaction)
- Related products (alternatives, upsells, accessories)
- Multi-tenant support via `tenantId`

### Specification
- Technical specifications for products
- Grouped by category (General, Technical, Dimensions, Performance)
- Types: string, number, boolean, enum, range, array, object
- Display order and highlighting support

### KnownIssue
- Known bugs and issues
- Severity levels: critical, high, medium, low, info
- Status tracking: open, investigating, identified, in_progress, resolved, etc.
- Affected versions with date ranges
- Workarounds and fix information
- Ticket count tracking

### Part
- Parts and components
- Compatibility mapping to products
- Inventory tracking (quantity, reserved, available)
- Pricing (cost, retail, wholesale)
- Low stock alerts

### Documentation
- Manuals, guides, datasheets, videos
- Structured content blocks
- Versioning support
- View and download tracking

### FAQ
- Product-specific frequently asked questions
- Categories: general, purchasing, shipping, returns, warranty, technical, etc.
- Voting system (helpful/not helpful)
- Community responses

---

## API Endpoints

### Health & Info
```
GET  /health              # Service health check
GET  /api                # API documentation
```

### Products
```
GET    /api/products                    # List products (paginated)
GET    /api/products/:id                # Get product with all related data
POST   /api/products                    # Create product
PUT    /api/products/:id                # Update product
DELETE /api/products/:id                # Delete product
GET    /api/products/search             # Search products
GET    /api/products/:id/related        # Get related products
GET    /api/products/:id/insights       # Get AI insights
GET    /api/products/:id/metrics         # Get support metrics
PATCH  /api/products/:id/warranty        # Update warranty
PATCH  /api/products/:id/metrics         # Update support metrics
POST   /api/products/:id/related         # Add related product
GET    /api/products/meta/categories     # Get all categories
GET    /api/products/meta/brands         # Get all brands
```

### Known Issues
```
GET    /api/issues                          # List issues
GET    /api/issues/:id                      # Get issue
POST   /api/issues                          # Create issue
PUT    /api/issues/:id                      # Update issue
DELETE /api/issues/:id                      # Delete issue
GET    /api/issues/product/:productId       # Issues by product
GET    /api/issues/product/:productId/active # Active issues only
GET    /api/issues/product/:productId/stats # Issue statistics
PATCH  /api/issues/:id/tickets              # Increment ticket count
POST   /api/issues/:id/resolve              # Resolve issue
GET    /api/issues/:id/affected/:version    # Check version affected
POST   /api/issues/bulk                     # Bulk create issues
PATCH  /api/issues/:id/status               # Update status
```

### Parts
```
GET    /api/parts                              # List parts
GET    /api/parts/:id                          # Get part
POST   /api/parts                              # Create part
PUT    /api/parts/:id                          # Update part
DELETE /api/parts/:id                          # Delete part
GET    /api/parts/product/:productId           # Parts by product
GET    /api/parts/compatible/:productId        # Compatible parts
GET    /api/parts/inventory/low-stock          # Low stock parts
POST   /api/parts/:id/reserve                   # Reserve inventory
POST   /api/parts/:id/release                   # Release reservation
POST   /api/parts/:id/fulfill                  # Fulfill reservation
POST   /api/parts/:id/restock                  # Restock
POST   /api/parts/:id/compatible               # Add compatible product
GET    /api/parts/type/:type                   # Parts by type
GET    /api/parts/search                        # Search parts
```

### Search
```
GET  /api/search/all         # Unified search across all entities
GET  /api/search/products    # Search products
GET  /api/search/issues      # Search issues
GET  /api/search/parts       # Search parts
GET  /api/search/docs        # Search documentation
GET  /api/search/faqs       # Search FAQs
GET  /api/search/specs       # Search specifications
POST /api/search/similar-specs # Find products with similar specs
GET  /api/search/autocomplete # Autocomplete suggestions
```

---

## AI Quality Score

The service calculates an AI quality score (A+ to F) based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Satisfaction Score | 25% | Customer satisfaction rating |
| Return Rate Score | 20% | Lower return rate = higher score |
| Resolution Time | 15% | Faster issue resolution = higher score |
| Documentation | 15% | Completeness of docs and specs |
| Issues Score | 15% | Fewer/less severe issues = higher score |
| Parts Availability | 10% | In-stock parts availability |

### Score Factors
Each score includes:
- **Positive factors:** What's working well
- **Negative factors:** Areas needing attention
- **Recommendations:** Actionable improvements

---

## Multi-Tenancy

All endpoints require `tenantId` parameter:
- Query parameter: `?tenantId=xxx`
- Request body: `{ tenantId: "xxx", ... }`

This ensures complete data isolation between tenants.

---

## Environment Variables

```bash
PORT=4889                    # Service port
NODE_ENV=development         # Environment
MONGODB_URI=mongodb://...    # MongoDB connection
SERVICE_NAME=product-twin    # Service name for discovery
SERVICE_URL=http://localhost:4889
LOG_LEVEL=info              # Logging level
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | HTTP server |
| mongoose | ^8.0.3 | MongoDB ODM |
| cors | ^2.8.5 | Cross-origin support |
| helmet | ^7.1.0 | Security headers |
| winston | ^3.11.0 | Logging |
| zod | ^3.22.4 | Validation |
| uuid | ^9.0.1 | ID generation |

---

## Related Services

| Service | Port | Integration |
|---------|------|------------|
| REZ-ecosystem-connector | 4399 | Service registry |
| REZ-event-bus | 4510 | Event publishing |
| TwinOS Hub | 4705 | Digital twin sync |
| Memory OS | 4703 | Context storage |

---

## Example Usage

### Create a Product
```bash
curl -X POST http://localhost:4889/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "sku": "PROD-001",
    "name": "Smart Widget Pro",
    "description": "Advanced smart widget",
    "category": "Electronics",
    "brand": "TechCorp",
    "price": { "base": 99.99, "currency": "USD" },
    "warranty": {
      "type": "standard",
      "durationMonths": 12
    }
  }'
```

### Get Product Insights
```bash
curl http://localhost:4889/api/products/PROD_ID/insights?tenantId=tenant-123
```

### Search Products
```bash
curl "http://localhost:4889/api/products/search?q=smart&tenantId=tenant-123"
```

### Reserve Part Inventory
```bash
curl -X POST http://localhost:4889/api/parts/PART_ID/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "quantity": 5
  }'
```

---

*Last Updated: June 16, 2026*
*RTMN Product Twin Service*
