# HOJAI AI + REZ INTELLIGENCE - INTEGRATION AUDIT
**Version:** 1.0 | **Date:** May 30, 2026

---

# EXECUTIVE SUMMARY

REZ Intelligence **IS PART OF** Hojai AI.

```
HOJAI AI
│
├── HOJAI CORE (Platform)
│   ├── Multi-tenant infrastructure
│   ├── 12 Platforms
│   └── Data models
│
├── REZ INTELLIGENCE (Tenant - Privileged)
│   ├── AI/ML Services
│   ├── Agent Services
│   └── Intelligence Services
│
└── INDUSTRY INTELLIGENCE (Tenant - Commercial)
    └── Industry brains
```

---

# PART 1: HOJAI CORE (Infrastructure)

## 12 Platforms

| # | Platform | Port | Purpose |
|---|----------|------|---------|
| 1 | api-gateway | 4500 | Routing |
| 2 | governance | 4501 | RBAC/Audit |
| 3 | event | 4510 | Event bus |
| 4 | memory | 4520 | Customer memory |
| 5 | intelligence | 4530 | ML predictions |
| 6 | agents | 4550 | AI employees |
| 7 | workflows | 4560 | Automation |
| 8 | communications | 4570 | Channels |
| 9 | hyperlocal | 4580 | Geo intelligence |
| 10 | data | 4590 | Canonical data |
| 11 | identity | 4600 | Identity resolution |
| 12 | industry | 4700 | Privacy-preserving learning |

---

# PART 2: REZ INTELLIGENCE (Privileged Tenant)

## Structure

REZ Intelligence runs **ON TOP OF** Hojai Core, not inside it.

```
HOJAI CORE
    │
    ├── Provides: Auth, Storage, Events, ML, Agents, Workflows
    ├── Provides: Multi-tenant, Rate limiting, Audit
    │
    ▲
    │
REZ INTELLIGENCE
    │
    ├── Connects to: Hojai Core services
    ├── Uses: Hojai Data, Memory, Intelligence
    └── Owns: Cross-platform graphs
```

## REZ Services (294)

### Core Services (50+)

| Service | Purpose | Uses Hojai |
|---------|---------|------------|
| api-gateway | Main API | - |
| action-engine | Action execution | Workflows |
| audit-logging | Compliance | Governance |
| circuit-breaker | Fault tolerance | - |
| data-platform | Data layer | Data Platform |
| cdp-service | Customer data | Data Platform |
| data-warehouse | Analytics | Analytics |
| synthetic-data | Data generation | - |

### AI/ML Services (45+)

| Service | Purpose | Uses Hojai |
|---------|---------|------------|
| predictive-engine | Churn/LTV | Intelligence |
| recommendation-engine | Recs | Intelligence |
| intent-predictor | Intent | Intelligence |
| sentiment-analysis | Sentiment | Intelligence |
| emotional-intelligence | Emotion | Memory |
| bootstrap-intelligence | Cold start | Data |
| causal-ai | Causal inference | - |
| federated-ml | Fed learning | Industry |
| ml-observability | Monitoring | - |

### Agent Services (20+)

| Service | Purpose | Uses Hojai |
|---------|---------|------------|
| autonomous-agents | Agent system | Agents |
| support-agent | Support | Agents |
| sales-agent | Sales | Agents |
| fraud-agent | Fraud detection | Intelligence |
| agent-protocol | Agent comms | - |
| agent-registry | Registry | Data |

### Graph Services (15+)

| Service | Purpose | Uses Hojai |
|---------|---------|------------|
| identity-graph | Identity resolution | Identity |
| consumer-graph | Consumer relationships | Data |
| merchant-graph | Merchant relationships | Data |
| knowledge-graph | Knowledge | Memory |
| commerce-graph | Commerce | Data |
| unified-identity | Single identity | Identity |

### Integration Services (30+)

| Service | Purpose | Uses Hojai |
|---------|---------|------------|
| whatsapp | WhatsApp | Communications |
| email-bridge | Email | Communications |
| sms-bridge | SMS | Communications |
| service-connectors | Hooks | Event |
| social-signals | Social | Data |

---

# PART 3: INTEGRATION ARCHITECTURE

## How REZ Connects to Hojai

```
REZ Intelligence
    │
    ├──► Hojai Data Platform
    │       (tenant scoping, CRUD)
    │
    ├──► Hojai Intelligence
    │       (ML predictions)
    │
    ├──► Hojai Agents
    │       (AI employees)
    │
    ├──► Hojai Event
    │       (event publishing)
    │
    ├──► Hojai Identity
    │       (resolution)
    │
    └──► Hojai Industry
            (cross-tenant learning)
```

## Tenant Model

```typescript
// REZ is a tenant
tenant_id: 'rez_internal'
tenant_type: 'internal'
privileged: true
cross_tenant_allowed: true
```

---

# PART 4: PORT REGISTRY

## REZ + Hojai Ports

| Port | Service | Type | Part of |
|------|---------|------|---------|
| 4000 | api-gateway | REZ | REZ |
| 4001 | payment | RABTUL | External |
| 4002 | auth | RABTUL | External |
| 4004 | wallet | RABTUL | External |
| 4500 | hojai-api-gateway | Hojai | Core |
| 4501 | hojai-governance | Hojai | Core |
| 4510 | hojai-event | Hojai | Core |
| 4520 | hojai-memory | Hojai | Core |
| 4530 | hojai-intelligence | Hojai | Core |
| 4550 | hojai-agents | Hojai | Core |
| 4560 | hojai-workflow | Hojai | Core |
| 4570 | hojai-communications | Hojai | Core |
| 4580 | hojai-hyperlocal | Hojai | Core |
| 4590 | hojai-data | Hojai | Core |
| 4600 | hojai-identity | Hojai | Core |
| 4610 | hojai-analytics | Hojai | Core |
| 4700 | hojai-industry | Hojai | Industry |

---

# PART 5: WHAT HOJAI PROVIDES TO REZ

| Hojai Provides | REZ Uses |
|----------------|---------|
| Multi-tenant infrastructure | All services |
| Data Platform (tenant scoping | Data services |
| Intelligence Platform (ML) | prediction, recommendation |
| Agent Platform | support-agent, sales-agent |
| Event Platform | All event publishing |
| Identity Platform | identity-graph |
| Industry Platform | federated-ml |

---

# PART 6: WHAT REZ PROVIDES TO HOJAI

| REZ Provides | Hojai Uses |
|--------------|-------------|
| AI expertise | Intelligence Platform |
| 294+ services | Integration examples |
| Industry patterns | Industry brains |
| Tenant (rez_internal) | Privileged access |

---

# PART 7: MIGRATION STATUS

## What REZ Services Migrated to Hojai

| REZ Service | Hojai Platform | Status |
|------------|---------------|--------|
| auth-service | Hojai Governance | ✅ Migrated |
| user-service | Hojai Data | ✅ Migrated |
| prediction-service | Hojai Intelligence | ✅ Migrated |
| agent-service | Hojai Agents | ✅ Migrated |
| event-service | Hojai Event | ✅ Migrated |

## What REZ Services Stay REZ-only

| REZ Service | Reason |
|-------------|--------|
| predictive-engine | Core REZ IP |
| recommendation-engine | Core REZ IP |
| consumer-graph | REZ-specific |
| merchant-graph | REZ-specific |
| loyalty-engine | REZ-specific |

---

# PART 8: OFFICIAL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOJAI AI                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │ HOJAI CORE (Platform)                                       │      │
│  │                                                              │      │
│  │ Multi-tenant infrastructure                                  │      │
│  │ 12 Platforms                                                │      │
│  │ Canonical data models                                       │      │
│  │ Privacy-preserving learning                                 │      │
│  └──────────────────────────────────────────────────────────┘      │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ REZ INTELLIGENCE (Privileged Tenant)                          │      │
│  │                                                              │      │
│  │ Uses Hojai Core                                             │      │
│  │ Owns: Graphs, AI, Agents                                   │      │
│  │ 294 services                                               │      │
│  └──────────────────────────────────────────────────────────┘      │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ INDUSTRY INTELLIGENCE (Commercial Tenants)                  │      │
│  │                                                              │      │
│  │ Uses Hojai Core                                             │      │
│  │ Owns: Industry brains                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│  EXTERNAL                                                          │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │ RABTUL SERVICES (Auth, Payment, Wallet)                   │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

# SUMMARY

| Question | Answer |
|----------|--------|
| Is REZ Intelligence part of Hojai? | **YES** |
| REZ runs ON TOP of Hojai? | **YES** |
| Can REZ use Hojai platforms? | **YES** |
| Can Hojai use REZ services? | **YES** |
| Are they separate companies? | **YES** |
| Shared infrastructure? | **YES** |

---

*Document Version: 1.0*
*Last Updated: May 30, 2026*
*Status: INTEGRATED*
