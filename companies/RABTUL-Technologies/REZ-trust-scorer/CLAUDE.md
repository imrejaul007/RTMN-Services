# REZ Trust Scorer

**Port:** 4180
**Layer:** SUTAR OS Trust Layer (8th layer of 12-Layer Canonical Architecture)
**Company:** RABTUL Technologies
**Version:** 1.0.0

## Overview

The REZ Trust Scorer is the **Trust** service in the SUTAR OS stack. It calculates and maintains trust scores for all entities (agents, users, merchants) using the 25/25/25/25 weighted formula based on credit history, payment history, dispute rate, and delivery success.

## Architecture Position

```
12-Layer SUTAR Canonical Stack:
1. Trigger
2. Intent Graph
3. GoalOS
4. Decision Engine
5. SimulationOS
6. Agent Network
7. Negotiation
8. Trust             <-- YOU ARE HERE (port 4180)
9. Economy
10. Contract
11. Flow
12. Memory
```

## 25/25/25/25 Trust Formula

| Component | Weight | Factors |
|-----------|--------|---------|
| Credit History | 25% | Account age, transaction volume, count, diversity |
| Payment History | 25% | On-time rate, avg payment time, method diversity |
| Dispute Rate | 25% | Dispute rate, resolution rate, severity (inverse) |
| Delivery Success | 25% | Success rate, on-time rate, return rate |

### Score Range: 0-1000

### Trust Tiers
| Tier | Score Range | Description |
|------|-------------|-------------|
| Excellent | 850-1000 | Top performers, lowest risk |
| Good | 700-849 | Reliable, standard terms |
| Fair | 550-699 | Acceptable, some concerns |
| Poor | 400-549 | Elevated risk, limited terms |
| Untrusted | 0-399 | High risk, restricted |

## API Endpoints

### Trust
- `GET /api/v1/trust/:entityId` - Get trust record
- `POST /api/v1/trust/:entityId/initialize` - Initialize record
- `POST /api/v1/trust/:entityId/recalculate` - Recalculate score
- `POST /api/v1/trust/:entityId/events` - Record trust event
- `GET /api/v1/trust/:entityId/history` - Get history
- `GET /api/v1/trust/:entityId/events` - Get events
- `POST /api/v1/trust/compare` - Compare entities
- `GET /api/v1/trust` - List all
- `GET /api/v1/trust/top/list` - Top N by score
- `GET /api/v1/trust/stats/summary` - Statistics
- `GET /api/v1/trust/audit/log` - Audit log

### Event Types
- `payment_completed`, `payment_late`, `payment_failed`
- `dispute_opened`, `dispute_resolved`, `dispute_lost`
- `delivery_completed`, `delivery_failed`, `delivery_returned`
- `verification_completed`, `review_received`
- `sla_met`, `sla_breached`, `contract_completed`, `contract_breached`

## Event Bus Integration

**Published Topics:**
- `trust.calculated`
- `trust.updated`
- `trust.tier.changed`
- `trust.event.recorded`
- `trust.alert`
- `trust.anomaly.detected`

## Development

```bash
npm install
npm run dev
```

## Source Files

- [src/services/trustService.ts](src/services/trustService.ts) - Core trust calculation
