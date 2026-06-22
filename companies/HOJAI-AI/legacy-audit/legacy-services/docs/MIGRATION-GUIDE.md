# HOJAI V2 MIGRATION GUIDE
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** IN PROGRESS

---

## Overview

This guide covers the migration of REZ Intelligence services to the new Hojai v2 architecture.

**Migration Strategy:** Fork & Sync
- Keep existing code working
- Extract generic parts
- Create Hojai versions
- Gradual migration
- Shared libraries where possible

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Create hojai-core Directory

```bash
cd hojai-ai

# Create hojai-core structure
mkdir -p hojai-core/{hojai-governance,hojai-event,hojai-memory,hojai-intelligence,hojai-agents,hojai-workflow,hojai-communications,hojai-hyperlocal,hojai-analytics,hojai-data}

# Create shared utilities
mkdir -p hojai-core/shared/{utils,types,middleware}
```

---

### 1.2 Move hojai-governance

**Source:** `hojai-ai/packages/hojai-governance/`
**Destination:** `hojai-ai/hojai-core/hojai-governance/`

**Actions:**
- [x] Copy directory
- [ ] Update package.json name to `@hojai/governance`
- [ ] Add tenant middleware to all routes
- [ ] Update port to 4500
- [ ] Update imports

---

### 1.3 Create hojai-event from REZ-event-bus

**Source:** `REZ-Intelligence/REZ-event-bus/`
**Destination:** `hojai-ai/hojai-core/hojai-event/`

**Actions:**
- [ ] Copy core event bus logic
- [ ] Remove REZ-specific event types
- [ ] Add generic event types
- [ ] Add tenant_id to all events
- [ ] Update port to 4510
- [ ] Create event schema registry
- [ ] Update imports

**Event Schema:**
```typescript
// Before (REZ-specific)
interface REZEvent {
  id: string;
  type: string;
  userId: string;
  merchantId?: string;
  data: any;
}

// After (Hojai)
interface HojaiEvent {
  id: string;
  tenant_id: string;
  type: string;
  source: string;
  timestamp: string;
  correlationId?: string;
  data: Record<string, any>;
}
```

---

### 1.4 Create hojai-memory from REZ-memory-layer

**Source:** `REZ-Intelligence/REZ-memory-layer/`
**Destination:** `hojai-ai/hojai-core/hojai-memory/`

**Actions:**
- [ ] Copy memory layer logic
- [ ] Remove REZ-specific integrations
- [ ] Add generic memory types
- [ ] Add tenant_id scoping
- [ ] Update port to 4520
- [ ] Create memory interface

**Memory Types:**
```typescript
// Add tenant_id to all memory types
interface CustomerMemory {
  tenant_id: string;
  customer_id: string;
  preferences: Record<string, any>;
  history: TimelineEvent[];
  intents: Intent[];
  lastUpdated: string;
}
```

---

### 1.5 Create hojai-workflow from REZ-flow-runtime

**Source:** `REZ-Intelligence/REZ-flow-runtime/`
**Destination:** `hojai-ai/hojai-core/hojai-workflow/`

**Actions:**
- [ ] Copy workflow runtime logic
- [ ] Remove REZ-specific workflows
- [ ] Add generic workflow types
- [ ] Add tenant_id scoping
- [ ] Update port to 4560
- [ ] Create workflow schema

---

### 1.6 Create hojai-agents from REZ-autonomous-agents

**Source:** `REZ-Intelligence/REZ-autonomous-agents/`
**Destination:** `hojai-ai/hojai-core/hojai-agents/`

**Actions:**
- [ ] Copy agent logic
- [ ] Create generic agent types
- [ ] Remove REZ-specific agents
- [ ] Add agent registry
- [ ] Add tenant_id scoping
- [ ] Update port to 4550
- [ ] Create agent SDK

**Agent Interface:**
```typescript
interface HojaiAgent {
  id: string;
  tenant_id: string;
  name: string;
  type: 'support' | 'sales' | 'booking' | 'marketing' | 'retention';
  capabilities: string[];
  permissions: string[];
  memory: AgentMemory;
}
```

---

## Phase 2: Intelligence & Comms (Week 3-4)

### 2.1 Create hojai-intelligence

**Source:** `REZ-Intelligence/REZ-predictive-engine/`
**Destination:** `hojai-ai/hojai-core/hojai-intelligence/`

**Actions:**
- [ ] Copy prediction engine
- [ ] Add recommendation engine
- [ ] Add explainability
- [ ] Add temporal intelligence
- [ ] Add tenant_id scoping
- [ ] Update port to 4530

**Services to include:**
- Prediction Engine (churn, LTV, conversion)
- Recommendation Engine
- Segmentation Engine
- Decision Engine
- Explainability Engine
- Temporal Intelligence

---

### 2.2 Create hojai-communications

**Source:** `REZ-Intelligence/REZ-whatsapp/`
**Destination:** `hojai-ai/hojai-core/hojai-communications/`

**Actions:**
- [ ] Copy WhatsApp logic
- [ ] Add SMS bridge
- [ ] Add Email bridge
- [ ] Add Voice bridge
- [ ] Add multi-channel routing
- [ ] Add tenant_id scoping
- [ ] Update port to 4570

---

### 2.3 Create hojai-hyperlocal

**Source:** `REZ-Intelligence/REZ-geo-intelligence/`
**Destination:** `hojai-ai/hojai-core/hojai-hyperlocal/`

**Actions:**
- [ ] Copy geo intelligence
- [ ] Add footfall prediction
- [ ] Add demand intelligence
- [ ] Add location intelligence
- [ ] Add tenant_id scoping
- [ ] Update port to 4580

---

### 2.4 Create hojai-analytics

**Source:** `REZ-Intelligence/REZ-insights-service/`
**Destination:** `hojai-ai/hojai-core/hojai-analytics/`

**Actions:**
- [ ] Copy insights service
- [ ] Add attribution modeling
- [ ] Add cohort analysis
- [ ] Add custom reports
- [ ] Add tenant_id scoping
- [ ] Update port to 4580

---

### 2.5 Create hojai-data

**Source:** `REZ-Intelligence/REZ-feature-store/`
**Destination:** `hojai-ai/hojai-core/hojai-data/`

**Actions:**
- [ ] Copy feature store
- [ ] Add data pipeline
- [ ] Add data quality
- [ ] Add data governance
- [ ] Add tenant_id scoping
- [ ] Update port to 4590

---

## Phase 3: REZ Intelligence Restructure (Week 5-6)

### 3.1 Create rez-intelligence Directory

```bash
cd hojai-ai

# Create rez-intelligence structure
mkdir -p rez-intelligence/{rez-identity-graph,rez-commerce-graph,rez-mobility-graph,rez-loyalty-graph,rez-trust-graph,rez-behavioral-graph,rez-hyperlocal-graph,rez-intent-graph,rez-ecosystem-knowledge,rez-recommendations,rez-predictions,shared}
```

---

### 3.2 Move/Create REZ Graphs

| Graph | Source | Destination | Port |
|-------|--------|-------------|------|
| Identity Graph | REZ-identity-graph | rez-intelligence/rez-identity-graph | 4100 |
| Commerce Graph | REZ-commerce-graph | rez-intelligence/rez-commerce-graph | 4110 |
| Mobility Graph | REZ-ride-service | rez-intelligence/rez-mobility-graph | 4120 |
| Loyalty Graph | REZ-gamification | rez-intelligence/rez-loyalty-graph | 4130 |
| Trust Graph | karma-service | rez-intelligence/rez-trust-graph | 4140 |
| Behavioral Graph | REZ-signal-aggregator | rez-intelligence/rez-behavioral-graph | 4150 |
| Hyperlocal Graph | REZ-geo-intelligence | rez-intelligence/rez-hyperlocal-graph | 4160 |
| Intent Graph | rez-intent-predictor | rez-intelligence/rez-intent-graph | 4170 |

---

### 3.3 Create REZ Ecosystem Services

**Services to create:**

```typescript
// rez-intelligence/rez-ecosystem-knowledge/
// Port: 4180
// Purpose: REZ-specific knowledge base

// rez-intelligence/rez-recommendations/
// Port: 4190
// Purpose: REZ-specific recommendations

// rez-intelligence/rez-predictions/
// Port: 4200
// Purpose: REZ-specific predictions
```

---

## Phase 4: Industry Intelligence (Week 7-9)

### 4.1 Create hojai-industry Directory

```bash
cd hojai-ai

# Create industry intelligence structure
mkdir -p hojai-industry/{jewellery-brain,healthcare-brain,hospitality-brain,retail-brain,education-brain,finance-brain,real-estate-brain}
```

---

### 4.2 Industry Brain Template

Each industry brain follows this structure:

```bash
# Template for each industry brain
<industry>-brain/
├── src/
│   ├── index.ts           # Main entry
│   ├── services/
│   │   ├── patterns.ts    # Pattern detection
│   │   ├── insights.ts    # Industry insights
│   │   └── benchmarks.ts  # Benchmarks
│   ├── models/
│   │   ├── patterns.ts   # ML models
│   │   └── benchmarks.ts  # Benchmark models
│   ├── routes/
│   │   └── patterns.ts    # API routes
│   └── middleware/
│       └── tenant.ts      # Tenant middleware
├── tests/
├── package.json
└── README.md
```

---

### 4.3 Jewellery Brain (Port 4700)

**Industry Patterns:**
- Bridal journeys
- Gold purchase cycles
- Festival demand
- Follow-up timing
- Conversion timelines

**Data Sources:**
- Multiple jewellery clients (anonymized)
- Platform-wide patterns

---

### 4.4 Healthcare Brain (Port 4710)

**Industry Patterns:**
- Appointment behavior
- No-show patterns
- Treatment journeys
- Patient retention
- Seasonal health patterns

---

### 4.5 Hospitality Brain (Port 4720)

**Industry Patterns:**
- Booking patterns
- Occupancy demand
- Upsell opportunities
- Cancellation patterns

---

### 4.6 Retail Brain (Port 4730)

**Industry Patterns:**
- Basket behavior
- Repeat purchases
- Conversion journeys
- Promotion response

---

## Phase 5: Client Template (Week 10)

### 5.1 Create hojai-clients Directory

```bash
cd hojai-ai

# Create client template
mkdir -p hojai-clients/template/{client-identity,client-memory,client-recommendations,client-agents,client-workflows,client-analytics}

# Create example clients
mkdir -p hojai-clients/{xyz-retail,abc-hospital}
```

---

### 5.2 Client Template Structure

```typescript
// Client template
interface ClientIntelligence {
  tenant_id: string;
  identity_graph: ClientIdentityGraph;
  customer_graph: ClientCustomerGraph;
  product_graph: ClientProductGraph;
  commerce_graph: ClientCommerceGraph;
  recommendations: ClientRecommendations;
  agents: ClientAgents;
  workflows: ClientWorkflows;
  analytics: ClientAnalytics;
  memory: ClientMemory;
}
```

---

## MIGRATION COMMANDS

### Copy hojai-governance

```bash
# Copy to hojai-core
cp -r hojai-ai/packages/hojai-governance hojai-ai/hojai-core/hojai-governance

# Update package.json
cd hojai-ai/hojai-core/hojai-governance
# Update name to @hojai/governance
# Update main to dist/index.js
```

---

### Create hojai-event

```bash
# Copy from REZ
cp -r "REZ-Intelligence/REZ-event-bus/" hojai-ai/hojai-core/hojai-event/

# Update files
cd hojai-ai/hojai-core/hojai-event

# Remove REZ-specific events
# Add tenant_id to all events
# Update port to 4510
```

---

### Create hojai-memory

```bash
# Copy from REZ
cp -r "REZ-Intelligence/REZ-memory-layer/" hojai-ai/hojai-core/hojai-memory/

# Update files
cd hojai-ai/hojai-core/hojai-memory

# Remove REZ integrations
# Add generic memory types
# Update port to 4520
```

---

### Create hojai-workflow

```bash
# Copy from REZ
cp -r "REZ-Intelligence/REZ-flow-runtime/" hojai-ai/hojai-core/hojai-workflow/

# Update files
cd hojai-ai/hojai-core/hojai-workflow

# Remove REZ-specific workflows
# Update port to 4560
```

---

### Create hojai-agents

```bash
# Copy from REZ
cp -r "REZ-Intelligence/REZ-autonomous-agents/" hojai-ai/hojai-core/hojai-agents/

# Update files
cd hojai-ai/hojai-core/hojai-agents

# Remove REZ-specific agents
# Add generic agent types
# Update port to 4550
```

---

## MULTI-TENANT MODIFICATIONS

### Add Tenant Middleware

```typescript
// hojai-core/shared/middleware/tenant.ts

import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenant_id: string;
  organization_id: string;
  namespace: string;
  user_id?: string;
  roles: string[];
  permissions: string[];
}

export const tenantMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenant_id = req.headers['x-tenant-id'] as string;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'Tenant ID is required'
        }
      });
    }

    req.tenantContext = {
      tenant_id,
      organization_id: req.headers['x-organization-id'] as string || '',
      namespace: `${tenant_id}_data`,
      user_id: req.headers['x-user-id'] as string,
      roles: JSON.parse(req.headers['x-roles'] as string || '[]'),
      permissions: JSON.parse(req.headers['x-permissions'] as string || '[]')
    };

    next();
  };
};

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}
```

---

### Update Database Queries

```typescript
// Before
const customers = await db.customers.findMany({
  where: { userId: req.user.id }
});

// After
const customers = await db.customers.findMany({
  where: {
    userId: req.user.id,
    tenant_id: req.tenantContext.tenant_id
  }
});
```

---

### Update Event Publishing

```typescript
// Before
await eventBus.publish('order.completed', { orderId, userId });

// After
await eventBus.publish('order.completed', {
  tenant_id: req.tenantContext.tenant_id,
  orderId,
  userId
});
```

---

## VERIFICATION CHECKLIST

### Phase 1 Verification

- [ ] hojai-core directory exists
- [ ] hojai-governance runs on port 4500
- [ ] hojai-event runs on port 4510
- [ ] hojai-memory runs on port 4520
- [ ] hojai-workflow runs on port 4560
- [ ] hojai-agents runs on port 4550
- [ ] All services respond to tenant context
- [ ] All services validate tenant_id

### Phase 2 Verification

- [ ] hojai-intelligence runs on port 4530
- [ ] hojai-communications runs on port 4570
- [ ] hojai-hyperlocal runs on port 4580
- [ ] hojai-analytics runs on port 4580
- [ ] hojai-data runs on port 4590

### Phase 3 Verification

- [ ] rez-intelligence directory exists
- [ ] All 8 REZ graphs have ports 4100-4170
- [ ] REZ ecosystem services run on 4180-4200
- [ ] REZ can still access all services

### Phase 4 Verification

- [ ] hojai-industry directory exists
- [ ] Jewellery Brain runs on port 4700
- [ ] Healthcare Brain runs on port 4710
- [ ] Hospitality Brain runs on port 4720
- [ ] Retail Brain runs on port 4730

### Phase 5 Verification

- [ ] hojai-clients directory exists
- [ ] Client template is ready
- [ ] Example clients run on 4600-4699

---

## ROLLBACK PLAN

If migration fails:

1. Keep original services running on original ports
2. Use feature flags to route traffic
3. Gradually shift traffic to new services
4. Keep old services as backup for 30 days

---

## DEPENDENCIES

### Phase 1 Dependencies

| Service | Depends On |
|---------|-----------|
| hojai-event | MongoDB, Redis |
| hojai-memory | MongoDB, Redis, hojai-event |
| hojai-workflow | MongoDB, Redis, hojai-event |
| hojai-agents | MongoDB, Redis, hojai-event, hojai-memory |

### Phase 2 Dependencies

| Service | Depends On |
|---------|-----------|
| hojai-intelligence | hojai-event, hojai-memory, hojai-data |
| hojai-communications | Twilio, hojai-event |
| hojai-hyperlocal | hojai-event, Map APIs |
| hojai-analytics | MongoDB, hojai-event |

---

## ESTIMATED TIMELINE

| Phase | Duration | Services |
|-------|----------|----------|
| Phase 1 | 2 weeks | 5 core services |
| Phase 2 | 2 weeks | 5 intelligence services |
| Phase 3 | 2 weeks | 8 REZ graphs |
| Phase 4 | 3 weeks | 7 industry brains |
| Phase 5 | 1 week | Client template |

**Total: 10 weeks**

---

*Document Version: 1.0*
*Last Updated: May 29, 2026*
