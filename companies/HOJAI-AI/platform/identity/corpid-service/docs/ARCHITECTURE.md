# CorpID Cloud - Architecture v4.0

**Version:** 4.0.0
**Date:** June 18, 2026

---

## System Overview

CorpID Cloud is a unified identity platform that serves as the single source of truth for identity, authentication, and authorization across the RTMN ecosystem. It provides 21 services through a unified gateway.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL CLIENTS                                    │
│   Web Apps  │  Mobile Apps  │  APIs  │  Other Services  │  CLI Tools             │
└────────────────────────────────────────────────────────────────────────┬────────┘
                                                                         │
                                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CORPID CLOUD GATEWAY (Port 4702)                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  Security Middleware Stack:                                               │   │
│  │  • Helmet (Security Headers)                                               │   │
│  │  • CORS (Cross-Origin)                                                    │   │
│  │  • Rate Limiting                                                           │   │
│  │  • Request ID & Logging                                                    │   │
│  │  • Body Parsing                                                            │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┬────────┘
                                                                         │
                                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                      │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         PHASE 1: FOUNDATION                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │   Core   │  │   Org    │  │  RBAC    │  │   API    │  │  Device  │    │   │
│  │  │   Auth   │  │   IDs    │  │  Service │  │Identity  │  │  Trust   │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  │                          ┌──────────┐                                      │   │
│  │                          │  Audit   │                                      │   │
│  │                          │  Trail   │                                      │   │
│  │                          └──────────┘                                      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         PHASE 2: ENTERPRISE                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │Consumer  │  │ Merchant │  │AI Agent  │  │  Trust   │  │ Employee │    │   │
│  │  │Identity  │  │ Identity │  │ Identity │  │  Engine  │  │ Identity │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         PHASE 3: ADVANCED                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │   │
│  │  │Identity  │  │Universal │  │ Identity │  │Identity  │                  │   │
│  │  │  Graph   │  │ Profile  │  │  Memory  │  │Timeline  │                  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                       PHASE 4: COMPLIANCE & PLATFORM                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │   KYC    │  │ Consent  │  │Federation│  │  Twin    │  │Developer │    │   │
│  │  │ Platform │  │ Platform │  │   SSO    │  │ Digital  │  │ Platform │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  │  ┌──────────┐                                                               │   │
│  │  │  Identi- │                                                               │   │
│  │  │  ty Veri-│                                                               │   │
│  │  │  fication│                                                               │   │
│  │  └──────────┘                                                               │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┬────────┘
                                                                         │
                                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │   In-Memory    │  │   (Future)     │  │   (Future)     │  │  (Future)    │  │
│  │     Maps       │  │   MongoDB      │  │    Redis       │  │   Search     │  │
│  │  (Current)     │  │   Cluster      │  │   Cache        │  │  Elastic     │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Architecture

### 1. Core Module
**Purpose:** User identity and authentication

```
core/
├── models/
│   └── user.model.js        # User entity, sessions, password management
└── (Used by gateway for auth routes)
```

**Key Components:**
- User entity with profile, preferences, MFA
- Session management with JWT
- Password history tracking
- Token generation and verification

### 2. Organization Module
**Purpose:** Multi-tenant organization management

```
organization/
├── models/
│   └── organization.model.js  # Orgs, departments, teams, memberships
├── services/
│   └── organization.service.js  # Business logic
└── routes/
    └── organization.routes.js   # API endpoints
```

**Hierarchy:**
```
Organization
├── Departments (nested)
│   ├── Teams
│   │   └── Members
│   └── Head (User)
└── Members
    ├── Role
    └── Manager
```

### 3. RBAC Module
**Purpose:** Role-based and attribute-based access control

```
RBAC/
├── models/
│   └── rbac.model.js  # Roles, permissions, policies, feature flags
└── services/
    └── rbac.service.js
```

**Permission Resolution:**
```
User → Roles → Permissions
                    ↓
              (Wildcard expansion: org:* → org:read, org:write, etc.)
                    ↓
              User-specific overrides
                    ↓
              Final permission set
```

### 4. Trust Engine Module
**Purpose:** Risk assessment and fraud detection

**Trust Score Components:**
```
Overall Score (weighted average):
├── Identity Score (25%)    - Verification, KYC, MFA
├── Behavior Score (25%)    - Activity patterns
├── Device Score (15%)      - Device trust, location
├── Transaction Score (20%) - Financial history
└── History Score (15%)      - Account age, violations
```

### 5. Identity Graph Module
**Purpose:** Network of identity relationships

**Graph Structure:**
```
Nodes (12 types):
- user, organization, department, team
- consumer, merchant, branch
- agent, device, api_key, twin

Edges (relationship types):
- owns, member_of, manages, reports_to
- partner_of, supplies_to, parent_of
- linked_to, created, uses, trusts
```

**Algorithms:**
- BFS for path finding
- Degree calculation for node importance
- Relationship traversal with depth limits

### 6. Consent Module
**Purpose:** GDPR/DPDP compliance

**Consent Categories:**
- Data Processing (analytics, profiling, automated decisions)
- Marketing (email, SMS, push, WhatsApp)
- Cookies (necessary, functional, analytics, advertising)
- AI Usage (personalization, behavior learning, voice)
- Location (precise, approximate, background)
- Biometric (face, fingerprint, voice, iris)

**Data Subject Rights:**
- Right to Access (Article 15)
- Right to Rectification (Article 16)
- Right to Erasure (Article 17)
- Right to Portability (Article 20)

### 7. KYC Module
**Purpose:** Identity verification

**Verification Levels:**
- Level 1: Email + Phone verified
- Level 2: Government ID verified
- Level 3: Full KYC with biometric and liveness

**Document Types:**
- Identity: Aadhaar, Passport, PAN, Driving License, Voter ID, SSN
- Address: Utility Bill, Bank Statement, Rent Agreement
- Business: GST, Registration, Shop Act, CIN
- Financial: Bank Account, Cancelled Cheque

---

## Data Flow

### Authentication Flow
```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Client │────►│Gateway  │────►│Core/Auth │────►│Token Gen │
└────────┘     └────┬────┘     └──────────┘     └──────────┘
                    │
                    │ (Token created)
                    ▼
┌────────┐     ┌─────────┐     ┌──────────┐
│ Client │◄────│Response │     │JWT Token │
└────────┘     └─────────┘     └──────────┘
```

### Authorization Flow
```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Client │────►│Gateway  │────►│Auth MW   │────►│RBAC Check│
└────────┘     └────┬────┘     └──────────┘     └──────────┘
                    │                                    │
                    │ (If allowed)                       │
                    ▼                                    ▼
┌────────┐     ┌─────────┐                        ┌──────────┐
│Service │◄────│Handler  │                        │Permission│
│Response│     └─────────┘                        │Resolver  │
└────────┘                                        └──────────┘
```

### Cross-Service Data Flow
```
User Registration
    ↓
Core (Create user)
    ↓
Organization (Create membership)
    ↓
RBAC (Assign default role)
    ↓
Audit (Log event)
    ↓
Timeline (Record activity)
    ↓
Graph (Create node & relationships)
    ↓
Memory (Initialize memory link)
    ↓
Trust (Calculate initial score)
    ↓
Twin (Create digital twin)
```

---

## Security Architecture

### Defense in Depth

```
Layer 1: Network
├── HTTPS (TLS 1.3)
├── CORS configuration
└── IP whitelisting (per API key)

Layer 2: Gateway
├── Helmet security headers
├── Rate limiting
├── Request size limits
└── Request ID tracking

Layer 3: Authentication
├── JWT tokens (1h access, 7d refresh)
├── bcrypt password hashing (12 rounds)
├── Password strength validation
├── MFA support (TOTP, backup codes)
└── Session management

Layer 4: Authorization
├── Role-based access control (RBAC)
├── Business scope validation
├── Permission-based middleware
└── Resource ownership checks

Layer 5: Data
├── Input validation (express-validator)
├── Prototype pollution prevention
├── Output sanitization
└── Audit logging
```

### Token Architecture

```
Access Token (1 hour):
├── Header: { alg: "HS256", typ: "JWT" }
├── Payload: { sub, email, role, organizationId, permissions, type: "access" }
└── Signature: HMAC-SHA256

Refresh Token (7 days):
├── Stored in database with metadata
├── Single-use (rotation on refresh)
└── Revocable
```

---

## Performance Considerations

### Current Implementation (In-Memory)
- **Latency:** < 1ms for most operations
- **Throughput:** Limited by single Node.js process
- **Scalability:** Horizontal scaling requires shared state
- **Persistence:** Data lost on restart (rebuilt from defaults)

### Production Recommendations

```
For 100K+ users:
├── Database: MongoDB cluster (3+ nodes)
├── Cache: Redis cluster
├── Search: Elasticsearch
├── Queue: RabbitMQ for async tasks
├── CDN: Static assets and webhooks
└── Load Balancer: Multiple gateway instances

For 1M+ users:
├── Database: MongoDB sharded cluster
├── Cache: Redis with clustering
├── Search: Elasticsearch cluster
├── Microservices: Split into independent services
├── Event Sourcing: Kafka for audit trail
└── Graph DB: Neo4j for identity graph
```

---

## Integration Architecture

### RTMN Ecosystem Integration

```
                    ┌──────────────────┐
                    │   CorpID Cloud   │
                    │   (Port 4702)    │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Department   │    │   AI Suite    │    │   Industry    │
│      OS       │    │   (HOJAI)     │    │      OS       │
│               │    │               │    │               │
│ • Sales       │    │ • Agents      │    │ • Restaurant  │
│ • Marketing   │    │ • Memory      │    │ • Hotel       │
│ • Workforce   │    │ • Twin        │    │ • Healthcare  │
│ • Finance     │    │ • Copilot     │    │ • Retail      │
│ • Operations  │    │               │    │ • +22 more    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    RTMN Hub (Port 4399)                       │
│                 Unified API Gateway                          │
└─────────────────────────────────────────────────────────────┘
```

### External Identity Providers

```
CorpID Cloud
    │
    ├── SAML 2.0
    │   ├── Okta
    │   ├── Azure AD
    │   ├── OneLogin
    │   └── Custom IdPs
    │
    ├── OAuth 2.0
    │   ├── Google
    │   ├── Apple
    │   ├── Microsoft
    │   ├── Facebook
    │   ├── GitHub
    │   └── LinkedIn
    │
    └── OIDC
        ├── Any OIDC-compliant provider
        └── Custom OIDC implementations
```

---

## Deployment Architecture

### Development
```
┌─────────────────────────────┐
│   Single Node.js Process    │
│   Port 4702                 │
│   In-memory storage         │
└─────────────────────────────┘
```

### Production (Recommended)
```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Gateway 1   │      │  Gateway 2   │      │  Gateway 3   │
│  Port 4702   │      │  Port 4702   │      │  Port 4702   │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   MongoDB    │      │    Redis     │      │ Elasticsearch│
│   Primary    │      │    Cache     │      │    Search    │
└──────┬───────┘      └──────────────┘      └──────────────┘
       │
       ▼
┌──────────────┐
│   MongoDB    │
│  Secondary 1 │
└──────────────┘
       │
       ▼
┌──────────────┐
│   MongoDB    │
│  Secondary 2 │
└──────────────┘
```

---

## Future Architecture

### Microservices Evolution
```
When scaling requires:

corpID-cloud/
├── corpid-gateway/         # API Gateway (Node.js)
├── corpid-auth/            # Authentication service
├── corpid-users/           # User management
├── corpid-org/             # Organization service
├── corpid-rbac/            # RBAC service
├── corpid-trust/           # Trust engine
├── corpid-kyc/             # KYC service
├── corpid-consent/         # Consent management
├── corpid-federation/      # SSO/Federation
├── corpid-graph/           # Graph service (with Neo4j)
├── corpid-twin/            # Digital twin
├── corpid-memory/          # Memory integration
├── corpid-timeline/        # Timeline service (Kafka)
├── corpid-audit/           # Audit service (Kafka + S3)
└── corpid-notifications/   # Email/SMS/Push
```

### Event-Driven Architecture
```
For high-scale deployments:

Producers:    Auth, RBAC, Org, User services
                ↓
Message Bus:  Kafka / RabbitMQ
                ↓
Consumers:    Audit, Timeline, Memory, Notifications, Webhooks
                ↓
Storage:      MongoDB, Neo4j, S3, Elasticsearch
```

---

## Design Patterns

### 1. Service Module Pattern
Each service follows consistent structure:
```
service-name/
├── src/
│   ├── models/        # Data models
│   ├── services/      # Business logic
│   ├── routes/        # API routes
│   ├── middleware/    # Service-specific middleware
│   └── validators/    # Input validation
└── tests/             # Tests
```

### 2. Middleware Composition
```javascript
app.post('/api/resource',
  requireAuth(),           // Authentication
  requireRole('admin'),    // Authorization
  strictLimiter,           // Rate limiting
  validateInput(schema),   // Validation
  asyncHandler(handler)     // Error handling
);
```

### 3. Audit-First Design
Every mutation triggers audit event:
```javascript
dataAudit('entity.action', req, 'entity_type', entityId, { changes });
```

### 4. Privacy by Design
- Default deny
- Explicit consent required
- Data minimization
- Right to be forgotten

### 5. Defense in Depth
Multiple security layers:
- Network (TLS, CORS)
- Application (Helmet, Rate limiting)
- Authentication (JWT, MFA)
- Authorization (RBAC, Business scope)
- Data (Validation, Sanitization)

---

## Monitoring & Observability

### Logging
- Structured JSON logs (Winston)
- Request IDs for tracing
- Audit logs for compliance
- Error tracking with stack traces

### Metrics (To Implement)
- Request rate per endpoint
- Error rate by status code
- Response time percentiles
- Active sessions
- Token generation/validation rate
- KYC approval rate
- Consent changes
- Risk check outcomes

### Alerting (To Implement)
- Failed login threshold
- Unusual API key activity
- KYC review backlog
- Consent violation detection
- Anomaly detection alerts

---

*CorpID Cloud Architecture v4.0 - June 18, 2026*
