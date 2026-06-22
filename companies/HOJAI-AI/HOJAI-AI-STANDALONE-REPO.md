# HOJAI AI — Standalone Repository

> **Status:** ✅ Extracted from RTMN-Services on June 20, 2026
> **Source repo:** [imrejaul007/RTMN-Services](https://github.com/imrejaul007/RTMN-Services)
> **Original path in RTMN-Services:** `companies/HOJAI-AI/`
> **Extraction method:** `git subtree split --prefix=companies/HOJAI-AI` (preserves full history)

---

## What This Repo Is

This is the **standalone git home of HOJAI AI** — the AI infrastructure company that powers RTMN and external customers (Leverge, Nexha, StayOwn-Hospitality).

It contains all HOJAI AI runtime services, the divisions strategy docs, the shared library, the start-all script, the smoke test, and the external-client (Leverge) docs.

## Architecture (3 Layers)

```
┌────────────────────────────────────────────────────────────────┐
│  LAYER 1 — HOJAI AI INFRASTRUCTURE                            │
│  TwinOS · MemoryOS · SkillOS · CorpID · AI Intelligence       │
│  + 15 twins + 5 data/knowledge services                       │
│  → services/                                                   │
├────────────────────────────────────────────────────────────────┤
│  LAYER 2 — HOJAI AI PRODUCTS                                   │
│  Genie suite · Copilots · Razo Keyboard · ACN · SUTAR OS      │
│  Marketplace · Workflows · Onboarding                          │
│  → services/                                                   │
├────────────────────────────────────────────────────────────────┤
│  LAYER 3 — RTMN OPERATIONAL SYSTEMS                           │
│  Department OS · Industry OS · RTMN Hub                       │
│  → lives in imrejaul007/RTMN-Services (consumes HOJAI AI)     │
└────────────────────────────────────────────────────────────────┘
```

## Repo Contents

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Root context for Claude Code — what's where, important rules |
| `README.md` | Marketing copy for the HOJAI AI brand |
| `services/` | **121 runtime services** organized by division |
| `divisions/` | **13 division strategy docs** (foundation → sutar-os) |
| `shared/` | Shared library used by all HOJAI AI services |
| `leverge/` | External-client docs (Leverge — DO NOT MODIFY unless requested) |
| `blr-ai-marketplace/` | Flagship marketplace (Next.js + Stripe) — package.json + docs only |
| `start-all.sh` | Start all services in dependency order |
| `smoke-test.sh` | End-to-end health check for all services |

## Quick Start

```bash
# Start everything
./start-all.sh

# Health check
./smoke-test.sh

# Start a specific service
cd services/<service-name> && npm install && npm start
```

## Service Inventory (121 services)

Grouped by category:
- **Foundation** (~10): corpid-service, memory-os, twinos-hub, skill-os, ai-intelligence, …
- **Twins** (~17): customer-twin, order-twin, wallet-twin, employee-twin, … (all under services/)
- **Intelligence** (~10): ai-intelligence, customer-intelligence, decision-intelligence, …
- **Copilots** (~7): business, marketing, sales, finance, support, executive, agent
- **Genie Suite** (~23): genie-gateway + 22 Genie OS modules + services
- **ACN + Agent Cloud** (~14): acp-protocol, acn-hub, agent-marketplace, agent-wallets, …
- **SUTAR OS** (~13): usage-tracker, intent-bus, simulation-os, discovery-engine, …
- **Training Platform** (~9): inference-gateway, fine-tuning-pipeline, gpu-cluster-manager, …
- **Data & Knowledge** (~5): vector-db, rag-platform, graph-database, knowledge-extraction, document-intelligence
- **Cross-cutting**: graphql-federation, trust-intelligence, sla-manager, …

Total: **121 services + 13 divisions + shared lib**.

## External Client Policy

**Leverge is a CLIENT of HOJAI AI, not part of HOJAI AI or RTMN.**

| Aspect | Rule |
|--------|------|
| Ownership | Leverge code belongs to Leverge |
| Folder | `leverge/` (client-folder stub only) |
| Audits | NEVER audit Leverge unless specifically requested by client |
| Modifications | NEVER modify Leverge code unless client explicitly requests |
| Reserved ports | 4761–4765 for Leverge (do not assign to HOJAI AI services) |

## Relationship to RTMN

```
RTMN-Services (imrejaul007/RTMN-Services)
├── services/                          # RTMN Department OS (sales-os, marketing-os, …)
├── industry-os/services/              # RTMN Industry OS (restaurant-os, hotel-os, …)
└── companies/HOJAI-AI/                # ← THIS REPO (now a git submodule)
    ├── services/                      # 121 HOJAI AI services (TwinOS, Genie, SUTAR, …)
    ├── divisions/                     # 13 strategy docs
    └── …
```

RTMN's Unified Hub (4399) proxies HTTP requests to HOJAI AI services. HOJAI AI services expose their own REST APIs and don't depend on RTMN's package paths — they're invoked by URL.

## Migration Notes

This repo was created by extracting `companies/HOJAI-AI/` from RTMN-Services via `git subtree split --prefix=companies/HOJAI-AI`. Full git history is preserved (21 commits).

In RTMN-Services, the `companies/HOJAI-AI/` directory has been replaced with a **git submodule** pointing to this repo at the matching commit.

If you're making changes to HOJAI AI code:
1. Make the change in this repo
2. Commit + push here
3. Update the submodule pointer in RTMN-Services: `cd companies/HOJAI-AI && git pull && cd ../.. && git add companies/HOJAI-AI && git commit -m "chore: update hojai-ai submodule"`
4. Push RTMN-Services

---

*Created: 2026-06-20*
*Maintainer: HOJAI AI (HOJAI Team)*