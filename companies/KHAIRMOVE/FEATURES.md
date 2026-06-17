# KHAIRMOVE - Mobility & Logistics Platform

**Last Updated:** June 17, 2026  
**Location:** `companies/KHAIRMOVE/`  
**Status:** ✅ **PRODUCTION READY**  
**Tagline:** "Complete Mobility Ecosystem - Ride, Delivery, Fleet"

---

## Overview

KHAIRMOVE provides comprehensive mobility and logistics services for the RTMN ecosystem. It connects via Layer 9 (Mobility) and includes ride-hailing, delivery, fleet management, and Airzy (air mobility).

---

## Core Services

### Ride Services

| Service | Port | Purpose |
|---------|------|---------|
| khaimove-ride-service | 4500 | Ride-hailing platform |
| khaimove-user-app | - | User mobile app |
| khaimove-driver-app | - | Driver mobile app |
| rider-circle | - | Rider community |

### Delivery Services

| Service | Port | Purpose |
|---------|------|---------|
| khaimove-delivery-service | 4510 | Delivery platform |
| rez-food-delivery-service | 4520 | Food delivery |
| rez-instant-delivery-service | 4530 | Instant delivery |
| rez-delivery-tracking | - | Delivery tracking |
| rez-delivery-ui | - | Delivery UI |

### Fleet & Logistics

| Service | Port | Purpose |
|---------|------|---------|
| khaimove-fleet-service | 4540 | Fleet management |
| khaimove-logistics-aggregator | 4550 | Logistics aggregation |
| khaimove-admin-dashboard | - | Admin dashboard |

### Rental Services

| Service | Port | Purpose |
|---------|------|---------|
| khaimove-rental-service | 4560 | Vehicle rental |

### Air Mobility

| Service | Port | Purpose |
|---------|------|---------|
| airzy | 4600 | Air mobility platform |

---

## Features

### Ride-Hailing

| Feature | Description | Status |
|---------|-------------|--------|
| Real-time Booking | Book rides instantly | ✅ |
| Driver Matching | Smart driver allocation | ✅ |
| Live Tracking | Real-time location tracking | ✅ |
| Fare Estimation | Upfront pricing | ✅ |
| Multiple Vehicle Types | Economy, premium, XL | ✅ |
| Scheduled Rides | Book in advance | ✅ |
| Ride History | Trip history | ✅ |

### Food Delivery

| Feature | Description | Status |
|---------|-------------|--------|
| Restaurant Integration | Connect to Restaurant OS | ✅ |
| Real-time Tracking | Live delivery tracking | ✅ |
| Delivery Zones | Define delivery areas | ✅ |
| Order Management | Order lifecycle | ✅ |
| Driver Assignment | Smart routing | ✅ |
| Contactless Delivery | Safe delivery options | ✅ |

### Instant Delivery

| Feature | Description | Status |
|---------|-------------|--------|
| Same-day Delivery | Quick deliveries | ✅ |
| Package Tracking | Track packages | ✅ |
| Pickup & Drop | Door-to-door | ✅ |
| Bulk Orders | Multiple deliveries | ✅ |

### Fleet Management

| Feature | Description | Status |
|---------|-------------|--------|
| Vehicle Tracking | GPS tracking | ✅ |
| Driver Management | Driver profiles | ✅ |
| Performance Analytics | Driver metrics | ✅ |
| Maintenance Tracking | Vehicle maintenance | ✅ |
| Fuel Management | Fuel tracking | ✅ |
| Route Optimization | Efficient routing | ✅ |

### Airzy - Air Mobility

| Feature | Description | Status |
|---------|-------------|--------|
| Flight Booking | Book air transport | ✅ |
| Vertiport Network | VTOL landing spots | ✅ |
| eVTOL Integration | Electric aircraft | ✅ |
| Urban Air Mobility | City air travel | ✅ |

---

## API Endpoints

### Ride

```
POST /api/rides/request        - Request a ride
GET  /api/rides/:id            - Get ride details
POST /api/rides/:id/cancel     - Cancel ride
POST /api/rides/:id/rate       - Rate driver
GET  /api/rides/history        - Get ride history
```

### Delivery

```
POST /api/delivery/order       - Create delivery order
GET  /api/delivery/:id         - Get delivery status
POST /api/delivery/:id/cancel  - Cancel delivery
GET  /api/delivery/quote       - Get delivery quote
POST /api/delivery/track       - Track package
```

### Fleet

```
GET  /api/fleet/vehicles       - List fleet vehicles
GET  /api/fleet/drivers        - List drivers
GET  /api/fleet/analytics      - Get fleet analytics
POST /api/fleet/maintenance    - Schedule maintenance
```

### Airzy

```
GET  /api/airzy/routes         - Get available routes
POST /api/airzy/book           - Book flight
GET  /api/airzy/booking/:id    - Get booking details
```

---

## RTMN Ecosystem Integration

### Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Wallet integration |
| Restaurant OS | 5010 | Food delivery |
| Healthcare OS | 5020 | Medical transport |
| Genie Personal Twin | 4708 | User preferences |
| TwinOS Hub | 4705 | Digital twins |

### Layer Integration

| RTMN Layer | Connection |
|------------|------------|
| Layer 4 (Finance) | Payments, wallet |
| Layer 9 (Mobility) | Core mobility |
| Layer 12 (Twins) | Vehicle, driver twins |

---

## Use Cases

### 1. Restaurant Food Delivery

User orders food:
1. Connects to Restaurant OS menu
2. KHAIRMOVE delivery service picks up
3. Real-time tracking via Genie
4. Payment via RABTUL

### 2. Medical Transport

Patient transport:
1. Healthcare OS schedules pickup
2. KHAIRMOVE dispatches vehicle
3. Real-time ETA to hospital
4. Insurance verification via RidZa

### 3. Fleet Expansion

Business fleet management:
1. RisnaEstate finds depot location
2. KHAIRMOVE fleet service manages vehicles
3. CorpPerks manages drivers
4. AdBazaar promotes services

---

## Competitive Advantages

| Feature | Standalone Apps | KHAIRMOVE |
|---------|-----------------|-----------|
| Multi-Service | ❌ Separate apps | ✅ Single platform |
| RTMN Integration | ❌ | ✅ Full ecosystem |
| Restaurant OS | ❌ | ✅ Native |
| Healthcare OS | ❌ | ✅ Native |
| Air Mobility | ❌ | ✅ Airzy included |

---

## Related Documentation

- [CLAUDE.md](CLAUDE.md) - Technical architecture
- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md) - Company registry
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features
- [INDUSTRY-OS-FULL-DETAILS.md](../../INDUSTRY-OS-FULL-DETAILS.md) - Industry integration

---

*Last Updated: June 17, 2026*
*KHAIRMOVE - Part of RTMN Ecosystem*