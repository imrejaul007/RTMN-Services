# RTMN Support Platform - Production Architecture v2

**Based on architectural audit**  
**Status:** Planning → Implementation  
**Target:** Enterprise-grade AI-powered Customer Operations Platform

---

## Executive Summary

Current state: 5.5/10 (Feature-rich but not production-ready)
Target state: 9/10 (Enterprise-grade, scalable, secure)

### Key Improvements Needed

| Category | Current | Target |
|----------|---------|--------|
| Architecture | Spaghetti (direct calls) | Event-driven (decoupled) |
| API Gateway | Missing | Required |
| Authentication | Ad-hoc | Centralized (CorpID) |
| Data | Shared DB | Per-service DB |
| Cache | None | Redis |
| Search | SQL LIKE | Elasticsearch |
| AI | Monolithic | Multi-agent with Vector DB |
| Events | None | Event Store (Kafka/NATS) |
| Queue | Sync only | Worker Queue (BullMQ) |
| Observability | None | Full (Prometheus/Grafana) |
| Storage | None | S3/MinIO |

---

## Part 1: Core Hierarchy Evolution

### Current → Target

```
CURRENT (Company → Apps)          TARGET (Tenant → Projects)
─────────────────────              ────────────────────────────

Tenant (Amazon)                   Tenant (Amazon)
  ├── Website                       ├── Projects
  ├── Android App                       │   ├── Amazon Website
  ├── iOS App                          │   ├── Amazon Android
  └── Admin Portal                     │   ├── Amazon iOS
                                       │   ├── Seller Central
                                       │   ├── Admin Portal
                                       │   └── Prime
  Issues:                            │
  - No customer 360               Each Project has:
  - No shared context             - Own KB
  - No per-app config             - Own AI config
  - No cross-app history          - Own SLA
                                     - Own Channels
                                     - Own Teams
                                     - Own Automation
                                     - Own Analytics
                                       │
                                       └── Shared: Customer Profile
```

---

## Part 2: Missing Services to Create

### 2.1 API Gateway Service
**Port:** 4001  
**Location:** `/services/api-gateway/`

```
┌─────────────────────────────────────────────────────────────┐
│                        API GATEWAY                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client Request                                             │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. TLS Termination                                   │   │
│  │ 2. Authentication (JWT Validation)                   │   │
│  │ 3. Rate Limiting (Redis)                             │   │
│  │ 4. Tenant Validation                                 │   │
│  │ 5. Logging (structured)                              │   │
│  │ 6. Request Validation                                │   │
│  │ 7. Route to Service                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Services (via internal network)                      │   │
│  │ • Support Inbox    → Port 4870                       │   │
│  │ • Ticket Service   → Port 4872                       │   │
│  │ • Knowledge Base   → Port 4871                       │   │
│  │ • Customer Context → Port 4879                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- JWT validation with CorpID
- Rate limiting per tenant/user
- Tenant isolation
- Request/response logging
- Circuit breakers
- CORS handling

### 2.2 Customer Context Service
**Port:** 4879  
**Location:** `/companies/hojai-ai/hojai-customer-context/`

```
┌─────────────────────────────────────────────────────────────┐
│                   CUSTOMER CONTEXT SERVICE                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GET /api/customer-context/:customerId                      │
│                                                             │
│  Returns:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {                                                      │   │
│  │   "customer": {                                       │   │
│  │     "id": "...",                                      │   │
│  │     "name": "John Doe",                               │   │
│  │     "email": "...",                                   │   │
│  │     "tier": "Premium",                                │   │
│  │     "lifetimeValue": 2500,                            │   │
│  │     "riskScore": 12,                                  │   │
│  │     "trustLevel": "high"                              │   │
│  │   },                                                  │   │
│  │   "orders": [...],                                    │   │
│  │   "tickets": [...],                                   │   │
│  │   "subscriptions": [...],                             │   │
│  │   "payments": [...],                                  │   │
│  │   "activity": [...],                                  │   │
│  │   "timeline": [...],                                  │   │
│  │   "aiBrief": {                                        │   │
│  │     "summary": "VIP customer, 3 purchases...",        │   │
│  │     "sentiment": "frustrated",                        │   │
│  │     "escalationRisk": "low",                          │   │
│  │     "recommendedActions": [...]                       │   │
│  │   }                                                   │   │
│  │ }                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Connectors:                                                │
│  • Order Service (via REST)                                 │
│  • Payment Service (via REST)                               │
│  • CRM (via Connector)                                      │
│  • Ticket Service (internal)                                │
│  • Knowledge Base (internal)                                │
│  • Analytics Service (internal)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Notification Service
**Port:** 4880  
**Location:** `/companies/hojai-ai/hojai-notification-service/`

```
┌─────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SERVICE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Channels:                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Email   │ │   SMS    │ │   Push   │ │ WhatsApp │       │
│  │ (Resend) │ │ (Twilio) │ │ (FCM)    │ │          │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Webhook  │ │  Slack   │ │  Telegram│                    │
│  └──────────┘ └──────────��� └──────────┘                    │
│                                                             │
│  Templates:                                                 │
│  • ticket_created      → Customer + Agent                   │
│  │   "Your ticket #{number} has been created"              │
│  │                                                         │
│  • ticket_assigned     → Agent                              │
│  │   "Ticket #{number} has been assigned to you"           │
│  │                                                         │
│  • sla_warning         → Agent + Team Lead                  │
│  │   "Ticket #{number} SLA breach in {time}"               │
│  │                                                         │
│  • ticket_resolved     → Customer                           │
│  │   "Your ticket has been resolved"                       │
│  │                                                         │
│  • csat_survey         → Customer                           │
│  │   "How was your experience?"                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 AI Intelligence Layer (Hojai Orchestrator)
**Port:** 4881  
**Location:** `/companies/hojai-ai/hojai-intelligence/`

```
┌─────────────────────────────────────────────────────────────┐
│                  HOJAI INTELLIGENCE LAYER                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ┌─────────────────────────────────┐           │
│              │     CONVERSATION INPUT          │           │
│              │   "Where is my order #28472?"   │           │
│              └─────────────────┬───────────────┘           │
│                                │                            │
│                                ▼                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ORCHESTRATOR AGENT                      │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │  │ Intent  │→│Sentiment│→│ Fraud   │→│Summary  │  │   │
│  │  │ Agent   │ │ Agent   │ │ Agent   │ │ Agent   │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │   │
│  │       │          │          │          │          │   │
│  │       └──────────┴──────────┴──────────┘          │   │
│  │                      │                             │   │
│  │                      ▼                             │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │  │  KB     │→│ Order   │→│Predict  │→│Recommend│  │   │
│  │  │Retrieval│ │Context  │ │ Engine  │ │ Engine  │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                │                            │
│                                ▼                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 SUPPORT BRIEF                        │   │
│  │  {                                                     │   │
│  │    "intent": "order_status",                         │   │
│  │    "sentiment": "concerned",                         │   │
│  │    "riskLevel": "low",                               │   │
│  │    "context": { "orderId": "28472", "status": "..." },│   │
│  │    "knowledge": ["Shipping FAQ", "Delivery Times"],  │   │
│  │    "predictions": {                                  │   │
│  │      "csatProbability": 0.89,                       │   │
│  │      "escalationRisk": 0.12                         │   │
│  │    },                                                │   │
│  │    "suggestedResponse": "Your order #28472 is...",  │   │
│  │    "actions": [                                      │   │
│  │      { "type": "track_shipment", "confidence": 0.94 }│   │
│  │    ]                                                 │   │
│  │  }                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Vector DB: Pinecone / Weaviate / Qdrant                    │
│  LLM: OpenAI GPT-4 / Claude / Gemini                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 Worker Queue Service
**Port:** 4882  
**Location:** `/companies/hojai-ai/hojai-worker-queue/`

```
┌─────────────────────────────────────────────────────────────┐
│                      WORKER QUEUE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BullMQ + Redis                                             │
│                                                             │
│  Queues:                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ email            │  High    │ Email sending         │   │
│  │ sms              │  High    │ SMS sending           │   │
│  │ webhook          │  Medium  │ Outbound webhooks     │   │
│  │ ai-summary       │  Low     │ LLM summarization     │   │
│  │ ai-embed         │  Low     │ Vector embeddings     │   │
│  │ pdf-generate     │  Medium  │ Invoice/receipt PDF   │   │
│  │ analytics        │  Low     │ Metrics aggregation   │   │
│  │ notification     │  High    │ Multi-channel notify  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Features:                                                  │
│  • Retry with exponential backoff                          │
│  • Dead letter queue                                       │
│  • Priority queues                                         │
│  • Rate limiting                                           │
│  • Progress tracking                                       │
│  • Job scheduling (cron)                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.6 Search Service
**Port:** 4883  
**Location:** `/companies/hojai-ai/hojai-search-service/`

```
┌─────────────────────────────────────────────────────────────┐
│                      SEARCH SERVICE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Elasticsearch / Meilisearch                                │
│                                                             │
│  Indices:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ articles      │ KB articles, FAQs                   │   │
│  │ tickets       │ Ticket subjects, descriptions       │   │
│  │ conversations │ Chat messages                       │   │
│  │ customers     │ Customer names, emails, notes       │   │
│  │ products      │ Product catalog (e-commerce)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Search Types:                                              │
│  • Full-text search                                        │
│  • Fuzzy search (typo tolerance)                           │
│  • Faceted search (filters)                                │
│  • Autocomplete                                            │
│  • Semantic search (vectors)                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Data Architecture

### 3.1 Per-Service Databases

```
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE PER SERVICE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Ticket DB      │    │  Conversation   │                │
│  │  (MongoDB)      │    │  DB (MongoDB)   │                │
│  │                 │    │                 │                │
│  │  • tickets      │    │  • conversations│                │
│  │  • history      │    │  • messages     │                │
│  │  • comments     │    │  • attachments  │                │
│  │  • attachments  │    │                 │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Knowledge DB   │    │  Analytics DB   │                │
│  │  (MongoDB)      │    │  (TimescaleDB)  │                │
│  │                 │    │                 │                │
│  │  • articles     │    │  • events       │                │
│  │  • categories   │    │  • metrics      │                │
│  │  • faqs         │    │  • aggregations │                │
│  │  • versions     │    │                 │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Agent DB       │    │  Cache (Redis)  │                │
│  │  (MongoDB)      │    │                 │                │
│  │                 │    │  • sessions     │                │
│  │  • agents       │    │  • rate limits  │                │
│  │  • teams        │    │  • KB cache     │                │
│  │  • schedules    │    │  • presence     │                │
│  │                 │    │  • conversations│                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           STORAGE (S3 / MinIO)                       │   │
│  │  • attachments    • voice recordings                 │   │
│  │  • images         • documents                        │   │
│  │  • exports        • backups                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           VECTOR DB (Pinecone / Weaviate)            │   │
│  │  • KB embeddings    • Semantic search                │   │
│  │  • Conversation     • RAG retrieval                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 4: Event-Driven Architecture

### 4.1 Event Bus Integration

```
┌─────────────────────────────────────────────────────────────┐
│                      EVENT BUS (NATS)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Publishers                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Ticket  │ │ Inbox   │ │  AI     │ │ CRM     │          │
│  │ Service │ │ Service │ │ Service │ │ Connector│          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│       │           │           │           │                │
│       └───────────┴───────────┴───────────┘                │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   EVENT TOPICS                       │   │
│  │                                                      │   │
│  │  support.ticket.created                              │   │
│  │  support.ticket.assigned                             │   │
│  │  support.ticket.resolved                             │   │
│  │  support.ticket.closed                               │   │
│  │  support.conversation.started                        │   │
│  │  support.conversation.message                        │   │
│  │  support.conversation.closed                         │   │
│  │  support.sla.warning                                 │   │
│  │  support.sla.breached                                │   │
│  │  support.agent.joined                                │   │
│  │  support.agent.left                                 │   │
│  │  support.customer.rated                              │   │
│  │  support.kb.article_viewed                           │   │
│  │  support.kb.article_rated                            │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  Subscribers                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Analytics│ │  SLA    │ │Notifica-│ │  AI     │          │
│  │ Service │ │ Service │ │tion Svc │ │ Service │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Event Schemas

```typescript
// Ticket Created Event
interface TicketCreatedEvent {
  eventType: 'ticket.created';
  timestamp: string;
  tenantId: string;
  projectId: string;
  data: {
    ticketId: string;
    ticketNumber: string;
    customerId: string;
    subject: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    channel: string;
  };
}

// SLA Warning Event
interface SLAWarningEvent {
  eventType: 'sla.warning';
  timestamp: string;
  tenantId: string;
  data: {
    ticketId: string;
    ticketNumber: string;
    slaType: 'first_response' | 'resolution';
    minutesRemaining: number;
    agentId?: string;
    teamId?: string;
  };
}

// Customer Rated Event
interface CustomerRatedEvent {
  eventType: 'customer.rated';
  timestamp: string;
  tenantId: string;
  data: {
    ticketId: string;
    customerId: string;
    rating: number;
    feedback?: string;
  };
}
```

---

## Part 5: Security Architecture

### 5.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client                                                     │
│    │                                                        │
│    │ 1. POST /auth/login                                    │
│    │    { email, password }                                 │
│    ▼                                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  API GATEWAY                         │   │
│  │  - Validates request                                  │   │
│  │  - Routes to Auth Service                            │   │
│  └─────────────────────────────────────────────────────┘   │
│    │                                                        │
│    │ 2. Verify credentials                                 │
│    ▼                                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              CORPID SERVICE (4702)                    │   │
│  │  - User lookup                                        │   │
│  │  - Password verification                              │   │
│  │  - MFA check                                          │   │
│  │  - Generate JWT                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│    │                                                        │
│    │ 3. Return tokens                                      │
│    ▼                                                        │
│  Client                                                     │
│    │                                                        │
│    │ 4. Store access token (memory)                        │
│    │    Store refresh token (httpOnly cookie)              │
│    │                                                        │
│    │ Subsequent requests:                                  │
│    │  Authorization: Bearer <token>                        │
│    │                                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  API GATEWAY                         │   │
│  │  - Validate JWT signature                            │   │
│  │  - Check token expiration                            │   │
│  │  - Extract tenant/user context                       │   │
│  │  - Inject into request headers                       │   │
│  └──────────────────────��──────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 RBAC (Role-Based Access Control)

```typescript
// Roles
const Roles = {
  CUSTOMER: 'customer',
  AGENT: 'agent',
  TEAM_LEAD: 'team_lead',
  MANAGER: 'manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

// Permissions
const Permissions = {
  // Tickets
  'ticket:create': [Roles.CUSTOMER, Roles.AGENT, Roles.ADMIN],
  'ticket:read:own': [Roles.CUSTOMER, Roles.AGENT],
  'ticket:read:team': [Roles.AGENT, Roles.TEAM_LEAD, Roles.MANAGER],
  'ticket:read:all': [Roles.TEAM_LEAD, Roles.MANAGER, Roles.ADMIN],
  'ticket:assign': [Roles.TEAM_LEAD, Roles.MANAGER, Roles.ADMIN],
  'ticket:resolve': [Roles.AGENT, Roles.TEAM_LEAD, Roles.MANAGER, Roles.ADMIN],
  
  // Conversations
  'conversation:read:assigned': [Roles.AGENT],
  'conversation:read:team': [Roles.TEAM_LEAD, Roles.MANAGER],
  'conversation:transfer': [Roles.AGENT, Roles.TEAM_LEAD],
  
  // Knowledge Base
  'kb:article:read': [Roles.CUSTOMER, Roles.AGENT, Roles.ADMIN],
  'kb:article:create': [Roles.TEAM_LEAD, Roles.ADMIN],
  'kb:article:publish': [Roles.ADMIN],
  
  // Analytics
  'analytics:view:own': [Roles.AGENT],
  'analytics:view:team': [Roles.TEAM_LEAD],
  'analytics:view:all': [Roles.MANAGER, Roles.ADMIN],
  'analytics:export': [Roles.ADMIN],
  
  // Admin
  'admin:agents': [Roles.ADMIN],
  'admin:teams': [Roles.ADMIN],
  'admin:sla': [Roles.ADMIN],
  'admin:settings': [Roles.SUPER_ADMIN]
};
```

---

## Part 6: Observability

### 6.1 Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Metrics (Prometheus)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ support_tickets_total{status, priority, tenant}     │   │
│  │ support_conversations_active{tenant, team}          │   │
│  │ support_sla_breaches_total{tenant, sla_type}        │   │
│  │ support_response_time_seconds{tenant, agent}        │   │
│  │ support_csat_score{tenant}                          │   │
│  │ http_requests_total{method, path, status}           │   │
│  │ http_request_duration_seconds{method, path}         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Tracing (Jaeger)                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Trace: Create Ticket                                 │   │
│  │   └─ API Gateway: 5ms                                │   │
│  │      └─ Ticket Service: 45ms                         │   │
│  │         └─ MongoDB: 12ms                             │   │
│  │         └─ Event Bus: 8ms                            │   │
│  │            └─ SLA Service: 15ms                      │   │
│  │            └─ Analytics: 10ms                        │   │
│  │            └─ Notification: 20ms                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Logging (Loki / ELK)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {                                                   │   │
│  │   "timestamp": "2026-06-16T...",                    │   │
│  │   "level": "error",                                 │   │
│  │   "service": "ticket-service",                      │   │
│  │   "tenantId": "amazon",                             │   │
│  │   "traceId": "abc123",                              │   │
│  │   "message": "Failed to create ticket",             │   │
│  │   "error": "ValidationError"                        │   │
│  │ }                                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Dashboards (Grafana)                                       │
│  • Support Overview (tickets, CSAT, SLA)                   │
│  • Agent Performance                                        │
│  • Queue Health                                             │
│  • Error Rates                                              │
│  • Latency P99                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 7: Implementation Order

### Phase 1: Foundation (Week 1-2)
- [ ] API Gateway (Port 4001)
- [ ] Event Bus setup (NATS)
- [ ] Redis for caching
- [ ] Per-service MongoDB setup
- [ ] Basic authentication flow

### Phase 2: Core Services (Week 3-4)
- [ ] Customer Context Service (Port 4879)
- [ ] Notification Service (Port 4880)
- [ ] Worker Queue (Port 4882)
- [ ] Connect existing services to event bus

### Phase 3: Intelligence (Week 5-6)
- [ ] Hojai Intelligence Layer (Port 4881)
- [ ] Vector DB setup (Weaviate)
- [ ] AI Retrieval pipeline
- [ ] Multi-agent orchestrator

### Phase 4: Polish (Week 7-8)
- [ ] Search Service (Port 4883)
- [ ] Observability stack
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation

---

## Part 8: Updated File Structure

```
companies/hojai-ai/
├── hojai-unified-inbox/          # ✅ Existing
├── hojai-knowledge-base/         # ✅ Created
├── hojai-ticket-service/         # ✅ Created
├── hojai-sla-service/            # ✅ Created
├── hojai-support-analytics/      # ✅ Created
│
├── hojai-intelligence/           # 🆕 AI Layer
│   ├── src/
│   │   ├── agents/
│   │   │   ├── intent.ts
│   │   │   ├── sentiment.ts
│   │   │   ├── fraud.ts
│   │   │   ├── summary.ts
│   │   │   ├── retrieval.ts
│   │   │   └── recommendations.ts
│   │   ├── orchestrator.ts
│   │   └── index.ts
│   └── package.json
│
├── hojai-customer-context/       # 🆕 Customer 360
│   ├── src/
│   │   ├── connectors/
│   │   │   ├── order.ts
│   │   │   ├── payment.ts
│   │   │   └── crm.ts
│   │   ├── context.ts
│   │   └── index.ts
│   └── package.json
│
├── hojai-notification-service/   # 🆕 Notifications
├── hojai-worker-queue/           # 🆕 BullMQ
├── hojai-search-service/         # 🆕 Elasticsearch
│
services/
├── api-gateway/                  # 🆕 API Gateway
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── tenant.ts
│   │   │   └── logging.ts
│   │   ├── routes/
│   │   └── index.ts
│   └── package.json
│
└── pilot-onboarding/             # ✅ Existing
```

---

## Summary: What We're Building

| Component | Purpose | Priority |
|-----------|---------|----------|
| API Gateway | Single entry point, auth, rate limiting | 🔴 Critical |
| Event Bus | Decouple services, event-driven | 🔴 Critical |
| Customer Context | 360° customer view for agents | 🔴 Critical |
| Notification Service | Multi-channel notifications | 🟠 High |
| Worker Queue | Async jobs (email, AI, PDF) | 🟠 High |
| AI Intelligence | Multi-agent orchestration | 🟠 High |
| Vector DB | Semantic search, RAG | 🟠 High |
| Search Service | Unified search across entities | 🟡 Medium |
| Observability | Metrics, tracing, logging | 🟡 Medium |

---

**Next Step:** Start with Phase 1 - API Gateway and Event Bus integration.

Want me to start implementing?