# CompanyOS - Platform Reference

> **Canonical Location:** `companies/HOJAI-AI/platform/company-os/`
> **Version:** 1.0
> **Created:** June 29, 2026

---

## What is CompanyOS

CompanyOS is the composition platform for RTMN. It transforms 50+ standalone IndustryOS services into a unified platform where companies are created by composing universal (CompanyOS), organizational (DepartmentOS), and vertical (IndustryExtension) layers.

```
CompanyOS Control Plane (:4010)
        |
        v
Manifest Registry --> Composition Engine
        |                   |
        v                   v
Department Packs --> Industry Extensions
        |                   |
        v                   v
AI Workforce --> Twin Graph --> Nexha
```

---

## Directory Structure

```
company-os/
|
|-- CLAUDE.md              # This file
|-- README.md              # Quick start
|
|-- control-plane/         # Phase 1: API server on :4010
|   |-- src/
|   |   |-- index.ts       # Express server
|   |   |-- routes/
|   |   |-- middleware/
|   |   |-- types/
|   |-- __tests__/
|   |-- package.json
|
|-- composition-engine/     # Phase 1: Core orchestration
|   |-- src/
|   |   |-- engine.ts      # Main composition logic
|   |   |-- dependency-resolver.ts
|   |   |-- installer.ts
|   |   |-- rollback.ts
|   |   |-- state-manager.ts
|   |-- __tests__/
|   |-- package.json
|
|-- manifest-registry/      # Phase 1: YAML storage
|   |-- src/
|   |-- __tests__/
|   |-- package.json
|
|-- department-packs/       # Phase 2: Installable packs
|   |-- registry.yaml
|   |-- finance/
|   |-- hr/
|   |-- marketing/
|   |-- sales/
|   |-- operations/
|   |-- legal/
|
|-- industry-extensions/    # Phase 4-5: Vertical code
|   |-- registry.yaml
|   |-- restaurant/
|   |-- beauty/
|   |-- healthcare/
|   |-- [20 more...]
|
|-- ai-workforce/          # Phase 3: Worker deployment
|   |-- src/
|   |-- workers/
|
|-- adapters/              # Phase 4-5: Legacy compatibility
|
|-- migration/             # Phase 4-5: Migration toolkit
|
|-- twin-graph/            # Phase 3-4: Twin generation
|   |-- src/
|
|-- shared/                # Cross-cutting
    |-- types/
    |-- utils/
    |-- templates/
```

---

## Core Concepts

### 1. Company Manifest
The source of truth for a company composition:
```yaml
company_id: rez_restaurant_001
industry: restaurant
departments:
  - hr
  - finance
  - marketing
  - operations
extensions:
  - pos
  - kitchen
  - delivery
ai_departments:
  marketing:
    enabled: true
    head: ai_cmo
  finance:
    enabled: true
    head: ai_cfo
```

### 2. Department Packs
Self-contained organizational units:
```
finance-pack/
  manifest.yaml      # Pack metadata
  agents/           # AI workers
  policies/         # Governance rules
  workflows/        # Business processes
  dashboards/       # Analytics views
  knowledge/        # Domain knowledge
  connectors/       # External integrations
```

### 3. Industry Extensions
Vertical-specific code only (>=85% specificity):
```
restaurant-extension/
  manifest.yaml     # Extension metadata
  menus/           # Restaurant-specific
  kitchen/         # Kitchen management
  pos/             # Point of sale
  reservations/    # Booking system
  delivery/        # Delivery integration
  recipes/         # Recipe management
```

### 4. AI Workforce
Department-head AI agents that run in SUTAR:
```
ai-cfo/
  manifest.yaml     # Worker config
  skills/          # Domain skills
  policies/        # Authority limits
  memory/          # Memory configuration
  twin/            # Digital twin definition
```

---

## Core API

### Company Management
```typescript
// Create a company
POST /api/company/create
{
  "name": "My Restaurant",
  "industry": "restaurant",
  "departments": ["finance", "marketing", "operations"],
  "extensions": ["pos", "kitchen", "delivery"],
  "ai_departments": {
    "marketing": { "enabled": true, "head": "ai_cmo" },
    "finance": { "enabled": true, "head": "ai_cfo" }
  }
}

// Get company manifest
GET /api/company/:id/manifest

// Update company composition
PATCH /api/company/:id/composition
{
  "departments": ["finance", "marketing", "hr"],
  "extensions": ["pos", "kitchen"]
}
```

### Pack Management
```typescript
// List available packs
GET /api/packs

// Install a pack
POST /api/company/:id/packs/install
{
  "pack": "finance"
}

// Uninstall a pack
DELETE /api/company/:id/packs/:packId
```

### Extension Management
```typescript
// List available extensions
GET /api/extensions

// Install an extension
POST /api/company/:id/extensions/install
{
  "extension": "restaurant"
}

// Migrate from legacy IndustryOS
POST /api/company/:id/migrate
{
  "from": "restaurant-os",
  "to": "restaurant-extension"
}
```

---

## Vertical Specificity Rule

**Every Industry Extension must maintain >=85% vertical-specific code.**

### Forbidden (belongs in CompanyOS/DepartmentOS)
- CRM logic
- HR logic
- Finance logic
- Analytics logic
- Authentication
- Customer management
- Employee management
- Invoice generation
- Payment processing

### Allowed (vertical-specific)
- Industry-specific workflows
- Domain models
- Vertical compliance rules
- Operational logic
- Vertical integrations

### Specificity Calculation
```
Specificity Ratio = Vertical Code LOC / Total Extension LOC

Target: >= 85%
```

---

## Migration Doctrine

### DO NOT
- Rewrite everything at once
- Create duplicate systems
- Break existing routes

### DO
- Build compatibility adapters
- Migrate progressively
- Derive manifests from runtime
- Maintain backward compatibility

### Migration Stages
1. **v1.0**: Legacy IndustryOS continues working
2. **v1.5**: Compatibility adapters added, new routes use DepartmentOS
3. **v2.0**: Legacy code deleted, pure extension pattern

---

## See Also

| Document | Purpose |
|----------|---------|
| `.claude/plans/company-os-master-plan.md` | Full phase plan |
| `composition-engine/SPEC.md` | Engine design |
| `manifest-registry/SPEC.md` | Manifest schema |
| `department-packs/SPEC.md` | Pack structure |
| `industry-extensions/SPEC.md` | Extension structure |
| `migration/SPEC.md` | Migration guide |