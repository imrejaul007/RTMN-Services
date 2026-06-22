# Restaurant Vertical - Source of Truth

**Date:** May 10, 2026
**Version:** 2.0

---

## OVERVIEW

Restaurant ecosystem with 5 core products forming a complete vertical.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RESTAURANT ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   ReZ App  │    │  ReZ       │    │  ReZ Web   │          │
│  │ (Consumer) │    │  Merchant  │    │    Menu     │          │
│  │ Discovery   │    │    OS      │    │   QR Menu   │          │
│  │ Loyalty    │    │ POS/KDS/CRM│    │  Ordering   │          │
│  │ Ordering   │    │ Analytics   │    │  Payments   │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                    │                    │                │
│         └────────────────────┼────────────────────┘                │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │           CENTRAL ORDER ENGINE                              │  │
│  │  All orders → Normalized → Distributed to services         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│         ┌────────────────────┼────────────────────┐                │
│         │                    │                    │                │
│         ▼                    ▼                    ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   NextaBizz │    │  RestoPapa │    │   ReZ Mind  │          │
│  │   Supply    │    │   Growth   │    │     AI      │          │
│  │  Marketplace│    │ Operations │    │   Kitchen   │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PRODUCTS (5 Core)

| Product | Type | Purpose | Status |
|---------|------|---------|--------|
| **ReZ App** | Consumer | Discovery, loyalty, ordering | ✅ Active |
| **ReZ Merchant** | Merchant OS | POS, KDS, CRM, Analytics | ✅ Active |
| **ReZ Web Menu** | Interface | QR menu, ordering, payments | ✅ Active |
| **RestoPapa** | Growth | Cloud kitchens, franchise, launch | 🔄 Development |
| **NextaBizz** | Supply | B2B marketplace, procurement | 🔄 Development |

---

## SERVICES INVENTORY

### Consumer Layer (ReZ App)

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| rez-app-consumer | - | Consumer mobile app | ✅ |
| rez-order-service | 4012 | Order management | ✅ |
| rez-payment-service | 4008 | Payment processing | ✅ |
| rez-catalog-service | 4003 | Menu catalog | ✅ |
| rez-search-service | 4001 | Restaurant search | ✅ |

### Merchant Layer (ReZ Merchant)

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| rez-app-merchant | - | Merchant mobile app | ✅ |
| rez-merchant-service | 4005 | Merchant operations | ✅ |
| rez-kitchen-display | - | Kitchen display system | ✅ |
| rez-kitchen-ai | 4013 | Kitchen AI (Connected to ReZ Mind) | ✅ |
| rez-menu-service | 4004 | Menu management | ✅ |

### Interface Layer (ReZ Web Menu)

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| rez-web-menu | - | PWA QR menu | ✅ |
| rez-qr-generator | - | QR code generation | ✅ |

### Growth Layer (RestoPapa)

| Service | Path | Purpose | Status |
|---------|------|---------|--------|
| RestoPapa | RestoPapa/ | Growth platform | 🔄 |

### Supply Layer (NextaBizz)

| Service | Path | Purpose | Status |
|---------|------|---------|--------|
| NextaBizz | nextabizz/ | B2B marketplace | 🔄 |

---

## SECURITY STATUS

### Critical Fixes Applied ✅

| Service | Issue | Fix | Status |
|---------|-------|-----|--------|
| rez-menu-service | No auth | JWT middleware | ✅ Fixed |
| rez-menu-service | CORS open | Whitelist | ✅ Fixed |
| rez-menu-service | In-memory | MongoDB | ✅ Fixed |
| rez-kitchen-display | CORS open | Whitelist | ✅ Fixed |
| rez-kitchen-display | No auth | JWT validation | ✅ Fixed |
| rez-kitchen-display | No persistence | MongoDB | ✅ Fixed |
| rez-kitchen-ai | No HTTP | HTTP Server | ✅ Fixed |
| rez-kitchen-ai | No ReZ Mind | AI Bus | ✅ Connected |
| rez-app-merchant | Hardcoded storeId | Secure storage | ✅ Fixed |
| RestoPapa | .env in git | .gitignore | ✅ Fixed |
| NextaBizz | Credit bypass | Validation | ✅ Fixed |

### Pending Security Tasks

- [ ] Penetration test
- [ ] Load testing
- [ ] Compliance audit (PCI-DSS)

---

## AI INTEGRATION

### Connected to ReZ Mind

| Service | Events Emitted | Events Received |
|---------|----------------|-----------------|
| rez-kitchen-ai | ORDER_RECEIVED, ORDER_COMPLETED, ORDER_DELAYED | INSIGHT, COMMAND |

### Pending AI Integration

- [ ] rez-merchant-intelligence → ReZ Mind
- [ ] rez-analytics → ReZ Mind
- [ ] Customer behavior AI

---

## FLOW ARCHITECTURE

### Customer Flow
```
Discover (ReZ App) → Order (QR/Web) → Pay → Earn Cashback → Repeat
```

### Merchant Flow
```
Customer Order → POS → KDS → Kitchen → Serve → Bill → Analytics
```

### Data Flow
```
QR Scan → Web Menu → Order Engine → POS → KDS → ReZ Mind → Insights
```

---

## DEPENDENCIES

```
ReZ App
├── rez-auth-service
├── rez-order-service
├── rez-payment-service
├── rez-catalog-service
├── rez-search-service
└── rez-loyalty-service

ReZ Merchant
├── rez-merchant-service
├── rez-kitchen-display
├── rez-kitchen-ai → ReZ Mind
└── rez-menu-service

ReZ Web Menu
├── rez-order-service
├── rez-payment-service
└── rez-catalog-service
```

---

*Last Updated: May 10, 2026*
