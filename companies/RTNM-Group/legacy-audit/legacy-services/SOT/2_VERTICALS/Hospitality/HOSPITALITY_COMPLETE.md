# HOSPITALITY VERTICAL - Complete Documentation

**Date:** May 11, 2026  
**Version:** 1.0

---

## OVERVIEW

The Hospitality Vertical includes:
1. **Hotel OTA** - Hotel booking platform
2. **StayOwn** - Room service & QR ordering
3. **Habixo** - Vacation rentals & property management

---

## 1. HOTEL OTA (Online Travel Agency)

### Service: `Hotel-OTA/`

| Component | Port | Purpose |
|-----------|------|---------|
| API | 3008 | Core backend |
| Hotel Panel | - | Hotel management |
| Admin | - | Admin dashboard |
| Mobile | - | Guest app |
| PMS | - | Property management |

### API Endpoints

| Category | Count | Examples |
|----------|-------|---------|
| Authentication | 5 | Login, Register, OTP, Social |
| Hotels | 10+ | Search, Details, Availability |
| Bookings | 15+ | Create, Cancel, Modify |
| Wallet | 8 | Balance, Transactions |
| Room Service | 10+ | Orders, Menu, Kitchen |
| PMS | 12+ | Housekeeping, Staff |
| Channel Manager | 6+ | Sync with Booking.com, MMT |
| Admin | 15+ | User, Hotel, Coin management |

### Frontend Apps

| App | Platform | Purpose |
|-----|----------|---------|
| Hotel Panel | Next.js | Hotel management |
| Admin | Next.js | Platform admin |
| Mobile | React Native | Guest app |

### Integration Points

| Provider | Purpose |
|----------|---------|
| Supabase | PostgreSQL database |
| Redis | Session caching |
| Razorpay | Payment gateway |
| MakCorps | Hotel inventory |
| Socket.IO | Real-time updates |

### Features

| Feature | Status |
|---------|--------|
| Hotel search | Built |
| Room booking | Built |
| Payment processing | Built |
| Channel manager | Built |
| Housekeeping | Built |
| Kitchen display | Built |
| Staff management | Built |
| Guest messaging | Built |
| Review management | Built |

---

## 2. STAYOWN (Room Service & QR)

### Service: `rez-stayown-service/`

| Feature | Purpose |
|---------|---------|
| Room QR | Guest scan to order |
| In-room ordering | Menu, housekeeping |
| Payment | Room billing |
| Kitchen integration | Real-time orders |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/orders | Create order |
| GET | /api/orders | List orders |
| GET | /api/menu | Hotel menu |
| POST | /api/qr/generate | Generate room QR |
| GET | /api/qr/:roomId | Get room QR |

### Room QR Flow

```
1. Guest scans QR in room
2. Menu displayed
3. Guest places order
4. Kitchen receives order
5. Room charged to booking
6. Order delivered
```

---

## 3. HABIXO (Vacation Rentals)

### Service: `rez-habixo-service/`

| Module | Description |
|--------|-------------|
| **Habixo Stay** | Short-term vacation rentals (Airbnb-style) |
| **Habixo Rent** | Long-term premium rentals (Flent-style) |
| **Habixo Match** | Flatmate matching (FlatX-style) |

### Features

| Feature | Stay | Rent | Match |
|---------|------|------|-------|
| Property listings | ✅ | ✅ | ✅ |
| Dynamic pricing | ✅ | - | - |
| Calendar sync | ✅ | ✅ | - |
| Guest messaging | ✅ | ✅ | ✅ |
| Trust scoring | ✅ | ✅ | ✅ |
| Coin rewards | ✅ | ✅ | ✅ |
| Karma system | ✅ | ✅ | ✅ |

### Trust Engine

| Component | Score |
|-----------|-------|
| Host reliability | 0-100 |
| Property quality | 0-100 |
| Guest behavior | L1-L4 |

### API Endpoints

| Category | Endpoints |
|----------|----------|
| Properties | POST, GET, PUT, DELETE |
| Bookings | Create, Cancel, Modify |
| Users | Profile, Verification |
| Payments | Wallet, Refunds |
| Matching | Compatibility scores |

---

## INTEGRATION POINTS

### Cross-Service Communication

| Service | Connection |
|---------|------------|
| `rez-auth-service` | User authentication |
| `rez-wallet-service` | Coin payments |
| `rez-gamification-service` | Karma system |
| `rez-support-copilot` | AI support |
| `REZ Mind` | Intent capture |

### External APIs

| Provider | Integration |
|----------|-------------|
| MakCorps | Hotel inventory |
| Razorpay | Payments |
| Supabase | Database |

---

## DEPLOYMENTS

| Service | Platform | URL |
|---------|----------|-----|
| Hotel OTA API | Render | `hotel-ota-api.onrender.com` |
| Hotel Web | Vercel | `hotel-ota.vercel.app` |
| Hotel Admin | Vercel | `hotel-ota-admin.vercel.app` |

---

## SECURITY

| Feature | Status |
|---------|--------|
| API key auth | ✅ Implemented |
| JWT verification | ✅ Built |
| Rate limiting | ✅ Built |
| Input validation | ✅ Built |
| HMAC verification | ✅ Built |

---

**Last Updated:** May 11, 2026
