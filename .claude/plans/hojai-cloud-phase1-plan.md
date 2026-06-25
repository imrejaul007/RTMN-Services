# HOJAI Cloud — Phase 1 Implementation Plan

> **Date:** 2026-06-25
> **Phase:** 1 of N
> **Goal:** Ship the core missing pieces for HOJAI Cloud

## Top 6 Priorities

| # | Priority | Effort |
|---|----------|--------|
| 1 | HOJAI Cloud v1.2 (auto-respawn, SSL, domains) | 4 weeks |
| 2 | App Store UI + Backend | 2 weeks |
| 3 | Voice Studio UI | 2 weeks |
| 4 | Visual Workflow Builder | 2 weeks |
| 5 | AI Cost Tracking | 1 week |
| 6 | Secrets Manager | 1 week |

## New Services (Ports)

| Service | Port |
|---------|------|
| app-store-api | 4400 |
| cost-tracker | 4410 |
| secrets-manager | 4420 |

## New UI Routes

| Route | Page |
|-------|------|
| /app-store | App Store browse |
| /app-store/[id] | Item detail |
| /voice | Voice dashboard |
| /voice/agents | Voice agents |
| /voice/builder/[id] | Voice builder |
| /workflows | Workflow list |
| /workflows/builder | Canvas |
| /billing/usage | Usage dashboard |
| /secrets | Secrets list |

## Implementation Order

1. **HOJAI Cloud v1.2** - Weeks 1-2
2. **App Store** - Weeks 3-4
3. **Voice Studio** - Weeks 5-6
4. **Workflow Builder** - Weeks 7-8
5. **Cost Tracking** - Week 9
6. **Secrets Manager** - Week 10

*Last updated: 2026-06-25*
