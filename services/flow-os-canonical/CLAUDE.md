# Flow OS Canonical

**Port:** 4156  
**Path:** `services/flow-os-canonical/`  
**Status:** ✅ Production (auth-gated)  
**Role:** **Canonical flow-template registry** — single source of truth for cross-service workflow definitions.

---

## What this service is

Flow OS Canonical is the **registry**, not the executor. It owns the canonical names and step definitions for shared workflows (e.g. `checkout`, `onboarding`, `escalation`, `lead_routing`). The actual execution engine is `flowos@7007` in the genie-os foundation layer — it reads these templates on startup via the wire described below.

Per `companies/HOJAI-AI/divisions/02-infrastructure-cloud/CLAUDE.md:219` (Gap #6, marked ✅ DONE), this is the consolidated canonical registry after the 3→1 FlowOS deduplication.

---

## Auth model

- All `/api/*` routes require the shared internal service token via the `x-internal-token` header.
- `/health` and `/ready` remain public for orchestrator probes.
- The service **refuses to start** if `INTERNAL_SERVICE_TOKEN` is unset — no hardcoded fallback. This matches the convention used by sibling services in genie-os (policyos, skillos, memoryos).
- Per-route tenant isolation is **not** enforced here (the registry has no tenant concept). Tenant scoping is the executor's job (`flowos@7007` filters by `corpId`).

---

## Wire to flowos@7007 (genie-os)

On startup, `flowos@7007` calls `GET /api/flows` (with the internal token) and upserts the 4 seeded templates locally as read-only active flows with `source: 'flow-os-canonical'`. If the canonical URL is unreachable, the executor logs a warning and proceeds with its own flows — the wire is best-effort, not blocking.

Set on `flowos@7007`:
```
FLOWOS_CANONICAL_URL=http://flow-os-canonical:4156
```

---

## API

### Public (no auth)
- `GET /health` — service + flow count
- `GET /ready` — readiness

### Authenticated (`x-internal-token: …`)

#### Templates
- `POST /api/flows` — create a new canonical flow (`{name, description?, steps[]}`)
- `GET /api/flows` — list all canonical flows
- `GET /api/flows/:id` — get one

#### Instantiation
- `POST /api/flows/:id/instantiate` — start an instantiation; returns `{instantiation: {id, status: 'running', current_step: 0, total_steps: N}}`
- `GET /api/instantiations` — list all instantiations (in-memory, lost on restart)
- `GET /api/instantiations/:id` — get one
- `POST /api/instantiations/:id/advance` — advance the cursor; the executor (`flowos@7007`) calls this per step

> Note: this service does **not** execute steps. It tracks state and emits "just_completed" hints. Real execution (HTTP calls to SkillOS) lives in `flowos@7007`.

---

## Seeded canonical flows (4)

| Name | Steps (key / target service) |
|------|------------------------------|
| `checkout` | cart_review → inventory_check → payment_charge → order_create → notify |
| `onboarding` | identity_verify → profile_create → welcome_notify |
| `escalation` | tier1_diagnose → tier2_route → human_handoff |
| `lead_routing` | enrich → score → route |

---

## Quick start

```bash
export INTERNAL_SERVICE_TOKEN=dev-internal-token
cd services/flow-os-canonical
npm install
npm start   # → http://localhost:4156

# Smoke
bash tests/smoke.sh
# E2E (walk checkout + onboarding to completion)
bash tests/e2e.sh
```

The smoke script requires `INTERNAL_SERVICE_TOKEN` in the env and sends it on every call. It also exercises the 401 path (missing / wrong token) to prove the auth middleware works.

---

## Integration map

| Consumer | Direction | What it does |
|----------|-----------|--------------|
| `flowos@7007` (genie-os) | reads `GET /api/flows` on boot | Hydrates 4 canonical templates as local active flows |
| RTMN Unified Hub (4399) | none directly | Hub does not call this service; consumers go through `flowos@7007` |
| `services/workflow-marketplace@4938` | none | Separate "discover & deploy templates" marketplace; different scope |

---

## What this service is NOT

- **Not an executor.** Step execution (HTTP to SkillOS, retries, error policies) is `flowos@7007`'s job.
- **Not a marketplace.** That's `services/workflow-marketplace@4938`.
- **Not the Architecture v2 "Flow Orchestrator" (4244).** That service is planned but not yet built.
- **Not tenant-aware.** It's a single global registry. Tenants are introduced by the executor.
