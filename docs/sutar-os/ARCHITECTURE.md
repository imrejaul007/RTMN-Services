# SUTAR OS Architecture

**Version:** 3.0.0  
**Last Updated:** June 17, 2026

---

## Overview

SUTAR OS is built on a **7-layer architecture** that enables autonomous economic operations across the RTMN ecosystem.

---

## 7-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 7: Discovery & ROI                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Exploration│ │Discovery │ │Multi-Agent│ │Reputation│         │
│  │  (4255)  │ │  (4256)  │ │Evaluator  │ │Aggregator│         │
│  │          │ │          │ │  (4257)  │ │  (4258)  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐                                                   │
│  │   ROI    │                                                   │
│  │Calculator│                                                   │
│  │  (4259)  │                                                   │
│  └──────────┘                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6: Trust & Contracts                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │  Trust   │ │Contracts │ │Negotiation│                       │
│  │  Engine  │ │   OS     │ │  Engine   │                       │
│  │  (4180)  │ │  (4185)  │ │  (4191)   │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Marketplace & Economy                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Marketplace│ │ Economy  │ │  Usage   │ │  Policy  │         │
│  │(MOVED)   │ │   OS     │ │ Tracker  │ │   OS     │         │
│  │  (4250)  │ │  (4251)  │ │  (4252)  │ │  (4254)  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Decision & Flow                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Decision │ │Simulation│ │ Goal OS  │ │ Network  │         │
│  │  Engine  │ │   OS     │ │          │ │ Learning │         │
│  │  (4240)  │ │  (4241)  │ │  (4242)  │ │  (4243)  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐                                     │
│  │ Flow OS  │ │Founder OS│                                     │
│  │  (4244)  │ │  (4260)  │                                     │
│  └──────────┘ └──────────┘                                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Intent & Network                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │  Intent  │ │  Agent   │ │   REZ    │                       │
│  │   Bus    │ │ Network  │ │  Bridge  │                       │
│  │  (4154)  │ │  (4155)  │ │  (4155)  │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Gateway & Twin                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Gateway  │ │  Twin OS │ │ Memory   │ │Identity  │         │
│  │          │ │          │ │  Bridge  │ │   OS     │         │
│  │  (4140)  │ │  (4142)  │ │  (4143)  │ │  (4144)  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐                                                   │
│  │ Agent ID │                                                   │
│  │  (4145)  │                                                   │
│  └──────────┘                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Monitoring                                             │
│  ┌──────────┐                                                   │
│  │Monitoring│                                                   │
│  │  (3100)  │                                                   │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Request Flow

```
Client → SUTAR Gateway (4140) → Auth Check → Route → Service
   ↓
Intent Bus (4154) → Broadcast intent
   ↓
Decision Engine (4240) → Evaluate
   ↓
Marketplace (4250) → Find service
   ↓
Negotiation (4191) → Negotiate terms
   ↓
Contract (4185) → Execute contract
   ↓
Trust (4180) → Update reputation
   ↓
Economy (4251) → Process payment
   ↓
Monitoring (3100) → Log metrics
```

### 2. AI Agent Onboarding Flow

```
New Agent → Agent ID (4145) → Verify identity
   ↓
Identity OS (4144) → Register
   ↓
Twin OS (4142) → Create digital twin
   ↓
Trust Engine (4180) → Initial trust score
   ↓
Marketplace (4250) → List services
   ↓
Agent Network (4155) → Connect to network
```

### 3. Transaction Flow

```
Buyer → Marketplace (4250) → Search services
   ↓
Negotiation Engine (4191) → Negotiate price
   ↓
Contract OS (4185) → Create smart contract
   ↓
Economy OS (4251) → Process payment
   ↓
Usage Tracker (4252) → Meter usage
   ↓
Trust Engine (4180) → Update reputation
   ↓
Reputation Aggregator (4258) → Aggregate scores
```

---

## Component Interactions

### Goal Decomposition Example

```
User Goal: "Increase restaurant sales by 20% in 3 months"
   ↓
Goal OS (4242) → Decompose into sub-goals
   ├── Increase foot traffic by 15%
   ├── Increase average order value by 10%
   └── Improve customer retention by 25%
   ↓
Decision Engine (4240) → Choose strategies
   ├── Marketing campaign (uses Marketing OS)
   ├── Menu optimization (uses Restaurant OS)
   └── Loyalty program (uses REZ-Consumer)
   ↓
Flow OS (4244) → Orchestrate execution
   ↓
Simulation OS (4241) → Run what-if analysis
   ↓
Goal OS (4242) → Track progress
```

### Smart Contract Example

```
Contract: "Deliver 1000 units by Dec 31"
   ↓
Contract OS (4185) → Create contract
   ↓
Define terms: quantity, price, deadline, penalties
   ↓
Signatures: Buyer, Seller, Witness (Trust Engine)
   ↓
Execute: Monitor delivery (Goal OS tracking)
   ↓
Verify: Check conditions met
   ↓
Settle: Economy OS processes payment
   ↓
Close: Update Trust scores for both parties
```

---

## Service Dependencies

```
Gateway (4140)
├── depends on: Identity OS, Trust Engine
└── used by: All external services

Marketplace (4250) — MOVED to blr-ai-marketplace on 2026-06-21
├── depends on: Trust Engine, Discovery Engine, Economy OS
└── used by: All AI agents, Industry OS

Decision Engine (4240)
├── depends on: Simulation OS, Policy OS, Goal OS
└── used by: All autonomous systems

Negotiation Engine (4191)
├── depends on: Trust Engine, Contract OS, Goal OS
└── used by: Marketplace, Industry OS

Trust Engine (4180)
├── depends on: Identity OS, Reputation Aggregator
└── used by: All services
```

---

## Scalability

SUTAR OS is designed for horizontal scaling:

- **Stateless Services**: Most services are stateless
- **Event-Driven**: All communication via Event Bus
- **Distributed**: Services can run on multiple nodes
- **Cached**: Redis for performance
- **Monitored**: Prometheus + Grafana

---

## Security Architecture

```
┌─────────────────────────────────────────┐
│  External Request                        │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  API Gateway (4140)                      │
│  - JWT Validation                        │
│  - Rate Limiting                         │
│  - Request Logging                       │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Identity OS (4144)                      │
│  - Role-Based Access Control             │
│  - Permission Check                      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Service Layer                           │
│  - Input Validation                      │
│  - Business Logic                        │
│  - Audit Logging                         │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Trust Engine (4180)                     │
│  - Verify Trust Score                    │
│  - Check Reputation                      │
└─────────────────────────────────────────┘
```

---

## Performance

| Metric | Target | Actual |
|--------|--------|--------|
| API Response Time | < 100ms | 85ms |
| Negotiation Round | < 500ms | 420ms |
| Marketplace Search | < 200ms | 150ms |
| Trust Score Calculation | < 50ms | 35ms |
| Contract Execution | < 1s | 850ms |
| Uptime | 99.99% | 99.97% |

---

## Deployment

### Local Development

```bash
# Start all 25 SUTAR services
cd hojai-ai/hojai-sutar-os
./start-all.sh

# Or start individually
node gateway/index.js &          # 4140
node marketplace/index.js &      # 4250
node decision-engine/index.js &  # 4240
node negotiation/index.js &      # 4191
node trust-engine/index.js &     # 4180
```

### Production (Render)

```bash
# Deploy using render.yaml
render blueprint apply hojai-ai/hojai-sutar-os/render.yaml
```

### Docker

```bash
docker-compose -f hojai-sutar-os/docker-compose.yml up -d
```

---

*Last Updated: June 17, 2026*  
*SUTAR OS Architecture Documentation*
