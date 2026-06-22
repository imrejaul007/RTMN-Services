# Hotel OTA/PMS Dashboard & Onboarding Audit

**Generated:** May 3, 2026
**Auditor:** Claude Code Autonomous Audit Agent
**Repository:** git@github.com:imrejaul007/hotel-ota.git

---

## Executive Summary

This audit examines the Hotel OTA/PMS system for its dashboard capabilities and onboarding flow, comparing against the Room QR implementation built for guest-facing room services. The Hotel OTA platform is a comprehensive booking and inventory management system with existing Room QR endpoints, while the Room QR extension adds guest-facing services including service requests, minibar billing, checkout, and AI recommendations.

---

## 1. Existing Features

### 1.1 Dashboard Features (Hotel Panel)

| Feature | Status | File Location | Description |
|---------|--------|--------------|-------------|
| **Dashboard Overview** | ✅ Complete | `apps/hotel-panel/src/app/dashboard/page.tsx` | KPI cards (bookings, occupancy, revenue, rating) |
| **Today's Check-ins** | ✅ Complete | `apps/hotel-panel/src/app/dashboard/page.tsx` | Real-time list with check-in action |
| **Today's Check-outs** | ✅ Complete | `apps/hotel-panel/src/app/dashboard/page.tsx` | Real-time list with check-out action |
| **Pending Settlement** | ✅ Complete | `apps/hotel-panel/src/app/dashboard/page.tsx` | Wallet balance display |
| **Ownership Mining** | ✅ Complete | `apps/hotel-panel/src/app/dashboard/page.tsx` | Mining equity dashboard link |
| **Bookings Management** | ✅ Complete | `apps/hotel-panel/src/app/dashboard/bookings/page.tsx` | Filterable booking list |
| **Inventory Management** | ✅ Complete | `apps/api/src/routes/hotel-panel.routes.ts` | Rate/availability per date |
| **Calendar View** | ✅ Exists | `apps/hotel-panel/src/app/dashboard/calendar/page.tsx` | Visual calendar |
| **Analytics** | ✅ Exists | `apps/api/src/routes/hotel-panel.routes.ts` | Revenue charts (30 days) |
| **Settlement** | ✅ Complete | `apps/api/src/routes/hotel-panel.routes.ts` | Payout statement |
| **Settings** | ✅ Exists | `apps/hotel-panel/src/app/dashboard/settings/page.tsx` | Hotel settings |
| **Brand Coins Program** | ✅ Complete | `apps/api/src/routes/hotel-panel.routes.ts` | Earn/burn rules config |
| **PMS Integration** | ✅ Complete | `apps/api/src/routes/hotel-panel.routes.ts` | Webhook sync status |

### 1.2 Hotel Management API Routes

| Route File | Endpoints | Description |
|------------|-----------|-------------|
| `hotel-panel.routes.ts` | 15 endpoints | Dashboard, inventory, bookings, analytics |
| `hotel.routes.ts` | 6 endpoints | Hotel search, availability, room types |
| `booking.routes.ts` | 8 endpoints | Booking hold, confirm, cancel |
| `admin.routes.ts` | 20+ endpoints | Platform admin, user management |
| `pms.routes.ts` | PMS endpoints | PMS integration |
| `corporate.routes.ts` | Corporate endpoints | B2B accounts |
| `review.routes.ts` | Review endpoints | Guest reviews |

### 1.3 Room QR Features (Backend)

| Feature | Status | Endpoint | File |
|---------|--------|----------|------|
| **Room Service Requests** | ✅ Complete | `POST /v1/room-service` | `room-service.routes.ts` |
| **Enhanced Service (Priority)** | ✅ Complete | `POST /v1/room-service/enhanced` | `room-service.routes.ts` |
| **Service Status Update** | ✅ Complete | `PATCH /v1/room-service/:id` | `room-service.routes.ts` |
| **Minibar Menu** | ✅ Complete | `GET /v1/room-service/minibar/:hotelId/menu` | `room-service.routes.ts` |
| **Minibar Bill** | ✅ Complete | `GET /v1/room-service/minibar/:roomId/bill` | `room-service.routes.ts` |
| **Minibar Consumption** | ✅ Complete | `POST /v1/room-service/minibar/:roomId/consume` | `room-service.routes.ts` |
| **Guest Feedback** | ✅ Complete | `POST /v1/room-service/feedback` | `room-service.routes.ts` |
| **Room Preferences** | ✅ Complete | `GET/PUT /v1/room-service/preferences/:guestId/:roomId` | `room-service.routes.ts` |
| **Checkout Bill (Folio)** | ✅ Complete | `GET /v1/room-service/checkout/:bookingId/bill` | `room-service.routes.ts` |
| **QR Validation** | ✅ Complete | `POST /v1/room-qr/validate` | `room-qr.routes.ts` |
| **Room Chat** | ✅ Exists | `room-chat.routes.ts` | Guest messaging |
| **Hotel Chat** | ✅ Exists | `hotel-chat.routes.ts` | Staff-guest chat |

---

## 2. Room QR Implementation (What We Built)

### 2.1 Frontend Components (REZ Now)

| Component | File | Features |
|-----------|------|----------|
| `RoomServiceRequest.tsx` | `rez-now/components/room/` | Priority levels, 8 service types |
| `HousekeepingSpecialRequest.tsx` | `rez-now/components/room/` | 16 housekeeping items |
| `RoomFeedback.tsx` | `rez-now/components/room/` | 4-category ratings, comments |
| `RoomRecommendations.tsx` | `rez-now/components/room/` | AI recommendations, time-based |
| `CheckoutSuggestions.tsx` | `rez-now/components/room/` | Checkout upsells, loyalty offers |

### 2.2 API Services (REZ Now)

| Service | File | Functions |
|---------|------|-----------|
| `folio.ts` | `rez-now/lib/api/` | Get/settle folio, checkout bill |
| `tips.ts` | `rez-now/lib/api/` | Tip calculation, distribution |
| `preferenceService.ts` | `rez-now/lib/services/` | Guest preference memory |
| `payment.ts` | `rez-now/lib/api/` | Wallet, Razorpay checkout |

### 2.3 Service Types Supported

```typescript
type ServiceType =
  | 'housekeeping'
  | 'room_service'
  | 'laundry'
  | 'maintenance'
  | 'concierge'
  | 'spa'
  | 'transport'
  | 'fitness';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
```

### 2.4 Checkout Flow Features

- Bill breakdown by category (room, minibar, laundry, etc.)
- Tip selection (0%, 5%, 10%, 15%, 20%, 25%)
- REZ Wallet payment
- Digital receipt generation
- Checkout upsells (late checkout, spa packages)
- Loyalty point offers

---

## 3. Integration Points

### 3.1 Hotel OTA to REZ Now

```
Hotel OTA (PostgreSQL)
    │
    ├── RoomServiceRequest table
    │   └── Guest service requests
    │
    ├── MinibarConsumption table
    │   └── Item consumption tracking
    │
    ├── GuestFeedback table
    │   └── Feedback submissions
    │
    ├── RoomPreferences table
    │   └── Guest preferences
    │
    └── RoomEngagement table
        └── Engagement tracking

           │
           ▼ Webhook (fire-and-forget)
           │
    REZ Intent Graph
    ──────────────────────────────
    Capture guest intent (scans, orders, feedback)
    Trigger AI recommendations
    Update guest profile

           │
           ▼ API call
           │
    REZ Now (Consumer App)
    ──────────────────────────────
    Display Room QR interface
    Submit service requests
    View checkout bill
```

### 3.2 API Endpoint Mapping

| Hotel OTA Endpoint | Called By | Purpose |
|--------------------|-----------|---------|
| `POST /v1/room-service` | REZ Now | Create service request |
| `POST /v1/room-service/enhanced` | REZ Now | Priority/scheduled requests |
| `GET /v1/room-service/menu/:hotelId` | REZ Now | Get service menu |
| `POST /v1/room-service/minibar/:roomId/consume` | REZ Now | Record minibar item |
| `GET /v1/room-service/checkout/:bookingId/bill` | REZ Now | Get folio |
| `POST /v1/room-service/feedback` | REZ Now | Submit feedback |
| `PUT /v1/room-service/preferences/:guestId/:roomId` | REZ Now | Update preferences |

### 3.3 REZ Integration Service

File: `apps/api/src/services/integrations/rez-integration.service.ts`

- `verifyRezToken()` - SSO token verification
- `getRezWalletBalance()` - Wallet balance sync
- `linkOrCreateOtaUser()` - Account linking
- `completeSsoFlow()` - Full SSO flow

### 3.4 Engagement Tracking

File: `apps/api/src/services/shared/intent-capture.service.ts`

```typescript
// Captures to REZ Intent Graph
captureHotelView()     // QR scan, menu view
captureHotelSearch()   // Hotel search intent
```

---

## 4. StayOwn Integration

### 4.1 Service Structure

```
rez-stayown-service/
├── src/
│   ├── bridge.ts          # Hotel bridge service
│   ├── config/           # Configuration
│   ├── routes/           # API routes
│   └── index.js          # Entry point
└── README.md
```

### 4.2 Bridge Service

```typescript
// Connects Hotel OTA to REZ Order and Payment services
class HotelBridge {
  syncBookingToOrder()  // Create REZ order for hotel booking
  syncPayment()         // Sync payment to REZ Payment
}
```

### 4.3 Environment Configuration

```env
ORDER_SERVICE_URL=http://localhost:4001
PAYMENT_SERVICE_URL=http://localhost:4002
PORT=4011
```

---

## 5. Gaps Identified

### 5.1 Dashboard Gaps

| Gap | Severity | Description | Location |
|-----|----------|-------------|----------|
| **No Room Service Dashboard** | HIGH | Hotel staff cannot see/manage incoming service requests | Missing |
| **No Housekeeping Dashboard** | HIGH | No view for housekeeping staff to manage tasks | Missing |
| **No Minibar Management** | MEDIUM | No admin interface for minibar inventory | Missing |
| **No Guest Messaging View** | MEDIUM | Chat interface only exists in code, not dashboard | Partial |
| **No Staff Management** | MEDIUM | Cannot manage hotel staff roles/permissions | Partial |
| **No Room Status View** | LOW | Real-time room status (occupied/clean/dirty) | Partial via PMS |

### 5.2 API Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Assign Staff to Request** | HIGH | Cannot assign service request to staff |
| **Request Status Notifications** | HIGH | Staff not notified of new requests |
| **Room Preference Sync to PMS** | MEDIUM | Preferences not sent to PMS |
| **Check-in QR Generation** | MEDIUM | No endpoint to generate Room QR |
| **Housekeeping Extras Pricing** | MEDIUM | Hardcoded prices, not configurable |
| **Minibar Item Management** | MEDIUM | No CRUD for minibar items |

### 5.3 Onboarding Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **No Self-Service Onboarding** | HIGH | Hotels must contact support |
| **No Property Setup Wizard** | HIGH | Manual database setup required |
| **No Room Type Configuration** | HIGH | Must manually add room types |
| **No Inventory Pre-population** | MEDIUM | No bulk inventory setup |
| **No Staff Account Creation** | MEDIUM | Admin must create staff accounts |

---

## 6. Onboarding Assessment

### 6.1 Current Onboarding Process

**Estimated Time:** 30-60 minutes (manual)

1. Hotel contacts REZ/Hotel OTA team
2. Admin creates hotel account in database
3. Hotel added with onboardingStatus: 'pending'
4. Room types created manually
5. Inventory slots created for each date
6. Hotel staff accounts created
7. PMS webhook configured (if applicable)
8. Hotel onboardingStatus changed to 'active'

### 6.2 Required for <5 Minute Onboarding

| Step | Current | Required for <5 min |
|------|---------|-------------------|
| Hotel registration | Manual admin | Self-service form |
| Property details | Manual | Bulk import / wizard |
| Room types | Manual | Pre-configured templates |
| Inventory | Manual | Auto-generate 90 days |
| Staff accounts | Manual | Self-signup with invite |
| PMS connection | Manual | Auto-detect + wizard |
| Agreement signing | Manual | E-signature integration |
| Payment setup | Manual | Stripe Connect flow |

### 6.3 Proposed Onboarding Flow

```
1. Hotel Signup (1 min)
   ├── Hotel name, city, category
   ├── Contact details
   └── Email verification

2. Property Setup (2 min)
   ├── Select room type template
   ├── Add room count per type
   ├── Set base rates
   └── Upload images

3. Staff Setup (1 min)
   ├── Create admin account
   └── Send staff invite links

4. PMS Connection (30 sec)
   ├── Select PMS from list
   ├── Enter credentials
   └── Auto-sync inventory

5. Agreement (30 sec)
   ├── View terms
   ├── Digital signature
   └── Payment setup

Total: ~5 minutes
```

---

## 7. Recommendations

### 7.1 Priority 1: Room Service Dashboard

```typescript
// Required endpoints for staff dashboard
GET  /v1/room-service           // List all requests (filterable)
GET  /v1/room-service/:id       // Request details
PATCH /v1/room-service/:id      // Update status, assign staff
POST /v1/room-service/:id/complete  // Mark completed

// Required UI pages
/hotel-panel/src/app/dashboard/room-service/page.tsx
/hotel-panel/src/app/dashboard/housekeeping/page.tsx
```

### 7.2 Priority 2: Self-Service Onboarding

```typescript
// Required endpoints
POST /v1/onboarding/hotel        // Create hotel
POST /v1/onboarding/room-types  // Bulk create room types
POST /v1/onboarding/inventory   // Generate inventory slots
POST /v1/onboarding/staff       // Create staff account
GET  /v1/onboarding/status      // Check onboarding progress
```

### 7.3 Priority 3: Minibar Management

```typescript
// Required endpoints
GET  /v1/hotel/minibar/items
POST /v1/hotel/minibar/items
PUT  /v1/hotel/minibar/items/:id
DELETE /v1/hotel/minibar/items/:id
```

### 7.4 Priority 4: Push Notifications

```typescript
// Staff receives notification when:
// - New service request created
// - Request priority changed
// - Guest adds comment

// Guest receives notification when:
// - Request status changed
// - Request completed
// - Staff replies to chat
```

---

## 8. Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         REZ Platform                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ REZ Auth   │  │ REZ Wallet  │  │ REZ Intent  │             │
│  │ Service    │  │ Service     │  │ Graph       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SSO, Wallet, Intent
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Hotel OTA Platform                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL Database                    │    │
│  │  Hotel, RoomType, Booking, RoomServiceRequest,           │    │
│  │  MinibarConsumption, GuestFeedback, RoomPreferences,    │    │
│  │  RoomEngagement, CoinWallet, Settlement                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    API Server (Express)                    │ │
│  │  hotel-panel.routes.ts     - Dashboard endpoints           │ │
│  │  room-service.routes.ts    - Room QR backend               │ │
│  │  room-qr.routes.ts         - QR validation                 │ │
│  │  admin.routes.ts           - Platform admin                 │ │
│  │  pms-ota-webhooks.routes.ts - PMS integration              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Hotel Panel (Next.js Frontend)               │ │
│  │  /dashboard/page.tsx           - Overview                   │ │
│  │  /dashboard/bookings/         - Booking management          │ │
│  │  /dashboard/inventory/        - Rate/availability           │ │
│  │  /dashboard/analytics/        - Revenue charts              │ │
│  │  /dashboard/settings/         - Hotel settings               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Webhooks
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External PMS Systems                         │
│  Hotel PMS Backend                                             │
│  Channel Manager (SiteMinder, STAAH, RateGain)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Room QR
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REZ Now (Consumer App)                         │
│  RoomServiceRequest.tsx     - Service request form              │
│  HousekeepingRequest.tsx    - Housekeeping extras               │
│  RoomFeedback.tsx            - Guest feedback                   │
│  RoomRecommendations.tsx     - AI recommendations               │
│  CheckoutSuggestions.tsx     - Checkout upsells                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Files Reference

### Hotel OTA Core

| Path | Description |
|------|-------------|
| `Hotel OTA/apps/api/src/routes/room-service.routes.ts` | Room QR backend API |
| `Hotel OTA/apps/api/src/routes/room-qr.routes.ts` | QR validation endpoint |
| `Hotel OTA/apps/api/src/routes/hotel-panel.routes.ts` | Hotel dashboard API |
| `Hotel OTA/apps/api/src/routes/hotel.routes.ts` | Hotel search/availability |
| `Hotel OTA/apps/api/src/routes/admin.routes.ts` | Platform admin API |
| `Hotel OTA/apps/api/src/services/integrations/` | PMS, REZ integrations |
| `Hotel OTA/packages/database/prisma/schema.prisma` | Database schema |

### REZ Now (Room QR Frontend)

| Path | Description |
|------|-------------|
| `rez-now/components/room/` | Room QR components |
| `rez-now/lib/api/folio.ts` | Checkout billing service |
| `rez-now/lib/api/tips.ts` | Tip calculation service |
| `rez-now/lib/services/preferenceService.ts` | Guest preferences |

### Integration Services

| Path | Description |
|------|-------------|
| `rez-stayown-service/src/bridge.ts` | Hotel OTA bridge to REZ |
| `rez-travel-service/` | Travel booking service |

---

## 10. Conclusion

The Hotel OTA platform provides a solid foundation for hotel management with booking, inventory, and settlement capabilities. The Room QR extension adds comprehensive guest-facing services including service requests, minibar billing, checkout, and feedback collection.

**Key Strengths:**
- Complete booking lifecycle management
- PMS webhook integration
- Brand coin loyalty program
- REZ SSO integration
- Room service request endpoints

**Critical Gaps:**
- No staff-facing room service dashboard
- No self-service hotel onboarding
- Minibar management not available
- Push notifications not wired for staff

**Recommended Actions:**
1. Build Room Service Dashboard for hotel staff
2. Create self-service onboarding wizard
3. Add minibar inventory management
4. Wire push notifications for service requests

---

**Report Generated by Claude Code Autonomous Audit Agent**
