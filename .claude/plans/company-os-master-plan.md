# CompanyOS Master Plan

> **Version:** 1.0  
> **Created:** June 29, 2026  
> **Status:** Approved  
> **Vision:** Runtime-first, composition-driven, migration-safe, manifest-backed, backward-compatible

---

## Executive Summary

CompanyOS transforms RTMN from 50+ standalone IndustryOS services into a unified **composition platform** where companies are created by composing universal (CompanyOS), organizational (DepartmentOS), and vertical (IndustryExtension) layers.

```
CompanyOS Control Plane
        ↓
Manifest Registry
        ↓
Composition Engine
        ↓
Department Pack Installer
        ↓
Industry Extension Installer
        ↓
AI Workforce Deployer
        ↓
Twin Graph Generator
        ↓
Nexha + Consumer Networks
```

---

## The Problem (Current State)

| Aspect | Reality |
|--------|---------|
| IndustryOS count | 24 services |
| IndustryOS code duplication | 99% identical across all 24 |
| DepartmentOS integration | 0% wired to IndustryOS |
| CompanyOS | Does not exist |
| AI Workers | Built but not deployed |
| Manifests | Do not exist |

**Each IndustryOS is a standalone monolith that duplicates:**
- CRM logic
- HR logic
- Finance logic
- Analytics logic
- Authentication
- Customer management

---

## The Solution (Target State)

```
CompanyOS (Universal Business Functions)
├── Identity Module (CorpID)
├── HR Module (WorkforceOS)
├── CRM Module (SalesOS)
├── Finance Module (FinanceOS)
├── Communications Module
├── Documents Module
├── Analytics Module
├── Governance Module
└── AI Workforce Module (SUTAR)

DepartmentOS (Organizational Execution)
├── HR Department Pack
├── Finance Department Pack
├── Marketing Department Pack
├── Sales Department Pack
├── Operations Department Pack
└── Legal Department Pack

IndustryExtension (Vertical Intelligence)
├── RestaurantExtension
├── BeautyExtension
├── HealthcareExtension
├── RetailExtension
└── ... (20 more)
```

**Vertical Specificity Ratio Target: >=85%**

---

## Phase Plan

### Phase 1: Foundation (Weeks 1-6)
**Goal:** Build the Composition Engine + Manifest Registry

| Deliverable | Location | Description |
|-------------|----------|-------------|
| CompanyOS Control Plane | `platform/company-os/control-plane/` | API server on port 4010 |
| Composition Engine | `platform/company-os/composition-engine/` | Core orchestration logic |
| Manifest Registry | `platform/company-os/manifest-registry/` | YAML storage + versioning |
| Department Pack Registry | `platform/company-os/department-packs/` | Pack manifest definitions |

---

### Phase 2: Department Packs (Weeks 7-12)
**Goal:** Convert existing DepartmentOS to tenant-aware packs

| Deliverable | Location | Description |
|-------------|----------|-------------|
| Finance Department Pack | `platform/company-os/packs/finance/` | FinanceOS as a pack |
| HR Department Pack | `platform/company-os/packs/hr/` | WorkforceOS as a pack |
| Marketing Department Pack | `platform/company-os/packs/marketing/` | MarketingOS as a pack |
| Sales Department Pack | `platform/company-os/packs/sales/` | SalesOS as a pack |
| Operations Department Pack | `platform/company-os/packs/operations/` | OperationsOS as a pack |

---

### Phase 3: AI Workforce Deployment (Weeks 13-18)
**Goal:** Wire SUTAR to Department Packs

| Deliverable | Location | Description |
|-------------|----------|-------------|
| AI Workforce Deployer | `platform/company-os/ai-workforce/` | Deployment orchestration |
| AI Department Heads | `platform/company-os/ai-workers/` | CFO, CMO, Recruiter, etc. |
| Worker Registry | `platform/company-os/worker-registry/` | Worker lifecycle management |

---

### Phase 4: Restaurant Extension (Weeks 19-26)
**Goal:** Migrate RestaurantOS to extension pattern

| Deliverable | Location | Description |
|-------------|----------|-------------|
| RestaurantExtension | `platform/company-os/extensions/restaurant/` | Vertical-specific code only |
| Compatibility Adapters | `platform/company-os/adapters/restaurant/` | Legacy route wrappers |
| Migration Toolkit | `platform/company-os/migration/` | Automated migration scripts |

---

### Phase 5: Industry Extensions (Weeks 27-52)
**Goal:** Migrate remaining 23 IndustryOS

| Industry | Location | Target Week |
|----------|----------|-------------|
| BeautyExtension | `platform/company-os/extensions/beauty/` | Week 30 |
| HealthcareExtension | `platform/company-os/extensions/healthcare/` | Week 34 |
| RetailExtension | `platform/company-os/extensions/retail/` | Week 38 |
| HotelExtension | `platform/company-os/extensions/hotel/` | Week 42 |
| EducationExtension | `platform/company-os/extensions/education/` | Week 46 |
| +18 more | `platform/company-os/extensions/*/` | Week 52 |

---

## Directory Structure

```
platform/company-os/
|
|-- CLAUDE.md                    # This file - master reference
|-- README.md                    # Quick start guide
|
|-- control-plane/               # Phase 1
|   |-- src/
|   |   |-- index.ts            # Express server on :4010
|   |   |-- routes/
|   |   |   |-- company.ts       # Company CRUD
|   |   |   |-- deploy.ts        # Deployment endpoints
|   |   |   |-- manifest.ts      # Manifest endpoints
|   |   |-- middleware/
|   |   |   |-- auth.ts
|   |   |-- types/
|   |       |-- index.ts
|   |-- __tests__/
|   |   |-- control-plane.test.ts
|   |-- package.json
|
|-- composition-engine/           # Phase 1
|   |-- src/
|   |   |-- engine.ts            # Core composition logic
|   |   |-- dependency-resolver.ts
|   |   |-- installer.ts
|   |   |-- rollback.ts
|   |   |-- state-manager.ts
|   |-- __tests__/
|   |   |-- engine.test.ts
|   |   |-- dependency-resolver.test.ts
|   |   |-- rollback.test.ts
|   |-- package.json
|
|-- manifest-registry/            # Phase 1
|   |-- src/
|   |   |-- registry.ts          # YAML storage
|   |   |-- versions.ts          # Versioning logic
|   |   |-- snapshots.ts         # Rollback snapshots
|   |-- __tests__/
|   |   |-- registry.test.ts
|   |-- package.json
|
|-- department-packs/             # Phase 2
|   |-- registry.yaml            # All available packs
|   |
|   |-- finance/
|   |   |-- manifest.yaml
|   |   |-- agents/
|   |   |-- policies/
|   |   |-- workflows/
|   |   |-- dashboards/
|   |   |-- knowledge/
|   |   |-- connectors/
|   |
|   |-- hr/
|   |   |-- manifest.yaml
|   |   |-- ...
|   |
|   |-- marketing/
|   |   |-- manifest.yaml
|   |   |-- ...
|   |
|   |-- sales/
|   |   |-- manifest.yaml
|   |   |-- ...
|   |
|   |-- operations/
|   |   |-- manifest.yaml
|   |   |-- ...
|   |
|   |-- legal/
|       |-- manifest.yaml
|       |-- ...
|
|-- industry-extensions/           # Phase 4-5
|   |-- registry.yaml            # All available extensions
|   |
|   |-- restaurant/
|   |   |-- manifest.yaml        # Vertical-only code
|   |   |-- menus/
|   |   |-- kitchen/
|   |   |-- pos/
|   |   |-- reservations/
|   |   |-- delivery/
|   |   |-- recipes/
|   |
|   |-- beauty/
|   |   |-- manifest.yaml
|   |   |-- services/
|   |   |-- stylists/
|   |   |-- appointments/
|   |   |-- memberships/
|   |
|   |-- healthcare/
|   |   |-- manifest.yaml
|   |   |-- patients/
|   |   |-- doctors/
|   |   |-- emr/
|   |   |-- prescriptions/
|   |
|   |-- [20 more...]
|
|-- ai-workforce/                # Phase 3
|   |-- src/
|   |   |-- deployer.ts          # Worker deployment
|   |   |-- registry.ts          # Worker lifecycle
|   |   |-- health-monitor.ts
|   |-- workers/
|   |   |-- ai-cfo/
|   |   |-- ai-cmo/
|   |   |-- ai-recruiter/
|   |   |-- ai-closer/
|   |   |-- [10 more...]
|   |-- __tests__/
|   |   |-- deployer.test.ts
|
|-- adapters/                    # Phase 4-5
|   |-- restaurant/
|   |   |-- compatibility.ts     # Legacy route wrappers
|   |-- beauty/
|   |-- healthcare/
|   |-- ...
|
|-- migration/                   # Phase 4-5
|   |-- toolkit/
|   |   |-- migrate.ts
|   |   |-- validate.ts
|   |-- scripts/
|   |   |-- migrate-restaurant.sh
|   |   |-- migrate-beauty.sh
|   |   |-- migrate-healthcare.sh
|   |   |-- [21 more...]
|   |-- __tests__/
|       |-- migration.test.ts
|
|-- twin-graph/                  # Phase 3-4
|   |-- src/
|   |   |-- generator.ts         # Twin creation
|   |   |-- linker.ts           # Twin relationships
|   |   |-- sync.ts             # Twin synchronization
|   |-- __tests__/
|   |   |-- generator.test.ts
|
|-- shared/                      # Cross-cutting
    |-- types/
    |   |-- company.ts
    |   |-- department.ts
    |   |-- extension.ts
    |   |-- manifest.ts
    |-- utils/
    |   |-- logger.ts
    |   |-- validation.ts
    |-- templates/
        |-- company-manifest.yaml
        |-- department-pack.yaml
```

---

## Success Metrics

| Metric | Target | Phase |
|--------|--------|-------|
| Company creation time | < 30 seconds | 1 |
| Manifest auto-generation | 100% on success | 1 |
| Department pack count | 6 packs | 2 |
| AI worker deployment | 100% on company create | 3 |
| Restaurant Extension specificity | >=85% | 4 |
| Industry Extensions migrated | 24 total | 5 |
| Legacy route compatibility | 100% during migration | 4-5 |

---

## Implementation Status

| Phase | Status | Start Date | End Date |
|-------|--------|-----------|----------|
| Phase 1: Foundation | Pending | TBD | TBD |
| Phase 2: Department Packs | Pending | TBD | TBD |
| Phase 3: AI Workforce | Pending | TBD | TBD |
| Phase 4: Restaurant Extension | Pending | TBD | TBD |
| Phase 5: Industry Extensions | Pending | TBD | TBD |

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Control Plane port | 4010 | Outside existing ranges, memorable |
| Manifest format | YAML | Human-readable, versionable |
| Runtime-first | Yes | Manifest derived from runtime, not vice versa |
| Backward compatibility | Required | No breaking changes during migration |
| Specificity target | >=85% | Industry extensions must be vertical-focused |
| Migration approach | Adapter + Progressive | SAP/Kubernetes evolution pattern |
