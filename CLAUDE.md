# RTMN Foundation Services - Developer Guide

**Version:** 2.0.0  
**Updated:** June 14, 2026  
**Status:** ✅ ALL 5 SERVICES BUILT & CONNECTED

---

## Overview

RTMN Foundation Services provide the core infrastructure layer that all other services depend on:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RTMN FOUNDATION LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CorpID Service (4702)                              │   │
│  │              Universal Identity for ALL Entities                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MemoryOS (4703)                                    │   │
│  │                Personal AI Memory Layer                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SUTAR Execution Layer                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   GoalOS    │  │  Decision    │  │    Agent    │              │   │
│  │  │   4242      │  │  Engine 4240│  │  Economy 4251│              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Services Summary

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **CorpID Service** | 4702 | Universal Identity | ✅ Built |
| **MemoryOS** | 4703 | Personal AI Memory | ✅ Built |
| **GoalOS** | 4242 | Autonomous Goals | ✅ Built |
| **Decision Engine** | 4240 | Policy & Authorization | ✅ Built |
| **Agent Economy** | 4251 | Karma & Payments | ✅ Built |

---

## Quick Start

```bash
# Install and start CorpID Service
cd services/corpid-service && npm install && npm start

# Install and start MemoryOS
cd services/memory-os && npm install && npm start

# Install and start GoalOS
cd services/goal-os && npm install && npm start

# Install and start Decision Engine
cd services/decision-engine && npm install && npm start

# Install and start Agent Economy
cd services/agent-economy && npm install && npm start
```

---

# CorpID Service (4702) - Universal Identity

## Overview

CorpID provides universal identity for ALL entities in the RTMN ecosystem:
- Every user, business, agent, device gets a unique CorpID
- CorpID is used across all 24 industries
- Foundation for trust, relationships, and economy

## Entity Types

| Type | Prefix | Example | Description |
|------|--------|---------|-------------|
| INDIVIDUAL | IND- | IND-A1B2C3D4E5F6 | Human users, customers |
| BUSINESS | BIZ- | BIZ-X9Y8Z7W6V5U4 | Companies, organizations |
| SUPPLIER | SUP- | SUP-M3N2L1K0J9I8 | Product/service suppliers |
| MERCHANT | MER- | MER-G7H6I5J4K3L2 | Retail merchants |
| DRIVER | DRV- | DRV-P1Q2R3S4T5U6 | Delivery drivers |
| FRANCHISE | FRN- | FRN-V7W8X9Y0Z1A2 | Franchise owners |
| AGENT | AGT- | AGT-B3C4D5E6F7G8 | AI agents, bots |
| MACHINE | MCH- | MCH-H9I0J1K2L3M4 | IoT devices, sensors |
| PRODUCT | PRD- | PRD-N5O6P7Q8R9S0 | Products, SKUs |

## Detailed Features

### Identity Management

| Feature | Description | API |
|---------|-------------|-----|
| **Create Entity** | Create new CorpID with type, name, email, phone | `POST /api/identity/create` |
| **Get Entity** | Retrieve entity by CorpID | `GET /api/identity/:corpId` |
| **Update Entity** | Update name, email, phone, metadata | `PATCH /api/identity/:corpId` |
| **Verify Entity** | KYC/KYB verification with type | `POST /api/identity/:corpId/verify` |
| **Search Entities** | Search by name or type | `GET /api/identity/search/find` |
| **Resolve Identity** | Cross-system identity resolution | `POST /api/identity/resolve` |
| **List by Type** | Get all entities of a type | `GET /api/identity/type/:type` |

### Trust System

| Feature | Description | API |
|---------|-------------|-----|
| **Get Trust Score** | Get entity trust score (0-100) | `GET /api/trust/score/:corpId` |
| **Update Trust Score** | Add/deduct trust points | `POST /api/trust/score/:corpId` |
| **Trust Breakdown** | Score by category | `GET /api/trust/breakdown/:corpId` |
| **Trust History** | Track trust changes over time | `GET /api/trust/history/:corpId` |

**Trust Score Rules:**
- New entities start with 50 points
- Score range: 0-100
- High trust (80+) = fast-track approvals
- Low trust (<30) = manual review required

### Relationship Graph

| Feature | Description | API |
|---------|-------------|-----|
| **Create Relationship** | Link two entities | `POST /api/relationships` |
| **Get Relationships** | All relationships for entity | `GET /api/relationships/:corpId` |
| **Delete Relationship** | Remove relationship | `DELETE /api/relationships/:relId` |
| **Find Path** | Shortest path between entities | `GET /api/relationships/path/find` |
| **Relationship Types** | owns, employs, works_at, manages, supplies, sells, buys, partners_with, franchised_by, trusts | N/A |

### AI Agent Management

| Feature | Description | API |
|---------|-------------|-----|
| **Register Agent** | Create CorpID for AI agent | `POST /api/agents/register` |
| **Get Agent** | Get agent details | `GET /api/agents/:corpId` |
| **Update Capabilities** | Add/remove agent capabilities | `PATCH /api/agents/:corpId/capabilities` |
| **Search Agents** | Find by capability | `GET /api/agents/search/find` |
| **List Agents** | All registered agents | `GET /api/agents` |
| **Agent Types** | sales, support, ops, research, execution, monitoring | N/A |

## API Endpoints (Complete)

```javascript
// Identity Management
POST   /api/identity/create              // Create entity
GET    /api/identity/:corpId             // Get entity
PATCH  /api/identity/:corpId             // Update entity
DELETE  /api/identity/:corpId            // Delete entity
POST   /api/identity/:corpId/verify      // Verify (KYC/KYB)
GET    /api/identity/search/find         // Search by name/type
POST   /api/identity/resolve             // Cross-system resolve
GET    /api/identity/type/:type         // List by type

// Trust System
GET    /api/trust/score/:corpId         // Get trust score
POST   /api/trust/score/:corpId         // Update trust (delta)
GET    /api/trust/breakdown/:corpId     // Get breakdown
GET    /api/trust/history/:corpId       // Get history

// Relationships
POST   /api/relationships               // Create relationship
GET    /api/relationships/:corpId        // Get relationships
DELETE /api/relationships/:relId        // Delete relationship
GET    /api/relationships/path/find     // Find path

// AI Agents
POST   /api/agents/register             // Register agent
GET    /api/agents/:corpId             // Get agent
PATCH  /api/agents/:corpId/capabilities // Update capabilities
GET    /api/agents/search/find          // Search by capability
GET    /api/agents                     // List all

// Stats
GET    /stats                          // Entity counts
```

## File Structure

```
services/corpid-service/
├── package.json
└── src/
    ├── index.js                    # Main entry (port 4702)
    ├── routes/
    │   ├── identity.js             # Identity CRUD + verify + search
    │   ├── trust.js               # Trust scores + breakdown
    │   ├── relationships.js        # Relationship management + path finding
    │   └── agents.js              # AI agent registration + search
    └── utils/
        └── logger.js
```

## Example Usage

```javascript
// 1. Create CorpID for new customer
const customer = await fetch('http://localhost:4702/api/identity/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'INDIVIDUAL',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919876543210',
    metadata: { source: 'website' }
  })
});

// 2. Create CorpID for business
const business = await fetch('http://localhost:4702/api/identity/create', {
  method: 'POST',
  body: JSON.stringify({
    type: 'BUSINESS',
    name: 'Acme Corp',
    email: 'contact@acme.com'
  })
});

// 3. Create relationship (customer works at business)
await fetch('http://localhost:4702/api/relationships', {
  method: 'POST',
  body: JSON.stringify({
    fromCorpId: customer.corpId,
    toCorpId: business.corpId,
    relationshipType: 'works_at',
    properties: { role: 'manager' }
  })
});

// 4. Award trust points
await fetch(`http://localhost:4702/api/trust/score/${customer.corpId}`, {
  method: 'POST',
  body: JSON.stringify({ delta: 10, reason: 'On-time payment' })
});

// 5. Find path between entities
const path = await fetch('http://localhost:4702/api/relationships/path/find?from=IND-xxx&to=BIZ-yyy');
```

---

# MemoryOS (4703) - Personal AI Memory

## Overview

MemoryOS provides persistent memory for every CorpID:
- Stores user experiences, preferences, and knowledge
- 4 memory types for different use cases
- Powers AI assistants with context
- Syncs across all industry touchpoints

## Memory Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| **EPISODIC** | Experiences, events, conversations | Chat history, user actions, transactions |
| **SEMANTIC** | Facts, knowledge, preferences | User facts, learned knowledge |
| **PROCEDURAL** | Skills, how-tos, processes | Learned procedures, workflows |
| **RELATIONAL** | Connections, relationships | Social graph, entity connections |

## Detailed Features

### Memory Storage

| Feature | Description | API |
|---------|-------------|-----|
| **Store Memory** | Store any type of memory | `POST /api/memories` |
| **Get Memory** | Retrieve by ID | `GET /api/memories/:memoryId` |
| **Get by Entity** | All memories for CorpID | `GET /api/memories/entity/:corpId` |
| **Update Memory** | Modify existing memory | `PATCH /api/memories/:memoryId` |
| **Delete Memory** | Remove memory | `DELETE /api/memories/:memoryId` |
| **Search Memories** | Semantic search | `POST /api/memories/search` |
| **Consolidate** | Extract facts from episodic | `POST /api/memories/:corpId/consolidate` |

### Context Management

| Feature | Description | API |
|---------|-------------|-----|
| **Get Context** | Get AI-ready context | `POST /api/context/get` |
| **Conversation History** | Past conversations | `GET /api/context/history/:corpId` |
| **Store Conversation** | Save conversation turn | `POST /api/context/conversation` |
| **Get Preferences** | User preferences | `GET /api/context/preferences/:corpId` |
| **Store Preference** | Save preference | `POST /api/context/preferences` |

### Memory Attributes

| Attribute | Description |
|-----------|-------------|
| **id** | Unique memory ID |
| **corpId** | Owner CorpID |
| **type** | EPISODIC, SEMANTIC, PROCEDURAL, RELATIONAL |
| **content** | Memory content |
| **importance** | 1-10 importance score |
| **accessCount** | Times accessed |
| **lastAccessed** | Last access timestamp |
| **createdAt** | Creation time |
| **updatedAt** | Last update time |

## API Endpoints (Complete)

```javascript
// Memory CRUD
POST   /api/memories                    // Store memory
GET    /api/memories/:memoryId         // Get memory
GET    /api/memories/entity/:corpId    // Get by entity
PATCH  /api/memories/:memoryId         // Update
DELETE /api/memories/:memoryId         // Delete
POST   /api/memories/search             // Search
POST   /api/memories/:corpId/consolidate // Extract facts

// Context
POST   /api/context/get                 // Get AI context
GET    /api/context/history/:corpId      // Conversation history
POST   /api/context/conversation        // Store conversation
GET    /api/context/preferences/:corpId // Get preferences
POST   /api/context/preferences         // Store preference

// Stats
GET    /stats                          // Entity/memory counts
```

## File Structure

```
services/memory-os/
├── package.json
└── src/
    ├── index.js                    # Main entry (port 4703)
    └── routes/
        ├── memory.js              # Memory CRUD + search + consolidate
        └── context.js             # AI context + conversation + preferences
```

## Example Usage

```javascript
// 1. Store user preference
await fetch('http://localhost:4703/api/context/preferences', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'IND-xxx',
    key: 'notifications',
    value: 'email',
    category: 'general'
  })
});

// 2. Store conversation
await fetch('http://localhost:4703/api/context/conversation', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'IND-xxx',
    role: 'user',
    content: 'I prefer morning deliveries',
    metadata: { topic: 'delivery', intent: 'preference' }
  })
});

// 3. Store episodic memory (event)
await fetch('http://localhost:4703/api/memories', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'IND-xxx',
    type: 'EPISODIC',
    content: 'User ordered pizza from Dominos on June 14, 2026',
    metadata: { orderId: 'ORD-123', amount: 500 },
    importance: 7
  })
});

// 4. Get AI context for response
const context = await fetch('http://localhost:4703/api/context/get', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'IND-xxx',
    query: 'delivery preferences'
  })
});

// 5. Search memories
const results = await fetch('http://localhost:4703/api/memories/search', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'IND-xxx',
    query: 'pizza',
    type: 'EPISODIC'
  })
});
```

---

# GoalOS (4242) - Autonomous Goal Decomposition

## Overview

GoalOS decomposes high-level goals into actionable sub-goals:
- Hierarchical goal management
- Auto-propagation of progress
- Priority-based execution
- Success metrics tracking

## Goal States

```
PENDING → IN_PROGRESS → COMPLETED
              ↓
           BLOCKED
              ↓
          CANCELLED
```

## Priority Levels

| Level | Value | Use Case |
|-------|-------|----------|
| **CRITICAL** | 1 | Top priority, urgent |
| **HIGH** | 2 | Important, time-sensitive |
| **MEDIUM** | 3 | Normal priority |
| **LOW** | 4 | When possible |

## Detailed Features

### Goal Management

| Feature | Description | API |
|---------|-------------|-----|
| **Create Goal** | Create with owner, priority, deadline | `POST /api/goals` |
| **Get Goal** | Get with children | `GET /api/goals/:goalId` |
| **Update Progress** | Update with auto-propagation | `PATCH /api/goals/:goalId/progress` |
| **Decompose** | Auto-break into sub-goals | `POST /api/goals/:goalId/decompose` |
| **Get by Owner** | Goals for CorpID | `GET /api/goals/owner/:corpId` |
| **Get Active** | All active goals | `GET /api/goals/status/active` |
| **Cancel Goal** | Cancel with reason | `PATCH /api/goals/:goalId/cancel` |

### Goal Attributes

| Attribute | Description |
|-----------|-------------|
| **id** | Unique goal ID |
| **title** | Goal title |
| **description** | Detailed description |
| **ownerCorpId** | Owner CorpID |
| **parentGoalId** | Parent goal (if sub-goal) |
| **status** | PENDING, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED |
| **priority** | CRITICAL(1), HIGH(2), MEDIUM(3), LOW(4) |
| **deadline** | Due date |
| **progress** | 0-100 percentage |
| **metrics** | Success metrics |
| **children** | Sub-goals |

### Decomposition Strategies

| Strategy | Description |
|----------|-------------|
| **sequential** | Goals executed in order (1, 2, 3...) |
| **parallel** | Goals executed simultaneously |
| **priority** | Goals ordered by priority |

## API Endpoints (Complete)

```javascript
// Goal CRUD
POST   /api/goals                     // Create goal
GET    /api/goals/:goalId             // Get with children
PATCH  /api/goals/:goalId/progress    // Update progress
PATCH  /api/goals/:goalId/cancel      // Cancel goal
POST   /api/goals/:goalId/decompose   // Decompose

// Queries
GET    /api/goals/owner/:corpId      // By owner
GET    /api/goals/status/:status     // By status
GET    /api/goals/status/active      // Active goals
GET    /api/goals/priority/:level    // By priority

// Stats
GET    /stats                        // Goal statistics
```

## File Structure

```
services/goal-os/
├── package.json
└── src/
    ├── index.js                    # Main entry (port 4242)
    └── routes/
        └── goals.js                # Goal management + decomposition
```

## Example Usage

```javascript
// 1. Create main goal
const goal = await fetch('http://localhost:4242/api/goals', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Increase sales by 20%',
    description: 'Q3 revenue target',
    ownerCorpId: 'BIZ-xxx',
    priority: 1, // CRITICAL
    deadline: '2026-09-30',
    metrics: { target: 2000000, current: 1666666 }
  })
});

// 2. Decompose into sub-goals
await fetch(`http://localhost:4242/api/goals/${goal.id}/decompose`, {
  method: 'POST',
  body: JSON.stringify({
    subGoals: [
      { title: 'Launch new product', priority: 1, deadline: '2026-07-01' },
      { title: 'Expand to 3 new cities', priority: 2, deadline: '2026-08-01' },
      { title: 'Hire 10 sales reps', priority: 2, deadline: '2026-07-15' },
      { title: 'Partner with 5 distributors', priority: 3, deadline: '2026-08-15' }
    ],
    strategy: 'sequential'
  })
});

// 3. Update progress (auto-propagates to parent)
await fetch(`http://localhost:4242/api/goals/${subGoalId}/progress`, {
  method: 'PATCH',
  body: JSON.stringify({
    progress: 50,
    status: 'in_progress',
    notes: 'Product launch on track'
  })
});

// 4. Get goals for owner
const goals = await fetch('http://localhost:4242/api/goals/owner/BIZ-xxx');
```

---

# Decision Engine (4240) - Policy & Authorization

## Overview

Decision Engine makes authorization decisions based on:
- Policy compliance
- Trust scores
- Risk assessment
- Historical patterns

## Decision Outcomes

| Outcome | Description | Action |
|---------|-------------|--------|
| **PROCEED** | Action approved | Continue execution |
| **HOLD** | Needs manual review | Queue for human review |
| **REJECT** | Action denied | Block action |
| **ESCALATE** | Needs higher authority | Escalate to supervisor |

## Risk Levels

| Level | Amount | Action |
|-------|--------|--------|
| **LOW** | < 10,000 | Fast path, auto-approve |
| **MEDIUM** | 10,000 - 50,000 | Normal review |
| **HIGH** | 50,000 - 100,000 | Enhanced review |
| **CRITICAL** | > 100,000 | Block + review |

## Detailed Features

### Decision Making

| Feature | Description | API |
|---------|-------------|-----|
| **Make Decision** | Authorize action | `POST /api/decisions/decide` |
| **Get Decision** | Get by ID | `GET /api/decisions/:decisionId` |
| **Entity History** | Past decisions | `GET /api/decisions/entity/:corpId` |
| **Appeal** | Appeal rejection | `POST /api/decisions/:decisionId/appeal` |

### Policy Management

| Feature | Description | API |
|---------|-------------|-----|
| **Create Policy** | Add policy rule | `POST /api/policies` |
| **Get Policy** | Get by ID | `GET /api/policies/:policyId` |
| **List Policies** | All policies | `GET /api/policies` |
| **Update Policy** | Modify rule | `PATCH /api/policies/:policyId` |
| **Delete Policy** | Remove policy | `DELETE /api/policies/:policyId` |

### Hold Management

| Feature | Description | API |
|---------|-------------|-----|
| **Create Hold** | Freeze entity | `POST /api/policies/holds` |
| **Release Hold** | Unfreeze | `DELETE /api/policies/holds/:holdId` |
| **Get Holds** | Entity's holds | `GET /api/policies/holds/:corpId` |

### Policy Conditions

| Condition | Description |
|-----------|-------------|
| **maxAmount** | Maximum transaction amount |
| **minTrustScore** | Minimum trust score required |
| **allowedHours** | Allowed time windows |
| **requiredVerification** | KYC level required |
| **allowedEntityTypes** | Who can perform action |

## API Endpoints (Complete)

```javascript
// Decisions
POST   /api/decisions/decide           // Make decision
GET    /api/decisions/:decisionId     // Get decision
GET    /api/decisions/entity/:corpId  // Entity history
POST   /api/decisions/:decisionId/appeal // Appeal

// Policies
POST   /api/policies                 // Create policy
GET    /api/policies/:policyId       // Get policy
GET    /api/policies                // List policies
PATCH  /api/policies/:policyId       // Update policy
DELETE /api/policies/:policyId       // Delete policy

// Holds
POST   /api/policies/holds           // Create hold
GET    /api/policies/holds/:corpId   // Get holds
DELETE /api/policies/holds/:holdId   // Release hold

// Stats
GET    /stats                       // Decision statistics
```

## File Structure

```
services/decision-engine/
├── package.json
└── src/
    ├── index.js                    # Main entry (port 4240)
    └── routes/
        ├── decisions.js            # Decision making + appeals
        └── policies.js            # Policy management + holds
```

## Example Usage

```javascript
// 1. Make decision on payment
const decision = await fetch('http://localhost:4240/api/decisions/decide', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'IND-xxx',
    action: 'payment',
    amount: 50000,
    resource: 'order-123',
    context: { paymentMethod: 'card', merchant: 'amazon' }
  })
});

// 2. Create policy for high-value transactions
await fetch('http://localhost:4240/api/policies', {
  method: 'POST',
  body: JSON.stringify({
    name: 'High Value Transaction Policy',
    action: 'payment',
    conditions: {
      maxAmount: 100000,
      minTrustScore: 60,
      requiredVerification: 'phone'
    }
  })
});

// 3. Create hold on suspicious entity
await fetch('http://localhost:4240/api/policies/holds', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'IND-xxx',
    type: 'fraud',
    reason: 'Multiple failed payment attempts',
    expiresAt: '2026-06-15T00:00:00Z'
  })
});

// 4. Appeal rejected decision
await fetch(`http://localhost:4240/api/decisions/${decisionId}/appeal`, {
  method: 'POST',
  body: JSON.stringify({
    reason: 'Payment was legitimate - retrying after network error',
    supportingDocs: ['receipt.pdf', 'bank-statement.pdf']
  })
});
```

---

# Agent Economy (4251) - Karma & Payments

## Overview

Agent Economy provides economic infrastructure:
- Karma points for reputation
- SLBs for SLA bonds
- Agent-to-agent payments
- Escrow management

## Currencies

| Currency | Purpose | Description |
|----------|---------|-------------|
| **KARMA** | Reputation | Points for good behavior |
| **SLB** | SLA Bond | Stake for service commitment |
| **REZ** | Platform | Main platform currency |

## Reputation Tiers

| Tier | Karma Required | Multiplier | Benefits |
|------|---------------|------------|----------|
| **LEGENDARY** | 10,000+ | 1.5x | Priority support, highest rates |
| **ELITE** | 5,000+ | 1.3x | Premium features |
| **TRUSTED** | 1,000+ | 1.1x | Enhanced trust |
| **VERIFIED** | 100+ | 1.0x | Standard features |
| **NEW** | 0-99 | 0.8x | Basic features |

## Detailed Features

### Balance Management

| Feature | Description | API |
|---------|-------------|-----|
| **Get Balance** | All currency balances | `GET /api/economy/balance/:corpId` |
| **Award Karma** | Reward good action | `POST /api/economy/karma/award` |
| **Burn Karma** | Penalty for bad action | `POST /api/economy/karma/burn` |
| **Stake SLB** | Stake for task | `POST /api/economy/slb/stake` |
| **Slash SLB** | SLA breach penalty | `POST /api/economy/slb/slash` |

### Payments & Escrow

| Feature | Description | API |
|---------|-------------|-----|
| **Create Payment** | Agent-to-agent | `POST /api/payments` |
| **Get Payment** | Payment details | `GET /api/payments/:paymentId` |
| **Create Escrow** | Hold payment | `POST /api/payments/escrow` |
| **Release Escrow** | Release to recipient | `POST /api/payments/escrow/:id/release` |
| **Refund Escrow** | Return to sender | `POST /api/payments/escrow/:id/refund` |

### Leaderboard & History

| Feature | Description | API |
|---------|-------------|-----|
| **Leaderboard** | Top karma holders | `GET /api/economy/leaderboard` |
| **Transactions** | Transaction history | `GET /api/economy/txs/:corpId` |
| **Reputation Tier** | Current tier + benefits | Included in balance |

## API Endpoints (Complete)

```javascript
// Balance
GET    /api/economy/balance/:corpId   // Get all balances

// Karma
POST   /api/economy/karma/award       // Award karma
POST   /api/economy/karma/burn         // Burn karma (penalty)

// SLB
POST   /api/economy/slb/stake         // Stake SLB
POST   /api/economy/slb/slash         // Slash SLB (breach)

// Transactions
GET    /api/economy/txs/:corpId        // Transaction history
GET    /api/economy/leaderboard       // Karma leaderboard

// Payments
POST   /api/payments                   // Create payment
GET    /api/payments/:paymentId        // Get payment

// Escrow
POST   /api/payments/escrow            // Create escrow
GET    /api/payments/escrow/:id        // Get escrow
POST   /api/payments/escrow/:id/release // Release
POST   /api/payments/escrow/:id/refund  // Refund
```

## File Structure

```
services/agent-economy/
├── package.json
└── src/
    ├── index.js                    # Main entry (port 4251)
    └── routes/
        ├── economy.js              # Karma, SLB, balances, leaderboard
        └── payments.js             # Payments, escrow
```

## Example Usage

```javascript
// 1. Get entity balance and tier
const balance = await fetch('http://localhost:4251/api/economy/balance/AGT-xxx');

// 2. Award karma for good performance
await fetch('http://localhost:4251/api/economy/karma/award', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'AGT-xxx',
    amount: 100,
    reason: 'Excellent customer service rating',
    sourceCorpId: 'IND-customer' // Who awarded
  })
});

// 3. Slash SLB for SLA breach
await fetch('http://localhost:4251/api/economy/slb/slash', {
  method: 'POST',
  body: JSON.stringify({
    corpId: 'AGT-xxx',
    amount: 500,
    reason: 'Delivery SLA breach - 2 hours late',
    taskId: 'TASK-123'
  })
});

// 4. Create payment for completed task
await fetch('http://localhost:4251/api/payments', {
  method: 'POST',
  body: JSON.stringify({
    fromCorpId: 'BIZ-employer',
    toCorpId: 'AGT-agent',
    amount: 1000,
    currency: 'rez',
    description: 'Task completed: Customer onboarding',
    taskId: 'TASK-123'
  })
});

// 5. Create escrow for milestone-based payment
await fetch('http://localhost:4251/api/payments/escrow', {
  method: 'POST',
  body: JSON.stringify({
    fromCorpId: 'BIZ-employer',
    toCorpId: 'AGT-agent',
    amount: 5000,
    currency: 'rez',
    taskId: 'PROJECT-456',
    releaseConditions: {
      milestone: 'phase1_complete',
      verification: 'employer_approval'
    }
  })
});

// 6. Get leaderboard
const leaders = await fetch('http://localhost:4251/api/economy/leaderboard?currency=karma&limit=10');
```

---

# Connection Modules

**Location:** `core/unified-fabric/src/connections/`

All foundation services have connection modules for easy integration:

| Connection | File | Key Methods |
|-----------|------|-------------|
| CorpID | `corpId.js` | createEntity, getEntity, verify, trustScore |
| MemoryOS | `memoryOS.js` | store, getMemories, search, getContext |
| GoalOS | `goalOS.js` | createGoal, decompose, updateProgress |
| Decision Engine | `decisionEngine.js` | decide, createPolicy, createHold |
| Agent Economy | `agentEconomy.js` | awardKarma, stakeSLB, createPayment |

## Connected Services

| Service | Integration | Method |
|---------|-------------|--------|
| TwinOS Hub | CorpID | `linkToCorpId()` |
| AgentOS Hub | CorpID | `registerWithCorpId()` |
| Business Copilot | MemoryOS + CorpID | Context + identity |
| All Industry OS | CorpID | Identity verification |

---

# Health Checks

```bash
curl http://localhost:4702/health  # CorpID
curl http://localhost:4703/health  # MemoryOS
curl http://localhost:4242/health  # GoalOS
curl http://localhost:4240/health  # Decision Engine
curl http://localhost:4251/health  # Agent Economy
```

---

# Architecture Principles

1. **Identity First**: Every entity gets a CorpID before any other operation
2. **Memory Follows**: Personal data stored in MemoryOS linked to CorpID
3. **Goals Drive**: Goals in GoalOS align all actions
4. **Decisions Gate**: Decision Engine authorizes all important actions
5. **Economy Rewards**: Agent Economy provides karma and payment infrastructure

---

# File Structure

```
services/
├── CLAUDE.md                    # This file
├── corpid-service/
│   ├── package.json
│   └── src/
│       ├── index.js            # Port 4702
│       └── routes/
│           ├── identity.js
│           ├── trust.js
│           ├── relationships.js
│           └── agents.js
├── memory-os/
│   ├── package.json
│   └── src/
│       ├── index.js            # Port 4703
│       └── routes/
│           ├── memory.js
│           └── context.js
├── goal-os/
│   ├── package.json
│   └── src/
│       ├── index.js            # Port 4242
│       └── routes/
│           └── goals.js
├── decision-engine/
│   ├── package.json
│   └── src/
│       ├── index.js            # Port 4240
│       └── routes/
│           ├── decisions.js
│           └── policies.js
└── agent-economy/
    ├── package.json
    └── src/
        ├── index.js            # Port 4251
        └── routes/
            ├── economy.js
            └── payments.js
```

---

# Related Documentation

- `RTNM-COMPANIES-AUDIT.md` - Ecosystem overview
- `RTNM-PRODUCTS-FEATURES-AUDIT.md` - Product features
- `core/unified-fabric/src/connections/` - Connection modules
- Company CLAUDE.md files - Company-specific integrations

---

*Last Updated: June 14, 2026*
