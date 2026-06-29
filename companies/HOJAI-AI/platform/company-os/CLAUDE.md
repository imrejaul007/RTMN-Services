# CompanyOS - AI Context

**Platform Version:** 1.0.0
**Last Updated:** June 29, 2026
**Status:** Production Ready ✅

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/company-os

# Start
bash scripts/start-company-os.sh start

# CLI
cd cli && npm install && npm link
company-os create "My Restaurant" --industry restaurant

# Studio UI
cd studio && npm install && npm run dev
# http://localhost:5173
```

## What This Platform Does

CompanyOS composes companies from pre-built components:
- **Department Packs** (Finance, HR, Marketing, Sales, Operations, Legal)
- **Industry Extensions** (Restaurant, Beauty, Hotel, Retail, Healthcare, Education)
- **AI Workers** (AI CFO, AI Recruiter, AI CMO, etc.)
- **Service Connectors** (Connects to 32+ REZ-Merchant services)

## Key Files

| File | Purpose |
|------|---------|
| `README.md` | User documentation |
| `PHASE-STATUS.md` | Phase completion status |
| `composition-engine/` | Core company composer |
| `control-plane/` | HTTP API (port 4010) |
| `department-packs/` | 6 department packs |
| `industry-extensions/` | Industry services |
| `service-connectors/` | REZ integrations |
| `ai-workforce/` | AI worker deployment |
| `studio/` | React web UI |
| `cli/` | CLI commands |

## Test Commands

```bash
# All tests
cd composition-engine && npm test

# Individual
cd department-packs/finance && npm test
cd ai-workforce && npm test
cd industry-extensions/restaurant && npm test
cd industry-extensions/beauty && npm test
```

**117 tests passing**

## Architecture

```
CompanyOS Control Plane (4010)
    │
    ├── Composition Engine → Department Packs
    │                            ├── Finance (4801)
    │                            ├── HR
    │                            └── ...
    │
    ├── Industry Extensions
    │       ├── Restaurant (5010)
    │       ├── Beauty (5090)
    │       └── ...
    │
    ├── Service Connectors → REZ-Merchant (32+ services)
    │
    └── AI Workforce → 10 AI workers
```

## Industry Extensions

| Extension | Port | Services |
|-----------|------|----------|
| Restaurant | 5010 | Menu, Kitchen, POS, Reservations |
| Beauty | 5090 | Appointments, Stylists, Services, Memberships |
| Hotel | TBD | PMS, Housekeeping, Billing |
| Retail | TBD | POS, Inventory, Loyalty |
| Healthcare | TBD | EMR, Appointments, Pharmacy |
| Education | TBD | LMS, Enrollments, Assessments |

## Service Connectors

| Connector | REZ Services |
|-----------|--------------|
| Restaurant | 7 services |
| Beauty | 4 services |
| Hotel | 5 services |
| Retail | 6 services |
| Healthcare | 5 services |
| Education | 5 services |

## AI Workers

| Department | Workers |
|------------|---------|
| Finance | AI CFO, AI Accountant, AI Treasury Manager |
| HR | AI Recruiter, AI Payroll Manager |
| Marketing | AI CMO, AI Content Manager |
| Sales | AI SDR, AI Closer |
| Operations | AI Ops Manager |
| Legal | AI Legal Counsel |

## Ports

| Service | Port |
|---------|------|
| Control Plane | 4010 |
| Finance Pack | 4801 |
| Restaurant Extension | 5010 |
| Beauty Extension | 5090 |
| Studio UI | 5173 |

## Common Tasks

### Add new industry extension
1. Copy `industry-extensions/restaurant/` as template
2. Rename for new industry
3. Update `manifest.yaml`
4. Add tests
5. Update `service-connectors/src/index.ts`

### Add new AI worker
1. Add to `ai-workforce/src/registry/index.ts`
2. Add to department manifest
3. Add tests

### Connect new REZ service
1. Add service URL to connector
2. Add methods to connector class
3. Add to `REZ_SERVICE_REGISTRY`

## Environment Variables

```bash
COMPANY_OS_API=http://localhost:4010
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

## Docker

```bash
docker compose up -d
docker compose logs -f
docker compose down
```
