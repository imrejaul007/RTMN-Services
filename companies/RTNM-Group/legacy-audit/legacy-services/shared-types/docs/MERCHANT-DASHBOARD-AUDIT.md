# Merchant Dashboard & Onboarding Audit

## Executive Summary

This audit examines the **rez-app-merchant** mobile app and **rez-merchant-service** backend to assess existing dashboard features, onboarding flow, and QR system integration capabilities. The goal is to identify gaps that need to be addressed to support all 4 QR systems: Room QR, Menu QR, Rez Now, and Ads QR.

---

## 1. Existing Features

### 1.1 Dashboard Features (rez-app-merchant/app/(dashboard))

**Metrics Displayed:**
- **Today at a Glance Section:**
  - Today's Visits (with % change vs yesterday)
  - Today Revenue (in INR, with comparison)
  - Active Offers count
  - Pending Orders count

- **Revenue & Performance:**
  - Live sales counter
  - Daily Command Bar showing:
    - Today's Scans (pendingOrders)
    - Liability Amount (pendingCashback)

- **AI-Powered Insights:**
  - Store Health Score (0-100 with percentile ranking)
  - AI Recommendations with actionable insights
  - Estimated impact indicators

- **Quick Access Widgets:**
  - Growth Actions Card
  - Rendez Bookings Card (social dating platform)
  - Rez Now Analytics Card

**Charts & Graphs:**
- Demand Intelligence Card
- Budget Gauge
- Today's Highlights (horizontal scroll)
- AOV Analytics (Average Order Value)
- Growth metrics over time

**Reports Available:**
- `/reports.tsx` - Comprehensive reports with:
  - Multiple export formats (CSV, XML, JSON)
  - Date range selection (today, week, month, custom)
  - Download history
  - Report categories:
    - Sales Reports
    - Customer Reports
    - Inventory Reports
    - Financial Reports

- `/analytics/` section with 30+ analytics screens:
  - Sales Analytics
  - Customer Analytics
  - Revenue Analytics
  - Inventory Analytics
  - Product Analytics
  - PNL Reports
  - Peak Hours Analysis
  - Churn Risk Assessment
  - LTV Segments
  - Demand Forecast
  - Pricing Suggestions
  - Menu Engineering
  - Cohort Analysis
  - NPS (Net Promoter Score)

**Quick Actions Available:**
- Create Offer
- View Orders
- View Products
- Team Management
- Settings
- Broadcasts
- Marketing Tools
- POS Shortcut
- Integration Hub
- Wallet Access

### 1.2 Onboarding Flow

**Location:** `/app/onboarding/`

**5 Main Steps + Post-Approval:**
1. **Welcome Screen** (`welcome.tsx`)
2. **Business Information** (`business-info.tsx`)
   - Business Name, Owner Name
   - Owner Email, Phone
   - Business Type (Sole Proprietor, Partnership, Pvt Ltd, LLP, Other)
   - Business Category (13 options including Food & Beverage, Retail, etc.)
   - Years in Business
   - Business Description
   - Website URL
   - GST Registration details
   - GSTIN validation
3. **Store Details** (`store-details.tsx`)
   - Store Name
   - Store Type (Online Only, Physical Store, Both)
   - Full Address (Street, City, State, Pincode, Country)
   - Store Phone, Email
   - Delivery Options (radius, charges)
   - Pickup Available toggle
   - Google Place ID
4. **Bank Details** (`bank-details.tsx`)
   - Account Number
   - Bank Name
   - IFSC Code
   - Account Holder Name
5. **Documents** (`documents.tsx`)
   - Document Types: Business License, ID Proof, Address Proof, GST Certificate, PAN Card
   - Document Upload functionality
6. **Review & Submit** (`review-submit.tsx`)
7. **Pending Approval** (`pending-approval.tsx`)

**Additional Setup - REZ Now Wizard** (`rez-now-setup.tsx`):
- 5-step setup for public page
- Step 1: Set Store URL (slug selection with availability check)
- Step 2: Store Type selection
- Step 3: Feature toggles (online ordering, scan & pay, loyalty stamps)
- Step 4: Add first menu item
- Step 5: Confirmation

**Post-Onboarding Checklist** (`merchant-checklist.tsx`):
- 5 required steps:
  1. Complete business profile
  2. Add first offer
  3. Create QR code for check-ins
  4. Set up payout account
  5. Invite first staff member

**Onboarding Assessment:**
- **Estimated Time:** 10-15 minutes (not under 5 minutes)
- **Steps Required:** 6 main steps + REZ Now wizard + post-onboarding checklist
- **Info Collected:** Business info, owner info, store details, bank details, documents
- **Approval Required:** Manual review before activation

### 1.3 QR System Integration

**Current QR Capabilities:**

| Feature | Status | Location |
|---------|--------|----------|
| **Check-in QR** | Active | `/qr-checkin.tsx` |
| **QR Generator** | Active | `/qr-generator/index.tsx` |
| **QR Integration Backend** | Active | `routes/qrIntegration.ts` |
| **Rez Now Setup** | Active | `routes/rezNowConfig.ts`, `routes/rezNowServices.ts` |

**QR Generator Features:**
- Store-level QR code generation (now.rez.money/{slug})
- Per-table QR codes (with table number parameter)
- Share functionality
- Download capability
- Web menu preview

**Backend QR Endpoints:**
```
GET  /qr/public/store/:slug        - Store info by slug
GET  /qr/public/store/id/:storeId  - Store info by ID
GET  /qr/public/menu/:storeId      - Menu with products/categories
POST /merchant/rez-now-config      - Save Rez Now configuration
GET  /merchant/rez-now-config      - Get Rez Now configuration
```

---

## 2. Gaps Found

### 2.1 Room QR Features

**Status: NOT INTEGRATED**

**Missing Dashboard Components:**
- No Room QR dashboard or management screen
- No room listing/management interface
- No room service ordering interface
- No service request tracking
- No hotel-specific analytics

**Required for Room QR:**
- Hotel/Room management screens
- Room QR code generation per room
- Room service menu management
- Housekeeping/maintenance request tracking
- Guest check-in/out integration

### 2.2 Menu QR Features

**Status: PARTIALLY IMPLEMENTED**

**Existing:**
- Basic menu display via `/qr/public/menu/:storeId`
- Product categories and items

**Missing Dashboard Components:**
- Dedicated Menu QR management screen
- Menu customization per QR code type
- Seasonal/temporary menu variations
- Menu analytics (most viewed items, etc.)
- Menu version history
- QR code analytics (scans, views, orders)

### 2.3 Rez Now Features

**Status: MOSTLY IMPLEMENTED**

**Existing:**
- Rez Now Setup wizard
- Store profile configuration
- Feature toggles (online ordering, scan & pay)
- Slug management with availability check
- Public page at now.rez.money/{slug}

**Missing Dashboard Components:**
- Rez Now analytics dashboard (dedicated)
- Campaign management integration
- Customer engagement metrics
- Conversion tracking per QR scan

### 2.4 Ads QR Features

**Status: PARTIALLY IMPLEMENTED (Separate System)**

**Existing in Merchant App:**
- Ad campaigns list (`/ads/index.tsx`)
- Campaign creation (`/ads/create.tsx`)
- Campaign analytics
- Campaign status management

**Existing in AdBazaar:**
- Full Ads QR backend (`/docs/ADS-QR-BACKEND-API.md`)
- Attribution endpoints (verify-visit, purchase, funnel)
- Brand coin management
- Free samples integration
- Consultation booking

**Missing Dashboard Components:**
- Ads QR unified dashboard in merchant app
- QR placement management
- Campaign-QR code linking
- Attribution dashboard with ROI metrics
- GPS-based verification controls
- Dwell time analytics

### 2.5 General Dashboard Gaps

| Gap | Priority | Impact |
|-----|----------|--------|
| Unified QR dashboard | High | All 4 QR systems scattered |
| QR analytics per type | High | No performance visibility |
| QR code management hub | High | No central QR admin |
| Cross-QR customer journey | Medium | Can't track customer across QR types |
| QR A/B testing capability | Low | No optimization features |

---

## 3. Recommendations

### 3.1 Near-term (Phase 1)

**Create Unified QR Hub Dashboard:**
```
/app/(dashboard)/qr-hub/
  - index.tsx (main dashboard)
  - /checkin - Check-in QR management
  - /menu - Menu QR management
  - /rooms - Room QR management (new)
  - /ads - Ads QR management (integrate from AdBazaar)
```

**Features per QR Type:**
| QR Type | Dashboard Features |
|---------|-------------------|
| Check-in | Scan stats, customer list, reward history |
| Menu | View counts, popular items, order volume |
| Room | Occupancy, service requests, revenue |
| Ads | Impressions, visits, purchases, ROI |

### 3.2 Mid-term (Phase 2)

**Add QR-specific Analytics:**
- Scan-to-conversion funnel per QR type
- Customer attribution across QR systems
- Revenue breakdown by QR source
- Cohort analysis by QR interaction

**Enhance Onboarding:**
- Streamline to 5 minutes target
- Progressive disclosure (core first, advanced later)
- Skip option for non-essential steps
- Smart defaults based on business type

### 3.3 Long-term (Phase 3)

**Advanced QR Features:**
- Dynamic QR codes (change content without reprint)
- QR code analytics API for third-party integration
- A/B testing for QR placements
- Multi-location QR management
- QR code templates/branding

---

## 4. Onboarding Assessment

### Current State

| Metric | Current Value | Target |
|--------|---------------|--------|
| Total Steps | 11+ | 5-7 |
| Estimated Time | 10-15 min | Under 5 min |
| Info Fields | 25+ | 15-20 |
| Required Documents | 5 types | 2-3 core |
| Auto-progression | Partial | Full |

### Required Changes for 5-Minute Target

**Phase 1 - Reduce Steps:**
1. Combine Business Info + Store Details (same flow)
2. Bank details as optional (can add later)
3. Document upload post-approval
4. REZ Now setup inline with onboarding

**Phase 2 - Simplify:**
1. Smart defaults based on category
2. Pre-filled data for returning users
3. Skip non-essential fields
4. Mobile-optimized forms

**Phase 3 - Automate:**
1. Auto-detect business type from GSTIN
2. Auto-verify phone via OTP
3. Auto-validate bank details
4. Background document verification

---

## 5. Technical Observations

### 5.1 Backend Routes Available

**Key Route Files:**
- `routes/qrIntegration.ts` - Unified QR endpoints
- `routes/qrCode.ts` - QR code generation
- `routes/rezNowConfig.ts` - Rez Now configuration
- `routes/rezNowServices.ts` - Rez Now services
- `routes/storeLinks.ts` - Store link management
- `routes/ads.ts` - Ad campaign management
- `routes/onboarding.ts` - Onboarding flow

### 5.2 Frontend Architecture

**App Structure:**
- Expo Router based navigation
- Tab-based dashboard layout
- Context-based state management
- Service layer for API calls
- Component-based UI

**Key Files:**
- `app/(dashboard)/_layout.tsx` - Main dashboard layout
- `app/(dashboard)/index.tsx` - Dashboard home (115KB)
- `app/onboarding/_layout.tsx` - Onboarding navigation
- `hooks/useDashboardData.ts` - Dashboard data hook
- `services/api/` - API service layer

### 5.3 Authentication & Authorization

- Merchant auth middleware on all protected routes
- Role-based permissions (admin, manager, cashier, staff)
- Store-based access control
- Real-time status updates via Socket.io

---

## 6. Action Items

| Priority | Item | Owner | Status |
|----------|------|-------|--------|
| P0 | Create QR Hub dashboard | TBD | Not Started |
| P0 | Integrate Room QR management | TBD | Not Started |
| P0 | Add Menu QR analytics | TBD | Not Started |
| P1 | Enhance Ads QR integration | TBD | Not Started |
| P1 | Streamline onboarding to 5 min | TBD | Not Started |
| P2 | Add cross-QR attribution | TBD | Not Started |
| P2 | Create QR A/B testing | TBD | Not Started |

---

## 7. Appendix

### A. Directory Structure Reference

```
rez-app-merchant/
├── app/
│   ├── (dashboard)/          # Main dashboard screens
│   │   ├── index.tsx        # Dashboard home
│   │   ├── reports.tsx      # Reports & exports
│   │   ├── qr-generator.tsx # QR code generator
│   │   ├── analytics/       # 30+ analytics screens
│   │   └── orders.tsx        # Orders management
│   ├── onboarding/          # Onboarding wizard
│   │   ├── index.tsx        # Entry point
│   │   ├── business-info.tsx
│   │   ├── store-details.tsx
│   │   ├── bank-details.tsx
│   │   ├── documents.tsx
│   │   ├── review-submit.tsx
│   │   ├── pending-approval.tsx
│   │   └── rez-now-setup.tsx
│   ├── ads/                 # Ad management
│   └── qr-checkin.tsx       # Quick check-in QR

rez-merchant-service/
└── src/
    └── routes/
        ├── qrIntegration.ts # QR endpoints
        ├── qrCode.ts        # QR generation
        ├── rezNowConfig.ts  # Rez Now config
        ├── ads.ts           # Ad campaigns
        └── onboarding.ts    # Onboarding APIs
```

### B. Key API Endpoints

**QR Endpoints:**
- `GET /qr/public/store/:slug`
- `GET /qr/public/menu/:storeId`
- `PATCH /merchant/rez-now-config`
- `GET /merchant/rez-now-config`

**Onboarding Endpoints:**
- `GET /onboarding/status`
- `PUT /onboarding/profile`
- `PUT /onboarding/documents`

**Analytics Endpoints:**
- `GET /analytics/overview`
- `GET /analytics/sales`
- `GET /analytics/customers`
- `GET /ads/analytics`

---

*Report Generated: 2026-05-03*
*Auditor: Claude Code Audit Agent*
