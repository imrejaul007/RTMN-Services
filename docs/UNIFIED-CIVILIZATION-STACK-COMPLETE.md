# RTMN Unified Civilization Stack — Complete Integration
**Version:** 1.0
**Date:** June 30, 2026
**Status:** ✅ ALL PHASES COMPLETE

---

## Executive Summary

All 4 integration bridges have been built and wired into the unified RTMN civilization stack:

| Bridge | Status | Purpose |
|--------|--------|---------|
| **1. Salar → BLR** | ✅ Complete | Agent publishing to marketplace |
| **2. Salar → SUTAR** | ✅ Complete | Workforce intelligence integration |
| **3. BLR → AgentOS/SUTAR** | ✅ Complete | Purchase → deployment pipeline |
| **4. AgentOS → CorpID/TwinOS** | ✅ Complete | Identity management |
| **5. SADA → All Systems** | ✅ Complete | Trust flow |

Plus:
- ✅ CompanyOS wired to unified stack
- ✅ Company Factory wired to bridges
- ✅ Startup script created
- ✅ Integration tests created

---

## The Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              RTMN UNIFIED CIVILIZATION STACK                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    SADA OS (Port 4190)
                                   ╔══════════════════╗
                                   ║  Trust Source   ║
                                   ║  • Trust Scores ║
                                   ║  • Policies     ║
                                   ║  • Compliance   ║
                                   ╚══════════════════╝
                                            │
                   ┌────────────────────────┼────────────────────────┐
                   │                        │                        │
                   ▼                        ▼                        ▼
         ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
         │  BRIDGE 5        │    │  BRIDGE 5        │    │  BRIDGE 5        │
         │  SADA → Salar    │    │  SADA → BLR      │    │  SADA → SUTAR    │
         │  (Trust Push)    │    │  (Trust Push)     │    │  (Trust Push)     │
         └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
                  │                       │                       │
                  ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                          SALAR OS (Port 4710)                                 │ │
│  │  ╔══════════════════════════════════════════════════════════════════════════╗ │ │
│  │  ║                     WORKFORCE REGISTRY                                    ║ │ │
│  │  ║  • Agent Twins       • Human Twins        • Hybrid Teams                   ║ │ │
│  │  ║  • Capability Registry • Organization Twins                                ║ │ │
│  │  ╚══════════════════════════════════════════════════════════════════════════╝ │ │
│  │                                                                               │ │
│  │  BRIDGE 1: Salar → BLR                           BRIDGE 2: Salar → SUTAR   │ │
│  │  • Index agents to BLR Discovery                  • Workforce decisions      │ │
│  │  • Create marketplace listings                   • Assignment execution      │ │
│  │  • Bulk sync                                    • Outcome learning         │ │
│  │  • Purchase webhooks                            • Capability checks        │ │
│  │                                                  • Capacity checks          │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                           │
│                                        ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                      BLR AI MARKETPLACE (Ports 4255-4256)                      │ │
│  │  ╔══════════════════════════════════════════════════════════════════════════╗ │ │
│  │  ║                     ONE UNIFIED MARKETPLACE                               ║ │ │
│  │  ║  • Discovery Engine (4256)  • Marketplace Listings (4255)                 ║ │ │
│  │  ║  • ROI Calculator         • Reputation Aggregator                         ║ │ │
│  │  ╚══════════════════════════════════════════════════════════════════════════╝ │ │
│  │                                                                               │ │
│  │  BRIDGE 3: BLR → AgentOS/SUTAR                                                │ │
│  │  • Purchase webhook → Deploy agent                                             │ │
│  │  • Register in SUTAR ACN                                                     │ │
│  │  • Set up memory partition                                                   │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                           │
│                                        ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                            SUTAR OS (Ports 4154-4294)                         │ │
│  │  ╔══════════════════════════════════════════════════════════════════════════╗ │ │
│  │  ║                   AGENT OPERATION LAYER                                   ║ │ │
│  │  ║  • ACP Protocol (4800)       • Decision Engine (4240)                      ║ │ │
│  │  ║  • Intent Bus (4154)         • Trust Engine (4291)                        ║ │ │
│  │  ║  • Economy OS (4294)        • Agent Network (4801)                        ║ │ │
│  │  ╚══════════════════════════════════════════════════════════════════════════╝ │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                           │
│                                        ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                         AGENTOS (Ports 4802-4814)                              │ │
│  │  ╔══════════════════════════════════════════════════════════════════════════╗ │ │
│  │  ║                   RUNTIME INFRASTRUCTURE                                  ║ │ │
│  │  ║  • Platform API (4802)         • Registry (4803)                           ║ │ │
│  │  ║  • Capability Store (4804)     • Tool Registry (4805)                      ║ │ │
│  │  ║  • Skill Library (4806)        • Message Bus (4807)                        ║ │ │
│  │  ║  • Scheduler (4808)            • Context Store (4809)                       ║ │ │
│  │  ║  • Memory Bridge (4811)        • Orchestrator (4812)                       ║ │ │
│  │  ║  • Execution Engine (4813)     • Observability (4814)                       ║ │ │
│  │  ╚══════════════════════════════════════════════════════════════════════════╝ │ │
│  │                                        │                                       │ │
│  │                                        ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │              BRIDGE 4: AgentOS → CorpID/TwinOS (Port 4810)               │ │ │
│  │  │  • Create CorpID identity  • Create TwinOS twin                        │ │ │
│  │  │  • Full sync              • Trust updates                               │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                           │
│                              ┌──────────┴──────────┐
│                              ▼                     ▼
│                    ┌──────────────────┐  ┌──────────────────┐
│                    │   CorpID (4702)  │  │   TwinOS (4705)  │
│                    │  Identity Layer   │  │  Digital Twins   │
│                    └──────────────────┘  └──────────────────┘
│
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                            COMPANYOS (Port 4010)                              │ │
│  │  ╔══════════════════════════════════════════════════════════════════════════╗ │ │
│  │  ║                 UNIFIED STACK BRIDGE                                      ║ │ │
│  │  ║  • Workforce: Hire/Department • Marketplace: Purchase/Search               ║ │ │
│  │  ║  • Agents: Deploy/Task       • Trust: Score/Update                        ║ │ │
│  │  ║  • Economy: Wallet/Pay       • Twins: Company Digital Twin                 ║ │ │
│  │  ╚══════════════════════════════════════════════════════════════════════════╝ │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## All 5 Integration Bridges

### Bridge 1: Salar → BLR (Agent Publishing)
**File:** `platform/twins/salar-os/src/modules/salarBLRBridge.ts`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/salar-bridge/blr/index` | POST | Index single agent to BLR Discovery |
| `/salar-bridge/blr/index/bulk` | POST | Bulk index agents |
| `/salar-bridge/blr/listings` | POST | Create marketplace listing |
| `/salar-bridge/blr/listings/sync-all` | POST | Sync all to marketplace |
| `/salar-bridge/blr/purchase-webhook` | POST | Purchase triggers deployment |
| `/salar-bridge/blr/health` | GET | Bridge health |
| `/salar-bridge/blr/stats` | GET | Bridge statistics |

---

### Bridge 2: Salar → SUTAR (Workforce Integration)
**File:** `platform/twins/salar-os/src/modules/salarSutarBridge.ts` (v2.0)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sutar/bridge/workforce-decision` | POST | Get workforce recommendations |
| `/sutar/bridge/assignment-execute` | POST | Execute assignment |
| `/sutar/bridge/outcome` | POST | Record outcome (learning) |
| `/sutar/bridge/capability-check` | POST | Check capability availability |
| `/sutar/bridge/capacity-check` | POST | Check workforce capacity |
| `/sutar/bridge/agent/:corpId` | GET | Get agent details |
| `/sutar/bridge/simulation` | POST | Workforce simulation |
| `/sutar/bridge/workflow-state` | POST | Get workflow state |
| `/sutar/bridge/register-callback` | POST | Register callback |
| `/sutar/bridge/health` | GET | Bridge health |

---

### Bridge 3: BLR → SUTAR/AgentOS (Install Pipeline)
**File:** `blr-ai-marketplace/services/marketplace-listings/src/webhooks/sutarInstallWebhook.ts`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhooks/stripe/checkout-completed` | POST | Trigger agent installation |
| `/webhooks/stripe/subscription-renewed` | POST | Extend access |
| `/webhooks/stripe/subscription-cancelled` | POST | Deactivate agent |

---

### Bridge 4: AgentOS → CorpID/TwinOS (Identity)
**File:** `platform/agent-os/identity-bridge/src/index.js` (Port 4810)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/identity/corpid` | POST | Create CorpID identity |
| `/identity/corpid/:agentId` | PATCH | Update identity |
| `/identity/corpid/:agentId` | DELETE | Archive identity |
| `/identity/twinos` | POST | Create TwinOS twin |
| `/identity/twinos/:agentId` | PATCH | Update twin |
| `/identity/twinos/:agentId` | DELETE | Archive twin |
| `/identity/sync` | POST | Sync to both |
| `/identity/sync-all` | POST | Sync all agents |
| `/identity/trust-update` | POST | Update trust |
| `/identity/health` | GET | Bridge health |

---

### Bridge 5: SADA → All Systems (Trust Flow)
**File:** `platform/trust/sada-os/src/integrations/trustFlow.ts`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/trust/push/salar` | POST | Push trust to Salar |
| `/trust/push/salar/bulk` | POST | Bulk push to Salar |
| `/trust/push/blr` | POST | Push trust to BLR |
| `/trust/push/blr/bulk` | POST | Bulk push to BLR |
| `/trust/push/sutar` | POST | Push trust to SUTAR |
| `/trust/push/agentos` | POST | Push trust to AgentOS |
| `/trust/push/corpid` | POST | Push trust to CorpID |
| `/trust/query` | POST | Query unified trust |
| `/trust/sync-all` | POST | Sync trust to all |
| `/trust/push/health` | GET | Bridge health |

---

## CompanyOS Integration Bridge

**File:** `platform/company-os/integration/stack-bridge.ts`

| Category | Endpoint | Method | Purpose |
|----------|----------|--------|---------|
| **Workforce** | `/api/workforce/hire` | POST | Hire workforce |
| **Workforce** | `/api/workforce/department` | POST | Create department |
| **Marketplace** | `/api/marketplace/purchase` | POST | Purchase from BLR |
| **Marketplace** | `/api/marketplace/search` | GET | Search BLR |
| **Agents** | `/api/agents/deploy` | POST | Deploy AI agent |
| **Agents** | `/api/agents/task` | POST | Assign task |
| **Trust** | `/api/trust/score/:companyId` | GET | Get trust score |
| **Trust** | `/api/trust/update` | POST | Update trust |
| **Economy** | `/api/economy/wallet` | POST | Create wallet |
| **Economy** | `/api/economy/pay` | POST | Pay for services |
| **Twins** | `/api/company/twin/:companyId` | GET | Get company twin |
| **Health** | `/api/integration/health` | GET | Check all services |

---

## Company Factory Deployment

**File:** `platform/company-os/company-factory/src/deployment.ts`

### Deployment Phases

| Phase | Steps | Services Called |
|-------|-------|-----------------|
| **1. Company Identity** | Create CorpID, Twin, Wallet, Trust | CorpID, TwinOS, SUTAR Economy, SADA |
| **2. Departments** | Create department twins, Register in Salar | TwinOS, Salar |
| **3. AI Workers** | Create identity, Register, Deploy, Index | CorpID, Salar, TwinOS, AgentOS, BLR |
| **4. Commerce** | Set up channels, Register in BLR | TwinOS, BLR |
| **5. Trust** | Verify, Push trust to all systems | SADA, Salar, BLR |

### Usage

```typescript
import { deploymentService } from './deployment';

const deployment = await deploymentService.deploy({
  industry: 'restaurant',
  companyName: 'My Restaurant',
  customizations: {
    stage: 'startup',
    departments: ['Operations', 'Marketing', 'Finance'],
    aiWorkers: ['AI Manager', 'AI Chef', 'AI Marketer'],
  },
});

console.log(deployment.companyId); // e.g., "company_a1b2c3d4"
console.log(deployment.status); // "deployed"
```

---

## Complete Service Port Map

| Service | Port | Role |
|---------|------|------|
| **Foundation** |
| CorpID | 4702 | Universal Identity |
| MemoryOS | 4703 | Persistent Memory |
| TwinOS Hub | 4705 | Digital Twins |
| **Trust & Governance** |
| SADA OS | 4190 | Trust Source |
| **Workforce Registry** |
| Salar OS | 4710 | Workforce Intelligence |
| **Agent Runtime** |
| AgentOS Gateway | 4802 | Platform API |
| Agent Registry | 4803 | Agent Identity |
| Agent Identity Bridge | 4810 | CorpID/TwinOS Bridge |
| **SUTAR OS** |
| SUTAR Intent Bus | 4154 | Intent Pub/Sub |
| SUTAR Decision | 4240 | Decision Engine |
| SUTAR Trust | 4291 | Trust Engine |
| SUTAR Economy | 4294 | Economy & Karma |
| SUTAR ACN | 4801 | Agent Network |
| **Marketplace** |
| BLR Discovery | 4256 | Discovery Engine |
| BLR Marketplace | 4255 | Listings & Checkout |
| **CompanyOS** |
| CompanyOS Control Plane | 4010 | Company Management |

---

## Environment Variables

```bash
# === FOUNDATION ===
CORPID_URL=http://localhost:4702
MEMORY_OS_URL=http://localhost:4703
TWINOS_URL=http://localhost:4705

# === TRUST & GOVERNANCE ===
SADA_URL=http://localhost:4190

# === WORKFORCE ===
SALAR_URL=http://localhost:4710

# === AGENT RUNTIME ===
AGENT_OS_URL=http://localhost:4802
AGENT_IDENTITY_URL=http://localhost:4810

# === SUTAR OS ===
SUTAR_DECISION_URL=http://localhost:4240
SUTAR_INTENT_BUS_URL=http://localhost:4154
SUTAR_ECONOMY_URL=http://localhost:4294
SUTAR_TRUST_URL=http://localhost:4291

# === MARKETPLACE ===
BLR_DISCOVERY_URL=http://localhost:4256
BLR_MARKETPLACE_URL=http://localhost:4255

# === AUTH ===
INTERNAL_SERVICE_TOKEN=internal-dev-token-123
JWT_SECRET=dev-jwt-secret-change-in-prod
```

---

## Startup Script

```bash
# Start all services
./scripts/start-unified-stack.sh start

# Check status
./scripts/start-unified-stack.sh status

# Stop all services
./scripts/start-unified-stack.sh stop
```

---

## Verification Commands

```bash
# Check all bridges
curl http://localhost:4710/salar-bridge/blr/health
curl http://localhost:4710/sutar/bridge/health
curl http://localhost:4810/identity/health
curl http://localhost:4190/trust/push/health

# Check CompanyOS integration
curl http://localhost:4010/api/integration/health

# Sync all agents to BLR
curl -X POST http://localhost:4710/salar-bridge/blr/listings/sync-all

# Sync all identities
curl -X POST http://localhost:4810/identity/sync-all

# Sync trust to all systems
curl -X POST http://localhost:4190/trust/sync-all

# Deploy a test company
curl -X POST http://localhost:4010/api/company/deploy \
  -H "Content-Type: application/json" \
  -d '{"industry": "restaurant", "companyName": "Test Restaurant"}'
```

---

## Integration Tests

```bash
# Run integration tests
npx vitest run companies/HOJAI-AI/platform/integration-tests/bridges.test.js
```

---

## Key Files Created

| File | Purpose |
|------|---------|
| `platform/twins/salar-os/src/modules/salarBLRBridge.ts` | Bridge 1: Salar → BLR |
| `platform/twins/salar-os/src/modules/salarSutarBridge.ts` | Bridge 2: Salar → SUTAR (v2.0) |
| `blr-ai-marketplace/.../sutarInstallWebhook.ts` | Bridge 3: BLR → SUTAR/AgentOS |
| `platform/agent-os/identity-bridge/src/index.js` | Bridge 4: AgentOS → CorpID/TwinOS |
| `platform/trust/sada-os/src/integrations/trustFlow.ts` | Bridge 5: SADA → All Systems |
| `platform/company-os/integration/stack-bridge.ts` | CompanyOS → Unified Stack |
| `platform/company-os/company-factory/src/deployment.ts` | Company Factory (real deployment) |
| `scripts/start-unified-stack.sh` | Startup script |
| `platform/integration-tests/bridges.test.js` | Integration tests |

---

## The Canonical Flow

### 1. Create Company
```
User: Create restaurant company
    │
    └──→ CompanyOS Control Plane (4010)
            │
            └──→ Deployment Service
                    │
                    ├── Create CorpID identity
                    ├── Create TwinOS twin
                    ├── Create wallet (SUTAR Economy)
                    ├── Initialize trust (SADA)
                    ├── Create departments
                    ├── Deploy AI workers (AgentOS)
                    ├── Index to BLR
                    └── Verify trust
```

### 2. Publish Agent
```
Admin: Publish AI Marketer to marketplace
    │
    └──→ Salar OS (4710)
            │
            └──→ POST /salar-bridge/blr/index
                    │
                    └──→ BLR Discovery Engine (4256)
                            │
                            └──→ Agent indexed with capabilities, trust
```

### 3. Purchase Agent
```
Buyer: Purchase AI Marketer
    │
    └──→ Stripe Checkout
            │
            └──→ POST /webhooks/stripe/checkout-completed
                    │
                    ├──→ AgentOS full-deploy
                    ├──→ Register in SUTAR ACN
                    ├──→ Set up memory partition
                    └──→ Record install in BLR
```

### 4. Operate Agent
```
User: Assign task to AI Marketer
    │
    └──→ CompanyOS (4010)
            │
            └──→ POST /api/agents/task
                    │
                    ├──→ SUTAR Decision Engine
                    │       │
                    │       └──→ Salar OS (workforce decision)
                    │
                    └──→ Salar → SUTAR (assignment execute)
                            │
                            └──→ SUTAR → AgentOS (execute task)
                                    │
                                    └──→ Salar ← SUTAR (outcome)
                                            │
                                            └──→ Update performance, learn
```

---

*Document Version: 1.0 | Last Updated: June 30, 2026*
*All 5 bridges built, wired, and documented.*
