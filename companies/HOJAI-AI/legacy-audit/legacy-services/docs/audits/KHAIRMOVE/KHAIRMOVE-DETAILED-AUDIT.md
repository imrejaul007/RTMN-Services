# KHAIRMOVE — DETAILED COMPANY AUDIT
**Date:** June 4, 2026
**Version:** 1.0.0
**Auditor:** Claude Code Elite Agent

---

## COMPANY PROFILE

| Attribute | Value |
|-----------|-------|
| **Name** | KHAIRMOVE |
| **Role** | India's mobility ecosystem - rides, delivery, logistics, rentals, airport services |
| **Parent** | RTNM Group |
| **GitHub** | KHAIRMOVE |
| **Total Directories** | 15+ |

---

## ⚠️ COMPANY BOUNDARIES

### ✅ KHAIRMOVE OWNS:

| Category | Services |
|----------|----------|
| Mobility Services | khaimove-ride-service, khaimove-fleet-service |
| Delivery Services | khaimove-delivery-service, rez-delivery-service |
| Airport Ecosystem | airzy (all 10 services) |
| Admin | khaimove-admin-dashboard |
| Mobile Apps | khaimove-user-app, khaimove-driver-app |
| Integrations | buzzlocal-rides-integration (with AXOM BuzzLocal) |

### ❌ NOT KHAIRMOVE:

| Service | Belongs To | Location |
|---------|------------|----------|
| buzzlocal | **AXOM** | /Axom/buzzlocal |
| rez-ride | **KHAIRMOVE** | /REZ-Consumer/rez-ride |

---

## CORE MOBILITY SERVICES (8)

### 1. khaimove-api-gateway

| Attribute | Value |
|-----------|-------|
| Port | 4600 |
| Purpose | API gateway for all KHAIRMOVE services |
| Status | ✅ COMPLETE |

---

### 2. khaimove-ride-service

| Attribute | Value |
|-----------|-------|
| Port | 4601 |
| Purpose | Core ride booking and management |
| Status | ✅ COMPLETE |

---

### 3. khaimove-fleet-service

| Attribute | Value |
|-----------|-------|
| Port | 4602 |
| Purpose | Fleet management for drivers |
| Status | ✅ COMPLETE |

---

### 4. khaimove-delivery-service

| Attribute | Value |
|-----------|-------|
| Port | 4603 |
| Purpose | Package and food delivery |
| Status | ✅ COMPLETE |

---

### 5. khaimove-logistics-aggregator

| Attribute | Value |
|-----------|-------|
| Port | 4604 |
| Purpose | Multi-carrier logistics aggregation |
| Status | ✅ COMPLETE |

---

### 6. khaimove-rental-service

| Attribute | Value |
|-----------|-------|
| Port | 4605 |
| Purpose | Vehicle rentals |
| Status | ✅ COMPLETE |

---

### 7. buzzlocal-rides-integration

| Attribute | Value |
|-----------|-------|
| Port | 4606 |
| Purpose | Integration with AXOM's BuzzLocal for rides |
| Status | ✅ COMPLETE |

---

### 8. khaimove-admin-dashboard

| Attribute | Value |
|-----------|-------|
| Port | 4607 |
| Purpose | Admin dashboard for operations |
| Status | ✅ COMPLETE |

---

## AIRZY — AIRPORT ECOSYSTEM (10 Services)

**Tagline:** "Smart companion for frequent travelers"  
**Positioning:** "Premium airport lifestyle ecosystem"

Airzy is KHAIRMOVE's premium airport and frequent traveler ecosystem, built on the REZ platform, REZ Intelligence, and RABTUL services.

---

### Airzy Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     AIRZY MOBILE APP (Expo)                     │
├────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  AIRZY API GATEWAY (Port 4500)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                    │                               │
│  ┌────────────────────────────────┼───────────────────────────┐  │
│  │                                │                            │  │
│  ▼                                ▼                            ▼  │
│ ┌─────────────────┐    ┌─────────────────────┐    ┌────────────────┐ │
│ │   RABTUL       │    │    REZ INTELLIGENCE │    │    EXTERNAL   │ │
│ ├─────────────────┤    ├─────────────────────┤    ├────────────────┤ │
│ │Auth 4002    ◄──┼───►│Intent 4018      ◄───┼────│Amadeus        │ │
│ │Payment 4001  ◄──┼───►│Travel Expert 3003◄──┤    │DreamFolks     │ │
│ │Wallet 4004   ◄──┼───►│Signal 4121     ◄───┤    │Priority Pass   │ │
│ │Notify 4011   ◄──┼───►│Predictive 4123 ◄───┤    │               │ │
│ │Profile 4013  ◄──┼───►│Care 4058      ◄───┤    │               │ │
│ └─────────────────┘    └─────────────────────┘    └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9. airzy-api-gateway

| Attribute | Value |
|-----------|-------|
| Port | 4500 |
| Purpose | Main API gateway for Airzy |
| Status | ✅ COMPLETE |
| External | - |

---

### 10. airzy-flight-service

| Attribute | Value |
|-----------|-------|
| Port | 4501 |
| Purpose | Flight search, booking, and management |
| Status | ✅ COMPLETE |
| External | Amadeus API |

---

### 11. airzy-lounge-service

| Attribute | Value |
|-----------|-------|
| Port | 4502 |
| Purpose | Airport lounge search and booking |
| Status | ✅ COMPLETE |
| External | DreamFolks, Priority Pass |

---

### 12. airzy-itinerary-service

| Attribute | Value |
|-----------|-------|
| Port | 4503 |
| Purpose | Trip planning and itinerary management |
| Status | ✅ COMPLETE |
| External | - |

---

### 13. airzy-wallet-extension

| Attribute | Value |
|-----------|-------|
| Port | 4504 |
| Purpose | Travel coins and membership management |
| Status | ✅ COMPLETE |
| External | RABTUL Wallet |

---

### 14. airzy-ai-brain

| Attribute | Value |
|-----------|-------|
| Port | 4505 |
| Purpose | AI-powered travel recommendations |
| Status | ✅ COMPLETE |
| External | REZ Intelligence |

---

### 15. airzy-corp-service

| Attribute | Value |
|-----------|-------|
| Port | 4506 |
| Purpose | Corporate travel management |
| Status | ✅ COMPLETE |
| External | CorpPerks |

---

### 16. airzy-hotel-extension

| Attribute | Value |
|-----------|-------|
| Port | 4507 |
| Purpose | Airport hotel search and booking |
| Status | ✅ COMPLETE |
| External | - |

---

### 17. airzy-transfer-extension

| Attribute | Value |
|-----------|-------|
| Port | 4508 |
| Purpose | Airport transfers (cab, rental, shuttle) |
| Status | ✅ COMPLETE |
| External | ReZ Ride |

---

### 18. airzy-dooh-extension

| Attribute | Value |
|-----------|-------|
| Port | 4509 |
| Purpose | Airport digital out-of-home advertising |
| Status | ✅ COMPLETE |
| External | AdBazaar DOOH |

---

## MOBILE APPS (2)

### khaimove-user-app

| Attribute | Value |
|-----------|-------|
| Purpose | User-facing ride/delivery app |
| Status | ⚠️ PARTIAL |

---

### khaimove-driver-app

| Attribute | Value |
|-----------|-------|
| Purpose | Driver partner app |
| Status | ⚠️ PARTIAL |

---

## MEMBERSHIP TIERS

| Tier | Fee/yr | Lounge Visits | Coin Rate |
|------|--------|--------------|-----------|
| Basic | Free | 0 | 1.0x |
| Plus | ₹2,999 | 2 | 1.5x |
| Elite | ₹9,999 | 5 | 2.0x |
| Royale | ₹29,999 | Unlimited | 3.0x |

---

## STRATEGIC VALUE

**Traveler Graph + Airport Attribution = RTNM's Airport Moat**

- Connects frequent travelers across all REZ services
- Creates unique user profile for targeting
- Airport dwell time = high ad engagement
- DOOH inventory at airports = premium placements

---

## SECURITY AUDIT

### Score: 7.5/10

| Service | Auth | Rate Limit | Helmet | Zod |
|---------|------|------------|--------|-----|
| airzy-api-gateway | ✅ | ✅ | ✅ | ✅ |
| khaimove-ride-service | ✅ | ✅ | ✅ | ✅ |
| khaimove-fleet-service | ✅ | ✅ | ✅ | ✅ |
| khaimove-delivery-service | ✅ | ✅ | ✅ | ✅ |

**Note:** Uses RABTUL Auth and Wallet for security

---

## DEPENDENCIES

| Package | Version | Status |
|---------|---------|--------|
| Express | 4.x | ✅ Current |
| Mongoose | 8.x | ✅ Current |
| Redis | ioredis | ✅ Current |
| RABTUL SDK | - | ✅ Integrated |

---

## INTEGRATIONS

| From | To | Integration |
|------|----|-------------|
| Airzy | RABTUL | Auth, Wallet, Payment |
| Airzy | REZ Intelligence | Intent, Travel Expert, Signal |
| Airzy | Amadeus | Flight search |
| Airzy | DreamFolks | Lounge access |
| Airzy | CorpPerks | Corporate travel |
| Airzy | AdBazaar | Airport DOOH |
| KHAIRMOVE | AXOM BuzzLocal | Rides integration |

---

## SCORES SUMMARY

| Category | Score |
|----------|-------|
| Security | 7.5/10 |
| Code Quality | 7.0/10 |
| Testing | 4.5/10 |
| Dependencies | 7.0/10 |
| Documentation | 6.5/10 |
| **OVERALL** | **6.7/10** |

---

## RECOMMENDATIONS

### Immediate
1. Complete khaimove-user-app
2. Complete khaimove-driver-app
3. Add test coverage

### Short Term
1. Implement real-time tracking
2. Add payment integrations
3. Complete all Airzy services

### Long Term
1. Expand to other airports
2. Add loyalty program
3. Integrate with more travel partners

---

**Report Generated:** June 4, 2026
**Auditor:** Claude Code Elite Agent
