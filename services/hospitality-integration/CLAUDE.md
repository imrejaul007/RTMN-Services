# Hospitality Integration Service

**Version:** 1.0.0
**Port:** 4964
**Status:** Active
**Last Updated:** June 16, 2026

---

## Overview

The Hospitality Integration Service connects StayOwn-Hospitality, Hotel OS, and Restaurant OS to Customer Operations via Digital Twins. It provides a unified API for managing hotel bookings, restaurant orders, guest profiles, and syncing data to the RTMN Twin ecosystem.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              HOSPITALITY INTEGRATION SERVICE (Port 4964)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Hotel Routes │  │Restaurant    │  │   Booking    │          │
│  │   (/api/hotel)│  │  Routes      │  │   Routes     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         └────────────┬────┴─────┬────────────┘                   │
│                      │          │                                 │
│         ┌───────────┴──────────┴───────────┐                     │
│         │    CustomerOpsBridge Service      │                     │
│         │    - Twin Sync                    │                     │
│         │    - Event Publishing             │                     │
│         │    - Service Registry             │                     │
│         └─────────────────┬─────────────────┘                     │
│                           │                                        │
│         ┌─────────────────┴─────────────────┐                     │
│         │    BookingSync Service             │                     │
│         │    - Asset Twin Sync              │                     │
│         │    - StayOwn Integration          │                     │
│         └─────────────────┬─────────────────┘                     │
│                           │                                        │
│         ┌─────────────────┴─────────────────┐                     │
│         │    ExperienceSync Service          │                     │
│         │    - Journey Intelligence         │                     │
│         │    - Feedback Twin                │                     │
│         └─────────────────────────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌──────▼─────┐   ┌────▼────┐
    │ Hotel OS  │   │Restaurant  │   │ StayOwn  │
    │  :5025    │   │    OS      │   │ Hospitality │
    │           │   │   :5010    │   │   :6000  │
    └───────────┘   └────────────┘   └──────────┘

                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                       │
┌───▼───┐         ┌───────▼───────┐       ┌──────▼──────┐
│ Asset │         │   Customer    │       │    Order    │
│ Twin  │         │    Twin      │       │    Twin     │
│ :3015 │         │    :3017     │       │   :3018     │
└───────┘         └───────────────┘       └─────────────┘
```

## Twin Integration Map

| Hospitality Data | Twin Service | Purpose |
|-----------------|--------------|---------|
| Hotel Bookings | Asset Twin | Room/cabin inventory and status |
| Guest Profiles | Customer Twin | Guest demographics and preferences |
| Restaurant Orders | Order Twin | Order tracking and analytics |
| Reviews/Ratings | Feedback Twin | Sentiment and quality tracking |
| Service Requests | Ticket Engine | Issue resolution tracking |

## API Endpoints

### Hotel Integration (`/api/hotel`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/properties` | Get all properties |
| GET | `/properties/:propertyId` | Get property details |
| GET | `/properties/:propertyId/rooms` | Get rooms for property |
| GET | `/bookings` | Get all bookings |
| GET | `/bookings/:bookingId` | Get booking by ID |
| POST | `/bookings` | Create booking |
| PUT | `/bookings/:bookingId` | Update booking |
| POST | `/bookings/:bookingId/check-in` | Check-in guest |
| POST | `/bookings/:bookingId/check-out` | Check-out guest |
| POST | `/bookings/:bookingId/cancel` | Cancel booking |
| GET | `/availability` | Check room availability |
| GET | `/stayown/status` | StayOwn integration status |
| POST | `/stayown/sync` | Sync StayOwn properties |
| GET | `/stats/occupancy` | Occupancy statistics |

### Restaurant Integration (`/api/restaurant`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/restaurants` | Get all restaurants |
| GET | `/restaurants/:restaurantId` | Get restaurant details |
| GET | `/restaurants/:restaurantId/menu` | Get restaurant menu |
| GET | `/orders` | Get all orders |
| GET | `/orders/:orderId` | Get order by ID |
| POST | `/orders` | Create order |
| PUT | `/orders/:orderId` | Update order |
| POST | `/orders/:orderId/items` | Add items to order |
| PATCH | `/orders/:orderId/status` | Update order status |
| POST | `/orders/:orderId/pay` | Process payment |
| POST | `/room-service` | Create room service order |
| GET | `/tables` | Get tables |
| POST | `/reservations` | Reserve table |
| GET | `/history/:guestId` | Get guest dining history |
| POST | `/orders/:orderId/rate` | Rate order |

### Booking Management (`/api/booking`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all bookings |
| GET | `/:bookingId` | Get booking by ID |
| POST | `/` | Create booking |
| PUT | `/:bookingId` | Update booking |
| POST | `/:bookingId/check-in` | Check-in |
| POST | `/:bookingId/check-out` | Check-out |
| POST | `/:bookingId/cancel` | Cancel booking |
| POST | `/:bookingId/addons` | Add add-ons |
| GET | `/guest/:guestId` | Get guest bookings |
| GET | `/:bookingId/timeline` | Get booking timeline |
| POST | `/sync/all` | Sync all bookings |
| GET | `/stats/summary` | Booking statistics |

### Guest Profiles (`/api/guest`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all guests |
| GET | `/:guestId` | Get guest by ID |
| POST | `/find-or-create` | Find or create guest |
| POST | `/` | Create guest |
| PUT | `/:guestId` | Update guest |
| PATCH | `/:guestId/preferences` | Update preferences |
| POST | `/:guestId/stays` | Add stay history |
| POST | `/:guestId/dining` | Add dining history |
| GET | `/:guestId/preferences` | Get preferences |
| GET | `/:guestId/stays` | Get stay history |
| GET | `/:guestId/dining` | Get dining history |
| POST | `/:guestId/vip` | Mark as VIP |
| GET | `/search/query` | Search guests |
| GET | `/filter/vip` | Get VIP guests |
| GET | `/filter/loyalty/:tier` | Get by loyalty tier |
| GET | `/:guestId/spending` | Spending summary |

### Dashboard & Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/dashboard` | Dashboard overview |
| GET | `/api/status` | Integration status |
| POST | `/api/sync/bookings` | Sync all bookings |
| POST | `/api/sync/experiences` | Sync all experiences |

## Data Models

### GuestProfile
```typescript
interface GuestProfile {
  id: string;
  customerTwinId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferences: GuestPreferences;
  stayHistory: StayHistory[];
  diningHistory: DiningHistory[];
  totalStays: number;
  totalSpent: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  vipStatus: boolean;
}
```

### HotelBooking
```typescript
interface HotelBooking {
  id: string;
  assetTwinId?: string;
  guestId: string;
  propertyId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  source: 'direct' | 'booking.com' | 'airbnb' | 'walk-in' | 'ota';
}
```

### RestaurantOrder
```typescript
interface RestaurantOrder {
  id: string;
  orderTwinId?: string;
  guestId?: string;
  restaurantId: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  status: 'open' | 'preparing' | 'ready' | 'served' | 'closed';
  orderType: 'dine-in' | 'takeout' | 'delivery' | 'room-service';
}
```

## Event Schemas

### Published Events

| Event Type | Payload | Trigger |
|------------|---------|---------|
| `guest.profile.updated` | guestId, customerTwinId, action | Guest profile sync |
| `booking.asset.updated` | bookingId, assetTwinId, action | Booking sync |
| `restaurant.order.created` | orderId, guestId, totalAmount | Order creation |
| `feedback.review.created` | reviewId, rating, type | Review submission |
| `booking.synced` | bookingId, assetTwinId, status | Booking sync complete |
| `experience.synced` | experienceId, journeyId, satisfaction | Experience sync |

## Environment Variables

```bash
# Service
PORT=4964
NODE_ENV=development

# Service URLs
HOTEL_OS_URL=http://localhost:5025
RESTAURANT_OS_URL=http://localhost:5010
STAYOWN_HOSPITALITY_URL=http://localhost:6000

# Twin Services
ASSET_TWIN_URL=http://localhost:3015
CUSTOMER_TWIN_URL=http://localhost:3017
ORDER_TWIN_URL=http://localhost:3018
FEEDBACK_TWIN_URL=http://localhost:3019

# Integration Hub
EVENT_BUS_URL=http://localhost:4510
SERVICE_REGISTRY_URL=http://localhost:4399
JOURNEY_INTELLIGENCE_URL=http://localhost:4761

# Auth
JWT_SECRET=your-jwt-secret-here
```

## Running the Service

```bash
# Install dependencies
cd services/hospitality-integration
npm install

# Development mode
npm run dev

# Production build
npm run build
npm start
```

## Health Check

```bash
curl http://localhost:4964/health
```

Response:
```json
{
  "status": "healthy",
  "service": "hospitality-integration",
  "version": "1.0.0",
  "integrations": {
    "hotelOS": "localhost:5025",
    "restaurantOS": "localhost:5010",
    "stayOwn": "localhost:6000"
  }
}
```

## Status Check

```bash
curl http://localhost:4964/api/status
```

Response:
```json
{
  "service": "hospitality-integration",
  "integrations": [
    { "name": "Asset Twin", "connected": true },
    { "name": "Customer Twin", "connected": true },
    { "name": "Order Twin", "connected": false }
  ]
}
```

## Dependencies

- **Hotel OS** (5025) - Hotel management, bookings, rooms
- **Restaurant OS** (5010) - Restaurant management, orders, menus
- **StayOwn Hospitality** (6000) - External hospitality system
- **Asset Twin** (3015) - Room/asset inventory sync
- **Customer Twin** (3017) - Guest profile sync
- **Order Twin** (3018) - Order tracking sync
- **Feedback Twin** (3019) - Review/rating sync
- **Event Bus** (4510) - Event publishing
- **Service Registry** (4399) - Service discovery

## Key Features

1. **Unified API** - Single interface for all hospitality systems
2. **Twin Sync** - Automatic sync to Asset, Customer, Order, Feedback Twins
3. **Offline Support** - Local storage for offline operation
4. **Event-Driven** - Publishes events for real-time updates
5. **Service Registry** - Auto-registers with ecosystem registry
6. **Mock Data** - Falls back to mock data when services unavailable

## Integration Patterns

### Creating a Booking with Twin Sync

```typescript
// POST /api/booking
const booking = {
  guestId: 'GUEST-001',
  guestName: 'John Smith',
  propertyId: 'HTL-001',
  roomId: 'HTL-001-201',
  checkIn: '2026-06-20',
  checkOut: '2026-06-23',
  nights: 3,
  totalAmount: 825
};

// Automatically syncs to:
// - Asset Twin (room status)
// - Customer Twin (guest history)
// - Event Bus (booking.created event)
```

### Room Service with Order Sync

```typescript
// POST /api/restaurant/room-service
const order = {
  bookingId: 'BK-001',
  roomNumber: '201',
  items: [
    { name: 'Caesar Salad', quantity: 1, price: 14 },
    { name: 'Grilled Salmon', quantity: 1, price: 32 }
  ]
};

// Automatically syncs to:
// - Order Twin
// - Customer Twin (dining history)
```

---

*Last Updated: June 16, 2026*
