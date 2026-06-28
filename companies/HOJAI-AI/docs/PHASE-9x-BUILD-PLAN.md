# 9 Remaining Phases — Build Plan

> **Date:** June 28, 2026  
> **Scope:** 3 MISSING services + 6 PARTIAL/STUB services  
> **Effort:** 5-8 days total  
> **Tests:** ~200 new tests estimated

---

## Quick Wins (1-2 hours each)

### Phase 39: Memory Lifecycle Service
**Gap:** No dedicated service. Memory lifecycle is spread across memory-os, memory-forgetting, memory-governance.

**What to build:**
- Service at `platform/memory/memory-lifecycle/src/` (port 4899)
- Features:
  - Memory TTL management (auto-expire old memories)
  - Memory compaction (compress redundant facts)
  - Memory pruning (remove low-confidence facts)
  - Memory archival (move old memories to cold storage)
  - Lifecycle hooks (on-forget, on-compact, on-archive)
  - GDPR deletion (right-to-erasure compliance)
- **Tests:** ~15 passing
- **Effort:** 2 hours

### Phase 36: Knowledge Registry Service
**Gap:** No dedicated registry. Knowledge marketplace exists but not a registry.

**What to build:**
- Service at `platform/intelligence/knowledge-registry/src/` (port 4900)
- Features:
  - Knowledge asset CRUD (articles, facts, concepts, ontologies)
  - Version control (semantic versioning)
  - Provenance tracking (source, author, confidence)
  - Taxonomy management (hierarchical categories)
  - Search (keyword + semantic)
  - Dependency graph (knowledge → related knowledge)
- **Tests:** ~15 passing
- **Effort:** 2 hours

### Phase 37: Event Platform
**Gap:** Event bus exists but not a unified event platform.

**What to build:**
- Service at `platform/intelligence/event-platform/src/` (port 4901)
- Features:
  - Event schema registry (define event types)
  - Event ingestion API (publish events)
  - Event subscription (subscribe to event types)
  - Event routing (rules-based routing)
  - Event replay (replay from timestamp)
  - Event analytics (volume, latency, error rates)
- **Tests:** ~15 passing
- **Effort:** 3 hours

---

## Medium Effort (half-day each)

### Phase 25: Developer Platform Completion
**Gap:** Foundry CLI scaffold exists. Need to complete SDK collection.

**What to build:**
- Complete `@hojai/core-sdk` with:
  - Client for every new service (agent-os, personalization, ai-economy, governance, planning-engine, multi-modal, aiops)
  - TypeScript definitions for all APIs
  - Authentication helpers
  - Retry utilities
- Complete `@hojai/cli` with:
  - `npx hojai init` (scaffold project)
  - `npx hojai add agent <name>` (add agent template)
  - `npx hojai deploy` (deploy to cloud)
  - `npx hojai logs <service>` (tail logs)
  - `npx hojai status` (service health)
- **Tests:** ~20 passing
- **Effort:** 4 hours

### Phase 34: Workflow Registry
**Gap:** AI Studio has workflow management. Need a dedicated registry.

**What to build:**
- Service at `platform/studio/workflow-registry/src/` (port 4902)
- Features:
  - Workflow template CRUD (save as template)
  - Workflow versioning (semantic versioning)
  - Workflow categories (by industry, use case)
  - Workflow search (by name, category, complexity)
  - Workflow import/export (JSON, YAML)
  - Workflow analytics (usage, success rate)
- **Tests:** ~15 passing
- **Effort:** 3 hours

### Phase 35: Twin Registry
**Gap:** TwinOS Hub manages 86+ twins. Need a dedicated registry.

**What to build:**
- Service at `platform/twins/twin-registry/src/` (port 4903)
- Features:
  - Twin type CRUD (define twin schemas)
  - Twin instance registry (all twin instances)
  - Twin relationship registry (connections between twins)
  - Twin search (by type, attributes, relationships)
  - Twin versioning (schema evolution)
  - Twin lifecycle (register, update, deprecate, archive)
- **Tests:** ~15 passing
- **Effort:** 3 hours

---

## Larger Effort (1+ day each)

### Phase 24: Enterprise Runtime — Multi-Region
**Gap:** Multi-tenant SUTAR shards exist. No multi-region isolation.

**What to build:**
- Tenant isolation service at `platform/multi-tenant/isolation/` (port 4904)
- Features:
  - Region assignment per tenant
  - Data residency enforcement
  - Cross-region replication (read replicas)
  - Failover routing (auto-switch region on outage)
  - Compliance mapping (GDPR region rules)
  - Latency-based routing (geo-DNS)
- **Tests:** ~20 passing
- **Effort:** 1 day

### Phase 29: Memory Intelligence — Advanced
**Gap:** Pattern detection exists. Need advanced ML features.

**What to build:**
- Service at `platform/memory/memory-intelligence-v2/src/` (port 4905)
- Features:
  - Anomaly detection (unusual memory patterns)
  - Predictive memory (anticipate what user will need)
  - Memory clustering (group related memories)
  - Memory graph analytics (centrality, influence)
  - Memory quality scoring (accuracy, freshness, completeness)
  - Memory recommendation engine (what to learn next)
- **Tests:** ~15 passing
- **Effort:** 1 day

### Phase 33: Model Registry — Standalone
**Gap:** Part of fine-tuning platform. Need standalone registry.

**What to build:**
- Service at `platform/training/model-registry/src/` (port 4906)
- Features:
  - Model CRUD (register, deprecate, archive)
  - Model versioning (checkpoint tracking)
  - Model metadata (parameters, training data, benchmarks)
  - Model deployment management (staging → production)
  - Model rollback (revert to previous checkpoint)
  - Model comparison (side-by-side benchmarks)
  - A/B model routing (traffic splitting)
- **Tests:** ~20 passing
- **Effort:** 4 hours

---

## Summary Table

| Phase | Name | Port | Tests | Effort | Priority |
|-------|------|------|-------|--------|----------|
| 39 | Memory Lifecycle | 4899 | 15 | 2h | P0 |
| 36 | Knowledge Registry | 4900 | 15 | 2h | P0 |
| 37 | Event Platform | 4901 | 15 | 3h | P0 |
| 34 | Workflow Registry | 4902 | 15 | 3h | P1 |
| 35 | Twin Registry | 4903 | 15 | 3h | P1 |
| 25 | Dev Platform SDK | — | 20 | 4h | P1 |
| 33 | Model Registry | 4906 | 20 | 4h | P1 |
| 29 | Memory Intelligence V2 | 4905 | 15 | 1 day | P2 |
| 24 | Multi-Region Isolation | 4904 | 20 | 1 day | P2 |

**Total: 130+ tests, ~5-8 days**

---

## Port Allocations

| Port | Service | Phase |
|------|---------|-------|
| 4899 | memory-lifecycle | 39 |
| 4900 | knowledge-registry | 36 |
| 4901 | event-platform | 37 |
| 4902 | workflow-registry | 34 |
| 4903 | twin-registry | 35 |
| 4904 | tenant-isolation | 24 |
| 4905 | memory-intelligence-v2 | 29 |
| 4906 | model-registry | 33 |

---

## Service Template (Copy-Paste Pattern)

Every service follows this pattern:

```javascript
// src/index.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || '<PORT>';

// CRUD routes...
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

app.listen(PORT, () => console.log(`Service on ${PORT}`));
export default app;

// src/store.js
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const DATA_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
export function readJson(name) { const p = join(DATA_DIR, name); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : null; }
export function writeJson(name, data) { fs.writeFileSync(join(DATA_DIR, name), JSON.stringify(data, null, 2)); }
```

---

## Recommended Order

**Day 1 (P0 Quick Wins):**
1. Phase 39 — Memory Lifecycle (2h)
2. Phase 36 — Knowledge Registry (2h)
3. Phase 37 — Event Platform (3h)

**Day 2 (P1 Registries):**
4. Phase 34 — Workflow Registry (3h)
5. Phase 35 — Twin Registry (3h)
6. Phase 25 — Dev Platform SDK (4h)

**Day 3 (P1 Service):**
7. Phase 33 — Model Registry (4h)

**Day 4-5 (P2 Large):**
8. Phase 29 — Memory Intelligence V2 (1 day)
9. Phase 24 — Multi-Region Isolation (1 day)

**Or parallelize** by running 3 agents simultaneously for the quick wins, then 2 for registries, then finish the larger ones.
