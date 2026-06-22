# Sandbox (port 4100)

> **Status:** ✅ Production-ready v1.0.0 (Architecture v2 — June 20, 2026)
> **Role:** Free, isolated, time-limited test environment for HOJAI AI consumers.
> **Owner:** HOJAI AI Developer Experience team

## Mission

Lower the barrier to try HOJAI AI. A developer should be able to:
1. Create a sandbox in one API call
2. Get back a tenantId + apiKey
3. Hit any HOJAI AI service with that key, scoped to the sandbox
4. Reset the sandbox when they want to retry from scratch
5. Let it auto-expire when the TTL is up (default 24h, max 30 days)

## Endpoints (9)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| POST | `/api/sandboxes` | Create a sandbox (returns apiKey ONCE) |
| GET | `/api/sandboxes` | List sandboxes (apiKey redacted) |
| GET | `/api/sandboxes/:id` | Get sandbox metadata |
| DELETE | `/api/sandboxes/:id` | Soft-delete |
| POST | `/api/sandboxes/:id/reset` | Reset state + rotate apiKey |
| POST | `/api/sandboxes/:id/extend` | Extend TTL |
| POST | `/api/sandboxes/:id/log` | Log a call (for debugging) |
| GET | `/api/sandboxes/:id/log` | Get the per-sandbox call log |
| GET | `/api/audit` | Audit log |

## What a Sandbox Gets

```json
{
  "id": "sb-a1b2c3d4",
  "owner": "anonymous",
  "label": "my-test-sandbox",
  "region": "us-east",
  "apiKey": "sk_sb_...shown only at creation...",
  "scopes": [
    "twins:read", "twins:write",
    "memory:read", "memory:write",
    "skills:execute"
  ],
  "twinNamespace": "sb-a1b2c3d4",
  "memoryNamespace": "sb-a1b2c3d4",
  "status": "active",
  "createdAt": "2026-06-20T...",
  "expiresAt": "2026-06-21T...",
  "callCount": 0
}
```

## Lifecycle

- **active** → sandbox is usable
- **expired** → TTL passed; auto-reaped every 60s by a background timer
- **deleted** → soft-deleted via DELETE

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `sandbox: http://localhost:4100`
- **ai-intelligence (4881) `/api/agents`** — exposes `sandbox` agent
- **unified-os-hub (4399)** — `/api/sandbox/...` routes to this service

## Example

```bash
# Create a sandbox
curl -X POST http://localhost:4100/api/sandboxes \
  -H "Content-Type: application/json" \
  -d '{"owner":"alice","label":"alice-test","ttlSeconds":3600}'

# Reset (and rotate apiKey)
curl -X POST http://localhost:4100/api/sandboxes/sb-a1b2c3d4/reset

# Extend TTL
curl -X POST http://localhost:4100/api/sandboxes/sb-a1b2c3d4/extend \
  -H "Content-Type: application/json" \
  -d '{"ttlSeconds": 86400}'
```

## Next Steps

- Add actual namespace enforcement on TwinOS/MemoryOS calls
- Add per-sandbox rate limits (default 1000 calls/hour)
- Add per-sandbox cost limit
- Add sandbox-to-prod migration endpoint (move data when customer upgrades)
