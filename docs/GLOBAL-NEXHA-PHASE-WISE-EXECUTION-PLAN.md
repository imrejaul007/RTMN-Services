# Global Nexha — Phase-Wise Execution Plan
## 90-Day Plan to Fill All Gaps

> **Created:** June 30, 2026  
> **Last Updated:** June 30, 2026 (Phase 0-3 complete)  
> **Status:** 80% Complete

---

## Gap Summary (10 Critical Gaps)

| # | Gap | Priority | Phase | Status |
|---|-----|----------|-------|--------|
| 1 | Public RFCs (RFC-0001 to RFC-0008) | P0 | 1 | ✅ DONE |
| 2 | SDK Backend Implementation (7 endpoints) | P0 | 1 | ✅ DONE |
| 3 | OpenAPI/Swagger Specifications | P0 | 1 | ✅ DONE |
| 4 | Nexha Cloud Product + Pricing | P0 | 2 | ✅ DONE |
| 5 | developer.nexha.ai Portal | P0 | 2 | ✅ DONE |
| 6 | Usage-Based Pricing Model | P0 | 2 | ✅ DONE |
| 7 | Nexha Connect (Platform for Platforms) | P1 | 3 | ✅ DONE |
| 8 | Economic Relationship Graph | P1 | 3 | ✅ DONE |
| 9 | Trust API (Commercial) | P1 | 2 | ✅ DONE |
| 10 | GitHub Repos (global-nexha) | P2 | 4 | 🔴 PENDING |

---

## ✅ PHASE 0 — Quick Wins (COMPLETE)

### SDK Bridge Foundation

| File | Purpose |
|------|---------|
| `docs/nexha-sdk-endpoint-mapping.md` | Full mapping of SDK → backend |
| `src/routes/sdk-bridge.ts` | Unified SDK entry point (7 modules) |
| `src/transforms/discovery.ts` | Discovery transforms |
| `src/transforms/trust.ts` | Trust transforms |
| `src/transforms/negotiation.ts` | Negotiation transforms |
| `__tests__/sdk-bridge.test.ts` | Unit tests |
| `src/types.ts` | Complete TypeScript SDK types |

---

## ✅ PHASE 1 — Open Core Foundation (COMPLETE)

### 8 RFC Documents Created

| RFC | File |
|-----|------|
| RFC-0001: Core | `acp-spec/RFC-0001-CORE.md` |
| RFC-0002: Identity | `acp-spec/RFC-0002-IDENTITY.md` |
| RFC-0003: Trust | `acp-spec/RFC-0003-TRUST.md` |
| RFC-0004: Discovery | `acp-spec/RFC-0004-DISCOVERY.md` |
| RFC-0005: Negotiation | `acp-spec/RFC-0005-NEGOTIATION.md` |
| RFC-0006: Contracts | `acp-spec/RFC-0006-CONTRACTS.md` |
| RFC-0007: Payments | `acp-spec/RFC-0007-PAYMENTS.md` |
| RFC-0008: Logistics | `acp-spec/RFC-0008-LOGISTICS.md` |

### OpenAPI Specification

- `services/nexha-agent-gateway/openapi.yaml` — Full API spec

---

## ✅ PHASE 2 — Developer Platform (COMPLETE)

### Developer Portal

| File | Purpose |
|------|---------|
| `developer-portal/app/page.tsx` | Landing page |
| `developer-portal/app/quickstart/page.tsx` | 8-step quickstart |
| `developer-portal/app/pricing/page.tsx` | Pricing tiers |
| `developer-portal/app/playground/page.tsx` | API playground |
| `developer-portal/app/api-reference/page.tsx` | API reference |

### Commercial Trust API

| File | Purpose |
|------|---------|
| `src/routes/commercial-trust.ts` | Trust API with rate limiting |
| `src/services/usage-tracking.ts` | Tier-based quotas |
| `src/routes/api-keys.ts` | API key CRUD |
| `src/services/api-keys.ts` | Key generation, validation |

### Pricing Tiers

| Tier | Price | Trust Lookups | Discovery |
|-----|-------|---------------|-----------|
| **Community** | Free | 100/day | 500/day |
| **Growth** | $99/mo | 10K/day | 5K/day |
| **Enterprise** | $999/mo | 100K/day | 50K/day |

---

## ✅ PHASE 3 — Nexha Cloud & Ecosystem (COMPLETE)

### Nexha Connect (Platform for Platforms)

| File | Port | Purpose |
|------|------|---------|
| `services/nexha-connect/src/index.ts` | 4450 | Partner integration |

**Features:**
- Partner registration (Shopify, SAP, Zoho, OpenAI, custom)
- Unified discovery/trust/negotiate endpoints
- Webhook handling
- Partner dashboard and stats

### Economic Relationship Graph

| File | Port | Purpose |
|------|------|---------|
| `services/nexha-economic-graph/src/index.ts` | 4451 | Graph service |

**Features:**
- 17 relationship types
- Path finding (BFS)
- 2nd-degree recommendations
- Trust signal weighting

### Transaction Fee Model

| File | Port | Purpose |
|------|------|---------|
| `services/nexha-payment-network/src/fee-calculator.ts` | 4452 | Fee service |

**Features:**
- Tier-based pricing
- Volume discounts
- Payment method adjustments
- Revenue tracking

### Nexha Cloud Product Docs

| File | Purpose |
|------|---------|
| `products/nexha-cloud/README.md` | Full product documentation |

**Products:**
- 7 individual services ($29-$799/mo)
- 3 bundles (Commerce Starter/Pro/Enterprise)
- Partner pricing (20%/15%/10% revenue share)

---

## 🔴 PHASE 4 — Open Source & Community (PENDING)

### GitHub Repositories

```bash
# Create global-nexha GitHub organization
github.com/global-nexha/nacp           # Protocol spec
github.com/global-nexha/nexha-sdk     # JS SDK
github.com/global-nexha/nexha-mcp     # MCP server
github.com/global-nexha/nexha-examples # Examples
github.com/global-nexha/nexha-rfcs    # RFC documents
```

### NPM Packages

```bash
npm publish @nexha/sdk
npm publish @nexha/connect
npm publish @nexha/mcp
```

---

## Summary

| Phase | Files | Status |
|-------|-------|--------|
| Phase 0 | 6 | ✅ |
| Phase 1 | 9 | ✅ |
| Phase 2 | 8 | ✅ |
| Phase 3 | 5 | ✅ |
| Phase 4 | TODO | 🔴 |
| **Total** | **28** | **80%** |

---

## Revenue Model Summary

| Revenue Stream | Built |
|----------------|-------|
| Transaction Fees | ✅ |
| API Usage Fees | ✅ |
| Partner Revenue Share | ✅ |
| Volume Discounts | ✅ |
| Trust API (Commercial) | ✅ |

---

*Last Updated: June 30, 2026*
