# genie-os

> The AI brain of the HOJAI ecosystem — foundation, runtime, and web super-app that connects to all products.
> Lives at: `RTMN/companies/HOJAI-AI/products/genie/genie-os/`

## What is genie-os?

**genie-os** is the orchestration layer of the HOJAI AI ecosystem. It provides:

1. **Foundation services** — identity, memory, twins, goals, policies, skills, workflows
2. **AI runtime** — the Genie AI chat runtime, Sutar business agent OS, AgentOS agent lifecycle
3. **Web super-app** — a single UI that talks to all the products (DO, Nexha, Salar) and the 23 specialized Genie services
4. **Thin clients** — HTTP proxies that forward to the external product repos (DO, Nexha, Salar)

It does **not** own the consumer commerce code (DO), the B2B code (Nexha), the AI marketplace (Salar), or the 23 specialized Genie services. Those live in their own repos/folders. genie-os is the **glue**.

## Where it lives

```
RTMN/companies/HOJAI-AI/products/genie/    ← THE GENIE HOME
│
├── genie-os/                             ← THIS FOLDER
│   ├── foundation/      (CorpID, TwinOS, MemoryOS, GoalOS, PolicyOS, SkillOS, FlowOS)
│   ├── runtime/         (Genie :7100, Sutar :7200, AgentOS :7300)
│   ├── products/        (do-client :8090, nexha-client :8190, salar-client :8290)
│   ├── frontend/        (web super-app :3000)
│   ├── infrastructure/ (start scripts, tests, docker, seed)
│   └── docs/            (you are here)
│
├── genie-gateway/                        (port 4701) — orchestrator
├── genie-shopping-agent/                 (port 4728) — autonomous shopping
├── genie-briefing-service/               (port 4712) — daily briefings
└── ... 20 other specialized Genie services
```

## Quick start

```bash
# From the new location
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie/genie-os

# 1. Make sure MongoDB is running on :27017
docker run -d --name hojai-mongo -p 27017:27017 mongo:7.0
# OR: brew services start mongodb-community

# 2. Install dependencies (already done if you see node_modules/)
npm install

# 3. Start everything genie-os owns (14 services)
npm run start:all

# 4. Open the web super-app
open http://localhost:3000
```

## What runs when you `npm run start:all`

| Layer | Service | Port | What it does |
|---|---|---:|---|
| **Foundation** | corpid | 7001 | Universal identity for users, agents, merchants, services |
| | twinos | 7002 | Digital twin state with versioning |
| | memoryos | 7003 | Persistent memory with importance + semantic search |
| | goalos | 7004 | Goals, KPIs, progress tracking |
| | policyos | 7005 | Authorization with priority rules |
| | skillos | 7006 | Skill registry (search, analysis, transaction) |
| | flowos | 7007 | Workflow orchestration with dependencies |
| **AI Runtime** | genie | 7100 | Personal AI chat, briefing, memory inbox |
| | sutar | 7200 | Business agents, decisions, B2B logic |
| | agentos | 7300 | Agent lifecycle (create, deploy, task) |
| **Thin Clients** | do-client | 8090 | Forwards to `RTMN/companies/do-app` |
| | nexha-client | 8190 | Forwards to `RTMN/companies/Nexha` |
| | salar-client | 8290 | Forwards to `RTMN/companies/HOJAI-AI/salar` |
| **Frontend** | web | 3000 | Super-app UI |

**External repos you should also start** (each in its own terminal):

```bash
# DO app (consumer commerce) — port 3001
cd /Users/rejaulkarim/Documents/RTMN/companies/do-app
npm run dev:backend

# Nexha (B2B commerce) — port 8000
cd /Users/rejaulkarim/Documents/RTMN/companies/Nexha/commerce-identity
npm run dev

# Salar (AI marketplace) — port 8200
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/salar
npm start
```

## What's in this folder

```
genie-os/
├── README.md                 ← you are here
├── CLAUDE.md                 ← for AI coding agents
├── package.json              ← npm workspaces config
├── .env                      ← service ports + external URLs
├── .gitignore
│
├── foundation/               ← 7 services genie-os OWNS
│   ├── corpid/         (port 7001)
│   ├── twinos/         (port 7002)
│   ├── memoryos/       (port 7003)
│   ├── goalos/         (port 7004)
│   ├── policyos/       (port 7005)
│   ├── skillos/        (port 7006)
│   └── flowos/         (port 7007)
│
├── runtime/                  ← 3 services genie-os OWNS
│   ├── genie/          (port 7100)
│   ├── sutar/          (port 7200)
│   └── agentos/        (port 7300)
│
├── products/                 ← 3 thin HTTP clients (proxies)
│   ├── do-client/      (port 8090)
│   ├── nexha-client/   (port 8190)
│   └── salar-client/   (port 8290)
│
├── frontend/                 ← 1 web super-app
│   ├── web/            (port 3000)
│   └── extension/            (placeholder for browser extension)
│
├── infrastructure/
│   ├── scripts/              (start-all.js, stop-all.js, test-all.js, health-check.js, demo.js)
│   ├── seed/                (seed.js — populates MongoDB with demo data)
│   └── docker/              (docker-compose.yml for full deployment)
│
├── docs/                     ← all documentation
│   ├── README.md             (this file)
│   ├── ARCHITECTURE.md       (detailed architecture)
│   ├── INTEGRATION.md        (how it talks to other repos)
│   ├── SERVICES.md           (catalog of all services)
│   ├── QUICKSTART.md         (5-minute setup)
│   └── DEVELOPMENT.md        (for contributors)
│
├── logs/                     (runtime logs and PID files)
└── node_modules/
```

## Scripts

| Command | What it does |
|---|---|
| `npm run start:all` | Start all 14 genie-os services |
| `npm run start:foundation` | Start only the 7 foundation services |
| `npm run start:runtime` | Start only the 3 runtime services |
| `npm run start:products` | Start only the 3 thin clients |
| `npm run stop:all` | Stop all genie-os services |
| `npm run test` | Run all 13 test suites (72 tests) |
| `npm run health` | Check health of all 14 services |
| `npm run demo` | Run an end-to-end demo flow |
| `npm run seed` | Populate MongoDB with demo data |

## Documentation

- **[QUICKSTART.md](docs/QUICKSTART.md)** — 5-minute setup guide
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — detailed architecture, data flow, request lifecycle
- **[SERVICES.md](docs/SERVICES.md)** — catalog of every service with port, owner, purpose
- **[INTEGRATION.md](docs/INTEGRATION.md)** — how genie-os connects to DO, Nexha, Salar, the 23 Genie services
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** — how to add a new service, run tests, debug

## License

MIT
