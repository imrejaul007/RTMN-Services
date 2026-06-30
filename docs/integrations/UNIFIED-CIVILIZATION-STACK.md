# Unified RTMN Civilization Stack — Integration Architecture
**Version:** 1.0
**Date:** June 30, 2026
**Status:** ✅ All 4 Bridges Built

---

## The Canonical Model

```
SADA OS (Trust/Governance) ← TRUTH SOURCE
    │
    ├── Trust scores for all entities
    ├── Policy enforcement
    └── Compliance & audits
            │
            ▼
    SALAR OS (Workforce Registry) ← AGENT REGISTRY
    │
    ├── Agent Twins
    ├── Human Twins
    ├── Hybrid Teams
    ├── Capability Registry
    └── 232 AI Employees seeded
            │
            ├── Published to BAM ──────────────────┐
            │                                      │
            │                                      ▼
            └── Operated by SUTAR ───────────────┐
                                                │
                                                ▼
                            BLR AI MARKETPLACE (BAM) ← ONE UNIFIED MARKETPLACE
                            │
                            ├── All agents listed
                            ├── Discovery engine
                            ├── Stripe checkout
                            └── Purchase → Install trigger
                                    │
                                    ▼
                            SUTAR OS (Agent Operation)
                            │
                            ├── ACP Protocol (AI-to-AI messaging)
                            ├── Agent Teaming (form teams)
                            ├── Negotiation (6 strategies)
                            ├── Contracts (escrow)
                            └── Economy (Karma, credits)
                                    │
                                    ▼
                            AGENTOS (Runtime Infrastructure)
                            │
                            ├── Registry, Capabilities, Tools
                            ├── Memory, Context, Scheduler
                            ├── Orchestrator, Execution
                            └── Observability
                                    │
                                    ├── Linked to CorpID ───────┐
                                    │                         │
                                    └── Linked to TwinOS ─────┘
```

---

## The 4 Integration Bridges

### Bridge 1: Salar → BLR (Agent Publishing)

**File:** `platform/twins/salar-os/src/modules/salarBLRBridge.ts`

**Flow:**
```
Agent created/updated in Salar
    │
    └──→ POST /salar-bridge/blr/index
            │
            └──→ BLR Discovery Engine (4256)
                    │
                    └──→ Agent indexed with capabilities, trust
```

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/salar-bridge/blr/index` | Index single agent |
| POST | `/salar-bridge/blr/index/bulk` | Bulk index agents |
| DELETE | `/salar-bridge/blr/index/:agentId` | Remove from index |
| POST | `/salar-bridge/blr/listings` | Create marketplace listing |
| POST | `/salar-bridge/blr/listings/sync-all` | Sync all to marketplace |
| GET | `/salar-bridge/blr/stats` | Bridge statistics |

**Environment Variables:**
```bash
BLR_DISCOVERY_URL=http://localhost:4256
BLR_MARKETPLACE_URL=http://localhost:4255
```

---

### Bridge 2: Salar → SUTAR (Workforce Integration)

**File:** `platform/twins/salar-os/src/modules/salarSutarBridge.ts`

**Flow:**
```
SUTAR needs workforce
    │
    └──→ POST /sutar/bridge/workforce-decision
            │
            ├── Query Capability Registry
            ├── Query Agent Twins
            ├── Query Human Twins
            └── Return ranked candidates
                    │
                    ▼
SUTAR executes
    │
    └──→ POST /sutar/bridge/assignment-execute
            │
            ├── Update agent capacity
            └── Notify Intent Bus
                    │
                    ▼
Outcome recorded
    │
    └──→ POST /sutar/bridge/outcome
            │
            ├── Update performance metrics
            ├── Update capability confidence
            └── Learn (ML pipeline)
```

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/sutar/bridge/workforce-decision` | Get workforce recommendations |
| POST | `/sutar/bridge/assignment-execute` | Execute assignment |
| POST | `/sutar/bridge/outcome` | Record outcome (learning) |
| POST | `/sutar/bridge/capability-check` | Check capability availability |
| POST | `/sutar/bridge/capacity-check` | Check workforce capacity |
| GET | `/sutar/bridge/agent/:corpId` | Get agent details |
| POST | `/sutar/bridge/simulation` | Workforce simulation |
| GET | `/sutar/bridge/health` | Bridge health |

**Environment Variables:**
```bash
SUTAR_DECISION_URL=http://localhost:4240
SUTAR_INTENT_BUS_URL=http://localhost:4154
SUTAR_GOAL_OS_URL=http://localhost:4242
SUTAR_ECONOMY_URL=http://localhost:4294
```

---

### Bridge 3: BLR → SUTAR/AgentOS (Install Pipeline)

**File:** `blr-ai-marketplace/services/marketplace-listings/src/webhooks/sutarInstallWebhook.ts`

**Flow:**
```
Stripe checkout completed
    │
    └──→ POST /webhooks/stripe/checkout-completed
            │
            ├── Get listing from BLR
            │
            ├── Trigger AgentOS deployment
            │   └──→ POST /api/agent/full-deploy
            │           │
            │           ├── Create agent in registry
            │           ├── Attach capabilities
            │           ├── Attach tools
            │           ├── Attach skills
            │           ├── Create context
            │           └── Start execution (if goal)
            │
            ├── Register in SUTAR ACN (if commerce agent)
            │   └──→ POST /api/agents (SUTAR network)
            │
            ├── Set up memory partition
            │   └──→ POST /api/memory/store
            │
            └── Record install
                └──→ POST /api/installs (BLR)
```

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/webhooks/stripe/checkout-completed` | Trigger install |
| POST | `/webhooks/stripe/subscription-renewed` | Extend access |
| POST | `/webhooks/stripe/subscription-cancelled` | Deactivate |

**Environment Variables:**
```bash
AGENT_OS_URL=http://localhost:4802
SUTAR_ACP_URL=http://localhost:4800
SUTAR_AGENT_NETWORK_URL=http://localhost:4801
SUTAR_TRUST_ENGINE_URL=http://localhost:4291
MEMORY_OS_URL=http://localhost:4703
```

---

### Bridge 4: AgentOS → CorpID/TwinOS (Identity)

**File:** `platform/agent-os/identity-bridge/src/index.js`

**Flow:**
```
Agent registered in AgentOS
    │
    ├──→ Create CorpID identity
    │   └──→ POST /api/identities/agent
    │           │
    │           └──→ CorpID (4702)
    │                   │
    │                   └──→ Agent has universal identity
    │
    └──→ Create TwinOS twin
        └──→ POST /api/twins/agent
                │
                └──→ TwinOS (4705)
                        │
                        └──→ Agent has digital twin
```

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/identity/corpid` | Create CorpID identity |
| PATCH | `/identity/corpid/:agentId` | Update identity |
| DELETE | `/identity/corpid/:agentId` | Archive identity |
| POST | `/identity/twinos` | Create TwinOS twin |
| PATCH | `/identity/twinos/:agentId` | Update twin |
| DELETE | `/identity/twinos/:agentId` | Archive twin |
| POST | `/identity/sync` | Sync to both |
| POST | `/identity/sync-all` | Sync all agents |
| POST | `/identity/trust-update` | Update trust |
| GET | `/identity/health` | Bridge health |

**Environment Variables:**
```bash
CORPID_URL=http://localhost:4702
TWINOS_URL=http://localhost:4705
AGENT_REGISTRY_URL=http://localhost:4803
```

---

## Service Port Map

| Service | Port | Role |
|---------|------|------|
| **SADA OS** | 4190 | Trust & Governance (TRUTH SOURCE) |
| **CorpID** | 4702 | Universal Identity |
| **MemoryOS** | 4703 | Persistent Memory |
| **TwinOS** | 4705 | Digital Twins |
| **Salar OS** | 4710 | Workforce Registry (AGENT REGISTRY) |
| **BLR Discovery** | 4256 | Marketplace Discovery Engine |
| **BLR Marketplace** | 4255 | Marketplace Listings |
| **SUTAR Decision** | 4240 | Decision Engine |
| **SUTAR Intent Bus** | 4154 | Intent Pub/Sub |
| **SUTAR Goal OS** | 4242 | Goal Management |
| **SUTAR Economy** | 4294 | Economy & Karma |
| **SUTAR ACN** | 4801 | Agent Network |
| **SUTAR Trust** | 4291 | Trust Engine |
| **AgentOS Gateway** | 4802 | Agent Platform Gateway |
| **Agent Registry** | 4803 | Agent Identity |
| **Agent Identity Bridge** | 4810 | CorpID/TwinOS Bridge |

---

## Startup Order

```bash
# 1. Foundation (start first)
corp-id-service         # Port 4702
memory-os              # Port 4703
twinos-hub             # Port 4705

# 2. Trust & Governance
sada-os                # Port 4190

# 3. Workforce Registry
salar-os                # Port 4710

# 4. Agent Runtime
agent-platform-api      # Port 4802
agent-registry         # Port 4803
agent-identity-bridge   # Port 4810

# 5. SUTAR OS
sutar-decision-engine   # Port 4240
sutar-intent-bus        # Port 4154
sutar-agent-network     # Port 4801
sutar-trust-engine      # Port 4291

# 6. BLR Marketplace
blr-discovery-engine    # Port 4256
marketplace-listings    # Port 4255
```

---

## Environment Variables Template

```bash
# === CORE FOUNDATION ===
CORPID_URL=http://localhost:4702
MEMORY_OS_URL=http://localhost:4703
TWINOS_URL=http://localhost:4705

# === TRUST & GOVERNANCE ===
SADA_URL=http://localhost:4190

# === SALAR OS (Workforce) ===
SALAR_URL=http://localhost:4710
SUTAR_DECISION_URL=http://localhost:4240
SUTAR_INTENT_BUS_URL=http://localhost:4154
SUTAR_GOAL_OS_URL=http://localhost:4242
SUTAR_ECONOMY_URL=http://localhost:4294

# === BLR MARKETPLACE ===
BLR_DISCOVERY_URL=http://localhost:4256
BLR_MARKETPLACE_URL=http://localhost:4255

# === AGENTOS ===
AGENT_OS_URL=http://localhost:4802
AGENT_REGISTRY_URL=http://localhost:4803

# === SUTAR OS ===
SUTAR_ACP_URL=http://localhost:4800
SUTAR_AGENT_NETWORK_URL=http://localhost:4801
SUTAR_TRUST_ENGINE_URL=http://localhost:4291

# === AUTH ===
INTERNAL_SERVICE_TOKEN=your-secure-token
JWT_SECRET=your-jwt-secret
```

---

## Verification Commands

```bash
# 1. Check Salar → BLR Bridge
curl http://localhost:4710/salar-bridge/blr/health

# 2. Check Salar → SUTAR Bridge
curl http://localhost:4710/sutar/bridge/health

# 3. Check AgentOS → CorpID/TwinOS Bridge
curl http://localhost:4810/identity/health

# 4. Index agent from Salar to BLR
curl -X POST http://localhost:4710/salar-bridge/blr/index \
  -H "Content-Type: application/json" \
  -d '{"agentTwin": {"agentId": "AGT-001", "name": "AI CFO", "capabilities": ["finance", "accounting"]}}'

# 5. Request workforce from SUTAR
curl -X POST http://localhost:4710/sutar/bridge/workforce-decision \
  -H "Content-Type: application/json" \
  -d '{"decisionId": "D-001", "requiredCapabilities": ["finance"]}'

# 6. Sync all agents to BLR
curl -X POST http://localhost:4710/salar-bridge/blr/listings/sync-all

# 7. Create agent identity (CorpID + TwinOS)
curl -X POST http://localhost:4810/identity/sync \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agt_xxx"}'

# 8. Sync all identities
curl -X POST http://localhost:4810/identity/sync-all
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          RTMN UNIFIED CIVILIZATION STACK                        │
└─────────────────────────────────────────────────────────────────────────────────┘

                           SADA OS (Trust/Governance)
                                    │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
               Trust Scores    Policy Enforce   Compliance
                                    │
                                    ▼
                           ┌────────────────────┐
                           │    SALAR OS        │
                           │  (Workforce Hub)    │
                           │    Port: 4710      │
                           └─────────┬──────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
     ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
     │ Agent Twins │      │Human Twins   │      │  Hybrid     │
     │             │      │             │      │  Teams      │
     └──────────────┘      └──────────────┘      └──────────────┘
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                │                ▼
         ┌─────────────────┐         │    ┌────────────────────┐
         │  BRIDGE 1       │         │    │  BRIDGE 2        │
         │  Salar → BLR    │         │    │  Salar → SUTAR   │
         └────────┬────────┘         │    └────────┬─────────┘
                  │                  │             │
                  ▼                  │             ▼
         ┌─────────────────┐          │    ┌────────────────────┐
         │  BLR MARKETPLACE │        │    │  SUTAR OS        │
         │  Port: 4255-4256 │        │    │  Ports: 4154-4294│
         └────────┬────────┘          │    └────────┬─────────┘
                  │                    │             │
                  │    ┌──────────────┘             │
                  │    │                            │
                  │    │         ┌──────────────────┘
                  │    │         │
                  ▼    ▼         ▼
         ┌──────────────────────────────────────┐
         │         BRIDGE 3                        │
         │   BLR → AgentOS/SUTAR (Install)        │
         └─────────────┬────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │         AGENTOS                       │
         │  (Runtime Infrastructure)            │
         │  Ports: 4802-4814                    │
         └─────────────┬────────────────────────┘
                       │
                       ▼
         ┌──────────────────────────────────────┐
         │         BRIDGE 4                       │
         │  AgentOS → CorpID + TwinOS            │
         │  Port: 4810                          │
         └─────────────┬────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
  ┌──────────────┐          ┌──────────────┐
  │   CorpID     │          │   TwinOS     │
  │   Port: 4702 │          │   Port: 4705 │
  └──────────────┘          └──────────────┘
```

---

## Key Principles

1. **SADA is the truth source** — Trust scores come from SADA, flow to all systems
2. **Salar is the agent registry** — All agents registered in Salar, operated by SUTAR
3. **BLR is the marketplace** — One unified marketplace for all agents
4. **AgentOS is the runtime** — Every agent runs on AgentOS infrastructure
5. **CorpID + TwinOS for identity** — Every agent has universal identity and digital twin

---

*Document Version: 1.0 | Last Updated: June 30, 2026*
