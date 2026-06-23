# Phase 33: Model Registry — 2 weeks

> **The registry that versions, stores, distributes, and tracks every AI model — like Docker Hub for models.**
>
> **Status:** 📋 NEW — Not started
> **Duration:** 2 weeks
> **Team:** 1 backend engineer + 1 ML engineer
> **Priority:** P1
> **Depends on:** Phase 11 (LLM Gateway), Phase 26 (Foundation Models)
> **Blocks:** Phase 38 (AI Studio)

---

## 🎯 Goal

Build a **model registry** — the source of truth for every AI model HOJAI uses, fine-tunes, or ships. Provides versioning, storage, distribution, access control, and cost tracking.

**Why this is critical:** Models are the AI equivalent of compiled binaries. You need a registry to version, store, distribute, and roll them back. Without it, "which model is in production?" is unanswerable.

---

## 📊 Current State

**Problem:** HOJAI has 9 LLM models, fine-tunes (Phase 26), and community models. But:
- No versioning (model v1, v2, v3 — which is in use?)
- No central storage (models scattered across services)
- No rollback (can't revert to previous model)
- No A/B testing hooks
- No access control (who can use which model)
- No cost tracking (which models cost how much?)

**Reference:** MLflow Model Registry, Weights & Biases, Hugging Face Hub, BentoML, Seldon Core

---

## 🎁 Deliverables

### 33.1 Model Versioning (Week 1)
- **Semantic versioning:** v1.0.0, v1.1.0, v2.0.0
- **Model metadata:** Name, version, owner, description, tags
- **Model lineage:** Which training data, which fine-tune run
- **Model signature:** Input/output schema
- **Model lineage graph:** Visual graph of model evolution

### 33.2 Model Storage (Week 1)
- **S3-backed storage:** Models in S3 with deduplication
- **Content-addressable:** Models identified by hash
- **Compression:** Automatic compression (gzip, zstd)
- **Deduplication:** Same model across versions stored once
- **Encryption:** At-rest and in-transit encryption

### 33.3 Model Linecard (Week 1)
- **Available models:** UI showing all models
- **Model details:** Pricing, capabilities, limits, examples
- **Model comparison:** Side-by-side comparison
- **Model recommendations:** "For legal text, use Claude-3.5-Sonnet"
- **Public catalog:** Models available to all tenants

### 33.4 Model Access Control (Week 2)
- **RBAC:** Who can use which model
- **Tenant isolation:** Tenant A can't use Tenant B's models
- **Approval workflow:** New model requires approval before GA
- **Audit log:** Who used which model, when, for what

### 33.5 A/B Testing Hooks (Week 2)
- **Traffic split:** 50% v1, 50% v2
- **Sticky sessions:** Same user always gets same model
- **Metrics per model:** Track quality, latency, cost per version
- **Decision support:** "Ship v2? 73% likely better (p<0.01)"

### 33.6 Model Rollback (Week 2)
- **Instant rollback:** Revert to previous version in seconds
- **Scheduled rollback:** Rollback at specific time
- **Conditional rollback:** Rollback if quality drops
- **Rollback history:** Track all rollbacks

### 33.7 Cost Tracking (Week 2)
- **Per-model cost:** Track spend per model
- **Per-tenant cost:** Track spend per tenant per model
- **Per-feature cost:** Track spend per feature using model
- **Budgets:** Set budget per model, alert at 80%, 100%
- **Cost optimization:** "Switch 30% of GPT-4 calls to GPT-4-mini, save $5K/month"

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MODEL REGISTRY ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      MODEL LINE CARD (UI)                     │  │
│  │  • Available models  • Pricing  • Capabilities  • Reviews    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     REGISTRY API                              │  │
│  │  • Register  • Version  • List  • Get  • Delete  • Rollback │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    METADATA STORE                             │  │
│  │  • MongoDB (model metadata, versioning, lineage)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    MODEL STORAGE                              │  │
│  │  • S3 (model artifacts, deduplicated, encrypted)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  ACCESS CONTROL                               │  │
│  │  • RBAC  • Tenant isolation  • Approval workflow            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  A/B TESTING & ROLLOUT                        │  │
│  │  • Traffic split  • Sticky sessions  • Metrics per model     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  COST TRACKING                                │  │
│  │  • Per-model  • Per-tenant  • Per-feature  • Budgets         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              INTEGRATIONS                                     │  │
│  │  • LLM Gateway (Phase 11)  • Foundation Models (Phase 26)   │  │
│  │  • Evaluation (Phase 31)  • AI Studio (Phase 38)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
# Model Registration
POST   /api/registry/models                   # Register new model
GET    /api/registry/models                   # List models
GET    /api/registry/models/:id               # Get model
PUT    /api/registry/models/:id               # Update model
DELETE /api/registry/models/:id               # Delete model

# Versioning
POST   /api/registry/models/:id/versions      # Create new version
GET    /api/registry/models/:id/versions      # List versions
GET    /api/registry/models/:id/versions/:v   # Get version
POST   /api/registry/models/:id/versions/:v/rollback  # Rollback

# Line Card
GET    /api/registry/linecard                 # Public line card
GET    /api/registry/models/:id/linecard      # Model line card
GET    /api/registry/models/compare?ids=a,b   # Compare models

# Access Control
POST   /api/registry/models/:id/permissions   # Set permissions
GET    /api/registry/models/:id/permissions   # Get permissions
POST   /api/registry/models/:id/approve       # Approve model

# A/B Testing
POST   /api/registry/ab/start                 # Start A/B test
GET    /api/registry/ab/:id                   # Get A/B status
POST   /api/registry/ab/:id/stop              # Stop A/B test

# Cost Tracking
GET    /api/registry/cost/models              # Cost per model
GET    /api/registry/cost/tenants             # Cost per tenant
GET    /api/registry/cost/features            # Cost per feature
POST   /api/registry/cost/budgets             # Set budget
```

---

## 🧪 Test Gates

- **Unit tests:** 85%+ coverage
- **Integration tests:** All endpoints + LLM Gateway integration
- **E2E test:** Register model → Version → Deploy → Rollback
- **Performance test:** Serve 1,000 model requests/sec
- **Storage test:** Deduplication saves 50%+ storage
- **Cost tracking test:** Track costs accurately to the cent

**Definition of Done:**
- [ ] All 7 deliverables complete
- [ ] All test gates pass
- [ ] Documentation: API, user guide
- [ ] Line card UI deployed
- [ ] Integration with LLM Gateway live
- [ ] 5 sample models registered (GPT-4, Claude-3.5, Gemini, etc.)

---

## 📊 Success Criteria

- **Coverage:** 100% of LLM Gateway models registered
- **Latency:** Model lookup <10ms
- **Reliability:** 99.9% uptime
- **Storage efficiency:** 50%+ deduplication savings
- **Adoption:** 100+ models registered (community + commercial)

---

## 🚀 Implementation Details

### Tech Stack
- **Backend:** Node.js/TypeScript
- **Storage:** MongoDB (metadata), S3 (artifacts)
- **CDN:** CloudFront for model distribution
- **UI:** React (line card, admin)

### Key Services
- `model-registry` (port 4830) — Main API
- `model-storage` (port 4831) — S3 management
- `model-linecard` (port 4832) — Public catalog
- `model-cost-tracker` (port 4833) — Cost tracking

### Integration Points
- **LLM Gateway (Phase 11):** Look up models from registry
- **Foundation Models (Phase 26):** Register fine-tuned models
- **Evaluation (Phase 31):** Test models in registry
- **AI Studio (Phase 38):** Choose models from registry

---

## 📚 Documentation Deliverables

- [ ] **API Reference** — All endpoints
- [ ] **User Guide** — How to register models
- [ ] **Line Card Guide** — How to publish models
- [ ] **Cost Guide** — How to track and optimize costs

---

## 🔗 Related Phases

- **Depends on:** Phase 11 (LLM Gateway), Phase 26 (Foundation Models)
- **Blocks:** Phase 38 (AI Studio)
- **Related:** Phase 31 (Evaluation), Phase 34 (Workflow Registry)

---

*Last Updated: June 22, 2026*
