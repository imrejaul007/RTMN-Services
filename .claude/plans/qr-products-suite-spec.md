# QR Products Suite — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P2 (Phase 1) | **Build:** ₹18L / 4 weeks | **ARR:** ₹0.9Cr

---

## 1. Concept & Vision

**What it is:** A unified QR code product ecosystem — 8 QR products under REZ-qr-unified — enabling businesses to create, manage, and track all QR code interactions from a single platform.

**What it does:**
- Unified QR code generation and management
- 8 specialized QR products: Safe-QR, Verify-QR, Go4Food, REZ-inbox, REZ-shop, REZ-pay, REZ-loyalty, REZ-feedback
- Analytics dashboard for all QR interactions
- White-label templates for quick deployment

---

## 2. The 8 QR Products

### 2.1 Safe-QR (P0)

**Purpose:** COVID-safe and health verification  
**Use Cases:** Restaurant entry, office access, event check-in

| Feature | Description |
|---------|-------------|
| Vaccination Status | Show vaccination certificate |
| Health Declaration | Daily health check-in |
| Temperature Log | Record temperature reading |
| Access Control | Grant/deny based on status |

### 2.2 Verify-QR (P0)

**Purpose:** Product and document authentication  
**Use Cases:** Anti-counterfeiting, warranty verification, certificate validation

| Feature | Description |
|---------|-------------|
| Product Authentication | Scan to verify genuine product |
| Warranty Lookup | Check warranty status |
| Serial Verification | Verify unique serial numbers |
| Brand Protection | Anti-counterfeit protection |

### 2.3 Go4Food (P1)

**Purpose:** Restaurant ordering and payments  
**Use Cases:** Table ordering, contactless menu, payment

| Feature | Description |
|---------|-------------|
| Digital Menu | Browse menu via QR |
| Order Placement | Order directly from phone |
| Payment | Pay via QR code |
| Feedback | Rate and review |

### 2.4 REZ-inbox (P1)

**Purpose:** Digital business card and contact sharing  
**Use Cases:** Networking, sales, customer follow-up

| Feature | Description |
|---------|-------------|
| Digital Card | Share contact info instantly |
| Social Links | LinkedIn, Twitter, Instagram |
| Portfolio | Share work samples |
| Lead Capture | Save leads to CRM |

### 2.5 REZ-shop (P1)

**Purpose:** Mobile commerce via QR  
**Use Cases:** Quick purchases, product info, buy buttons

| Feature | Description |
|---------|-------------|
| Product Page | Show product details |
| Add to Cart | Quick add functionality |
| Buy Now | Direct purchase |
| Catalog Access | Browse full range |

### 2.6 REZ-pay (P1)

**Purpose:** Payment via QR  
**Use Cases:** Retail payments, donations, invoices

| Feature | Description |
|---------|-------------|
| UPI Payment | Scan and pay via UPI |
| Amount Entry | Enter custom amount |
| Merchant QR | Static merchant QR |
| Split Payment | Divide among multiple |

### 2.7 REZ-loyalty (P1)

**Purpose:** Customer loyalty and rewards  
**Use Cases:** Coffee shops, retail, restaurants

| Feature | Description |
|---------|-------------|
| Points Earning | Earn on every scan |
| Reward Redemption | Redeem points for rewards |
| Tier System | Bronze, Silver, Gold tiers |
| Birthday Bonus | Special offers on birthdays |

### 2.8 REZ-feedback (P1)

**Purpose:** Customer feedback collection  
**Use Cases:** Post-service, post-purchase, NPS surveys

| Feature | Description |
|---------|-------------|
| Star Rating | Quick 1-5 star rating |
| Text Feedback | Free-form comments |
| Photo Upload | Attach images |
| Sentiment Analysis | AI-powered analysis |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REZ-QR-UNIFIED                                  │
├─────────────────────────────────────────────────────────────────┤
│  ADMIN DASHBOARD                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  QR Management │ Analytics │ Templates │ Integrations     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    CORE ENGINE                             │   │
│  │  QR Generation │ Tracking │ Analytics │ Security           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  QR PRODUCTS ───────────────────────────────────────────────── │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │Safe │ │Verify│ │Go4  │ │Inbox│ │Shop │ │Pay  │ │Loyal│ │Feed ││
│  │ QR  │ │ QR  │ │Food │ │     │ │     │ │     │ │ty   │ │back ││
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Features

### 4.1 QR Code Generation (P0)

**Features:**
- Dynamic QR codes (update content without reprint)
- Static QR codes (one-time generation)
- Batch generation
- Custom styling (colors, logo, frame)
- Size and format options
- Short URLs for compact QR

**QR Code Types:**
- URL redirect
- vCard (contact)
- WiFi configuration
- Payment (UPI)
- Custom data

### 4.2 QR Code Management (P0)

**Features:**
- Organize by campaign/category
- Folder structure
- Bulk actions (create, update, delete)
- Version history
- Duplicate detection
- Expiration management

### 4.3 Analytics Dashboard (P0)

**Metrics Tracked:**
| Metric | Description |
|--------|-------------|
| Scans | Total QR scans |
| Unique Scans | Distinct devices/users |
| Scan Location | Where scans happen (city) |
| Scan Time | When scans occur |
| Conversion | Actions after scan |
| Retention | Repeat scans |

**Reports:**
- Real-time scan feed
- Time-series charts
- Geographic heatmap
- Device breakdown
- Campaign comparison

### 4.4 Templates (P1)

**Pre-built Templates:**
- Restaurant Menu
- Retail Product
- Event Check-in
- Business Card
- Payment Page
- Feedback Form
- Loyalty Program
- Verification Badge

### 4.5 Integrations (P1)

| Integration | Products |
|-------------|----------|
| REZ CRM | Lead capture, contact sync |
| REZ Wallet | Payments, loyalty points |
| Google Analytics | Advanced tracking |
| Zapier | 1000+ app connections |
| Shopify | E-commerce sync |
| WhatsApp | Notification delivery |

---

## 5. Data Model

```typescript
interface QRCode {
  id: string;
  userId: string;
  
  // QR Properties
  properties: {
    type: 'url' | 'vcard' | 'wifi' | 'upi' | 'custom';
    content: string;
    shortUrl?: string;
    qrImage: string;
    thumbnail?: string;
  };
  
  // Styling
  styling: {
    foregroundColor: string;
    backgroundColor: string;
    logo?: string;
    frame?: string;
    style: 'square' | 'dot' | 'round';
  };
  
  // Product Type
  product: 'safe-qr' | 'verify-qr' | 'go4food' | 'rez-inbox' | 
           'rez-shop' | 'rez-pay' | 'rez-loyalty' | 'rez-feedback';
  
  // Settings
  settings: {
    isActive: boolean;
    expiresAt?: Date;
    maxScans?: number;
    password?: string;
  };
  
  // Analytics
  analytics: {
    totalScans: number;
    uniqueScans: number;
    lastScanAt?: Date;
    scansByDay: Map<string, number>;
    scansByLocation: Map<string, number>;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

interface Scan {
  id: string;
  qrCodeId: string;
  
  // Device Info
  device: {
    userAgent: string;
    platform: string;
    ip: string;
    city?: string;
    country?: string;
  };
  
  // Context
  context: {
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  
  // Action Taken
  action?: {
    type: string;
    details: Record<string, any>;
  };
  
  timestamp: Date;
}
```

---

## 6. API Endpoints

### QR Management
```
GET    /api/qr-codes
POST   /api/qr-codes
GET    /api/qr-codes/:id
PUT    /api/qr-codes/:id
DELETE /api/qr-codes/:id
POST   /api/qr-codes/batch
GET    /api/qr-codes/:id/qr-image
```

### Analytics
```
GET    /api/qr-codes/:id/analytics
GET    /api/qr-codes/:id/scans
GET    /api/analytics/overview
GET    /api/analytics/export
GET    /api/analytics/by-product
```

### Templates
```
GET    /api/templates
POST   /api/templates
GET    /api/templates/:id
PUT    /api/templates/:id
```

### Product-Specific
```
# Safe-QR
POST   /api/safe-qr/verify
POST   /api/safe-qr/check-in

# Verify-QR
POST   /api/verify-qr/authenticate
GET    /api/verify-qr/warranty/:serial

# Go4Food
POST   /api/go4food/order
GET    /api/go4food/menu

# REZ-inbox
POST   /api/rez-inbox/share
GET    /api/rez-inbox/leads

# REZ-pay
POST   /api/rez-pay/initiate
POST   /api/rez-pay/callback

# REZ-loyalty
POST   /api/rez-loyalty/earn
POST   /api/rez-loyalty/redeem
GET    /api/rez-loyalty/balance

# REZ-feedback
POST   /api/rez-feedback/submit
GET    /api/rez-feedback/responses
```

---

## 7. Pricing Tiers

### Free Tier
- 100 QR codes/month
- Basic analytics
- Standard styling
- Limited products

### Starter (₹499/month)
- 1,000 QR codes/month
- Full analytics
- Custom styling + logo
- All 8 products
- 1 team member

### Professional (₹1,999/month)
- 10,000 QR codes/month
- Advanced analytics
- API access
- Priority support
- 5 team members

### Enterprise (₹9,999/month)
- Unlimited QR codes
- White-label
- Custom integrations
- Dedicated support
- Unlimited team

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| QR scans | 1M/month by Y1 |
| Active campaigns | 500 |
| Products used | 4 avg per customer |
| Retention rate | 85% |
| NPS | 50+ |

---

## 9. Team & Timeline

| Role | Count |
|------|-------|
| Backend Developer | 1 |
| Frontend Developer | 1 |
| Designer | 1 |

**Duration:** 4 weeks  
**Investment:** ₹18L

---

## 10. Go-to-Market

### Phase 1: Launch (Month 1)
- Launch 8 core products
- Landing page + docs
- Free tier activation

### Phase 2: Growth (Month 2-3)
- Template marketplace
- Integration partnerships
- Case studies

### Phase 3: Scale (Month 3-4)
- White-label solution
- Enterprise sales

### Revenue Streams
- Subscription tiers
- Per-scan fees (high volume)
- White-label licensing
- Template marketplace commission

---

*Spec created: June 28, 2026*
