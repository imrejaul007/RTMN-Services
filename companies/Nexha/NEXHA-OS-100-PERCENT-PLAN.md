# Nexha OS — Make It 100% (Implementation Plan)

**Date:** 2026-06-25
**Goal:** Deployable, self-hostable Nexha OS from zero dependencies
**Approach:** Ship Phase E.1 first (runtime that actually deploys), then P1 services

---

## Phase 0: Resolve Port Registry (Foundation)

**Problem:** Three conflicting port maps across docs, docker-compose, and dev-stack.
Decision: Docker runtime is canonical for Nexha OS. Dev-stack serves local dev only.

| Service | Nexha OS Runtime | Dev Stack | Canonical |
|---|---|---|---|
| Nexha Gateway | **5000** | 5002 | 5000 |
| CapabilityOS | **4350** | 4270 | 4350 |
| ACP Messaging | **4340** | 4340 | 4340 |
| ReputationOS | **4271** | 4271 | 4271 |
| DiscoveryOS | **4272** | 4272 | 4272 |
| FederationOS | **4273** | 4273 | 4273 |
| OpportunityOS | **4274** | 4274 | 4274 |
| MarketOS | **4275** | 4275 | 4275 |
| Global Directory | **4276** | 4276 | 4276 |
| Supplier Network | **4280** | 4280 | 4280 |
| Distribution Network | **4285** | 4285 | 4285 |
| Pricing Network | **4286** | 4286 | 4286 |
| Trade Finance | **4287** | 4287 | 4287 |
| Warehouse Network | **4288** | 4288 | 4288 |
| Autonomous Logistics | **4293** | 4293 | 4293 |
| Reputation OS | **4271** | 4271 | 4271 |
| Negotiation Engine (SUTAR) | **4293** | — | conflict ❌ |
| Trust Engine (SUTAR) | **4291** | — | 4291 |
| Contract OS (SUTAR) | **4292** | — | 4292 |
| Economy OS (SUTAR) | **4294** | — | 4294 |
| Gateway (SUTAR) | **4140** | — | 4140 |

**Critical conflict:** `nexha-autonomous-logistics` (4293) and `sutar-negotiation-engine` (4293) both use port 4293 in the runtime. Resolution: rename SUTAR service in runtime to port 4295.

---

## Phase A: Fix Nexha OS Runtime Docker Compose (Local Build Mode)

**Problem:** All 18 `image:` references point to `ghcr.io/rtmn/...` that don't exist.
**Solution:** Replace all `image:` with `build:` so Docker Compose builds locally without needing GHCR.

### Step A.1: Move runtime into Nexha company dir
```
From: /Users/rejaulkarim/Documents/RTMN/nexha-os-runtime/
To:   /Users/rejaulkarim/Documents/RTMN/companies/Nexha/nexha-os-runtime/
```

### Step A.2: Create Dockerfiles for 6 missing services

Each service gets a `Dockerfile` in its directory. Two patterns:

**Pattern 1 — Pure JS (no build step):**
```dockerfile
# nexha-acp-messaging/Dockerfile, nexha-business-directory/Dockerfile,
# nexha-mission-planner/Dockerfile, nexha-partner-graph/Dockerfile,
# nexha-commerce-runtime/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER nodejs
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:${PORT}/health || exit 1
EXPOSE ${PORT}
CMD ["node", "src/index.js"]
```

**Pattern 2 — TypeScript (build step):**
```dockerfile
# nexha-gateway/Dockerfile (fix the broken one)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY --from=builder --chown=nexha:nexha /app/dist ./dist
COPY --from=builder --chown=nexha:nexha /app/node_modules ./node_modules
COPY package*.json ./
USER nexha
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:5000/health || exit 1
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

### Step A.3: Update docker-compose.yml to use local builds

Replace ALL `image: ghcr.io/rtmn/...` with `build: <context>` pointing to the correct source directory.

For services built from Nexha company monorepo:
```yaml
nexha-gateway:
  build:
    context: ../services/nexha-gateway
    dockerfile: Dockerfile
  ports: ["5000:5000"]
  environment: [...]
  networks: [nexha-internal]
```

For services from HOJAI-AI submodule:
```yaml
sutar-gateway:
  build:
    context: ../HOJAI-AI/sutar-os/core/sutar-gateway
    dockerfile: Dockerfile
  ports: ["4140:4140"]
  environment: [...]
```

For Foundation services (CorpID, MemoryOS, TwinOS):
```yaml
corp-id:
  build:
    context: ../HOJAI-AI/platform/corpid-service
    dockerfile: Dockerfile
  ports: ["4702:4702"]
  networks: [nexha-internal]
```

### Step A.4: Fix the port conflict
Rename sutar-negotiation-engine in runtime to port 4295, update prometheus.yml and all env var references accordingly.

### Step A.5: Verify compose builds
```bash
cd companies/Nexha/nexha-os-runtime
docker compose --profile lite config  # validate YAML
docker compose --profile lite build  # build all lite images
docker compose --profile lite up -d  # start lite tier
docker compose ps
docker compose --profile lite down
```

---

## Phase B: Build nexha-cli (Node.js Commander)

**Problem:** `nexha-cli` is 0 lines of code. Only bash scripts exist.

### CLI Architecture

```
nexha-cli/
├── package.json           # name: nexha-cli, bin: nexha
├── src/
│   ├── index.ts          # commander.js setup, version, global flags
│   ├── commands/
│   │   ├── init.ts       # nexha init [--name X] [--tier lite|standard|enterprise]
│   │   ├── register.ts   # nexha register [--federation-url X]
│   │   ├── federate.ts    # nexha federate <peer-nexha-url>
│   │   ├── status.ts      # nexha status [--watch]
│   │   ├── update.ts      # nexha update [--check|--apply]
│   │   └── backup.ts     # nexha backup [--output path]
│   ├── lib/
│   │   ├── api-client.ts  # HTTP client with retry + auth
│   │   ├── compose.ts     # docker compose wrapper
│   │   ├── provision.ts    # first-boot provisioning logic
│   │   └── federation.ts   # federation handshake logic
│   └── types.ts
├── README.md
└── .npmrc                 # for publishing
```

### Commands

| Command | What it does |
|---|---|
| `nexha init` | Interactively configure .env, pull images, start containers |
| `nexha register` | POST to FederationOS to register this Nexha |
| `nexha federate` | ACP handshake with a peer Nexha |
| `nexha status` | Health check all services (wraps health-check.sh) |
| `nexha update` | Pull latest images, rolling restart |
| `nexha backup` | Snapshot data volumes to tar.gz |
| `nexha logs` | Stream logs from all containers |
| `nexha destroy` | Stop + remove all containers + volumes |

### Implementation
- **Framework:** `commander.js` + `ora` (spinners) + `chalk` (colors) + `inquirer` (interactive prompts)
- **Docker interaction:** spawn `docker compose` as child process
- **Auth:** reads `.env` for NEXHA_INTERNAL_TOKEN
- **Output:** JSON mode (`--json`) for scripting

---

## Phase C: Auto-Provisioning on First Boot

**Problem:** Spec says CorpID + 8 default SUTAR agents + CapabilityOS init + ReputationOS baseline should auto-run. None exist.

### What auto-provisions on first run

```
1. Wait for all services to be healthy
2. Call CorpID API → issue Nexha's CorpID token
3. Call SUTAR Gateway → spawn 8 default agents:
   - NexhaCEO (strategy, oversight)
   - SalesAgent (lead gen, outreach, negotiation)
   - ProcurementAgent (supplier discovery, RFQ)
   - FinanceAgent (cash flow, pricing)
   - LegalAgent (contract review, compliance)
   - MarketingAgent (campaign, brand)
   - SupportAgent (tickets, CS)
   - LogisticsAgent (fulfillment, tracking)
4. Call CapabilityOS → register this Nexha's capabilities
5. Call ReputationOS → set baseline ACI = 40 (Stage 1: New Entrant)
6. Write NEXHA_ID + tokens to .env
7. Done — print dashboard URL
```

### Implementation
Add `scripts/provision.sh` (called by `nexha init` after compose up):
```bash
#!/bin/bash
set -e
source .env

echo "Waiting for services to be healthy..."
bash scripts/health-check.sh --wait-healthy

echo "Provisioning first-boot..."
node scripts/provision.js  # calls APIs
```

Or better — implement the provisioning logic inside `nexha-cli` as a TypeScript module, callable both as CLI and as an importable library.

---

## Phase D: Build 4 Missing Network Services

These 4 are referenced in the spec (Phase F) but have zero code.

### D.1 nexha-contract-network (port 4289)
**Purpose:** Smart contracts, e-signature, contract templates, lifecycle management
**Scope:**
- Contract template library (MSA, NDA, SOW, Supply Agreement)
- E-signature flow (OTP/email verification)
- Contract lifecycle: draft → review → sign → execute → amend → terminate
- Integration with SUTAR Contract OS for AI contract review
- Version history + audit log

**Implementation path:** Start from `nexha-commerce-runtime` (118 tests) as template. Add contract-specific routes and state machine.

### D.2 nexha-compliance-network (port 4290)
**Purpose:** Country-specific compliance, sanctions screening, ESG verification
**Scope:**
- Sanctions list check (OFAC, UN, EU, India MCX)
- KYC/KYB verification
- ESG score check
- Import/export license validation
- Auto-block transactions from sanctioned entities

**Implementation path:** Lightweight — mostly HTTP calls to external APIs + in-memory state. Start from `nexha-reputation-os` pattern (23 tests).

### D.3 nexha-payment-network (port 4291)
**Purpose:** Multi-currency payments, FX conversion, escrow, payouts
**Scope:**
- Escrow hold/release (integrates with SUTAR Economy OS)
- FX conversion (integrates with SUTAR Economy OS)
- Payout scheduling
- Multi-currency ledger
- Integration with RABTUL (the payment rail company)

**Implementation path:** State machine pattern from `nexha-commerce-runtime`. Most logic delegates to SUTAR Economy OS.

### D.4 nexha-partner-network (port 4292)
**Purpose:** Franchise, distribution, OEM partner management — network-level partner types
**Scope:**
- Partner tier management (gold, silver, bronze)
- Revenue sharing rules
- Territory management
- Partner onboarding checklist
- Integration with `nexha-partner-graph` (4363) for operational data

**Implementation path:** Extend `nexha-partner-graph` or build as a separate network-layer service.

---

## Phase E: Build nexha-agent-marketplace (port 4250)

**Problem:** Referenced in docker-compose but zero code exists.
**Purpose:** Marketplace for buying/selling AI agents, skill packs, and workflows.
**Scope:**
- Agent listing (name, description, price, category, rating)
- Search + filter (by capability, price, rating, category)
- Purchase flow → creates agent instance
- Reviews + ratings
- Seller dashboard
- Integration with SUTAR Discovery Engine for agent capability matching

**Implementation path:** Start from `nexha-business-directory` (68 tests) as the closest existing pattern.

---

## Phase F: Fix nexha-gateway Dockerfile (Critical Bug)

**Problem:** Current Dockerfile at `nexha-os-runtime/Dockerfile` is broken — it tries to `node dist/index.js` but never runs `npm run build` and copies from the wrong directory.

**Fix:**
1. Create `nexha-gateway/Dockerfile` in the service directory (Pattern 2 above)
2. Update docker-compose to reference `../services/nexha-gateway` as build context
3. The existing `nexha-os-runtime/Dockerfile` becomes a NO-OP reference

---

## Phase G: Update docs to reflect canonical state

- Update `Nexha/CLAUDE.md` to reflect the resolved port registry
- Create `Nexha/nexha-os-runtime/README.md` with the new local-build workflow
- Document the relationship between `nexha-os-runtime/` (Docker runtime) and `companies/Nexha/` (source monorepo)

---

## Implementation Order (What to Build First)

```
Week 1: Phase 0 (port registry) + Phase A (docker-compose local builds)
         → Can deploy Nexha OS from source TODAY

Week 2: Phase F (fix nexha-gateway Dockerfile)
         → Gateway builds correctly

Week 3: Phase B (nexha-cli v1 — init, status, logs, destroy)
         → Usable CLI for operators

Week 4: Phase C (auto-provisioning)
         → First-boot automation complete

Week 5: Phase D (4 missing services — start with simplest)
         → Full enterprise tier coverage

Week 6: Phase E (agent-marketplace)
         → All referenced services exist

Week 7: Phase G (docs + polish)
         → Shippable product
```

---

## Files to Create (Complete List)

| File | Phase | Type |
|---|---|---|
| `services/nexha-gateway/Dockerfile` | F | Dockerfile |
| `services/nexha-acp-messaging/Dockerfile` | A | Dockerfile |
| `services/nexha-business-directory/Dockerfile` | A | Dockerfile |
| `services/nexha-mission-planner/Dockerfile` | A | Dockerfile |
| `services/nexha-partner-graph/Dockerfile` | A | Dockerfile |
| `services/nexha-commerce-runtime/Dockerfile` | A | Dockerfile |
| `nexha-os-runtime/docker-compose.yml` (rewritten) | A | Docker Compose |
| `nexha-os-runtime/scripts/provision.sh` | C | Shell script |
| `nexha-cli/package.json` | B | npm package |
| `nexha-cli/src/index.ts` | B | CLI entry |
| `nexha-cli/src/commands/init.ts` | B | Command |
| `nexha-cli/src/commands/register.ts` | B | Command |
| `nexha-cli/src/commands/federate.ts` | B | Command |
| `nexha-cli/src/commands/status.ts` | B | Command |
| `nexha-cli/src/commands/update.ts` | B | Command |
| `nexha-cli/src/commands/backup.ts` | B | Command |
| `nexha-cli/src/commands/destroy.ts` | B | Command |
| `nexha-cli/src/lib/api-client.ts` | B | Library |
| `nexha-cli/src/lib/compose.ts` | B | Library |
| `nexha-cli/src/lib/provision.ts` | B | Library |
| `nexha-cli/src/lib/federation.ts` | B | Library |
| `nexha-cli/src/types.ts` | B | Types |
| `nexha-cli/README.md` | B | Docs |
| `services/nexha-contract-network/` (entire dir) | D1 | New service |
| `services/nexha-compliance-network/` (entire dir) | D2 | New service |
| `services/nexha-payment-network/` (entire dir) | D3 | New service |
| `services/nexha-partner-network/` (entire dir) | D4 | New service |
| `services/nexha-agent-marketplace/` (entire dir) | E | New service |
| `nexha-os-runtime/docs/ARCHITECTURE.md` | G | Docs |
| `nexha-os-runtime/docs/DEPLOYMENT.md` | G | Docs |
| `Nexha/CLAUDE.md` (updated) | G | Docs |
| `Nexha/CANONICAL-PORT-REGISTRY.md` | G | Docs |

**Total new files: ~35**

---

## What NOT to Build (Scope Boundaries)

Per the spec, these are OUTSIDE Nexha OS:
- SUTAR OS source code (lives in HOJAI-AI/sutar-os/)
- Foundation services (CorpID, MemoryOS, TwinOS — built by HOJAI AI)
- RABTUL payment rails (separate company)
- KHAIRMOVE logistics (separate company)
- HOJAI Foundry (startup generator platform)
- Consumer apps (do-app, mobile)
- The GHCR publishing pipeline (CI/CD) — build locally for now
