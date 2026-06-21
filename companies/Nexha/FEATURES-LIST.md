# NeXha - Complete Features List

**Version:** 4.0.0
**Date:** June 15, 2026
**Status:** Production Ready + Full Transaction Flow + Buyer/Seller Agent Network + Nexha-SUTAR Bridge

---

## All Products & Services

| Product | Port | Description |
|---------|------|-------------|
| Nexha Gateway | 5002 | Unified API gateway (HOJAI Bridge entry) |
| DistributionOS | 4300 | Distributor & wholesaler management |
| FranchiseOS | 4310 | Multi-location franchise operations |
| ProcurementOS | 4320 | B2B marketplace, RFQ, Buyer/Seller Agents, Commerce Memory |
| ManufacturingOS | 4330 | Production & BOM management |
| TradeFinance | 4340 | BNPL, credit lines, working capital |
| Intelligence | 4350 | AI predictions & analytics |
| Ecosystem Connector | 4399 | Event bus, Nexha-SUTAR bridge |
| Portal | 4388 | B2B Marketplace (Next.js) |
| NextaBizz | 3000 | B2B Procurement Platform |

---

## 1. Nexha Gateway (Port 5002)

### Features
- Unified API Entry Point - Single entry for all Nexha services
- Service Routing - Routes requests to appropriate OS service
- Cross-Service Aggregation - Combines data from multiple services
- HOJAI Bridge Integration - Connects to HOJAI SkillNet (port 5140)
- Health Monitoring - Real-time service status
- Prometheus Metrics - Request counts, latency histograms
- Rate Limiting - Configurable request limits
- CORS Configuration - Cross-origin request handling

---

## 2. DistributionOS (Port 4300)

### Features
- Distributor Management - Register, update, activate distributors (MongoDB)
- Van Sale Operations - Mobile van sales tracking with retailer visits
- Collection Management - Cash/UPI/card/cheque collection from retailers
- Route Optimization - TSP nearest-neighbor with Haversine distance
- Delivery Tracking - GPS lat/lng + ETA + status updates
- Returns Handling (RMA) - Create → Approve → Reject → Receive → Refund
- Inventory Tracking - Real-time stock management
- Commission Calculation - Per-sale and volume-based
- Payment Reconciliation - Automated settlement
- Brand Management - Multi-brand product catalog
- Performance Metrics - Sales analytics and reporting

### API Endpoints
- POST /api/distributors - Create distributor
- GET /api/distributors - List distributors
- GET /api/distributors/:id - Get distributor
- PATCH /api/distributors/:id - Update distributor
- POST /api/routes - Create route
- POST /api/routes/:id/optimize - Optimize route
- GET /api/van-sales - List van sales
- POST /api/van-sales/:id/delivery - Record delivery update
- GET /api/collections - List collections
- POST /api/collections - Record collection
- POST /api/returns - Create return request
- POST /api/returns/:id/approve - Approve return
- POST /api/returns/:id/reject - Reject return
- POST /api/returns/:id/receive - Receive returned items
- GET /api/analytics/sales - Sales analytics

---

## 3. FranchiseOS (Port 4310)

### Features
- Franchise Network Management - Register and manage franchisees
- Brand Management - Centralized brand standards
- Royalty Calculation - Percentage or fixed fee models
- Performance Tracking - Sales, compliance KPIs
- Compliance Monitoring - Audit scheduling, checklists, violation tracking, scoring
- Territory Management - Geographic coverage
- Franchisee Onboarding - Training and documentation
- Agreement Management - Contract tracking
- Full Audit Trail - All operations logged

### API Endpoints
- GET /api/franchises - List franchises
- POST /api/franchises - Create franchise
- GET /api/franchises/:id - Get franchise
- PATCH /api/franchises/:id - Update franchise
- POST /api/franchises/:id/royalty - Calculate royalty
- GET /api/franchises/:id/compliance - Compliance status
- POST /api/compliance/audits - Schedule audit
- GET /api/compliance/violations - List violations
- POST /api/agreements - Create agreement

---

## 4. ProcurementOS (Port 4320)

### Features

#### Buyer Agent (Buyer-side)
- Supplier Directory - Manage supplier information, registrations, verification
- Supplier Agent - Multi-channel communication (Email, SMS, WhatsApp, API)
- RFQ Management - Request for Quote workflow with invitations
- Purchase Orders - PO creation and tracking
- Quote Comparison - Multi-supplier price analysis
- Negotiation Tracking - Multi-round sessions
- Contract Management - Supplier contracts

#### Seller Agent (Supplier-side)
- Supplier Buyer Agent - Guest suppliers, auto-quote, counter-offers
- Guest Model - No GST required, temporary IDs (GST-XXXXXXXX), WhatsApp onboarding
- Auto-Quote Generation - From pricing DB + inventory check
- Counter-Offer Workflow - Buyer can counter, seller responds
- Supplier Reputation Tracking - Delivery/quality scores

#### Capability & Matching
- Capability Matching - 7-dimension scoring:
  - category_score (0-20)
  - capacity_score (0-20)
  - lead_time_score (0-15)
  - delivery_score (0-15)
  - payment_terms_score (0-10)
  - certifications_score (0-10)
  - min_order_score (0-10)

#### Deal State Machine (17 States)
```
rfq_created → invitations_sent → quotes_received → negotiating
→ awarded → order_created → processing → shipped → delivered
→ fulfilled → payment_settled → completed
```

#### Commerce Intelligence
- Commerce Memory - Transaction history, seasonal patterns
- Commerce Feed - LinkedIn-style activity stream, RFQ opportunities
- Auto-Reputation Pipeline - Delivery/quality/payment scoring
- Nexha-SUTAR Bridge - Full SUTAR event integration

### Buyer Agent Endpoints
- GET /api/suppliers - List suppliers
- POST /api/suppliers - Register supplier
- GET /api/suppliers/:id - Get supplier
- GET /api/suppliers/:id/capabilities - Get capabilities
- POST /api/suppliers/:id/capabilities - Set capabilities
- GET /api/suppliers/match - Match suppliers (capability matching)
- GET /api/marketplace/products - List marketplace products
- POST /api/rfqs - Create RFQ
- GET /api/rfqs - List RFQs
- GET /api/rfqs/:id - Get RFQ with quotes
- POST /api/rfqs/:id/close - Close RFQ
- POST /api/rfqs/:id/quotes/:quoteId/accept - Accept quote
- GET /api/deals - List deals
- POST /api/deals - Create deal
- GET /api/deals/:id - Get deal details
- POST /api/deals/:id/quotes - Record supplier quote
- POST /api/deals/:id/award - Award deal
- PATCH /api/deals/:id/fulfillment - Update fulfillment
- POST /api/deals/:id/payment - Settle payment
- POST /api/deals/:id/cancel - Cancel deal
- POST /api/deals/:id/complete - Complete deal
- GET /api/deals/:id/best-quote - Get best quote
- GET /api/deals/stats/all - Deal statistics
- GET /api/agents/sessions/:dealId - Get negotiation session
- GET /api/agents/sessions/:dealId/messages - Get messages
- POST /api/agents/rfq - Send RFQ to supplier
- POST /api/agents/response - Record supplier response
- POST /api/agents/sessions/:dealId/remind - Send reminder
- POST /api/agents/sessions/:dealId/counter - Send counter-offer

### Seller Agent Endpoints (Guest + Auto-Quote)
- POST /api/sellers/register - Register supplier (guest OK, no GST)
- POST /api/sellers/rfq-webhook - Inbound RFQ receipt (no auth)
- POST /api/sellers/auto-quote - Auto-generate quote from catalog
- GET /api/sellers/:id/rfqs - Pending RFQs for supplier
- POST /api/sellers/upgrade - Upgrade guest to verified

### Commerce Feed Endpoints
- POST /api/feed - Post to commerce feed
- GET /api/feed - Get activity stream

### Reputation Pipeline Endpoints
- POST /api/reputation/delivery - Record delivery event
- POST /api/reputation/quality - Record quality event
- POST /api/reputation/payment - Record payment event
- GET /api/reputation/:id - Get supplier reputation
- GET /api/reputation/leaderboard - Top suppliers

### Commerce Memory Endpoints
- POST /api/memory/transaction - Record transaction
- GET /api/memory/suppliers/:id - Supplier memory + insights
- GET /api/memory/buyers/:id/patterns - Buyer patterns

### Nexha-SUTAR Bridge Endpoints
- POST /api/bridge/inventory-low - Emit to SUTAR GoalOS
- POST /api/bridge/rfq-created - Emit to SUTAR Intent Bus
- POST /api/bridge/order-delivered - Emit to SUTAR Reputation + Memory
- POST /api/bridge/sutar-event - Receive SUTAR events
- GET /api/bridge/history - Event history

### Order Endpoints
- POST /api/orders/from-quote/:id - Create order from quote
- GET /api/orders/:id - Get order
- POST /api/orders/:id/confirm - Confirm order
- POST /api/orders/:id/status - Update order status

---

## 5. ManufacturingOS (Port 4330)

### Features
- BOM Management - Bill of Materials with version control
- Production Planning - MRP integration, scheduling
- Quality Control - Checkpoints, certifications
- Work Order Management - Creation, tracking, completion
- Machine Scheduling - Capacity planning
- Production Analytics - Output tracking
- Cost Tracking - Per-unit and batch cost
- Batch Tracking - Lot numbers, expiry
- Scrap Management
- Quality Certifications

### API Endpoints
- GET /api/boms - List BOMs
- POST /api/boms - Create BOM
- GET /api/boms/:id - Get BOM
- POST /api/production/orders - Create production order
- GET /api/production/:id - Get production order
- POST /api/quality/checkpoints - Create quality checkpoint
- GET /api/mrp/suggestions - MRP suggestions

---

## 6. TradeFinance (Port 4340)

### Features
- BNPL (Buy Now Pay Later) - Deferred payment options
- Credit Lines - Merchant credit facilities with utilization tracking
- Working Capital - Short-term financing
- Invoice Financing - Post-shipment finance with fee calculation
- Payment Gateway - Razorpay, UPI integration with webhook verification
- Credit Scoring - Merchant credit assessment
- EMI Calculator - EMI computation
- Risk Assessment - Credit risk analysis
- FX Currency Conversion - INR/USD/EUR/GBP with rate tracking
- Dispute Resolution - Evidence, messages, escalation, decisions
- Payment Scheduling
- Late Payment Tracking
- Financial Reports

### API Endpoints
- POST /api/credits/apply - Apply for credit line
- GET /api/credits - List credit lines
- GET /api/credits/:id - Get credit line
- POST /api/bnpl/create - Create BNPL transaction
- GET /api/bnpl/:id - Get BNPL transaction
- POST /api/payments/initiate - Initiate payment
- GET /api/emi/calculate - Calculate EMI
- GET /api/risk/:merchantId - Risk assessment
- GET /api/fx/rates - Get FX rates
- POST /api/fx/convert - Convert currency
- GET /api/disputes - List disputes
- POST /api/disputes/:id/resolve - Resolve dispute

---

## 7. Intelligence (Port 4350)

### Features
- Demand Prediction - Exponential Smoothing, Weighted Moving Average, MAPE accuracy
- Reorder Recommendations - Urgency levels
- Supplier Scoring - Weighted: quality 30%, delivery 25%, price 20%
- Territory Intelligence - Retailer coverage, growth
- Fraud Detection - Velocity analysis, pattern matching
- Churn Prediction - RFM scoring
- Price Optimization
- Trend Analysis
- Anomaly Detection
- Customer Segmentation

### API Endpoints
- POST /api/predict/demand - Forecast demand (7-day)
- POST /api/predict/reorder - Reorder recommendations
- POST /api/detect/fraud - Fraud detection
- POST /api/predict/churn - Churn prediction
- GET /api/scores/supplier/:id - Supplier scorecard
- POST /api/segment/customers - Customer segmentation

---

## 8. Ecosystem Connector (Port 4399)

### Features
- Event Bus - CloudEvents spec, 1000 event history
- Ecosystem Orchestrator - Real API calls with event chaining
- Cross-Service Communication
- Webhook Management
- Event History
- Event Replay
- Subscription Management - with priority
- Real-time Notifications
- Audit Trail
- Nexha-SUTAR Bridge - Full SUTAR integration:
  - SUTAR_IDENTITY (4147)
  - SUTAR_TRUST (4180)
  - SUTAR_REPUTATION (4185)
  - SUTAR_INTENT (4154)
  - SUTAR_GOAL (4242)
  - SUTAR_NEGOTIATION (4191)

### API Endpoints
- POST /api/events/quote - Emit quote received
- POST /api/events/deal/award - Emit deal awarded
- POST /api/events/payment - Emit payment received
- POST /api/webhooks/rez-intelligence - REZ Intelligence webhook
- GET /api/subscriptions - List subscriptions
- POST /api/subscriptions - Create subscription
- GET /api/events/history - Event history

---

## 9. Portal (Port 4388)

### Features
- B2B Marketplace (Next.js)
- Product Catalog
- Supplier Discovery
- Order Management
- Dashboard & Analytics

---

## 10. NextaBizz (Port 3000)

### Features
- B2B Procurement Platform (Supabase-backed)
- Vendor Directory
- Purchase Orders
- RFQ System
- Auto-RFQ Engine
- Reorder Engine
- Scoring Engine
- Chat Service
- Payment Settlement
- ReZ Merchant Integration
- RestoPapa Integration
- Hotel PMS Integration

---

## Complete Transaction Flow

```
1. Inventory Low Detected (ReZ Merchant webhook)
         ↓
2. Ecosystem Connector receives event
         ↓
3. Orchestrator workflow:
   a. Intelligence → get reorder quantity
   b. Procurement → match suppliers (capability matching)
   c. Creates RFQ in ProcurementOS
   d. Creates Deal in Deal State Machine
   e. Supplier Agent sends RFQ via preferred channel
         ↓
4. Supplier receives RFQ notification (email/SMS/WhatsApp/API)
         ↓
5. Supplier submits quote via /api/sellers/rfq-webhook
         ↓
6. Event: quote.received
         ↓
7. Orchestrator records quote in Deal
         ↓
8. Buyer reviews quotes → awards deal
         ↓
9. Event: deal.awarded → Purchase Order created
         ↓
10. Fulfillment: processing → shipped → delivered
         ↓
11. Payment Settlement (BNPL/Credit/UPI/Razorpay)
         ↓
12. Deal completes:
    a. Reputation score updated
    b. Transaction stored in Commerce Memory
    c. SUTAR Reputation + Economy synced
         ↓
13. Nexha-SUTAR Bridge emits events:
    - order.delivered → SUTAR Reputation
    - payment.received → SUTAR Economy
```

---

## Models

| Model | Description |
|-------|-------------|
| Distributor | Van sale operators |
| VanSale | Mobile sales transactions |
| Route | Delivery routes with optimization |
| Collection | Cash/UPI/card/cheque collections |
| ReturnRequest | RMA workflow |
| DeliveryUpdate | GPS + ETA + status |
| Franchise | Franchisee network |
| Brand | Brand standards |
| RoyaltyCalculation | Fee computations |
| ComplianceAudit | Audit schedules |
| ComplianceViolation | Violation tracking |
| RFQ | Request for Quote |
| Quote | Supplier quotes |
| PurchaseOrder | Orders |
| SupplierCapability | 7-dimension scoring |
| Deal | Full lifecycle state machine |
| NegotiationSession | Multi-round negotiation |
| SupplierProfile | Buyer agent profile |
| SupplierQuote | Seller agent quotes |
| SupplierProduct | Seller's product catalog |
| FeedItem | Commerce feed posts |
| TransactionRecord | Commerce memory |
| ReputationEvent | Auto-reputation pipeline |
| ReputationMetrics | Supplier scores |

---

**Last Updated:** June 15, 2026
**Version:** 4.0.0
