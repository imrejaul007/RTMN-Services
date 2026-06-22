# Hojai AI Platform Consolidation Plan

**Based on REZ-Intelligence Audit (174 services)**
**Date: May 27, 2026**

---

## Audit Summary

| Classification | Count | Action |
|---------------|-------|--------|
| GENERIC_INFRA | 98 | → Hojai Core Platforms |
| PROPRIETARY_INTEL | 54 | → Stay REZ-Only |
| DUPLICATE | 3 | → Merge |
| UNKNOWN | 19 | → Verify & classify |

---

## 10 Hojai Core Platforms

### From 174 → 10 Platforms

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HOJAI CORE PLATFORMS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. HOJAI GOVERNANCE        →  Multi-tenant auth, RBAC, isolation        │
│     (REZ: tenant-adapter, api-gateway, api-keys, observability)            │
│                                                                             │
│  2. HOJAI EVENT             →  Event bus, streaming, ingestion             │
│     (REZ: event-bus, event-platform, event-connector, realtime-gateway)     │
│                                                                             │
│  3. HOJAI MEMORY            →  Customer memory, timeline, vectors           │
│     (REZ: memory-layer, memory-engine, unified-profile)                     │
│                                                                             │
│  4. HOJAI INTELLIGENCE      →  Predictions, recommendations, ML            │
│     (REZ: predictive-engine, intent-predictor, recommendation-engine)       │
│                                                                             │
│  5. HOJAI IDENTITY          →  User identity, graph, segments              │
│     (REZ: identity-graph, universal-user-graph, realtime-segments)        │
│                                                                             │
│  6. HOJAI AGENTS            →  Autonomous agents, orchestration            │
│     (REZ: autonomous-agents, ai-orchestrator, ai-router)                   │
│                                                                             │
│  7. HOJAI FLOW              →  Workflow runtime, automation                 │
│     (REZ: flow-runtime, workflow-builder, action-engine)                    │
│                                                                             │
│  8. HOJAI COMMUNICATIONS    →  WhatsApp, SMS, Email, Push                  │
│     (REZ: whatsapp, notification-router, sms-bridge, email-bridge)          │
│                                                                             │
│  9. HOJAI ANALYTICS         →  Insights, attribution, targeting             │
│     (REZ: insights-service, attribution-system, experimentation-engine)      │
│                                                                             │
│  10. HOJAI DATA             →  Data platform, feature store, governance     │
│     (REZ: data-platform, feature-store, data-governance)                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Platform 1: HOJAI GOVERNANCE ✅ BUILT

**Source Services:**
- REZ-tenant-adapter
- REZ-api-gateway
- REZ-api-keys
- REZ-feature-flags
- REZ-audit-logging
- REZ-observability-system
- REZ-monitoring

**Features:**
- Multi-tenant isolation (database, Redis, vector, event namespaces)
- JWT + API key authentication
- RBAC with 30+ permissions
- Policy engine with conditions
- Audit logging with 2-year retention
- Rate limiting per tenant

**Port:** 4500

---

## Platform 2: HOJAI EVENT

**Source Services:**
- REZ-event-bus
- REZ-event-platform
- REZ-event-connector
- REZ-realtime-gateway
- REZ-realtime-service
- REZ-unified-event-schema
- REZ-real-time-decision-engine

**Services to Consolidate:** 7 → 1

**Features:**
- Event ingestion with schema validation
- Redis Pub/Sub for real-time
- Kafka for durable events
- Dead letter queue
- Event replay
- WebSocket gateway
- 47 event types across 8 categories

**Target Port:** 4510

---

## Platform 3: HOJAI MEMORY

**Source Services:**
- REZ-memory-layer
- REZ-memory-engine
- REZ-context-engine
- REZ-unified-profile
- REZ-customer-360

**Services to Consolidate:** 5 → 1

**Features:**
- Customer timeline
- Event sourcing
- Context assembly
- Redis cache with TTL
- WebSocket updates
- Vector storage integration

**Target Port:** 4520

---

## Platform 4: HOJAI INTELLIGENCE

**Source Services:**
- REZ-predictive-engine
- REZ-intent-predictor
- REZ-vector-intelligence
- REZ-recommendation-engine
- REZ-personalization-engine
- REZ-cross-sell-engine
- REZ-rfm-service
- REZ-taste-profile
- REZ-temporal-intelligence
- REZ-ml-observability
- REZ-confidence-scorer

**Services to Consolidate:** 11 → 1

**Features:**
- Churn prediction
- LTV prediction
- Revisit prediction
- Conversion prediction
- Intent prediction
- Vector embeddings (OpenAI, Azure, Cohere)
- Recommendations (collaborative, content-based)
- RFM segmentation
- Temporal/habit detection

**Target Port:** 4530

---

## Platform 5: HOJAI IDENTITY

**Source Services:**
- REZ-identity-graph
- REZ-identity-bridge
- REZ-unified-identity
- REZ-universal-user-graph
- REZ-consumer-graph
- REZ-realtime-segments
- REZ-cohort-service
- REZ-behavioral-psychology

**Services to Consolidate:** 8 → 1

**Features:**
- Cross-platform identity resolution
- User graph relationships
- Real-time segmentation
- Cohort analysis
- Behavioral psychology scoring

**Target Port:** 4540

---

## Platform 6: HOJAI AGENTS

**Source Services:**
- REZ-autonomous-agents
- REZ-ai-orchestrator
- REZ-ai-router
- REZ-action-orchestrator
- REZ-business-orchestrator
- REZ-priority-engine
- REZ-reasoning-engine
- REZ-reinforcement-optimizer
- REZ-causal-ai
- REZ-confidence-scorer

**Services to Consolidate:** 10 → 1

**Features:**
- 8 autonomous agents (DemandSignal, Scarcity, Personalization, etc.)
- Agent coordination
- Cost optimization routing
- Chain-of-thought reasoning
- Reinforcement learning
- Causal inference

**Target Port:** 4550

---

## Platform 7: HOJAI FLOW

**Source Services:**
- REZ-flow-runtime
- REZ-workflow-builder
- REZ-action-engine
- REZ-human-in-loop

**Services to Consolidate:** 4 → 1

**Features:**
- Visual workflow builder
- BullMQ execution
- Conditional logic
- Human approval workflows
- Retry and error handling

**Target Port:** 4560

---

## Platform 8: HOJAI COMMUNICATIONS

**Source Services:**
- REZ-whatsapp
- REZ-notification-router
- REZ-sms-bridge
- REZ-email-bridge
- REZ-rcs-bridge
- REZ-ai-voice
- REZ-channel-orchestrator

**Services to Consolidate:** 7 → 1

**Features:**
- WhatsApp Business API
- Multi-channel notifications (Push, SMS, Email, WhatsApp, RCS)
- Voice AI with Whisper/ElevenLabs
- Template management
- Delivery tracking

**Target Port:** 4570

---

## Platform 9: HOJAI ANALYTICS

**Source Services:**
- REZ-insights-service
- REZ-attribution-system
- REZ-experimentation-engine
- REZ-ab-testing
- REZ-targeting-engine
- REZ-feedback-collector
- REZ-what-if-analytics

**Services to Consolidate:** 7 → 1

**Features:**
- Business insights
- Multi-touch attribution
- A/B testing
- Audience targeting
- Feedback collection
- Scenario simulation

**Target Port:** 4580

---

## Platform 10: HOJAI DATA

**Source Services:**
- REZ-data-platform
- REZ-data-warehouse
- REZ-feature-store
- REZ-ml-feature-store
- REZ-ml-model-registry
- REZ-data-governance
- REZ-knowledge-graph
- REZ-ontology-engine

**Services to Consolidate:** 8 → 1

**Features:**
- Lakehouse architecture
- Feature store
- Model registry
- Data governance
- ETL pipelines
- Knowledge graph

**Target Port:** 4590

---

## Port Allocation (10 Hojai Platforms)

| Platform | Port | Priority |
|----------|------|----------|
| Hojai Governance | 4500 | P0 ✅ Built |
| Hojai Event | 4510 | P1 |
| Hojai Memory | 4520 | P1 |
| Hojai Intelligence | 4530 | P1 |
| Hojai Identity | 4540 | P2 |
| Hojai Agents | 4550 | P2 |
| Hojai Flow | 4560 | P1 |
| Hojai Communications | 4570 | P1 |
| Hojai Analytics | 4580 | P2 |
| Hojai Data | 4590 | P3 |

---

## REZ Proprietary Services (Stay Internal)

### Expert Agents (8)
- rez-travel-expert (3003)
- rez-hospitality-expert (3004)
- rez-retail-expert (3005)
- rez-health-expert (3006)
- rez-fitness-expert (3007)
- rez-salon-expert (3008)
- rez-culinary-expert (3009)
- rez-education-expert (3010)

### Ecosystem-Specific (54 services)
- REZ-consumer-loop, REZ-flywheel-engine
- REZ-qr-campaigns, REZ-dooh-intelligence
- REZ-merchant-os, REZ-care-service
- REZ-delivery-intelligence
- REZ-karma-loyalty-bridge
- (etc.)

### Proprietary Moat
```
REZ Intelligence = privileged tenant on Hojai
  + ecosystem-wide behavioral graph
  + unified identity across apps
  + loyalty graph
  + mobility graph
  + city intelligence
```

---

## Critical Issues to Fix

### Port Conflicts
| Port | Currently Used By | Resolution |
|------|------------------|------------|
| 4070 | REZ-personalization-engine, REZ-channel-orchestrator, rez-cohort-service | Consolidate into Hojai Intelligence |
| 4062 | REZ-autonomous-agents, REZ-multi-location-service | Consolidate into Hojai Agents |
| 4090 | REZ-unified-attribution, REZ-unified-recommendations, REZ-ltv-attribution | Consolidate into Hojai Analytics |

### Service Duplicates
| Duplicate | Original | Action |
|-----------|----------|--------|
| REZ-ab-testing-service | REZ-ab-testing | Merge |
| rez-fraud-detection-service | rez-fraud-agent | Merge |
| REZ-customer-360 | REZ-cdp-service | Merge |

---

## Execution Order

### Phase 1 (Week 1-2): Foundation ✅ DONE
- [x] Hojai Governance (port 4500)

### Phase 2 (Week 3-4): Core Infrastructure
- [ ] Hojai Event (port 4510)
- [ ] Hojai Memory (port 4520)
- [ ] Hojai Flow (port 4560)

### Phase 3 (Week 5-6): Intelligence Layer
- [ ] Hojai Intelligence (port 4530)
- [ ] Hojai Identity (port 4540)
- [ ] Hojai Agents (port 4550)

### Phase 4 (Week 7-8): Product Layer
- [ ] Hojai Communications (port 4570) - WhatsApp AI
- [ ] Hojai Analytics (port 4580)
- [ ] Hojai Data (port 4590)

---

## Validation Checklist

- [ ] All 98 GENERIC_INFRA services mapped to platforms
- [ ] All 54 PROPRIETARY_INTEL services marked for REZ-only
- [ ] All 3 DUPLICATE services scheduled for merge
- [ ] Port conflicts resolved
- [ ] Tenant isolation tested for each platform
- [ ] API documentation generated
- [ ] Migration guides written
