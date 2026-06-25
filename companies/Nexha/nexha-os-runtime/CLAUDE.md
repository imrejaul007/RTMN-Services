# Nexha OS Runtime — Developer Guide

> The **self-hostable Docker bundle** of Nexha OS. One command gets you a fully operational Nexha node.

**Version:** 1.5.0 | **CLI:** `nexha` (in `cli/`) | **Compose:** `docker compose --profile <tier>`

---

## Quick Start

```bash
# 1. Initialize (creates .env, starts containers, auto-provisions)
cd nexha-os-runtime
nexha init --tier standard

# 2. Register with federation
nexha register

# 3. Check status
nexha status

# 4. Federate with a peer
nexha federate <peer-id> --capabilities manufacturing,logistics
```

Or use the shell scripts directly:

```bash
bash scripts/init.sh --tier standard
bash scripts/join-federation.sh
bash scripts/health-check.sh
```

---

## Architecture

### Three tiers

| Tier | Profile | RAM | Foundation services |
|------|---------|-----|---------|
| **Lite** | `--profile lite` | ~1 GB | CorpID + MemoryOS + TwinOS + Nexha Gateway |
| **Standard** | `--profile standard` | ~4 GB | All Lite + SUTAR OS + 8 Nexha network services |
| **Enterprise** | `--profile enterprise` | ~8 GB | All Standard + CapabilityOS + ACP Messaging + Mission Planner + Prometheus + Grafana |

### Service map

```
nexha-os-runtime/
├── docker-compose.yml          # Main compose (all tiers)
├── docker-compose.lite.yml     # Lite overrides (disables SUTAR + network)
├── docker-compose.standard.yml  # Standard overrides
├── docker-compose.enterprise.yml # Enterprise overrides
├── config/
│   └── prometheus.yml          # Scrape configs for all services
├── services/                   # HOJAI-AI service stubs (see stubs below)
│   ├── corp-id/Dockerfile
│   ├── memory-os/Dockerfile
│   ├── twinos-hub/Dockerfile
│   ├── sutar-gateway/Dockerfile
│   ├── sutar-trust-engine/Dockerfile
│   ├── sutar-contract-os/Dockerfile
│   ├── sutar-negotiation-engine/Dockerfile
│   └── sutar-economy-os/Dockerfile
└── scripts/
    ├── init.sh                 # Full initialization + Docker start
    ├── provision.sh           # Auto-provision (CorpID identity + 8 agents)
    ├── join-federation.sh     # Register with federation endpoint
    └── health-check.sh        # Service health check
```

### Complete port map

| Port | Service | Tier | Notes |
|------|---------|------|-------|
| 5002 | Nexha Gateway | All | Public API entry point |
| 4702 | CorpID | All | Universal identity |
| 4703 | MemoryOS | All | Multi-tier AI memory |
| 4705 | TwinOS Hub | All | Digital twins platform |
| 4140 | SUTAR Gateway | Standard+ | Autonomous commerce gateway |
| 4291 | Trust Engine | Standard+ | Trust scoring (SUTAR) |
| 4292 | Contract OS | Standard+ | Smart contracts (SUTAR) |
| 4295 | Negotiation Engine | Standard+ | Multi-party negotiation (SUTAR, port 4293 reserved) |
| 4294 | Economy OS | Standard+ | Economic layer (SUTAR) |
| 4270 | CapabilityOS | Enterprise | Capability registry |
| 4273 | FederationOS | All | Federation management |
| 4280 | Supplier Network | Standard+ | Supplier discovery |
| 4297 | Partner Network | Standard+ | Partner relationship management |
| 4281 | Supplier Registry | Standard+ | Trade lifecycle (KYB→contract→PO→payment) |
| 4285 | Distribution Network | Standard+ | Channel management |
| 4286 | Pricing Network | Standard+ | Market price aggregation |
| 4287 | Trade Finance | Standard+ | Escrow + payment settlement |
| 4288 | Warehouse Network | Standard+ | Slot booking + WMS |
| 4340 | ACP Messaging | Enterprise | AI-to-AI messaging |
| 4360 | Business Directory | Standard+ | Business listings |
| 4362 | Mission Planner | Enterprise | Multi-agent mission coordination |
| 4363 | Partner Graph | Standard+ | Partner relationships |
| 4364 | Commerce Runtime | Standard+ | Trade operations |
| 9090 | Prometheus | Enterprise | Metrics collection |
| 3030 | Grafana | Enterprise | Dashboards |

### Build contexts

Two source locations:

1. **Nexha monorepo** (`companies/Nexha/services/<name>`) — built via `context: ../services/<name>`
2. **HOJAI-AI submodule** (`../../../HOJAI-AI/<path>`) — see `services/*/Dockerfile` comments for exact build commands

> **Note:** HOJAI-AI is a git submodule. If it's not initialized (`ls companies/HOJAI-AI/` is empty), clone it first:
> ```bash
> git submodule update --init --recursive
> ```
> The stub Dockerfiles in `services/` document the exact build context + dockerfile path for each HOJAI-AI service.

---

## Docker Compose Profiles

```bash
# Build all images (run once or after source changes)
docker compose build

# Start tiers
docker compose --profile lite up -d
docker compose --profile standard up -d       # most common
docker compose --profile enterprise up -d

# Start with override files (profile-based separation)
docker compose -f docker-compose.yml -f docker-compose.lite.yml up -d

# Stop
docker compose down

# Full reset (removes volumes)
docker compose down -v
```

---

## Auto-Provisioning

On first `nexha init` or `bash scripts/init.sh`, the `provision.sh` script runs automatically:

1. Waits for CorpID to be healthy
2. Creates Nexha identity in CorpID
3. Seeds 8 foundational agents (orchestrator, matchmaker, negotiator, monitor, security, discovery, analytics, comms)
4. Initializes CapabilityOS (enterprise tier)
5. Writes `.nexha-provisioned` marker

Re-running is idempotent — it checks for `.nexha-provisioned` and skips if already done.

---

## CLI Reference

```bash
nexha init [--tier lite|standard|enterprise] [--force] [--no-docker]
nexha register [--url <fed-url>] [--dry-run]
nexha federate <target-id> [--capabilities <list>] [--data-sharing aggregated|summary|detailed]
nexha status [--watch] [--json]
nexha update [--images-only]
nexha backup [--output <dir>] [--encrypt]
nexha destroy [--force] [--keep-data]
nexha logs [service] [--follow] [--tail <n>]
nexha -r <runtime-dir> ...   # specify runtime path
```

### Programmatic (Node.js)

```javascript
import { findRuntimeDir, loadEnv, getDockerCommand, serviceHealth } from './utils.js';
const runtime = findRuntimeDir(); // auto-detects nexha-os-runtime dir
const env = loadEnv(runtime);
const health = serviceHealth(runtime, 5002, '/health');
```

---

## HOJAI-AI Service Stubs

The following services are expected from `companies/HOJAI-AI/` (a git submodule). Their Dockerfiles live in `nexha-os-runtime/services/` as build documentation:

| Dockerfile | HOJAI-AI source | Port | Build from nexha-os-runtime/ |
|-----------|-----------------|------|------------------------------|
| `services/corp-id/Dockerfile` | `HOJAI-AI/platform/identity/corpid-service/` | 4702 | `docker build -f services/corp-id/Dockerfile ../../../HOJAI-AI/platform/identity/corpid-service/` |
| `services/memory-os/Dockerfile` | `HOJAI-AI/platform/memory/memory-os/` | 4703 | `docker build -f services/memory-os/Dockerfile ../../../HOJAI-AI/platform/memory/memory-os/` |
| `services/twinos-hub/Dockerfile` | `HOJAI-AI/platform/twins/twinos-hub/` | 4705 | `docker build -f services/twinos-hub/Dockerfile ../../../HOJAI-AI/platform/twins/twinos-hub/` |
| `services/sutar-gateway/Dockerfile` | `HOJAI-AI/sutar-os/core/sutar-gateway/` | 4140 | `docker build -f services/sutar-gateway/Dockerfile ../../../HOJAI-AI/sutar-os/core/sutar-gateway/` |
| `services/sutar-trust-engine/Dockerfile` | `HOJAI-AI/sutar-os/core/sutar-trust-engine/` | 4291 | `docker build -f services/sutar-trust-engine/Dockerfile ../../../HOJAI-AI/sutar-os/core/sutar-trust-engine/` |
| `services/sutar-contract-os/Dockerfile` | `HOJAI-AI/sutar-os/contracts/sutar-contract-os/` | 4292 | `docker build -f services/sutar-contract-os/Dockerfile ../../../HOJAI-AI/sutar-os/contracts/sutar-contract-os/` |
| `services/sutar-negotiation-engine/Dockerfile` | `HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/` | 4295 | `docker build -f services/sutar-negotiation-engine/Dockerfile ../../../HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/` |
| `services/sutar-economy-os/Dockerfile` | `HOJAI-AI/sutar-os/economy/sutar-economy-os/` | 4294 | `docker build -f services/sutar-economy-os/Dockerfile ../../../HOJAI-AI/sutar-os/economy/sutar-economy-os/` |

Each stub Dockerfile documents the exact build command in its header comment. They are also valid Dockerfiles that work once the HOJAI-AI submodule is populated.

---

## Missing Services (Phase D/E backlog)

These services exist in the spec but are stubbed/pending:

| Service | Port | Status |
|---------|------|--------|
| **nexha-agent-marketplace** | 4250 | Stub (`nginx:alpine`) — Phase E implements |
| **nexha-contract-network** | 4289 | Missing — implement with SUTAR Contract OS integration |
| **nexha-compliance-network** | 4290 | Missing — compliance + KYB service |
| **nexha-payment-network** | 4291 | Missing — payment orchestration (use RABTUL) |
| **nexha-partner-network** | 4297 | ✅ Implemented (moved from 4292 to avoid conflict with Contract OS)

---

## Troubleshooting

**Build fails — HOJAI-AI submodule empty:**
```bash
git submodule update --init --recursive
```

**Port already in use:**
```bash
lsof -i :5002   # or whatever port
```

**Containers won't start:**
```bash
docker compose logs <service-name>
```

**Full reset:**
```bash
nexha destroy --force
nexha init --tier standard --force
```
