# BCP Engine — Business Capability Pack Registry

> **Version:** 0.1.0
> **Port:** 4298
> **Location:** `companies/HOJAI-AI/platform/bcp-engine/`
> **Status:** ✅ Production-ready — 21 tests passing

**BCP Engine** is the registry and installer for Business Capability Packs (BCPs). A BCP is a pre-built bundle of AI employees, skills, workflows, and integrations that a company can install with one click to add a new department capability.

---

## What is a BCP?

A **Business Capability Pack (BCP)** bundles everything a company needs for a business function:

- **AI Employees** — AI agents that perform the work (e.g., AI Sales Agent)
- **Skills** — specific capabilities the employee has (e.g., Proposal Generator)
- **Workflows** — automated business processes (e.g., Lead Nurture Sequence)
- **Integrations** — external system connections (e.g., CRM, accounting software)
- **Setup Steps** — guided onboarding (e.g., "Connect your CRM")

**5 BCPs shipped (2026-06-25):**

| Pack | Category | Description | Rating | Installs |
|------|----------|-------------|--------|----------|
| Sales AI Pack | sales | Lead gen, qualification, proposal, CRM sync | 3.8 | 500 |
| Finance AI Pack | finance | Invoicing, reconciliation, expense tracking | 4.6 | 527 |
| Procurement AI Pack | procurement | Supplier discovery, RFQ, contracts | 4.9 | 343 |
| Support AI Pack | support | 24/7 FAQ, ticket routing, WhatsApp | 4.9 | 269 |
| Marketing AI Pack | marketing | Content, campaigns, social, analytics | 4.3 | 336 |

---

## Quick Start

```bash
# Start the service
cd companies/HOJAI-AI/platform/bcp-engine
npm start

# Health check
curl http://localhost:4298/health

# Browse packs
curl http://localhost:4298/api/v1/packs

# Get a specific pack
curl http://localhost:4298/api/v1/packs/bcp-sales-ai

# Install a pack for a company
curl -X POST http://localhost:4298/api/v1/install \
  -H 'Content-Type: application/json' \
  -d '{"bcpId": "bcp-sales-ai", "companyId": "acme-corp"}'

# Run tests
npm test
```

---

## API Endpoints

### Browse & Search

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/packs` | List all packs (supports `?q=`, `?category=`, `?sort=popular\|rating\|recent\|name`, `?page=`, `?pageSize=`) |
| GET | `/api/v1/packs/:id` | Get a single pack by ID |
| GET | `/api/v1/categories` | List all categories with their packs |

### Install & Manage

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/install` | Install a BCP for a company (`{ bcpId, companyId }`) |
| GET | `/api/v1/installations/:companyId` | List installed BCPs for a company |
| DELETE | `/api/v1/installations/:companyId/:bcpId` | Uninstall a BCP |
| PATCH | `/api/v1/installations/:companyId/:bcpId/steps/:stepId` | Update a setup step status (`{ status, config? }`) |

### Info

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + stats |
| GET | `/api/v1/info` | Service info |

---

## Installation Flow

1. **Browse** → Company discovers a BCP they want
2. **Install** → Company clicks install → BCP creates an `Installation` record with setup steps
3. **Setup** → Company completes each setup step (connect integrations, configure)
4. **Active** → All required steps done → BCP is fully operational

---

## RTMN Hub Integration

BCP Engine is accessible via the RTMN Hub at port **4399**:

```bash
# Via Hub proxy
curl http://localhost:4399/api/bcp/api/v1/packs

# Hub capabilities
curl http://localhost:4399/api/sutar/capabilities | jq '.capabilities["business-capability-pack"]'
```

Hub routes wired in `companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts`.

---

## Architecture

```
src/
├── index.ts          # Express server + routes
└── services/
    └── bcpService.ts # BCP registry + installation logic (in-memory)

__tests__/
└── unit/
    └── bcpService.test.ts  # 21 unit tests
```

**Data model:** In-memory storage (Map-based). Production deployments should swap in a database adapter.

---

## Key Types

```typescript
interface BCPack {
  id: string;
  name: string;
  category: string;
  employees: BCPEmployee[];      // AI agents
  skills: BCPSkill[];            // capabilities
  workflows: BCPWorkflow[];      // automated processes
  integrations: BCPIntegration[]; // external connections
  setupSteps: BCPSetupStep[];   // onboarding steps
  estimatedSetupMinutes: number;
  installCount: number;
  rating: number;
}

interface BCPInstallation {
  id: string;
  bcpId: string;
  companyId: string;
  status: 'active' | 'setup';
  stepStatus: Record<string, string>;  // stepId → pending|in-progress|done|skipped
  installedAt: string;
}
```

---

## Extending BCPs

To add a new BCP:

1. Add a `makePack()` call in `src/services/bcpService.ts` with employees, skills, workflows, integrations, and setup steps
2. Tests should cover the new BCP (category filter, install, etc.)

---

*Last Updated: June 25, 2026*
