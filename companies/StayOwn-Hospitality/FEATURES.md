# StayOwn-Hospitality - Hotel Management Platform

**Last Updated:** June 17, 2026  
**Location:** `companies/StayOwn-Hospitality/`  
**Status:** ✅ **PRODUCTION READY**  
**Tagline:** "AI-Powered Hotel Management & Guest Experience"

---

## Overview

StayOwn-Hospitality provides comprehensive hotel management services for the RTMN ecosystem. It connects via Layer 7 (Property) and includes PMS, channel manager, booking engine, and AI-powered guest services.

---

## Core Services

### Property Management

| Service | Port | Purpose |
|---------|------|---------|
| rez-pms | 6000 | Property Management System |
| rez-booking | 6010 | Booking engine |
| hotel-os-integration | 6020 | Hotel OS integration |
| integration-gateway | 6030 | Integration hub |

### Guest Experience

| Service | Port | Purpose |
|---------|------|---------|
| concierge-desk | 6040 | AI concierge |
| ai-front-desk | 6041 | AI front desk |
| guest-twin-service | 6042 | Guest digital twin |
| pre-arrival-service | 6043 | Pre-arrival experience |
| review-manager | 6044 | Review management |

### Operations

| Service | Port | Purpose |
|---------|------|---------|
| predictive-housekeeping | 6050 | Smart housekeeping |
| rez-housekeeping | 6051 | Housekeeping management |
| lost-found | 6052 | Lost & found |
| minibar-service | 6053 | Minibar management |
| parking-service | 6054 | Parking management |

### Revenue & Upsell

| Service | Port | Purpose |
|---------|------|---------|
| upsell-engine | 6060 | Upselling engine |
| loyalty-system | 6061 | Guest loyalty |
| feedback-survey | 6062 | Guest feedback |

### AI Services

| Service | Port | Purpose |
|---------|------|---------|
| hojai-staybot | 6063 | AI chatbot |
| hojai-genie | 6064 | Genie integration |
| hotel-business-twin | 6065 | Business analytics |
| voice-hotel-agent | 6066 | Voice AI |

### Payments & Access

| Service | Port | Purpose |
|---------|------|---------|
| rez-payment | 6070 | Payment processing |
| rez-wallet | 6071 | Guest wallet |
| smart-lock-service | 6072 | Smart lock integration |
| zero-checkout-automation | 6073 | Automatic checkout |

---

## Features

### Property Management System

| Feature | Description | Status |
|---------|-------------|--------|
| Room Management | Room inventory | ✅ |
| Booking Engine | Direct bookings | ✅ |
| Channel Manager | OTAs integration | ✅ |
| Rate Management | Dynamic pricing | ✅ |
| Multi-Property | Chain management | ✅ |
| Staff Management | Team scheduling | ✅ |

### Guest Experience

| Feature | Description | Status |
|---------|-------------|--------|
| Digital Check-in | Mobile check-in | ✅ |
| Digital Key | Phone as key | ✅ |
| AI Concierge | Chat concierge | ✅ |
| Voice Assistant | Voice commands | ✅ |
| Pre-Arrival | Customize stay | ✅ |
| In-Room Controls | Smart room | ✅ |

### Housekeeping

| Feature | Description | Status |
|---------|-------------|--------|
| Smart Scheduling | AI scheduling | ✅ |
| Task Management | Room tasks | ✅ |
| Inventory Tracking | Supplies | ✅ |
| Quality Checks | Inspection | ✅ |
| Predictive Cleaning | Demand forecasting | ✅ |

### Revenue Management

| Feature | Description | Status |
|---------|-------------|--------|
| Dynamic Pricing | Market-based | ✅ |
| Upselling | AI recommendations | ✅ |
| Package Deals | Bundled offers | ✅ |
| Loyalty Program | Points system | ✅ |
| Review Management | Sentiment tracking | ✅ |

### Digital Twin

| Feature | Description | Status |
|---------|-------------|--------|
| Guest Twin | Guest preferences | ✅ |
| Room Twin | Room status | ✅ |
| Property Twin | Property data | ✅ |
| Staff Twin | Staff allocation | ✅ |
| Business Twin | Revenue analytics | ✅ |

---

## API Endpoints

### Rooms

```
GET  /api/rooms                  - List rooms
POST /api/rooms                  - Create room
GET  /api/rooms/:id              - Get room
PUT  /api/rooms/:id              - Update room
PATCH /api/rooms/:id/status      - Update status
```

### Bookings

```
GET  /api/bookings               - List bookings
POST /api/bookings               - Create booking
GET  /api/bookings/:id           - Get booking
PUT  /api/bookings/:id           - Update booking
POST /api/bookings/:id/cancel    - Cancel booking
```

### Guest Services

```
POST /api/guest/checkin          - Check-in
POST /api/guest/checkout         - Check-out
POST /api/guest/request          - Service request
GET  /api/guest/:id/preferences  - Get preferences
```

### Housekeeping

```
GET  /api/housekeeping/tasks     - List tasks
POST /api/housekeeping/tasks     - Create task
PATCH /api/housekeeping/tasks/:id - Update task
GET  /api/housekeeping/schedule  - Get schedule
```

### Analytics

```
GET  /api/analytics/revenue      - Revenue analytics
GET  /api/analytics/occupancy    - Occupancy rates
GET  /api/analytics/guest        - Guest analytics
GET  /api/twin/:type/:id         - Get digital twin
```

---

## RTMN Ecosystem Integration

### Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| Hotel OS | 5025 | Industry OS |
| RisnaEstate | 4300 | Property listings |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Guest wallet |
| Genie Guest Twin | 4708 | Guest preferences |
| TwinOS Hub | 4705 | Digital twins |
| AdBazaar | 4056 | Marketing |

### Layer Integration

| RTMN Layer | Connection |
|------------|------------|
| Layer 7 (Property) | Property management |
| Layer 12 (Twins) | Guest, room twins |
| Layer 4 (Finance) | Payments, billing |

---

## Use Cases

### 1. Smart Check-in

Guest journey:
1. Digital check-in via mobile
2. Guest Twin loads preferences
3. Smart lock grants access
4. Room set to preference
5. Zero checkout on departure

### 2. AI Concierge

Guest request:
1. StayBot understands request
2. Connects to housekeeping
3. Real-time update to guest
4. Genie sends confirmation

### 3. Revenue Optimization

Dynamic pricing:
1. Business Twin analyzes demand
2. Upsell Engine suggests upgrades
3. Loyalty System rewards repeat guests
4. RABTUL processes payments

---

## Competitive Advantages

| Feature | Traditional PMS | StayOwn |
|---------|-----------------|---------|
| AI Concierge | Basic chatbot | ✅ Genie-powered |
| Digital Twin | ❌ | ✅ Complete tracking |
| Zero Checkout | Manual | ✅ Automated |
| RTMN Integration | ❌ | ✅ Full ecosystem |
| Voice AI | ❌ | ✅ Voice commands |

---

## Related Documentation

- [CLAUDE.md](CLAUDE.md) - Technical architecture
- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md) - Company registry
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features
- [INDUSTRY-OS-FULL-DETAILS.md](../../INDUSTRY-OS-FULL-DETAILS.md) - Hotel OS details

---

*Last Updated: June 17, 2026*
*StayOwn-Hospitality - Part of RTMN Ecosystem*
