# Phase 34: Workflow Registry — 2 weeks

> **The registry that versions, stores, templates, and shares every AI workflow — like npm for AI workflows.**
>
> **Status:** 📋 NEW — Not started
> **Duration:** 2 weeks
> **Team:** 1 backend engineer + 1 frontend engineer
> **Priority:** P1
> **Depends on:** Phase 19 (Workflow Engine)
> **Blocks:** Phase 38 (AI Studio)

---

## 🎯 Goal

Build a **workflow registry** — the source of truth for every AI workflow HOJAI runs, templates, or shares. Provides versioning, templates, testing, rollback, and analytics.

**Why this is critical:** Workflows are the AI equivalent of business processes. They need the same lifecycle as code. Without it, "which workflow is in production?" is unanswerable.

---

## 📊 Current State

**Problem:** HOJAI's workflow engine (Phase 19) executes workflows. But:
- No versioning (workflow v1, v2, v3 — which is in use?)
- No templates (can't reuse workflow patterns)
- No marketplace (can't share workflows across orgs)
- No testing (no unit tests for workflows)
- No rollback (can't revert to previous workflow)
- No analytics (which workflows run most, fail most?)

**Reference:** Temporal, Apache Airflow, Prefect, Dagster, n8n, Zapier

---

## 🎁 Deliverables

### 34.1 Workflow Versioning (Week 1)
- **Semantic versioning:** v1.0.0, v1.1.0, v2.0.0
- **Workflow metadata:** Name, version, owner, description, tags
- **Workflow lineage:** Which workflows depend on this
- **Workflow signature:** Input/output schema
- **Workflow history:** Track all changes

### 34.2 Workflow Templates (Week 1)
- **Reusable blueprints:** "Customer Support Triage", "Lead Enrichment", "Invoice Processing"
- **Template parameters:** Configurable inputs
- **Template marketplace:** Share templates across orgs
- **Template versioning:** Templates versioned like code
- **Template documentation:** Auto-generated docs

### 34.3 Workflow Marketplace (Week 1)
- **Public marketplace:** Browse workflows from community
- **Private marketplace:** Internal workflows for your org
- **Ratings & reviews:** 1-5 stars, written reviews
- **Usage stats:** Downloads, active installations
- **Categories:** By industry, by use case
- **Search:** Full-text + tag-based search

### 34.4 Workflow Testing (Week 2)
- **Unit tests:** Test individual steps
- **Integration tests:** Test workflow end-to-end
- **Mock data:** Test with sample inputs
- **Assertions:** Verify outputs match expected
- **Test coverage:** Track which steps are tested
- **CI/CD integration:** Run tests on every commit

### 34.5 Workflow Rollback (Week 2)
- **Instant rollback:** Revert to previous version
- **Scheduled rollback:** Rollback at specific time
- **Conditional rollback:** Rollback if error rate spikes
- **Rollback history:** Track all rollbacks

### 34.6 Workflow Analytics (Week 2)
- **Run count:** How many times workflow ran
- **Success rate:** % of successful runs
- **Avg duration:** Average execution time
- **Cost per run:** LLM API costs per workflow
- **Failure analysis:** Why workflows fail
- **Top workflows:** Most-used workflows
- **Dashboards:** Grafana dashboards per workflow

### 34.7 Workflow Permissions (Week 2)
- **RBAC:** Who can edit, run, publish
- **Tenant isolation:** Tenant A can't use Tenant B's workflows
- **Approval workflow:** New workflow requires approval
- **Audit log:** Who changed what, when

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   WORKFLOW REGISTRY ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                WORKFLOW MARKETPLACE (UI)                      │  │
│  │  • Browse  • Search  • Publish  • Rate  • Install            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     REGISTRY API                              │  │
│  │  • Register  • Version  • List  • Get  • Test  • Rollback    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    TEMPLATE LIBRARY                           │  │
│  │  • Reusable blueprints  • Industry templates  • Custom       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    TEST RUNNER                                │  │
│  │  • Unit tests  • Integration tests  • Mock data  • Coverage  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    ANALYTICS                                  │  │
│  │  • Run count  • Success rate  • Duration  • Cost  • Errors   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              STORAGE                                          │  │
│  │  • MongoDB (metadata)  • S3 (workflow definitions)           │  │
│  │  • TimescaleDB (analytics)                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              INTEGRATIONS                                     │  │
│  │  • Workflow Engine (Phase 19)  • AI Studio (Phase 38)       │  │
│  │  • Agent OS (Phase 32)  • Event Platform (Phase 37)         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
# Workflow Registration
POST   /api/workflow-registry/workflows       # Register workflow
GET    /api/workflow-registry/workflows       # List workflows
GET    /api/workflow-registry/workflows/:id   # Get workflow
PUT    /api/workflow-registry/workflows/:id   # Update workflow
DELETE /api/workflow-registry/workflows/:id   # Delete workflow

# Versioning
POST   /api/workflow-registry/workflows/:id/versions  # New version
GET    /api/workflow-registry/workflows/:id/versions  # List versions
POST   /api/workflow-registry/workflows/:id/versions/:v/rollback  # Rollback

# Templates
POST   /api/workflow-registry/templates       # Create template
GET    /api/workflow-registry/templates       # List templates
POST   /api/workflow-registry/templates/:id/use  # Use template

# Marketplace
GET    /api/workflow-registry/marketplace     # Browse marketplace
POST   /api/workflow-registry/marketplace/publish  # Publish workflow
POST   /api/workflow-registry/marketplace/:id/install  # Install workflow
POST   /api/workflow-registry/marketplace/:id/review  # Review workflow

# Testing
POST   /api/workflow-registry/workflows/:id/test  # Run tests
GET    /api/workflow-registry/workflows/:id/test/results  # Get results
GET    /api/workflow-registry/workflows/:id/coverage  # Get coverage

# Analytics
GET    /api/workflow-registry/workflows/:id/analytics  # Workflow analytics
GET    /api/workflow-registry/analytics/top  # Top workflows
GET    /api/workflow-registry/analytics/failures  # Failure analysis
```

---

## 🧪 Test Gates

- **Unit tests:** 85%+ coverage
- **Integration tests:** All endpoints + Workflow Engine integration
- **E2E test:** Register workflow → Version → Test → Deploy → Rollback
- **Performance test:** Registry 10,000 workflows
- **Marketplace test:** Publish, install, rate workflow
- **Analytics test:** Track runs accurately

**Definition of Done:**
- [ ] All 7 deliverables complete
- [ ] All test gates pass
- [ ] Documentation: API, user guide
- [ ] Marketplace UI deployed
- [ ] Integration with Workflow Engine live
- [ ] 20 sample templates seeded (10 industries × 2 use cases)

---

## 📊 Success Criteria

- **Coverage:** 100% of workflows registered
- **Latency:** Workflow lookup <50ms
- **Reliability:** 99.9% uptime
- **Adoption:** 1,000+ workflows registered
- **Marketplace:** 500+ community-published workflows

---

## 🚀 Implementation Details

### Tech Stack
- **Backend:** Node.js/TypeScript
- **Storage:** MongoDB (metadata), S3 (definitions), TimescaleDB (analytics)
- **UI:** React (marketplace, admin)

### Key Services
- `workflow-registry` (port 4840) — Main API
- `workflow-marketplace` (port 4841) — Marketplace
- `workflow-test-runner` (port 4842) — Test execution
- `workflow-analytics` (port 4843) — Analytics

### Integration Points
- **Workflow Engine (Phase 19):** Look up workflows from registry
- **AI Studio (Phase 38):** Visual workflow editor uses registry
- **Agent OS (Phase 32):** Run workflows on Agent OS
- **Event Platform (Phase 37):** Trigger workflows on events

---

## 📚 Documentation Deliverables

- [ ] **API Reference** — All endpoints
- [ ] **User Guide** — How to register workflows
- [ ] **Template Guide** — How to create templates
- [ ] **Marketplace Guide** — How to publish/install
- [ ] **Testing Guide** — How to test workflows
- [ ] **Best Practices** — Versioning, rollback, analytics

---

## 🔗 Related Phases

- **Depends on:** Phase 19 (Workflow Engine)
- **Blocks:** Phase 38 (AI Studio)
- **Related:** Phase 33 (Model Registry), Phase 35 (Twin Registry)

---

*Last Updated: June 22, 2026*
