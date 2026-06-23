# Phase 37: Event Platform — 3 weeks

> **The pub/sub message bus that lets services react to events — the nervous system of the AI ecosystem.**
>
> **Status:** 📋 NEW — Not started
> **Duration:** 3 weeks
> **Team:** 2 backend engineers + 1 systems engineer
> **Priority:** P0 (critical path)
> **Depends on:** Phase 10 (Hub), Phase 14 (Agent Runtime)
> **Blocks:** Phase 32 (Agent OS), Phase 38 (AI Studio)

---

## 🎯 Goal

Build an **event platform** — a Kafka-like pub/sub message bus that lets services publish events and subscribe to them. Enables event sourcing, cross-system automation, and event-driven architectures.

**Why this is critical:** Today's RTMN has services that call each other directly (tight coupling). An event platform enables loose coupling, replay, and cross-system automation that doesn't exist today. Without it, you can't build "when X happens in Sales OS, trigger Y in Marketing OS" workflows.

---

## 📊 Current State

**Problem:** RTMN has 240+ services. But:
- Services call each other directly (tight coupling)
- No pub/sub (can't broadcast events)
- No event sourcing (no audit trail of state changes)
- No event catalog (can't discover what events exist)
- No event replay (can't rebuild state from events)
- No cross-system automation (Sales → Marketing doesn't trigger automatically)

**Reference:** Apache Kafka, Confluent Cloud, AWS EventBridge, Google Cloud Pub/Sub, Azure Event Grid, Segment

---

## 🎁 Deliverables

### 37.1 Pub/Sub Message Bus (Week 1)
- **Topics:** Create, delete, list topics
- **Publish:** Publish events to topic
- **Subscribe:** Subscribe to topic, receive events
- **Consumer groups:** Multiple consumers share load
- **Message ordering:** FIFO within partition
- **Message retention:** Configurable retention (1 day, 7 days, 30 days)
- **Dead letter queue:** Events that fail processing go to DLQ

### 37.2 Event Sourcing (Week 1)
- **Event log:** Every state change is an event
- **Event replay:** Replay events to rebuild state
- **Event versioning:** Events versioned like code
- **Event schema:** JSON Schema for events
- **Snapshot support:** Periodic snapshots to speed up replay

### 37.3 Event Catalog (Week 2)
- **Event discovery:** Browse all events in the system
- **Event documentation:** Auto-generated docs for each event
- **Event schema:** Schema for event payload
- **Event examples:** Sample events
- **Event ownership:** Who owns this event
- **Search:** Full-text search across events

### 37.4 Cross-System Automation (Week 2)
- **Event rules:** "When event X happens, trigger action Y"
- **Action types:** Call API, run workflow, send email, publish event
- **Conditional logic:** If/then/else in rules
- **Rule versioning:** Version rules like code
- **Rule testing:** Test rules with sample events
- **Rule marketplace:** Share rules across orgs

### 37.5 Event Governance (Week 3)
- **Access control:** Who can publish/subscribe to which topics
- **Tenant isolation:** Tenant A can't see Tenant B's events
- **Encryption:** At-rest and in-transit
- **Audit log:** Who published/consumed what, when
- **Compliance:** GDPR right-to-be-forgotten for events

### 37.6 Event Replay (Week 3)
- **Time travel:** Replay events from any point in time
- **Selective replay:** Replay only events for specific tenant/entity
- **Replay speed:** Replay at 1x, 10x, 100x
- **Replay monitoring:** Track replay progress
- **Replay safety:** Prevent replay from overwriting current state

### 37.7 Event Analytics (Week 3)
- **Event volume:** Events per second per topic
- **Event latency:** Time from publish to consume
- **Event failures:** Failed events, DLQ size
- **Top events:** Most-published events
- **Event graph:** Visual graph of event flows

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   EVENT PLATFORM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    EVENT CATALOG (UI)                         │  │
│  │  • Browse events  • Schema  • Examples  • Documentation     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    PUB/SUB API                                │  │
│  │  • Publish  • Subscribe  • List topics  • Create consumer   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  EVENT BROKER (Kafka-like)                    │  │
│  │  • Topics  • Partitions  • Replication  • Retention         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  EVENT SOURCING                               │  │
│  │  • Event log  • Snapshots  • Replay  • Versioning          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              CROSS-SYSTEM AUTOMATION                         │  │
│  │  • Rules  • Actions  • Conditional logic  • Testing         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              GOVERNANCE                                      │  │
│  │  • RBAC  • Tenant isolation  • Encryption  • Audit         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              STORAGE                                          │  │
│  │  • Kafka (event log)  • S3 (snapshots)  • MongoDB (catalog) │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              INTEGRATIONS                                     │  │
│  │  • All 240+ RTMN services  • Agent OS (Phase 32)            │  │
│  │  • AI Studio (Phase 38)  • TwinOS (Phase 4)                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
# Topic Management
POST   /api/events/topics                     # Create topic
GET    /api/events/topics                     # List topics
DELETE /api/events/topics/:id                 # Delete topic
GET    /api/events/topics/:id                 # Get topic details

# Pub/Sub
POST   /api/events/publish                    # Publish event
POST   /api/events/subscribe                  # Subscribe to topic
POST   /api/events/unsubscribe                # Unsubscribe
GET    /api/events/consume                    # Consume events (pull)

# Event Sourcing
GET    /api/events/log/:aggregateId           # Get event log
POST   /api/events/snapshot                   # Create snapshot
POST   /api/events/replay                     # Replay events
GET    /api/events/replay/:id/status          # Replay status

# Catalog
GET    /api/events/catalog                    # Browse catalog
GET    /api/events/catalog/:eventType         # Get event details
GET    /api/events/catalog/search             # Search events

# Automation Rules
POST   /api/events/rules                      # Create rule
GET    /api/events/rules                      # List rules
PUT    /api/events/rules/:id                  # Update rule
DELETE /api/events/rules/:id                  # Delete rule
POST   /api/events/rules/:id/test             # Test rule
POST   /api/events/rules/:id/enable           # Enable rule
POST   /api/events/rules/:id/disable          # Disable rule

# Governance
POST   /api/events/topics/:id/permissions     # Set topic permissions
GET    /api/events/audit                      # Audit log

# Analytics
GET    /api/events/analytics/volume           # Event volume
GET    /api/events/analytics/latency          # Event latency
GET    /api/events/analytics/failures         # Failure analysis
```

---

## 🧪 Test Gates

- **Unit tests:** 85%+ coverage
- **Integration tests:** All endpoints + Kafka integration
- **E2E test:** Publish event → Subscribe → Consume → Process
- **Performance test:** 100,000 events/sec throughput
- **Latency test:** <10ms publish-to-consume p95
- **Replay test:** Replay 1M events in <1 hour
- **Multi-tenant test:** Tenant A cannot see Tenant B's events

**Definition of Done:**
- [ ] All 7 deliverables complete
- [ ] All test gates pass
- [ ] Documentation: API, user guide
- [ ] Catalog UI deployed
- [ ] 50+ standard event types defined
- [ ] Integration with 10 pilot services (Sales, Marketing, etc.)
- [ ] 5 sample automation rules seeded

---

## 📊 Success Criteria

- **Throughput:** 100,000+ events/sec
- **Latency:** <10ms publish-to-consume p95
- **Reliability:** 99.99% uptime, zero data loss
- **Adoption:** 100+ services publishing events
- **Automation:** 1,000+ automation rules active

---

## 🚀 Implementation Details

### Tech Stack
- **Backend:** Node.js/TypeScript, Go (for performance-critical broker)
- **Message broker:** Apache Kafka or Redpanda
- **Storage:** Kafka (event log), S3 (snapshots), MongoDB (catalog, rules)
- **UI:** React (catalog, automation builder)

### Key Services
- `event-broker` (port 4870) — Kafka-like broker
- `event-catalog` (port 4871) — Event discovery
- `event-automation` (port 4872) — Rules engine
- `event-replay` (port 4873) — Replay service
- `event-governance` (port 4874) — Access control

### Standard Event Types (50+ to seed)
- `customer.created`, `customer.updated`, `customer.deleted`
- `order.created`, `order.paid`, `order.shipped`, `order.delivered`, `order.cancelled`
- `payment.initiated`, `payment.succeeded`, `payment.failed`
- `lead.created`, `lead.qualified`, `lead.converted`
- `campaign.launched`, `campaign.completed`
- `agent.started`, `agent.completed`, `agent.failed`
- `workflow.started`, `workflow.completed`, `workflow.failed`
- `twin.updated`, `twin.deleted`
- `memory.created`, `memory.expired`
- `model.deployed`, `model.rollback`
- `evaluation.started`, `evaluation.completed`
- ... and 30+ more

### Integration Points
- **All 240+ RTMN services:** Publish domain events
- **Agent OS (Phase 32):** Event-driven agent triggers
- **AI Studio (Phase 38):** Visual automation builder
- **TwinOS (Phase 4):** Twin state change events
- **Workflow Engine (Phase 19):** Workflow triggers

---

## 📚 Documentation Deliverables

- [ ] **API Reference** — All endpoints
- [ ] **Architecture** — Deep dive on event sourcing
- [ ] **User Guide** — How to publish/subscribe
- [ ] **Catalog Guide** — How to document events
- [ ] **Automation Guide** — How to write rules
- [ ] **Best Practices** — Event design, schema evolution, replay

---

## 🔗 Related Phases

- **Depends on:** Phase 10 (Hub), Phase 14 (Agent Runtime)
- **Blocks:** Phase 32 (Agent OS), Phase 38 (AI Studio)
- **Related:** Phase 31 (Evaluation), Phase 40 (Agent Lifecycle)

---

## 🌟 Why This Is Transformative

After Phase 37, RTMN goes from "services calling each other" to "services reacting to events." This unlocks:

1. **Cross-system automation:** "When customer churns in Sales OS, trigger win-back campaign in Marketing OS"
2. **Real-time analytics:** "Show me all orders placed in the last 5 minutes"
3. **Event sourcing:** "Rebuild the entire system state from events"
4. **Loose coupling:** "Sales OS doesn't need to know Marketing OS exists — just publish events"
5. **Replay:** "Replay last week's events to test new analytics"

This is the **nervous system of the AI ecosystem.**

---

*Last Updated: June 22, 2026*
