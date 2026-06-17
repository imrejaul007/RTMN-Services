# Z-Events App

**Version:** 1.0.0  
**Last Updated:** June 17, 2026  
**Company:** Axom | **Parent:** BuzzLocal Platform

---

## Overview

Z-Events is an **exhibition and event discovery app** that allows users to:
- Discover exhibitions, trade shows, and events
- Browse exhibitor booths and products
- Register for sessions and speaker talks
- Purchase tickets with SUTAR Escrow payment
- Connect with exhibitors and other attendees

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Expo SDK 50 (React Native) |
| Navigation | expo-router 3.4 |
| HTTP Client | Axios 1.6 |
| Auth | CorpID (port 4300) |
| Payments | SUTAR Escrow (port 4149) |
| API Gateway | Exhibition OS (port 5040) |

---

## Project Structure

```
z-events-app/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout
│   ├── (tabs)/                  # Tab navigation
│   │   ├── _layout.tsx         # Tab bar config
│   │   ├── index.tsx           # Home (Events discovery)
│   │   ├── explore.tsx        # Search & discover
│   │   ├── saved.tsx           # Saved events/exhibitors
│   │   ├── tickets.tsx         # My tickets
│   │   └── profile.tsx         # User profile
│   ├── event/[id].tsx          # Event detail
│   ├── booth/[id].tsx          # Booth detail
│   └── session/[id].tsx        # Session detail
├── src/
│   └── services/
│       ├── exhibitionService.ts  # Main API client (35+ endpoints)
│       ├── authService.ts       # CorpID authentication
│       └── paymentService.ts    # SUTAR Escrow payments
├── .env.example                 # Environment template
└── package.json
```

---

## Features

### Core Features

| Feature | Screen | Status |
|---------|--------|--------|
| Event Discovery | Home | ✅ Complete |
| Event Search | Explore | ✅ Complete |
| Event Details | event/[id] | ✅ Complete |
| Booth Exploration | booth/[id] | ✅ Complete |
| Session Schedule | session/[id] | ✅ Complete |
| Ticket Purchase | Tickets | ✅ Complete |
| Save Favorites | Saved | ✅ Complete |
| User Profile | Profile | ✅ Complete |
| Live Events | Home | ✅ Complete |
| Pull-to-refresh | All | ✅ Complete |

### Tab Navigation

| Tab | Icon | Description |
|-----|------|-------------|
| Events | 🎪 | Browse & discover events |
| Explore | 🔍 | Search events, exhibitors, sessions |
| Saved | ❤️ | Saved items |
| Tickets | 🎫 | My tickets with QR |
| Profile | 👤 | User profile & settings |

---

## API Services

### ExhibitionService (35+ endpoints)

```typescript
// Events
getExhibitions()                              // GET /api/exhibitions
getExhibition(id)                             // GET /api/exhibitions/{id}
searchExhibitions(query)                       // GET /api/exhibitions/search
getLiveExhibitions()                          // GET /api/exhibitions?status=live

// Booths
getBooths(exhibitionId)                       // GET /api/exhibitions/{id}/booths
getBooth(exhibitionId, boothId)               // GET /api/exhibitions/{id}/booths/{boothId}
getFeaturedBooths(exhibitionId)                 // GET /api/exhibitions/{id}/booths/featured
getBoothProducts(exhibitionId, boothId)       // GET /api/exhibitions/{id}/booths/{boothId}/products

// Sessions
getSessions(exhibitionId)                      // GET /api/exhibitions/{id}/sessions
getSession(exhibitionId, sessionId)            // GET /api/exhibitions/{id}/sessions/{sessionId}
registerForSession(sessionId)                   // POST /api/sessions/{id}/register

// Tickets
getTickets()                                  // GET /api/tickets
getTicket(ticketId)                           // GET /api/tickets/{ticketId}
checkIn(exhibitionId)                          // POST /api/exhibitions/{id}/checkin

// Networking
getConnections(exhibitionId)                   // GET /api/connections/{exhibitionId}
connectWithAttendee(attendeeId)               // POST /api/connections
getSuggestedConnections(exhibitionId)           // GET /api/profiles/suggestions/{exhibitionId}
searchAttendees(exhibitionId, query)          // GET /api/profiles/search/{exhibitionId}

// Appointments
getAppointments()                             // GET /api/appointments
bookAppointment(exhibitorId, exhibitionId, date) // POST /api/appointments
cancelAppointment(appointmentId)                // DELETE /api/appointments/{appointmentId}
getExhibitorAvailability(exhibitorId, date)   // GET /api/availability/{exhibitorId}/{exhibitionId}/{date}

// Economy
getCoinBalance(exhibitionId)                   // GET /api/coins/balance/{exhibitionId}
getMissions(exhibitionId)                      // GET /api/missions/{exhibitionId}
recordProgress(missionId, progress)             // POST /api/progress/record

// AI/Genie
getDailyBriefing(exhibitionId)                 // GET /api/genie/exhibitions/{id}/briefing
getRecommendations(exhibitionId)                // GET /api/recommendations/{exhibitionId}
askGenie(message)                              // POST /api/chat

// Analytics
getExhibitionAnalytics(exhibitionId)            // GET /api/analytics/dashboard/{exhibitionId}
getHeatmap(exhibitionId)                       // GET /api/heatmap/{exhibitionId}

// Payments
createPaymentIntent(exhibitionId)               // POST /api/payments/intent
confirmPayment(paymentId)                      // POST /api/payments/{paymentId}/confirm
```

### AuthService (CorpID)

```typescript
// Authentication
signUp(email, password, name)                 // POST /api/auth/signup
signIn(email, password)                        // POST /api/auth/login
signIn(phone)                                // POST /api/auth/request-otp
signOut()                                     // POST /api/auth/logout
refreshAccessToken()                          // Refresh JWT

// User
getProfile()                                  // GET /api/users/me
updateProfile(data)                           // PATCH /api/users/me
verifyEmail(token)                            // GET /api/auth/verify/{token}
sendVerificationEmail()                        // POST /api/auth/send-verification

// OTP
requestOTP(phone)                             // POST /api/auth/request-otp
verifyOTP(phone, otp)                        // POST /api/auth/verify-otp

// Social Auth
signInWithGoogle(idToken)                     // POST /api/auth/google
signInWithApple(identityToken)               // POST /api/auth/apple
```

### PaymentService (SUTAR Escrow)

```typescript
// Payments
createPaymentIntent(exhibitionId, amount)      // POST /api/payments/intent
confirmPayment(paymentId)                     // POST /api/payments/{paymentId}/confirm
initiateUPIPayment(paymentId)                 // Generate UPI QR/deep link
verifyUPIPayment(transactionId)              // Verify UPI transaction

// Escrow
createExhibitorFeePayment(boothId)            // POST /api/escrow
getEscrowStatus(escrowId)                    // GET /api/escrow/{id}
releaseEscrow(escrowId)                       // POST /api/escrow/{id}/release

// Refunds
initiateRefund(paymentId, reason)             // POST /api/payments/{paymentId}/refund
getRefundStatus(refundId)                     // GET /api/refunds/{refundId}

// History
getPaymentHistory()                           // GET /api/payments
getPayment(paymentId)                         // GET /api/payments/{paymentId}
```

---

## Environment Variables

```bash
# Exhibition OS Gateway (Local)
EXPO_PUBLIC_EXHIBITION_GATEWAY_URL=http://localhost:5040

# CorpID Authentication (Local)
EXPO_PUBLIC_CORPID_URL=http://localhost:4300

# SUTAR Escrow (Payments) (Local)
EXPO_PUBLIC_SUTAR_ESCROW_URL=http://localhost:4149
```

### Production URLs
```bash
EXPO_PUBLIC_EXHIBITION_GATEWAY_URL=https://exhibition-api.rtmn.in
EXPO_PUBLIC_CORPID_URL=https://corpid.rtmn.in
EXPO_PUBLIC_SUTAR_ESCROW_URL=https://escrow.rtmn.in
```

---

## Backend Services

| Service | Port | Purpose |
|---------|------|---------|
| Exhibition Gateway | 5040 | Main API orchestration |
| Exhibition Organizer | 5041 | Organizer management |
| Exhibition Exhibitor | 5042 | Booth & leads |
| Exhibition Attendee | 5043 | Registration |
| Exhibition Analytics | 5046 | Dashboard metrics |
| Exhibition Payment | 5048 | Ticket payments & escrow |
| CorpID | 4300 | Universal identity |
| SUTAR Escrow | 4149 | Payment escrow |

---

## Quick Start

```bash
# Install dependencies
cd z-events-app
npm install

# Start development
npx expo start

# Build for Android
npx expo run:android

# Build for iOS
npx expo run:ios
```

---

## Design System

### Colors (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| background | #0F172A | App background |
| card | #1E293B | Cards, surfaces |
| slate | #334155 | Secondary surfaces |
| primary | #6366F1 | CTAs, active states |
| white | #FFFFFF | Primary text |
| gray | #94A3B8 | Secondary text |
| muted | #64748B | Tertiary text |
| success | #22C55E | Live status, success |
| danger | #EF4444 | Live badge, errors |

### Icons
Emoji-based icons (🎪, 🔍, 🎫, ❤️, 👤, 🏢)

---

## Navigation Structure

```
Root Stack Navigator
├── (tabs) [hidden header]
│   ├── Events (index.tsx)
│   ├── Explore
│   ├── Saved
│   ├── Tickets
│   └── Profile
├── event/[id] (Stack screen)
├── booth/[id] (Stack screen)
└── session/[id] (Stack screen)
```

---

## Related Apps

| App | Path | Purpose |
|-----|------|---------|
| BuzzLocal | buzzlocal-app/ | Community platform |
| DO Exhibitor | REZ-Exhibitor/do-exhibitor | Exhibitor side app |
| Exhibition OS | exhibition-os/ | Backend services |

---

## Integration Points

```
Z-Events App
    │
    ├── Exhibition OS Gateway (5040)
    │       ├── Exhibition Service
    │       ├── Booth Service
    │       ├── Session Service
    │       ├── Ticket Service
    │       └── Analytics Service
    │
    ├── CorpID (4300)
    │       └── Authentication & Identity
    │
    └── SUTAR Escrow (4149)
            └── Payment Processing
```

---

## TODO

- [ ] Add app.json for Expo configuration
- [ ] Add tsconfig.json
- [ ] Create reusable UI components
- [ ] Add error boundaries
- [ ] Add loading skeletons
- [ ] Implement offline support
- [ ] Add Sentry crash reporting
- [ ] Add analytics tracking
- [ ] Write unit tests

---

*Last Updated: June 17, 2026*
*Z-Events - Discover. Connect. Experience.*
