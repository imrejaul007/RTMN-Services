# company-starter

> Full autonomous company starter built with **HOJAI Foundry** — 6 Department OS agents (Sales, Marketing, HR, Finance, Operations, CXO) + CEO orchestrator, all running on HOJAI SUTAR.

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:4001>.

## What's in here

A complete **autonomous company** in one Express backend:

- `apps/backend/src/agents/` — 7 SUTAR agents (CEO + 6 departments)
- `apps/backend/src/routes/` — 7 route files (one per department + nexha)
- `apps/backend/src/services/` — In-memory stores for HR, sales, CRM, finance
- `apps/backend/src/middleware/` — Error handler
- `hojai.ai.md` — AI-native spec (Claude Code / Cursor / Codex read this first)
- `.hojai/manifest.json` — Machine-readable project schema
- `.hojai/capability.json` — CapabilityOS declaration for Nexha federation

## API at a glance

```bash
# Health + project info
curl http://localhost:4001/health
curl http://localhost:4001/

# HR
curl -X POST http://localhost:4001/api/hr/employees \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","role":"Engineer","hireDate":"2026-07-01"}'

# Sales
curl -X POST http://localhost:4001/api/sales/leads \
  -H 'Content-Type: application/json' \
  -d '{"name":"Maya Collective","email":"maya@example.com","source":"web"}'

# SUTAR agents
curl http://localhost:4001/api/agents
curl -X POST http://localhost:4001/api/agents/HR \
  -H 'Content-Type: application/json' \
  -d '{"intent":"hire engineer","skills":["typescript"]}'
```

## SUTAR Agents (7)

| Agent | Role | Department OS |
|---|---|---|
| **CEO** | Orchestrator. Routes work across departments, tracks KPIs. | — |
| **Sales** | Lead capture, qualification, pipeline, forecasting. | Sales OS |
| **Marketing** | Brand, campaigns, audiences, content. | Marketing OS |
| **HR** | Recruiting, onboarding, performance, payroll. | Workforce OS |
| **Finance** | Chart of accounts, ledger, invoicing, AP/AR. | Finance OS |
| **Operations** | Projects, incidents, processes, risks. | Operations OS |
| **CXO** | Executive KPIs, strategic pillars, board reports. | CXO OS |

Each agent is a pure function that returns a deterministic stub response. Replace the body of any agent with a real `@hojai/sutar` `BaseAgent` to wire up LLMs.

## HOJAI SDKs Used

- `@hojai/foundation` — CorpID, Memory, Twin (the data layer)
- `@hojai/sutar` — Agent runtime (when wired up)
- `@hojai/department` — Department OS clients (sales, marketing, hr, finance, ops, cxo)
- `@hojai/nexha` — Federation (publish capabilities, find peers)
- `@hojai/ai-spec` — Generates this project's `hojai.ai.md`
- `@hojai/commerce`, `@hojai/payment`, `@hojai/marketplace` — Optional, for revenue

## How to Extend

### Add a new SUTAR agent

1. Open `apps/backend/src/agents/index.js`
2. Add an entry to the `AGENTS` array
3. Add the function below
4. Update `.hojai/capability.json` with the new capability

### Add a new endpoint

1. Create a file in `apps/backend/src/routes/`
2. Use `express.json()` middleware
3. Validate inputs (recommend Zod for production)
4. Re-export the router from `apps/backend/src/index.js`

### Wire to real Department OS

Replace the in-memory store in `services/store.js` with calls to `@hojai/department`:

```js
import { Department } from '@hojai/department';
const dept = new Department({ apiKey: process.env.HOJAI_API_KEY });
const leads = await dept.sales.listLeads();
```

### Connect to Global Nexha

```bash
hojai ai-spec read   # view your capability.json
# Then POST your capability to /api/nexha/peers/connect on a running Nexha
```

## Conventions

- All routes return JSON
- All routes are unauthenticated by default (add `requireAuth` from `@hojai/foundation` for production)
- All agents are pure functions in `agents/index.js` — easy to test, easy to swap for LLM-backed
- All cross-cutting concerns (errors, validation, auth) live in `middleware/`

## License

MIT (starter kit code) + HOJAI Cloud subscription (for production deployment).
