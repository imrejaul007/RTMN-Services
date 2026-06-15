# Core Concepts

**Understand the key building blocks of the RTMN platform.**

---

## RTMN Platform Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      RTMN ECOSYSTEM                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           INDUSTRY OS LAYER (24 Industries)              │ │
│  │  Restaurant │ Hotel │ Healthcare │ Retail │ Legal │ ... │ │
│  └─────────────────────────────────────────────────────────┘ │
│                            │                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           DIGITAL TWIN LAYER (35+ Twins)                 │ │
│  │  Brand Twin │ Customer Twin │ Agent Twin │ Property Twin│ │
│  └─────────────────────────────────────────────────────────┘ │
│                            │                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           FOUNDATION LAYER                               │ │
│  │  CorpID │ MemoryOS │ GoalOS │ Decision Engine │ Economy │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### 1. Industry Operating Systems

Each industry has a purpose-built OS that handles all core operations:

| OS | Port | Handles |
|----|------|---------|
| Restaurant OS | 5010 | Menu, orders, kitchen, table, customer |
| Hotel OS | 5025 | Rooms, bookings, guest, service, revenue |
| Healthcare OS | 5020 | Patient, appointment, doctor, prescription |
| Retail OS | 5030 | Product, inventory, customer, cart |
| ... | ... | ... |

Each OS includes:
- REST API endpoints
- Digital twins for core entities
- Industry-specific logic
- Integration with foundation services

### 2. Digital Twins

A **Digital Twin** is a real-time AI representation of an entity in the physical world.

**Types of Twins:**

| Twin | Represents | Key Attributes |
|------|------------|----------------|
| Brand Twin | Your brand | Sentiment, ratings, reviews, mentions |
| Customer Twin | A customer | Profile, history, preferences, value |
| Agent Twin | AI agent | Karma score, capabilities, memory |
| Property Twin | A property | Listings, bookings, reviews |
| Deal Twin | A deal | Stage, value, parties, timeline |
| Area Twin | A geographic area | Demographics, traffic, trends |

**How Twins Work:**

```
Physical World          Digital Twin          AI Agents
     │                      │                    │
     │  Review posted  ───► │                    │
     │                      │  Sentiment updated │                    │
     │                      │                    │──►  Alert triggered
     │                      │                    │──►  Action planned
     │                      │                    │──►  Goal decomposed
```

### 3. Foundation Services

The foundation layer provides shared infrastructure:

| Service | Port | Purpose |
|---------|------|---------|
| **CorpID** | 4702 | Universal identity — one ID across all industries |
| **MemoryOS** | 4703 | Personal AI memory — learns from interactions |
| **GoalOS** | 4242 | Autonomous goal decomposition — AI plans to goals |
| **Decision Engine** | 4240 | Policy-based authorization — who can do what |
| **Agent Economy** | 4251 | Karma scoring and micro-payments |

### 4. RTNM SDK

The **RTNM SDK** is a unified client that connects to all RTMN services:

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

// Access any service through the unified client
rtmn.brands.list();          // BrandPulse
rtmn.hotel.bookings.list();   // Hotel OS
rtmn.twins.get('customer');   // Digital Twins
rtmn.goals.create();          // GoalOS
rtmn.decisions.evaluate();   // Decision Engine
```

### 5. Event Bus

The **Event Bus** enables real-time communication between services:

```typescript
// Subscribe to events
rtmn.events.subscribe('brand.sentiment.spike', (event) => {
  console.log('Sentiment spike:', event.data);
});

// Publish events
rtmn.events.publish('order.created', {
  orderId: 'order_123',
  amount: 99.99
});
```

### 6. Agent Economy

The **Agent Economy** enables AI agents to work and be compensated:

- **Karma Score** — Reputation built through good work
- **Micro-payments** — Agents earn for useful actions
- **Marketplace** — Agents offer and sell capabilities

```typescript
// Check agent karma
const agent = await rtmn.agents.get('agent_xyz');
console.log('Karma:', agent.karmaScore);

// Pay an agent for work
await rtmn.economy.transfer({
  from: 'your_account',
  to: 'agent_xyz',
  amount: 0.50,
  currency: 'USD',
  reason: 'Review analysis completed'
});
```

### 7. SUTAR OS

**SUTAR OS** is the autonomous economic infrastructure:

- AI agents that plan, execute, and pay for work
- Self-improving through memory and feedback
- Cross-industry coordination

---

## Key Terms

| Term | Definition |
|------|------------|
| **Brand** | A business entity being monitored (e.g., a hotel chain) |
| **Review** | A customer review from Google, Yelp, TripAdvisor, Facebook |
| **Sentiment** | Emotional tone of text — positive, neutral, or negative |
| **Aspect** | A specific dimension of a review (e.g., "service", "cleanliness") |
| **Twin** | A digital representation of a real-world entity |
| **Agent** | An AI entity that can take actions and earn karma |
| **Goal** | An objective that GoalOS can decompose into tasks |
| **Policy** | A rule in the Decision Engine that controls access |
| **Event** | A real-time message published on the Event Bus |

---

## Data Flow

```
User Action
    │
    ▼
API Request (RTNM SDK)
    │
    ▼
API Gateway (Authentication, Rate Limiting)
    │
    ▼
Service (e.g., BrandPulse)
    │
    ├──► Database (MongoDB)
    │
    ├──► Cache (Redis)
    │
    ├──► Digital Twin (TwinOS Hub)
    │
    ├──► Event Bus (publish event)
    │
    └──► Response
           │
           ▼
      Real-time updates (WebSocket)
           │
           ▼
      Dashboard / Client
```

---

## Port Reference

| Range | Services |
|-------|----------|
| 3000-3099 | Core (API Gateway, Business Copilot, AgentOS) |
| 4001-4040 | RABTUL (Auth, Wallet, Manufacturing) |
| 4140-4256 | SUTAR OS |
| 4240-4256 | GoalOS, Decision Engine, Economy |
| 4702-4725 | Foundation (CorpID, MemoryOS, TwinOS Hub) |
| 4770-4780 | BrandPulse (API, Dashboard) |
| 4800-4899 | REZ-Merchant |
| 5010-5240 | Industry OS (24 industries) |

See [PORT-REGISTRY.md](PORT-REGISTRY.md) for full details.

---

## Next Steps

- [Digital Twins Deep Dive](docs/concepts/DIGITAL-TWINS.md)
- [RTNM SDK Reference](docs/concepts/RTNM-SDK.md)
- [Agent Economy](docs/concepts/AGENT-ECONOMY.md)
- [Event Bus](docs/concepts/EVENT-BUS.md)
