# SUTAR OS — Usage Tracker (Port 4252)

> **Status:** ✅ NEW — Built June 20, 2026
> **SUTAR Layer:** 5 — Economy / Metering
> **Purpose:** Meters usage of marketplace services / AI agents / digital twins, generates invoices, computes revenue share for providers

---

## Mission

The Usage Tracker is the **metering backbone of SUTAR OS**. Every service that gets called through the marketplace (LLM tokens, GPU seconds, API calls, twin updates, storage) needs to be counted, priced, billed, and shared with the provider. Without this, the marketplace can't pay providers, can't enforce quotas, and can't show customers what they're spending.

## Architecture

```
[Caller (RTMN service or external agent)]
        │
        ▼
POST /api/usage/record          ← any service can record its usage here
        │
        ▼
[Usage records store (in-memory now, Redis + Postgres later)]
        │
        ├──► /api/quotas/:tenant   ← live quota tracking, 429-style overage
        ├──► /api/billing/generate ← roll up a period into an invoice
        └──► /api/revenue/share/:provider ← what the platform owes the provider
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/usage/record` | Record one metered event (tenant, provider, service, metric, qty) |
| GET | `/api/usage` | List records with optional filters (tenant/provider/service/metric/since/until) |
| GET | `/api/usage/aggregate/:key` | Aggregated totals grouped by metric / service / provider |
| POST | `/api/billing/generate` | Generate invoice from records in a period |
| GET | `/api/billing` | List invoices |
| GET | `/api/billing/:id` | Invoice detail with line items |
| GET | `/api/plans` | List pricing plans |
| POST | `/api/plans` | Create a pricing plan (`{name, pricing: {metric: rate}}`) |
| GET | `/api/quotas/:tenantId` | Show quota limits + current usage |
| POST | `/api/quotas/:tenantId` | Set quota for tenant |
| GET | `/api/revenue/share/:providerId` | Compute platform/provider split |
| GET | `/health` | Health + record counts |

## Default Pricing (per-unit USD)

| Metric | Rate | Unit |
|--------|------|------|
| `llm_tokens` | $0.00003 | token |
| `api_call` | $0.001 | call |
| `twin_update` | $0.0001 | update |
| `storage_mb_hour` | $0.00001 | MB-hour |
| `compute_gpu_second` | $0.0005 | GPU-second |

Platform fee default: **15%** (configurable per plan).

## How It Maps to SUTAR

| SUTAR concern | How this service covers it |
|---------------|----------------------------|
| **Marketplace economy** | Every marketplace listing is metered by a provider calling `/api/usage/record` |
| **Provider payouts** | `/api/revenue/share/:providerId` computes what the platform owes |
| **Tenant billing** | `/api/billing/generate` rolls a period into an invoice |
| **Quota enforcement** | `/api/quotas/:tenantId` returns limit + used, callers can 429 on overage |
| **Audit trail** | Every record carries `tenantId`, `providerId`, `timestamp`, `metadata` |

## Seeded Demo Data

- 1 pricing plan (`Pay-As-You-Go (Default)`)
- 60 usage records across 3 tenants × 3 providers × 5 metrics
- Quotas set for each tenant

## Integration with HOJAI Intelligence (4881)

The new service is wired into the AI Intelligence routing table. `/api/route` will return `http://localhost:4252` and `/api/agents` will list `usageTracker` as a routable agent.

## Known Limitations

- In-memory storage (resets on restart). Production needs Postgres + Redis.
- No idempotency keys on `record` — duplicate sends would double-count.
- No Stripe integration yet — invoices are in-app only.
- No multi-currency support (USD only).

## Related Services

- `/services/agent-marketplace` (4845) — listings consumed here
- `/services/decision-engine` (4240) — uses usage to drive policy decisions
- `/services/agent-economy` (4251) — economy layer that depends on these usage records
- `/services/agent-reputation` (4820) — uses usage volume to score provider reliability

---

*See also: [companies/HOJAI-AI/divisions/12-sutar-os/CLAUDE.md](../../divisions/12-sutar-os/CLAUDE.md)*