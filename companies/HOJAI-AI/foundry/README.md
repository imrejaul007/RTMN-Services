# HOJAI Foundry

> **The 30-minute startup engine.** `npx hojai create` scaffolds a working
> AI-native business (marketplace, hotel, restaurant, CRM, ERP, …) in 30
> minutes — backend + frontend + SUTAR agents + Nexha federation +
> `hojai.ai.md` for AI coding assistants.

**Tagline:** *"Build a startup in 30 minutes."*

**Status:** v1.1 (2026-06-24) — `npx hojai create` + `npx hojai deploy` + `npx hojai add` + **all 9 starter templates** (marketplace, b2b, company, hotel, restaurant, logistics, crm, erp, pos) wired to a real **BaseAgent runtime** (local mode by default, remote mode via `HOJAI_SUTAR_URL`). **Real remote deploy** wired to `hojai-cloud` (port 4380) when `HOJAI_CLOUD_URL` is set. **41 tests, 0 failures.**

## Quick start (30 seconds)

```bash
# From any directory
node /path/to/foundry/packages/create-hojai/src/index.js create mystartup \
  --template=marketplace \
  --region=us-east \
  --lang=en \
  --agents=sales,procurement,finance,support

cd mystartup
npm install
npm run dev
# → http://localhost:3000  (frontend)
# → http://localhost:4001  (backend)
```

## What's inside

| Path | What it does |
|---|---|
| [`packages/create-hojai/`](packages/create-hojai/) | The `npx hojai` CLI: `create` + `deploy` + `add` commands |
| [`packages/create-hojai/src/runtime/BaseAgent.js`](packages/create-hojai/src/runtime/BaseAgent.js) | The shared agent runtime baked into every starter |
| [`scripts/generate-starters.mjs`](scripts/generate-starters.mjs) | Bulk generator: single source of truth for the 8 non-marketplace starters |
| [`scripts/smoke-deploy.sh`](scripts/smoke-deploy.sh) | Smoke test for `npx hojai deploy` |
| [`starters/<key>/`](starters/) | 9 starter templates: `marketplace`, `b2b`, `company`, `hotel`, `restaurant`, `logistics`, `crm`, `erp`, `pos` |
| [`CLAUDE.md`](CLAUDE.md) | Full architecture, CLI surface, agent catalog, roadmap |

## Three CLI commands

```bash
npx hojai create [<name>] [--flags]       # Scaffold from one of 9 starters
npx hojai deploy [--mode=local|preview|remote]   # Ship it (remote → hojai.cloud if HOJAI_CLOUD_URL set)
npx hojai add agent <name> [--desc=".."]  # Append a new agent (idempotent)
npx hojai add integration <name>          # Append a new Express route (idempotent)
```

### Real remote deploy (v1.1)

```bash
export HOJAI_CLOUD_URL=https://cloud.hojai.app
export HOJAI_API_KEY=…
npx hojai deploy --mode=remote --yes
# → live at https://<name>.hojai.app
```

`hojai-cloud` (port 4380) provisions a per-tenant runtime and returns the
URL. See [`products/hojai-cloud/CLAUDE.md`](../products/hojai-cloud/CLAUDE.md).

## The 30-minute killer demo

This is the single most leveraged thing in the HOJAI platform right now.
A founder goes from `npx hojai create` to a running marketplace at
`http://localhost:3000` with **5 SUTAR agents** (CEO, Sales, Procurement,
Finance, Support) and **Nexha federation enabled** in 30 minutes or less.

```
$ npx hojai create tradeflow --template=marketplace --region=me --lang=en,ar
$ cd tradeflow && npm install && npm run dev
$ curl http://localhost:4001/api/agents
{"agents":[
  {"name":"CEO","description":"Orchestrator. Routes work..."},
  {"name":"Sales","description":"Quotation. RFQ processing..."},
  {"name":"Procurement","description":"Sourcing. Supplier discovery..."},
  {"name":"Finance","description":"Money. Invoicing, escrow..."},
  {"name":"Support","description":"Customer service. Tickets..."}
]}
```

That's the demo. Then a Nexha federation profile is exposed at
`/api/nexha/profile` and an AI-native spec is written to `hojai.ai.md`
for Claude Code / Cursor / Codex to extend.

## Roadmap

| Version | What ships |
|---|---|
| **v0 (DONE — 2026-06-24)** | CLI + marketplace starter + 5 SUTAR agent stubs |
| **v0.5 (DONE — 2026-06-24)** | 8 more starters (b2b, company, hotel, restaurant, logistics, crm, erp, pos) — each ships with 4-5 SUTAR agent stubs, seed data, and 3 tests |
| **v1.0 (DONE — 2026-06-24)** | `npx hojai deploy` (local + preview + remote-stub), `npx hojai add agent`, `npx hojai add integration`, BaseAgent runtime wired into every starter |
| **v1.1 (DONE — 2026-06-24)** | **Real remote deploy** — `hojai-cloud` service on :4380; `npx hojai deploy --mode=remote` POSTs to `HOJAI_CLOUD_URL` when set, falls back to v1.0 stub otherwise |
| **v1.5** | `add agent --from-llm` to generate a strategy from a prompt; LLM-powered starter generation from `hojai.ai.md` (Blueprint Engine) |
| **v2.0** | Continuous Evolution: weekly auto-improvement of generated apps |

See [`CLAUDE.md`](CLAUDE.md) for the full architecture and roadmap.

## Related

- [`.claude/plans/hojai-developer-platform-spec.md`](../../.claude/plans/hojai-developer-platform-spec.md) — Section 9 is the 30-min killer demo spec
- [`.claude/plans/sample-marketplace-hojai-ai.md`](../../.claude/plans/sample-marketplace-hojai-ai.md) — Sample `hojai.ai.md`
- [`.claude/plans/global-nexha-development-plan.md`](../../.claude/plans/global-nexha-development-plan.md) — Nexha network plan
- [`.claude/plans/hojai-platform-as-an-economy-5year-plan.md`](../../.claude/plans/hojai-platform-as-an-economy-5year-plan.md) — 5-year vision

---

*Part of [HOJAI AI](https://github.com/imrejaul007/hojai-ai) — the multi-product AI company.*
