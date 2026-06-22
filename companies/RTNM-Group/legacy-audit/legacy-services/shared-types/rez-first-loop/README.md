# FIRST CLOSED LOOP: INVENTORY → REORDER

## Overview

This document describes the first closed-loop integration in the ReZ platform, enabling automatic reorder suggestions when inventory levels fall below thresholds.

## Flow Architecture

```
┌─────────┐    inventory.low    ┌─────────────────┐
│ BizOS   │ ──────────────────► │ Event Platform  │
└─────────┘                     └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │    ReZ Mind     │
                               │ (Intent Graph)  │
                               └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │ Action Engine   │
                               │ (Check policy)  │
                               └────────┬────────┘
                                        │
                          ┌────────────┴────────────┐
                          │                         │
                          ▼                         ▼
                 ┌─────────────────┐     ┌─────────────────┐
                 │  Draft PO Queue  │     │ NextaBiZ        │
                 │ (needs approval) │ ──► │ (Create Draft)  │
                 └─────────────────┘     └────────┬────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ BizOS UI        │
                                         │ (Merchant sees) │
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Feedback Service │
                                         │ (Record outcome)│
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Adaptive Agent   │
                                         │ (Learn)         │
                                         └─────────────────┘
```

## Loop Components

### 1. Event Source: BizOS (rez-merchant-service)
- Monitors inventory levels
- Emits `inventory.low` events when stock falls below threshold
- Publishes to Event Platform

### 2. Event Router: rez-event-platform
- Receives domain events
- Routes to appropriate handlers based on event type
- Maintains event ordering and delivery guarantees

### 3. Intent Processing: rez-intent-graph (ReZ Mind)
- Parses `inventory.low` event
- Creates intent nodes for reorder actions
- Resolves supplier relationships and lead times
- Outputs structured reorder intent

### 4. Decision Engine: rez-action-engine
- Evaluates reorder policy
- Checks merchant preferences and constraints
- Decides: auto-create vs. draft-approval vs. skip
- Routes to appropriate execution path

### 5. Execution: NextaBiZ (Procurement)
- Creates draft purchase orders
- Calculates optimal quantities
- Integrates with supplier catalog

### 6. Human-in-the-Loop: BizOS UI
- Displays draft POs to merchant
- Allows approval, modification, or rejection
- Captures merchant decisions

### 7. Feedback: rez-feedback-service
- Records loop outcomes (approved, rejected, modified)
- Captures merchant feedback data
- Timestamps all interactions

### 8. Learning: AdaptiveScoringAgent
- Analyzes outcome patterns
- Adjusts reorder thresholds
- Optimizes quantity calculations
- Improves decision accuracy over time

## Event Schema

### inventory.low Event
```typescript
interface InventoryLowEvent {
  eventId: string;
  eventType: 'inventory.low';
  timestamp: string;
  source: 'rez-merchant-service';
  tenantId: string;
  payload: {
    productId: string;
    sku: string;
    currentStock: number;
    reorderPoint: number;
    preferredSupplierId?: string;
    suggestedQuantity?: number;
  };
}
```

### Reorder Intent
```typescript
interface ReorderIntent {
  intentId: string;
  type: 'reorder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: {
    productId: string;
    suggestedQuantity: number;
    supplierId: string;
    estimatedCost: number;
    leadTimeDays: number;
  };
  decisions: {
    autoApprove: boolean;
    reason: string;
  };
}
```

## Quick Start

```bash
# Navigate to loop directory
cd rez-first-loop

# Install dependencies
npm install

# Run integration tests
npm test

# Start orchestrator
npm run start:orchestrator
```

## Directory Structure

```
rez-first-loop/
├── README.md              # This file
├── INTEGRATION-GUIDE.md    # Detailed integration documentation
├── MONITORING.md           # Metrics and alerting
├── package.json
├── src/
│   ├── emitter.ts          # Event emission utilities
│   └── loop-orchestrator.ts # Flow orchestration
└── tests/
    └── loop.test.ts        # Integration tests
```

## Status

- [x] Event schema defined
- [x] Integration guide drafted
- [x] Orchestrator stubs created
- [ ] End-to-end tests passing
- [ ] Production deployment
