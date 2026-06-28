# CorpID v3.0 — From Identity Service to Identity OS

## Gap Analysis + Solution Architecture + Execution Roadmap

> **Created:** June 28, 2026  
> **Version:** 1.0  
> **Status:** Analysis Complete → Execution Planning  

---

## Executive Summary

**This changes everything.**

CorpID v3.0 is no longer an internal identity service. After comprehensive audit, it's one of the most advanced AI-native identity architectures we've seen from an early-stage company.

The question is no longer *"What should we build?"*

The question is:

> **"What separates a very good identity system from the world's best identity operating system?"**

---

## Part 1: Current State Assessment

### Scorecard

| Area | Current | Best-in-Class |
|------|--------:|------------:|
| Authentication | 9.5/10 | 10 |
| MFA | 9/10 | 10 |
| RBAC | 9/10 | 10 |
| Agent Identity | 9.5/10 | 10 |
| Workload Identity | 9/10 | 10 |
| Delegation | 9.5/10 | 10 |
| Trust System | 9/10 | 10 |
| Federation | 8/10 | 10 |
| Relationship Graph | 8/10 | 10 |
| Memory Integration | 8/10 | 10 |
| Enterprise Readiness | 7/10 | 10 |
| Developer Platform | 5/10 | 10 |

---

## Part 2: Competitive Analysis

### Already Beating

| Competitor | Why We Win |
|------------|------------|
| **Auth0** | Agent identities, workload identities, delegation, trust dimensions, relationship graphs (they have none) |
| **WorkOS** | Agent passports, delegation chains, trust systems, ACP integration (they focus on enterprise onboarding only) |
| **Clerk** | Multi-dimensional trust, relationship graphs, AI-native architecture |
| **Stytch** | Agent/workload identity, delegation, memory integration |
| **Persona** | Behavioral/financial/social/business trust dimensions |

### What's Already Built

| Feature | Status | Details |
|---------|--------|---------|
| Human Identity | ✅ | CI-IND- typed, JWT + bcrypt |
| AI Agent Identity | ✅ | CI-AGT- typed, passports, permissions, budget |
| Workload Identity | ✅ | CI-WRK- typed, credential rotation |
| Delegation Chains | ✅ | Scope narrowing, trust attenuation |
| Multi-Dim Trust | ✅ | 6 dimensions (identity, behavioral, financial, social, business, agent) |
| Relationship Graph | ✅ | Nodes + edges, BFS traversal |
| OIDC/SAML | ✅ | Discovery, token exchange, SSO |
| ACP Bridge | ✅ | Message enrichment, entity lookup |
| MemoryOS Events | ✅ | Non-blocking event emission |
| MFA | ✅ | TOTP + backup codes + breach detection |
| Sessions | ✅ | List + revoke |
| Namespaces | ✅ | Isolated multi-tenant |

---

## Part 3: The 12 Gaps

### Gap Overview

| # | Gap | Priority | Effort | Impact |
|---|-----|----------|--------|--------|
| 1 | Verifiable Credentials + DIDs | P2 | High | Transformative |
| 2 | Universal Entity Model | P1 | Medium | High |
| 3 | Identity Timeline Engine | P0 | Low | High |
| 4 | Graph Database (Neo4j) | P1 | High | High |
| 5 | ABAC (Attribute-Based Access) | P0 | Medium | High |
| 6 | Policy-as-Code | P0 | Medium | Transformative |
| 7 | Zero Trust Runtime | P2 | High | High |
| 8 | Enterprise Lifecycle | P1 | Medium | Medium |
| 9 | Risk Engine | P1 | Medium | High |
| 10 | Developer Platform (SDK/CLI) | P0 | Low | Transformative |
| 11 | Agent Reputation Marketplace | P2 | High | Medium |
| 12 | Cross-Company Federation | P2 | Very High | Transformative |

---

## Part 4: Detailed Gap Analysis & Solutions

---

### Gap 1: Verifiable Credentials + DIDs

#### Current State
```
✅ OIDC (done)
✅ SAML (done)
✅ OAuth (done)
❌ W3C Verifiable Credentials
❌ Decentralized Identifiers (DIDs)
❌ Selective Disclosure
❌ Cryptographic Proofs
```

#### Why It Matters
```
Future Pattern:
Agent A presents credential → verified by Company B
Without trusting a central server
```

#### Solution Architecture

```typescript
// New Services: corp-vc-service + corp-did-service

// W3C Verifiable Credential
interface VerifiableCredential {
  id: string;                    // did:rtmn:corpID:v1#credential-1
  type: string[];               // ["VerifiableCredential", "AgentPassport"]
  issuer: string;               // did:rtmn:corpID
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;                // did:rtmn:agent:sales-bot
    role: string;
    permissions: string[];
    trustScore: number;
  };
  proof: {
    type: string;              // "Ed25519Signature2020"
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    proofValue: string;
  };
}

// Decentralized Identifier
interface DIDDocument {
  id: string;                   // did:rtmn:corpID:agent:sales-bot
  controller: string[];
  verificationMethod: [{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }];
  authentication: string[];
  assertionMethod: string[];
  capabilityDelegation: string[];
  service: [{
    id: string;
    type: string;
    serviceEndpoint: string;
  }];
}
```

#### New Endpoints

```
POST   /api/vc/credentials          Create VC
GET    /api/vc/credentials/:id      Get VC
POST   /api/vc/credentials/:id/present  Present VC
POST   /api/vc/credentials/verify   Verify VC
GET    /api/did/:entityId           Get DID document
POST   /api/did/resolve             Resolve DID
POST   /api/did/register            Register DID
```

#### Effort: 3 months | Priority: P2

---

### Gap 2: Universal Entity Model

#### Current State
```
CI-IND-   Individual/Human ✅
CI-BIZ-   Business ✅
CI-AGT-   AI Agent ✅
CI-WRK-   Workload ✅
CI-REL-   Relationship ✅
```

#### Missing Types
```
CI-DEV-   Device
CI-API-   API/Application
CI-TWN-   Digital Twin
CI-AST-   Asset
CI-ORG-   Organization (more detailed than BIZ)
CI-DEP-   Department
CI-TEAM-  Team
CI-PROD-  Product
CI-CONTRACT- Contract
CI-POLICY-  Policy
CI-CERT-   Certificate
CI-KPI-    KPI/Metric
CI-EVT-    Event
CI-LOC-    Location
```

#### Solution Architecture

```typescript
// Unified Entity Interface
interface UniversalEntity {
  id: string;                    // CI-<TYPE>-<ID>
  type: EntityType;
  
  // Identity
  name: string;
  description?: string;
  metadata: Record<string, any>;
  
  // Ownership
  ownerId?: string;            // CI-IND-xxx
  controllerId?: string;         // CI-IND-xxx
  
  // Trust
  trustScore: number;
  trustLevel: TrustLevel;
  
  // Relationships
  relationships: Relationship[];
  
  // Permissions
  permissions: Permission[];
  
  // Lifecycle
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

// All types share this interface
type EntityType = 
  | 'IND' | 'BIZ' | 'AGT' | 'WRK' | 'DEV'
  | 'API' | 'TWN' | 'AST' | 'ORG' | 'DEP'
  | 'TEAM' | 'PROD' | 'CONTRACT' | 'POLICY'
  | 'CERT' | 'KPI' | 'EVT' | 'LOC' | 'REL';
```

#### New Endpoints

```
GET    /api/entities                List all entities
GET    /api/entities/:id           Get entity
POST   /api/entities                Create entity
PUT    /api/entities/:id            Update entity
DELETE /api/entities/:id           Archive entity
GET    /api/entities/types          List supported types
GET    /api/entities/:id/timeline  Entity timeline
```

#### Effort: 2 months | Priority: P1

---

### Gap 3: Identity Timeline Engine

#### Current State
```
✅ Events emitted to MemoryOS
✅ IdentityEvent model exists
❌ No timeline API
❌ No human-readable history
```

#### Solution Architecture

```typescript
// Identity Timeline
interface TimelineEntry {
  id: string;
  entityId: string;              // CI-IND-xxx
  eventType: TimelineEventType;
  
  // Human-readable
  title: string;               // "Joined Company"
  description: string;
  icon?: string;
  
  // Classification
  category: 'lifecycle' | 'trust' | 'relationship' | 'security' | 'business';
  
  // Impact
  impact: 'positive' | 'negative' | 'neutral';
  
  // Evidence
  evidence: {
    source: string;
    data: Record<string, any>;
  };
  
  // Context
  actor?: string;               // Who triggered
  timestamp: string;
}

// Timeline Types
type TimelineEventType = 
  | 'joined_company'
  | 'promoted'
  | 'role_changed'
  | 'department_transfer'
  | 'agent_created'
  | 'delegation_granted'
  | 'trust_score_changed'
  | 'credential_rotated'
  | 'security_incident';
```

#### Example Timeline
```json
{
  "entityId": "CI-IND-user123",
  "timeline": [
    {
      "title": "Joined Company",
      "description": "Joined as Software Engineer",
      "category": "lifecycle",
      "timestamp": "2019-03-15"
    },
    {
      "title": "Promoted",
      "description": "Promoted to Senior Engineer",
      "category": "lifecycle",
      "timestamp": "2022-06-01"
    },
    {
      "title": "AI Agent Created",
      "description": "Created sales-agent-v1",
      "category": "business",
      "timestamp": "2024-01-15"
    },
    {
      "title": "Trust Score Improved",
      "description": "Score: 65 → 78 (financial trust)",
      "category": "trust",
      "impact": "positive",
      "timestamp": "2026-03-01"
    }
  ]
}
```

#### New Endpoints

```
GET  /api/timeline/:entityId              Get timeline
GET  /api/timeline/:entityId?category=   Filter by category
GET  /api/timeline/:entityId?from=&to=    Date range
POST /api/timeline/:entityId/annotate      Add human annotation
GET  /api/timeline/:entityId/summary      AI-generated summary
```

#### Effort: 2 weeks | Priority: P0

---

### Gap 4: Graph Database (Neo4j)

#### Current State
```
✅ RelNode + RelEdge models
✅ BFS traversal
❌ JSON persistence
❌ No Cypher queries
❌ No graph algorithms
```

#### Why It Matters
Critical for:
- SUTAR delegation chains
- Nexha trust propagation
- Agent ecosystem discovery
- Complex relationship queries

#### Solution Architecture

```typescript
// Neo4j Integration
// Replace JSON files with Neo4j for relationship data

// Node Schema
// (:CorpIDEntity { id: "CI-AGT-xxx", type: "agent", trustScore: 85 })

// Edge Schema
// (a)-[:DELEGATES { scope: ["leads:read"], attenuation: 0.8 }]->(b)

// Example Queries

// "Find all agents that can act on behalf of user X"
MATCH (user:CorpIDEntity {id: "CI-IND-X"})-[:OWNS]->(agent:CorpIDEntity {type: "agent"})
RETURN agent

// "Find trust chain for agent X"
MATCH path = (root)-[:DELEGATES*1..10]->(target:CorpIDEntity {id: "CI-AGT-X"})
RETURN path

// "Find potential conflicts of interest"
MATCH (a)-[:PARTNER_OF]->(b)-[:PARTNER_OF]->(c)
WHERE NOT (a)-[:PARTNER_OF]->(c)
RETURN a, c

// "Agent ecosystem health"
MATCH (org:CorpIDEntity {type: "organization"})
OPTIONAL MATCH (org)-[:HAS_MEMBER]->(user:CorpIDEntity {type: "user"})
OPTIONAL MATCH (user)-[:OWNS]->(agent:CorpIDEntity {type: "agent"})
OPTIONAL MATCH (agent)-[:HAS_DELEGATION]->(sub:CorpIDEntity)
RETURN org.id, count(user), count(agent), count(sub)
```

#### New Endpoints

```
POST /api/graph/query                    Cypher query
GET  /api/graph/entity/:id              Graph view of entity
GET  /api/graph/path/:from/:to          Shortest path
GET  /api/graph/communities             Community detection
POST /api/graph/sync                    Sync from JSON to Neo4j
GET  /api/graph/health                 Neo4j health
```

#### Effort: 3 months | Priority: P1

---

### Gap 5: ABAC (Attribute-Based Access Control)

#### Current State
```
✅ RBAC (roles + permissions)
✅ Scopes
✅ Agent permissions
```

#### Missing
```
❌ Attribute-based conditions
❌ Dynamic policy evaluation
❌ Context-aware access
```

#### Solution Architecture

```typescript
// ABAC Policy
interface ABACPolicy {
  id: string;
  name: string;
  description: string;
  
  // Target
  resource: string;              // "invoice", "agent:*", "api:/users/*"
  actions: string[];             // ["read", "write", "delete"]
  
  // Conditions (ALL must match)
  conditions: {
    // Subject attributes
    subject?: {
      role?: string[];
      trustScore?: { min?: number; max?: number };
      department?: string[];
      tags?: string[];
      ownedEntities?: boolean;
    };
    
    // Resource attributes
    resource?: {
      owner?: string;           // "self" | subject.id | org.id
      businessId?: string;
      status?: string[];
      sensitivity?: string[];
    };
    
    // Environment
    environment?: {
      timeRange?: { start: string; end: string };
      workingHours?: boolean;
      ipWhitelist?: string[];
    };
    
    // Context
    context?: {
      transactionValue?: { max: number };
      approvalRequired?: boolean;
    };
  };
  
  // Effect
  effect: 'allow' | 'deny';
  priority: number;               // Higher = evaluated first
  
  // Audit
  createdBy: string;
  createdAt: string;
}

// Example Policies
const policies: ABACPolicy[] = [
  {
    id: "policy-001",
    resource: "invoice",
    actions: ["approve"],
    conditions: {
      subject: { trustScore: { min: 80 } },
      context: { transactionValue: { max: 10000 } }
    },
    effect: "allow",
    priority: 10
  },
  {
    id: "policy-002",
    resource: "invoice",
    actions: ["approve"],
    conditions: {
      subject: { role: ["manager", "admin"] },
      context: { approvalRequired: false }
    },
    effect: "allow",
    priority: 5
  }
];

// Policy Evaluation
interface EvaluationContext {
  subject: {
    id: string;
    role: string;
    trustScore: number;
    department?: string;
    attributes: Record<string, any>;
  };
  resource: {
    id: string;
    owner?: string;
    businessId?: string;
    attributes: Record<string, any>;
  };
  action: string;
  environment: {
    timestamp: string;
    ip: string;
    userAgent?: string;
  };
}
```

#### New Endpoints

```
POST   /api/policies              Create policy
GET    /api/policies              List policies
GET    /api/policies/:id          Get policy
PUT    /api/policies/:id           Update policy
DELETE /api/policies/:id           Delete policy
POST   /api/policies/evaluate     Evaluate access
POST   /api/policies/import       Import policies
GET    /api/policies/export       Export policies
```

#### Effort: 2 months | Priority: P0

---

### Gap 6: Policy-as-Code

#### Current State
```
✅ Delegation scopes
✅ Trust attenuation
❌ Declarative policy language
❌ OPA-like engine
```

#### Solution Architecture

```yaml
# policy.corpid
package corpid.authorization

# Default deny
default allow = false

# Allow if trust score is high enough
allow if {
    input.action == "approve"
    input.context.transaction_value < 10000
    input.subject.trust_score >= 80
}

# Allow managers to do anything
allow if {
    input.subject.role == "manager"
}

# Allow agents with delegation
allow if {
    count(input.delegations) > 0
    input.delegations[_].scope[_] == input.action
}

# Deny if restricted
deny if {
    input.resource.sensitivity == "confidential"
    input.subject.trust_level == "restricted"
}

# Budget enforcement
allow if {
    input.action == "spend"
    input.context.amount <= input.subject.budget_remaining
}
```

```typescript
// Policy Engine Service: corp-policy-engine

interface PolicyResult {
  allowed: boolean;
  reason: string;
  matchedPolicy?: string;
  conditions?: Record<string, boolean>;
}

// Integration with Delegation Engine
interface DelegationPolicy {
  allow: {
    action: string[];
  }
  when: {
    trust_score?: string;       // ">85"
    budget_remaining?: string;   // ">100"
    human_approval?: boolean;
  }
  then?: {
    notify?: string[];
    log?: boolean;
  }
}
```

#### New Endpoints

```
POST   /api/policy-engine/evaluate   Evaluate policy
POST   /api/policy-engine/compile   Compile Rego/JSON policy
GET    /api/policy-engine/rules    List rules
POST   /api/policy-engine/rules    Add rule
PUT    /api/policy-engine/rules/:id Update rule
DELETE /api/policy-engine/rules/:id Remove rule
GET    /api/policy-engine/simulate Simulate policy
```

#### Effort: 2 months | Priority: P0

---

### Gap 7: Zero Trust Runtime

#### Current State
```
✅ JWT authentication
✅ Rate limiting
✅ Account lockout
```

#### Missing
```
❌ Continuous verification
❌ Behavior anomaly detection
❌ Session trust scoring
❌ Device trust
```

#### Solution Architecture

```typescript
// Zero Trust Components

// 1. Session Trust Score
interface SessionTrust {
  sessionId: string;
  userId: string;
  
  // Continuous signals
  signals: {
    deviceRecognized: boolean;
    ipConsistent: boolean;
    geoVelocity: number;         // km/hour
    timePattern: number;        // deviation from normal
    behavioral: number;         // typing speed, mouse movement
  };
  
  // Current score
  trustScore: number;          // 0-100
  lastVerified: string;
  
  // Actions
  requiresReauth: boolean;
  requiresMfa: boolean;
}

// 2. Risk Signals
interface RiskSignal {
  type: 'location' | 'behavior' | 'device' | 'network' | 'agent';
  score: number;               // 0-100 risk
  evidence: Record<string, any>;
  timestamp: string;
}

// 3. Continuous Verification
interface ContinuousVerification {
  // Every request evaluated
  evaluate(context: RequestContext): VerificationResult;
  
  // Risk-based auth
  adaptiveMfa(required: boolean): boolean;
  
  // Anomaly detection
  detectAnomaly(history: Event[]): Anomaly[];
}

// 4. Device Trust
interface DeviceTrust {
  deviceId: string;
  userId: string;
  
  // Device signals
  deviceFingerprint: string;
  os: string;
  browser: string;
  trusted: boolean;
  
  // Certification
  mdmEnrolled: boolean;
  complianceStatus: 'compliant' | 'outdated' | 'unknown';
  
  // Trust score
  trustScore: number;
}
```

#### New Endpoints

```
POST   /api/zero-trust/evaluate      Evaluate request
GET    /api/zero-trust/session/:id  Get session trust
POST   /api/zero-trust/device       Register device
GET    /api/zero-trust/device/:id    Get device trust
POST   /api/zero-trust/risk         Get risk signals
GET    /api/zero-trust/anomaly      Get anomalies
```

#### Effort: 3 months | Priority: P2

---

### Gap 8: Enterprise Lifecycle Engine

#### Current State
```
✅ active
✅ suspended
✅ revoked
```

#### Missing Lifecycle States
```
❌ invited
❌ onboarding
❌ probation
❌ transferred
❌ offboarding
❌ archived
❌ deleted
```

#### Solution Architecture

```typescript
// Entity Lifecycle States
type LifecycleState = 
  | 'invited'      // Account created, not accepted
  | 'onboarding'   // In onboarding process
  | 'active'       // Fully operational
  | 'probation'    // Trial period
  | 'suspended'    // Temporarily paused
  | 'transferred'  // Moved to another org/dept
  | 'offboarding'  // Leaving organization
  | 'archived'     // Retained, no access
  | 'deleted';     // Removed

// Lifecycle Transition Rules
interface LifecycleTransition {
  from: LifecycleState;
  to: LifecycleState;
  trigger: 'manual' | 'automatic' | 'time';
  conditions?: Condition[];
  actions?: Action[];
  requiredApprovals?: string[];
}

// Example Transitions
const transitions: LifecycleTransition[] = [
  {
    from: 'invited',
    to: 'onboarding',
    trigger: 'automatic',
    conditions: [{ field: 'inviteAccepted', equals: true }]
  },
  {
    from: 'onboarding',
    to: 'active',
    trigger: 'automatic',
    conditions: [{ field: 'onboardingComplete', equals: true }]
  },
  {
    from: 'active',
    to: 'offboarding',
    trigger: 'manual',
    actions: [
      { type: 'revoke_access', target: 'all' },
      { type: 'notify', target: 'manager' },
      { type: 'export_data', target: 'hr' }
    ],
    requiredApprovals: ['manager', 'hr']
  }
];

// Lifecycle Audit
interface LifecycleEvent {
  entityId: string;
  fromState: LifecycleState;
  toState: LifecycleState;
  triggeredBy: string;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, any>;
}
```

#### New Endpoints

```
POST   /api/lifecycle/:entityId/transition   Trigger transition
GET    /api/lifecycle/:entityId/state      Get current state
GET    /api/lifecycle/:entityId/history   Get state history
GET    /api/lifecycle/states             List possible states
GET    /api/lifecycle/transitions       List transition rules
POST   /api/lifecycle/transitions        Add transition rule
```

#### Effort: 2 months | Priority: P1

---

### Gap 9: Risk Engine

#### Current State
```
✅ Trust Score
❌ Risk Scoring
❌ Risk Categories
❌ Risk Mitigation
```

#### Solution Architecture

```typescript
// Trust vs Risk
// Trust: "Who are you?"
// Risk: "Should I trust this action?"

// Risk Categories
interface RiskAssessment {
  entityId: string;
  timestamp: string;
  
  categories: {
    location: {
      score: number;           // 0-100 risk
      signals: string[];
      anomalies: string[];
    };
    
    behavior: {
      score: number;
      patterns: string[];
      deviations: string[];
    };
    
    agent: {
      score: number;
      driftDetected: boolean;
      hallucinationRate?: number;
      failureRate?: number;
    };
    
    financial: {
      score: number;
      unusualTransactions: number;
      velocityAlerts: string[];
    };
    
    network: {
      score: number;
      torExit: boolean;
      vpnDetected: boolean;
      proxyDetected: boolean;
    };
    
    credential: {
      score: number;
      compromised: boolean;
      weakPassword: boolean;
      reusedPassword: boolean;
    };
  };
  
  overallRisk: number;         // Weighted average
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  recommendations: string[];
  actions?: string[];          // Auto-mitigations
}

// Risk Mitigation Actions
type RiskAction = 
  | 'require_mfa'
  | 'block_action'
  | 'limit_budget'
  | 'notify_security'
  | 'escalate'
  | 'log_only';

// Example Risk Response
const riskResponse = {
  entityId: "CI-AGT-sales-bot",
  riskLevel: "high",
  categories: {
    agent: {
      score: 85,
      driftDetected: true,
      hallucinationRate: 0.15   // 15% rate
    }
  },
  actions: [
    "require_human_approval",
    "notify_security_team",
    "limit_budget_to: 100"
  ]
};
```

#### New Endpoints

```
POST   /api/risk/assess/:entityId        Full risk assessment
GET    /api/risk/score/:entityId         Get risk score
GET    /api/risk/categories/:entityId    Get category scores
POST   /api/risk/signal                 Submit risk signal
GET    /api/risk/alerts                  Active alerts
POST   /api/risk/alerts/:id/resolve      Resolve alert
GET    /api/risk/history/:entityId      Risk history
```

#### Effort: 2 months | Priority: P1

---

### Gap 10: Developer Platform (SDK/CLI)

#### Current State
```
✅ REST API
❌ SDK
❌ CLI
❌ Terraform Provider
❌ Webhooks
```

#### Solution Architecture

```typescript
// SDK: @corpid/sdk

// npm install @corpid/sdk

import { CorpID } from '@corpid/sdk';

const client = new CorpID({
  apiKey: 'ak_live_xxx',
  baseUrl: 'https://api.corpid.ai'
});

// Users
await client.users.create({ email, name, role });
await client.users.list({ businessId });
await client.users.update(id, { name });
await client.users.delete(id);

// Agents
await client.agents.create({
  name: 'sales-bot',
  permissions: ['leads:read', 'orders:write'],
  budget: { monthly: 50000 }
});
await client.agents.rotateKey(agentId);

// Workloads
await client.workloads.register({
  name: 'data-sync',
  type: 'cron',
  scopes: ['memory:read']
});

// Delegation
await client.delegations.create({
  delegateId: 'CI-AGT-xxx',
  scope: ['reports:read'],
  attenuationFactor: 0.8
});

// Trust
await client.trust.getScore(entityId);
await client.trust.getDimensions(entityId);

// Webhooks
await client.webhooks.create({
  url: 'https://myapp.com/webhooks',
  events: ['user.created', 'agent.revoked', 'trust.changed']
});
```

```bash
# CLI: corpid

# Install
npm install -g @corpid/cli

# Login
corpid login

# Users
corpid users list
corpid users create --email alice@example.com --role user
corpid users delete alice@example.com

# Agents
corpid agents create --name sales-bot --permissions leads:read,orders:write
corpid agents list
corpid agents rotate-key agent-123

# Workloads
corpid workloads register --name sync-service --type cron
corpid workloads list

# Delegation
corpid delegation create --to agent-123 --scope leads:read
corpid delegation chain agent-123

# Trust
corpid trust score user-123
corpid trust dimensions user-123

# Webhooks
corpid webhooks create --url https://... --events user.created
```

```typescript
// Terraform Provider

resource "corpid_user" "alice" {
  email = "alice@example.com"
  name = "Alice Smith"
  role = "user"
  business_id = corpid_business.main.id
}

resource "corpid_agent" "sales_bot" {
  name = "Sales Bot"
  owner_id = corpid_user.alice.id
  permissions = ["leads:read", "orders:write"]
  
  budget {
    monthly = 50000
    currency = "USD"
  }
}

resource "corpid_workload" "sync" {
  name = "Data Sync"
  type = "cron"
  owner_id = corpid_user.alice.id
  scopes = ["memory:read", "memory:write"]
  
  rotation_policy = {
    interval_days = 30
    auto_rotate = true
  }
}

resource "corpid_delegation" "sales_access" {
  delegator_id = corpid_user.alice.id
  delegate_id = corpid_agent.sales_bot.id
  scope = ["leads:read"]
  attenuation_factor = 0.8
}
```

```typescript
// Webhooks
interface WebhookEvent {
  id: string;
  type: WebhookType;
  timestamp: string;
  data: Record<string, any>;
}

type WebhookType = 
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.mfa_enabled'
  | 'agent.created'
  | 'agent.updated'
  | 'agent.suspended'
  | 'agent.revoked'
  | 'delegation.created'
  | 'delegation.revoked'
  | 'trust.changed'
  | 'trust.elevated'
  | 'trust.degraded'
  | 'risk.alert'
  | 'workload.credential_rotated'
  | 'session.expired'
  | 'policy.violated';
```

#### New Endpoints (Webhook Management)

```
POST   /api/webhooks                Create webhook
GET    /api/webhooks                List webhooks
GET    /api/webhooks/:id            Get webhook
PUT    /api/webhooks/:id            Update webhook
DELETE /api/webhooks/:id            Delete webhook
POST   /api/webhooks/:id/test       Test webhook
GET    /api/webhooks/:id/deliveries  Delivery history
POST   /api/webhooks/:id/retry      Retry delivery
```

#### Effort: 2 weeks | Priority: P0

---

### Gap 11: Agent Reputation Marketplace

#### Current State
```
✅ Trust Score
✅ Trust Dimensions
❌ Agent-specific reputation
```

#### Solution Architecture

```typescript
// Agent Reputation Profile
interface AgentReputation {
  agentId: string;
  
  // Performance Metrics
  metrics: {
    tasksCompleted: number;
    successRate: number;           // 0-100%
    avgResponseTime: number;      // milliseconds
    failureRate: number;          // 0-100%
    
    // AI-specific
    hallucinationRate?: number;   // 0-100%
    promptInjectionAttempts?: number;
    
    // Domain-specific
    revenueGenerated?: number;
    costSaved?: number;
    customerSatisfaction?: number;   // 0-100%
  };
  
  // Reputation Score
  reputation: {
    overall: number;              // Composite score
    reliability: number;
    quality: number;
    efficiency: number;
    safety: number;
  };
  
  // Reviews & Endorsements
  endorsements: {
    from: string;                 // Entity ID
    rating: number;              // 1-5
    comment?: string;
    categories: string[];
    timestamp: string;
  }[];
  
  // Credentials
  credentials: {
    type: string;                // "certified", "verified", "compliant"
    issuedBy: string;
    expiresAt?: string;
  }[];
  
  // Marketplace Visibility
  marketplace: {
    listed: boolean;
    category: string;
    tags: string[];
    hourlyRate?: number;
    availability: 'available' | 'busy' | 'unavailable';
  };
}

// Agent Leaderboard
interface ReputationLeaderboard {
  category: string;
  period: 'all_time' | 'month' | 'week';
  rankings: {
    rank: number;
    agentId: string;
    agentName: string;
    ownerName: string;
    reputation: number;
    tasksCompleted: number;
    successRate: number;
  }[];
}
```

#### New Endpoints

```
GET    /api/reputation/:agentId             Get full reputation
GET    /api/reputation/:agentId/metrics     Get metrics
POST   /api/reputation/:agentId/review      Submit review
GET    /api/reputation/:agentId/reviews    Get reviews
POST   /api/reputation/:agentId/endorse     Endorse agent
GET    /api/reputation/leaderboard         Get leaderboard
POST   /api/reputation/:agentId/credential Add credential
GET    /api/reputation/marketplace          Browse agents
POST   /api/reputation/marketplace/list    List agent
```

#### Effort: 3 months | Priority: P2

---

### Gap 12: Cross-Company Federation

#### Current State
```
✅ OIDC (Google, GitHub)
✅ SAML SSO
❌ B2B Trust Exchange
❌ Inter-company Delegation
❌ Cross-company Agent Passports
```

#### Why It Matters
This powers:
- SUTAR global commerce
- Nexha federation
- Agent-to-agent transactions

#### Solution Architecture

```typescript
// Cross-Company Trust Network

// 1. Company Registration
interface FederatedCompany {
  companyId: string;              // CI-BIZ-xxx
  did: string;                   // Decentralized ID
  
  // Trust Network
  trustNetwork: {
    trustedCompanies: string[];  // Company IDs
    trustLevel: Record<string, number>;  // companyId -> trust level
    trustedAgents: string[];     // Agent IDs
  };
  
  // Permissions in network
  permissions: {
    canActAs: string[];          // Agent IDs from other companies
    canDelegateTo: string[];     // Agent IDs
  };
  
  // Network status
  status: 'active' | 'suspended' | 'pending_verification';
}

// 2. Cross-Company Delegation
interface CrossCompanyDelegation {
  id: string;
  
  // Granting company
  grantorCompany: string;
  grantorAgent: string;          // CI-AGT-xxx
  
  // Receiving company
  granteeCompany: string;
  granteeAgent?: string;         // CI-AGT-yyy (optional, can be any agent)
  
  // Scope
  scope: string[];
  constraints: {
    maxValue?: number;
    allowedResources?: string[];
    timeWindow?: TimeWindow;
  };
  
  // Trust requirement
  minimumTrustScore: number;
  
  // Verification
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  acceptedAt?: string;
  expiresAt?: string;
}

// 3. Trust Federation Protocol
interface TrustFederation {
  // Two companies establish trust
  establishTrust(companyA: string, companyB: string): Promise<TrustLevel>;
  
  // Grant cross-company permission
  grantPermission(delegation: CrossCompanyDelegation): Promise<void>;
  
  // Verify cross-company authority
  verifyAuthority(agentId: string, action: string): Promise<boolean>;
  
  // Revoke cross-company permission
  revokePermission(delegationId: string): Promise<void>;
}

// Example Flow: Agent from Company A acts on behalf of Company B
// 1. Company A and B establish trust (manual or automatic based on trust score)
// 2. Company A grants delegation: "sales-agent can negotiate with Company B partners"
// 3. Company B accepts delegation
// 4. sales-agent can now act with Company B's context
// 5. All actions logged to both companies
```

#### New Endpoints

```
POST   /api/federation/companies/register     Register company in network
GET    /api/federation/companies             List trusted companies
POST   /api/federation/companies/:id/trust  Establish trust
GET    /api/federation/permissions         List my permissions
POST   /api/federation/permissions/grant    Grant cross-company permission
POST   /api/federation/permissions/accept  Accept permission
POST   /api/federation/permissions/revoke   Revoke permission
POST   /api/federation/verify              Verify authority
GET    /api/federation/network             Get trust network
```

#### Effort: 6 months | Priority: P2

---

## Part 5: Execution Roadmap

### P0 — Must Build (Next 30 Days)

| Feature | Effort | Impact | Deliverable |
|---------|--------|--------|-------------|
| Identity Timeline API | 2 weeks | High | GET /api/timeline/:entityId |
| ABAC Policy Engine | 2 months | High | POST /api/policies/evaluate |
| Policy-as-Code | 2 months | High | corp-policy-engine |
| Developer SDK | 2 weeks | Transformative | @corpid/sdk npm package |
| Webhooks | 1 week | Transformative | POST /api/webhooks |

### P1 — Important (Next 90 Days)

| Feature | Effort | Impact | Deliverable |
|---------|--------|--------|-------------|
| Universal Entity Model | 2 months | High | CI-DEV-, CI-API-, CI-TWN- types |
| Graph Database | 3 months | High | Neo4j integration |
| Enterprise Lifecycle | 2 months | Medium | Full lifecycle states |
| Risk Engine | 2 months | High | corp-risk-engine |

### P2 — Strategic (6-12 Months)

| Feature | Effort | Impact | Deliverable |
|---------|--------|--------|-------------|
| Verifiable Credentials | 3 months | Transformative | corp-vc-service |
| Zero Trust Runtime | 3 months | High | corp-zero-trust |
| Agent Reputation | 3 months | Medium | Reputation marketplace |
| Cross-Company Federation | 6 months | Transformative | Trust network |

---

## Part 6: New Service Architecture

### New Services to Build

| Service | Port | Priority | Dependencies |
|---------|------|----------|--------------|
| `corp-policy-engine` | 4381 | P0 | CorpID, MemoryOS |
| `corp-abac-engine` | 4382 | P0 | CorpID |
| `corp-timeline-engine` | 4383 | P0 | CorpID, MemoryOS |
| `corp-risk-engine` | 4384 | P1 | CorpID, TwinOS |
| `corp-vc-service` | 4385 | P2 | CorpID |
| `corp-did-service` | 4386 | P2 | CorpID |
| `corp-zero-trust` | 4387 | P2 | CorpID |
| `corp-reputation` | 4388 | P2 | CorpID, AgentOS |
| `corp-federation` | 4389 | P2 | CorpID, Nexha |
| `corp-graph-db` | 4390 | P1 | CorpID |

### Service Directory Structure

```
companies/HOJAI-AI/platform/identity/
├── corpid-service/           # ✅ Existing (4702)
├── corp-policy-engine/        # P0
├── corp-abac-engine/          # P0
├── corp-timeline-engine/      # P0
├── corp-risk-engine/          # P1
├── corp-vc-service/           # P2
├── corp-did-service/           # P2
├── corp-zero-trust/            # P2
├── corp-reputation/           # P2
├── corp-federation/           # P2
└── corp-graph-db/             # P1
```

---

## Part 7: SDK & Developer Experience

### SDK Structure

```
@hojai/corpid-sdk/
├── src/
│   ├── index.ts              # Main export
│   ├── client.ts             # HTTP client
│   ├── auth.ts               # Authentication
│   ├── users.ts              # User management
│   ├── agents.ts             # Agent management
│   ├── workloads.ts          # Workload management
│   ├── delegation.ts         # Delegation
│   ├── trust.ts              # Trust scoring
│   ├── policies.ts           # ABAC policies
│   ├── timeline.ts           # Timeline
│   ├── webhooks.ts           # Webhooks
│   └── types.ts              # TypeScript types
├── package.json
└── README.md
```

### CLI Structure

```
@hojai/corpid-cli/
├── bin/
│   └── corpid.js             # Entry point
├── src/
│   ├── commands/
│   │   ├── users.ts
│   │   ├── agents.ts
│   │   ├── workloads.ts
│   │   ├── delegation.ts
│   │   ├── trust.ts
│   │   └── webhooks.ts
│   ├── utils/
│   │   ├── api.ts
│   │   ├── config.ts
│   │   └── auth.ts
│   └── index.ts
├── package.json
└── README.md
```

---

## Part 8: Integration Points

### With Existing Services

| Service | Integration |
|---------|-------------|
| **AgentOS** | Agent reputation, delegation sync |
| **TwinOS** | Entity relationships, timeline |
| **MemoryOS** | Event storage, search |
| **SUTAR** | Policy evaluation, authority checks |
| **Nexha** | Cross-company federation |
| **Hub** | Unified API gateway |

### With External Services

| Service | Integration |
|---------|-------------|
| **Neo4j** | Graph database |
| **HaveIBeenPwned** | Breach detection (existing) |
| **Google Workspace** | OIDC SSO (existing) |
| **GitHub** | OAuth SSO (existing) |

---

## Part 9: Security Considerations

### New Attack Surfaces

| Attack | Mitigation |
|--------|------------|
| Policy injection | Sandboxed Rego evaluation |
| Delegation abuse | Trust score + rate limits |
| Credential theft | Continuous verification |
| Graph poisoning | Verification chains |
| Cross-company impersonation | Bi-directional trust |

### Security Requirements

1. All new services require JWT auth
2. Cross-company operations require multi-party verification
3. Policy changes require audit trail
4. Risk alerts trigger automated responses

---

## Part 10: Success Metrics

### Technical Metrics

| Metric | Current | Target |
|--------|---------|--------|
| API Endpoints | 100 | 200+ |
| Test Coverage | 134 tests | 500+ tests |
| Response Time (p95) | <100ms | <50ms |
| Uptime SLA | 99.9% | 99.99% |

### Business Metrics

| Metric | Target |
|--------|--------|
| SDK Downloads | 10K/month |
| CLI Installs | 5K/month |
| Webhook Events | 1M/day |
| Cross-Company Delegations | 10K |

---

## Appendix: File Naming Convention

```
corp-<feature>-service/

corp-policy-engine/
├── src/
│   ├── index.ts
│   ├── policy-engine.ts
│   ├── rego-compiler.ts
│   ├── evaluator.ts
│   └── routes/
├── __tests__/
├── package.json
├── vitest.config.ts
└── README.md
```

---

*CorpID v3.0 — From Identity Service to Identity Operating System*
*Next: Execute P0 features to reach category-defining status*
