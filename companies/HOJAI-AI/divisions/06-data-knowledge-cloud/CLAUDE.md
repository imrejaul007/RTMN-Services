# Division 6 — AI Data & Knowledge Cloud

> **Status:** 🟢 ~70% built (Vector DB + RAG Platform + Document Intelligence all shipped June 19)
> **Owner:** HOJAI AI Data Platform team
> **Last updated:** June 19, 2026

---

## 1. Mission

**Without data there is no AI.** This division owns the data layer — knowledge graphs, vector databases, data lakes, feature stores, ETL, semantic search, RAG. Everything that Division 3 (Intelligence) and Division 4 (Agents) read from.

## 2. Target State (per plan)

```
Data & Knowledge Cloud
├── Knowledge Graph        (entity relationships, ontology)
├── Vector Database        (embeddings store + similarity search)        ✅ DONE
├── Data Lake              (raw + processed data storage)
├── Feature Store          (ML features with versioning)
├── Document Intelligence  (PDF/Word/Excel parsing + extraction)
├── ETL                    (extract-transform-load pipelines)
├── Data Connectors        (pre-built integrations to 100+ sources)
├── Analytics Platform     (BI, dashboards, reports)
├── Data Catalog           (metadata, lineage, discovery)
├── Graph Database         (for KG + relationship-heavy queries)
├── Semantic Search        (meaning-based search, not keyword)
├── RAG Platform           (retrieval-augmented generation framework)    ✅ DONE
└── Knowledge Extraction   (NER, entity linking, fact extraction)
```

## 3. Current State — What's Built

| Capability | Service | Port | State |
|---|---|---|---|
| **Vector Database** (collections, cosine/dot/euclidean, metadata filtering, shared FNV-1a 128-dim vectorizer, batch upsert) | [services/vector-db/](../../../services/vector-db/) | **4780** | ✅ NEW |
| **RAG Platform** (document ingestion, chunking, retrieval, LLM augmentation via inference-gateway) | [services/rag-platform/](../../../services/rag-platform/) | **4781** | ✅ NEW |
| **Document Intelligence** (PDF/DOCX/XLSX/CSV/TXT/MD/HTML parser + one-shot extract-and-RAG) | [services/document-intelligence/](../../../services/document-intelligence/) | **4782** | ✅ NEW |
| **Knowledge Base** (with AI search) | [services/knowledge-base/](../../../services/knowledge-base/) | 4940 | ✅ Real |
| **Knowledge Marketplace** (SOPs/docs/templates) | [services/knowledge-marketplace/](../../../services/knowledge-marketplace/) | 4939 | ✅ Real |
| **GraphQL Federation** (data federation across services) | [services/graphql-federation/](../../../services/graphql-federation/) | 4000 | ✅ Real |
| **Analytics OS** (BI dashboards, reports) | [industry-os/services/analytics-os/](../../../industry-os/services/analytics-os/) | 4750 | ✅ Real |
| **Reports Dashboard** | [services/reports-dashboard/](../../../services/reports-dashboard/) | 4874 | ✅ Real |
| **HOJAI Knowledge Graph** (scaffold, not running) | companies/HOJAI-AI/hojai-knowledge-graph/ | 4786 | 🟡 Mock scaffold (deleted in cleanup) |

## 4. What's NOT Built (the real gap)

| Missing | Why It Matters | Effort |
|---|---|---|
| **Data Connectors** | No pre-built integrations to Salesforce/HubSpot/Stripe/etc. | 8-12 weeks |
| **Data Lake** | No central raw data store. Each service has its own DB. | 4-8 weeks (depends on cloud choice) |
| **Feature Store** | No ML feature registry. Models re-compute features ad-hoc. | 4-6 weeks |
| **ETL** | No pipeline orchestration. Data flows are manual. | 6-8 weeks |
| **Data Catalog** | No metadata/lineage. Hard to find what data exists where. | 6-8 weeks |
| **Graph Database** | No Neo4j/Neptune. KGs need a real graph DB. | 2-4 weeks |
| **Knowledge Extraction** | No NER / entity linking service. | 4-6 weeks |
| **Semantic Search** (standalone) | Knowledge Base has it but no dedicated service. | already done |

## 5. Gap Score

**~70% of target state is built.** Vector DB + RAG Platform + Document Intelligence all shipped in one day (June 19, 2026). Together they form a complete "ingest documents → retrieve → answer" pipeline. The next layer is **Data Connectors** (Salesforce/HubSpot/Stripe) to pull from external systems, then Graph Database for relationship-heavy queries.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| ~~1~~ | ~~Vector Database + embeddings service~~ | ✅ DONE | — |
| ~~2~~ | ~~RAG Platform~~ | ✅ DONE | — |
| ~~3~~ | ~~Document Intelligence (PDF/Word/Excel)~~ | ✅ DONE | — |
| 1 | **Data Connectors** (Salesforce/HubSpot/Stripe etc.) | 🔴 P0 | 8-12 weeks |
| 3 | **Graph Database** | 🟡 P1 | 2-4 weeks |
| 4 | **Knowledge Extraction** (NER) | 🟢 P2 | 4-6 weeks |
| 5 | **Feature Store** | 🟢 P2 | 4-6 weeks |
| 6 | **Data Lake** | 🟢 P2 | 4-8 weeks (cloud-specific) |
| 7 | **ETL pipelines** | 🟢 P2 | 6-8 weeks |
| 8 | **Data Catalog** | 🟢 P3 | 6-8 weeks |

## 7. What shipped (June 19, 2026)

### Vector DB (port 4780) — ~1,500 lines
- In-memory vector store (Map of collections × Map of vectors) — no external DB needed
- Three similarity metrics: cosine, dot product, Euclidean
- FNV-1a bag-of-words + L2-normalize vectorizer at 128 dims (shared with semantic-cache so embeddings are interoperable)
- Metadata filtering with 9 operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `exists` (AND combined)
- Batch upsert, batch delete, paginated listing
- Audit log (cap 10k), stats, dependency-free embedding endpoint at `POST /api/embed`
- Pre-built `/api/search-by-text` for clients that don't want to manage embeddings themselves

### RAG Platform (port 4781) — ~1,100 lines
- Document ingestion: chunking (configurable size + overlap, sentence-boundary aware) → embedding via vector-db → storage in named collection
- `POST /api/rag/query`: embed query → search top-k → assemble context → call inference-gateway (`4770`) → return answer with sources
- `POST /api/retrieve`: retrieval-only (no LLM call) for clients that want to prompt themselves
- `POST /api/rag/stream`: stub (returns 501, planned for next sprint)
- Dependency health surfaced in `/api/health` — both `vectorDb` and `inferenceGateway` pinged at startup
- Per-collection document registry, query counters, token tracking

### Document Intelligence (port 4782) — ~750 lines
- PDF (text-based), DOCX, XLSX, CSV, TXT, MD, HTML parsers — all pure JS, zero native deps
- Format auto-detection from filename + mimeType
- `POST /api/extract` — single document, returns full text + metadata + structure
- `POST /api/extract/batch` — up to 50 docs in one call
- `POST /api/extract-and-rag` — the killer one-shot endpoint: extract → chunk → embed → store in RAG collection
- Per-format caveats documented in `/api/formats`

### All three wired into HOJAI Intelligence (4881) routing table
- `vector: http://localhost:4780`, `rag: http://localhost:4781`, `documentIntelligence: http://localhost:4782`
- New agents `vector`, `rag`, `docIntel` listed in `/api/agents` (18 total)
- New capabilities `embed`, `vectorSearch`, `vectorUpsert`, `ragQuery`, `ragRetrieve`, `ragIngest`, `docExtract`, `docExtractBatch`, `docExtractAndRag`, `docFormats`

## 8. Dependencies

- **Depends on:** Division 1 (auth, tenant isolation), Division 7 (embeddings come from LLM)
- **Blocks:** Division 3 (Intelligence reads from here), Division 4 (Agents retrieve from here), Division 7 (Training consumes data)

## 9. Open Questions

- **Vector DB persistence:** Currently in-memory only. Need to add disk persistence (LMDB / SQLite / Sled) before production.
- **Graph DB choice:** Neo4j (industry standard, $$), Neptune (AWS lock-in), Memgraph, or just use Postgres with ltree?
- **Data residency:** Each RTMN company has customer data in different regions. Does the Data Lake federate by region or centralize?
- **RAG vs Fine-tuning:** For domain knowledge, is RAG enough or do you also need fine-tuning? Affects priority between this division and Division #7.
- **Embedding model:** FNV-1a is fine for dev/demo but production needs real embeddings (OpenAI text-embedding-3, Cohere, or local sentence-transformers).

---

*See also: [services/vector-db/CLAUDE.md](../../../services/vector-db/CLAUDE.md), [services/rag-platform/CLAUDE.md](../../../services/rag-platform/CLAUDE.md), [services/document-intelligence/CLAUDE.md](../../../services/document-intelligence/CLAUDE.md), [services/knowledge-base/CLAUDE.md](../../../services/knowledge-base/CLAUDE.md), [services/knowledge-marketplace/CLAUDE.md](../../../services/knowledge-marketplace/CLAUDE.md), [industry-os/services/analytics-os/CLAUDE.md](../../../industry-os/services/analytics-os/CLAUDE.md)*