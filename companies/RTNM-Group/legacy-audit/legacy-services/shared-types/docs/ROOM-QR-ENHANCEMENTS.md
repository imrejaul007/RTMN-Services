# Room QR Enhancements

## Overview

This document describes the Room QR enhancements for the hotel booking system, including Personalized Welcome, Smart Bundles, Express Checkout 2.0, Auto-Assignment, SLA Tracking, and Pre-Arrival features.

## Personalized Welcome

### Location
- Component: `rez-now/components/room/PersonalizedWelcome.tsx`

### Features
- **Time-based greeting**: Good morning/afternoon/evening/night
- **Guest identification**: "Welcome back, [Name]" for returning guests
- **Stay purpose detection**: Business/pleasure/mixed stays with contextual messaging
- **Weather-based messages**: Dynamic messages based on time of day
- **Previous stay preferences**: Display past preferences and services enjoyed
- **Hotel amenities highlight**: Showcase available amenities
- **Loyalty tier badges**: Bronze/Silver/Gold/Platinum member recognition

### Props
```typescript
interface GuestProfile {
  firstName: string;
  lastName?: string;
  isReturningGuest: boolean;
  stayCount: number;
  lastStayDate?: string;
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  stayPurpose?: 'business' | 'pleasure' | 'mixed';
  preferences?: {
    favoriteAmenity?: string;
    dietaryRestrictions?: string[];
  };
}
```

---

## Smart Bundles

### Locations
- Component: `rez-now/components/room/SmartBundles.tsx`
- API Client: `rez-now/lib/api/bundles.ts`
- Backend: `Hotel OTA/apps/api/src/routes/room-bundles.routes.ts`

### Features
- **Pre-configured packages**:
  - Romantic dinner package
  - Spa combo (massage + facial)
  - Late checkout + breakfast
  - Airport transfer + lounge access
  - Birthday special
  - Anniversary celebration
  - Weekend staycation

- **AI-powered recommendations**:
  - Based on stay purpose (business/pleasure)
  - Previous service usage patterns
  - Loyalty tier preferences

- **Smart pricing**:
  - Original vs. bundle price comparison
  - Automatic discount calculation
  - Savings display

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bundles/:hotelId` | Get available bundles |
| GET | `/api/bundles/:hotelId/:bundleId` | Get specific bundle |
| POST | `/api/bundles/:bundleId/order` | Order a bundle |
| GET | `/api/bundles/recommendations/:guestId` | Get AI recommendations |
| GET | `/api/bundles/orders/:bookingId` | Get guest's orders |
| DELETE | `/api/bundles/orders/:orderId` | Cancel order |

---

## Express Checkout 2.0

### Locations
- Component: `rez-now/components/room/ExpressCheckout.tsx`
- Split Folio: `rez-now/components/room/SplitFolio.tsx`
- API: `rez-now/app/api/checkout/room-checkout/route.ts`

### Features

#### Digital Bill Breakdown
- Room charges
- Minibar charges
- Laundry
- Restaurant
- Spa & Wellness
- Transport
- Other charges
- Automatic tax calculation (18% GST)

#### Payment Options
- Credit/Debit Card
- UPI
- Wallet
- Cash
- Charge to Room

#### Split Folio
- Assign charges to different people
- Generate share links for payment
- Track who's paid
- Settle up functionality

#### Digital Receipt
- Unique receipt ID
- Transaction ID
- Guest name and room
- Total amount paid
- Payment method
- Timestamp

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/checkout/room-checkout/:bookingId/folio` | Get folio |
| POST | `/api/checkout/room-checkout/:bookingId` | Process payment/checkout |
| POST | `/api/checkout/room-checkout/:bookingId/split` | Create split |
| PUT | `/api/checkout/room-checkout/:bookingId/split` | Update split (settle) |

---

## Staff Auto-Assignment

### Location
- Service: `Hotel OTA/apps/api/src/services/room/autoAssign.ts`

### Features

#### Assignment Strategies
1. **Closest staff**: Based on last known location
2. **Least busy**: Staff with fewer active requests
3. **Skill matching**: Match service type to staff skills
4. **Priority override**: Urgent requests get fastest available
5. **Fallback**: Next available staff member

#### Scoring Algorithm
```
Score = (SkillMatch * 3) + (WorkloadScore * 2) + (DistanceScore * 1) + PriorityBoost
```

#### Configuration
```typescript
const ASSIGNMENT_CONFIG = {
  maxActiveRequests: 5,
  skillMatchWeight: 3,
  workloadWeight: 2,
  distanceWeight: 1,
};
```

#### Functions
- `autoAssignRequest()`: Main assignment function
- `getStaffLoad()`: Get current workload for all staff
- `rebalanceAssignments()`: Rebalance when overloaded
- `getStaffPerformance()`: Individual performance metrics
- `getHotelPerformance()`: Hotel-wide metrics

---

## SLA Tracking

### Location
- Service: `Hotel OTA/apps/api/src/services/room/slaTracking.ts`

### SLA Targets (in minutes)

| Service Type | Target | Warning | Alert | Breach |
|--------------|--------|---------|-------|--------|
| Housekeeping | 30 | 15 | 23 | 30 |
| Room Service | 20 | 10 | 15 | 20 |
| Laundry | 120 | 60 | 90 | 120 |
| Spa | 60 | 30 | 45 | 60 |
| Transport | 45 | 23 | 34 | 45 |
| Concierge | 15 | 8 | 11 | 15 |
| Maintenance | 60 | 30 | 45 | 60 |
| Fitness | 30 | 15 | 23 | 30 |

### Status Colors
- **Green (on_track)**: < 50% elapsed
- **Yellow (warning)**: 50-74% elapsed
- **Orange (alert)**: 75-99% elapsed
- **Red (breached)**: >= 100% elapsed
- **Blue (completed)**: Task finished

### Functions
- `getRequestSLAStatus()`: Get SLA status for a request
- `getSLAAlerts()`: Get all warnings and breaches
- `getSLAStatistics()`: Generate statistics for a period
- `getSLAComplianceTrend()`: Historical compliance data

---

## Pre-Arrival

### Location
- Service: `rez-stayown-service/src/pre-arrival.ts`
- Routes: `rez-stayown-service/src/routes/pre-arrival.routes.ts`

### Features

#### Room Preferences
- Temperature (16-30°C)
- Lighting (bright/dim/dark)
- Pillow type (soft/firm/extra)

#### Dietary & Health
- Dietary restrictions
- Allergies

#### Special Occasions
- Birthday
- Anniversary
- Honeymoon
- Business trip

#### Room Requests
- High floor
- Quiet room
- Smoking/non-smoking
- Bed size preference
- View preference

#### Transport
- Airport pickup
- Pickup time
- Flight number
- Number of passengers

#### Check-in/Check-out
- Early check-in request
- Late check-out request

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pre-arrival/:bookingId` | Get preferences |
| PUT | `/api/pre-arrival/:bookingId` | Save preferences |
| POST | `/api/pre-arrival/:bookingId/sync` | Sync to Room QR |
| GET | `/api/pre-arrival/guest/:guestId` | Get all guest preferences |
| DELETE | `/api/pre-arrival/:bookingId` | Delete preferences |
| GET | `/api/pre-arrival/analytics/:hotelId` | Get analytics |

---

## Staff Dashboard Updates

### Location
- Page: `Hotel OTA/apps/ota-web/src/app/staff/requests.tsx`

### New Features

#### SLA Timer Display
- Progress bar on each request card
- Color-coded status (green/yellow/orange/red)
- Time remaining/elapsed display

#### Auto-Assignment Badge
- Purple "Auto" badge on auto-assigned requests
- Distinguishes from manual assignments

#### SLA Statistics
- Header shows count of on-track/warning/alert/breached requests
- Real-time updates

#### Sorting Options
- Sort by SLA status (breached first)
- Helps prioritize at-risk requests

---

## Database Models

### Prisma Models Required

```prisma
model HotelBundle {
  id              String   @id @default(cuid())
  hotelId         String
  name            String
  description     String
  pricePaise      Int
  originalPricePaise Int?
  category        String
  services        String   // JSON
  duration        String?
  badges          String?  // JSON
  isPopular       Boolean  @default(false)
  isAiSuggested   Boolean  @default(false)
  suggestedReason String?
  available      Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model BundleOrder {
  id              String   @id @default(cuid())
  bundleId        String
  bundleName      String
  bookingId       String
  roomId          String
  guestId         String
  hotelId         String
  status          String   @default("pending")
  scheduledFor    DateTime?
  notes           String?
  totalAmountPaise Int
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model RoomEngagement {
  id              String   @id @default(cuid())
  rezUserId       String
  otaUserId       String
  bookingId       String
  hotelId         String
  roomId          String
  roomNumber      String
  engagementType  String
  metadata        Json?
  createdAt       DateTime @default(now())
}
```

---

## Environment Variables

```env
# Hotel OTA
HOTEL_OTA_API_URL=http://localhost:3008

# Room QR
ROOM_QR_API_URL=http://localhost:4015
ROOM_QR_BASE_URL=https://rez.money/room
ROOM_QR_JWT_SECRET=your-secret-key

# StayOwn
STAYOWN_API_URL=http://localhost:4015

# Services
EMAIL_SERVICE_URL=http://localhost:4003
SMS_SERVICE_URL=http://localhost:4005
WHATSAPP_SERVICE_URL=http://localhost:4004
```

---

## Integration Flow

### 1. Booking Confirmation
```
Booking Confirmed
    ↓
Generate Room QR
    ↓
Send to Guest (email/WhatsApp/SMS)
    ↓
Pre-Arrival Preferences Available
```

### 2. Guest Pre-Arrival
```
Guest Sets Preferences
    ↓
Sync to Room QR Service
    ↓
Room Prepared on Arrival
```

### 3. Room Service Request
```
Guest Makes Request
    ↓
Auto-Assignment Evaluates
    ↓
SLA Tracking Starts
    ↓
Staff Receives Notification
    ↓
Request Completed
    ↓
SLA Status Updated
```

### 4. Checkout
```
Guest Views Folio
    ↓
(Optional) Split with Friends
    ↓
Payment Processed
    ↓
Digital Receipt Generated
    ↓
Folio Synced to StayOwn
```

---

## Testing

### Unit Tests
- Bundle price calculations
- SLA time calculations
- Pre-arrival validation

### Integration Tests
- Bundle ordering flow
- Express checkout flow
- Auto-assignment with mock staff data

### E2E Tests
- Complete booking to checkout flow
- Pre-arrival preference setting
- Staff dashboard SLA tracking

---

## Performance Considerations

1. **Caching**: Cache bundle and menu data for quick retrieval
2. **Real-time**: Use WebSocket for SLA updates and notifications
3. **Pagination**: Implement for large request lists
4. **Lazy Loading**: Load bundle images on demand
5. **Optimistic UI**: Show immediate feedback on actions
