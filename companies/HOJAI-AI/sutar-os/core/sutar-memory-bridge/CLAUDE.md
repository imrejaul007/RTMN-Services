# sutar-memory-bridge

> **Service:** SUTAR OS Memory Bridge
> **Port:** 4143
> **Layer:** 2 (Twin + Memory + Identity + Agent ID)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Routes memory access through SUTAR intents. Instead of having agents directly
call `/services/memory-os` (4703), they publish a "remember" or "recall" intent
to SUTAR, and this bridge persists those as memory records tagged with intent
metadata.

This makes it possible to:
- Search memory *by intent type* (e.g. "show me everything we negotiated last week")
- Audit which intents produced which memories
- Layer semantic analysis on top of intent-tagged memory records

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| POST | `/api/memory/remember` | Store an intent-tagged memory record |
| POST | `/api/memory/recall` | Query records (filter by twinId, query, intentType, limit) |
| GET | `/api/memory/recall-by-intent/:intentType` | All records of a given intent type |
| DELETE | `/api/memory/:id` | Forget (delete) a memory record |
| GET | `/api/memory/intent-types` | List supported intent kinds |
| GET | `/api/memoryos/proxy/:twinId` | Proxy to underlying memory-os |
| GET | `/api/audit` | Recent remember/recall operations |

## Intent kinds

- `remember` — agent wants to remember something
- `recall` — agent wants to recall something
- `forget` — agent wants to forget something
- `reflect` — agent wants to summarize or reflect

## Next steps

- Persist to MongoDB (currently in-memory Map)
- Add semantic search across intent-tagged memories (use Vector DB 4780)
- Add TTL support so old memories auto-expire
