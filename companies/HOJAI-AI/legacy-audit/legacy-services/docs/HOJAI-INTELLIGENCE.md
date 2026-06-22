# REZ Intelligence - Ecosystem Graph Layer
**Version:** 1.0 | **Date:** May 30, 2026

---

# EXECUTIVE SUMMARY

REZ Intelligence runs ON TOP of Hojai AI as a **Privileged Tenant**.

```
Hojai AI Core
     │
     ├── Platform Services
     ├── Multi-tenant
     └── Privacy-preserving learning
         ↑
         │
REZ Intelligence
     │
     ├── Identity Graph
     ├── Commerce Graph
     ├── Mobility Graph
     ├── Trust Graph
     └── Behavioral Graph
```

---

# PURPOSE

REZ Intelligence provides **cross-platform intelligence** that Hojai AI alone cannot provide because it requires access to multiple REZ platforms.

---

# GRAPHS (7)

## 1. Identity Graph

**Purpose:** Link users across REZ platforms

```
REZ User "john@example.com"
     │
     ├── REZ Consumer App: user_john_123
     ├── REZ Ride: ride_john_456
     ├── REZ Now: now_john_789
     └── REZ Merchant: merchant_john_101
```

**Technology:** Graph database (Neo4j)
**Access:** Privileged tenant
**Privacy:** Hashed identifiers

---

## 2. Commerce Graph

**Purpose:** Unified commerce intelligence

**Nodes:**
- Customer
- Merchant
- Product
- Order
- Payment

**Edges:**
- ordered
- browsed
- wishlisted
- reviewed
- referred

---

## 3. Mobility Graph

**Purpose:** Ride, delivery, logistics intelligence

**Nodes:**
- Driver
- Rider
- Vehicle
- Location
- Trip

**Edges:**
- rides_with
- delivers_to
- located_at

---

## 4. Trust Graph

**Purpose:** Trust scores, verification

**Nodes:**
- Identity
- Verification
- Badge
- Review

**Edges:**
- verified_by
- trusts
- blocked_by

---

## 5. Behavioral Graph

**Purpose:** User behavior patterns

**Nodes:**
- Session
- Event
- Feature

**Edges:**
- viewed
- clicked
- purchased

---

## 6. Loyalty Graph

**Purpose:** Cross-platform rewards

**Nodes:**
- Points
- Tier
- Reward

**Edges:**
- earned
- redeemed
- upgraded

---

## 7. Intent Graph

**Purpose:** Predicted user needs

**Nodes:**
- Intent
- Context
- Prediction

**Edges:**
- predicts
- context_for
- based_on

---

# DATA SOURCES

## Platforms Integrated

| Platform | Graph | Data |
|----------|-------|------|
| REZ Consumer | All graphs | Users, orders, sessions |
| REZ Ride | Mobility, Trust | Trips, drivers |
| REZ Now | Commerce, Intent | Products, orders |
| REZ Merchant | Commerce, Trust | Merchants, orders |
| REZ Media | Behavioral | Impressions, clicks |
| REZ Care | Support, Intent | Tickets, CSAT |

---

# PRIVACY RULES

| Rule | Value |
|------|-------|
| tenant_id hashed | Yes |
| Cross-tenant isolation | Yes |
| Min aggregation | 3 tenants |
| Raw data sharing | Never |
| PII exposure | None |

---

# PORT REGISTRY

| Port | Service | Status |
|------|---------|--------|
| 4100 | REZ Gateway | Existing |
| 4110 | Identity Graph | Existing |
| 4120 | Commerce Graph | Existing |
| 4130 | Trust Graph | Existing |
| 4140 | Behavioral Graph | Existing |
| 4150 | Loyalty Graph | Existing |
| 4160 | Intent Graph | Existing |
| 4170 | Mobility Graph | Existing |

---

*Document Version: 1.0*
*Last Updated: May 30, 2026*
