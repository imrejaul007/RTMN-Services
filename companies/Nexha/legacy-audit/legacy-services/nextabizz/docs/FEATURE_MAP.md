# NextaBizz — Feature Map

## By User Type

### Merchant (Restaurant, Hotel, Salon, Retail, Pharmacy)
### Supplier (Wholesaler, Distributor, Brand)
### Platform Admin (ReZ internal)

---

## Phase 1 Features (Sprint 1-4)

### Merchant Portal

#### 1. Inventory Signal Dashboard
- View all low-stock / out-of-stock alerts from integrated platforms
- Filter by source (RestoPapa, ReZ Merchant, Hotel PMS), severity, category
- Signal history with timestamps and stock levels
- **Powered by:** `inventory.signal.received` events

#### 2. Smart Reorder Engine
- Automatic reorder suggestions based on signals
- One-tap "Create PO" from signal
- Suggested suppliers + prices for each item
- Urgency indicators (high/medium/low)
- **Powered by:** `reorder.signal.created` events + supplier product matching

#### 3. Supplier Catalog
- Browse products by category
- Search by name, SKU, supplier
- Filter by MOQ, price range, supplier rating
- Supplier profiles with ratings and reviews
- **Powered by:** `SupplierProduct` + `SupplierCategory` tables

#### 4. Purchase Order Management
- Create POs (manual or from reorder signals)
- Add items from catalog or free-text
- View PO history and status
- Cancel pending POs
- Contract pricing (merchant-specific negotiated rates)
- **Powered by:** `po.created`, `po.status_changed` events

#### 5. Order Tracking
- Real-time status: draft → submitted → confirmed → shipped → received
- Delivery timeline
- Variance alerts (received qty vs ordered qty)
- **Powered by:** `po.status_changed` events

#### 6. Payment Settlement
- **Net Terms (default):** Pay within agreed days (e.g., 30 days)
- **Partial Prepay:** Pay a % upfront, balance on delivery
- **Full Prepay:** Pay 100% before shipment
- Payment status tracking (pending → partially_paid → paid)
- **Powered by:** RTMN Finance BNPL + bank transfer / UPI / Razorpay

#### 7. Supplier Matching
- Auto-match signals to best-fit suppliers
- Rank by: price, score, delivery speed, distance
- "Best value" vs "Fastest" vs "Cheapest" modes
- Substitution suggestions (similar products, better price)
- **Powered by:** `SupplierProduct` + scoring engine

#### 8. REZ SSO Login
- Login via REZ Auth (existing merchant credentials)
- Auto-link to ReZ Merchant account
- Single sign-on across ecosystem
- **Powered by:** REZ Auth Service

---

### Supplier Portal (Phase 2)

#### 9. Product Management
- List products with pricing tiers
- Set MOQ per product
- Bulk pricing configuration
- Inventory levels
- Product images
- **Powered by:** `SupplierProduct` CRUD

#### 10. Order Fulfillment
- View incoming POs
- Accept / reject / request changes
- Update order status (confirmed → shipped → delivered)
- Mark partial deliveries
- **Powered by:** `po.status_changed` events (supplier-side)

#### 11. Performance Dashboard
- Overall score with breakdown
- Delivery on-time rate
- Quality rejection rate
- Price consistency score
- Credit boost indicator
- Historical trend charts
- **Powered by:** `supplier.scored` events + `SupplierScore` table

#### 12. RFQ Responses
- View open RFQs matching supplier categories
- Submit quotes with pricing and lead time
- Track RFQ status (open → quoted → awarded)
- **Powered by:** `rfq.created`, `rfq.quoted` events

---

## Phase 2 Features (Sprint 5-8)

### Merchant Portal (additions)

#### 13. RFQ Engine
- Post RFQ (Request for Quote) for custom requirements
- Receive quotes from multiple suppliers
- Compare quotes side-by-side (price, lead time, supplier score)
- Award RFQ to chosen supplier
- Auto-convert to PO
- **Powered by:** `rfq.created`, `rfq.quoted` events

#### 14. Budget Tracking
- Set monthly procurement budgets
- Track spend vs. budget by category
- Alerts when approaching budget limits
- Budget vs. actual reports

#### 15. Procurement Analytics
- Spend by category (pie chart)
- Spend by supplier (bar chart)
- Order frequency trends
- Payment terms analysis
- Supplier comparison
- Top reorder items

#### 16. Favorite Suppliers
- Bookmark preferred suppliers
- Quick reorder from favorites
- Supplier-specific pricing tiers

---

### Procurement Intelligence

#### 17. Multi-Location Procurement
- **For chains:** Centralized purchasing across multiple outlets
- Branch-level procurement allocation
- Shared budget controls across locations
- Aggregate orders by location for bulk pricing
- **Powered by:** merchant.merchantId linking to multiple source accounts

#### 18. PO Approval Workflows
- Configurable approval chains (requester → manager → finance)
- Role-based approval thresholds
- Approval notifications and reminders
- Audit trail of all approvals
- Partial approval support

#### 19. Supplier SLAs
- Fill-rate commitments (% of order fulfilled on time)
- Lead-time guarantees
- SLA breach penalties / credits
- Automatic SLA score from performance data
- Supplier SLA tier badges (Gold / Silver / Bronze)

#### 20. Contract Pricing
- Long-term negotiated rates with preferred suppliers
- Volume-based pricing tiers
- Price lock periods for contract duration
- Auto-apply contract pricing in PO creation

#### 21. Demand Forecasting
- Historical consumption patterns
- Seasonal demand signals
- Pre-emptive reorder suggestions before depletion
- **Powered by:** consumption history from RestoPapa + signal data

#### 22. Price Intelligence
- Price trend tracking per product
- Alert when supplier price changes significantly
- Benchmark prices across suppliers
- Best price recommendations

---

## Phase 3 Features (Sprint 9-12)

### Finance

#### 23. BNPL (Buy Now, Pay Later)
- View credit limit (from CreditLine)
- Track utilized vs. available credit
- 30-day repayment terms
- Outstanding balance display
- **Powered by:** RTMN Finance Service + `CreditLine` table

#### 24. Credit Score Display
- Merchant procurement credit score
- Score factors: transaction volume, payment history, procurement consistency
- Score improvement suggestions
- **Powered by:** RTMN Finance underwriting model

#### 25. Invoice Management
- View invoices for received POs
- Track payment due dates
- Mark as paid / request extension
- Payment history

### Merchant Stack (SaaS Marketplace)

#### 26. App Discovery
- Browse available SaaS tools (RestoPapa, Hotel PMS, etc.)
- Category filters: POS, Inventory, CRM, Marketing
- User reviews and ratings
- Pricing tiers

#### 27. Subscription Management
- Subscribe to SaaS apps
- Manage active subscriptions
- Usage tracking
- Billing integration

---

## Phase 4 Features (Later)

### Trade (B2B Marketplace)

#### 28. Supplier Discovery
- Search for verified suppliers by category
- Location-based filtering
- Verified badge display
- Supplier onboarding status tracking
- **Powered by:** `VendorApplication` workflow

#### 29. Bulk Inquiry
- Send inquiry to multiple suppliers at once
- Collect responses
- Track inquiry status

#### 30. Contract Management
- Long-term contracts with suppliers
- Contract terms (price lock, volume commitments)
- Auto-renewal alerts

### Growth

#### 31. AdBazaar Integration
- Run procurement-targeted ads
- Target merchants by category, location, spend volume
- Ad performance analytics
- Track ROAS (return on ad spend)

### Fulfillment (Partnership, not build)

#### 32. Logistics Partner Integration
- Third-party logistics (Shadowfax, Delhivery) for supplier shipping
- Delivery tracking
- COD remittance
- Note: Partner only, don't build own logistics

---

## Platform Admin (ReZ Internal)

#### 33. Merchant Management
- View all merchants on platform
- Onboarding status
- Integration status
- Blacklist / suspend merchants

#### 34. Supplier Management
- Approve / reject supplier applications
- Verify GST, documents
- Manage supplier categories

#### 35. Procurement Analytics (Platform-wide)
- Total GMV across all merchants
- Top categories by spend
- Supplier performance benchmarks
- Platform take rate / commission tracking
- BNPL utilization and default rates

#### 36. Signal Quality Dashboard
- Monitor incoming signals from RestoPapa / ReZ Merchant / Hotel PMS
- Signal volume by source
- Signal-to-PO conversion rate
- Failed webhook tracking

#### 37. Credit Risk Dashboard
- Merchant credit utilization
- Default rates
- RTMN Finance exposure

---

## Feature Priority Matrix

| # | Feature | Merchant | Supplier | Phase | Moat? |
|---|---------|----------|----------|--------|--------|
| 1 | Inventory Signal Dashboard | ✅ | | 1 | High |
| 2 | Smart Reorder Engine | ✅ | | 1 | High |
| 3 | Supplier Catalog | ✅ | | 1 | — |
| 4 | Purchase Order Management | ✅ | | 1 | Medium |
| 5 | Order Tracking | ✅ | ✅ | 1 | — |
| 6 | Payment Settlement (Net Terms / BNPL) | ✅ | | 1 | High |
| 7 | Supplier Matching | ✅ | | 1 | High |
| 8 | REZ SSO Login | ✅ | | 1 | — |
| 9 | Product Management | | ✅ | 2 | Medium |
| 10 | Order Fulfillment | | ✅ | 2 | — |
| 11 | Performance Dashboard | | ✅ | 2 | Medium |
| 12 | RFQ Responses | | ✅ | 2 | — |
| 13 | RFQ Engine | ✅ | ✅ | 2 | High |
| 14 | Budget Tracking | ✅ | | 2 | Low |
| 15 | Procurement Analytics | ✅ | | 2 | — |
| 16 | Favorite Suppliers | ✅ | | 2 | — |
| 17 | Multi-Location Procurement | ✅ | | 3 | Medium |
| 18 | PO Approval Workflows | ✅ | | 3 | — |
| 19 | Supplier SLAs | ✅ | | 3 | — |
| 20 | Contract Pricing | ✅ | | 3 | — |
| 21 | Demand Forecasting | ✅ | | 3 | **Very High** |
| 22 | Price Intelligence | ✅ | ✅ | 3 | **Very High** |
| 23 | BNPL / Credit Line | ✅ | | 3 | **Very High** |
| 24 | Credit Score Display | ✅ | | 3 | High |
| 25 | Invoice Management | ✅ | | 3 | — |
| 26 | App Discovery (SaaS) | ✅ | | 3 | Medium |
| 27 | Subscription Mgmt | ✅ | | 3 | — |
| 28 | Supplier Discovery | ✅ | | 4 | — |
| 29 | Bulk Inquiry | ✅ | | 4 | — |
| 30 | Contract Management | ✅ | | 4 | — |
| 31 | AdBazaar Integration | ✅ | ✅ | 4 | High |
| 32 | Logistics Partner Integration | ✅ | ✅ | 4 | — |

**Moat = how defensible this feature is. Higher = harder for competitors to replicate.**

---

## What's NOT Being Built

- Own logistics / delivery fleet
- Inventory management (done by RestoPapa / ReZ Merchant / Hotel PMS)
- Payment gateway (Razorpay handles payments)
- Accounting software
- Employee management
