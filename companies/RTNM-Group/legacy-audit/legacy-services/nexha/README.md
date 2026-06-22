# NeXha - Unified Commerce Network Infrastructure

> **⚠️ MOVED:** This directory has been moved to `/Nexha/` as a standalone company.
> This folder is kept for reference only.

> "The Operating System for Commerce Networks"

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NeXha Ecosystem                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │  DistributionOS │   │  FranchiseOS    │   │ ProcurementOS   │          │
│  │  Port: 4300     │   │  Port: 4310    │   │  Port: 4320     │          │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘          │
│           │                     │                     │                    │
│           └─────────────────────┼─────────────────────┘                    │
│                                 │                                          │
│                    ┌────────────┴────────────┐                           │
│                    │  Ecosystem Connector  │                           │
│                    │    Port: 4399        │                           │
│                    └────────────┬────────────┘                           │
│                                 │                                          │
│           ┌─────────────────────┼─────────────────────┐                  │
│           │                     │                     │                  │
│  ┌───────┴───────┐   ┌───────┴───────┐   ┌───────┴───────┐            │
│  │  ManufacturingOS│   │ REZ Merchant │   │ REZ Intelligence│            │
│  │  Port: 4330   │   │  Port: 4003 │   │  Port: 4018   │            │
│  └───────────────┘   └───────────────┘   └───────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Ecosystem Connector** | 4399 | Central hub for cross-service communication |
| **DistributionOS** | 4300 | Distributor & wholesaler management |
| **FranchiseOS** | 4310 | Multi-location franchise management |
| **ProcurementOS** | 4320 | B2B marketplace & RFQ management |
| **ManufacturingOS** | 4330 | Production & supply chain management |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all services
pnpm build

# Run a specific service
pnpm dev:distribution
pnpm dev:franchise
pnpm dev:procurement
pnpm dev:manufacturing
pnpm dev:connector
```

## Environment Variables

```bash
# Service URLs
DISTRIBUTION_OS_URL=http://localhost:4300
FRANCHISE_OS_URL=http://localhost:4310
PROCUREMENT_OS_URL=http://localhost:4320
MANUFACTURING_OS_URL=http://localhost:4330

# External Services
REZ_MERCHANT_URL=http://localhost:4003
REZ_INTELLIGENCE_URL=http://localhost:4018
RTNM_FINANCE_URL=http://localhost:4004
```

## Event Flow

```
REZ Merchant (Order) → Ecosystem Connector → DistributionOS
                         ↓
                   REZ Intelligence (Predictions)
                         ↓
                   ProcurementOS (RFQ Created)
                         ↓
                   ManufacturingOS (Production Ordered)
                         ↓
                   DistributionOS (Stock Updated)
```

## Shared Packages

- `@rez/shared-types` - Canonical types and Zod schemas
- `@rez/webhook-sdk` - HMAC webhook verification
- `@rez/auth-client` - RABTUL OAuth2 authentication
- `@rez/integration-framework` - Universal partner integration

## License

Proprietary - RTNM Group
