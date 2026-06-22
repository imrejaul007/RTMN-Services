# CorpPerks MVP — Focused 3-Feature Wedge

## Positioning

> **Corporate Spend & Benefits Platform**
> Powered by ReZ ecosystem

---

## MVP Definition: 3-Feature Wedge

| Feature | Why | Revenue |
|---------|-----|---------|
| **Corporate Dining** | High frequency, clear ROI | Commissions + SaaS |
| **Corporate Hotel Booking** | GST invoices = differentiator | Markup + GST savings |
| **Corporate Gifting** | Seasonal + recurring | Margin + platform fee |

**Total Addressable**: Companies spending on team meals, business travel, and employee/client gifts.

---

## Architecture: ReZ Service Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│ CorpPerks Admin Portal (rez-app-admin) │
│ /corp/dining │ /corp/hotels │ /corp/gifting │
└─────────────────────────────────┬───────────────────────────────────┘
 │
┌─────────────────────────────────┴───────────────────────────────────┐
│ CorpPerks API Layer (NEW routes in rez-api-gateway) │
│ POST /api/corp/bookings │ POST /api/corp/orders │ POST /api/corp/gifts │
└─────────────────────────────────┬───────────────────────────────────┘
 │
┌─────────────────────────────────┴───────────────────────────────────┐
│ REZ ECOSYSTEM (Assembled, not built) │
├─────────────────────────────────────────────────────────────────────┤
│ │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────┐ │
│ │ rez-wallet-service │ │ rez-merchant-service │ │ Hotel OTA │ │
│ │ • Corporate coins │ │ • Dining partners │ │ • Corp rates │ │
│ │ • Benefit balances │ │ • Gifting vendors │ │ • GST invoices│ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────┘ │
│ │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────┐ │
│ │ rez-order-service │ │ rez-payment-service │ │ nextabizz │ │
│ │ • Booking orders │ │ • Corporate payouts │ │ • Gift catalog│ │
│ │ • Status tracking │ │ • Reimbursements │ │ • Bulk orders│ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────┘ │
│ │
│ ┌──────────────────────┐ ┌──────────────────────┐ │
│ │ rez-finance-service │ │ rez-auth-service │ │
│ │ • GST calculation │ │ • Corp RBAC │ │
│ │ • Budget tracking │ │ • SSO ready │ │
│ └──────────────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module 1: Corporate Dining

### What It Does
- HR/Admin books team lunches, client dinners, catering
- Employees use meal benefits at partner restaurants
- GST-compliant invoices for all corporate orders

### Integration Points

| ReZ Service | Role | Changes Needed |
|-------------|------|----------------|
| `rez-merchant-service` | Restaurant network | Add `isCorporatePartner` flag, corporate discount tiers |
| `rez-order-service` | Order management | Add `isCorporateOrder`, `costCenter`, `companyId`, `gstIn` |
| `rez-wallet-service` | Meal benefits | Add `meal_benefit` coin type with monthly allocation |
| `rez-payment-service` | Settlement | Add `CORPORATE_DINING` payment type |

### Data Flow
```
HR Admin books team lunch
 → CorpPerks API (companyId, costCenter, guestCount)
 → rez-order-service (create corporate order)
 → rez-merchant-service (notify restaurant)
 → rez-payment-service (charge corporate wallet OR employee meal coins)
 → rez-finance-service (calculate GST, generate invoice)
 → Invoice sent to company email
```

### CorpPerks-Specific Models

```typescript
// CorporateDiningOrder (extends rez-order-service Order)
interface CorporateDiningOrder {
  orderId: string;
  companyId: string;
  costCenter: string;
  gstIn: string;
  bookingType: 'team_lunch' | 'client_dinner' | 'catering';
  guestCount: number;
  selectedRestaurant: string; // merchantId
  budgetRange: { min: number; max: number };
  dietaryRequirements: string[];
  gstInvoiceRequired: boolean;
  invoiceNumber: string;
  gstBreakdown: GSTBreakdown;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
```

### Admin Portal Pages
- `/corp/dining/partners` — Manage restaurant partners
- `/corp/dining/orders` — View/manage bookings
- `/corp/dining/invoices` — GST invoices

### Employee Experience (ReZ App)
- See "Corporate Dining" section
- Use meal benefit coins
- Submit receipts via camera
- View order history with GST invoices

---

## Module 2: Corporate Hotel Booking

### What It Does
- Corporate hotel stays with negotiated rates
- GST invoices for business travel expense claims
- Book for employees, teams, or executives

### Integration Points

| External Service | Role | Integration |
|-----------------|------|-------------|
| **Hotel OTA** | Booking engine | Corporate rate codes, GST invoices |
| **rez-finance-service** | GST calculation | Full GST breakdown on every booking |
| **rez-wallet-service** | Travel benefits | `travel_benefit` coins |

### Killer Feature: GST Optimization

This is the differentiator. Every corporate hotel booking includes:

```typescript
interface HotelBookingGST {
  roomRate: number;
  cgst: number;      // 6%
  sgst: number;      // 6%
  totalGST: number;  // 12%
  itcEligible: boolean;
  hsnCode: string;   // HSN 9963 for hotel accommodation
  placeOfSupply: string;
  companyGSTIN: string;
  invoiceNumber: string;  // Format: CP/Hotel/YYYY-MM/XXXXX
}
```

**Why ITC matters**: Companies can claim Input Tax Credit on GST paid for business travel. CorpPerks provides ITC-eligible invoices automatically.

### Data Flow
```
Employee searches hotels
 → Hotel OTA API (filtered by corporate rates)
 → CorpPerks booking confirmation
 → rez-finance-service (calculate GST with ITC eligibility)
 → Generate GST invoice (compliant format)
 → Send to company finance + employee email
 → Update travel budget tracking
```

### Admin Portal Pages
- `/corp/travel/policy` — Set travel policy (per diem, class, approval)
- `/corp/travel/bookings` — All corporate hotel bookings
- `/corp/travel/invoices` — GST invoices with ITC reports

---

## Module 3: Corporate Gifting

### What It Does
- Festival gifting campaigns (Diwali, Christmas, etc.)
- Employee milestone gifts (work anniversaries, promotions)
- Bulk client gifting
- Personalized with company branding

### Integration Points

| Service | Role | Changes Needed |
|---------|------|---------------|
| `nextabizz` | Gift procurement | Bulk pricing API, personalization |
| `rez-catalog-service` | Gift catalog | `isCorporateGift` flag, bulk tiers |
| `rez-merchant-service` | Premium partners | Add gifting merchants |
| `rez-wallet-service` | Gift coins | `gift_benefit` coins for milestone rewards |

### Gift Catalog Structure

```typescript
interface CorporateGiftCatalog {
  catalogId: string;
  companyId: string;
  name: string;  // "Diwali 2024 Campaign"
  type: 'festival' | 'milestone' | 'client' | 'thank_you';

  items: CorporateGiftItem[];
  personalization: {
    giftWrapping: boolean;
    customMessage: boolean;
    companyBranding: boolean;  // Logo on card/item
  };

  recipients: {
    type: 'employees' | 'clients' | 'custom';
    employeeFilter?: { department?: string; level?: string };
    customList?: string[];  // email/phone list
  };

  budget: {
    perPersonBudget: number;
    totalBudget: number;
    costCenter: string;
  };

  delivery: {
    type: 'bulk_to_company' | 'direct_to_recipient';
    companyAddress?: Address;
  };

  schedule: {
    sendDate: Date;
    allowEarlyRedemption: boolean;
    expiryDate: Date;
  };
}

interface CorporateGiftItem {
  productId: string;
  sku: string;
  name: string;
  imageUrl: string;
  price: number;
  bulkPricing: BulkPricingTier[];
  personalizationOptions: string[];
  inventory: number;
}
```

### Bulk Pricing (nextabizz integration)

```typescript
interface BulkPricingTier {
  minQuantity: number;
  maxQuantity: number;
  discountPercent: number;
  pricePerUnit: number;
}

// Example
const TIER_1 = { min: 50, max: 100, discount: 10%, price: 450 };
const TIER_2 = { min: 101, max: 500, discount: 15%, price: 425 };
const TIER_3 = { min: 501, max: Infinity, discount: 25%, price: 375 };
```

### Admin Portal Pages
- `/corp/gifting/catalogs` — Manage gift campaigns
- `/corp/gifting/orders` — Bulk order management
- `/corp/gifting/templates` — Save campaign templates
- `/corp/gifting/reports` — Delivery status, costs

---

## GST-First Architecture (Moved to MVP)

### Why GST is the Wedge

Indian companies spend crores on:
- Business travel (hotel stays)
- Client entertainment (dining)
- Employee gifts

All of it requires GST-compliant invoices for ITC claims.

**Current state**: Companies use personal cards, collect invoices manually, struggle with reconciliation.

**CorpPerks advantage**: Every transaction = automatic GST invoice with ITC eligibility.

### GST Service Extension

```typescript
// Extend rez-finance-service with CorpPerks GST module
interface CorpGSTService {

  // Calculate GST for any corporate transaction
  calculateGST(params: {
    amount: number;
    serviceType: 'dining' | 'hotel' | 'gifting' | 'travel';
    companyGSTIN: string;
    placeOfSupply: string;
  }): GSTBreakdown;

  // Check ITC eligibility
  checkITCeligibility(params: {
    serviceType: string;
    companyType: 'regular' | 'composition';
  }): { eligible: boolean; conditions?: string[] };

  // Generate invoice number
  generateInvoiceNumber(params: {
    companyPrefix: string;  // From company settings
    serviceType: string;
    date: Date;
    sequence: number;
  }): string;  // Format: CP/{TYPE}/{YYYY-MM}/{XXXXX}

  // Generate compliant invoice PDF
  generateInvoicePdf(invoice: GSTInvoice): Promise<Buffer>;

  // Batch GST reports for filing
  generateGSTR1Report(companyId: string, period: Month): GSTR1Report;
}
```

### GST Invoice Format

```typescript
interface GSTInvoice {
  // Invoice Header
  invoiceNumber: string;
  invoiceDate: Date;
  issuedBy: {
    name: string;
    address: string;
    gstIn: string;
    pan: string;
  };

  // Issued To
  issuedTo: {
    companyName: string;
    address: string;
    gstIn: string;
  };

  // Service Details
  service: {
    description: string;
    hsnCode: string;
    sacCode: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
  };

  // Tax Breakdown
  tax: {
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate?: number;
    igstAmount?: number;
    totalTax: number;
  };

  // ITC
  itc: {
    eligible: boolean;
    itcAmount: number;
  };

  // Totals
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  amountInWords: string;

  // Metadata
  placeOfSupply: string;
  reverseCharge: boolean;
  qrCode: string;
}
```

---

## Pricing Tiers (Core / Pro / Enterprise)

### Core — ₹99/employee/month

| Feature | Included |
|---------|----------|
| Corporate Dining | ✓ |
| Corporate Hotel Booking | ✓ |
| Basic GST Invoices | ✓ |
| Employee Meal Benefits | 1 benefit type |
| Admin Dashboard | Basic |
| Support | Email |

### Pro — ₹249/employee/month

| Feature | Core | Pro |
|---------|------|-----|
| Corporate Dining | ✓ | ✓ |
| Corporate Hotel Booking | ✓ | ✓ |
| GST Invoices + ITC Reports | Basic | Full |
| Corporate Gifting | — | ✓ |
| Employee Benefits | 1 type | 3 types |
| Recognition Coins | — | ✓ |
| CSR Campaigns | — | ✓ |
| Admin Dashboard | Basic | Advanced |
| API Access | — | ✓ |
| Support | Email | Priority |

### Enterprise — Custom

| Feature | Pro | Enterprise |
|---------|-----|------------|
| All Pro features | ✓ | ✓ |
| HRIS Integration | — | ✓ |
| Custom GST configurations | — | ✓ |
| Policy Engine | — | ✓ |
| Dedicated Account Manager | — | ✓ |
| SLA | — | 99.9% |
| SSO/SAML | — | ✓ |
| On-premise option | — | ✓ |

---

## MVP Implementation: 8-Week Sprint

### Week 1-2: Foundation
```
□ Create corp-api routes in rez-api-gateway
  - /api/corp/dining/*
  - /api/corp/hotels/*
  - /api/corp/gifting/*

□ Extend rez-auth-service with corp roles
  - corp_admin, corp_hr, corp_finance

□ New models in rez-wallet-service
  - CorporateBenefit
  - CorporateEmployee

□ New models in rez-merchant-service
  - CorporatePartner (extend existing)
  - MerchantCorporateConfig
```

### Week 3-4: Corporate Dining
```
□ Extend rez-order-service
  - Add corporate order fields
  - Add costCenter to order schema

□ GST invoice generation for dining
  - HSN code 9963 (restaurant services)
  - CGST/SGST calculation

□ Admin portal pages
  - /corp/dining/partners
  - /corp/dining/orders
  - /corp/dining/invoices
```

### Week 5-6: Hotel Booking + GST
```
□ Hotel OTA integration
  - Corporate rate codes
  - Booking confirmation flow

□ GST service extension
  - ITC eligibility checker
  - GST invoice PDF generation
  - Invoice number generator

□ Admin portal pages
  - /corp/travel/policy
  - /corp/travel/bookings
  - /corp/travel/invoices
```

### Week 7-8: Gifting + Polish
```
□ nextabizz integration
  - Bulk pricing API
  - Gift catalog sync

□ Gifting campaign flow
  - Campaign creation
  - Recipient management
  - Delivery tracking

□ Admin portal pages
  - /corp/gifting/catalogs
  - /corp/gifting/orders

□ Employee mobile experience
  - Corporate benefits section in ReZ app
  - View GST invoices
```

### Week 9+: Beta & Launch
```
□ Internal beta with 2-3 pilot companies
□ Feedback iteration
□ Pricing page
□ Sales enablement materials
□ Launch
```

---

## Service Changes Summary

| Service | File | Change |
|---------|------|--------|
| `rez-api-gateway` | NEW: `src/routes/corp/` | 3 route files |
| `rez-auth-service` | `src/models/Role.ts` | Add corp roles |
| `rez-wallet-service` | NEW: `CorporateBenefit.ts` | Benefit allocations |
| `rez-wallet-service` | NEW: `CorporateEmployee.ts` | Enrollment |
| `rez-wallet-service` | `models/Wallet.ts` | Add corp coin types |
| `rez-merchant-service` | NEW: `MerchantCorporateConfig.ts` | Corp settings |
| `rez-merchant-service` | `models/Merchant.ts` | Add corp flags |
| `rez-order-service` | `models/Order.ts` | Add corporate fields |
| `rez-finance-service` | NEW: `CorpGSTService.ts` | GST calculations |
| `Hotel OTA` | Extend booking flow | Corp rate codes |
| `nextabizz` | Extend catalog | Bulk pricing |
| `rez-app-admin` | NEW: `corp/` folder | Admin pages |

---

## New Files to Create

```
rez-wallet-service/src/models/
├── CorporateBenefit.ts
├── CorporateEmployee.ts
└── BenefitEnrollment.ts

rez-merchant-service/src/models/
└── MerchantCorporateConfig.ts

rez-finance-service/src/services/
└── CorpGSTService.ts

rez-api-gateway/src/routes/corp/
├── index.ts
├── dining.ts
├── hotels.ts
├── gifting.ts
└── auth.ts (corp roles)

rez-app-admin/src/pages/corp/
├── benefits/
├── dining/
├── hotels/
├── gifting/
└── reports/
```

---

## Success Metrics for MVP

| Metric | Target |
|--------|--------|
| Pilot companies | 3 |
| Monthly GMV (pilot) | ₹5L |
| Avg GST savings per company | 12% on travel |
| Time to book (dining) | < 5 min |
| Invoice generation | Auto, < 30 sec |
| Employee adoption | > 70% in pilot |

---

## What's NOT in MVP

- Expense claims engine
- Full reimbursement workflows
- Corporate wallet with float
- HRIS integrations
- Complex policy engine
- Full Concur-like features

These are v2+.

**MVP thesis**: Prove corporate demand with simpler "managed spend marketplace" before building heavy enterprise features.
