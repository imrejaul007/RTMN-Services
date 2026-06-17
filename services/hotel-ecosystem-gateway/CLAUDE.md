# Hotel Ecosystem Gateway

**Version:** 1.0.0  
**Port:** 4950  
**Status:** ✅ NEW - Unified Hotel API Gateway

---

## Overview

The Hotel Ecosystem Gateway is a unified API gateway that connects three hotel ecosystem systems:

```
RTMN-OS ──────┐
               │
REZ-Merchant ──┼──► HOTEL ECOSYSTEM GATEWAY (4950)
               │
StayOwn ───────┘
```

---

## Connected Systems

| System | Primary Service | Port | Purpose |
|--------|----------------|------|---------|
| **RTMN-OS** | Hotel OS | 5025 | PMS Core, AI Agents, Housekeeping |
| **REZ-Merchant** | Mind Hotel | 4017 | AI Intelligence, Predictions |
| **REZ-Merchant** | Booking | 4015 | Booking Engine |
| **StayOwn** | API Server | 3000 | OTA Backend, Payments |
| **StayOwn** | OTA Web | 3003 | Guest Booking Website |
| **StayOwn** | Hotel Panel | 3001 | Staff Dashboard |

---

## API Endpoints

### Hotels
```
GET  /api/hotels                    # Search hotels across all systems
GET  /api/hotels/:id                # Get hotel details
GET  /api/hotels/:id/availability   # Check room availability
GET  /api/hotels/:id/rooms          # Get room types
GET  /api/hotels/:id/analytics      # Get hotel analytics
```

### Bookings
```
POST /api/bookings                   # Create booking
GET  /api/bookings/:id              # Get booking details
GET  /api/bookings/user/:userId     # Get user's bookings
PUT  /api/bookings/:id/cancel       # Cancel booking
POST /api/bookings/:id/check-in     # Check in guest
POST /api/bookings/:id/check-out    # Check out guest
```

### Guests
```
GET  /api/guests/:id                # Get guest profile
GET  /api/guests/:id/bookings       # Get guest's bookings
GET  /api/guests/:id/preferences    # Get preferences
PUT  /api/guests/:id/preferences     # Update preferences
GET  /api/guests/:id/loyalty        # Get loyalty status
GET  /api/guests/:id/stay-history   # Get complete stay history
```

### Services
```
POST /api/services/request            # Create service request
GET  /api/services/room/:roomId     # Get room services
POST /api/services/minibar           # Add minibar charges
GET  /api/services/types             # Get service types
PUT  /api/services/:id/status        # Update service status
```

### Analytics
```
GET /api/analytics/dashboard          # Unified dashboard
GET /api/analytics/revpar            # RevPAR metrics
GET /api/analytics/occupancy          # Occupancy rates
GET /api/analytics/booking-trends     # Booking trends
GET /api/analytics/revenue            # Revenue breakdown
GET /api/analytics/predictions        # AI predictions
GET /api/analytics/satisfaction       # Guest satisfaction
```

### Wallet
```
GET  /api/wallet/:userId             # Get wallet balance
POST /api/wallet/:userId/coins/earn   # Earn coins
POST /api/wallet/:userId/coins/burn   # Burn coins
GET  /api/wallet/:userId/transactions # Transaction history
POST /api/wallet/:userId/payment      # Process payment
```

### Foundation (RTMN Layer)
```
GET  /api/twins/:type                 # Get digital twin
POST /api/memory/store                # Store in memory
GET  /api/memory/:type/:entityId      # Retrieve from memory
POST /api/identity/verify             # Verify identity
```

---

## Event Publishing

The gateway publishes events to the Event Bus (4510):

| Event | Trigger |
|-------|---------|
| `hotel.booking.created` | New booking created |
| `hotel.booking.cancelled` | Booking cancelled |
| `hotel.guest.checked_in` | Guest checked in |
| `hotel.guest.checked_out` | Guest checked out |
| `hotel.service.requested` | Service request created |
| `hotel.service.completed` | Service completed |
| `hotel.housekeeping.status_changed` | Room status changed |
| `hotel.payment.received` | Payment received |
| `hotel.loyalty.tier_changed` | Loyalty tier upgraded |

---

## Quick Start

```bash
cd services/hotel-ecosystem-gateway
npm install
npm run dev  # Starts on port 4950
```

---

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `HOTEL_OS_URL` - RTMN Hotel OS
- `STAYOWN_API_URL` - StayOwn API
- `REZ_MIND_HOTEL_URL` - REZ Mind Hotel AI
- `EVENT_BUS_URL` - RTMN Event Bus
- `REDIS_URL` - Redis for caching

---

## Architecture

```
                    Hotel Ecosystem Gateway (4950)
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│ RTMN-OS  │      │ REZ-Merchant│      │   StayOwn    │
│ Hotel OS │      │ Mind Hotel   │      │    OTA       │
│  (5025)  │      │   (4017)    │      │   (3000)     │
└──────────┘      └──────────────┘      └──────────────┘
      │                    │                    │
      └────────────────────┼────────────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │  Event Bus   │
                   │   (4510)     │
                   └──────────────┘
```

---

*Last Updated: June 17, 2026*
