# Hotel OS - Features

**Version:** 1.0.0  
**Last Updated:** June 15, 2026  
**Port:** 5025  
**Status:** ✅ RUNNING

---

## Core Features

### 1. Room Management

| Feature | Description | Status |
|---------|-------------|--------|
| Room CRUD | Create, read, update, delete rooms | ✅ |
| Room Types | Standard, Deluxe, Suite, Executive, Presidential | ✅ |
| Floor Management | Organize by floor | ✅ |
| Amenities | List room amenities | ✅ |
| Price | Dynamic pricing per room | ✅ |
| Status | available, occupied, maintenance, cleaning | ✅ |

### 2. Booking Engine

| Feature | Description | Status |
|---------|-------------|--------|
| Booking Creation | Create new bookings | ✅ |
| Conflict Detection | Prevent double booking | ✅ |
| Auto Pricing | Dynamic pricing | ✅ |
| Cancellation | Cancel bookings | ✅ |
| Check-in/Check-out | Guest check-in/out | ✅ |
| Extension | Extend stay | ✅ |

### 3. Guest Management

| Feature | Description | Status |
|---------|-------------|--------|
| Guest Registration | Register guests | ✅ |
| Loyalty Points | Point accumulation | ✅ |
| Tier System | Silver, Gold, Platinum | ✅ |
| Preferences | Store guest preferences | ✅ |
| History | Stay history | ✅ |
| Contact Info | Phone, email, address | ✅ |

### 4. Hotel Services

| Feature | Description | Status |
|---------|-------------|--------|
| Room Service | Food & beverage | ✅ |
| Spa | Spa bookings | ✅ |
| Gym | Gym access | ✅ |
| Airport Transfer | Transport service | ✅ |
| Laundry | Laundry service | ✅ |
| Restaurant | On-site dining | ✅ |

### 5. Invoicing

| Feature | Description | Status |
|---------|-------------|--------|
| Invoice Creation | Generate invoices | ✅ |
| Tax Calculation | GST calculation | ✅ |
| Payment Processing | Record payments | ✅ |
| Multiple Methods | Cash, card, UPI | ✅ |

### 6. Digital Twins

| Twin | Purpose | Data |
|------|---------|------|
| Room Twin | Room state | Occupancy, availability |
| Booking Twin | Booking state | Reservations, history |
| Guest Twin | Guest profiles | Preferences, loyalty |
| Service Twin | Service state | Requests, status |
| Revenue Twin | Revenue tracking | Income, metrics |

---

## API Endpoints

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | List rooms |
| POST | `/api/rooms` | Add room |
| GET | `/api/rooms/:id` | Get room |
| PUT | `/api/rooms/:id` | Update room |
| DELETE | `/api/rooms/:id` | Delete room |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List bookings |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/:id` | Get booking |
| PATCH | `/api/bookings/:id` | Update booking |
| DELETE | `/api/bookings/:id` | Cancel booking |

### Guests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guests` | List guests |
| POST | `/api/guests` | Register guest |
| GET | `/api/guests/:id` | Get guest |
| PUT | `/api/guests/:id` | Update guest |
| POST | `/api/guests/:id/points` | Add loyalty points |

### Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List services |
| POST | `/api/services/request` | Request service |
| GET | `/api/services/requests` | Get requests |
| PATCH | `/api/services/requests/:id` | Update request |

### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice |
| POST | `/api/invoices/:id/pay` | Pay invoice |

---

## Integration

### Connected Services

| Service | Port | Integration |
|---------|------|-------------|
| REZ-ecosystem-connector | 4399 | Service registry |
| REZ-event-bus | 4510 | Event publishing |

### Event Publishing

| Event | Trigger |
|-------|---------|
| booking.created | New booking |
| booking.cancelled | Booking cancellation |
| guest.arrived | Check-in |

---

*Last Updated: June 15, 2026*
*Hotel OS - Hospitality Industry OS*