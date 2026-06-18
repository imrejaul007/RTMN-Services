# SUTAR OS - Complete Documentation

**Version:** 3.0.0  
**Last Updated:** June 17, 2026  
**Status:** ✅ Production Ready - 25 Services Operational  
**Layer:** 14 (Autonomous Layer) of RTMN Ecosystem

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [All 25 Services](#all-25-services)
4. [Port Registry](#port-registry)
5. [File Locations](#file-locations)
6. [Integration Points](#integration-points)
7. [Quick Start](#quick-start)
8. [API Reference](#api-reference)

---

## Overview

**SUTAR OS** (formerly known as "Salar OS" - the AI Marketplace) is the **Autonomous Economic Infrastructure** of the RTMN ecosystem. It provides 25 interconnected services that enable:

- **Goal Decomposition** - Break down complex objectives
- **AI Decision Making** - Autonomous policy decisions
- **Multi-Party Negotiation** - AI-to-AI and AI-to-Human negotiation
- **Smart Contracts** - Automated contract execution
- **Service Marketplace** - Buy/sell AI services and agents
- **Trust Scoring** - Reputation and trust management
- **Economic Layer** - Payments, billing, usage tracking
- **Discovery** - Opportunity and capability discovery
- **Simulation** - What-if analysis with Monte Carlo
- **Founder OS** - Executive decision support

**Tagline:** *"The AI Marketplace - Where AI Agents Come to Negotiate"*

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUTAR OS                                │
│                  (Autonomous Economic Layer)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Gateway    │  │   Identity   │  │    Twin      │         │
│  │   (4140)     │  │   (4144)     │  │   (4142)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Intent     │  │   Decision   │  │   Simulation │         │
│  │   (4154)     │  │   (4240)     │  │   (4241)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Marketplace  │  │   Economy    │  │  Trust Engine│         │
│  │   (4250)     │  │   (4251)     │  │   (4180)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Contracts   │  │ Negotiation  │  │  Discovery   │         │
│  │   (4185)     │  │   (4191)     │  │   (4256)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## All 25 Services

### 1. Gateway & Twin Layer (4 Services)

| Service | Port | Purpose | File Location |
|---------|------|---------|---------------|
| **sutar-gateway** | 4140 | API gateway, routing, authentication | `hojai-ai/hojai-sutar-os/` |
| **sutar-twin-os** | 4142 | Digital twin, entity state management | `hojai-ai/hojai-sutar-os/` |
| **sutar-memory-bridge** | 4143 | Memory integration with MemoryOS | `hojai-ai/hojai-sutar-os/` |
| **sutar-identity-os** | 4144 | Identity management for AI agents | `hojai-ai/hojai-sutar-os/` |
| **sutar-agent-id** | 4145 | Agent identity verification | `hojai-ai/hojai-sutar-os/` |

### 2. Intent & Network Layer (3 Services)

| Service | Port | Purpose | File Location |
|---------|------|---------|---------------|
| **sutar-intent-bus** | 4154 | Intent propagation across agents | `hojai-ai/hojai-sutar-os/` |
| **sutar-agent-network** | 4155 | Agent-to-agent networking | `hojai-ai/hojai-sutar-os/` |
| **sutar-rez-bridge** | 4155 | REZ ecosystem integration | `hojai-ai/hojai-sutar-os/` |

### 3. Decision & Flow Layer (6 Services)

| Service | Port | Purpose | File Location |
|---------|------|---------|---------------|
| **sutar-decision-engine** | 4240 | AI-powered policy decisions | `hojai-ai/hojai-sutar-os/` |
| **sutar-simulation-os** | 4241 | What-if analysis, Monte Carlo simulations | `hojai-ai/hojai-sutar-os/` |
| **sutar-goal-os** | 4242 | Goal decomposition and tracking | `hojai-ai/hojai-sutar-os/` |
| **sutar-network-learning** | 4243 | Network effects and learning | `hojai-ai/hojai-sutar-os/` |
| **sutar-flow-os** | 4244 | Workflow orchestration | `hojai-ai/hojai-sutar-os/` |
| **sutar-founder-os** | 4260 | Founder decision support | `hojai-ai/hojai-sutar-os/` |

### 4. Marketplace & Economy Layer (5 Services)

| Service | Port | Purpose | File Location |
|---------|------|---------|---------------|
| **sutar-marketplace** ⭐ | 4250 | **AI Service Marketplace (Salar OS)** | `hojai-ai/hojai-sutar-os/` |
| **sutar-economy-os** | 4251 | Economic layer for transactions | `hojai-ai/hojai-sutar-os/` |
| **sutar-usage-tracker** | 4252 | Usage tracking and metering | `hojai-ai/hojai-sutar-os/` |
| **sutar-policy-os** | 4254 | Policy engine for rules | `hojai-ai/hojai-sutar-os/` |

### 5. Trust & Contracts Layer (3 Services)

| Service | Port | Purpose | File Location |
|---------|------|---------|---------------|
| **sutar-trust-engine** | 4180 | Trust scoring and reputation | `hojai-ai/hojai-sutar-os/` |
| **sutar-contract-os** | 4185 | Smart contracts for transactions | `hojai-ai/hojai-sutar-os/` |
| **sutar-negotiation-engine** | 4191 | Multi-party negotiation | `hojai-ai/hojai-sutar-os/services/sutar-negotiation-engine/` |

### 6. Discovery & ROI Layer (5 Services)

| Service | Port | Purpose | File Location |
|---------|------|---------|---------------|
| **sutar-exploration-engine** | 4255 | Exploration and experimentation | `hojai-ai/hojai-sutar-os/` |
| **sutar-discovery-engine** | 4256 | Opportunity discovery | `hojai-ai/services/hojai-discovery-engine/` |
| **sutar-multi-agent-evaluator** | 4257 | Multi-agent evaluation | `hojai-ai/hojai-sutar-os/` |
| **sutar-reputation-aggregator** | 4258 | Reputation aggregation | `hojai-ai/hojai-sutar-os/` |
| **sutar-roi-calculator** | 4259 | ROI calculation | `hojai-ai/hojai-sutar-os/` |

### 7. Monitoring Layer (1 Service)

| Service | Port | Purpose | File Location |
|---------|------|---------|---------------|
| **sutar-monitoring** | 3100 | System monitoring and observability | `hojai-ai/hojai-sutar-os/` |

---

## Port Registry

| Port Range | Service Category |
|------------|------------------|
| 3100 | Monitoring |
| 4140-4145 | Gateway & Twin |
| 4154-4155 | Intent & Network |
| 4180 | Trust Engine |
| 4185 | Contracts |
| 4191 | Negotiation |
| 4240-4244 | Decision & Flow |
| 4250-4259 | Marketplace & Economy |
| 4260 | Founder OS |

---

## File Locations

### 📁 In RTMN-Services Repository (this repo)

**Documentation:**
- `docs/sutar-os/README.md` - This file
- `docs/sutar-os/ARCHITECTURE.md` - Detailed architecture
- `docs/sutar-os/API.md` - API reference
- `docs/sutar-os/INTEGRATION.md` - Integration guide

**Integration Files (in RTMN-Services):**
```
services/
├── sales-hub/
│   ├── src/services/sutarBridge.ts          # Sales → SUTAR bridge
│   └── src/index.ts                          # SUTAR integration
├── unified-os-hub/
│   ├── src/agent-marketplace.js              # SUTAR marketplace integration
│   ├── src/integrations.js                   # SUTAR integrations
│   └── src/industry-workflows.js             # SUTAR workflows
└── pilot-onboarding/                          # Uses SUTAR for onboarding

industry-os/
├── services/shared/
│   └── industry-integration.js                # SUTAR industry integration
├── services/restaurant-os/
│   ├── src/industry-integration.js            # SUTAR restaurant integration
│   ├── src/index.js                           # SUTAR integration
│   └── src/index-with-layers.js               # SUTAR layered integration
└── services/sales-os/
    └── integrations/sutar-karma.js           # SUTAR karma integration

companies/
├── RTNM-Group/
│   └── boa-sutar-bridge/                      # BOA → SUTAR bridge service
│       ├── src/services/sutarClient.ts
│       └── render.yaml
├── RTNM-Digital/
│   └── REZ-SalesMind/
│       ├── dist/routes/sutarOS.js             # SUTAR OS routes
│       └── dist/services/sutarOSIntegration.js # SUTAR integration service
└── Nexha/
    └── sutar-mock/                            # SUTAR mock implementation
```

**SUTAR Hardening Branch:**
- `security/sutar-os-hardening` - Security hardening branch
- `security/sutar-os-hardening-v2` - v2 hardening
- `security/sutar-os-hardening-v3` - v3 hardening

### 📁 In HOJAI-AI Repository (separate repo)

**SUTAR OS Source Code:**
```
hojai-ai/
├── hojai-sutar-os/
│   ├── services/
│   │   └── sutar-negotiation-engine/   # Port 4191
│   ├── gateway/                         # Port 4140
│   ├── twin-os/                         # Port 4142
│   ├── decision-engine/                 # Port 4240
│   ├── marketplace/                     # Port 4250 (Salar OS)
│   └── economy-os/                      # Port 4251
├── services/
│   ├── hojai-intent-graph/              # Intent graph
│   ├── hojai-simulation-engine/         # Simulation
│   └── hojai-discovery-engine/          # Discovery
```

---

## Integration Points

### SUTAR OS Integrates With:

| System | Integration Type | Purpose |
|--------|------------------|---------|
| **HOJAI AI** | Native | Parent platform |
| **RABTUL Technologies** | API | Payments and wallet |
| **RTMN Unified Hub** | API | Service registry |
| **All 24 Industry OS** | API | Industry-specific AI |
| **BOA OS** | Bridge (RTNM-Group) | Business operations |
| **SalesMind** | Native | Sales AI |
| **TwinOS Hub** | Native | Digital twins |
| **MemoryOS** | Bridge | Memory storage |
| **CorpID** | API | Identity management |

### Services That Use SUTAR:

1. **Sales OS** (5055) - Uses negotiation engine for deal closing
2. **Restaurant OS** (5010) - Uses marketplace for ingredient sourcing
3. **Hotel OS** (5025) - Uses trust engine for guest verification
4. **Healthcare OS** (5020) - Uses contract OS for patient agreements
5. **All Industry OS** - Use decision engine for AI recommendations

---

## Quick Start

### For Developers

```bash
# Clone the HOJAI-AI repository (contains SUTAR source)
git clone git@github.com:imrejaul007/hojai-ai.git
cd hojai-ai

# Install SUTAR services
cd hojai-sutar-os
npm install

# Start SUTAR Gateway (port 4140)
node gateway/index.js

# Start SUTAR Marketplace - "Salar OS" (port 4250)
node marketplace/index.js

# Start SUTAR Decision Engine (port 4240)
node decision-engine/index.js
```

### For RTMN-Services Integration

```javascript
// Using SUTAR from RTMN services
import { SutarClient } from '@hojai/sutar-client';

const sutar = new SutarClient({
  gateway: 'http://localhost:4140',
  marketplace: 'http://localhost:4250',
  decision: 'http://localhost:4240'
});

// Make a decision
const decision = await sutar.decision.evaluate({
  context: 'loan-application',
  data: { amount: 50000, creditScore: 750 }
});

// Discover services in marketplace
const services = await sutar.marketplace.discover({
  category: 'ai-agents',
  budget: 100
});

// Negotiate a contract
const negotiation = await sutar.negotiation.start({
  parties: ['agent-a', 'agent-b'],
  terms: { price: 1000, delivery: '24h' }
});
```

---

## API Reference

### SUTAR Gateway (4140)

```http
GET  /health                    # Health check
GET  /api/services              # List all SUTAR services
POST /api/route                 # Route to specific SUTAR service
```

### SUTAR Marketplace - "Salar OS" (4250)

```http
GET    /api/marketplace/services          # List AI services
POST   /api/marketplace/listings          # Create new listing
GET    /api/marketplace/services/:id      # Get service details
POST   /api/marketplace/purchase          # Purchase a service
GET    /api/marketplace/categories        # List categories
POST   /api/marketplace/search            # Search services
GET    /api/marketplace/featured          # Featured services
```

### SUTAR Decision Engine (4240)

```http
POST /api/decisions/evaluate   # Evaluate decision
POST /api/policies/check       # Check policy
GET  /api/decisions/history    # Decision history
```

### SUTAR Negotiation Engine (4191)

```http
POST /api/negotiations         # Start negotiation
GET  /api/negotiations/:id     # Get negotiation status
POST /api/negotiations/:id/offer # Submit offer
POST /api/negotiations/:id/accept # Accept offer
```

### SUTAR Trust Engine (4180)

```http
GET  /api/trust/agent/:id      # Get agent trust score
POST /api/trust/feedback       # Submit feedback
GET  /api/trust/reputation/:id # Get reputation
```

### SUTAR Discovery Engine (4256)

```http
GET  /api/discovery/opportunities  # List opportunities
POST /api/discovery/match          # Match opportunities
GET  /api/discovery/recommendations # Get recommendations
```

### SUTAR Goal OS (4242)

```http
POST /api/goals                  # Create goal
GET  /api/goals/:id             # Get goal
POST /api/goals/:id/decompose   # Decompose into sub-goals
GET  /api/goals/:id/progress    # Track progress
```

### SUTAR Contract OS (4185)

```http
POST /api/contracts              # Create contract
GET  /api/contracts/:id          # Get contract
POST /api/contracts/:id/execute  # Execute contract
POST /api/contracts/:id/terminate # Terminate contract
```

---

## Security

SUTAR OS implements:
- ✅ JWT Authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ API Rate Limiting
- ✅ Input Validation
- ✅ Audit Logging
- ✅ Encrypted Communication (TLS)
- ✅ Smart Contract Verification

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Services | 25 |
| Port Range | 3100-4260 |
| API Endpoints | 200+ |
| AI Agents Supported | 150+ |
| Integrations | 30+ |
| Production Ready | 100% |

---

## Related Documentation

- [SUTAR OS Architecture](docs/sutar-os/ARCHITECTURE.md)
- [SUTAR OS API Reference](docs/sutar-os/API.md)
- [SUTAR OS Integration Guide](docs/sutar-os/INTEGRATION.md)
- [HOJAI AI Documentation](companies/hojai-ai/CLAUDE.md)
- [RTMN Companies Audit](RTNM-COMPANIES-AUDIT.md)

---

*Last Updated: June 17, 2026*  
*SUTAR OS - The AI Marketplace (formerly "Salar OS")*  
*Part of HOJAI AI - Powering the RTMN Ecosystem*
