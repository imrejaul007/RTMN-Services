# ReZ Ride

**Tagline:** "Rides that pay you back"

India's first commission-free ride-hailing platform powered by in-vehicle advertising. Drivers keep 100% of fares, users earn 10% cashback, and advertisers reach intent-qualified passengers in real-time.

---

## What is ReZ Ride?

ReZ Ride is a cab/auto/bus booking platform that replaces traditional commission models with an ad-based revenue stream:

- **For Drivers:** Zero commission on rides. Earn extra income from ad impressions.
- **For Users:** 10% cashback on every ride, funded by advertising.
- **For Advertisers:** Access to passengers with known purchase intent, in a captive screen environment.
- **For ReZ:** Ecosystem expansion + ad revenue + user lock-in.

---

## Core Differentiator

Traditional ride-hailing takes 20-25% commission from drivers. ReZ Ride:

1. Driver pays **zero commission**
2. Vehicle screen displays **intent-targeted ads**
3. Ad revenue funds **10% user cashback**
4. ReZ earns from **advertising**, not driver剥削

---

## How It Works

```
User Books Ride
       │
       ▼
┌──────────────────┐
│ Pull User Intent │
│ (Rez Mind)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select Targeted  │
│ Ad (AdsBazaar)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Push to Vehicle  │
│ Screen           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Track Impression │
│ & Credit         │
│ Cashback          │
└──────────────────┘
```

---

## Vehicle Screen Concept

Every registered vehicle has a mounted screen that:

1. **Shows ads** when a passenger is in the vehicle
2. **Uses Rez Mind** to target ads based on passenger's booking data and history
3. **Tracks impressions** for advertiser reporting
4. **Credits cashback** to user's ReZ wallet automatically

---

## Documentation Structure

| Document | Description |
|----------|-------------|
| [PRODUCT-CONCEPT.md](docs/PRODUCT-CONCEPT.md) | Business model, revenue flow, value proposition |
| [BUSINESS-LOGIC.md](docs/BUSINESS-LOGIC.md) | Fare calculation, cashback, driver earnings |
| [USER-FLOWS.md](docs/USER-FLOWS.md) | User, driver, and admin journeys |
| [TECHNICAL-ARCHITECTURE.md](docs/TECHNICAL-ARCHITECTURE.md) | System design and services |
| [DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) | Data models and relationships |
| [INTEGRATIONS.md](docs/INTEGRATIONS.md) | ReZ services and external APIs |
| [SCREEN-SPEC.md](docs/SCREEN-SPEC.md) | Vehicle hardware requirements |
| [MVP-SCOPE.md](docs/MVP-SCOPE.md) | Phased development plan |

---

## Status

**Currently:** In planning/feature specification phase

**Not yet building.** Documentation is being prepared for future development.

---

## Key Metrics (Target)

| Metric | Target |
|--------|--------|
| Driver commission | 0% |
| User cashback | 10% of fare |
| Ad revenue split (driver) | 60% |
| Ad revenue split (platform) | 40% |
| Screen uptime requirement | 70%+ |
| Driver rating minimum | 4.0 |

---

## Questions to Answer Before Building

1. **Cities:** Which city/cities to launch in?
2. **Fleet:** Own vehicles, driver-partners, or both?
3. **Screen:** ReZ provides hardware or drivers buy?
4. **Ads:** Who manages advertiser relationships initially?
5. **Pricing:** Government-fixed or dynamic pricing?
6. **Licenses:** OLA/Uber-like aggregator license needed?
