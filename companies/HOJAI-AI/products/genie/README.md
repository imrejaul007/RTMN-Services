# Genie — Everything Genie lives here

> **Location:** `RTMN/companies/HOJAI-AI/products/genie/`
> **Last updated:** 2026-06-21

This folder is the **single home for everything Genie** in the HOJAI AI ecosystem. It contains 24 Genie-related services plus the genie-os orchestration layer.

## What's in this folder

### The Genie services (24 total)

These are all part of "Genie" — the personal AI assistant for HOJAI:

| # | Service | Default Port | Specialty |
|---|---|---:|---|
| 1 | **genie-os** (subfolder) | 7100 | Orchestration layer (foundation + runtime + web). **Start here.** |
| 2 | genie-gateway | 4701 | Routes queries to the right specialist |
| 3 | genie-shopping-agent | 4728 | Autonomous shopping — multi-merchant comparison |
| 4 | genie-briefing-service | 4712 | Morning/evening/weekly briefings |
| 5 | genie-calendar-service | 4709 | Calendar, scheduling |
| 6 | genie-companion-service | (default) | Personal chat companion |
| 7 | genie-consultant-agent | (default) | Domain consulting |
| 8 | genie-creation-os | (default) | Content creation |
| 9 | genie-device-integration | 4769 | Multi-device sync |
| 10 | genie-execution-engine | (default) | Task execution |
| 11 | genie-learning-os | (default) | Adaptive learning |
| 12 | genie-life-gps | (default) | Life guidance |
| 13 | genie-life-university | (default) | Education / courses |
| 14 | genie-listening-modes | 4768 | Voice mode switching |
| 15 | genie-memory-graph | (default) | Knowledge graph memory |
| 16 | genie-memory-inbox | (default) | Universal memory capture |
| 17 | genie-money-os | 4715 | Personal finance |
| 18 | genie-relationship-os | (default) | Relationship management |
| 19 | genie-serendipity-service | (default) | Random memory resurfacing |
| 20 | genie-smart-forgetting-service | (default) | Auto-archive |
| 21 | genie-thinking-engine | (default) | Reasoning |
| 22 | genie-universal-search | (default) | Universal search |
| 23 | genie-wake-word-service | 4767 | "Hey Genie" voice detection |
| 24 | genie-wellness-os | 4717 | Health tracking |

### The orchestrator: genie-os/

`genie-os/` is a **subfolder** that orchestrates the Genie ecosystem. It:
- Provides 7 foundation services (CorpID, TwinOS, MemoryOS, etc.)
- Provides 3 AI runtime services (Genie, Sutar, AgentOS)
- Provides a web super-app that ties everything together
- Provides thin clients that connect to external repos (DO, Nexha, Salar)
- Delegates to the 23 specialized services above based on user intent

**Read genie-os/README.md for the full picture.**

## How to start

### Minimum (just genie-os)

```bash
cd genie-os
npm install
npm run start:all
# Opens web on http://localhost:3000
```

### Full (genie-os + all 23 specialists)

```bash
# Terminal 1: genie-os
cd genie-os
npm run start:all

# Terminal 2-24: each specialist (in its own terminal)
cd genie-gateway && npm install && npm start
cd ../genie-shopping-agent && npm install && npm start
# ... 21 more
```

## What's NOT in this folder

The following things are sometimes confused with "Genie" but are separate:

| Thing | Where it actually lives |
|---|---|
| DO app (consumer commerce) | `RTMN/companies/do-app/` |
| Nexha (B2B commerce) | `RTMN/companies/Nexha/` |
| Salar (AI marketplace) | `RTMN/companies/HOJAI-AI/salar/` |
| CorpPerks/salar-os (workforce twin — different product, misleadingly named) | `RTMN/companies/CorpPerks/salar-os/` |
| Other HOJAI products (bizora, razo, etc.) | `RTMN/companies/HOJAI-AI/products/<name>/` |

## History

- Originally: Genie services scattered across `companies/HOJAI-AI/services/` and `companies/HOJAI-AI/products/genie/`
- 2026-06-20: Cleanup — moved 24 Genie-related items into this single folder
- 2026-06-21: genie-os moved here from `/Users/rejaulkarim/Documents/genie-os/`

## See also

- **`genie-os/README.md`** — the main entry point
- **`genie-os/CLAUDE.md`** — for AI coding agents
- **`genie-os/docs/QUICKSTART.md`** — 5-minute setup
- **`genie-os/docs/ARCHITECTURE.md`** — system architecture
- **`genie-os/docs/SERVICES.md`** — every service in detail
- **`genie-os/docs/INTEGRATION.md`** — how the parts connect
- **`genie-os/docs/DEVELOPMENT.md`** — for contributors
