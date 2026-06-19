# RTMN Unified Hub - Complete Gateway

**Version:** 3.0.0  
**Port:** 4399  
**Status:** ✅ RUNNING | **June 18, 2026**

---

## Overview

RTMN Unified Hub is the **central gateway** connecting ALL 50+ services across the RTMN ecosystem - Department OS, Industry OS, Foundation services, and more.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RTMN UNIFIED HUB (4399)                                │
│              ONE GATEWAY TO RULE THEM ALL                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DEPARTMENT OS (9) - Horizontal Layer               │   │
│  │  Sales │ Marketing │ CS │ Procurement │ Workforce │ Finance │ Ops │ CXO│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    24 INDUSTRY OS - Vertical Layer                    │   │
│  │   Restaurant │ Hotel │ Healthcare │ Retail │ Legal │ Education ...   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FOUNDATION (3)                                    │   │
│  │   CorpID │ MemoryOS │ TwinOS                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/unified-os-hub/
├── src/
│   ├── index.js              # Main gateway
│   ├── workflows.js          # Cross-OS workflows
│   ├── integrations.js      # Service integrations
│   ├── agent-marketplace.js # Agent registry
│   ├── industry-workflows.js # Industry-specific workflows
│   ├── phase2-workflows.js  # Phase 2 workflows
│   └── phase3-workflows.js   # Phase 3 workflows
├── package.json
└── CLAUDE.md
```

---

## Connected Services (50+)

### Foundation
| Service | Port | Purpose |
|---------|------|---------|
| CorpID | 4702 | Identity |
| MemoryOS | 4703 | Memory |
| TwinOS | 4705 | Digital Twins |

### Department OS (9)
| Service | Port | Purpose |
|---------|------|---------|
| Sales OS | 5055 | CRM, Leads, Pipeline |
| Marketing OS | 5500 | Campaigns, Journey |
| Customer Success | 4050 | NPS, Churn |
| Procurement | 5096 | Suppliers, POs |
| Workforce | 5077 | HR, Payroll |
| Finance | 4801 | Chart of Accounts |
| Operations | 5250 | Projects, Incidents |
| CXO | 5100 | Executive KPIs |
| Revenue Intelligence | 5400 | Demand, Pricing |

### Industry OS (24)
| Service | Port |
|---------|------|
| Restaurant | 5010 |
| Hotel | 5025 |
| Healthcare | 5020 |
| Retail | 5030 |
| Legal | 5035 |
| Education | 5060 |
| + 18 more | 5070-5240 |

---

## API Endpoints

### Health
```
GET /health           # Hub health check
GET /ready            # Readiness
GET /api/services     # Service registry
```

### Cross-OS Workflows
```
GET  /api/customer360/:id        # Customer from all systems
POST /api/workflow/lead-to-revenue
POST /api/workflow/campaign-launch
POST /api/workflow/hotel-booking
POST /api/workflow/restaurant-order
```

### Service Proxies
```
/api/sales/*      → Sales OS
/api/marketing/*  → Marketing OS
/api/identity/*    → CorpID
/api/memory/*     → MemoryOS
/api/twins/*      → TwinOS
/api/restaurant/* → Restaurant OS
/api/hotel/*      → Hotel OS
/api/healthcare/* → Healthcare OS
... (all 50+ services)
```

---

## Quick Start

```bash
cd services/unified-os-hub
npm start

# Health check
curl http://localhost:4399/health

# List services
curl http://localhost:4399/api/services
```

---

*Last Updated: June 18, 2026*
