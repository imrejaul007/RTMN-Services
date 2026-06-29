# CompanyOS

> **Status:** In Development  
> **Port:** 4010  
> **Canonical Location:** `companies/HOJAI-AI/platform/company-os/`

---

## What is CompanyOS?

CompanyOS is the composition platform for RTMN. It transforms 50+ standalone IndustryOS services into a unified platform where companies are created by composing:

- **CompanyOS** (Universal Business Functions)
- **DepartmentOS** (Organizational Execution)
- **IndustryExtension** (Vertical Intelligence)

---

## Quick Start

```bash
# Navigate to company-os
cd companies/HOJAI-AI/platform/company-os

# Start the control plane
npm install
npm start
# Server runs on port 4010
```

---

## Create a Company

```bash
curl -X POST http://localhost:4010/api/company/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Restaurant",
    "industry": "restaurant",
    "departments": ["finance", "marketing", "operations"],
    "extensions": ["pos", "kitchen", "reservations"],
    "ai_departments": {
      "finance": { "enabled": true, "head": "ai_cfo" },
      "marketing": { "enabled": true, "head": "ai_cmo" }
    }
  }'
```

---

## Architecture

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

## Phases

| Phase | Duration | Goal |
|-------|----------|------|
| 1: Foundation | Weeks 1-6 | Composition Engine + Manifest Registry |
| 2: Department Packs | Weeks 7-12 | Convert DepartmentOS to packs |
| 3: AI Workforce | Weeks 13-18 | Wire SUTAR to Department Packs |
| 4: Restaurant Extension | Weeks 19-26 | Migrate RestaurantOS |
| 5: Industry Extensions | Weeks 27-52 | Migrate remaining 23 |

---

## Directory Structure

```
company-os/
|
|-- CLAUDE.md                    # Master reference
|-- README.md                    # This file
|
|-- control-plane/               # Phase 1
|-- composition-engine/          # Phase 1
|-- manifest-registry/          # Phase 1
|-- department-packs/            # Phase 2
|-- industry-extensions/         # Phase 4-5
|-- ai-workforce/               # Phase 3
|-- adapters/                    # Phase 4-5
|-- migration/                   # Phase 4-5
|-- twin-graph/                 # Phase 3-4
|-- shared/                      # Cross-cutting
```

---

## Key Principles

1. **Runtime-first**: Manifest is derived from runtime, not vice versa
2. **Composition-driven**: Companies are composed from packs and extensions
3. **Migration-safe**: Progressive migration with backward compatibility
4. **Manifest-backed**: Every company has a manifest as source of truth
5. **Backward-compatible**: Legacy routes continue working during migration

---

## Vertical Specificity Rule

Industry Extensions must maintain >= 85% vertical-specific code.

**Forbidden:** CRM, HR, Finance, Analytics, Authentication  
**Allowed:** Industry workflows, domain models, vertical compliance

---

## See Also

| Document | Purpose |
|----------|---------|
| `.claude/plans/company-os-master-plan.md` | Full phase plan |
| `CLAUDE.md` | Platform reference |
| `composition-engine/SPEC.md` | Engine design |
| `manifest-registry/SPEC.md` | Manifest schema |
| `department-packs/SPEC.md` | Pack structure |
| `industry-extensions/SPEC.md` | Extension structure |
| `migration/SPEC.md` | Migration guide |

---

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| RTMN Hub | 4399 | Service orchestration |
| CorpID | 4702 | Identity |
| MemoryOS | 4703 | Memory |
| TwinOS Hub | 4705 | Digital twins |
| SUTAR OS | 4140 | AI workforce |
| Nexha | 4270 | Commerce network |
