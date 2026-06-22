# HOJAI AI - OFFICIAL ARCHITECTURE
**Version:** 1.0 | **Date:** May 30, 2026 | **Status:** OFFICIAL

---

# EXECUTIVE SUMMARY

## What is HOJAI AI?

**HOJAI AI** is the parent AI infrastructure company.

HOJAI AI owns:
- **Hojai Core** - 12 platforms (infrastructure)
- **REZ Intelligence** - Privileged tenant (295+ services)
- **Industry Intelligence** - Commercial tenants
- **Products** - Commercial products

## Key Relationship

```
HOJAI AI
│
├── Hojai Core (Platform)
│   ├── Infrastructure
│   ├── Multi-tenant
│   └── Privacy-preserving learning
│
├── REZ Intelligence (Privileged Tenant)
│   ├── Uses Hojai Core
│   ├── Owns graphs, AI, ML
│   └── 295+ services
│
└── Industry Intelligence (Tenants)
    ├── Uses Hojai Core
    └── Owns industry brains
```

**REZ Intelligence IS PART OF HOJAI AI, not separate.**

---

# ARCHITECTURE

## HOJAI Core (12 Platforms)

| Port | Platform | Purpose |
|------|----------|---------|
| 4500 | api-gateway | Routing |
| 4501 | governance | RBAC/Audit |
| 4510 | event | Event bus |
| 4520 | memory | Memory |
| 4530 | intelligence | ML predictions |
| 4550 | agents | AI employees |
| 4560 | workflows | Automation |
| 4570 | communications | Channels |
| 4580 | hyperlocal | Geo intelligence |
| 4590 | data | Canonical models |
| 4600 | identity | Identity resolution |
| 4610 | analytics | BI dashboards |
| 4700 | industry | Cross-tenant learning |

## REZ Intelligence (Privileged Tenant)

REZ Intelligence is a **privileged tenant** of Hojai Core.

| Service | Purpose | Uses Hojai |
|---------|---------|---------|
| predictive-engine | Churn/LTV | Intelligence |
| recommendation-engine | Recs | Intelligence |
| intent-predictor | Intent | Intelligence |
| support-agent | Support | Agents |
| identity-graph | Identity | Identity |
| consumer-graph | Relationships | Data |

## RABTUL Services (External)

RABTUL stays **EXTERNAL** from HOJAI AI.

| Service | Purpose |
|---------|---------|
| RABTUL Auth | JWT/OTP/OAuth |
| RABTUL Payment | Razorpay/UPI |
| RABTUL Wallet | Coins/Balance |

---

# KEY PRINCIPLES

## 1. HOJAI Core is the Platform

All services connect to Hojai Core, not the other way around.

## 2. REZ Intelligence is a Tenant

REZ uses Hojai Core infrastructure, doesn't own it.

## 3. RABTUL is External

RABTUL provides auth, payment, wallet - HOJAI doesn't duplicate.

## 4. 12 Platforms, Not 295 Services

Add features to platforms. Don't create services.

---

# FOLDER STRUCTURE

```
hojai-ai/
├── hojai-core/           # 12 platforms
├── packages/             # SDK, data models
├── products/            # Commercial products
├── docs/               # Documentation
└── deploy/             # Deployment

REZ-Intelligence/         # Privileged tenant
├── REZ-predictive-engine/
├── REZ-support-agent/
└── ... (295 services)

RABTUL-Services/          # External
├── RABTUL-Auth/
├── RABTUL-Payment/
└── RABTUL-Wallet/
```

---

*Official Architecture - May 30, 2026*
