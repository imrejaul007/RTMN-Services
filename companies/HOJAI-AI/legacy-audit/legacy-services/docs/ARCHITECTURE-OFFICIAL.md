# HOJAI AI - OFFICIAL ARCHITECTURE
**Version:** 1.0 | **Date:** May 30, 2026 | **Status:** OFFICIAL

---

# EXECUTIVE SUMMARY

**HOJAI AI** is the parent AI infrastructure company.

```
HOJAI AI
│
├── HOJAI CORE (12 platforms)
│   └── Infrastructure for ALL
│
├── REZ INTELLIGENCE (Privileged - REZ Ecosystem Only)
│   ├── 295+ services
│   └── REZ-only
│
├── HOJAI INTELLIGENCE (Commercial - External Clients)
│   ├── Industry brains
│   └── External businesses
│
└── HOJAI PRODUCTS (Commercial)
    └── Merchant AI OS, Admin, WhatsApp AI
```

**KEY POINT:**
- REZ Intelligence = For REZ ecosystem (privileged)
- HOJAI Intelligence = For ALL external clients

---

# PART 1: HOJAI CORE (Infrastructure)

12 platforms providing multi-tenant infrastructure.

## Port Registry

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
| 4580 | hyperlocal | Geo |
| 4590 | data | Canonical models |
| 4600 | identity | Resolution |
| 4610 | analytics | BI |
| 4700 | industry | Cross-tenant |

---

# PART 2: REZ INTELLIGENCE (Privileged - REZ Ecosystem)

## Purpose
AI/ML services for REZ ecosystem only.

## Who Uses REZ Intelligence?
- REZ Consumer App
- REZ Ride
- REZ Now
- REZ Merchant
- REZ Media
- All REZ-owned apps

## REZ Services (295+)

| Category | Services |
|----------|----------|
| Core | api-gateway, audit, circuit-breaker |
| AI/ML | predictive-engine, recommendation-engine, intent-predictor |
| Agents | support-agent, sales-agent, fraud-agent |
| Graphs | identity-graph, consumer-graph, merchant-graph |
| Integration | whatsapp, email, sms |

## REZ Intelligence Ports (4100-4200)

| Port | Service |
|------|---------|
| 4100 | REZ Gateway |
| 4110 | Identity Graph |
| 4120 | Commerce Graph |
| 4130 | Attribution |
| 4140 | Signals |
| 4150 | Intent |
| 4200 | Flow Runtime |
| 4201 | Memory Layer |
| 4202 | WhatsApp |

---

# PART 3: HOJAI INTELLIGENCE (Commercial - External Clients)

## Purpose
AI/ML services for ALL external businesses.

## Who Uses HOJAI Intelligence?
- Jewelry stores
- Hospitals
- Hotels
- Restaurants
- Salons
- Fitness centers
- Any external business

## HOJAI Intelligence Services

| Category | Services |
|----------|----------|
| Industry Brains | Jewelry AI, Hospital AI, Hotel AI, Restaurant AI |
| Predictions | Churn, LTV, Conversion |
| Recommendations | Product, Content |
| Agents | Support, Sales, Booking |

## Industry Brains

```
HOJAI INTELLIGENCE
├── Jewelry Intelligence
│   └── Price prediction, inventory, customer segments
├── Hospital Intelligence
│   └── Patient flow, appointment, billing
├── Hotel Intelligence
│   └── Revenue, occupancy, guest experience
├── Restaurant Intelligence
│   └── Orders, inventory, staff
└── ... (more industries)
```

---

# PART 4: HOJAI PRODUCTS (Commercial)

| Product | Purpose |
|---------|---------|
| Merchant AI OS | B2B SaaS for merchants |
| Admin Panel | Platform admin |
| WhatsApp AI | WhatsApp AI assistant |
| Monitoring | Observability |
| Consent UI | GDPR compliance |
| Governance UI | RBAC UI |

---

# PART 5: EXTERNAL SERVICES (RABTUL)

RABTUL stays **EXTERNAL** from HOJAI.

| Service | Purpose |
|---------|---------|
| RABTUL Auth | JWT/OTP/OAuth |
| RABTUL Payment | Razorpay/UPI |
| RABTUL Wallet | Coins/Balance |

---

# PART 6: KEY DIFFERENCES

| Aspect | REZ Intelligence | HOJAI Intelligence |
|--------|-----------------|-------------------|
| Target | REZ ecosystem | External businesses |
| Access | Privileged | Commercial |
| Port Range | 4100-4200 | 4530, 4550+ |
| Ownership | REZ | HOJAI |
| Multi-tenant | No | Yes |
| Privacy | Internal | External |

---

# SUMMARY

```
HOJAI AI (Parent)
│
├── HOJAI CORE (Platform)
│   └── 12 platforms
│
├── REZ INTELLIGENCE (Privileged - REZ Only)
│   └── 295+ services
│
├── HOJAI INTELLIGENCE (Commercial - All Others)
│   └── Industry brains
│
└── EXTERNAL
    └── RABTUL (Auth, Payment, Wallet)
```

---

*Official Architecture - May 30, 2026*
