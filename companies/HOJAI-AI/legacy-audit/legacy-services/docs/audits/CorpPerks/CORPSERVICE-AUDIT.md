# CorpPerks - Complete Service Audit

**Company:** CorpPerks
**GitHub:** github.com/imrejaul007/CorpPerks
**Last Updated:** May 14, 2026

---

## SERVICES (15+ Microservices)

### Core Services

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| `rez-corpperks-service` | 4013 | Node.js | Employee benefits & rewards |
| `rez-corporate-service` | - | Node.js | Corporate account management |
| `rez-stayown-service` | 4011 | Node.js | Hotel/OTA bookings |
| `src/backend` | 4014 | Express | Unified corporate API |

### Frontend Apps

| App | Tech | Purpose |
|-----|------|---------|
| `corpperks-landing` | Next.js | Marketing website |
| `src/admin` | React | Admin dashboard |

---

## FEATURES BY SERVICE

### 1. rez-corpperks-service (4013)

#### Benefits Module
- [x] Benefit catalog management
- [x] Create/read/update/delete benefits
- [x] Benefit types: meal, travel, wellness, learning, gift
- [x] Frequency: monthly, yearly
- [x] Status tracking: active, inactive, expired

#### Employees Module
- [x] Employee enrollment
- [x] Bulk CSV import
- [x] Department assignment
- [x] Level-based allocation
- [x] Benefit assignment

#### GST/Invoicing
- [x] GST calculation (18% default)
- [x] Invoice generation
- [x] GSTR-1 report
- [x] E-invoice creation
- [x] Invoice history

#### Rewards/Wallet
- [x] Corp wallet balance
- [x] Transaction history
- [x] Top-up functionality
- [x] Per-employee budgets

#### Integrations
- [x] BambooHR sync
- [x] GreytHR sync
- [x] Zoho People sync
- [x] StayOwn-Hospitality hotel bookings
- [x] nextaBizz integration

> **Note:** nextaBizz and StayOwn-Hospitality are part of CorpPerks ecosystem.

---

### 2. rez-stayown-service (Hotel/OTA)

#### Hotels
- [x] Hotel search
- [x] Property details
- [x] Room availability
- [x] Price display
- [x] Reviews display

#### Bookings
- [x] Create booking
- [x] List bookings
- [x] Booking details
- [x] Cancellation
- [x] Booking history

#### Room QR (Guest Services)
- [x] Room service ordering
- [x] Housekeeping requests
- [x] Checkout procedures
- [x] Local info access
- [x] Feedback collection

#### StayOwn Integration
- [x] API sync
- [x] Inventory management
- [x] Real-time availability
- [x] Hotel bookings
- [x] Room QR codes

---

### 3. src/backend (4014) - Unified API

#### GST Module
- [x] Calculate GST (18%)
- [x] Create invoices
- [x] List invoices
- [x] GSTR-1 report
- [x] E-invoice generation
- [x] ITC eligibility check
- [x] HSN/SAC code lookup
- [x] Place of supply detection
- [x] Invoice PDF generation

#### Benefits Module
- [x] Benefit catalog CRUD
- [x] Employee enrollment
- [x] Bulk import
- [x] Department allocation
- [x] Budget limits
- [x] Redemption tracking

#### Campaigns
- [x] Campaign creation
- [x] Target audience
- [x] Budget allocation
- [x] Campaign analytics

#### Analytics
- [x] Spend dashboards
- [x] Category breakdowns
- [x] Trend analysis
- [x] Export reports

#### Finance Module (rtmnFinanceRoutes)
- [x] Corporate wallet
- [x] Expense tracking
- [x] BNPL plans
- [x] Payment processing

---

### 4. Admin Dashboard (src/admin)

#### Pages
- [x] Corp Dashboard - Overview stats
- [x] Corp Benefits - Benefit management
- [x] Corp Employees - Employee CRUD
- [x] Corp Bookings - Booking list
- [x] Corp Rewards - Rewards management
- [x] Corp Analytics - Reports
- [x] Corp Invoices - Invoice history
- [x] Corp Campaigns - Campaign manager
- [x] Corp Gifting - Gift management
- [x] Corp Integrations - Third-party sync
- [x] Corp HRIS - HRIS settings
- [x] Corp Health - System health

---

### 5. corpperks-landing (Marketing)

#### Landing Page Sections
- [x] Hero with dashboard preview
- [x] Problem/Solution cards
- [x] Features grid
- [x] How It Works (3 steps)
- [x] Pricing tiers (3 plans)
- [x] Email capture CTA
- [x] Footer with links

---

## API ROUTES SUMMARY

### CorpPerks Service (4013)

| Route | Methods | Features |
|-------|---------|----------|
| `/api/corp/benefits` | GET, POST | List/Create benefits |
| `/api/corp/employees` | GET, POST | Employees |
| `/api/corp/employees/bulk-import` | POST | CSV import |
| `/api/gst/*` | GET, POST | Invoice operations |
| `/api/rewards/*` | GET, POST | Rewards dashboard |
| `/api/wallet/*` | GET, POST | Wallet operations |
| `/api/campaigns/*` | CRUD | Campaign management |
| `/api/hotels/*` | Various | Hotel/OTA endpoints |

### Backend Unified API (4014)

| Route | Methods | Features |
|-------|---------|----------|
| `/api/corp/*` | Full CRUD | Corporate ops |
| `/api/gst/*` | Full GST suite | Invoicing |
| `/api/finance/*` | Wallet/Cards/BNPL | Financial ops |
| `/api/procurement/*` | PO management | B2B procurement |
| `/api/hotels/*` | Hotel operations | OTA features |
| `/api/restaurants/*` | Restaurant ops | Dining |

---

## INTEGRATIONS

### External Services

| Service | Purpose | Status |
|---------|---------|--------|
| RABTUL Auth | Authentication | Connected |
| RABTUL Wallet | Coins/Transactions | Connected |
| RABTUL Karma | Loyalty tiers | Connected |
| StayOwn-Hospitality | Hotel/OTA | Connected |
| nextaBizz | B2B Procurement | Internal |
| BambooHR | HR sync | Connected |
| GreytHR | Employee data | Connected |
| Zoho People | HRIS | Connected |
| Razorpay | Payments | Connected |
| Prometheus | Metrics | Configured |
| Sentry | Error tracking | Configured |

---

## MISSING/FUTURE FEATURES

### Not Implemented Yet
- [ ] Real database (all in-memory)
- [ ] JWT token verification (bypass in some routes)
- [ ] Rate limiting (missing)
- [ ] WebSocket support
- [ ] File uploads
- [ ] Advanced analytics ML
- [ ] Multi-tenancy
- [ ] Audit logging
- [ ] Backup/restore
- [ ] API versioning
- [ ] GraphQL

### Partially Implemented
- [ ] GST filing (basic)
- [ ] HRIS sync (basic)
- [ ] Hotel integration (basic)
- [ ] Invoice generation (basic)

---

## SECURITY ISSUES

### Critical
1. Auth middleware bypass in some services
2. Hardcoded dev tokens
3. No JWT verification
4. CORS allows `*` in some configs

### High
1. In-memory storage (data loss on restart)
2. No rate limiting
3. No input sanitization in some routes

### Medium
1. Basic error handling
2. Limited logging
3. No request validation middleware

### Low
1. Console.log for errors
2. Basic type safety

---

*Last Updated: May 14, 2026*
