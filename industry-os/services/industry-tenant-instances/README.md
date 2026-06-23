# industry-tenant-instances

> Per-Tenant Industry OS Instance Manager — provisions, suspends, resumes, and destroys
> isolated Industry OS shards per large or regulated tenant. ADR-0010 Phase 10 (2026-06-22).

**Port:** `4365` &nbsp;·&nbsp; **Package:** `@rtmn/industry-tenant-instances` &nbsp;·&nbsp; **Auth:** dual-mode (JWT + internal token)

## Quick start

```bash
npm install
npm test      # 96 tests
npm start     # listens on :4365
```

## One-liner

```bash
curl -X POST http://localhost:4365/api/instances \
  -H 'Authorization: Bearer <jwt with industry:admin role>' \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantId": "t_acme",
    "industry": "healthcare",
    "isolationLevel": "DEDICATED",
    "compliance": { "framework": "HIPAA", "dataResidencyRegion": "us-east-1" },
    "autoActivate": true
  }'
```

→ Returns `201 Created` with `{ instanceId, status: "ACTIVE", _apiKey: "ik_…", limits, compliance, … }`.

## What's inside

| Concept | What |
|---------|------|
| **State machine** | `PROVISIONING → ACTIVE → SUSPENDED → ACTIVE → DESTROYING → DESTROYED` (+ `FAILED` for any non-terminal) |
| **Isolation** | `SHARED` (default; auto-activates) / `DEDICATED` / `ISOLATED` (own MongoDB) |
| **Conflict** | one active instance per `(tenantId, industry)` pair — 409 on duplicate |
| **Compliance** | framework, audit log, data residency, encryption flags stored per-instance |
| **Auth** | JWT with `industry:admin` role OR internal token (`x-internal-token` + `x-tenant-id`) |
| **API keys** | `ik_<48hex>`; SHA-256 hashed at rest; plaintext returned only on create/rotate |
| **Usage** | daily counters + high-water-marks for billing/capacity |

See [CLAUDE.md](CLAUDE.md) for the full architecture, HTTP API, and models.

## Related

- [Phase 9 — SUTAR Tenant Instances (port 4141)](../../companies/HOJAI-AI/sutar-os/core/sutar-tenant-instances/) — parallel for SUTAR layer
- [ADR-0010 Multi-Tenant Federation](../../docs/ADR/0010-MULTI-TENANT-FEDERATION.md)
