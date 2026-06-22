# REZ QR ECOSYSTEM - COMPLETE SOT
**Date:** May 12, 2026  
**Status:** COMPLETE

---

## QR SERVICES OVERVIEW

| QR Type | Company | Service | Tech | Purpose |
|---------|---------|---------|------|---------|
| **Verify Product** | REZ-Consumer | verify-qr-service | Node.js | Product warranty |
| **ReZ Now** | REZ-Consumer | rez-now | Next.js | Instant commerce |
| **Menu QR** | REZ-Consumer | rez-web-menu | Next.js | Restaurant menu |
| **AdQR** | REZ-Media | adsqr | Node.js | Ad campaigns |
| **Shelf QR** | REZ-Media | rez-shelf-qr | Node.js | Product scanning |
| **Creator QR** | REZ-Media | creators | Next.js | Influencer links |
| **Room QR** | StayOwn | verify-service | Next.js | Hotel room access |

---

## QR FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│ REZ QR ECOSYSTEM │
├─────────────────────────────────────────────────────────────────────┤
│ │
│ VERIFY QR ─────────── REZ-Consumer ─── Product warranty │
│ ├── Scan QR ──── Verify authenticity │
│ ├── Activate ──── Link to customer │
│ ├── Warranty ──── Track expiry │
│ └── Claim ─────── File warranty claim │
│ │
│ COMMERCE QR ─────── REZ-Consumer ─── Shopping │
│ ├── ReZ Now ──── Instant buy │
│ └── Menu QR ───── Restaurant/hotel menu │
│ │
│ AD QR ────────── REZ-Media ───── Marketing │
│ ├── AdQR ─────── Campaign tracking │
│ ├── Shelf QR ─── Product discovery │
│ └── Creator QR ── Influencer links │
│ │
│ HOTEL QR ───────── StayOwn ───────── Hospitality │
│ └── Room QR ───── Smart room access │
│ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. VERIFY PRODUCT QR
**Company:** REZ-Consumer  
**Service:** verify-qr-service  
**Tech:** Node.js + MongoDB

### Purpose
Product authenticity verification + warranty activation

### Flow
```
Customer buys product
     ↓
Scans QR on product
     ↓
Verify authenticity (checks product database)
     ↓
"Activate Warranty" button
     ↓
Enter: Name, Phone, Email
     ↓
Warranty activated
     ↓
Customer gets warranty card QR
     ↓
File claim anytime
```

### Features
- [x] Product verification
- [x] Warranty activation
- [x] Customer dashboard
- [x] Claim filing
- [x] Expiry tracking
- [x] QR code generation

### APIs
```
POST /api/verify          - Verify product
POST /api/activate-warranty - Activate warranty
GET  /api/warranty/:serial - Get warranty status
POST /api/claim           - File claim
```

### Connected To
- REZ-Merchant (product catalog)
- REZ-Consumer (user profile)
- MongoDB (warranty records)

### Database
```javascript
Warranty: {
  serial_number,
  merchant_id,
  user_id,
  customer_name,
  customer_phone,
  customer_email,
  purchase_date,
  warranty_expiry_date,
  warranty_status,
  claims[]
}
```

---

## 2. REZ NOW QR
**Company:** REZ-Consumer  
**Service:** rez-now  
**Tech:** Next.js + Vercel

### Purpose
Instant commerce - scan QR → buy now

### Flow
```
Scan QR
     ↓
Product page
     ↓
Add to cart
     ↓
Payment
     ↓
Order confirmed
```

### Features
- [x] Product display
- [x] Quick add to cart
- [x] One-tap payment
- [x] Order tracking
- [x] Social sharing

### URL
https://rez-now.vercel.app

---

## 3. MENU QR
**Company:** REZ-Consumer  
**Service:** rez-web-menu  
**Tech:** Next.js + Vercel

### Purpose
Digital restaurant/hotel menu via QR

### Flow
```
Scan Menu QR
     ↓
Browse menu
     ↓
Order items
     ↓
Payment
```

### Features
- [x] Menu display
- [x] Categories
- [x] Add to cart
- [x] Order placement
- [x] Dietary filters

### URL
https://rez-now.vercel.app/menu

---

## 4. ADQR
**Company:** REZ-Media  
**Service:** adsqr  
**Tech:** Node.js + Vercel

### Purpose
Marketing campaign tracking + attribution

### Flow
```
Creator/Brand creates campaign
     ↓
QR code generated
     ↓
Customer scans
     ↓
Attribution tracked
     ↓
Conversion measured
```

### Features
- [x] Campaign management
- [x] QR code generation
- [x] Attribution tracking
- [x] Conversion analytics
- [x] Creator commission

### URL
https://adsqr.vercel.app

---

## 5. SHELF QR
**Company:** REZ-Media  
**Service:** rez-shelf-qr  
**Tech:** Node.js + MongoDB

### Purpose
In-store product discovery

### Flow
```
Scan product shelf QR
     ↓
Product details
     ↓
Reviews/Ratings
     ↓
Add to cart
```

### Features
- [x] Product lookup
- [x] Price display
- [x] Reviews
- [x] Stock check
- [x] Add to cart

### APIs
```
GET  /api/product/:id
POST /api/scan
GET  /api/qr/:code
```

---

## 6. CREATOR QR
**Company:** REZ-Media  
**Service:** creators  
**Tech:** Next.js + Vercel

### Purpose
Influencer content + affiliate links

### Flow
```
Creator posts content
     ↓
QR/Link attached
     ↓
Fan scans
     ↓
Purchase tracked
     ↓
Commission credited
```

### Features
- [x] Creator profiles
- [x] Content management
- [x] Affiliate tracking
- [x] Commission dashboard
- [x] QR generation

### URL
https://creators.vercel.app

---

## 7. ROOM QR
**Company:** StayOwn-Hospitality  
**Service:** verify-service  
**Tech:** Next.js + Prisma

### Purpose
Smart hotel room access

### Flow
```
Guest books room
     ↓
Gets Room QR
     ↓
Scan at door
     ↓
Room unlocks
```

### Features
- [x] Room key replacement
- [x] Digital check-in
- [x] Service requests
- [x] Checkout

### URL
https://stayown.vercel.app/verify

---

## QR CODE FORMATS

### URL Structure
```
REZ Now:     https://rez.app/now/{product_id}
Menu:        https://rez.app/menu/{location_id}
AdQR:        https://rez.app/c/{campaign_id}
Shelf QR:    https://rez.app/shelf/{sku}
Creator QR:   https://rez.app/creator/{creator_id}
Room QR:     https://rez.app/room/{room_id}
Verify:      https://rez.app/verify/{serial_number}
```

### QR Content Types
```javascript
{
  "type": "product" | "menu" | "campaign" | "room" | "verify",
  "id": "string",
  "metadata": {}
}
```

---

## DATA FLOW DIAGRAM

```
QR SCAN
    │
    ├── Verify QR ──→ Check serial ──→ Verify product ──→ Show warranty
    │
    ├── ReZ Now ───→ Lookup product ──→ Add cart ──→ Checkout
    │
    ├── Menu QR ────→ Load menu ──────→ Order ──────→ Payment
    │
    ├── AdQR ──────→ Track campaign ──→ Record attribution
    │
    ├── Shelf QR ──→ Show product ───→ Reviews ────→ Cart
    │
    ├── Creator QR ─→ Track creator ──→ Commission
    │
    └── Room QR ───→ Validate room ───→ Unlock door
```

---

## ANALYTICS TRACKED

| Metric | QR Types |
|--------|----------|
| Scans | All |
| Conversions | AdQR, ReZ Now, Shelf QR |
| Revenue | ReZ Now, Menu QR |
| Attribution | AdQR, Creator QR |
| Engagement | All |
| Room Access | Room QR |
| Warranty Activations | Verify QR |

---

## CONNECTIONS

```
verify-qr-service
├── REZ-Merchant (product catalog)
├── REZ-Consumer (user profile)
├── MongoDB (warranty DB)

rez-now
├── REZ-Merchant (products)
├── REZ-Wallet (payment)
├── REZ-Order (orders)

rez-web-menu
├── REZ-Merchant (menu data)
├── REZ-Order (orders)

adsqr
├── REZ-Analytics (attribution)
├── REZ-Media (campaigns)

rez-shelf-qr
├── REZ-Merchant (products)
├── REZ-Reviews

creators
├── REZ-Media (content)
├── REZ-Analytics (commission)

verify-service (StayOwn)
├── REZ-Merchant (hotel rooms)
├── REZ-Auth (guest access)
```

---

## ENVIRONMENT VARIABLES

```env
# verify-qr-service
MERCHANT_API_URL=https://rez-merchant.onrender.com
AUTH_API=https://rez-auth.onrender.com
MONGODB_URI=mongodb+srv://...

# rez-shelf-qr
MONGODB_URI=...

# adsqr
MONGODB_URI=...
```

---

## LAST UPDATED
May 12, 2026

## OWNER
- REZ-Consumer (Verify QR, ReZ Now, Menu QR)
- REZ-Media (AdQR, Shelf QR, Creator QR)
- StayOwn-Hospitality (Room QR)
