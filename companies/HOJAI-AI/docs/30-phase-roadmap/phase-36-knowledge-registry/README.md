# Phase 36: Knowledge Registry — 2 weeks

> **The registry that tracks every knowledge source — freshness, quality, lineage, and what it powers.**
>
> **Status:** 📋 NEW — Not started
> **Duration:** 2 weeks
> **Team:** 1 backend engineer + 1 ML engineer
> **Priority:** P1
> **Depends on:** Phase 12 (RAG Engine), Phase 13 (Embedding Service)
> **Blocks:** Phase 38 (AI Studio)

---

## 🎯 Goal

Build a **knowledge registry** — the source of truth for every knowledge source HOJAI's RAG uses. Tracks freshness, quality, lineage, and which AI features use which knowledge.

**Why this is critical:** RAG is only as good as the knowledge it retrieves. You need to know what you know, how fresh it is, where it came from, and which answers used which sources. Without it, RAG becomes a black box that may be returning stale or wrong information.

---

## 📊 Current State

**Problem:** HOJAI's RAG engine (Phase 12) retrieves knowledge. But:
- No knowledge source registry (which sources are in use?)
- No freshness tracking (last crawled, staleness score)
- No quality scoring (accuracy, completeness)
- No lineage (which answers used which sources?)
- No conflict resolution (Wikipedia says X, your docs say Y)

**Reference:** Apache Atlas, DataHub, Amundsen, LinkedIn WhereHows

---

## 🎁 Deliverables

### 36.1 Knowledge Source Registration (Week 1)
- **Source types:** URL, file (PDF, DOCX), database, API, Notion, Confluence
- **Source metadata:** Name, type, owner, description, tags
- **Source versioning:** Track changes to source content
- **Source schedule:** How often to re-crawl
- **Source permissions:** Who can read this source

### 36.2 Knowledge Versioning (Week 1)
- **Source versioning:** Wikipedia 2024-01 vs 2024-02
- **Content hashing:** Identify content by hash
- **Diff detection:** Detect when content changes
- **Rollback:** Revert to previous version
- **Version history:** Track all versions

### 36.3 Freshness Tracking (Week 1)
- **Last crawled:** When was source last updated
- **Staleness score:** 0-100, higher = more stale
- **Freshness policy:** "Re-crawl every 24 hours"
- **Staleness alerts:** "Source X is 7 days stale"
- **Freshness dashboard:** Real-time view of all sources

### 36.4 Quality Scoring (Week 2)
- **Accuracy score:** How accurate is the source?
- **Completeness score:** How complete is the source?
- **Relevance score:** How relevant to user's query?
- **Trust score:** Combined quality score
- **Quality over time:** Track quality changes
- **Quality alerts:** "Source X quality dropped to 60%"

### 36.5 Lineage Tracking (Week 2)
- **Source lineage:** Where did this knowledge come from?
- **Answer lineage:** Which sources were used for this answer?
- **Citation graph:** Visual graph of citations
- **Lineage-based trust:** "Answer is high trust because it cites 3 high-quality sources"

### 36.6 Conflict Resolution (Week 2)
- **Conflict detection:** Detect when sources disagree
- **Conflict resolution policies:** Latest wins, highest quality wins, manual
- **Conflict log:** Track all conflicts
- **Conflict UI:** UI for resolving conflicts
- **Conflict alerts:** "Sources X and Y disagree on Z"

### 36.7 Knowledge Analytics (Week 2)
- **Source usage:** Which sources are used most?
- **Answer quality:** Average quality of answers per source
- **Coverage gaps:** "No source covers topic X"
- **Cost per source:** Compute + storage cost per source
- **Top sources:** Most useful sources

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  KNOWLEDGE REGISTRY ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              KNOWLEDGE CATALOG (UI)                           │  │
│  │  • Browse sources  • Quality scores  • Freshness  • Lineage  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     REGISTRY API                              │  │
│  │  • Register  • Version  • Score  • Track  • Resolve         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  SOURCE CONNECTORS                            │  │
│  │  • URL  • File  • Database  • Notion  • Confluence  • APIs  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  FRESHNESS TRACKER                            │  │
│  │  • Last crawled  • Staleness score  • Re-crawl schedule     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  QUALITY SCORER                               │  │
│  │  • Accuracy  • Completeness  • Relevance  • Trust           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  LINEAGE TRACKER                              │  │
│  │  • Source lineage  • Answer lineage  • Citation graph       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              CONFLICT RESOLVER                                │  │
│  │  • Detect conflicts  • Resolve  • Log  • Alert              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              INTEGRATIONS                                     │  │
│  │  • RAG Engine (Phase 12)  • Embedding Service (Phase 13)   │  │
│  │  • AI Studio (Phase 38)  • Evaluation (Phase 31)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
# Knowledge Source Registration
POST   /api/knowledge-registry/sources        # Register source
GET    /api/knowledge-registry/sources        # List sources
GET    /api/knowledge-registry/sources/:id    # Get source
PUT    /api/knowledge-registry/sources/:id    # Update source
DELETE /api/knowledge-registry/sources/:id    # Delete source

# Versioning
POST   /api/knowledge-registry/sources/:id/versions  # New version
GET    /api/knowledge-registry/sources/:id/versions  # List versions
POST   /api/knowledge-registry/sources/:id/versions/:v/rollback  # Rollback

# Freshness
GET    /api/knowledge-registry/sources/:id/freshness  # Get freshness
POST   /api/knowledge-registry/sources/:id/recrawl  # Force re-crawl
GET    /api/knowledge-registry/staleness      # Staleness dashboard

# Quality
GET    /api/knowledge-registry/sources/:id/quality  # Get quality score
POST   /api/knowledge-registry/sources/:id/score  # Re-score source
GET    /api/knowledge-registry/quality/top    # Top quality sources
GET    /api/knowledge-registry/quality/low    # Low quality sources

# Lineage
GET    /api/knowledge-registry/sources/:id/lineage  # Source lineage
GET    /api/knowledge-registry/answers/:id/lineage  # Answer lineage
GET    /api/knowledge-registry/lineage/graph  # Full lineage graph

# Conflict Resolution
GET    /api/knowledge-registry/conflicts      # List conflicts
POST   /api/knowledge-registry/conflicts/:id/resolve  # Resolve conflict

# Analytics
GET    /api/knowledge-registry/analytics/usage  # Source usage
GET    /api/knowledge-registry/analytics/coverage  # Coverage gaps
GET    /api/knowledge-registry/analytics/cost  # Cost per source
```

---

## 🧪 Test Gates

- **Unit tests:** 85%+ coverage
- **Integration tests:** All endpoints + RAG Engine integration
- **E2E test:** Register source → Crawl → Version → Track freshness → Score quality
- **Conflict test:** Two sources disagree, conflict detected
- **Lineage test:** Answer lineage traces back to sources
- **Performance test:** Score 1,000 sources in <1 minute

**Definition of Done:**
- [ ] All 7 deliverables complete
- [ ] All test gates pass
- [ ] Documentation: API, user guide
- [ ] Catalog UI deployed
- [ ] Integration with RAG Engine live
- [ ] 10 sample sources seeded (Wikipedia, arXiv, etc.)

---

## 📊 Success Criteria

- **Coverage:** 100% of RAG knowledge sources registered
- **Latency:** Source lookup <10ms, quality scoring <1s
- **Reliability:** 99.9% uptime
- **Freshness:** 95% of sources have staleness score <7 days
- **Quality:** Avg quality score >80% across all sources
- **Adoption:** 1,000+ knowledge sources registered

---

## 🚀 Implementation Details

### Tech Stack
- **Backend:** Node.js/TypeScript, Python (for quality scoring)
- **Storage:** MongoDB (sources, metadata), S3 (content), Neo4j (lineage)
- **UI:** React (catalog, admin)

### Key Services
- `knowledge-registry` (port 4860) — Main API
- `knowledge-connectors` (port 4861) — Source connectors
- `knowledge-freshness` (port 4862) — Freshness tracking
- `knowledge-quality` (port 4863) — Quality scoring
- `knowledge-lineage` (port 4864) — Lineage tracking
- `knowledge-conflicts` (port 4865) — Conflict resolution

### Integration Points
- **RAG Engine (Phase 12):** Use registry to find sources
- **Embedding Service (Phase 13):** Embed sources from registry
- **AI Studio (Phase 38):** Visual knowledge base setup
- **Evaluation (Phase 31):** Evaluate RAG using registry

---

## 📚 Documentation Deliverables

- [ ] **API Reference** — All endpoints
- [ ] **User Guide** — How to register sources
- [ ] **Connector Guide** — How to add custom connectors
- [ ] **Quality Guide** — How quality is scored
- [ ] **Lineage Guide** — How to trace lineage
- [ ] **Best Practices** — Freshness, quality, conflict resolution

---

## 🔗 Related Phases

- **Depends on:** Phase 12 (RAG Engine), Phase 13 (Embedding Service)
- **Blocks:** Phase 38 (AI Studio)
- **Related:** Phase 33 (Model Registry), Phase 35 (Twin Registry), Phase 31 (Evaluation)

---

*Last Updated: June 22, 2026*
