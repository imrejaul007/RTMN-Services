# Twin Memory Bridge

> **Status:** ✅ Production-ready v1.0.0 (Phase 5 + 7 — June 22, 2026)
> **Role:** The **link layer** that implements "Each Twin owns its Memory."
> **Port:** 4704
> **Owner:** HOJAI AI Platform team

## Mission

"Everything has a Twin" is only useful if every Twin has a defined memory partition. Before this service existed, twin IDs were passed to MemoryOS with no canonical mapping — consumers had to know which memory kinds a given twin had. **Twin Memory Bridge is the canonical link layer.**

It also proxies memory operations (read/write/migrate) to MemoryOS so consumers can talk to one URL per twin instead of one URL per kind.

## The 5 Memory Kinds

| Kind | What it stores | MemoryOS path |
|------|----------------|---------------|
| `episodic` | Time-ordered events the twin experienced | `/api/memories/timeline/:twinId` |
| `semantic` | Facts the twin knows | `/api/memories/search?type=knowledge&twinId=...` |
| `procedural` | How-to knowledge / skills | `/api/memories?type=workflow&twinId=...` |
| `working` | Current task context (short-term) | `/api/memory/working/:twinId` |
| `long-term` | Consolidated insights | `/api/memory/longterm/:twinId` |

## Endpoints (18)

### Bind / unbind

| Method | Path | Purpose |
|--------|------|---------|
| `POST`   | `/api/twins/:twinId/bind` | Bind a twin to a memory partition (creates partition if absent) |
| `POST`   | `/api/bulk-bind` | Bulk-bind many twins for tenant onboarding |
| `DELETE` | `/api/twins/:twinId/bind/:kind` | Unbind one kind (orphans the partition) |
| `DELETE` | `/api/twins/:twinId/bind` | Unbind all kinds |

### Read

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/twins/:twinId/binding` | Get full binding record (all kinds) |
| `GET` | `/api/twins/:twinId/binding/:kind` | Get partition for a specific kind |
| `GET` | `/api/bindings` | All bindings (admin) |
| `GET` | `/api/twins/:twinId/memory` | **"What memory does this twin own?"** — the centerpiece query |

### Bulk & stats

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/bulk-resolve` | Bulk resolve partitions for many twins + one kind |
| `POST` | `/api/partitions/:partitionId/record` | Record a read/write hit on a partition (bumps stats) |
| `GET`  | `/api/twins/:twinId/memory-stat` | Total reads/writes across all the twin's partitions |

### Proxy to MemoryOS

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/twins/:twinId/memory/read` | Read twin's memory (kind-scoped, normalized) — `body: { kind, query? }` |
| `POST` | `/api/twins/:twinId/memory/write` | Write a memory (auto-binds if needed) — `body: { kind, memory: {...} }` |
| `POST` | `/api/twins/:twinId/migrate` | Promote / move binding from one kind to another — `body: { fromKind, toKind, preserveHistory? }` |

### Audit & ops

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/audit` | Audit log (binds, unbinds, proxy ops, migrations) |
| `GET` | `/api/auth/toggle?on=true` | Runtime toggle of `REQUIRE_AUTH` |
| `GET` | `/health` | Liveness — counts, kinds, upstreams, capabilities |
| `GET` | `/ready` | Readiness probe |

## Key Behaviors

- **Default partitions seeded at startup** so the bridge always returns *something* (never null)
- **Bulk-bind** for tenant onboarding creates 5 partitions per twin (one per kind) in one call
- **Bulk-resolve** lets FlowOS plans that touch many twins do it in one round trip
- **Orphaning** — unbind orphans the partition (still queryable) instead of deleting
- **Memory stats** let consumers see how active a twin's memory is
- **Migrate** promotes a binding (e.g. episodic → long-term once memories stabilize); `preserveHistory=false` orphans the source
- **Proxy normalization** — every kind returns `{ twinId, kind, count, memories: [...] }` regardless of MemoryOS's underlying shape

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `twinMemoryBridge: http://localhost:4704`
- **ai-intelligence (4881) `/api/agents`** — exposes `twinMemoryBridge` agent
- **unified-os-hub (4399)** — `/api/twin-memory/...` routes to this service

## Used By

- **Flow Orchestrator (4244)** — `memory.read` and `memory.write` steps resolve the partition before calling MemoryOS
- **TwinOS Hub (4705)** — on twin creation, can pre-bind a default partition per kind
- **MemoryOS (4703)** — when storing a record, can validate the twin↔memory link exists
- **Memory Context Engine (4790)** — calls `GET /api/twins/:twinId/binding` to scope search by kind
- **Foundation services** — every consumer that touches memory now goes through this bridge first

## Example

```bash
# Bind a twin
curl -X POST http://localhost:4704/api/twins/twin-customer-42/bind \
  -H "Content-Type: application/json" \
  -d '{"kind":"episodic"}'

# Query what memory this twin owns
curl http://localhost:4704/api/twins/twin-customer-42/memory
# {"twinId":"twin-customer-42","ownedKinds":["episodic"],"partitions":[...]}

# Read via the proxy (returns normalized shape for any kind)
curl -X POST http://localhost:4704/api/twins/twin-customer-42/memory/read \
  -H "Content-Type: application/json" \
  -d '{"kind":"episodic"}'

# Write via the proxy
curl -X POST http://localhost:4704/api/twins/twin-customer-42/memory/write \
  -H "Content-Type: application/json" \
  -d '{"kind":"semantic","memory":{"content":"John is vegetarian","tags":["food"]}}'

# Promote episodic → long-term (preserve history)
curl -X POST http://localhost:4704/api/twins/twin-customer-42/migrate \
  -H "Content-Type: application/json" \
  -d '{"fromKind":"episodic","toKind":"long-term","preserveHistory":true}'

# Bulk-bind for tenant onboarding
curl -X POST http://localhost:4704/api/bulk-bind \
  -H "Content-Type: application/json" \
  -d '{"twinIds":["twin-1","twin-2","twin-3"],"kinds":["episodic","semantic"]}'
```

## Storage

- **In-memory:** `bindings` Map (twinId → binding), `partitions` Map (partitionId → partition), `audit` ring buffer
- **Persistence:** MongoDB via `PersistentMap`
- **Seeded:** 5 default partitions (one per kind) on first start

## Env

```env
PORT=4704
MEMORYOS_URL=http://localhost:4703  # the bridge proxies here
CORPID_URL=http://localhost:4702     # for JWT verification
REQUIRE_AUTH=false                   # default off in dev
MONGODB_URL=mongodb://localhost:27017/hojai
```

## Auth (Phase 7)

JWT verification via `@rtmn/shared/auth` (CorpID-backed `createCorpIdAuthMiddleware`). Local `src/auth.js` is a thin shim re-exporting from the shared module. Public paths: `/health`, `/`, `/api/auth/toggle`. The proxy endpoints are protected — callers must present a valid token.

## Tests (33/33 PASS)

`tests/e2e.sh` covers bind/unbind (single + bulk), every kind (working, long-term, episodic, semantic, procedural), the proxy read/write normalization, migrate (preserve + drop), invalid-kind rejection, and audit.

## Open follow-ups

- Auto-bind on twin creation (event-driven from TwinOS Hub)
- Cross-twin memory (multiple twins sharing a partition, e.g. family accounts)
- Partition sharding for very active twins
- Proxy timeout configuration (currently 5s hardcoded)

---

*Last Updated: 2026-06-22*
