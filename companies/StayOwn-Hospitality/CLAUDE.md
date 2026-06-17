# StayOwn-Hospitality - Complete Hotel Management Platform

**Version:** 3.0  
**Last Updated:** June 17, 2026  
**Status:** ✅ **COMPLETE** - Hotel OTA Platform Integrated

---

## 🎯 Overview

StayOwn-Hospitality is the RTMN ecosystem's complete hotel management platform, combining:
- **OTA Booking Platform** - Consumer-facing hotel search, booking, and payments
- **Hotel PMS** - Property Management System for hotel operations
- **Staff Dashboards** - Hotel staff and admin management panels
- **Mobile Apps** - React Native guest and staff mobile applications
- **QR Services** - Room service, restaurant ordering via QR codes
- **AI Integration** - HOJAI AI Genie and intelligence layer

---

## 📁 Project Structure

```
StayOwn-Hospitality/
├── apps/                          # 6 Complete Applications
│   ├── api/                       # Backend API Server (Port 3000)
│   ├── ota-web/                   # Guest Booking Website (Port 3003)
│   ├── hotel-panel/               # Hotel Staff Dashboard (Port 3001)
│   ├── admin/                     # Platform Admin Panel (Port 3002)
│   ├── corporate-panel/          # Corporate B2B Panel (Port 3004)
│   └── mobile/                    # React Native Mobile App
│
├── packages/                      # Shared Libraries
│   ├── database/                  # Prisma Schema (60+ models)
│   └── merchant-sdk/              # Hotel Integration SDK
│
├── hotel-pms/                    # Legacy PMS Service
├── services/                     # Microservices (stubs)
├── docs/                         # Documentation
│   ├── ONBOARDING-AUDIT.md
│   ├── STAFF-DASHBOARD-AUDIT.md
│   └── ARCHITECTURE-UPGRADE-STATUS.md
│
├── FEATURES.md                   # Feature Documentation
├── INTEGRATION_SUMMARY.md        # RTMN Integration
├── AUDIT_SUMMARY.txt             # Security Audit
├── README.md                     # Quick Start
├── render.yaml                   # Render Deployment
└── package.json                  # Monorepo Config
```

---

## 🚀 Quick Start

```bash
# Navigate to StayOwn
cd /Users/rejaulkarim/Documents/RTMN/companies/StayOwn-Hospitality

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start API Server
cd apps/api && npm run dev  # Port 3000

# Start OTA Web (new terminal)
cd apps/ota-web && npm run dev  # Port 3003

# Start Hotel Panel (new terminal)
cd apps/hotel-panel && npm run dev  # Port 3001

# Start Admin Panel (new terminal)
cd apps/admin && npm run dev  # Port 3002
```

---

## 📦 Apps (6 Complete)

### 1. API Server (`apps/api`)

| Property | Value |
|----------|-------|
| **Port** | 3000 |
| **Runtime** | Node.js + TypeScript |
| **Framework** | Express.js |
| **Database** | PostgreSQL + Prisma |
| **Cache** | Redis + BullMQ |
| **Real-time** | Socket.IO |

**Key Routes (34 total):**
- `auth.routes` - OTP, JWT, REZ SSO
- `booking.routes` - Hold, confirm, cancel
- `hotel.routes` - CRUD, inventory
- `room-service.routes` - Housekeeping, minibar, laundry
- `payment.routes` - Razorpay, wallet
- `chat.routes` - Room, hotel, unified chat
- `channel-manager.routes` - SiteMinder, STAAH, RateGain
- `admin.routes` - Platform management
- `partner-rez.routes` - REZ ecosystem integration

**API Base URL:** `http://localhost:3000`

### 2. OTA Web (`apps/ota-web`)

| Property | Value |
|----------|-------|
| **Port** | 3003 |
| **Framework** | Next.js 16 (React 18) |
| **Styling** | Tailwind CSS |
| **Real-time** | Socket.IO Client |

**Key Pages:**
- `/` - Home/Search
- `/search` - Hotel search
- `/hotel/[id]` - Hotel details
- `/booking/[id]` - Booking flow
- `/checkout/` - Payment
- `/wallet` - Coin balance
- `/rewards/` - Loyalty
- `/bookings/` - Booking management
- `/onboarding/` - Hotel partner onboarding (5-step)
- `/staff/` - Staff portal

**URL:** `http://localhost:3003`

### 3. Hotel Panel (`apps/hotel-panel`)

| Property | Value |
|----------|-------|
| **Port** | 3001 |
| **Framework** | Next.js 16 |
| **Features** | Dashboard, bookings, calendar, inventory, analytics |

**Key Pages:**
- `/dashboard` - Overview
- `/dashboard/bookings` - Booking management
- `/dashboard/calendar` - Availability calendar
- `/dashboard/inventory` - Room inventory
- `/dashboard/analytics` - Performance metrics
- `/dashboard/settlement` - Payout tracking
- `/dashboard/settings` - Hotel settings
- `/dashboard/ownership/` - Network ownership

**URL:** `http://localhost:3001`

### 4. Admin Panel (`apps/admin`)

| Property | Value |
|----------|-------|
| **Port** | 3002 |
| **Framework** | Next.js 16 |

**Key Pages:**
- `/dashboard` - Platform overview
- `/dashboard/users` - User management
- `/dashboard/hotels/` - Hotel management
- `/dashboard/coin-liability` - Coin tracking
- `/dashboard/earn-rules` - Earn rules
- `/dashboard/burn-rules` - Burn rules
- `/dashboard/settlements/` - Settlement tracking

**URL:** `http://localhost:3002`

### 5. Corporate Panel (`apps/corporate-panel`)

| Property | Value |
|----------|-------|
| **Port** | 3004 |
| **Status** | Basic structure |

**URL:** `http://localhost:3004`

### 6. Mobile (`apps/mobile`)

| Property | Value |
|----------|-------|
| **Platform** | React Native (Expo) |
| **Navigation** | React Navigation 7 |

**Key Screens:**
- `HomeScreen` / `SearchScreen` - Hotel search
- `HotelDetailScreen` / `RoomSelectionScreen` - Booking
- `BookingReviewScreen` / `BookingConfirmedScreen` - Checkout
- `BookingsScreen` / `BookingDetailScreen` - Management
- `WalletScreen` / `CoinHistoryScreen` - Coins
- `RewardsScreen` / `VoucherScreen` - Loyalty
- `StaffApp` - Staff functionality

---

## 🗄️ Database Schema (`packages/database`)

**ORM:** Prisma Client  
**Database:** PostgreSQL

### Key Models

| Category | Models |
|----------|--------|
| **Core** | User, Hotel, RoomType, Room, InventorySlot, Booking |
| **Finance** | CoinWallet, CoinTransaction, EarnRule, BurnRule, HotelWallet |
| **Settlement** | SettlementEntry, PayoutBatch |
| **Chat** | RoomChatThread, HotelChatConversation, UnifiedChatConversation |
| **Services** | RoomServiceRequest, MinibarConsumption, GuestFeedback |
| **Commerce** | HotelBundle, BundleOrder |
| **RTMN** | Intent, IntentSignal, DormantIntent, CrossAppIntentProfile |

**Total:** 60+ models

---

## 🔌 Integration Points

### RTMN Ecosystem

| Layer | Service | Connection |
|-------|---------|------------|
| Layer 1 (AI) | HOJAI AI | Genie, Agents, Intelligence |
| Layer 3 (Commerce) | RABTUL | Payments, Wallet |
| Layer 4 (Finance) | REZ Wallet | Coin system |
| Layer 10 (Identity) | CorpID | User identity |
| Layer 12 (Twins) | TwinOS Hub | Digital twins |

### External Services

| Service | Purpose |
|---------|---------|
| **Razorpay** | Payments |
| **MSG91** | SMS OTP |
| **AWS S3** | File storage |
| **MakCorps** | Hotel search API |
| **SendGrid** | Email |
| **Redis** | Cache/Queue |
| **SiteMinder/STAAH/RateGain** | Channel managers |

### REZ Platform

| Endpoint | Purpose |
|----------|---------|
| `/v1/auth/rez-sso` | SSO token exchange |
| `REZ_WALLET_SERVICE_URL` | Wallet sync |
| Webhooks | Booking sync, payments |

---

## 🛡️ Security

### Audit Status (April 15, 2026)

| Severity | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 1 | 1 | 0 |
| HIGH | 6 | 6 | 0 |
| MEDIUM | 18 | 6 | 12 |

### Key Fixes Applied
- ✅ Hotel staff authorization bypass
- ✅ Inventory date validation
- ✅ Hardcoded CORS fallbacks
- ✅ Cancellation penalty boundary
- ✅ Suspended users booking
- ✅ Negative inventory rooms

### Remaining Issues
- Rounding losses in commission
- Coin burn exceeding booking value
- Race conditions in concurrent bookings
- Refund tracking

---

## 🌐 Deployment

**Platform:** Render (via `render.yaml`)

| Service | Name | URL |
|---------|------|-----|
| API | hotel-ota-api | hotel-ota-api.onrender.com |
| OTA Web | hotel-ota-web | hotel-ota-web.onrender.com |
| Hotel Panel | hotel-ota-hotel-panel | hotel-ota-hotel-panel.onrender.com |
| Admin | hotel-ota-admin | hotel-ota-admin.onrender.com |

### Deploy Commands

```bash
# Deploy to Render
render blueprint apply render.yaml

# Or individual apps
cd apps/api && npm run build && npm start
```

---

## 📊 Port Registry

| Port | App/Service | Purpose |
|------|-------------|---------|
| 3000 | API Server | Backend API |
| 3001 | Hotel Panel | Staff dashboard |
| 3002 | Admin Panel | Platform admin |
| 3003 | OTA Web | Guest booking |
| 3004 | Corporate Panel | B2B panel |
| 3008 | Hotel OTA API | (Legacy) |

---

## 📝 Environment Variables

Required in `.env.local`:

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Razorpay
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# REZ Services
REZ_AUTH_URL=http://localhost:3001
REZ_WALLET_URL=http://localhost:3002
REZ_PAYMENT_URL=http://localhost:3003
REZ_MERCHANT_URL=http://localhost:3004

# MSG91 OTP
MSG91_AUTH_KEY=...
MSG91_SENDER=...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# MakCorps
MAKCORPS_API_KEY=...

# Internal
INTERNAL_SERVICE_TOKEN=...
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `README.md` | Quick start guide |
| `FEATURES.md` | Complete feature list |
| `INTEGRATION_SUMMARY.md` | RTMN integration details |
| `AUDIT_SUMMARY.txt` | Security audit report |
| `docs/ONBOARDING-AUDIT.md` | Hotel onboarding audit |
| `docs/STAFF-DASHBOARD-AUDIT.md` | Staff panel audit |
| `docs/ARCHITECTURE-UPGRADE-STATUS.md` | Architecture changes |

---

## 🔗 Related Services

| Service | Location | Purpose |
|---------|---------|---------|
| **REZ-Consumer DO App** | `companies/REZ-Consumer/` | Consumer mobile app with hotel booking |
| **Hotel OS** | `industry-os/services/hotel-os/` | Industry OS PMS (Layer 7) |
| **Cross-Ecosystem Bridge** | `services/cross-ecosystem-bridge/` | RTMN ecosystem connector |

---

## ✅ What's Complete

- ✅ 6 Full-stack Applications
- ✅ 34 API Routes
- ✅ 60+ Database Models
- ✅ React Native Mobile App
- ✅ QR-based Room Services
- ✅ Razorpay Integration
- ✅ REZ SSO Integration
- ✅ Channel Manager (SiteMinder, STAAH, RateGain)
- ✅ Coin/Wallet System
- ✅ Real-time Chat
- ✅ Settlement/Payout System
- ✅ Hotel Onboarding Wizard
- ✅ Staff Dashboard

---

## ⚠️ Known Issues

- Corporate Panel UI is basic
- Some medium-priority security items remain
- Staff Dashboard auth needs review
- No offline support in mobile app
- No dark mode
- No i18n/localization

---

## 🤝 Contributing

1. Follow the monorepo structure
2. Add tests for new features
3. Update documentation
4. Run security audit before production
5. Update `AUDIT_SUMMARY.txt` with changes

---

*Last Updated: June 17, 2026*
*StayOwn-Hospitality - Complete Hotel Management Platform*
