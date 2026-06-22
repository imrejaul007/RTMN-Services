# CONSUMER APPS & QR ECOSYSTEM - Complete Audit

**Date:** May 11, 2026  
**Version:** 1.0

---

## PART 1: CONSUMER APPS

---

## 1. REZ APP (Main Consumer App)

### Service: `rez-app-consumer`

| Item | Value |
|------|-------|
| Platform | React Native (Expo) |
| Git Path | `rez-app-consumer/` |
| Status | Active development |
| Stores | iOS + Android |

### Features

| Category | Features |
|----------|----------|
| **Discovery** | Search, categories, recommendations |
| **Ordering** | Cart, checkout, payments |
| **Loyalty** | Karma points, coins, rewards |
| **Wallet** | ReZ Coins, cashback |
| **Bookings** | Hotels, restaurants, services |
| **Profile** | Orders, addresses, preferences |

### Navigation

```
Tab Navigator
├── Home (Stack)
│   ├── Main Feed
│   ├── Search Results
│   └── Product Details
├── Orders (Stack)
│   ├── Active Orders
│   ├── Order Details
│   └── Track Order
├── Savings (Stack)
│   ├── Cashback
│   └── Rewards
└── Profile (Stack)
    ├── Account
    ├── Settings
    └── Help
```

### Integration Points

| Service | Connection |
|---------|------------|
| `rez-auth-service` | Login, OTP |
| `rez-wallet-service` | Coins, cashback |
| `rez-order-service` | Order management |
| `rez-profile-service` | User data |
| `rez-gamification-service` | Karma points |

---

## 2. DO APP (AI Agent)

### Service: `do-app/`

| Item | Value |
|------|-------|
| Platform | React Native (Expo) |
| Git Path | `do-app/` |
| Status | Active development |

### Features

| Feature | Description |
|---------|-------------|
| **AI Chat** | Natural language ordering |
| **Voice Input** | Speak to order |
| **Multi-service** | Food, hotels, services |
| **Context Memory** | Remembers preferences |
| **Deep Linking** | Direct app navigation |

### User Flow

```
1. User speaks/types "Order pizza"
2. DO App understands intent via REZ Mind
3. Finds nearby pizza restaurants
4. Shows options
5. User confirms
6. Order placed via DO App
7. Payment via wallet
8. Order tracked in app
```

### REZ Mind Integration

| Component | Purpose |
|-----------|---------|
| Intent Detection | Understand user query |
| Entity Extraction | Identify restaurant, items |
| Action Execution | Place order |
| Context Memory | Remember preferences |

---

## 3. KARMA APP (NGO & Giving)

### Service: `rez-karma-app/` (embedded in ReZ App)

### Features

| Feature | Description |
|---------|-------------|
| **Karma Score** | 300-900 scoring |
| **Missions** | Social impact tasks |
| **Civic Corps** | Community groups |
| **Donations** | NGO partnerships |
| **Impact Report** | Track contribution |

### Karma Tiers

| Tier | Score | Benefits |
|------|-------|----------|
| Bronze | 300-399 | Basic access |
| Silver | 400-599 | Community access |
| Gold | 600-799 | Featured status |
| Platinum | 800-899 | Priority support |
| Diamond | 900+ | VIP recognition |

---

## PART 2: QR ECOSYSTEM

---

## 1. REZ NOW QR (Instant Ordering)

### Service: `rez-now/`

| Item | Value |
|------|-------|
| Platform | Next.js + Vercel |
| Git Path | `rez-now/` |
| Live URL | `rez-now.vercel.app` |

### Features

| Feature | Description |
|---------|-------------|
| **QR Scan** | Camera-based scanning |
| **Menu Display** | Restaurant menu |
| **Quick Order** | Add to cart instantly |
| **Payment** | Wallet + UPI |
| **Order Tracking** | Real-time status |

### QR Flow

```
1. Customer scans QR at table/counter
2. Menu displayed instantly
3. Customer adds items
4. Pays via ReZ Wallet
5. Kitchen receives order
6. Customer tracks status
```

### Integration Points

| Service | Purpose |
|---------|---------|
| `rez-merchant-service` | Store data |
| `rez-order-service` | Create orders |
| `rez-wallet-service` | Payments |
| `rez-catalog-service` | Menu data |
| `REZ Support Copilot` | AI assistance |

---

## 2. REZ WEB MENU (Digital Menu)

### Service: `rez-web-menu/`

| Item | Value |
|------|-------|
| Platform | Next.js |
| Git Path | `rez-web-menu/` |

### Features

| Feature | Description |
|---------|-------------|
| **Dynamic Menu** | Real-time updates |
| **Smart Pricing** | Time-based pricing |
| **AI Recommendations** | Upselling suggestions |
| **Dietary Labels** | Vegetarian, vegan, gluten-free |
| **Customization** | Add-ons, special requests |
| **Multi-language** | English, Hindi |

### Menu Features

| Feature | Status |
|---------|--------|
| QR Code Generation | Built |
| Table/Table Assignment | Built |
| Order Routing | Built |
| Kitchen Display | Built |
| Real-time Sync | Built |

---

## 3. ROOM QR (Hotel Service)

### Service: `rez-stayown-service/`

| Feature | Description |
|---------|-------------|
| **In-room Menu** | Hotel services |
| **Housekeeping** | Request cleaning |
| **Maintenance** | Report issues |
| **Restaurant** | Order food |
| **Checkout** | View charges |

### Room QR Flow

```
1. Guest scans QR in room
2. Hotel services displayed
3. Selects service (food, housekeeping)
4. Order sent to hotel staff
5. Real-time updates
6. Charges added to room
```

### Integration Points

| Service | Purpose |
|---------|---------|
| `Hotel OTA` | Guest booking |
| `rez-order-service` | Service orders |
| `rez-wallet-service` | Room billing |

---

## 4. VERIFY QR (Product Authenticity)

### Service: `verify-service/`

| Feature | Description |
|---------|-------------|
| **Serial Validation** | Verify authentic products |
| **Brand Registry** | Manufacturer registration |
| **Karma Rewards** | Earn points on verification |
| **Ownership Tracking** | Transfer history |
| **Fraud Detection** | Suspicious activity flagging |

### Verify Flow

```
1. User scans QR or enters serial
2. System validates against registry
3. Product verified authentic
4. Karma points awarded
5. Ownership recorded
6. Fraud check performed
```

### Security Features

| Feature | Description |
|---------|-------------|
| **Serial Signature** | Cryptographic validation |
| **Fraud Engine** | ML-based risk scoring |
| **Rate Limiting** | Prevent abuse |
| **Karma Multiplier** | Rewards for verified users |

---

## 5. AdQR (Advertising)

### Service: `adsqr/`

| Feature | Description |
|---------|-------------|
| **Campaign Creation** | Design ads |
| **QR Generation** | Unique codes per ad |
| **Attribution** | Track conversions |
| **Budget Control** | Daily/monthly limits |
| **Targeting** | Location, demographics |
| **REZ Coins** | Earn on engagement |

### AdQR Flow

```
1. Merchant creates campaign
2. QR codes generated
3. QR printed/displayed
4. User scans QR
5. Attributed to campaign
6. Merchant charged
7. User earns REZ Coins
```

### Attribution Tracking

| Event | Data Captured |
|-------|---------------|
| Scan | User, location, time |
| Visit | Page views, duration |
| Purchase | Order value, items |
| Engagement | Time on site |

---

## 6. CREATOR QR (Influencer Marketing)

### Service: `creators/`

| Feature | Description |
|---------|-------------|
| **Creator Profiles** | Bio, stats, content |
| **QR Codes** | Personalized tracking |
| **Earnings Dashboard** | Revenue tracking |
| **REZ Coins** | Earn from referrals |
| **Content Gallery** | Showcase work |

### Creator QR Flow

```
1. Creator shares QR code
2. Follower scans QR
3. Attributed to creator
4. Creator earns coins
5. Creator tracks stats
6. Payouts processed
```

---

## PART 3: VERIFICATION & SECURITY

---

## Audit Summary

| Service | Auth | Rate Limit | Input Valid | HTTPS |
|---------|------|------------|-------------|--------|
| ReZ App | ✅ JWT | ✅ Built | ✅ Zod | ✅ |
| DO App | ✅ JWT | ✅ Built | ✅ Zod | ✅ |
| ReZ Now | ✅ JWT | ✅ Built | ✅ Zod | ✅ |
| Verify QR | ✅ API Key | ✅ Built | ✅ Zod | ✅ |
| AdSQR | ✅ JWT | ✅ Built | ✅ Zod | ✅ |
| Creator QR | ✅ JWT | ✅ Built | ✅ Zod | ✅ |

---

## Integration Matrix

```
USER → QR Scan → REZ Mind → Service → Wallet → Confirmation
              ↓
         REZ Profile
              ↓
         Intent Graph
              ↓
         Personalization
```

---

**Last Updated:** May 11, 2026
