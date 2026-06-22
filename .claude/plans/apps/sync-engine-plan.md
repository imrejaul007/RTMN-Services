# Sync Engine — Sub-Plan

**The keystone of the v2 ecosystem.** All 10 apps write events here. BuzzLocal reads from here.
**Parent plan:** [`../rtmn-consumer-ecosystem-v2.md`](../rtmn-consumer-ecosystem-v2.md)
**Owner:** RABTUL Technologies (infrastructure company)
**Build first.** Nothing else works without it.

---

## Purpose
Single write-bus for all 10 apps + read API for BuzzLocal and any app that wants world data.

## Services (6 new)
| Port | Service | Purpose |
|------|---------|---------|
| 4960 | sync-engine-api | HTTP event ingestion |
| 4961 | sync-enricher | HOJAI AI tagging, dedup |
| 4962 | sync-privacy | Visibility filter |
| 4963 | sync-fanout | Publish to subscribers |
| 4964 | sync-audit | Compliance, deletion (GDPR/DPDP) |
| 4965 | place-graph-writer | Neo4j place writer |

## Reuses
- Neo4j (port 7687, shared with RiderCircle)
- MemoryOS (port 4703)
- HOJAI LLM (port 4730)
- REZ Intelligence (port 4530)

## v1 (4 weeks) — Critical Path
- 4960 sync-engine-api: POST /events endpoint, 7 event types
- 4961 sync-enricher: location normalization, category tagging via HOJAI LLM
- 4962 sync-privacy: filter by user privacy class
- 4963 sync-fanout: publish to 1 subscriber (BuzzLocal)
- 4964 sync-audit: log all events, support `DELETE /user/:id` (GDPR/DPDP right-to-be-forgotten)
- 4965 place-graph-writer: Neo4j MERGE on place_id

## v2 (4 weeks)
- 4965 place-graph-writer adds place relationships (nearby, similar, popular-at-time)
- Add 3 more event types: `PhotoUploaded`, `CheckInCreated`, `ReactionAdded`
- Cross-app search (find all memories of Cubbon Park across RisaLife, RiderCircle, Go4Food)
- Per-app rate limits + backpressure

## v3 (6+ weeks)
- ML-based dedup (same place, different names)
- Temporal graphs (how a place changes over time)
- Federated graph queries across multiple Neo4j instances
- Event streaming via Kafka for high-throughput consumers

## Critical risks
- **Privacy leak** if 4962 has bugs. DPDP fines in India are 2% of global revenue.
- **Event loss** if queue is unreliable. Every event must be ack'd before HTTP 200.
- **Enrichment cost** if HOJAI LLM is called for every event. Batch + cache.

## Acceptance criteria
- 100K events/day sustained, p95 < 200ms
- 0 privacy leaks in first 90 days
- 0 event loss in chaos test (kill -9 the service mid-write)
- GDPR/DPDP delete completes in <60s for any user
