# RTMN Ecosystem

> **One-pager.** Last updated 2026-06-22.

RTMN is a unified ecosystem connecting **70+ services** across industry verticals (26), department OS (9), foundation (4), TwinOS (15), SUTAR OS (25), Nexha (8), and consumer apps (do-app, REZ-App). All traffic flows through one front door — the **Hub at port 4399**.

> **The honest version of this README is here:** [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md). The longer aspirational [README.md](README.md) describes the vision; this file describes what actually runs today.

---

## 30-second tour

```bash
git clone https://github.com/imrejaul007/RTMN-Services
cd RTMN-Services

# Start the four-service dev stack
bash scripts/dev-stack.sh start

# Run the end-to-end demo (Hub → SUTAR → Nexha)
bash demos/full-stack-demo.sh

# Tear it down
bash scripts/dev-stack.sh stop
```

If you have Docker: `docker compose -f docker-compose.dev.yml up --build` instead.

---

## What's actually shipped (Phase A+B+C+D + C.5 + Nexha OS, 2026-06-22)

| Layer | Status | Evidence |
|---|---|---|
| **RTMN Unified Hub** (:4399) | ✅ Running | `/health` 200, `/api/sutar/capabilities` 16 services, `/api/nexha/capabilities` 8 services |
| **SUTAR OS** (3 services hardened) | ✅ Running | sutar-economy-os 105 tests, sutar-trust-engine 37 tests, sutar-contract-os 179 tests + 1 bug fix |
| **do-app mobile + backend** | ✅ Running | Mobile autopilot tab shipped, backend `nexha` client with 7 unit tests |
| **Nexha routes** | ✅ Wired | 8 services reachable through `/api/nexha/<service>/<path>` |
| **Nexha warehouse network** (:4288) | ✅ Phase C.5 | nexha-warehouse-network: 49 unit tests, 6 seeded Indian warehouses, slot booking + WMS (bins, stock, transfers, pick lists) |
| **Nexha supplier registry** (:4280) | ✅ Phase C.1 | nexha-supplier-network: 20 unit tests, capability-matched supplier discovery |
| **Nexha logistics** (:4285) | ✅ Phase C.2 | nexha-distribution-network: 22 unit tests, multi-carrier shipping quotes + booking |
| **Nexha pricing intelligence** (:4286) | ✅ **Phase C.6** | nexha-pricing-network: market price aggregation, comparison, dynamic pricing recommendations — used by do-app autopilot for "buy groceries" flows |

> **ADR-0009 Phase 0 (2026-06-22):** The 3 L1 stubs (procurement-os :4320, distribution-os :4300, trade-finance :4340) were **deleted** — their functionality is fully covered by the 5 Phase C services now in Nexha. The 5 Phase C services were moved from `HOJAI-AI/sutar-os/core/sutar-*` to `companies/Nexha/services/nexha-*` and renamed. Old `sutar-*` names are kept as deprecation aliases on the Hub until Phase 1.
| **Nexha franchise / manufacturing upstreams** | ❌ Stub-only | Hub proxy plumbing works; upstream services still scaffold |
| **TwinOS Phase 5** | ✅ Shipped | `recordTransition`, `merge`, `diff` primitives; 14 twins wired |
| **24 Industry OS** | 🟡 Mostly scaffold | See [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) |

The services that ship in dev-stack.sh:

| Service | Port | Tests | Use case |
|---|---:|---:|---|
| `sutar-decision-engine` | 4290 | — | Multi-option ranking (`POST /api/v1/rank`) |
| `sutar-trust-engine` | 4291 | 37 | Trust scoring + SADA federation health probe |
| `sutar-economy-os` | 4294 | 105 | Transactions, billing, earnings, leaderboard |
| `nexha-warehouse-network` | 4288 | 49 | Warehouse discovery, slot booking, WMS (bins/stock/transfers/picks) |
| `nexha-pricing-network` | 4286 | 31 | Market price aggregation, comparison, dynamic pricing recommendations |
| `nexha-supplier-network` | 4280 | 20 | Supplier discovery/registry, capability-matched |
| `nexha-distribution-network` | 4285 | 22 | Multi-carrier shipping quotes + booking |
| `nexha-trade-finance-network` | 4287 | 38 | Credit offer engine + loan lifecycle with risk-adjusted APR |

---

## What's on the Hub

```
http://localhost:4399
├── /health                       # Hub liveness
├── /ready                        # Hub readiness
├── /api/services                 # Service registry
│
├── /api/sutar/capabilities       # SUTAR capability → service map
├── /api/sutar/<service>/<path>   # → 16 SUTAR services
│
└── /api/nexha/capabilities       # Nexha capability → service map
└── /api/nexha/<service>/<path>   # → 8 Nexha services
```

Anything not under `/api/sutar/*` or `/api/nexha/*` is the Hub's own connector routes (messaging, correlation, etc.).

---

## Where the code lives

```
RTMN/
├── CLAUDE.md                     # Architecture + policy (read this)
├── STATUS-AND-REMAINING-WORK.md  # Honest status audit
├── ROADMAP-TO-VISION.md          # 10-week plan, mid-execution
├── docs/ADR/                     # Architecture decision records
├── demos/full-stack-demo.sh      # End-to-end smoke test
├── scripts/dev-stack.sh          # One-command stack start/stop
├── docker-compose.dev.yml        # Same stack via Docker
│
├── companies/
│   ├── HOJAI-AI/                 # AI platform (submodule)
│   │   ├── sutar-os/             # Autonomous economic layer
│   │   ├── platform/twins/       # TwinOS (15 services)
│   │   ├── platform/trust/       # SADA OS (trust backbone)
│   │   └── shared/               # @rtmn/shared — auth, persistent map, shutdown
│   ├── RABTUL-Technologies/      # Hub source (REZ-ecosystem-connector)
│   ├── do-app/                   # Consumer mobile + backend (submodule)
│   ├── Nexha/                    # Commerce network (submodule)
│   └── [20+ other companies]     # AdBazaar, REZ-Merchant, etc.
│
└── industry-os/services/         # 24 industry OS + 9 department OS
```

---

## External clients (NOT RTMN)

These companies are clients of HOJAI AI. Their code lives at the RTMN repo root for convenience, but it is **opaque** — we don't audit, modify, or reference it. See `CLAUDE.md` § External Clients Policy.

- **Leverge** (ports 4761-4765)
- **StayOwn-Hospitality**
- **REZ-Merchant** (parts of it)

---

## What to read next

| If you want to... | Read |
|---|---|
| Understand the architecture | [CLAUDE.md](CLAUDE.md) |
| Know what actually runs | [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) |
| See the 10-week plan | [ROADMAP-TO-VISION.md](ROADMAP-TO-VISION.md) |
| Understand a specific decision | [docs/ADR/](docs/ADR/) |
| Start the stack | This README, top of file |
| Get a one-shot demo | `bash demos/full-stack-demo.sh` |

---

*Generated 2026-06-22 by the Phase E push. For corrections, open a PR against this file.*