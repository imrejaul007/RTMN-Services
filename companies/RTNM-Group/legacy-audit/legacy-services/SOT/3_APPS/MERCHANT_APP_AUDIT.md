# REZ MERCHANT APP - Complete Audit

**Date:** May 10, 2026  
**Version:** 1.0

---

## OVERVIEW

| Item | Value |
|------|-------|
| **Platform** | React Native (Expo) |
| **Git Path** | `rez-app-merchant` |
| **Status** | Active Development |
| **Stores** | iOS + Android |

---

## INDUSTRIES SUPPORTED (6 Verticals)

### 1. RETAIL

| Subcategory | Features |
|-------------|----------|
| Clothing & Apparel | Product management, variants, sizes |
| Electronics | Serial numbers, warranty tracking |
| Home & Garden | Category management |
| Books & Media | ISBN handling |
| Sports & Outdoors | Inventory tracking |
| Toys & Games | Bundle products |
| Health & Beauty | Expiry tracking |
| Grocery & Food | Batch management |

### 2. FOOD & BEVERAGE

| Subcategory | Features |
|-------------|----------|
| Restaurant | Table orders, dine-in |
| Cafe | Menu management |
| Bakery | Production tracking |
| Fast Food | Quick service mode |
| Cloud Kitchen | Delivery-only operations |
| Bar & Pub | Menu categories |
| Food Truck | Mobile POS |
| Catering | Event management |

### 3. SERVICES

| Subcategory | Features |
|-------------|----------|
| Salon & Spa | Appointment booking, staff schedules |
| Fitness & Gym | Membership management |
| Professional Services | Billing, contracts |
| Home Services | Job scheduling |
| Education & Training | Course management |
| Healthcare | Patient records |
| Automotive | Service history |
| Repair Services | Work orders |

### 4. ENTERTAINMENT

| Subcategory | Features |
|-------------|----------|
| Cinema & Theater | Showtimes, ticketing |
| Gaming Zone | Arcade management |
| Event Planning | Event booking |
| Photography | Session scheduling |
| Music & Arts | Studio management |

### 5. HOSPITALITY

| Subcategory | Features |
|-------------|----------|
| Hotel | Room management |
| Resort | Amenities tracking |
| Guest House | Booking management |
| Homestay | Guest records |
| Vacation Rental | Property management |
| Service Apartments | Tenant tracking |

### 6. OTHER

All other business types supported.

---

## FEATURES BY CATEGORY

### Core Features

| Feature | Status |
|---------|--------|
| Business registration | ✅ Built |
| KYC/Document verification | ✅ Built |
| Bank account linking | ✅ Built |
| Store setup | ✅ Built |
| Product/Menu management | ✅ Built |
| Order management | ✅ Built |
| Payment collection | ✅ Built |
| Analytics dashboard | ✅ Built |

---

## SCREENS & NAVIGATION

### Dashboard Tabs

```
Tab Navigator
├── Dashboard (Home)
├── Orders
│   ├── Pending
│   ├── Processing
│   ├── Completed
│   └── Cancelled
├── Menu
│   ├── Products
│   ├── Categories
│   └── Modifiers
├── Analytics
│   ├── Sales
│   ├── Customers
│   └── Products
└── Profile
    ├── Settings
    ├── Help
    └── Logout
```

### Dashboard Screens

| Screen | Purpose |
|--------|---------|
| `dashboard/_layout.tsx` | Dashboard layout |
| `stats.tsx` | KPI overview |
| `quick-actions.tsx` | Shortcuts |
| `notifications.tsx` | Alert management |

---

## MERCHANT FEATURES

### CRM & Users

| Feature | Description |
|---------|-------------|
| Customer profiles | View customer history |
| Customer segmentation | Group by behavior |
| Communication | In-app messaging |

### Order Management

| Feature | Description |
|---------|-------------|
| Order queue | Real-time order list |
| Accept/Reject | Order actions |
| Status updates | Push notifications |
| Print receipts | Thermal printer support |

### Inventory

| Feature | Description |
|---------|-------------|
| Stock tracking | Real-time quantities |
| Low stock alerts | Automated warnings |
| Bulk operations | CSV import/export |

### Marketing

| Feature | Description |
|---------|-------------|
| Offers/Coupons | Discount campaigns |
| Notifications | Push campaigns |
| Loyalty setup | Reward programs |

### Staff Management

| Feature | Description |
|---------|-------------|
| Role-based access | Permissions matrix |
| Attendance | Staff tracking |
| Performance | Metrics per staff |

---

## BUSINESS TYPES

| Type | Description |
|------|-------------|
| Sole Proprietorship | Single owner |
| Partnership | Multiple partners |
| Private Limited | Company entity |
| LLP | Hybrid structure |

---

## DOCUMENT VERIFICATION

| Document | Required |
|----------|----------|
| PAN Card | Yes |
| GST Number | Conditional |
| Bank Account | Yes |
| Address Proof | Yes |
| Identity Proof | Yes |

---

## INTEGRATION POINTS

| Service | Purpose |
|---------|---------|
| rez-auth-service | User authentication |
| rez-order-service | Order sync |
| rez-payment-service | Payment processing |
| rez-wallet-service | ReZ Coins |
| rez-notifications | Push notifications |

---

## SECURITY

| Check | Status |
|-------|--------|
| JWT auth | ✅ Implemented |
| Role-based access | ✅ Implemented |
| Secure storage | ✅ Encrypted |
| API encryption | ✅ HTTPS |

---

## DEPLOYMENT

| Platform | Status |
|----------|--------|
| iOS App Store | Build ready |
| Android Play Store | Build ready |
| TestFlight | Ready |
| Internal testing | ✅ Available |

---

**Last Updated:** May 10, 2026
