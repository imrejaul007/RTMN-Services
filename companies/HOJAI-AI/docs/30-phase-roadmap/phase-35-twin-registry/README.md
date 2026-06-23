# Phase 35: Twin Registry — 2 weeks

> **The registry that versions, schemas, and tracks every digital twin — the "things" in the AI world.**
>
> **Status:** 📋 NEW — Not started
> **Duration:** 2 weeks
> **Team:** 1 backend engineer + 1 frontend engineer
> **Priority:** P1
> **Depends on:** Phase 4 (TwinOS Foundation)
> **Blocks:** Phase 38 (AI Studio)

---

## 🎯 Goal

Build a **twin registry** — the source of truth for every digital twin HOJAI manages. Provides versioning, schema registry, marketplace, deprecation, and relationship tracking.

**Why this is critical:** Twins are the "things" in the AI world (Customer Twin, Order Twin, Wallet Twin, etc.). With 86+ twins today and 200+ planned, you need a registry to manage them. Without it, twin sprawl becomes unmanageable.

---

## 📊 Current State

**Problem:** HOJAI has 86+ twins across TwinOS. But:
- No versioning (twin v1, v2, v3 — which schema is in use?)
- No schema registry (no central source of truth for twin structure)
- No marketplace (can't share twins across orgs)
- No deprecation (old twins linger forever)
- No relationship tracking (Customer Twin ↔ Order Twin — how do they connect?)

**Reference:** Schema Registry (Confluent), AWS Service Catalog, Google Cloud Deployment Manager

---

## 🎁 Deliverables

### 35.1 Twin Versioning (Week 1)
- **Semantic versioning:** v1.0.0, v1.1.0, v2.0.0
- **Twin metadata:** Name, version, owner, description, tags
- **Twin schema:** JSON Schema for twin structure
- **Migration guide:** How to migrate from v1 to v2
- **Backward compatibility:** v2 reads v1 data

### 35.2 Twin Schema Registry (Week 1)
- **Central schema store:** All twin schemas in one place
- **Schema validation:** Validate twin instances against schema
- **Schema evolution:** Track schema changes over time
- **Schema diff:** Compare v1 and v2 schemas
- **Schema documentation:** Auto-generated docs

### 35.3 Twin Marketplace (Week 1)
- **Public marketplace:** Browse twins from community
- **Private marketplace:** Internal twins for your org
- **Twin packages:** Customer Twin + Order Twin + Wallet Twin as a package
- **Ratings & reviews:** 1-5 stars, written reviews
- **Usage stats:** Downloads, active installations

### 35.4 Twin Deprecation (Week 2)
- **Deprecation warning:** Mark twin as deprecated, warn on use
- **Migration deadline:** Set date after which twin is removed
- **Replacement twin:** "Use Customer Twin v2 instead"
- **Deprecation log:** Track who is still using deprecated twin
- **Auto-migration:** Migrate v1 data to v2 automatically

### 35.5 Twin Relationships (Week 2)
- **Relationship types:** has, belongs_to, references, owns
- **Relationship graph:** Visual graph of all twin relationships
- **Cascade rules:** Delete Customer → cascade to Orders
- **Relationship validation:** Ensure referential integrity
- **Relationship queries:** "Find all orders for customer X"

### 35.6 Twin Lineage (Week 2)
- **Data lineage:** Where does twin data come from?
- **Twin lineage:** Which workflows/models created this twin?
- **Impact analysis:** "If I change Customer Twin, what breaks?"
- **Lineage graph:** Visual lineage

### 35.7 Twin Permissions (Week 2)
- **RBAC:** Who can read, write, delete
- **Tenant isolation:** Tenant A can't see Tenant B's twin instances
- **Field-level permissions:** Some fields public, some private
- **Audit log:** Who accessed which twin instance

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TWIN REGISTRY ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 TWIN MARKETPLACE (UI)                         │  │
│  │  • Browse  • Search  • Publish  • Install  • Rate            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     REGISTRY API                              │  │
│  │  • Register  • Version  • List  • Get  • Deprecate          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   SCHEMA REGISTRY                             │  │
│  │  • JSON Schema  • Validation  • Evolution  • Documentation   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  RELATIONSHIP GRAPH                           │  │
│  │  • has, belongs_to, references, owns  • Cascade rules       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  LINEAGE TRACKER                              │  │
│  │  • Data lineage  • Twin lineage  • Impact analysis           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              STORAGE                                          │  │
│  │  • MongoDB (schemas, metadata)  • Neo4j (relationships)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              INTEGRATIONS                                     │  │
│  │  • TwinOS Hub (Phase 4)  • Customer Twin (Phase 4)          │  │
│  │  • Order Twin (Phase 4)  • Wallet Twin (Phase 4)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
# Twin Registration
POST   /api/twin-registry/twins               # Register twin type
GET    /api/twin-registry/twins               # List twin types
GET    /api/twin-registry/twins/:id           # Get twin type
PUT    /api/twin-registry/twins/:id           # Update twin type
DELETE /api/twin-registry/twins/:id           # Delete twin type

# Versioning
POST   /api/twin-registry/twins/:id/versions  # New version
GET    /api/twin-registry/twins/:id/versions  # List versions
POST   /api/twin-registry/twins/:id/versions/:v/deprecate  # Deprecate
POST   /api/twin-registry/twins/:id/versions/:v/migrate  # Migrate data

# Schema Registry
GET    /api/twin-registry/schemas             # List schemas
GET    /api/twin-registry/twins/:id/schema    # Get twin schema
POST   /api/twin-registry/twins/:id/validate  # Validate twin instance
GET    /api/twin-registry/twins/:id/schema/diff?from=v1&to=v2  # Diff schemas

# Marketplace
GET    /api/twin-registry/marketplace         # Browse marketplace
POST   /api/twin-registry/marketplace/publish  # Publish twin
POST   /api/twin-registry/marketplace/:id/install  # Install twin
POST   /api/twin-registry/marketplace/:id/review  # Review twin

# Relationships
POST   /api/twin-registry/relationships       # Create relationship
GET    /api/twin-registry/relationships       # List relationships
GET    /api/twin-registry/twins/:id/relationships  # Get twin's relationships
POST   /api/twin-registry/twins/:id/graph     # Get relationship graph

# Lineage
GET    /api/twin-registry/twins/:id/lineage   # Get lineage
GET    /api/twin-registry/twins/:id/impact    # Impact analysis
```

---

## 🧪 Test Gates

- **Unit tests:** 85%+ coverage
- **Integration tests:** All endpoints + TwinOS Hub integration
- **E2E test:** Register twin → Version → Validate instance → Deprecate
- **Schema test:** Schema validation catches invalid instances
- **Migration test:** v1 data migrates to v2 successfully
- **Performance test:** Validate 10,000 twin instances in <1 minute

**Definition of Done:**
- [ ] All 7 deliverables complete
- [ ] All test gates pass
- [ ] Documentation: API, user guide
- [ ] Marketplace UI deployed
- [ ] Integration with TwinOS Hub live
- [ ] 86 existing twins migrated to registry

---

## 📊 Success Criteria

- **Coverage:** 100% of twins registered
- **Latency:** Twin lookup <10ms, validation <50ms
- **Reliability:** 99.9% uptime
- **Adoption:** 200+ twins registered (existing 86 + new)
- **Marketplace:** 50+ community-published twins

---

## 🚀 Implementation Details

### Tech Stack
- **Backend:** Node.js/TypeScript
- **Storage:** MongoDB (schemas, metadata), Neo4j (relationships)
- **UI:** React (marketplace, admin)

### Key Services
- `twin-registry` (port 4850) — Main API
- `twin-schema-registry` (port 4851) — Schema management
- `twin-relationship-graph` (port 4852) — Relationship tracking
- `twin-marketplace` (port 4853) — Marketplace

### Integration Points
- **TwinOS Hub (Phase 4):** All twins validated against registry
- **Customer/Order/Wallet Twins (Phase 4):** Use registry for versioning
- **AI Studio (Phase 38):** Visual twin designer uses registry
- **Agent OS (Phase 32):** Agents read/write twin instances

---

## 📚 Documentation Deliverables

- [ ] **API Reference** — All endpoints
- [ ] **User Guide** — How to register twins
- [ ] **Schema Guide** — How to write twin schemas
- [ ] **Migration Guide** — How to migrate between versions
- [ ] **Marketplace Guide** — How to publish/install
- [ ] **Best Practices** — Versioning, deprecation, relationships

---

## 🔗 Related Phases

- **Depends on:** Phase 4 (TwinOS Foundation)
- **Blocks:** Phase 38 (AI Studio)
- **Related:** Phase 33 (Model Registry), Phase 34 (Workflow Registry), Phase 36 (Knowledge Registry)

---

*Last Updated: June 22, 2026*
