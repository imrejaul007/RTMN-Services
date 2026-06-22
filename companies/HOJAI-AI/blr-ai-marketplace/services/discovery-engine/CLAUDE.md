# SUTAR OS — Discovery Engine (Port 4256)

> **Status:** ✅ NEW — Built June 20, 2026
> **SUTAR Layer:** 7 — Discovery / Universal Search
> **Purpose:** Universal search across services, agents, twins, and intents across the RTMN ecosystem

---

## Mission

When a caller wants to find anything in the RTMN ecosystem — "give me a service that does fine-tuning", "find an agent that handles customer complaints", "what twins exist for hotels?" — they need a single search endpoint that returns ranked results across all kinds. Discovery Engine is that endpoint. It indexes documents from any source (services, agents, twins, intents) and provides a simple tokenized-search API.

## Architecture

```
[Caller] → POST /api/search {query, kinds}
              ↓
   tokenize(query) → score docs in each kind
              ↓
   return ranked results with kind + score + source attribution
```

Documents can be indexed ad-hoc (`POST /api/index`) or pre-seeded (this service comes pre-loaded with 13 services, 8 agents, 6 twins).

## Scoring

Token-based with weighted fields:
- Exact match on name: +10
- Substring on name: +5
- Substring on description: +2
- Exact match on tag: +3
- Token in any field: +1

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/index` | Index one document (`{kind, doc}`) |
| POST | `/api/index/bulk` | Bulk index (`{kind, docs[]}`) |
| DELETE | `/api/index/:id` | Remove document |
| POST | `/api/search` | Universal search (`{query, limit, kinds}`) |
| POST | `/api/search/services` | Search only services |
| POST | `/api/search/agents` | Search only agents |
| POST | `/api/search/twins` | Search only twins |
| POST | `/api/search/intents` | Search only intents |
| GET | `/api/indexes` | List all kinds + counts |
| GET | `/api/indexes/:kind` | List entries in a kind (paged) |
| GET | `/health` | Health + counts |

## Example

```bash
curl -X POST http://localhost:4256/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "fine-tune training", "limit": 5}'
# Returns ranked services/agents with relevance scores
```

## Seeded Data (built-in)

| Kind | Count | Examples |
|------|-------|----------|
| service | 13 | HOJAI Intelligence, Fine-Tuning Pipeline, GPU Cluster Manager, SUTAR Intent Bus, SUTAR Usage Tracker, SUTAR Simulation OS, Agent Marketplace, Decision Engine, Trust Engine, Negotiation AI, MemoryOS, TwinOS Hub, Synthetic Data Gen |
| agent | 8 | fineTuning, syntheticData, gpuCluster, sutarIntentBus, sutarUsageTracker, sutarSimulation, inference, retrieval |
| twin | 6 | commerce.customer, commerce.order, commerce.wallet, people.employee, hospitality.hotel, healthcare.patient |

## Known Limitations

- In-memory index — doesn't persist across restarts
- Token-only matching (no stemming, no fuzzy match, no semantic similarity). For real semantic search, use vector-db (4780).
- No ranking learning — fixed-weight scoring
- No federated queries — single-process index only

## Integration with HOJAI Intelligence (4881)

Wired into `/api/route` and `/api/agents` as `sutarDiscovery`. Also accessible via Hub (4399) at `/api/discovery/...`.

## Related Services

- `/services/agent-marketplace` (4845) — provider of agent listings
- `/services/vector-db` (4780) — for semantic (embedding-based) search
- `/services/intent-bus` (4154) — source of intent-kind documents

---

*See also: [companies/HOJAI-AI/divisions/12-sutar-os/CLAUDE.md](../../divisions/12-sutar-os/CLAUDE.md)*