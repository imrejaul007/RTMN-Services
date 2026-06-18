# Division 6 — AI Data & Knowledge Cloud

> **Status:** 🟡 ~30% built (Knowledge Base exists; vector DB, RAG, data lake are missing)
> **Owner:** HOJAI AI Data Platform team

---

## 1. Mission

**Without data there is no AI.** This division owns the data layer — knowledge graphs, vector databases, data lakes, feature stores, ETL, semantic search, RAG. Everything that Division 3 (Intelligence) and Division 4 (Agents) read from.

## 2. Target State (per plan)

```
Data & Knowledge Cloud
├── Knowledge Graph        (entity relationships, ontology)
├── Vector Database        (embeddings store + similarity search)
├── Data Lake              (raw + processed data storage)
├── Feature Store          (ML features with versioning)
├── Document Intelligence  (PDF/Word/Excel parsing + extraction)
├── ETL                    (extract-transform-load pipelines)
├── Data Connectors        (pre-built integrations to 100+ sources)
├── Analytics Platform     (BI, dashboards, reports)
├── Data Catalog           (metadata, lineage, discovery)
├── Graph Database         (for KG + relationship-heavy queries)
├── Semantic Search        (meaning-based search, not keyword)
├── RAG Platform           (retrieval-augmented generation framework)
└── Knowledge Extraction   (NER, entity linking, fact extraction)
```

## 3. Current State — What's Built

| Capability | Service | Port | State |
|---|---|---|---|
| **Knowledge Base** (with AI search) | [services/knowledge-base/](../../../services/knowledge-base/) | 4940 | ✅ Real |
| **Knowledge Marketplace** (SOPs/docs/templates) | [services/knowledge-marketplace/](../../../services/knowledge-marketplace/) | 4939 | ✅ Real |
| **GraphQL Federation** (data federation across services) | [services/graphql-federation/](../../../services/graphql-federation/) | 4000 | ✅ Real |
| **Analytics OS** (BI dashboards, reports) | [industry-os/services/analytics-os/](../../../industry-os/services/analytics-os/) | 4750 | ✅ Real |
| **Reports Dashboard** | [services/reports-dashboard/](../../../services/reports-dashboard/) | 4874 | ✅ Real |
| **HOJAI Knowledge Graph** (scaffold, not running) | companies/HOJAI-AI/hojai-knowledge-graph/ | 4786 | 🟡 Mock scaffold (deleted in cleanup) |

## 4. What's NOT Built (the real gap)

| Missing | Why It Matters | Effort |
|---|---|---|
| **Vector Database** | Zero vector DB code in the repo. Critical for RAG. | 2 weeks — adopt Pinecone/Qdrant |
| **RAG Platform** | Knowledge Base has search but no full RAG pipeline (chunking, embeddings, retrieval, augmentation) | 4-6 weeks |
| **Document Intelligence** | No PDF/Word/Excel parser. Most enterprise docs are PDFs. | 6-8 weeks |
| **Data Connectors** | No pre-built integrations to Salesforce/HubSpot/Stripe/etc. | 8-12 weeks |
| **Data Lake** | No central raw data store. Each service has its own DB. | 4-8 weeks (depends on cloud choice) |
| **Feature Store** | No ML feature registry. Models re-compute features ad-hoc. | 4-6 weeks |
| **ETL** | No pipeline orchestration. Data flows are manual. | 6-8 weeks |
| **Data Catalog** | No metadata/lineage. Hard to find what data exists where. | 6-8 weeks |
| **Graph Database** | No Neo4j/Neptune. KGs need a real graph DB. | 2-4 weeks |
| **Knowledge Extraction** | No NER / entity linking service. | 4-6 weeks |
| **Semantic Search** (standalone) | Knowledge Base has it but no dedicated service. | already done |

## 5. Gap Score

**~30% of target state is built.** Knowledge Base + Marketplace + Analytics cover the "see existing data" use case. The "make data AI-ready" use case (vector DB, RAG, document intelligence, connectors) is missing.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Vector Database + embeddings service** | 🔴 P0 | 2 weeks — unblocks RAG |
| 2 | **RAG Platform** | 🔴 P0 | 4-6 weeks — most impactful for Division 3 |
| 3 | **Document Intelligence** (PDF/Word/Excel) | 🟡 P1 | 6-8 weeks |
| 4 | **Data Connectors** (Salesforce/HubSpot/Stripe etc.) | 🟡 P1 | 8-12 weeks |
| 5 | **Graph Database** | 🟡 P1 | 2-4 weeks |
| 6 | **Knowledge Extraction** (NER) | 🟢 P2 | 4-6 weeks |
| 7 | **Feature Store** | 🟢 P2 | 4-6 weeks |
| 8 | **Data Lake** | 🟢 P2 | 4-8 weeks (cloud-specific) |
| 9 | **ETL pipelines** | 🟢 P2 | 6-8 weeks |
| 10 | **Data Catalog** | 🟢 P3 | 6-8 weeks |

## 7. Dependencies

- **Depends on:** Division 1 (auth, tenant isolation), Division 7 (embeddings come from LLM)
- **Blocks:** Division 3 (Intelligence reads from here), Division 4 (Agents retrieve from here), Division 7 (Training consumes data)

## 8. Open Questions

- **Vector DB choice:** Managed (Pinecone) vs self-hosted (Qdrant) vs Postgres extension (pgvector). Affects cost, ops, lock-in.
- **Graph DB choice:** Neo4j (industry standard, $$), Neptune (AWS lock-in), Memgraph, or just use Postgres with ltree?
- **Data residency:** Each RTMN company has customer data in different regions. Does the Data Lake federate by region or centralize?
- **RAG vs Fine-tuning:** For domain knowledge, is RAG enough or do you also need fine-tuning? Affects priority between this division and Division #7.

---

*See also: [services/knowledge-base/CLAUDE.md](../../../services/knowledge-base/CLAUDE.md), [services/knowledge-marketplace/CLAUDE.md](../../../services/knowledge-marketplace/CLAUDE.md), [industry-os/services/analytics-os/CLAUDE.md](../../../industry-os/services/analytics-os/CLAUDE.md)*