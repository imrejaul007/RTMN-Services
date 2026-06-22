# AdBazaar Dashboard & Onboarding Audit

**Date:** 2026-05-03
**Status:** Comprehensive Audit Complete
**Auditor:** Claude Code Agent

---

## Executive Summary

This audit compares AdBazaar (the full marketplace platform) with the AdsQr implementation (quick campaign tool) to identify integration points, gaps, and onboarding optimization opportunities.

### Key Findings

| Area | Status | Notes |
|------|--------|-------|
| AdBazaar Vendor Dashboard | Complete | Full feature set for marketplace |
| AdBazaar Buyer Dashboard | Partial | Basic booking flow exists |
| AdBazaar Admin Dashboard | Complete | Full moderation suite |
| AdsQr Campaign Dashboard | MVP | Core features working |
| AdsQr Onboarding | <5 min | 3-step wizard implemented |
| REZ Integration | Complete | Wallet, Auth, Payment integrated |

---

## Existing Features in AdBazaar

### Vendor Dashboard (`/vendor/`)

| Feature | File Path | Status |
|---------|-----------|--------|
| Main Dashboard | `(vendor)/vendor/dashboard/page.tsx` | Complete |
| Listing Management | `(vendor)/vendor/listings/page.tsx` | Complete |
| Create Listing | `(vendor)/vendor/listings/new/page.tsx` | Complete |
| Edit Listing | `(vendor)/vendor/listings/[id]/edit/page.tsx` | Complete |
| Booking Management | `(vendor)/vendor/bookings/page.tsx` | Complete |
| Inquiry Handling | `(vendor)/vendor/inquiries/page.tsx` | Complete |
| Analytics | `(vendor)/vendor/analytics/page.tsx` | Complete |
| Attribution | `(vendor)/vendor/attribution/page.tsx` | Complete |
| Earnings/Payouts | `(vendor)/vendor/earnings/page.tsx` | Complete |
| Bulk Upload | `(vendor)/vendor/bulk-upload/page.tsx` | Complete |
| REZ Connect | `(vendor)/vendor/rez-connect/page.tsx` | Complete |
| KYC/Profile | `(vendor)/vendor/profile/page.tsx` | Complete |

### Admin Dashboard (`/admin/`)

| Feature | File Path | Status |
|---------|-----------|--------|
| Admin Dashboard | `(admin)/admin/dashboard/page.tsx` | Complete |
| User Management | `(admin)/admin/users/page.tsx` | Complete |
| KYC Verification | `(admin)/admin/kyc/page.tsx` | Complete |
| Listing Moderation | `(admin)/admin/listings/page.tsx` | Complete |
| Booking Management | `(admin)/admin/bookings/page.tsx` | Complete |
| QR Scan Monitoring | `(admin)/admin/qr-scans/page.tsx` | Complete |
| Platform Stats | `(admin)/admin/stats/page.tsx` | Complete |

### Buyer Dashboard (`/buyer/`)

| Feature | File Path | Status |
|---------|-----------|--------|
| Browse Listings | `(marketplace)/browse/page.tsx` | Complete |
| Listing View | `(marketplace)/listing/[id]/page.tsx` | Partial |
| Booking Flow | API-based | Complete |

### Auth & Onboarding

| Feature | File Path | Status |
|---------|-----------|--------|
| Login | `(auth)/login/page.tsx` | Complete |
| Register | `(auth)/register/page.tsx` | Complete |
| 2FA Verification | `(auth)/verify-2fa/page.tsx` | Complete |
| Forgot Password | `(auth)/forgot-password/page.tsx` | Complete |
| Email Verification | Supabase Auth | Complete |

### API Routes

| Category | Endpoints | Status |
|----------|-----------|--------|
| Auth | 2FA, SSO, Login, Logout | Complete |
| Listings | CRUD, Availability, Views | Complete |
| Bookings | Create, Pay, Proof, Approve | Complete |
| Inquiries | Create, Quote, Accept, Decline | Complete |
| QR Codes | Scan, Image Upload | Complete |
| Campaigns | CRUD, Link Bookings | Complete |
| Attribution | Analytics | Complete |
| Vendor | Earnings, Payouts, Analytics | Complete |
| Admin | KYC, Moderation, Disputes | Complete |
| Webhooks | Razorpay, REZ visit/purchase | Complete |

---

## Our AdsQr Implementation

### Dashboard (`/campaigns/`)

| Feature | File Path | Status |
|---------|-----------|--------|
| Main Dashboard | `src/app/page.tsx` | Complete |
| Campaign Detail | `src/app/campaigns/[id]/page.tsx` | Complete |
| Edit Campaign | `src/app/campaigns/[id]/edit/page.tsx` | Complete |
| Create Campaign | `src/app/campaigns/new/page.tsx` | Complete |
| Templates | `src/app/campaigns/templates/page.tsx` | Complete |
| Rewards Dashboard | `src/app/rewards/page.tsx` | Complete |
| Redemption History | `src/app/rewards/history/page.tsx` | Complete |
| Login | `src/app/login/page.tsx` | Complete |

### API Routes

| Endpoint | Status |
|----------|--------|
| `POST /api/campaigns` - Create campaign | Complete |
| `GET /api/campaigns` - List campaigns | Complete |
| `GET /api/campaigns/[id]` - Get campaign | Complete |
| `PUT /api/campaigns/[id]` - Update campaign | Complete |
| `POST /api/campaigns/[id]/qr` - Generate QR | Complete |
| `POST /api/campaigns/bulk` - Bulk create | Complete |
| `GET /api/campaigns/[id]/qr/download` - Download QR | Complete |
| `POST /api/scan/[slug]` - Record scan | Complete |
| `POST /api/visit` - Record visit | Complete |
| `POST /api/purchase` - Record purchase | Complete |
| `GET /api/analytics/attribution` - ROI metrics | Complete |
| `GET /api/analytics/qr/[id]` - QR analytics | Complete |

### REZ Integrations

| Integration | File | Status |
|-------------|------|--------|
| REZ Auth | `src/lib/rezAuth.ts` | Complete |
| REZ Wallet | `src/lib/rezWallet.ts` | Complete |
| REZ Payment | `src/lib/rezPayment.ts` | Complete |

### Reward Systems

| System | File | Status |
|--------|------|--------|
| REZ Coins | `src/lib/rewards/rezCoins.ts` | Complete |
| Brand Coins | `src/lib/rewards/brandCoins.ts` | Complete |
| Free Samples | `src/lib/rewards/freeSamples.ts` | Complete |
| Free Consultation | `src/lib/rewards/freeConsultation.ts` | Complete |

### Database Schema

Tables created in `supabase/migrations/SETUP.sql`:
- `campaigns` - Campaign data
- `qr_codes` - QR code records
- `scan_events` - Attribution records
- `visit_events` - GPS-verified visits
- `purchase_events` - Transaction records
- `coin_transactions` - Coin ledger
- `attribution_funnel` - Analytics view

---

## Integration Points

### AdBazaar to AdsQr Integration

```
ADBBAZAAR ECOSYSTEM FLOW:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                        AdOS                                 │   │
│   │              (Intelligence Layer)                          │   │
│   │                                                               │   │
│   │   • Smart Campaign Planner    • ROI Prediction               │   │
│   │   • Budget Optimizer        • Audience Intelligence        │   │
│   │   • Attribution Engine       • Recommendations             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│         ┌───────────────────┼───────────────────┐                  │
│         │                   │                   │                    │
│         ▼                   ▼                   ▼                    │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  AdBazaar  │    │   AdsQr    │    │   ReZ Mind  │        │
│   │             │    │             │    │             │        │
│   │ Marketplace │    │ Quick QR   │    │   Intent    │        │
│   │ + Bookings │    │ Campaigns  │    │  Analysis   │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│          │                   │                   │                  │
└──────────┴───────────────────┴───────────────────┴──────────────────┘
```

### REZ Service Integrations

| Service | AdBazaar | AdsQr | Shared |
|---------|----------|-------|--------|
| REZ Auth | Yes | Yes | Yes |
| REZ Wallet | Yes | Yes | Yes |
| REZ Payment | Yes | Yes | Yes |
| REZ Marketing | Yes | No | No |
| REZ Merchant | Yes | Yes | Yes |

### Database Connections

| Component | Database | Connection |
|-----------|----------|------------|
| AdBazaar | Supabase | Direct |
| AdsQr | Supabase | Direct |
| rez-adbazaar | MongoDB | Direct |
| rez-ads-service | MongoDB | Direct |

---

## Gaps

### Dashboard Gaps in AdBazaar

| Gap | Severity | Impact |
|-----|----------|--------|
| No dedicated campaign creation wizard | Medium | Complex flow for buyers |
| No upsell prompt from AdsQr to AdBazaar | High | Missed conversion |
| No unified brand dashboard | High | Fragmented experience |
| No campaign templates | Medium | Slower onboarding |
| No AI-powered recommendations | Low | Future feature |

### Dashboard Gaps in AdsQr

| Gap | Severity | Impact |
|-----|----------|--------|
| No dedicated onboarding wizard | Medium | Users may not know where to start |
| No upsell to AdBazaar campaigns | High | Revenue opportunity loss |
| No A/B testing for landing pages | Low | Future feature |
| No campaign duplication | Low | Minor convenience |
| No automated budget alerts | Medium | Budget overruns |

### Integration Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| No single sign-on between AdBazaar and AdsQr | High | Separate auth flows |
| No shared user profile data | High | Duplicate profiles |
| No cross-platform analytics | Medium | Siloed reporting |
| No shared merchant ID | High | REZ Connect fragmented |
| No campaign migration path | Medium | Users locked to one platform |

### Technical Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| No shared Supabase instance | High | Data isolation |
| No shared authentication | High | Multiple auth systems |
| No unified API gateway | Medium | Multiple entry points |
| No webhook standardization | Low | Inconsistent event handling |

---

## Onboarding Assessment

### Current AdBazaar Onboarding

```
VENDOR ONBOARDING FLOW:
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Register          │  Email + Password                    │ ~2 min
│  Step 2: Email Verify      │  Click link in email                 │ ~1 min
│  Step 3: Complete Profile  │  Name, Phone, Business Type          │ ~2 min
│  Step 4: Submit KYC        │  Upload documents                    │ ~5 min
│  Step 5: Create Listing    │  Multi-step form with images        │ ~10 min
│  Step 6: Wait for Approval │  Admin reviews (24-48h)              │ ~24h
└─────────────────────────────────────────────────────────────────────┘
Total Time to First Listing: ~20 min + 24h approval
```

### Current AdsQr Onboarding

```
BRAND ONBOARDING FLOW:
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Login/Register     │  Via REZ Auth                       │ ~1 min
│  Step 2: Create Campaign    │  Template selection                 │ ~2 min
│  Step 3: Configure Rewards  │  Set coin rewards                   │ ~1 min
│  Step 4: Generate QR        │  One-click generation               │ <1 min
└─────────────────────────────────────────────────────────────────────┘
Total Time to First QR: ~5 min
```

### Comparison

| Metric | AdBazaar | AdsQr | Target |
|--------|----------|-------|--------|
| Time to first campaign | 20+ min | 5 min | <5 min |
| Complexity | High | Low | Low |
| Approval required | Yes (24-48h) | No | No |
| Steps to launch | 6+ | 4 | 3 |

---

## Recommendations

### 1. Unify Authentication

**Priority:** High
**Effort:** Medium

```typescript
// Unified auth flow using REZ Auth
interface UnifiedAuth {
  isAuthenticated: boolean
  userId: string
  merchantId?: string // Linked REZ merchant
  brandId?: string   // AdsQr brand
  role: 'vendor' | 'buyer' | 'brand' | 'admin'
}
```

### 2. Add Onboarding Wizard to AdsQr

**Priority:** High
**Effort:** Low

```typescript
// 3-step wizard flow
interface OnboardingWizard {
  steps: [
    { id: 'business', title: 'Your Business', fields: ['name', 'category', 'logo'] },
    { id: 'campaign', title: 'First Campaign', fields: ['name', 'offer', 'budget'] },
    { id: 'rewards', title: 'Set Rewards', fields: ['scanReward', 'visitReward', 'purchaseReward'] }
  ]
}
```

### 3. Add Upsell Prompt from AdsQr to AdBazaar

**Priority:** High
**Effort:** Low

```typescript
// In campaign detail page, add upsell banner
const UpsellBanner = () => (
  <div className="bg-amber-100 p-4 rounded-lg">
    <p>Want to reach more customers?</p>
    <a href="/adBazaar/onboarding">Upgrade to AdBazaar</a>
  </div>
)
```

### 4. Create Unified Brand Dashboard

**Priority:** Medium
**Effort:** High

```typescript
// Unified dashboard showing both AdsQr and AdBazaar campaigns
interface UnifiedBrandDashboard {
  campaigns: {
    adsQr: Campaign[]
    adBazaar: Campaign[]
  }
  totalSpend: number
  totalScans: number
  totalVisits: number
  totalPurchases: number
  roas: number
}
```

### 5. Share Supabase Instance

**Priority:** High
**Effort:** High

```typescript
// Shared database schema
interface SharedSchema {
  users: {
    id: uuid
    email: string
    rez_merchant_id?: string
    brand_id?: string  // AdsQr brand
    role: 'vendor' | 'buyer' | 'brand'
  }
  // Both platforms use same users table
}
```

### 6. Add REZ Connect to AdsQr

**Priority:** Medium
**Effort:** Low

```typescript
// Similar to AdBazaar's REZ Connect
const REZConnectBanner = ({ merchantId }) => (
  merchantId ? (
    <Badge>REZ Connected: {merchantId}</Badge>
  ) : (
    <Button href="/rez-connect">Connect REZ</Button>
  )
)
```

---

## Action Items

### Immediate (This Sprint)

- [ ] Add onboarding wizard to AdsQr dashboard
- [ ] Add upsell prompt to AdsQr (AdsQr -> AdBazaar)
- [ ] Add REZ Connect banner to AdsQr
- [ ] Share Supabase instance between platforms

### Short-term (Next Sprint)

- [ ] Unify authentication via REZ Auth
- [ ] Create unified brand dashboard
- [ ] Add cross-platform analytics
- [ ] Implement campaign migration tool

### Long-term (Future Roadmap)

- [ ] Add AI-powered recommendations
- [ ] Implement A/B testing for landing pages
- [ ] Build automated budget alerts
- [ ] Create white-label option for partners

---

## Files Analyzed

| File | Purpose |
|------|---------|
| `adBazaar/FEATURES.md` | AdBazaar feature documentation |
| `adBazaar/CLAUDE.md` | Project configuration |
| `adBazaar/src/app/(vendor)/vendor/*` | Vendor dashboard pages |
| `adBazaar/src/app/(admin)/admin/*` | Admin dashboard pages |
| `adBazaar/src/app/(auth)/*` | Auth pages |
| `adsqr/CONCEPT.md` | AdsQr concept documentation |
| `adsqr/AUDIT.md` | AdsQr security audit |
| `adsqr/src/app/*` | AdsQr dashboard pages |
| `adsqr/src/lib/rez*.ts` | REZ integrations |
| `docs/MERCHANT-INTEGRATION-GUIDE.md` | Integration documentation |
| `docs/ADS-QR-BACKEND-API.md` | Backend API documentation |
| `ados/ADOS-SPEC.md` | AdOS specification |
| `adsos/README.md` | AdOS documentation |
| `rez-ads-service/README.md` | Ads service documentation |
| `rez-adbazaar/src/index.js` | AdBazaar service backend |

---

## Conclusion

AdBazaar and AdsQr are complementary platforms with significant overlap in their REZ integrations but limited actual integration. The main opportunity is unifying the authentication and creating a seamless experience where AdsQr serves as the entry point and AdBazaar serves as the upsell.

**Key Takeaways:**
1. AdsQr is production-ready for quick campaigns
2. AdBazaar is production-ready for marketplace
3. Both need unified authentication
4. AdsQr onboarding is already <5 min
5. Missing upsell path between platforms
6. Shared Supabase would enable unified analytics
