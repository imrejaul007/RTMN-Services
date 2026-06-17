# StayOwn Hotel OS - AI-First Hotel Intelligence Platform

**Port:** 5025  
**Industry:** Hotel / Hospitality  
**Competitors:** Oracle Opera, Cloudbeds, Mews, Agilysys, eZee, Hotelogix, Stayntouch, Yanolja Cloud

---

## Overview

StayOwn Hotel OS is a comprehensive Property Management System (PMS) with AI-powered features. It manages the complete hotel lifecycle from reservations to checkout, integrated with all 15 RTMN ecosystem layers.

---

## Architecture

### Core Modules

1. **Room Management** - Room inventory, types, rates, status tracking
2. **Reservation System** - Booking lifecycle, availability, confirmation
3. **Guest Management** - Profiles, preferences, loyalty, history
4. **Housekeeping** - Task management, room status, scheduling
5. **Folio/Billing** - Charges, payments, invoices, folios
6. **Night Audit** - Daily close, revenue reporting
7. **F&B POS** - Restaurant outlets, orders, payments
8. **Room Services** - Spa, minibar, requests

---

## API Endpoints

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | List all rooms (filter: status, floor, type) |
| GET | `/api/rooms/:id` | Get room details |
| POST | `/api/rooms` | Create room |
| PATCH | `/api/rooms/:id` | Update room |
| PATCH | `/api/rooms/:id/status` | Update room status |

**Room Statuses:** `available`, `occupied`, `dirty`, `maintenance`, `out-of-order`, `blocked`

### Room Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/room-types` | List room types |
| POST | `/api/room-types` | Create room type |

### Guests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guests` | List guests (filter: search, membership) |
| GET | `/api/guests/:id` | Get guest profile + history |
| POST | `/api/guests` | Create guest profile |
| PATCH | `/api/guests/:id` | Update guest |
| GET | `/api/guests/:id/preferences` | Get preferences |
| PATCH | `/api/guests/:id/preferences` | Update preferences |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List bookings (filter: status, date, guestId, roomId) |
| GET | `/api/bookings/:id` | Get booking details |
| POST | `/api/bookings` | Create booking |
| PATCH | `/api/bookings/:id` | Update booking |
| POST | `/api/bookings/:id/assign-room` | Assign room to booking |
| POST | `/api/bookings/:id/check-in` | Check-in guest |
| POST | `/api/bookings/:id/check-out` | Check-out guest |
| POST | `/api/bookings/:id/cancel` | Cancel booking |

**Booking Statuses:** `on-request`, `confirmed`, `checked-in`, `checked-out`, `cancelled`, `no-show`

### Availability

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/availability` | Search available rooms |

**Query Params:** `checkIn`, `checkOut`, `adults`, `children`, `roomType`

### Housekeeping

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/housekeeping/tasks` | List tasks (filter: status, priority, assignedTo) |
| POST | `/api/housekeeping/tasks` | Create task |
| PATCH | `/api/housekeeping/tasks/:id` | Update task |
| GET | `/api/housekeeping/rooms` | Room status summary |

### Room Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List hotel services |
| POST | `/api/services` | Create service |
| POST | `/api/services/orders` | Order service |
| GET | `/api/services/orders` | List service orders |
| PATCH | `/api/services/orders/:id` | Update order |

### Invoices & Folio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List all folios |
| GET | `/api/invoices/:bookingId` | Get guest folio |
| POST | `/api/invoices/:bookingId/charge` | Add charge |
| POST | `/api/invoices/:bookingId/payment` | Add payment |

### Night Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/night-audit` | Generate audit report |
| GET | `/api/night-audit` | Get audit report |

### F&B / Dining

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dining/outlets` | List dining outlets |
| GET | `/api/dining/menu` | List menu items |
| GET | `/api/dining/tables` | List tables |
| POST | `/api/dining/tables/:id/occupy` | Occupy table |
| POST | `/api/dining/orders` | Create order |
| GET | `/api/dining/orders` | List orders |
| PATCH | `/api/dining/orders/:id` | Update order |
| POST | `/api/dining/orders/:id/pay` | Pay order |
| GET | `/api/dining/revenue` | Revenue report |

### Analytics & Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Full analytics |
| GET | `/api/dashboard` | Dashboard summary |

---

## Data Models

### Room
```javascript
{
  id: string,
  number: string,
  floor: string,
  type: string,           // rt_standard, rt_deluxe, rt_suite, rt_presidential
  typeName: string,
  shortCode: string,       // STD, DLX, STE, PRS
  status: string,
  features: string[],
  rackRate: number,
  maxOccupancy: number,
  size: number             // sq meters
}
```

### Booking
```javascript
{
  id: string,
  confirmationNumber: string,
  guestId: string,
  roomId: string,
  roomNumber: string,
  checkIn: string,         // ISO date
  checkOut: string,        // ISO date
  nights: number,
  adults: number,
  children: number,
  status: string,
  totalAmount: number,
  paidAmount: number,
  balance: number,
  source: string,          // direct, booking.com, expedia, etc.
  paymentMethod: string,
  specialRequests: string
}
```

### Guest
```javascript
{
  id: string,
  name: string,
  email: string,
  phone: string,
  nationality: string,
  idType: string,
  idNumber: string,
  membershipTier: string,
  totalStays: number,
  totalSpend: number
}
```

### Folio Transaction
```javascript
{
  type: 'charge' | 'payment',
  description: string,
  amount: number,
  date: string,
  reference?: string
}
```

---

## Sample Data

On startup, the service initializes:
- **30 rooms** across 5 floors
- **4 room types**: Standard ($150), Deluxe ($250), Suite ($400), Presidential ($800)
- **3 sample guests**: John Smith, Maria Garcia, Raj Patel
- **1 active booking**: John Smith checked-in at room 201
- **3 dining outlets**: Main Restaurant, Rooftop Bar, Pool Cafe
- **8 F&B menu items**

---

## Digital Twins

All twins sync to TwinOS Hub:
- **Guest Twin** - Guest profiles and preferences
- **Room Twin** - Room status and inventory
- **Booking Twin** - Reservations and lifecycle
- **Property Twin** - Property-level analytics
- **Staff Twin** - Staff scheduling
- **Service Twin** - Service orders
- **Invoice Twin** - Financial transactions

---

## AI Agents (12 Agents)

| Agent | Purpose |
|-------|---------|
| AI Receptionist | Front desk operations |
| AI Concierge | Guest services |
| AI Housekeeping Manager | Room status & scheduling |
| AI Revenue Manager | Dynamic pricing |
| AI Guest Relations | Pre/post stay |
| AI Chef (Room Service) | Kitchen management |
| AI Waiter (F&B) | Restaurant service |
| AI Sales & Events | Banquets |
| AI Maintenance | Work orders |
| AI Billing & Folio | Invoice management |
| AI Booking Agent | Direct booking optimization |
| AI Marketing | Campaigns & engagement |

---

## 15 RTMN Layers Integration

```
Layer 1: Intelligence (HOJAI AI)
Layer 2: Customer Growth (AdBazaar + REZ Consumer)
Layer 3: Commerce (Nexha + REZ-Merchant)
Layer 4: Financial (RABTUL)
Layer 5: Workforce (CorpPerks)
Layer 6: Legal & Trust (LawGens)
Layer 7: Property (RisnaEstate + StayOwn)
Layer 8: Health (RisaCare)
Layer 9: Mobility (KHAIRMOVE)
Layer 10: Identity (CorpID)
Layer 11: Memory (MemoryOS)
Layer 12: Twins (TwinOS Hub)
Layer 13: Automation (FlowOS)
Layer 14: Autonomous (SUTAR OS)
Layer 15: Consumer (REZ Consumer + Axom)
```

---

## Testing

```bash
# Health check
curl http://localhost:5025/health

# List rooms
curl http://localhost:5025/api/rooms

# Available rooms
curl "http://localhost:5025/api/availability?checkIn=2026-06-20&checkOut=2026-06-22&adults=2"

# Dashboard
curl http://localhost:5025/api/dashboard

# List bookings
curl http://localhost:5025/api/bookings

# List dining outlets
curl http://localhost:5025/api/dining/outlets
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5025 | Service port |
| `MONGODB_URI` | - | MongoDB connection (optional, runs in-memory if not set) |
| `LAYERS` | all | Comma-separated layers to enable |

---

**Status:** ✅ **DEPLOYMENT READY**  
**Last Updated:** June 17, 2026
