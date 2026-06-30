# CompanyOS - AI Context

**Version:** 1.3.0
**Platform:** RTMN CompanyOS
**Status:** 23 Phases Complete ✅

---

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/company-os

# Start
bash scripts/start-company-os.sh start

# CLI
cd cli && npm install && npm link
company-os create "My Restaurant" --industry restaurant

# Tests
cd composition-engine && npm test
cd economy-os && npm test
```

---

## Modules (23)

| Module | Path | Purpose |
|--------|------|---------|
| composition-engine | `composition-engine/` | Core composer |
| manifest-registry | `manifest-registry/` | YAML persistence |
| control-plane | `control-plane/` | HTTP API (4010) |
| department-packs | `department-packs/` | Finance, HR, Marketing, Sales |
| industry-extensions | `industry-extensions/` | 26 industries |
| service-connectors | `service-connectors/` | REZ integration |
| ai-workforce | `ai-workforce/` | 10 AI workers |
| studio | `studio/` | React UI |
| cli | `cli/` | 7 commands |
| economy-os | `economy-os/` | 3 wallet types + Trust |
| distribution-layer | `distribution-layer/` | 10+ channels |
| company-factory | `company-factory/` | 26 templates |
| learning-os | `learning-os/` | Collective intel |
| evolution-engine | `evolution-engine/` | Lifecycle stages |
| governance-os | `governance-os/` | Policies + Authority |
| company-intelligence | `company-intelligence/` | AI CEO layer |
| creator-economy | `creator-economy/` | Partner ecosystem |
| industry-builder | `industry-builder/` | Create industries |
| network-builder | `network-builder/` | Nexha networks |
| federation-layer | `federation-layer/` | Global commerce |

---

## Connected Infrastructure

| Service | Location | Connected Via |
|---------|----------|--------------|
| REZ Wallet | RABTUL-Technologies/rez-wallet-service | wallet-adapters/ |
| Agent Wallet | agentfin/agent-wallet | wallet-adapters/ |
| HOJAI Wallet | REZ-Workspace/hojai-agent-wallet | wallet-adapters/ |
| Cross-Wallet | RABTUL-Technologies/REZ-cross-wallet-identity | wallet-adapters/ |
| Nexha | companies/Nexha | distribution-layer/ |
| REZ Services | REZ-Merchant/* | service-connectors/ |

---

## Key Types

```typescript
// Company stages
type CompanyStage = 'startup' | 'growth' | 'enterprise' | 'franchise';

// Wallet types
type WalletType = 'corporate' | 'user' | 'agent';

// Partner types
type PartnerType = 'developer' | 'agency' | 'integrator' | 'consultant';

// Network types
type NetworkType = 'industry' | 'regional' | 'supply_chain' | 'franchise';
```

---

## Environment Variables

```bash
COMPANY_OS_API=http://localhost:4010
REDIS_URL=redis://localhost:6379
REZ_WALLET_URL=http://localhost:4004
AGENT_WALLET_URL=http://localhost:4040
```

---

## Tests Location

```
**/*.test.ts
**/__tests__/**/*.test.ts
```

## Scripts

```bash
# Start platform
bash scripts/start-company-os.sh start

# Generate extensions
bash scripts/generate-extensions.js

# Discover REZ services
bash scripts/discover-rez-services.sh
```
