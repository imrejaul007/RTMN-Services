# SUTAR OS - Autonomous Economic Infrastructure

**Version:** 2.0 | **Date:** 2026-06-13
**Location:** `hojai-ai/hojai-sutar-os/`
**Status:** ✅ Production Ready - All 25 Services Built

---

## OVERVIEW

SUTAR OS is **Autonomous Economic Infrastructure** — not just workflow automation.

```
AWS = Cloud Infrastructure
Stripe = Financial Infrastructure
Nexha = Commerce Infrastructure
SUTAR = Autonomous Economic Infrastructure
```

### Key Concept

> **Agents don't know each other. They know the network.**

Just like humans use search, reviews, trust, negotiation, and contracts — SUTAR agents do the same thing automatically, 24/7, without human intervention.

---

## 12-LAYER CANONICAL ARCHITECTURE

```
Trigger → Intent Graph → GoalOS → Decision → Simulation → Discovery → Negotiation → Trust → Contract → Economy → Flow → Learning
```

### Layer Descriptions

| Layer | Service | Port | Purpose |
|-------|---------|------|---------|
| 1. Trigger | - | - | Human goal, system event, external intent |
| 2. Intent | Intent Graph | 4018 | Capture intents, pattern recognition |
| 3. GoalOS | sutar-goal-os | 4242 | Decompose goals into sub-goals |
| 4. Decision | sutar-decision-engine | 4240 | Policy compliance, risk assessment |
| 5. Simulation | sutar-simulation-os | 4241 | What-if analysis, scenario testing |
| 6. Discovery | sutar-agent-network | 4155 | Registry, discovery, connections |
| 7. Negotiation | sutar-negotiation-engine | 4191 | RFQ → Quote → Counter → Accept |
| 8. Trust | sutar-trust-engine | 4180 | Credit check, trust score validation |
| 9. Contract | sutar-contract-os | 4190 | Smart contracts, digital signatures |
| 10. Economy | sutar-economy-os | 4251 | Karma points, platform fees, earnings |
| 11. Flow | sutar-flow-os | 4244 | Workflow orchestration |
| 12. Learning | sutar-memory-bridge | 4143 | Learning storage, network learning |

---

## ALL SERVICES (25 Total)

### Gateway Layer

| Service | Port | Description |
|---------|------|-------------|
| sutar-gateway | 4140 | Main API Gateway |

### Twin & Memory Layer

| Service | Port | Description |
|---------|------|-------------|
| sutar-twin-os | 4142 | Digital Twin OS - Entity state management |
| sutar-memory-bridge | 4143 | Memory Bridge - HOJAI Memory integration |
| sutar-agent-id | 4146 | Agent Identity Service |
| sutar-identity-os | 4147 | Identity OS - Agent identity and verification |

### Intent & Agent Layer

| Service | Port | Description |
|---------|------|-------------|
| sutar-intent-bus | 4154 | Intent Bus - Intent routing and management |
| sutar-agent-network | 4155 | Agent Network - Agent registry and discovery |

### Decision Layer

| Service | Port | Description |
|---------|------|-------------|
| sutar-decision-engine | 4240 | Decision Engine - Policy and risk evaluation |
| sutar-simulation-os | 4241 | Simulation OS - What-if analysis |
| sutar-goal-os | 4242 | Goal OS - Goal decomposition |
| sutar-network-learning | 4243 | Network Learning - Collective intelligence |
| sutar-flow-os | 4244 | Flow OS - Workflow orchestration |

### Marketplace Layer

| Service | Port | Description |
|---------|------|-------------|
| sutar-marketplace | 4250 | Marketplace - Agent & capability marketplace |
| sutar-economy-os | 4251 | Economy OS - Economic flow management |
| sutar-usage-tracker | 4253 | Usage Tracker - Resource usage monitoring |
| sutar-policy-os | 4254 | Policy OS - Policy management |

### Trust & Compliance Layer

| Service | Port | Description |
|---------|------|-------------|
| sutar-trust-engine | 4180 | Trust Engine - Trust score verification |
| sutar-contract-os | 4190 | Contract OS - Smart contract management |
| sutar-negotiation-engine | 4191 | Negotiation Engine - RFQ and counter-offer |

### Discovery & Analysis Layer

| Service | Port | Description |
|---------|------|-------------|
| sutar-exploration-engine | 4255 | Exploration Engine - New opportunity discovery |
| sutar-discovery-engine | 4256 | Discovery Engine - Agent and service discovery |
| sutar-multi-agent-evaluator | 4257 | Multi-Agent Evaluator - Compare agent capabilities |
| sutar-reputation-aggregator | 4258 | Reputation Aggregator - Trust and reputation scoring |
| sutar-roi-calculator | 4259 | ROI Calculator - Return on investment analysis |

### Monitoring Layer

| Service | Port | Description |
|---------|------|-------------|
| sutar-monitoring | 3100 | Monitoring - System health and metrics |

---

## QUICK START

```bash
# Start all services
cd hojai-sutar-os
docker-compose up -d

# Or run individually
cd services/sutar-gateway
npm install
npm run dev
```

---

## PORT REGISTRY

| Port | Service | Layer |
|------|---------|-------|
| 3100 | sutar-monitoring | Monitoring |
| 4140 | sutar-gateway | Gateway |
| 4142 | sutar-twin-os | Twin & Memory |
| 4143 | sutar-memory-bridge | Twin & Memory |
| 4146 | sutar-agent-id | Twin & Memory |
| 4147 | sutar-identity-os | Twin & Memory |
| 4154 | sutar-intent-bus | Intent & Agent |
| 4155 | sutar-agent-network | Intent & Agent |
| 4180 | sutar-trust-engine | Trust & Compliance |
| 4190 | sutar-contract-os | Trust & Compliance |
| 4191 | sutar-negotiation-engine | Trust & Compliance |
| 4240 | sutar-decision-engine | Decision |
| 4241 | sutar-simulation-os | Decision |
| 4242 | sutar-goal-os | Decision |
| 4243 | sutar-network-learning | Decision |
| 4244 | sutar-flow-os | Decision |
| 4250 | sutar-marketplace | Marketplace |
| 4251 | sutar-economy-os | Marketplace |
| 4253 | sutar-usage-tracker | Marketplace |
| 4254 | sutar-policy-os | Marketplace |
| 4255 | sutar-exploration-engine | Discovery |
| 4256 | sutar-discovery-engine | Discovery |
| 4257 | sutar-multi-agent-evaluator | Discovery |
| 4258 | sutar-reputation-aggregator | Discovery |
| 4259 | sutar-roi-calculator | Discovery |

---

## FEATURES BY SERVICE

### Gateway (4140)
- Request routing
- Authentication
- Rate limiting
- Logging
- Health checks

### Twin & Memory (4142-4147)
- Entity creation & state tracking
- Change history & sync
- Context storage & retrieval
- Agent registration & verification
- KYC & credential management

### Intent & Agent (4154-4155)
- Intent capture & pattern recognition
- Context enrichment & routing
- Agent registry & capability matching
- Location & trust filtering

### Decision (4240-4244)
- Policy check & risk assessment
- Authorization (Proceed/Hold/Reject)
- What-if analysis & scenario testing
- Goal decomposition & sub-goal generation
- Pattern learning & strategy extraction
- Step sequencing & parallel execution

### Marketplace (4250-4254)
- Service listing & capability search
- Pricing & ratings & contracts
- Transaction tracking & balance management
- API usage & cost calculation
- Policy CRUD & compliance checks

### Trust & Compliance (4180-4191)
- Credit check & trust validation
- Payment history & dispute analysis
- Contract generation & digital signatures
- RFQ processing & counter-offers

### Discovery (4255-4259)
- Market scanning & opportunity identification
- Search, filtering & ranking
- Capability comparison & selection
- Review aggregation & ROI calculation

### Monitoring (3100)
- Health checks & metrics collection
- Alerting & dashboards

---

## LICENSE

Proprietary - RTNM Digital

---

**Last Updated:** 2026-06-13
