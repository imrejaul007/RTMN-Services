# Phase 5: Routing & Governance

**Phase:** 5/8
**Status:** 📋 Planned
**Target Completion:** After Phase 4 (Trust Bootstrap)
**Dependencies:** Phase 1 (Event Bus), Phase 2 (AI Executives)

---

## Overview

Phase 5 establishes the **routing infrastructure** and **governance framework** for Global Nexha. This includes:
- ACP Router for intelligent message routing
- RFC Service for protocol evolution
- Certification Authority for capability certification
- Governance Council for policy decisions

---

## 1. ACP Router Service

**Purpose:** Intelligent routing of ACP protocol messages between agents across Nexhas.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ACP ROUTER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Incoming ACP Messages                                                  │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────┐                                                     │
│  │  Message     │ ──► Parse & Validate                                 │
│  │  Receiver    │                                                     │
│  └──────────────┘                                                     │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────┐                                                     │
│  │  Capability   │ ──► Route based on capability                        │
│  │  Resolver    │     - Find best matching Nexha                       │
│  │              │     - Consider reputation scores                     │
│  │              │     - Check capacity & availability                  │
│  └──────────────┘                                                     │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────┐                                                     │
│  │  Route       │ ──► Forward to target                                │
│  │  Executor    │     - Ensure delivery                                │
│  │              │     - Handle retries                                 │
│  │              │     - Track SLA                                       │
│  └──────────────┘                                                     │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────┐                                                     │
│  │  Response    │ ──► Route response back                             │
│  │  Handler     │     - Correlation tracking                           │
│  └──────────────┘                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Service: nexha-acp-router

**Port:** 4306
**Type:** Routing Service
**Technology:** Node.js + Express + Redis

```yaml
Service: nexha-acp-router
Port: 4306
Database: Redis (routing cache) + MongoDB (routing logs)
Topics:
  - acp.message.routed
  - acp.message.delivered
  - acp.route.failed
  - acp.capability.resolved
Dependencies:
  - nexha-capability-os
  - nexha-discovery-os
  - nexha-reputation-os
```

### API Endpoints

```yaml
POST   /api/route/message              # Route an ACP message
POST   /api/route/batch                # Route batch messages
GET    /api/route/status/:messageId  # Get routing status
GET    /api/route/history             # Get routing history
POST   /api/route/cancel/:messageId  # Cancel pending route
GET    /api/route/capabilities       # Get capability routing table
```

### Routing Algorithms

```javascript
// Capability-Based Routing
async function routeByCapability(message) {
  const targetCapability = message.capability || detectCapability(message);
  
  // 1. Get all Nexhas with this capability
  const capableNexhas = await capabilityStore.find({
    capability: targetCapability,
    status: 'ACTIVE'
  });
  
  // 2. Score each by reputation & capacity
  const scored = await Promise.all(capableNexhas.map(async (nexha) => {
    const reputation = await reputationOS.getScore(nexha.nexhaId);
    const capacity = await capacityOS.getAvailable(nexha.nexhaId);
    const latency = await pingService.measure(nexha.endpoint);
    
    return {
      nexhaId: nexha.nexhaId,
      score: calculateRouteScore(reputation, capacity, latency),
      endpoint: nexha.endpoint
    };
  }));
  
  // 3. Sort by score and select best
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

function calculateRouteScore(reputation, capacity, latency) {
  return (
    (reputation * 0.5) +      // 50% weight to reputation
    (capacity * 0.3) +        // 30% weight to capacity
    ((100 - latency) * 0.2)   // 20% weight to latency
  );
}
```

---

## 2. RFC Service

**Purpose:** Manage Request for Comments (RFC) process for protocol evolution.

### RFC Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RFC LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Draft ──► Review ──► Voting ──► Accepted ──► Implemented ──► Live    │
│    │         │          │           │             │                     │
│    └─────────┴───────────┴───────────┴─────────────┘                     │
│                         (Can be Rejected at any stage)                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### RFC Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Protocol** | ACP protocol changes | New message types, field additions |
| **Capability** | Capability schema changes | New capability definitions |
| **Governance** | Policy & rules changes | Voting thresholds, fees |
| **Security** | Security requirements | Encryption, authentication |
| **Integration** | External system integration | New API standards |

### Service: nexha-rfc-service

**Port:** 4307
**Type:** Governance Service
**Technology:** Node.js + Express + MongoDB

```yaml
Service: nexha-rfc-service
Port: 4307
Database: MongoDB (rfc_db)
Topics:
  - rfc.created
  - rfc.updated
  - rfc.voting_started
  - rfc.accepted
  - rfc.rejected
Dependencies:
  - nexha-federation-os
  - nexha-identity-os
```

### API Endpoints

```yaml
POST   /api/rfc                    # Create new RFC
GET    /api/rfc                    # List all RFCs
GET    /api/rfc/:id                # Get RFC details
PATCH  /api/rfc/:id                # Update RFC
POST   /api/rfc/:id/submit        # Submit for review
POST   /api/rfc/:id/vote          # Cast vote
GET    /api/rfc/:id/votes         # Get vote tally
POST   /api/rfc/:id/implement     # Mark as implemented
GET    /api/rfc/active            # Get active RFCs
GET    /api/rfc/by-category/:cat  # Get RFCs by category
```

### RFC Document Structure

```json
{
  "id": "RFC-0042",
  "title": "Multi-Currency Wallet Support",
  "category": "Protocol",
  "status": "voting",
  "author": {
    "nexhaId": "nexha_finance_001",
    "name": "HOJAI Finance",
    "reputation": 85
  },
  "summary": "Add support for multi-currency wallets in the ACP protocol",
  "motivation": "Global trade requires multi-currency support...",
  "specification": {
    "changes": [
      "Add 'currency' field to wallet messages",
      "Add currency conversion rates endpoint",
      "Add multi-currency balance query"
    ],
    "compatibility": "Backward compatible",
    "deprecation": "Old single-currency format deprecated after 6 months"
  },
  "impact": {
    "breaking": false,
    "affected_services": ["nexha-wallet-os", "nexha-escrow-os"],
    "migration_path": "Graceful degradation with warning"
  },
  "timeline": {
    "created": "2026-06-15",
    "review_deadline": "2026-06-22",
    "voting_deadline": "2026-06-29",
    "target_implementation": "2026-07-15"
  },
  "votes": {
    "yes": 12,
    "no": 2,
    "abstain": 5,
    "voters": [
      {"nexhaId": "nexha_a", "vote": "yes"},
      {"nexhaId": "nexha_b", "vote": "no", "reason": "Too complex"}
    ]
  },
  "comments": [
    {
      "nexhaId": "nexha_c",
      "timestamp": "2026-06-18",
      "comment": "Good proposal but needs currency rate API..."
    }
  ]
}
```

---

## 3. Certification Authority

**Purpose:** Certify Nexha capabilities through standardized testing.

### Certification Tiers

| Tier | Name | Requirements | Badge |
|------|------|--------------|-------|
| **Tier 1** | Basic | Identity + Verification | 🟢 Basic |
| **Tier 2** | Verified | Tier 1 + Economic Enabled | 🔵 Verified |
| **Tier 3** | Certified | Tier 2 + Quality Tested | 🟡 Certified |
| **Tier 4** | Premium | Tier 3 + High Volume | 🟠 Premium |
| **Tier 5** | Elite | Tier 4 + Excellence | 🔴 Elite |

### Certification Tests

```yaml
Capability Certification Tests:
  - functional_test: "Does the service deliver as advertised?"
  - performance_test: "Does it meet SLA requirements?"
  - security_test: "Is it secure against known threats?"
  - compliance_test: "Does it meet regulatory requirements?"
  - interoperability_test: "Does it work with other certified services?"
```

### Service: nexha-certification-authority

**Port:** 4308
**Type:** Certification Service
**Technology:** Node.js + Express + MongoDB

```yaml
Service: nexha-certification-authority
Port: 4308
Database: MongoDB (certification_db)
Topics:
  - certification.requested
  - certification.testing
  - certification.passed
  - certification.failed
  - certification.expired
Dependencies:
  - nexha-capability-os
  - nexha-quality-os
  - nexha-security-os
```

### API Endpoints

```yaml
POST   /api/certification/request       # Request certification
GET    /api/certification/:nexhaId     # Get certification status
GET    /api/certification/:nexhaId/:capability  # Get specific capability cert
POST   /api/certification/:id/test     # Run certification test
GET    /api/certification/:id/results  # Get test results
POST   /api/certification/:id/renew    # Renew certification
GET    /api/certification/badges       # Get all valid badges
GET    /api/certification/verify/:badge  # Verify badge authenticity
```

---

## 4. Governance Council

**Purpose:** Democratic governance of Global Nexha through elected representatives.

### Council Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       GOVERNANCE COUNCIL                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      COUNCIL CHAMBER                              │  │
│  │                                                                  │  │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │  │
│  │   │Council  │  │Council  │  │Council  │  │Council  │            │  │
│  │   │Member 1 │  │Member 2 │  │Member 3 │  │Member N │            │  │
│  │   │(Trade)  │  │(Finance)│  │(Tech)   │  │(Legal)  │            │  │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘            │  │
│  │                                                                  │  │
│  │   Elected by: Representative Voting                              │  │
│  │   Term: 1 year                                                  │  │
│  │   Quorum: 60%                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      MEMBER ASSEMBLY                              │  │
│  │                                                                  │  │
│  │   All Active Nexhas (1 vote per Nexha)                          │  │
│  │   - Vote on major policy changes                                 │  │
│  │   - Elect Council Members                                        │  │
│  │   - Approve RFCs with major impact                                │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Voting Rights

| Action | Council | Assembly | Threshold |
|--------|---------|---------|----------|
| Policy Change (minor) | ✓ | - | 60% council |
| Policy Change (major) | ✓ | ✓ | 70% council + 60% assembly |
| Fee Change | ✓ | ✓ | 75% council + 70% assembly |
| New Feature RFC | ✓ | - | 60% council |
| Breaking Change RFC | ✓ | ✓ | 80% council + 70% assembly |
| Council Election | - | ✓ | 50% + 1 assembly |
| Emergency Action | ✓ | - | 80% council |

### Service: nexha-governance-council

**Port:** 4309
**Type:** Governance Service
**Technology:** Node.js + Express + MongoDB

```yaml
Service: nexha-governance-council
Port: 4309
Database: MongoDB (governance_db)
Topics:
  - governance.election.started
  - governance.election.ended
  - governance.proposal.created
  - governance.proposal.voted
  - governance.policy.approved
Dependencies:
  - nexha-identity-os
  - nexha-federation-os
  - nexha-rfc-service
```

### API Endpoints

```yaml
# Elections
POST   /api/governance/elections           # Create election
GET    /api/governance/elections           # List elections
GET    /api/governance/elections/:id       # Get election details
POST   /api/governance/elections/:id/vote  # Cast vote
GET    /api/governance/council             # Get current council

# Proposals
POST   /api/governance/proposals           # Create proposal
GET    /api/governance/proposals           # List proposals
GET    /api/governance/proposals/:id       # Get proposal details
POST   /api/governance/proposals/:id/vote  # Vote on proposal
GET    /api/governance/proposals/:id/results  # Get voting results

# Policies
GET    /api/governance/policies            # List policies
GET    /api/governance/policies/:id        # Get policy details
GET    /api/governance/history             # Get governance history
```

---

## 5. Security Framework

### Service: nexha-security-os

**Port:** 4310
**Type:** Security Service
**Technology:** Node.js + Express

```yaml
Service: nexha-security-os
Port: 4310
Database: MongoDB (security_db) + Redis (token cache)
Topics:
  - security.threat.detected
  - security.breach.attempted
  - security.compliance.passed
Dependencies:
  - nexha-identity-os
  - nexha-audit-os
```

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Layer 1: Transport Security                                             │
│  - TLS 1.3 for all communications                                       │
│  - Certificate pinning                                                   │
│  - Perfect forward secrecy                                              │
│                                                                         │
│  Layer 2: Authentication                                                │
│  - JWT tokens with RS256                                                │
│  - API key authentication                                                │
│  - OAuth 2.0 for external services                                     │
│                                                                         │
│  Layer 3: Authorization                                                  │
│  - RBAC (Role-Based Access Control)                                     │
│  - ABAC (Attribute-Based Access Control)                                │
│  - Capability-based permissions                                          │
│                                                                         │
│  Layer 4: Audit                                                         │
│  - Immutable audit logs                                                  │
│  - Real-time threat detection                                           │
│  - Compliance reporting                                                  │
│                                                                         │
│  Layer 5: Threat Response                                                │
│  - Automated threat response                                             │
│  - Emergency shutdown                                                   │
│  - Reputation impact                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Endpoints

```yaml
POST   /api/security/authenticate         # Authenticate
POST   /api/security/authorize           # Check authorization
GET    /api/security/audit/:nexhaId      # Get audit trail
POST   /api/security/scan               # Run security scan
GET    /api/security/threats            # Get active threats
POST   /api/security/incident           # Report incident
GET    /api/security/compliance/:std    # Check compliance
```

---

## 6. Audit Service

### Service: nexha-audit-os

**Port:** 4311
**Type:** Audit Service
**Technology:** Node.js + Express + MongoDB (append-only)

```yaml
Service: nexha-audit-os
Port: 4311
Database: MongoDB (audit_logs) - append-only collection
Topics:
  - audit.event.logged
  - audit.report.generated
Dependencies:
  - nexha-identity-os
```

### Audit Event Structure

```json
{
  "id": "audit_evt_12345",
  "timestamp": "2026-06-20T14:30:00Z",
  "actor": {
    "nexhaId": "nexha_restaurant_001",
    "userId": "user_abc123",
    "role": "ADMIN"
  },
  "action": "capability.publish",
  "resource": {
    "type": "capability",
    "id": "cap_delivery_001",
    "name": "food_delivery"
  },
  "outcome": "success",
  "metadata": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "requestId": "req_xyz789"
  },
  "signature": "sha256:abc123...",
  "previousHash": "sha256:prev456..."
}
```

---

## Implementation Checklist

### ACP Router
- [ ] Create `nexha-acp-router` service
- [ ] Implement capability-based routing
- [ ] Add reputation-aware scoring
- [ ] Implement retry and SLA tracking
- [ ] Add message correlation tracking

### RFC Service
- [ ] Create `nexha-rfc-service`
- [ ] Implement RFC lifecycle management
- [ ] Add voting system
- [ ] Create comment system
- [ ] Add notification integration

### Certification Authority
- [ ] Create `nexha-certification-authority`
- [ ] Implement certification tiers
- [ ] Create test framework
- [ ] Add badge generation
- [ ] Implement renewal system

### Governance Council
- [ ] Create `nexha-governance-council`
- [ ] Implement election system
- [ ] Add proposal workflow
- [ ] Create voting mechanisms
- [ ] Add policy management

### Security
- [ ] Create `nexha-security-os`
- [ ] Implement TLS/SSL
- [ ] Add JWT authentication
- [ ] Implement RBAC/ABAC
- [ ] Add threat detection

### Audit
- [ ] Create `nexha-audit-os`
- [ ] Implement append-only logging
- [ ] Add hash chaining
- [ ] Create audit trail queries
- [ ] Add compliance reporting

---

## Port Assignments

| Service | Port | Purpose |
|---------|------|---------|
| `nexha-acp-router` | 4306 | ACP message routing |
| `nexha-rfc-service` | 4307 | RFC management |
| `nexha-certification-authority` | 4308 | Capability certification |
| `nexha-governance-council` | 4309 | Democratic governance |
| `nexha-security-os` | 4310 | Security framework |
| `nexha-audit-os` | 4311 | Audit logging |

---

## Next Phase

➡️ **Phase 6: Nexha OS Runtime** — Self-hostable Nexha OS with Docker image
