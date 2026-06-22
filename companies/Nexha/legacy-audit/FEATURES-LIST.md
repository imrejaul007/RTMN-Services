# NeXha - Complete Features List

**Version:** 3.0.0
**Date:** June 13, 2026
**Status:** Production Ready ✅ + Full Transaction Flow + Supplier Agent Network

---

## 📦 All Products & Services

| Product | Port | Description |
|---------|------|-------------|
| Nexha Gateway | 5002 | Unified API gateway (HOJAI Bridge entry) |
| DistributionOS | 4300 | Distributor & wholesaler management |
| FranchiseOS | 4310 | Multi-location franchise operations |
| ProcurementOS | 4320 | B2B marketplace & RFQ |
| ManufacturingOS | 4330 | Production & BOM management |
| TradeFinance | 4340 | BNPL, credit lines, working capital |
| Intelligence | 4350 | AI predictions & analytics |
| Ecosystem Connector | 4399 | Event bus, central hub |
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

### API Endpoints
- GET /health - Health check
- GET /metrics - Prometheus metrics
- GET /api/status/services - All services status
- GET /api/company/:id/overview - Company overview
- GET /api/insights/cross-product - Cross-product insights

---

## 2. DistributionOS (Port 4300)

### Features
- Distributor Management - Register, update, activate distributors (MongoDB)
- Van Sale Operations - Mobile van sales tracking with retailer visits
- Collection Management - Cash/UPI/card/cheque collection from retailers
- Route Optimization - TSP nearest-neighbor algorithm with Haversine distance + traffic factor
- Delivery Tracking - GPS lat/lng + ETA + status updates (en_route, arrived, delivered, failed)
- Returns Handling (RMA) - Full return workflow: create → approve → reject → receive → refund
- Inventory Tracking - Real-time stock levels
- Sales Analytics - Performance dashboards
- Commission Calculation - Automatic commission computation
- Payment Reconciliation - Multi-payment method handling
- Retailer Management - Add retailers to distributors
- Stock Transfer - Between distribution centers
- Brand Management - Track brands per distributor
- Performance Metrics - Total orders, revenue, collection rate

### API Endpoints
- GET /api/distributors - List distributors
- POST /api/distributors - Create distributor
- GET /api/distributors/:id - Get distributor
- POST /api/distributors/:id/activate - Activate distributor
- POST /api/distributors/:id/brands - Add brand
- GET /api/distributors/:id/performance - Performance metrics
- POST /api/van-sales - Create van sale
- POST /api/van-sales/:id/start - Start van sale
- POST /api/van-sales/:id/complete - Complete van sale
- GET /api/van-sales/:id/delivery - Get delivery updates
- POST /api/van-sales/:id/delivery - Record delivery update
- GET /api/routes - List routes
- POST /api/routes - Create route
- POST /api/routes/:id/optimize - Optimize route (TSP algorithm)
- POST /api/routes/:id/stops/:seq - Mark stop visited
- POST /api/collections - Record collection
- GET /api/collections - List collections
- POST /api/returns - Create return request
- GET /api/returns - List returns
- POST /api/returns/:id/approve - Approve return
- POST /api/returns/:id/receive - Mark received
- POST /api/returns/:id/refund - Process refund
- GET /api/inventory

---

## 3. FranchiseOS (Port 4310)

### Features
- Franchise Network Management - Multi-location franchise operations
- Brand Management - Brand creation and management
- Royalty Calculation - Automatic royalty computation (percentage or fixed)
- Performance Tracking - KPI monitoring for franchises
- Location Management - Geographic franchise tracking
- Compliance Monitoring - Audit scheduling, checklists, violation tracking, scoring
- Financial Reporting - Franchise financial dashboards
- Territory Management - Exclusive territory allocation
- Franchisee Onboarding - Multi-stage onboarding workflow
- Agreement Management - Contract lifecycle
- Audit Trail - Full state history

### API Endpoints
- GET /api/franchises - List franchises
- POST /api/franchises - Create franchise
- GET /api/franchises/:id - Get franchise
- POST /api/franchises/:id/activate - Activate franchise
- GET /api/brands - List brands
- POST /api/brands - Create brand
- POST /api/brands/:id/associate - Associate franchise
- POST /api/franchises/:id/royalty/calculate - Calculate royalty
- GET /api/franchises/:id/royalty - Get royalty calculations
- POST /api/franchises/:id/royalty/:calcId/pay - Mark royalty paid
- GET /api/performance/:franchiseId - Performance metrics
- POST /api/franchises/:id/compliance/audit - Schedule compliance audit
- GET /api/franchises/:id/compliance - Compliance report
- GET /api/franchises/:id/compliance/audits - List audits
- GET /api/franchises/:id/compliance/audits/:auditId - Audit details
- POST /api/franchises/:id/compliance/audits/:auditId/checklist/:checklistId - Complete checklist
- POST /api/franchises/:id/compliance/audits/:auditId/complete - Complete audit
- GET /api/franchises/:id/compliance/violations - List violations
- POST /api/franchises/:id/compliance/violations - Create violation
- POST /api/franchises/:id/compliance/violations/:violationId/resolve - Resolve violation
- POST /api/franchises/:id/compliance/violations/:violationId/escalate - Escalate violation

---

## 4. ProcurementOS (Port 4320)

### Features
- Supplier Directory - Manage supplier information, registrations, verification
- Supplier Agent - Multi-channel communication (Email, SMS, WhatsApp, API/webhook)
- RFQ Management - Request for Quote workflow with invitations
- Purchase Orders - PO creation and tracking
- Price Comparison - Multi-supplier price analysis
- Capability Matching - 7-dimension scoring (category, capacity, lead time, delivery, payment, certifications, min order)
- Deal State Machine - Full lifecycle: RFQ → Quotes → Negotiation → Award → Order → Fulfillment → Payment
- Inventory Procurement - Stock replenishment
- Delivery Tracking - Order delivery monitoring
- Quality Rating - Supplier quality scoring
- Contract Management - Supplier contracts
- Vendor Onboarding
- Procurement Analytics
- Price History

### API Endpoints
- GET /api/suppliers - List suppliers
- POST /api/suppliers - Register supplier
- GET /api/suppliers/:id - Get supplier
- GET /api/suppliers/:id/capabilities - Get supplier capabilities
- POST /api/suppliers/:id/capabilities - Set supplier capabilities
- GET /api/suppliers/match - Match suppliers to requirements (capability matching)
- GET /api/marketplace/products - List marketplace products
- GET /api/marketplace/products - List products
- POST /api/rfqs - Create RFQ
- GET /api/rfqs - List RFQs
- GET /api/rfqs/:id - Get RFQ with quotes
- POST /api/rfqs/:id/close - Close RFQ
- POST /api/rfqs/:id/quotes/:quoteId/accept - Accept quote
- GET /api/deals - List deals
- POST /api/deals - Create deal
- GET /api/deals/:id - Get deal details
- POST /api/deals/:id/quotes - Record supplier quote
- POST /api/deals/:id/award - Award deal to supplier
- PATCH /api/deals/:id/fulfillment - Update fulfillment status
- POST /api/deals/:id/payment - Settle payment
- POST /api/deals/:id/cancel - Cancel deal
- POST /api/deals/:id/complete - Complete deal
- GET /api/deals/:id/best-quote - Get best quote
- GET /api/deals/stats/all - Deal statistics
- GET /api/agents/sessions/:dealId - Get negotiation session
- GET /api/agents/sessions/:dealId/messages - Get negotiation messages
- POST /api/agents/rfq - Send RFQ to supplier
- POST /api/agents/response - Record supplier response
- POST /api/agents/sessions/:dealId/remind - Send reminder
- POST /api/agents/sessions/:dealId/counter - Send counter-offer
- POST /api/purchase-orders - Create purchase order
- GET /api/orders/:id - Get order
- POST /api/orders/:id/confirm - Confirm order
- POST /api/orders/:id/status - Update order status

---

## 5. ManufacturingOS (Port 4330)

### Features
- BOM Management - Bill of Materials creation
- Production Planning - Production scheduling
- Quality Control - QC checkpoints and tracking
- MRP Integration - Material Requirements Planning
- Work Order Management - Production work orders
- Machine Scheduling - Equipment allocation
- Production Analytics - Manufacturing KPIs
- Cost Tracking - Production cost monitoring
- Capacity Planning
- Scrap Management
- Quality Certifications

### API Endpoints
- GET /api/boms
- POST /api/boms
- GET /api/boms/:id
- POST /api/production/orders
- GET /api/production/:id
- POST /api/quality/checkpoints
- GET /api/mrp/suggestions

---

## 6. TradeFinance (Port 4340)

### Features
- BNPL (Buy Now Pay Later) - Deferred payment options with credit line settlement
- Credit Lines - Merchant credit facilities with utilization tracking
- Working Capital - Short-term financing
- Invoice Financing - Post-shipment finance with fee calculation
- Payment Gateway - Razorpay, UPI integration with webhook verification
- Credit Scoring - Merchant credit assessment (crypto.randomInt for secure scoring)
- EMI Calculator - EMI computation
- Risk Assessment - Credit risk analysis
- FX Currency Conversion - INR/USD/EUR/GBP with rate tracking and conversion
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
- GET /api/fx/rates - Get FX exchange rates
- GET /api/fx/rates/:from/:to - Get specific FX rate
- POST /api/fx/convert - Convert currency amount
- GET /api/disputes - List disputes
- POST /api/disputes - Create dispute
- GET /api/disputes/:id - Get dispute
- POST /api/disputes/:id/evidence - Add evidence
- POST /api/disputes/:id/messages - Add message
- POST /api/disputes/:id/escalate - Escalate dispute
- POST /api/disputes/:id/resolve - Resolve dispute

---

## 7. Intelligence Layer (Port 4350)

### Features
- Demand Prediction - Real ML forecasting (Exponential Smoothing, Weighted Moving Average, MAPE accuracy)
- Reorder Recommendations - Stock replenishment suggestions with urgency levels
- Supplier Scoring - AI-powered supplier evaluation (quality 30%, delivery 25%, price 20%, responsiveness 15%, compliance 10%)
- Territory Intelligence - Retailer coverage, growth metrics, opportunities
- Fraud Detection - Velocity analysis, pattern matching, anomaly detection
- Churn Prediction - RFM scoring (recency, frequency, monetary)
- Price Optimization - Dynamic pricing
- Trend Analysis - Market trend detection
- Anomaly Detection - Unusual pattern identification
- Customer Segmentation - Buyer segmentation
- Market Intelligence
- Sales Forecasting
- Inventory Optimization

### API Endpoints
- POST /api/predict/demand - Forecast demand (7-day with confidence intervals)
- POST /api/predict/reorder - Reorder recommendations
- POST /api/score/supplier - Supplier scoring
- GET /api/trends/:category - Trend analysis
- POST /api/territory/insights - Territory intelligence
- POST /api/fraud/detect - Fraud risk detection
- POST /api/churn/predict - Churn prediction
- POST /api/anomaly/detect
- GET /api/segments/:companyId
- POST /api/churn/predict

---

## 8. Ecosystem Connector (Port 4399)

### Features
- Event Bus - Central event streaming (CloudEvents spec)
- Cross-Service Communication - Inter-service messaging
- Ecosystem Orchestrator - Real API calls (not just webhooks) with event chaining
- Webhook Management - Webhook registration and delivery
- Event History - Event log storage (last 1000 events)
- Event Replay - Replay past events
- Subscription Management - Event subscriptions with priority
- Real-time Notifications - Push notifications
- Audit Trail - Complete event audit
- Event Filtering - By type, source, limit
- Batch Processing
- Dead Letter Queue

### Workflows (Orchestrator)
- Inventory Low → Intelligence → Procurement → Supplier Agent → Quote → Award → Order → Payment
- Order Placed → Distribution + Intelligence
- Procurement Fulfilled → REZ Merchant inventory update
- Manufacturing Batch Released → Distribution stock update
- Demand Predicted → Procurement stock buildup alert
- Credit Approved → Distribution notification
- Payment Received → Deal settlement

### API Endpoints
- POST /api/events/demand - Emit demand signal
- POST /api/events/order - Emit order placed
- POST /api/events/quote - Emit supplier quote received
- POST /api/events/deal/award - Emit deal awarded
- POST /api/events/payment - Emit payment received
- POST /api/events - Publish custom event
- GET /api/events/history - Event history
- POST /api/webhooks - Register webhook
- GET /api/webhooks - List webhooks
- POST /api/subscribe - Subscribe to event
- GET /api/notifications - Get notifications

---

## 9. Portal (Port 4388)

### Features
- B2B Marketplace - Product catalog and browsing
- Dashboard - Real-time business metrics
- Order Management - Order creation and tracking
- Inventory View - Stock visibility
- Financial Reports - Revenue, profit dashboards
- User Management - Team management
- Document Management - Invoice, contract storage
- Mobile Responsive - Works on all devices
- Real-time Updates
- Analytics Dashboard

### Pages
- /dashboard
- /distributors
- /franchises
- /orders
- /inventory
- /finance
- /settings

---

## 10. NextaBizz (Port 3000)

### Features
- B2B Procurement Platform - Restaurant & merchant procurement
- Vendor Directory - Supplier discovery
- Purchase Orders - PO workflow
- RFQ System - Quote requests (Supabase-backed)
- Inventory Management - Stock tracking
- Auto-RFQ Engine - Automated quote generation (trigger detection, supplier matching)
- Reorder Engine - Automatic reordering
- Scoring Engine - Vendor performance scoring (weighted metrics)
- Chat Service - Vendor communication
- Payment Settlement - BNPL, credit line, Razorpay integration
- Analytics Dashboard
- ReZ Merchant Integration - Inventory sync, order sync
- RestoPapa Integration - Inventory signals
- Hotel PMS Integration - Hotel procurement

### Services
- auto-rfq (trigger detection, RFQ generation, batch processing)
- chat (NextaBiz Chat Service)
- scoring-engine (supplier scoring, credit boost)
- reorder-engine (reorder automation)
- payment-settlement (BNPL, credit, UPI, Razorpay webhooks)
- integrations (ReZ Merchant, RestoPapa, Hotel PMS)

### NextaBizz API Routes (Supabase-backed)
- GET /api/rfqs - List RFQs
- POST /api/rfqs - Create RFQ
- GET /api/rfqs/:id - Get RFQ with quotes
- POST /api/rfqs/:id/quotes - Submit quote
- GET /api/rfqs/:id/quotes - List quotes

### NextaBizz Database Tables
- rfqs, rfq_responses, rfq_invitations
- purchase_orders, purchase_order_items
- inventory_signals, events
- suppliers, supplier_scores
- credit_lines, payment_webhooks
- merchant_connections, maintenance_requests

---

## 🔗 HOJAI Integration (Port 5140)

### Connected via HOJAI Bridge
- Cross-Product Insights
- Unified User Intelligence
- Event Sharing
- Skill Execution
- Memory Integration
- Intelligence Sharing

### Integration Endpoints
- GET /api/nexha/:company/franchise
- GET /api/nexha/:company/distribution
- GET /api/nexha/:company/procurement
- POST /api/nexha/demand-signal
- POST /api/nexha/rfq

---

## 🔄 Complete Transaction Flow

```
1. Inventory Low Detected (ReZ Merchant webhook)
         ↓
2. Ecosystem Connector receives event: inventory.low_stock
         ↓
3. Orchestrator workflow:
   a. Calls Intelligence → get reorder quantity (Exponential Smoothing)
   b. Calls Procurement → match suppliers (capability matching)
   c. Creates RFQ in ProcurementOS
   d. Creates Deal in Deal State Machine
   e. Supplier Agent sends RFQ via preferred channel (email/SMS/WhatsApp/API)
         ↓
4. Supplier receives RFQ notification
         ↓
5. Supplier submits quote via /api/rfqs/[id]/quotes (NextaBizz or ProcurementOS)
         ↓
6. Event: supplier.quote_received
         ↓
7. Orchestrator records quote in Deal State Machine
         ↓
8. Buyer reviews quotes (sorted by price, delivery, terms)
         ↓
9. Buyer awards deal → /api/deals/:id/award
         ↓
10. Event: deal.awarded → Purchase Order created
         ↓
11. Fulfillment workflow: processing → shipped → delivered
         ↓
12. Payment Settlement (BNPL/Credit/UPI/Razorpay)
         ↓
13. Deal completes → state: completed
         ↓
14. Events logged to event history for audit
```

### Key Event Types
- `inventory.low_stock` → Triggers RFQ creation
- `order.placed` → Updates distribution + intelligence
- `supplier.quote_received` → Records in deal
- `deal.awarded` → Creates purchase order
- `payment_received` → Settles deal payment
- `procurement.fulfilled` → Updates inventory

---

## 🛡️ Security Features

| Feature | Implementation |
|--------|----------------|
| Authentication | JWT via RABTUL Auth Service |
| RBAC | 12 roles with permission matrix |
| Webhook Verification | HMAC-SHA256 signature (mandatory, no bypass) |
| Rate Limiting | express-rate-limit |
| Input Validation | Zod schemas |
| CORS | Configured origins only |
| Security Headers | helmet.js |
| Auth Header Forwarding | Gateway forwards Authorization on all routes |
| Default Secrets | Removed — services fail-fast if not configured |
| Timing-Safe Comparison | crypto.timingSafeEqual on all signature checks |
| Graceful Shutdown | SIGTERM/SIGINT handlers on all services |
| Distributed Tracing | x-trace-id propagation |
| Non-root Containers | All Dockerfiles |
| PII Redaction | Logger with masking |

---

## 📊 Monitoring Features

| Feature | Description |
|---------|-------------|
| Health Checks | /health endpoint on all services |
| Readiness Probes | K8s configured |
| Prometheus Metrics | Request counts, latency |
| Structured Logging | Winston JSON logging |
| Error Tracking | Sentry integration |

---

## 🚀 Deployment Features

| Feature | Status |
|---------|--------|
| Docker Compose | ✅ Full stack |
| Kubernetes | ✅ All services |
| CI/CD | ✅ GitHub Actions |
| HPA | ✅ Auto-scaling |
| Ingress | ✅ Nginx configured |

---

**Last Updated:** June 14, 2026

---

## RTMN Foundation Services Integration

**Location:** `services/` (root)  
**Status:** ✅ CONNECTED TO NeXha

### Foundation Services Connected to NeXha

| Foundation Service | Port | NeXha Integration |
|--------------------|------|-------------------|
| **CorpID Service** | 4702 | Supplier/Merchant identity, trust scores |
| **MemoryOS** | 4703 | Supplier preferences, transaction memory |
| **GoalOS** | 4242 | Distribution goals, delivery targets |
| **Decision Engine** | 4240 | Supplier credit decisions, risk assessment |
| **Agent Economy** | 4251 | Supplier karma, SLA bonds |

### NeXha Services Using Foundation

| NeXha Service | Foundation Service | Purpose |
|---------------|-------------------|---------|
| **DistributionOS** | CorpID | Distributor/Driver identity |
| **ProcurementOS** | Decision Engine | Supplier credit decisions |
| **TradeFinance** | Agent Economy | Escrow for BNPL |
| **Intelligence** | MemoryOS | Supplier memory |
| **Portal** | GoalOS | Distribution targets |

### Foundation Services Summary

| Service | Port | Features |
|---------|------|----------|
| **CorpID** | 4702 | 9 entity types, trust scores, relationships, path finding |
| **MemoryOS** | 4703 | 4 memory types, context, preferences |
| **GoalOS** | 4242 | Decomposition, progress propagation |
| **Decision Engine** | 4240 | Policy engine, holds, appeals |
| **Agent Economy** | 4251 | Karma, SLB, escrow, leaderboard |

### Running Foundation Services

```bash
# Start CorpID Service
cd services/corpid-service && npm install && npm start

# Start MemoryOS
cd services/memory-os && npm install && npm start

# Start GoalOS
cd services/goal-os && npm install && npm start

# Start Decision Engine
cd services/decision-engine && npm install && npm start

# Start Agent Economy
cd services/agent-economy && npm install && npm start
```

### NeXha + Foundation Integration Examples

```javascript
// Supplier trust check before BNPL
const trustRes = await fetch('http://localhost:4702/api/trust/score/{supplierCorpId}');

// Store supplier preference
await fetch('http://localhost:4703/api/context/preferences', {
  method: 'POST',
  body: JSON.stringify({ corpId: supplierCorpId, key: 'delivery_preference', value: 'morning' })
});

// Create distribution goal
await fetch('http://localhost:4242/api/goals', {
  method: 'POST',
  body: JSON.stringify({ title: 'Deliver to 100 outlets', ownerCorpId: distributorCorpId })
});

// Decision on supplier credit
const decision = await fetch('http://localhost:4240/api/decisions/decide', {
  method: 'POST',
  body: JSON.stringify({ corpId: supplierCorpId, action: 'credit_line', amount: 500000 })
});

// Stake SLB for delivery SLA
await fetch('http://localhost:4251/api/economy/slb/stake', {
  method: 'POST',
  body: JSON.stringify({ corpId: driverCorpId, amount: 1000, taskId: deliveryTaskId })
});
```

---

*Foundation Services: `services/corpid-service/`, `services/memory-os/`, `services/goal-os/`, `services/decision-engine/`, `services/agent-economy/`*
