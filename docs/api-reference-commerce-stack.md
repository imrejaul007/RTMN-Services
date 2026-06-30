# Commerce Stack API Reference
> **Version:** 3.2
> **Date:** June 30, 2026
> **Status:** Complete

---

## Overview

This document catalogs all API endpoints exposed by the 13 services in the Global Nexha Commerce Stack.

---

## 1. RTMN Hub (Port 4399)

**Base URL:** `http://localhost:4399`

### Health & Registry

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Hub health check |
| `/ready` | GET | Readiness check |
| `/api/services` | GET | List all 80+ registered services |
| `/api/health/all` | GET | Health check all services |
| `/api/health/cached` | GET | Cached health check |
| `/api/health/:serviceName` | GET | Health check specific service |

### Federation Proxies

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/genie/*` | ANY | → Genie OS Runtime (7100) |
| `/api/memory/*` | ANY | → MemoryOS (4703) |
| `/api/twin/*` | ANY | → TwinOS (4705) |
| `/api/corpid/*` | ANY | → CorpID (4702) |
| `/api/razo/*` | ANY | → RAZO (4299) |
| `/api/sutar/*` | ANY | → SUTAR Gateway (4140) |

### Commerce Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/catalog/*` | ANY | → SiteOS Catalog (5476) |
| `/api/products/*` | ANY | → SiteOS Catalog (5476) |
| `/api/cart/*` | ANY | → SiteOS Cart (5477) |
| `/api/checkout/*` | ANY | → SiteOS Checkout (5478) |
| `/api/orders/*` | ANY | → SiteOS Checkout (5478) |
| `/api/gateway/*` | ANY | → SiteOS Payment Gateway (5479) |
| `/api/loyalty/*` | ANY | → SiteOS Loyalty (5481) |
| `/api/reviews/*` | ANY | → SiteOS Reviews (5480) |
| `/api/subscription/*` | ANY | → SiteOS Subscription (5494) |

### Financial Routes (RABTUL)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet/*` | ANY | → REZ Wallet (4004) |
| `/api/payment/*` | ANY | → REZ Payment (4001) |
| `/api/trust/*` | ANY | → RABTUL Trust (4180) |
| `/api/treasury/*` | ANY | → REZ Treasury (4055) |
| `/api/escrow/*` | ANY | → REZ Escrow (4051) |
| `/api/bnpl/*` | ANY | → REZ BNPL (4052) |
| `/api/capital/*` | ANY | → REZ Capital (4053) |
| `/api/procurement-payment/*` | ANY | → REZ Procurement Payment (4007) |
| `/api/bill-payments/*` | ANY | → REZ Bill Payments (4054) |

### Federation Routes (Nexha)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/capability/*` | ANY | → Nexha Capability OS (4270) |
| `/api/reputation/*` | ANY | → Nexha Reputation OS (4271) |
| `/api/aci/*` | ANY | → Nexha Reputation OS (4271) |
| `/api/discovery/*` | ANY | → Nexha Discovery OS (4272) |
| `/api/acp/*` | ANY | → Nexha ACP Messaging (4340) |
| `/api/negotiate/*` | ANY | → Nexha ACP Messaging (4340) |
| `/api/negotiation/*` | ANY | → SUTAR Negotiation (4293) |
| `/api/contract/*` | ANY | → SUTAR Contract OS (4292) |
| `/api/commerce/*` | ANY | → Nexha Commerce Runtime (4364) |
| `/api/directory/*` | ANY | → Nexha Business Directory (4360) |

### Industry OS Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/restaurant/*` | ANY | → Restaurant OS (5010) |
| `/api/hotel/*` | ANY | → Hotel OS (5025) |
| `/api/healthcare/*` | ANY | → Healthcare OS (5020) |
| `/api/retail/*` | ANY | → Retail OS (5030) |
| `/api/legal/*` | ANY | → Legal OS (5035) |
| `/api/education/*` | ANY | → Education OS (5060) |
| `/api/agriculture/*` | ANY | → Agriculture OS (5070) |
| `/api/automotive/*` | ANY | → Automotive OS (5080) |
| `/api/beauty/*` | ANY | → Beauty OS (5090) |
| `/api/fashion/*` | ANY | → Fashion OS (5095) |

### Company & BAM Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/company/*` | ANY | → Company OS (4010) |
| `/api/factory/*` | ANY | → Company Factory (4010) |
| `/api/sutar-gateway/*` | ANY | → SUTAR Gateway (4140) |
| `/api/sutar/decision/*` | ANY | → SUTAR Decision Engine (4290) |
| `/api/sutar/trust/*` | ANY | → SUTAR Trust Engine (4291) |

### Commerce Stack Routes (NEW)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/commerce-os/*` | ANY | → CommerceOS Gateway (5400) |
| `/api/bam/*` | ANY | → BAM Gateway (5550) |
| `/api/bam/vendor-acquisition/*` | ANY | → Vendor Acquisition Worker (5551) |
| `/api/bam/catalog-normalization/*` | ANY | → Catalog Normalization Worker (5552) |
| `/api/bam/recommendation/*` | ANY | → Recommendation Worker (5553) |
| `/api/templates/*` | ANY | → Template Engine (5670) |
| `/api/pools/*` | ANY | → Vendor Liquidity Pools (5680) |
| `/api/studio/*` | ANY | → Commerce Studio Backend (5750) |
| `/api/products/*` | ANY | → Product Graph (5800) |
| `/api/trade-finance/*` | ANY | → Trade Finance (5810) |
| `/api/cross-border/*` | ANY | → Cross-Border Commerce (5820) |
| `/api/distribution/*` | ANY | → Universal Distribution (5830) |

---

## 2. CommerceOS Gateway (Port 5400)

**Base URL:** `http://localhost:5400`

### Modules

```
GET    /health                       # Service health
GET    /api                         # API index
GET    /api/modules                 # List 9 modules
```

### Catalog Engine

```
GET    /api/catalog/products        # List products
GET    /api/catalog/products/:id    # Get product
POST   /api/catalog/products        # Create
PUT    /api/catalog/products/:id    # Update
DELETE /api/catalog/products/:id    # Delete
GET    /api/catalog/categories       # Categories
POST   /api/catalog/search           # Search
```

### Inventory Engine

```
GET    /api/inventory/stock/:productId             # Stock level
GET    /api/inventory/stock/:productId/:locationId # Per location
POST   /api/inventory/adjust                        # Adjust stock
POST   /api/inventory/transfer                      # Transfer stock
GET    /api/inventory/low-stock                     # Low stock alerts
POST   /api/inventory/reorder/:productId           # Reorder
```

### Order Engine

```
GET    /api/order                    # List orders
GET    /api/order/:id                # Get order
POST   /api/order                    # Create order
PUT    /api/order/:id/status         # Update status
POST   /api/order/:id/cancel         # Cancel
POST   /api/order/:id/return         # Return
```

### Checkout Engine

```
GET    /api/checkout/cart/:userId                  # Get cart
POST   /api/checkout/cart/:userId/add              # Add to cart
PUT    /api/checkout/cart/:userId                  # Update cart
DELETE /api/checkout/cart/:userId/items/:itemId    # Remove item
POST   /api/checkout/initiate                       # Start checkout
PUT    /api/checkout/:sessionId/address            # Set address
PUT    /api/checkout/:sessionId/shipping           # Set shipping
POST   /api/checkout/:sessionId/payment             # Process payment
POST   /api/checkout/:sessionId/confirm             # Confirm
POST   /api/checkout/gateway/initiate               # Gateway payment
POST   /api/checkout/gateway/verify                 # Verify payment
GET    /api/checkout/gateway/status/:transactionId  # Payment status
```

### Pricing Engine

```
GET    /api/pricing/:productId                      # Get price
POST   /api/pricing/calculate                       # Calculate
POST   /api/pricing/compare                         # Compare
POST   /api/pricing/bulk                            # Bulk prices
```

### Promotion Engine

```
GET    /api/promotion                              # List promotions
POST   /api/promotion/validate                     # Validate code
POST   /api/promotion/apply                        # Apply code
POST   /api/promotion/bundle                       # Apply bundle
POST   /api/promotion/create                       # Create
```

### Loyalty Engine

```
GET    /api/loyalty/points/:userId                # Get points
GET    /api/loyalty/tier/:userId                  # Get tier
POST   /api/loyalty/earn                          # Earn points
POST   /api/loyalty/redeem                        # Redeem points
GET    /api/loyalty/rewards/:userId               # Get rewards
```

### Recommendation Engine

```
GET    /api/recommendation/for-user/:userId       # Get recommendations
POST   /api/recommendation/track                   # Track behavior
GET    /api/recommendation/similar/:productId     # Similar products
POST   /api/recommendation/bundle                  # Bundle recs
```

### Subscription Engine

```
GET    /api/subscription/plans                    # List plans
GET    /api/subscription/:userId                   # Get subscription
POST   /api/subscription/subscribe                # Subscribe
POST   /api/subscription/cancel                    # Cancel
PUT    /api/subscription/upgrade                  # Upgrade
GET    /api/subscription/usage/:userId/:metric    # Usage
```

---

## 3. BAM Gateway (Port 5550)

**Base URL:** `http://localhost:5550`

```
GET    /health                       # Service health
GET    /api                         # API index
GET    /api/workers                 # List all workers
GET    /api/workers/:id             # Worker details
GET    /api/workers/category/:cat    # By category
POST   /api/workers/:id/run         # Execute worker
GET    /api/skills                  # All skills
GET    /api/skills/category/:cat    # Skills by category
GET    /api/skills/workers/:wid     # Worker skills
POST   /api/skills/execute          # Execute skill
POST   /api/skills/recommend        # Recommend skills
POST   /api/billing/track           # Track usage
GET    /api/billing/usage/:userId   # Usage history
GET    /api/billing/invoice/:userId # Invoice
POST   /api/billing/subscribe       # Subscribe
GET    /api/billing/subscription/:userId  # Subscription
GET    /api/catalog/featured        # Featured workers
GET    /api/catalog/browse          # Browse
GET    /api/catalog/categories      # Categories
GET    /api/catalog/top-rated       # Top rated
```

### Worker Endpoints

#### Vendor Acquisition Worker (5551)

```
POST   /run                  # Run full pipeline
POST   /discover             # Discover vendors
POST   /qualify             # Qualify vendors
POST   /outreach             # Send outreach
POST   /onboard              # Onboard vendor
POST   /score                # Score vendor
```

#### Catalog Normalization Worker (5552)

```
POST   /run                  # Run full normalization
POST   /image                # Process images
POST   /description          # Generate description
POST   /specs                # Extract specs
POST   /score                # Score quality
```

#### Recommendation Worker (5553)

```
POST   /run                  # Get recommendations
POST   /track                # Track behavior
POST   /similar              # Similar products
POST   /bundle               # Bundle recommendations
```

---

## 4. Template Engine (Port 5670)

**Base URL:** `http://localhost:5670`

```
GET    /health                                  # Service health
GET    /api/templates                           # List all 26 templates
GET    /api/templates/:id                       # Get template
POST   /api/templates/:id/preview               # Preview deployment
POST   /api/templates/:id/deploy                # Deploy template
GET    /api/categories                          # Template categories
```

### Template Deployment Flow

```
1. POST /api/templates/:id/deploy    # Start deployment
2. Receive deploymentId
3. GET /api/templates/:id/preview    # Get summary
4. Track via deploymentId
```

---

## 5. Vendor Liquidity Pools (Port 5680)

**Base URL:** `http://localhost:5680`

```
GET    /health                                  # Service health
GET    /api/pools                               # List all 12 pools
GET    /api/pools/:id                           # Pool details
GET    /api/pools/:id/vendors                   # Vendors in pool
POST   /api/pools/import                        # Import to marketplace
GET    /api/categories                          # Categories
GET    /api/countries                           # All countries
GET    /api/search                              # Search vendors
```

### Marketplace Launch Flow

```
1. GET  /api/pools                  # Browse pools
2. POST /api/pools/import           # Import vendors
   Body: {
     poolIds: ['electronics-pool', 'fashion-pool'],
     marketplaceId: 'my-marketplace',
     minAciScore: 700
   }
3. Marketplace now has 1000+ verified vendors
```

---

## 6. Commerce Studio Backend (Port 5750)

**Base URL:** `http://localhost:5750`

### Templates

```
GET    /api/studio/templates                       # List
GET    /api/studio/templates/:id                   # Get
GET    /api/studio/templates/categories/all       # Categories
GET    /api/studio/templates/pools/all            # Pools
GET    /api/studio/templates/pools/:id/vendors    # Vendors
```

### Builder (6-Step Wizard)

```
POST   /api/studio/builder/sessions               # Create session
GET    /api/studio/builder/sessions/:id           # Get session
PUT    /api/studio/builder/sessions/:id/step/1    # Step 1: Template
PUT    /api/studio/builder/sessions/:id/step/2    # Step 2: Commerce
PUT    /api/studio/builder/sessions/:id/step/3    # Step 3: Workers
PUT    /api/studio/builder/sessions/:id/step/4    # Step 4: Trust
PUT    /api/studio/builder/sessions/:id/step/5    # Step 5: Finance
GET    /api/studio/builder/sessions/:id/review    # Step 6: Review
POST   /api/studio/builder/sessions/:id/validate  # Validate
```

### Deployment

```
POST   /api/studio/deploy                         # Start deployment
GET    /api/studio/deploy                         # List deployments
GET    /api/studio/deploy/:id                     # Get deployment status
POST   /api/studio/deploy/:id/cancel              # Cancel
```

### Dashboard

```
GET    /api/studio/dashboard/:nexhaId              # Dashboard data
GET    /api/studio/dashboard/:nexhaId/stats        # Stats
GET    /api/studio/dashboard/:nexhaId/orders       # Orders
GET    /api/studio/dashboard/:nexhaId/workers      # Workers
POST   /api/studio/dashboard/:nexhaId/refresh     # Refresh
```

### Wizards (Static Config)

```
GET    /api/studio/wizards/commerce-modules       # 9 modules
GET    /api/studio/wizards/pricing-strategies     # 6 strategies
GET    /api/studio/wizards/payment-methods        # Payment methods
GET    /api/studio/wizards/settlement-terms       # Settlement terms
GET    /api/studio/wizards/regions                # Regions
GET    /api/studio/wizards/languages              # Languages
```

---

## 7. Product Graph (Port 5800)

**Base URL:** `http://localhost:5800`

```
GET    /health                                  # Service health
GET    /api/products                            # List products
GET    /api/products/:upid                      # Get product
POST   /api/products                            # Create product
POST   /api/products/:upid/listings             # Add listing
GET    /api/products/:upid/listings             # Get listings
POST   /api/products/sync                       # Sync prices
GET    /api/products/:upid/price-comparison     # Compare prices
GET    /api/gtin/:gtin                          # Lookup by GTIN
GET    /api/marketplace/:marketplace/:listingId # Find by listing
GET    /api/categories                          # Product categories
GET    /api/stats                               # Graph statistics
```

### Universal Product ID Format

```
NX-{12-char-hash}
Example: NX-A8F3B2C1D4E5
```

---

## 8. Trade Finance (Port 5810)

**Base URL:** `http://localhost:5810`

```
GET    /health
GET    /api/healthz
POST   /api/credit-score/:entityId              # Calculate credit score
GET    /api/credit-score/:entityId              # Get credit score
POST   /api/invoices                            # Create invoice
GET    /api/invoices/:id                        # Get invoice
POST   /api/invoices/:id/discount               # Discount invoice
POST   /api/letter-of-credit                    # Issue LC
GET    /api/letter-of-credit/:id                # Get LC
POST   /api/loans/apply                         # Apply for loan
GET    /api/loans/:id                           # Get loan
POST   /api/insurance/cargo                     # Get insurance quote
GET    /api/stats                               # Stats
```

### Credit Score Bands

| Band | Score Range |
|------|-------------|
| AAA | 800+ |
| AA | 750-799 |
| A | 700-749 |
| BBB | 650-699 |
| BB | 600-649 |
| B | 550-599 |
| C | <550 |

---

## 9. Cross-Border Commerce (Port 5820)

**Base URL:** `http://localhost:5820`

```
GET    /health
GET    /api/healthz
GET    /api/fx/:from/:to                        # FX rate
GET    /api/fx                                  # All FX rates
POST   /api/duties/calculate                    # Calculate duties
POST   /api/shipments                           # Create shipment
GET    /api/shipments/:id                       # Get shipment
POST   /api/shipments/:id/filings               # File customs
GET    /api/countries/:code/regulations         # Country rules
GET    /api/hs-codes/search                     # Search HS codes
GET    /api/stats
```

### Supported Currencies

```
USD, EUR, GBP, AED, INR, SAR, SGD, THB, IDR, JPY, CNY, AUD, CAD
```

### Supported Countries

```
IN (India), US (United States), UAE, GB (United Kingdom)
```

---

## 10. Universal Distribution (Port 5830)

**Base URL:** `http://localhost:5830`

```
GET    /health
GET    /api/healthz
GET    /api/channels                            # List channels
POST   /api/channels                            # Add channel
POST   /api/products                            # Create product
GET    /api/products/:id                        # Get product
POST   /api/distribute                          # Distribute to channels
GET    /api/distributions/:id                   # Get distribution status
POST   /api/sync-price                          # Sync prices
POST   /api/sync-inventory                      # Sync inventory
GET    /api/stats
```

### Pre-loaded Channels (12)

```
Marketplaces:
- amazon
- flipkart
- noon
- rez-marketplace
- uae-marketplace
- electronics-resellers
- tech-marketplace
- india-nexha
- uae-nexha

Corporate:
- corporate-procurement
- tata-procurement

Global:
- global-distribution-network
```

---

## Authentication

Most endpoints are currently open for development. In production:

| Header | Description |
|--------|-------------|
| `Authorization: Bearer <token>` | JWT token |
| `x-internal-token` | Service-to-service token |
| `x-tenant-id` | Multi-tenant isolation |

---

## Rate Limiting

Per-service rate limits:

| Service | Default Limit |
|---------|---------------|
| RTMN Hub | 100 req/min/IP |
| CommerceOS | 200 req/min/IP |
| BAM Gateway | 500 req/min/IP (high throughput) |
| Studio Backend | 50 req/min/IP (form submissions) |
| Others | 100 req/min/IP |

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Invalid input |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Server error |
| 502 | Upstream service down |
| 503 | Service unavailable |

---

## Test the APIs

```bash
# Health checks
curl http://localhost:4399/health
curl http://localhost:5400/health

# Create a builder session
curl -X POST http://localhost:5750/api/studio/builder/sessions

# Run vendor acquisition
curl -X POST http://localhost:5550/api/workers/vendor-acquisition/run \
  -H "Content-Type: application/json" \
  -d '{"industry":"restaurant","target_count":10}'

# Create product with UPID
curl -X POST http://localhost:5800/api/products \
  -H "Content-Type: application/json" \
  -d '{"brand":"Samsung","name":"Galaxy S30","category":"smartphones","specs":{"ram":"8GB"}}'

# Get FX rate
curl http://localhost:5820/api/fx/USD/INR
```

---

*API Reference Version 1.0*
*June 30, 2026*