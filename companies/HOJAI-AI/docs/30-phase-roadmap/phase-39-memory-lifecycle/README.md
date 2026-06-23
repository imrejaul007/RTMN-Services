# Phase 39: Memory Lifecycle Management — 2 weeks

> **The lifecycle manager that keeps memories fresh, relevant, and bounded — so memory doesn't grow forever by default.**
>
> **Status:** 📋 NEW — Not started
> **Duration:** 2 weeks
> **Team:** 1 backend engineer + 1 ML engineer
> **Priority:** P1
> **Depends on:** Phase 3 (MemoryOS Foundation)
> **Blocks:** Phase 40 (Agent Lifecycle), Phase 38 (AI Studio)

---

## 🎯 Goal

Build a **memory lifecycle manager** that handles memory creation, expiration, archival, deduplication, conflict resolution, compression, and GDPR right-to-be-forgotten.

**Why this is critical:** Memory grows forever by default. Without lifecycle management, you drown in noise, memory becomes slow and expensive, and old/wrong/duplicate memories pollute the system. With it, memories stay relevant, fresh, and the system stays fast.

---

## 📊 Current State

**Problem:** HOJAI's MemoryOS (Phase 3) stores memories. But:
- Memories never expire (TTL not enforced)
- No archival (old memories in hot storage, expensive)
- No deduplication (same memory stored 100 times)
- No conflict resolution (which version is right?)
- No compression (context windows fill up fast)
- No GDPR right-to-be-forgotten (can't delete user data)

**Reference:** Mem0, Letta, Zep, MemGPT, In-Memory DBs (Redis), Time-series DBs (InfluxDB)

---

## 🎁 Deliverables

### 39.1 Memory Creation & TTL (Week 1)
- **Create memory:** Write new memory with optional TTL
- **TTL enforcement:** Auto-delete memories after N days
- **TTL policies:** Per-tenant, per-memory-type policies
- **TTL alerts:** "Memory X expires in 7 days, extend?"
- **TTL extension:** User can extend TTL

### 39.2 Memory Archival (Week 1)
- **Cold storage:** Move old memories to S3 (cheaper)
- **Archive policies:** "Archive after 90 days"
- **Restore from archive:** Bring back archived memories
- **Archive search:** Search archived memories
- **Archive cost tracking:** Track storage costs

### 39.3 Memory Deduplication (Week 1)
- **Duplicate detection:** Use embeddings to find duplicates
- **Merge duplicates:** Combine into single memory
- **Deduplication policies:** Auto-merge vs flag for review
- **Similarity threshold:** Configurable (0.95 = exact, 0.80 = near-duplicate)
- **Deduplication stats:** "Merged 10,000 duplicates, saved 5GB"

### 39.4 Memory Conflict Resolution (Week 2)
- **Conflict detection:** Detect contradicting memories
- **Resolution policies:** Latest wins, highest confidence wins, manual
- **Conflict log:** Track all conflicts
- **Conflict UI:** UI for resolving conflicts
- **Auto-resolution:** Auto-resolve based on policy

### 39.5 Memory Compression (Week 2)
- **Summarize old memories:** "Last 100 interactions → summary"
- **Compression policies:** Per-tenant, per-agent policies
- **Compression triggers:** "Compress when context >4K tokens"
- **Compression quality:** Ensure summaries preserve meaning
- **Compression stats:** Track compression ratio

### 39.6 Memory Right-to-be-Forgotten (GDPR) (Week 2)
- **User request:** User requests data deletion
- **Cascade delete:** Delete all memories for user
- **Anonymization:** Option to anonymize instead of delete
- **Audit trail:** Track deletion for compliance
- **Compliance reports:** GDPR, CCPA reports
- **Data export:** User can export all their data

### 39.7 Memory Analytics (Week 2)
- **Total memories:** Count by type, by tenant
- **Storage usage:** Hot vs cold storage
- **Cost:** Storage + retrieval costs
- **Top memories:** Most-accessed memories
- **Stale memories:** Memories not accessed in 90 days
- **Quality metrics:** Confidence, freshness, relevance

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                MEMORY LIFECYCLE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  LIFECYCLE POLICIES (UI)                      │  │
│  │  • TTL  • Archive  • Dedup  • Compression  • GDPR           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                        │
│                            ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  LIFECYCLE ENGINE                             │  │
│  │  • Create  • Expire  • Archive  • Deduplicate  • Compress   │  │
│  │  • Resolve conflicts  • Delete (GDPR)                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                        │
│         ┌──────────────────┼──────────────────┐                    │
│         ▼                  ▼                  ▼                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  HOT TIER    │  │  COLD TIER   │  │  ANALYTICS   │           │
│  │  (Postgres)  │  │  (S3)        │  │  (ClickHouse)│           │
│  │              │  │              │  │              │           │
│  │ • Recent     │  │ • Archived   │  │ • Usage      │           │
│  │ • Frequently │  │ • Old        │  │ • Cost       │           │
│  │   accessed   │  │ • Rarely used│  │ • Quality    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                            │                                        │
│                            ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              INTEGRATIONS                                     │  │
│  │  • MemoryOS (Phase 3)  • Memory Context Engine (Phase 3)     │  │
│  │  • Twin Memory Bridge (Phase 3)  • Agent OS (Phase 32)       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
# Memory Creation
POST   /api/memory-lifecycle/memories         # Create memory
GET    /api/memory-lifecycle/memories         # List memories
GET    /api/memory-lifecycle/memories/:id     # Get memory
PUT    /api/memory-lifecycle/memories/:id     # Update memory
DELETE /api/memory-lifecycle/memories/:id     # Delete memory

# TTL
POST   /api/memory-lifecycle/memories/:id/extend  # Extend TTL
GET    /api/memory-lifecycle/memories/expiring     # Expiring soon

# Archival
POST   /api/memory-lifecycle/archive         # Archive old memories
POST   /api/memory-lifecycle/memories/:id/restore  # Restore from archive
GET    /api/memory-lifecycle/archive         # List archived

# Deduplication
POST   /api/memory-lifecycle/dedup           # Find duplicates
POST   /api/memory-lifecycle/dedup/merge     # Merge duplicates
GET    /api/memory-lifecycle/dedup/stats     # Deduplication stats

# Conflict Resolution
GET    /api/memory-lifecycle/conflicts       # List conflicts
POST   /api/memory-lifecycle/conflicts/:id/resolve  # Resolve

# Compression
POST   /api/memory-lifecycle/compress        # Compress old memories
GET    /api/memory-lifecycle/compression/stats  # Compression stats

# GDPR
POST   /api/memory-lifecycle/gdpr/delete     # Delete user data (GDPR)
POST   /api/memory-lifecycle/gdpr/anonymize  # Anonymize user data
POST   /api/memory-lifecycle/gdpr/export     # Export user data
GET    /api/memory-lifecycle/gdpr/audit      # GDPR audit log

# Analytics
GET    /api/memory-lifecycle/analytics/count    # Memory count
GET    /api/memory-lifecycle/analytics/storage  # Storage usage
GET    /api/memory-lifecycle/analytics/cost     # Cost
GET    /api/memory-lifecycle/analytics/stale    # Stale memories

# Policies
POST   /api/memory-lifecycle/policies        # Create policy
GET    /api/memory-lifecycle/policies        # List policies
PUT    /api/memory-lifecycle/policies/:id    # Update policy
DELETE /api/memory-lifecycle/policies/:id    # Delete policy
```

---

## 🧪 Test Gates

- **Unit tests:** 85%+ coverage
- **Integration tests:** All endpoints + MemoryOS integration
- **E2E test:** Create → Expire → Archive → Restore
- **Dedup test:** Detect and merge 1,000 duplicates
- **Conflict test:** Detect contradicting memories
- **GDPR test:** Delete all user data, verify complete
- **Performance test:** Lifecycle 1M memories in <1 hour

**Definition of Done:**
- [ ] All 7 deliverables complete
- [ ] All test gates pass
- [ ] Documentation: API, user guide, GDPR guide
- [ ] Policy UI deployed
- [ ] Integration with MemoryOS live
- [ ] Default policies seeded (TTL, archive, dedup)
- [ ] GDPR compliance verified by legal team

---

## 📊 Success Criteria

- **Coverage:** 100% of memories have lifecycle policies
- **Storage savings:** 50%+ storage reduction from archival
- **Dedup savings:** 30%+ memory count reduction from dedup
- **GDPR compliance:** 100% of deletion requests completed in <30 days
- **Performance:** Memory operations <50ms p95
- **Adoption:** 10M+ memories managed across all customers

---

## 🚀 Implementation Details

### Tech Stack
- **Backend:** Node.js/TypeScript, Python (for ML-based dedup, compression)
- **Storage:** PostgreSQL (hot tier), S3 (cold tier), ClickHouse (analytics)
- **Scheduler:** BullMQ for periodic jobs (TTL, archive, dedup)
- **UI:** React (policy management, analytics)

### Key Services
- `memory-lifecycle` (port 4900) — Main API
- `memory-archive` (port 4901) — Archival service
- `memory-dedup` (port 4902) — Deduplication service
- `memory-compression` (port 4903) — Compression service
- `memory-gdpr` (port 4904) — GDPR compliance

### Default Policies
```yaml
# Default TTL policies
- type: working_memory
  ttl: 1 day
- type: short_term_memory
  ttl: 30 days
- type: long_term_memory
  ttl: 365 days
- type: knowledge_memory
  ttl: never

# Default archive policy
- archive_after: 90 days
- archive_storage: s3://hojai-memory-archive/

# Default dedup policy
- enabled: true
- similarity_threshold: 0.90
- auto_merge: false  # Flag for review

# Default compression policy
- enabled: true
- compress_after: 7 days
- compression_target: <500 tokens
- quality_check: true
```

### Integration Points
- **MemoryOS (Phase 3):** All memories flow through lifecycle
- **Memory Context Engine (Phase 3):** Use lifecycle to filter memories
- **Twin Memory Bridge (Phase 3):** Apply lifecycle to twin memories
- **Agent OS (Phase 32):** Agents see lifecycle-managed memories
- **AI Studio (Phase 38):** Visual policy management

---

## 📚 Documentation Deliverables

- [ ] **API Reference** — All endpoints
- [ ] **User Guide** — How to manage memory lifecycle
- [ ] **Policy Guide** — How to write lifecycle policies
- [ ] **GDPR Guide** — How to handle deletion requests
- [ ] **Best Practices** — TTL, archival, dedup, compression

---

## 🔗 Related Phases

- **Depends on:** Phase 3 (MemoryOS Foundation)
- **Blocks:** Phase 40 (Agent Lifecycle), Phase 38 (AI Studio)
- **Related:** Phase 35 (Twin Registry — twin memories), Phase 12 (RAG — knowledge memories)

---

## 🌟 Why This Is Critical

After Phase 39, HOJAI's memory system becomes:
- **Bounded:** Memories don't grow forever
- **Fresh:** Stale memories are archived/expired
- **Clean:** Duplicates and conflicts are resolved
- **Compliant:** GDPR right-to-be-forgotten works
- **Cost-effective:** Hot storage stays small, cold storage is cheap

This is the difference between "memory that drowns the system" and "memory that stays useful forever."

---

*Last Updated: June 22, 2026*
