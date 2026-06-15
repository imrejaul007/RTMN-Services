# NeXha - Commerce Network Infrastructure

**Version:** 4.0.0
**Date:** June 15, 2026
**Status:** Production Ready ✅

NeXha is the **Commerce Network Infrastructure** for RTNM Group — the operating system for commerce networks that connects manufacturers, distributors, franchises, retailers, suppliers, and merchants.

---

## What is NeXha?

NeXha transforms traditional B2B commerce from siloed transactions into an **autonomous commerce network**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXHA                                  │
│                                                               │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│   │DistributionOS│  │ FranchiseOS  │  │ProcurementOS │       │
│   └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│   │ManufacturingOS│ │ TradeFinance │  │Intelligence  │       │
│   └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│   ┌──────────────────────────────────────────────────────┐    │
│   │              Ecosystem Connector + SUTAR Bridge       │    │
│   └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Differentiators

| Feature | Traditional Commerce | NeXha |
|---------|---------------------|-------|
| Supplier Discovery | Manual search | AI-powered matching |
| RFQ Process | Email/phone | Automated multi-channel |
| Quote Comparison | Spreadsheets | Real-time scoring |
| Negotiation | Back-and-forth | Auto-negotiation |
| Reputation | Word-of-mouth | Verified scores |
| Payment | Cash/credit | BNPL integrated |
| Trust | Personal relationship | Network reputation |

---

## Products & Services

| Product | Port | Description |
|---------|------|-------------|
| **Nexha Gateway** | 5002 | Unified API gateway (HOJAI Bridge entry) |
| **DistributionOS** | 4300 | Distributor & wholesaler management |
| **FranchiseOS** | 4310 | Multi-location franchise operations |
| **ProcurementOS** | 4320 | B2B marketplace, Buyer/Seller Agents |
| **ManufacturingOS** | 4330 | Production & BOM management |
| **TradeFinance** | 4340 | BNPL, credit lines, working capital |
| **Intelligence** | 4350 | AI predictions & analytics |
| **Ecosystem Connector** | 4399 | Event bus, Nexha-SUTAR bridge |
| **Portal** | 4388 | B2B Marketplace (Next.js) |
| **NextaBizz** | 3000 | B2B Procurement Platform (Supabase-backed) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Redis 7+ (optional, for caching)
- pnpm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/imrejaul007/NeXha.git
cd NeXha

# Install dependencies
pnpm install

# Start all services
pnpm dev

# Or start individual services
pnpm dev:procurement    # ProcurementOS (4320)
pnpm dev:distribution   # DistributionOS (4300)
pnpm dev:franchise      # FranchiseOS (4310)
pnpm dev:tradefinance   # TradeFinance (4340)
pnpm dev:intelligence   # Intelligence (4350)
pnpm dev:gateway        # Gateway (5002)
```

### Docker

```bash
# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

---

## Buyer Agent (Procurement Agent)

The **Buyer Agent** automates the procurement workflow:

```typescript
// 1. Detect inventory low
await emitDemandSignal({
  merchantId: 'merchant_123',
  productId: 'prod_oil_5L',
  productName: 'Refined Oil 5L',
  currentStock: 10,
  threshold: 50
});

// 2. System automatically:
//    - Gets reorder quantity from Intelligence
//    - Matches suppliers (7-dimension scoring)
//    - Creates RFQ + Deal
//    - Sends RFQ via Email/SMS/WhatsApp/API
//    - Tracks SLA
//    - Records quotes
//    - Awards deal
//    - Creates Purchase Order
//    - Tracks fulfillment
//    - Settles payment (BNPL)
//    - Updates reputation
```

### Buyer Agent Features

| Feature | Description |
|---------|-------------|
| Supplier Directory | Register, verify, manage suppliers |
| Capability Matching | 7-dimension scoring (category, capacity, lead time, delivery, payment, certifications, min order) |
| RFQ Management | Create, send, track RFQs |
| Multi-channel Comms | Email, SMS, WhatsApp, API |
| Deal State Machine | 17 states with validation |
| Negotiation Tracking | Multi-round sessions |
| Quote Comparison | Side-by-side analysis |
| Auto Reorder | Triggered by inventory low |

---

## Seller Agent (Supplier Buyer Agent)

The **Seller Agent** enables suppliers to participate without onboarding:

```typescript
// 1. Guest supplier registers (no GST required)
POST /api/sellers/register
{
  "businessName": "ABC Suppliers",
  "ownerName": "John Doe",
  "email": "john@abc.in",
  "phone": "9876543210"
}
// Returns: { supplierId: "GST-A1B2C3D4", guestToken: "..." }
```

```typescript
// 2. Receive RFQ via webhook (no auth needed)
POST /api/sellers/rfq-webhook
{
  "supplierId": "GST-A1B2C3D4",
  "rfqId": "rfq_456",
  "action": "receive",
  "items": [...]
}
```

```typescript
// 3. Auto-generate quote
POST /api/sellers/auto-quote
{
  "supplierId": "GST-A1B2C3D4",
  "rfqId": "rfq_456",
  "items": [{ "productName": "Oil 5L", "quantity": 100 }],
  "checkInventory": true,
  "negotiate": true
}
```

### Seller Agent Features

| Feature | Description |
|---------|-------------|
| Guest Model | No GST required, WhatsApp onboarding |
| Temporary IDs | GST-XXXXXXXX format |
| Inbound Webhook | Receive RFQs without authentication |
| Auto-Quote | Generate quotes from product catalog |
| Inventory Check | Verify stock before quoting |
| Counter-Offers | Negotiate with buyers |
| Reputation Tracking | Delivery/quality scores |

---

## Commerce Memory

NeXha remembers every transaction to provide intelligence:

```typescript
// Record a transaction
POST /api/memory/transaction
{
  "supplierId": "GST-A1B2C3D4",
  "buyerId": "buyer_123",
  "productName": "Refined Oil 5L",
  "quantity": 100,
  "unitPrice": 520,
  "totalAmount": 52000,
  "deliveryDays": 5,
  "quality": "pass",
  "onTime": true
}

// Query insights
GET /api/memory/suppliers/GST-A1B2C3D4?productName=Oil
{
  "memory": [...],
  "insights": [
    {
      "type": "price_spike",
      "description": "Prices increase 12% during Diwali",
      "severity": "medium"
    }
  ],
  "priceTrends": [
    { "festival": "Diwali", "priceIncrease": 12 }
  ]
}
```

### Memory Features

| Feature | Description |
|---------|-------------|
| Transaction History | Full order history |
| Seasonal Patterns | "Supplier raises prices 12% before Diwali" |
| Supplier Insights | Quality issues, delays, opportunities |
| Buyer Patterns | Purchase frequency, preferred categories |
| Cross-Network | Find similar suppliers buyers also use |

---

## Commerce Feed

LinkedIn-style activity stream for the commerce network:

```typescript
// Post a promotion
POST /api/feed
{
  "type": "promotion",
  "headline": "Festival Sale: 15% off on all oils",
  "body": "Valid till Diwali",
  "audience": "industry",
  "tags": ["festival", "oil"]
}

// Get RFQ opportunities
GET /api/feed?type=rfq_opportunity
[
  {
    "headline": "New RFQ: 500L Refined Oil",
    "body": "Target: ₹50,000 • Deadline: June 20",
    "tags": ["oil", "bulk"]
  }
]
```

### Feed Types

| Type | Description |
|------|-------------|
| new_product | Supplier added new product |
| price_update | Price change notification |
| promotion | Discount/promo announcement |
| capacity_available | Manufacturing capacity open |
| territory_available | Franchise territory open |
| rfq_opportunity | New RFQ available |
| deal_closed | Deal completed |
| supplier_joined | New supplier in network |

---

## Auto-Reputation Pipeline

Automatic supplier scoring based on transactions:

```typescript
// Record delivery (triggers reputation update)
POST /api/reputation/delivery
{
  "supplierId": "GST-A1B2C3D4",
  "supplierName": "ABC Suppliers",
  "onTime": true,
  "deliveryDays": 5,
  "promisedDays": 7
}

// Get reputation
GET /api/reputation/GST-A1B2C3D4
{
  "deliveryScore": 95,
  "qualityScore": 92,
  "paymentScore": 100,
  "communicationScore": 88,
  "negotiationScore": 75,
  "overallScore": 91,
  "tier": "gold"
}

// Get leaderboard
GET /api/reputation/leaderboard?limit=10
[
  { "supplierId": "GST-XXXX", "score": { "overallScore": 98, "tier": "platinum" } },
  ...
]
```

### Scoring Dimensions

| Score | Weight | Description |
|-------|--------|-------------|
| Quality | 30% | Defect rate, returns |
| Delivery | 25% | On-time, lead time |
| Payment | 20% | Payment history |
| Communication | 15% | RFQ response time |
| Negotiation | 10% | Win rate |

---

## Nexha-SUTAR Bridge

Connects NeXha to the SUTAR autonomous workforce:

```typescript
// Emit inventory low to SUTAR GoalOS
POST /api/bridge/inventory-low
{
  "buyerId": "buyer_123",
  "productId": "prod_oil_5L",
  "productName": "Refined Oil 5L",
  "currentStock": 10,
  "threshold": 50
}

// Emit RFQ created to SUTAR Intent Bus
POST /api/bridge/rfq-created
{
  "rfqId": "rfq_456",
  "dealId": "deal_789",
  "buyerId": "buyer_123",
  "supplierId": "GST-A1B2C3D4",
  "items": [...]
}

// Emit order delivered to SUTAR Reputation + Memory
POST /api/bridge/order-delivered
{
  "dealId": "deal_789",
  "supplierId": "GST-A1B2C3D4",
  "buyerId": "buyer_123",
  "onTime": true,
  "qualityPass": true,
  "actualAmount": 52000
}
```

### SUTAR Integration Points

| SUTAR Service | Purpose | Status |
|--------------|---------|--------|
| sutar-identity-os | Supplier/Agent IDs | ✅ Connected |
| sutar-trust-engine | Trust scoring | ✅ Connected |
| sutar-reputation-aggregator | Reviews | ✅ Connected |
| sutar-intent-bus | RFQ routing | ✅ Connected |
| sutar-goal-os | Goal decomposition | ✅ Connected |
| sutar-negotiation-engine | Counter-offers | ✅ Connected |
| sutar-contract-os | Auto-contracts | 🔜 Todo |
| sutar-memory-bridge | Commerce memory | 🔜 Todo |
| sutar-flow-os | Workflow automation | 🔜 Todo |

---

## Transaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE FLOW                                │
└─────────────────────────────────────────────────────────────────┘

1. INVENTORY LOW
   └─→ Ecosystem Connector receives event

2. ORCHESTRATION
   ├─→ Intelligence: Get reorder quantity
   ├─→ Procurement: Match suppliers (7-dim scoring)
   ├─→ Create RFQ + Deal
   └─→ Supplier Agent: Send RFQ (Email/SMS/WhatsApp/API)

3. SUPPLIER RESPONSE
   ├─→ Receive via webhook
   ├─→ Check inventory
   ├─→ Auto-generate quote
   └─→ Submit quote

4. NEGOTIATION (optional)
   ├─→ Buyer counter-offers
   └─→ Supplier responds

5. AWARD
   ├─→ Buyer awards deal
   └─→ Purchase Order created

6. FULFILLMENT
   ├─→ Processing
   ├─→ Shipped
   └─→ Delivered

7. PAYMENT
   ├─→ BNPL/Credit/UPI/Razorpay
   └─→ Settlement

8. COMPLETION
   ├─→ Reputation score updated
   ├─→ Transaction stored in memory
   ├─→ SUTAR synced
   └─→ Feed updated
```

---

## API Reference

### ProcurementOS (4320)

#### Supplier Endpoints
```
GET    /api/suppliers              # List suppliers
POST   /api/suppliers              # Register supplier
GET    /api/suppliers/:id          # Get supplier
GET    /api/suppliers/:id/capabilities  # Get capabilities
POST   /api/suppliers/:id/capabilities  # Set capabilities
GET    /api/suppliers/match        # Match suppliers
```

#### RFQ Endpoints
```
GET    /api/rfqs                   # List RFQs
POST   /api/rfqs                   # Create RFQ
GET    /api/rfqs/:id                # Get RFQ with quotes
POST   /api/rfqs/:id/close          # Close RFQ
POST   /api/rfqs/:id/quotes/:qid/accept  # Accept quote
```

#### Deal Endpoints
```
GET    /api/deals                   # List deals
POST   /api/deals                   # Create deal
GET    /api/deals/:id               # Get deal details
POST   /api/deals/:id/quotes         # Record quote
POST   /api/deals/:id/award          # Award deal
PATCH  /api/deals/:id/fulfillment    # Update fulfillment
POST   /api/deals/:id/payment        # Settle payment
GET    /api/deals/:id/best-quote     # Get best quote
GET    /api/deals/stats/all          # Deal statistics
```

#### Seller Agent Endpoints
```
POST   /api/sellers/register         # Register (guest OK)
POST   /api/sellers/rfq-webhook      # Inbound RFQ
POST   /api/sellers/auto-quote       # Auto-generate quote
GET    /api/sellers/:id/rfqs         # Pending RFQs
POST   /api/sellers/upgrade          # Guest → Verified
```

#### Feed Endpoints
```
POST   /api/feed                    # Post to feed
GET    /api/feed                    # Get feed
```

#### Reputation Endpoints
```
POST   /api/reputation/delivery      # Record delivery
POST   /api/reputation/quality       # Record quality
GET    /api/reputation/:id           # Get reputation
GET    /api/reputation/leaderboard   # Top suppliers
```

#### Memory Endpoints
```
POST   /api/memory/transaction       # Record transaction
GET    /api/memory/suppliers/:id     # Supplier memory
GET    /api/memory/buyers/:id/patterns  # Buyer patterns
```

#### Bridge Endpoints
```
POST   /api/bridge/inventory-low     # Emit to SUTAR
POST   /api/bridge/rfq-created       # Emit to SUTAR
POST   /api/bridge/order-delivered   # Emit to SUTAR
POST   /api/bridge/sutar-event       # Receive SUTAR event
GET    /api/bridge/history           # Event history
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│   (Portal, Mobile, WhatsApp, Other Systems)                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXHA GATEWAY (5002)                         │
│                 Unified API Entry Point                         │
└─────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ DistributionOS  │  │  FranchiseOS   │  │ ProcurementOS   │
│    (4300)      │  │    (4310)      │  │    (4320)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              ECOSYSTEM CONNECTOR (4399)                         │
│                    Event Bus + Orchestration                     │
└─────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ TradeFinance    │  │ Intelligence    │  │    SUTAR       │
│    (4340)      │  │    (4350)      │  │    Bridge       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │   HOJAI-SUTAR   │
                                   │   (localhost)   │
                                   └─────────────────┘
```

---

## Environment Variables

```env
# Service URLs
DISTRIBUTION_OS_URL=http://localhost:4300
FRANCHISE_OS_URL=http://localhost:4310
PROCUREMENT_OS_URL=http://localhost:4320
MANUFACTURING_OS_URL=http://localhost:4330
TRADE_FINANCE_URL=http://localhost:4340
INTELLIGENCE_URL=http://localhost:4350
ECOSYSTEM_CONNECTOR_URL=http://localhost:4399

# SUTAR Services
SUTAR_IDENTITY_URL=http://localhost:4147
SUTAR_TRUST_URL=http://localhost:4180
SUTAR_REPUTATION_URL=http://localhost:4185
SUTAR_INTENT_URL=http://localhost:4154
SUTAR_GOAL_URL=http://localhost:4242
SUTAR_NEGOTIATION_URL=http://localhost:4191

# HOJAI
HOJAI_BRIDGE_URL=http://localhost:5140

# Database
MONGODB_URI=mongodb://localhost:27017/nexha

# Security
INTERNAL_API_TOKEN=your-secret-token
WEBHOOK_SECRET=your-webhook-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - See LICENSE file for details.

---

## Support

- Documentation: [docs/](docs/)
- API Reference: [API.md](API.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Integration: [INTEGRATION.md](INTEGRATION.md)

---

**Built with ❤️ by RTNM Group**
**Last Updated:** June 15, 2026
