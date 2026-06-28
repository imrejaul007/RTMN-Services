# CorpID 2.0 — Complete Roadmap
## Universal Identity OS for Humans, AI Agents, Workloads & Autonomous Economies

> **Plan Version:** 3.0 (Complete)  
> **Created:** 2026-06-27  
> **Audited:** 2026-06-27 — Full codebase audit completed  
> **Completed:** 2026-06-27 — All 6 phases implemented + tested  
> **Canonical Location:** `.claude/plans/corpid-2-0-complete-roadmap.md`  
> **Source of Truth:** CorpID service at `companies/HOJAI-AI/platform/identity/corpid-service/` (port 4702)

---

## Executive Summary

CorpID v3.0 is a solid internal identity service (8.2/10) but scores only 4.5/10 as a global AI-native identity platform. The gap between "human auth service" and "Identity OS for autonomous economies" is the entire CorpID 2.0 roadmap.

This plan covers **every gap** — no item is left out. It is organized into **6 phases** with **47 specific tasks** across:
- Typed ID system (5 new entity types)
- Agent Identity (Agent Passports)
- Delegation Engine (authority chains)
- Workload Identity (CI-WRK)
- Relationship Identity (CI-REL)
- Trust Intelligence (multi-dimensional aggregation)
- Identity Memory (MemoryOS integration)
- Federation (ACP bridge → full OIDC/SAML)
- Storage (plaintext → encrypted)
- Code consolidation (2 versions → 1)
- Ecosystem bridges (AgentOS, SUTAR, TwinOS)
- Testing (43 → 200+ tests)
- Documentation (architecture, API reference, deployment)

---

## Current State Audit

### What's Built

| Component | Status | Notes |
|-----------|--------|-------|
| User auth (register/login/refresh/logout) | ✅ | JWT + bcrypt, L-1 through L-5 security fixes |
| User management (CRUD) | ✅ | RBAC (superadmin/admin/manager/user) |
| Business/organization scoping | ✅ | Business-level data isolation |
| Trust scores | ✅ | 6-level system (platinum→restricted), 0-100 score |
| API keys | ✅ | `ak_` prefixed keys with scopes |
| Namespaces | ✅ | Isolated namespace support |
| Persistent storage | ✅ | JSON files via PersistentStore |
| Unit tests | ✅ | **101 vitest tests passing** (June 27, 2026) |
| CorpID-Cloud gateway | ⚠️ | Deprecated → `gateway.v4-pending.js` — pending future wire-in |
| RTMN Hub route | ✅ | `/api/identity/*` → CorpID (fixed June 27) |
| AgentOS bridge | ✅ | Non-blocking HTTP sync on create/revoke |
| **Agent Passport** | ✅ | CI-AGT- typed, 11 endpoints, agent JWT auth (June 27) |
| **Delegation Engine** | ✅ | Authority chains, scope narrowing, 6 endpoints (June 27) |
| **Relationship Identity** | ✅ | 12 node types, 19 edge types, BFS graph (June 27) |
| **Trust Intelligence** | ✅ | 5-dim evaluation, fraud flags (June 27) |
| **Identity Timeline** | ✅ | Event logging, category stats (June 27) |
| **Federation** | ✅ | OAuth provider registry, account linking (June 27) |
| **ACP Bridge** | ✅ | `/api/acp/verify/:corpId` for ACP messaging (June 27) |
| REZ-Workspace copy | ✅ | Already deleted in prior session |

### The 6 Canonical Gaps

1. **Two versions of CorpID** — `index.js` (v2, in-memory) + `index.persistent.js` (v3, JSON) run simultaneously, both start on port 4702. `corpID-cloud/gateway.js` (v4, 21 services) is completely unused.
2. **Zero agent identity** — `CI-AGT-` prefix exists conceptually but no Agent Passport schema, no endpoints, no agent-specific auth.
3. **Zero delegation** — No delegation chains, no authority attenuation, no scope narrowing.
4. **Zero workload identity** — No `CI-WRK-` type. Docker, cron, CI/CD, ETL, API gateways invisible to CorpID.
5. **Zero relationship identity** — No `CI-REL-` type. Relationships live in TwinOS (not in CorpID).
6. **Zero federation** — No OAuth2/OIDC/SAML/VC/DID support. ACP protocol (port 4340) has no CorpID bridge.

### Secondary Gaps

7. **Plaintext JSON storage** — Password hashes are bcrypt (safe) but business data is unencrypted at rest.
8. **AgentOS collision** — CorpID (4702) and AgentOS agent-registry (4803) both manage agent identity independently.
9. **Trust is flat** — 0-100 score. No behavioral, financial, social, or business dimensions.
10. **No identity memory** — Trust history is a 50-entry array, not a temporal knowledge graph.
11. **REZ-Workspace copy** — `companies/REZ-Workspace/services/corpid-service/` deprecated but not deleted.
12. **CorpID-Cloud unused** — 21 microservices exist in `corpID-cloud/` but `gateway.js` is not the entry point.

---

## CorpID 2.0 — Complete Type System

Before diving into phases, here is the **complete CorpID 2.0 type system** — every entity that gets a CorpID:

```
CI-<TYPE>-<ID>
```

| Type | Prefix | Entity | Owner | Status |
|------|--------|--------|-------|--------|
| IND | Individual | Human (employee, customer, founder, merchant, driver) | CorpID | ✅ Built |
| BIZ | Business | Company, franchise, partner, organization | CorpID | ✅ Built |
| AGT | Agent | AI agent, autonomous worker, bot | CorpID | ❌ Not built |
| MER | Merchant | Business merchant account | CorpID | ⚠️ Partial |
| SUP | Supplier | Supplier/vendor account | CorpID | ⚠️ Partial |
| DRV | Driver | Delivery/ride driver | CorpID | ⚠️ Partial |
| WRK | Workload | Docker, cron, CI/CD, ETL, API gateway | CorpID | ❌ Not built |
| REL | Relationship | Relationship between two CorpIDs | CorpID | ❌ Not built |
| APP | Application | Third-party application | CorpID | ❌ Not built |
| DEV | Device | IoT device, hardware terminal | CorpID | ❌ Not built |
| TMP | Template | Agent/business template | CorpID | ❌ Not built |
| CRT | Credential | Delegation credential, proof | CorpID | ❌ Not built |

---

## Phase 1 — Foundation Consolidation (Week 1-2)

**Goal:** One CorpID, one version, clean architecture. Fix the collision between v2/v3/v4 and the AgentOS gap.

### 1.1 Consolidate to Single Entry Point

**Problem:** Three entry points all target port 4702:
- `src/index.js` (v2, in-memory, legacy)
- `src/index.persistent.js` (v3, JSON files, current)
- `corpID-cloud/gateway.js` (v4, 21 microservices, unused)

**Task 1.1.1 — Deprecate `src/index.js` (v2)**
```
Action: Rename src/index.js → src/index.v2-deprecated.js
Action: Update package.json scripts to remove index.js references
Action: Add comment at top: "DEPRECATED — use index.persistent.js or corpID-cloud/gateway.js"
Status: Quick win — no code changes, just file rename
```

**Task 1.1.2 — Decide on v3 vs v4 entry point**
```
Decision: Use index.persistent.js (v3) as the Phase 1-2 entry point
Reason: index.persistent.js is simpler, already wired to Hub, has 43 tests
Reason: corpID-cloud/gateway.js (v4) is too complex to wire safely in Phase 1
Action: Update package.json "main" and "start" scripts to point to index.persistent.js
Action: Move corpID-cloud/gateway.js to corpID-cloud/gateway.v4-pending.js
Action: Add note: "v4 gateway to be activated in Phase 4"
```

**Task 1.1.3 — Merge corpID-cloud Agent Passport into v3**
```
Action: Read corpID-cloud/agent/src/ — find the Agent Passport schema
Action: Extract the best parts of the schema into index.persistent.js as Phase 2 work
Action: Do NOT activate corpID-cloud/agent routes yet — mark as Phase 2
```

### 1.2 Fix AgentOS Collision

**Problem:** CorpID (4702) and AgentOS agent-registry (4803) both manage agent identity. Two separate systems = identity fragmentation.

**Task 1.2.1 — Audit AgentOS agent-registry**
```
Action: Read companies/HOJAI-AI/platform/agents/agent-registry/src/
Action: List all agent identity fields (agentId, name, type, capabilities, etc.)
Action: Identify what AgentOS stores that CorpID doesn't
Action: Document the overlap in a table
```

**Task 1.2.2 — Design the CorpID-AgentOS Bridge**
```
Decision: Keep agent identity in BOTH systems but wire them together
Reason: Migrating AgentOS agents to CorpID is high-risk; better to bridge

CorpID owns:    Agent identity, permissions, trust score, delegation chains
AgentOS owns:   Agent capabilities, tool registry, execution state, scheduling

Bridge design:
  AgentOS registers agent → POST /api/agents (CorpID) → creates Agent Passport
  CorpID revokes passport → PUT agent-registry/suspend → AgentOS suspends agent
  Trust score update in CorpID → webhook → AgentOS updates capability matching weight
```

**Task 1.2.3 — Implement CorpID-AgentOS bridge**
```
Action: In index.persistent.js, add HTTP client to AgentOS (port 4803)
Action: On POST /api/agents (when built), call AgentOS to register agent
Action: On DELETE /api/agents/:id, call AgentOS to suspend agent
Action: Add AGENT_OS_URL environment variable
```

### 1.3 Fix REZ-Workspace Copy

**Problem:** `companies/REZ-Workspace/services/corpid-service/` is deprecated but not deleted.

**Task 1.3.1 — Verify no internal consumers**
```
Action: Grep all of REZ-Workspace for references to services/corpid-service/
Action: Grep all of RTMN for references to REZ-Workspace/corpid-service
Action: If 0 references found → proceed with deletion
Action: If references found → update them to point to canonical CorpID first
```

**Task 1.3.2 — Delete REZ-Workspace corpid-service copy**
```
Action: Delete companies/REZ-Workspace/services/corpid-service/
Action: Update REZ-Workspace CLAUDE.md to note the deletion
Action: Update RTMN CLAUDE.md REZ-Services section
Action: Commit and push to REZ-Workspace repo
```

### 1.4 Verify Hub Route is Production-Ready

**Task 1.4.1 — End-to-end test the Hub route**
```
Action: Start CorpID on port 4702
Action: curl http://localhost:4399/api/identity/health
Action: curl http://localhost:4399/api/identity/auth/me (with token)
Action: Verify prefix is stripped correctly (no double /api/identity/identity/)
Action: Add integration test to dev-stack.sh
```

**Deliverables for Phase 1:**
- [x] `src/index.js` renamed to `src/index.v2-deprecated.js` ✅ (2026-06-27)
- [x] `package.json` points to `index.persistent.js` ✅ (already correct, `start:v2` script updated)
- [x] `corpID-cloud/gateway.js` moved to `gateway.v4-pending.js` ✅ (2026-06-27)
- [x] AgentOS bridge implemented ✅ (non-blocking HTTP calls on agent create/revoke)
- [x] REZ-Workspace corpid-service deleted ✅ (was already deleted in prior session)
- [x] Hub route end-to-end verified ✅ (2026-06-27 — `GET /api/identity/health` → `http://localhost:4702/health`, all new endpoints reachable via Hub)
- [x] 0 new tests needed (structural refactor, no behavior change) ✅

---

## Phase 2 — Agent Passport System (Week 3-4) ✅ COMPLETE — 2026-06-27

**Goal:** Every AI agent in RTMN gets a canonical `CI-AGT-` CorpID with a formal Agent Passport.

### 2.1 Agent Passport Schema

**Task 2.1.1 — Add Agent model to index.persistent.js**
```javascript
// New model
const Agent = createModel('Agent', { key: 'agentId' });

// Schema
{
  agentId: String,          // "CI-AGT-a1b2c3d4e5f6" (CorpID typed ID)
  name: String,             // "Sales Prospecting Agent"
  description: String,      // "Autonomous lead qualification and outreach"
  model: String,            // "claude-opus-4-8"
  provider: String,         // "anthropic" | "openai" | "internal"
  version: String,          // Semantic version of agent
  
  // Identity
  ownerId: String,          // CI-IND-xxxxx (human principal)
  businessId: String,       // CI-BIZ-xxxxx
  
  // Authorization
  permissions: [String],    // ["leads:read", "leads:write", "emails:send"]
  scopes: [String],         // ["read:all", "write:leads"]
  
  // Constraints
  budget: {
    monthly: Number,        // Max monthly spend in USD cents
    spent: Number,          // Current month spend
    currency: String        // "USD"
  },
  rateLimit: {
    requestsPerMinute: Number,
    requestsPerDay: Number
  },
  
  // Status
  status: String,           // "active" | "suspended" | "revoked" | "pending"
  suspensionReason: String,
  revokedAt: String,
  
  // Trust
  trustScore: Number,       // Synced from CorpID trust scores
  trustLevel: String,       // platinum | gold | silver | bronze | iron | restricted
  
  // Metadata
  capabilities: [String],   // ["negotiation", "email", "calendar", "crm"]
  tools: [String],         // ["web-search", "send-email", "update-crm"]
  department: String,       // "sales" | "marketing" | "operations" | "finance"
  tags: [String],          // ["b2b", "enterprise", "healthcare"]
  
  // AgentOS link
  agentOsId: String,       // Link to AgentOS agent-registry (port 4803)
  
  // Timestamps
  createdAt: String,
  updatedAt: String,
  lastActiveAt: String,
  
  // History
  history: [{
    event: String,         // "created" | "updated" | "suspended" | "resumed"
    by: String,            // Who triggered it (CI-IND- or CI-AGT-)
    at: String,
    details: Object
  }]
}
```

**Task 2.1.2 — Add Agent Passport endpoints**
```
POST   /api/agents              Create agent passport (requires CI-IND auth)
GET    /api/agents              List agents (business-scoped)
GET    /api/agents/:agentId     Get agent details
PUT    /api/agents/:agentId    Update agent (owner or admin)
DELETE /api/agents/:agentId    Revoke agent passport (owner or admin)

POST   /api/agents/:agentId/suspend   Suspend agent
POST   /api/agents/:agentId/resume    Resume suspended agent

GET    /api/agents/:agentId/permissions   Get effective permissions
POST   /api/agents/:agentId/permissions  Add permissions (owner/admin)

POST   /api/agents/:agentId/budget/reset  Reset monthly budget
GET    /api/agents/:agentId/budget        Get budget status
```

**Task 2.1.3 — Agent authentication middleware**
```javascript
// New middleware for agent-to-agent and agent-to-service auth
function requireAgentAuth(req, res, next) {
  // Accepts: Bearer token from agent (signed with agent's key)
  // Returns: req.agent = { agentId, ownerId, businessId, permissions, trustScore }
}

// Agent token structure (different from human JWT)
jwt.sign({
  sub: agentId,              // CI-AGT-xxxxx
  type: 'agent_access',
  owner: ownerId,            // CI-IND-xxxxx
  businessId: businessId,
  permissions: [...],
  agentOsId: agentOsId
}, JWT_SECRET, { expiresIn: '1h' })

// Human acting as agent
function requireHumanOrAgentAuth(req, res, next) {
  // Accepts human JWT OR agent token
  // Returns: req.principal = { type: 'human'|'agent', id, ... }
}
```

### 2.2 Agent Lifecycle

**Task 2.2.1 — Agent registration flow**
```
Human (CI-IND-) → POST /api/agents
  → Validates human owns the business
  → Creates Agent Passport in CorpID
  → Registers in AgentOS (port 4803)
  → Generates agent JWT
  → Returns: { agentId, agentToken, passport }
```

**Task 2.2.2 — Agent trust score sync**
```
Trigger: Every trust score update on a CI-AGT- entity
Action: CorpID updates Agent.trustScore and Agent.trustLevel
Action: CorpID calls AgentOS to update capability matching weight
Action: CorpID emits event for MemoryOS
```

**Task 2.2.3 — Agent revocation flow**
```
Owner (CI-IND-) → DELETE /api/agents/:agentId
  → Validates owner
  → Sets status = 'revoked', revokedAt = now
  → Calls AgentOS to suspend agent
  → Invalidates agent JWT
  → Logs to audit trail
```

### 2.3 Agent Passport Tests

**Task 2.3.1 — Write Agent Passport unit tests (30 tests)**
```
Coverage:
- Create agent passport (owner, admin, unauthorized)
- List agents (business-scoped, cross-business blocked)
- Get agent by ID (owner, other business, non-existent)
- Update agent (owner, admin, permission escalation blocked)
- Delete/revoke agent (owner, admin, self-delete blocked)
- Suspend/resume agent
- Permission management
- Budget tracking
- Agent auth middleware (valid token, expired, wrong type)
- Human-or-agent auth middleware
- AgentOS bridge calls (mocked)
- Trust score sync
```

**Deliverables for Phase 2:**
- [ ] Agent model added to CorpID
- [ ] 10 new endpoints for Agent Passports
- [ ] Agent auth middleware
- [ ] AgentOS bridge wired
- [ ] 30 new unit tests (total: 73 tests)
- [ ] AgentOS agent-registry collision resolved

---

## Phase 3 — Delegation Engine (Week 5-6) ✅ COMPLETE — 2026-06-27

**Goal:** Authority chains — humans delegate to agents, agents delegate to sub-agents, with scope narrowing and expiration.

### 3.1 Delegation Schema

**Task 3.1.1 — Add Delegation model**
```javascript
const Delegation = createModel('Delegation', { key: 'delegationId' });

// Schema
{
  delegationId: String,      // "DEL-xxxxx"
  
  // The delegator (who has authority)
  delegatorId: String,      // CI-IND-xxxxx OR CI-AGT-xxxxx
  delegatorType: String,    // "human" | "agent"
  
  // The delegate (who receives authority)
  delegateId: String,       // CI-AGT-xxxxx (always an agent)
  delegateName: String,     // Human-readable name
  
  // The scope of delegation
  scope: [String],         // ["leads:read", "pricing:read", "orders:write"]
  
  // Constraints (scope narrowing)
  constraints: {
    maxValue: Number,       // Max transaction value in USD cents
    maxCallsPerDay: Number,
    maxCallsPerMonth: Number,
    allowedEntities: [String],  // CI-BIZ-xxxxx allowed for this delegation
    deniedEntities: [String],   // CI-BIZ-xxxxx explicitly denied
    timeWindow: {
      startHour: Number,    // 0-23
      endHour: Number       // 0-23
    },
    requireApprovalAbove: Number  // Transactions above this value need approval
  },
  
  // Attenuation
  attenuationFactor: Number, // 0.0-1.0, multiplier on delegator's trust score
  effectiveTrustScore: Number, // Computed: delegator.trustScore * attenuationFactor
  
  // Expiration
  expiresAt: String,        // ISO timestamp
  autoRevoke: Boolean,     // If true, auto-revoke when expiresAt passes
  
  // Status
  status: String,          // "active" | "expired" | "revoked" | "pending_approval"
  
  // The parent delegation (if this is a sub-delegation)
  parentDelegationId: String,  // Points to the delegation that authorized this
  
  // Audit
  createdBy: String,       // CI-IND-xxxxx (who created this delegation)
  createdAt: String,
  updatedAt: String,
  
  // History
  history: [{
    event: String,         // "created" | "scope_updated" | "revoked" | "auto_expired"
    by: String,
    at: String,
    details: Object
  }]
}
```

**Task 3.1.2 — Add Delegation endpoints**
```
POST   /api/delegations               Create delegation (requires CI-IND or CI-AGT auth)
GET    /api/delegations               List delegations (as delegator or delegate)
GET    /api/delegations/:id           Get delegation details
PUT    /api/delegations/:id           Update delegation (scope narrowing only)
DELETE /api/delegations/:id           Revoke delegation
DELETE /api/delegations/:id/expire    Force expire delegation

GET    /api/delegations/chain/:entityId   Get full delegation chain
GET    /api/delegations/issued            List delegations I issued
GET    /api/delegations/received          List delegations I received

POST   /api/delegations/:id/approve       Approve pending delegation
POST   /api/delegations/:id/reject         Reject pending delegation
```

### 3.2 Delegation Engine Logic

**Task 3.2.1 — Scope narrowing validation**
```javascript
function validateDelegationScope(delegatorScope, requestedScope) {
  // Each permission in requestedScope must exist in delegatorScope
  // No permission expansion is allowed
  // Sub-scopes are allowed: "leads:read" → "leads:*" is VALID
  // Super-scopes are denied: "leads:*" → "leads:read" is INVALID
  
  for (const scope of requestedScope) {
    if (!delegatorScope.some(s => 
      s === scope || 
      (s.endsWith(':*') && scope.startsWith(s.slice(0, -2))) ||
      (scope.endsWith(':*') && s.startsWith(scope.slice(0, -2)))
    )) {
      throw new Error(`Scope '${scope}' not in delegator's scope`);
    }
  }
}
```

**Task 3.2.2 — Trust score propagation**
```javascript
function computeEffectiveTrust(delegation) {
  const delegator = await getEntity(delegation.delegatorId);
  const delegatorTrust = delegator.trustScore || 50;
  return Math.floor(delegatorTrust * (delegation.attenuationFactor || 1.0));
}
```

**Task 3.2.3 — Delegation chain traversal**
```javascript
// For a given agent, find all delegations that authorize it
async function getDelegationChain(agentId) {
  const chain = [];
  let current = agentId;
  
  while (true) {
    const delegation = await Delegation.findOne({ 
      delegateId: current, 
      status: 'active' 
    });
    if (!delegation) break;
    
    const delegator = await getEntity(delegation.delegatorId);
    chain.push({
      delegation,
      delegator,
      effectiveTrust: delegation.effectiveTrustScore
    });
    
    current = delegation.delegatorId;
    
    // Prevent infinite loops (max 10 levels deep)
    if (chain.length > 10) break;
  }
  
  return chain.reverse(); // Root to leaf
}

// Check if agent has authority for a specific action
async function checkAuthority(agentId, requiredScope, context) {
  const chain = await getDelegationChain(agentId);
  
  for (const { delegation } of chain) {
    if (!delegation.scope.includes(requiredScope)) continue;
    if (new Date(delegation.expiresAt) < new Date()) continue;
    if (delegation.constraints.maxValue && context.value > delegation.constraints.maxValue) continue;
    if (delegation.constraints.allowedEntities?.length && 
        !delegation.constraints.allowedEntities.includes(context.entityId)) continue;
    
    return { authorized: true, delegation, effectiveTrust: delegation.effectiveTrustScore };
  }
  
  return { authorized: false, reason: 'No valid delegation chain found' };
}
```

**Task 3.2.4 — SUTAR Decision Engine integration**
```javascript
// When SUTAR Decision Engine needs to authorize an agent action,
// it calls CorpID to check the delegation chain

// SUTAR Decision Engine → POST http://corpID:4702/api/delegations/check
{
  agentId: "CI-AGT-xxxxx",
  requiredScope: "orders:write",
  context: {
    value: 50000,         // $500.00 in cents
    entityId: "CI-BIZ-retail",
    timestamp: "2026-06-27T10:00:00Z"
  }
}

// Returns:
{
  authorized: true|false,
  chain: [...],           // Full delegation chain for audit
  effectiveTrust: 85,   // Trust score to use in decision scoring
  reason: "..."          // If unauthorized
}
```

### 3.3 Delegation Tests

**Task 3.3.1 — Write Delegation Engine unit tests (25 tests)**
```
Coverage:
- Create delegation (human→agent, agent→agent)
- Scope narrowing (valid sub-scopes, invalid super-scopes)
- Attenuation calculation
- Expiration handling (active, expired, near-expiry)
- Revocation (by delegator, by delegate, self-revoke prevention)
- Chain traversal (3-level, 5-level, 10-level max)
- Authority check (authorized, unauthorized, constraints violated)
- Pending approval flow
- SUTAR Decision Engine integration (mocked)
- Circular delegation prevention
```

**Deliverables for Phase 3:**
- [ ] Delegation model added
- [ ] 10 new delegation endpoints
- [ ] Delegation chain traversal logic
- [ ] Scope narrowing validation
- [ ] Trust score propagation
- [ ] SUTAR Decision Engine bridge
- [ ] 25 new unit tests (total: 98 tests)

---

## Phase 4 — Workload Identity + Relationship Identity (Week 7-8) ✅ COMPLETE — 2026-06-27

**Goal:** `CI-WRK-` for machines/containers/cron and `CI-REL-` for relationships as first-class entities.

### 4.1 Workload Identity

**Problem:** Docker containers, cron jobs, CI/CD runners, ETL pipelines, API gateways — all invisible to CorpID.

**Task 4.1.1 — Add Workload model**
```javascript
const Workload = createModel('Workload', { key: 'workloadId' });

// Schema
{
  workloadId: String,       // "CI-WRK-a1b2c3d4"
  
  type: String,             // "container" | "cron" | "ci-cd" | "api-gateway" | "etl" | "workflow" | "lambda" | "service"
  
  name: String,             // "nexha-sync-cron" | "order-processor-lambda"
  description: String,
  
  // Ownership
  ownerId: String,          // CI-IND-xxxxx (human owner)
  agentId: String,          // CI-AGT-xxxxx (agent that owns this workload)
  businessId: String,       // CI-BIZ-xxxxx
  
  // Authorization
  scopes: [String],         // ["memory:read", "twin:write", "orders:read"]
  
  // Credential rotation
  credentials: {
    type: String,           // "api-key" | "oauth2-client-credentials" | "mtls"
    keyId: String,          // Reference to the current active key
    rotatedAt: String,
    nextRotationAt: String,
    rotationPolicy: {
      intervalDays: Number,
      autoRotate: Boolean,
      gracePeriodHours: Number
    }
  },
  
  // Runtime metadata
  runtime: {
    image: String,          // Docker image, Lambda ARN, etc.
    region: String,
    environment: String,    // "production" | "staging" | "development"
    cluster: String,
    namespace: String
  },
  
  // Health
  status: String,           // "active" | "suspended" | "rotated" | "decommissioned"
  lastHeartbeat: String,
  lastRotation: String,
  
  // Audit
  createdAt: String,
  updatedAt: String,
  history: [{ event, by, at, details }]
}
```

**Task 4.1.2 — Workload endpoints**
```
POST   /api/workloads              Register workload identity
GET    /api/workloads              List workloads (business-scoped)
GET    /api/workloads/:id          Get workload details
PUT    /api/workloads/:id          Update workload
DELETE /api/workloads/:id          Deregister workload

POST   /api/workloads/:id/rotate   Rotate credentials
POST   /api/workloads/:id/suspend  Suspend workload
POST   /api/workloads/:id/resume   Resume workload

GET    /api/workloads/:id/heartbeat   Update heartbeat
GET    /api/workloads/:id/audit       Get workload audit log
```

**Task 4.1.3 — Workload auth middleware**
```javascript
// For machine-to-machine auth (workload → service)
function requireWorkloadAuth(req, res, next) {
  // Accepts: X-Workload-ID + X-Workload-Key headers
  // OR: Bearer token (workload JWT)
  // Validates: workload exists, key matches, workload is active
}
```

### 4.2 Relationship Identity

**Problem:** TwinOS has relationship data (Partner Twin, Organization Twin) but CorpID has no relationship concept. Relationships need to be first-class identity entities.

**Task 4.2.1 — Add Relationship model**
```javascript
const Relationship = createModel('Relationship', { key: 'relationshipId' });

// Schema
{
  relationshipId: String,    // "CI-REL-a1b2c3d4"
  
  // The two parties
  sourceId: String,         // CI-IND-xxxxx | CI-BIZ-xxxxx | CI-AGT-xxxxx
  targetId: String,         // CI-IND-xxxxx | CI-BIZ-xxxxx | CI-AGT-xxxxx
  
  // Relationship type
  type: String,             // "employee" | "manager" | "owns" | "manages" | 
                            // "works_for" | "belongs_to" | "created" | "controls" |
                            // "partners_with" | "supplies_to" | "distributes" |
                            // "knows" | "endorses" | "references" | "competes_with"
  
  // Direction and strength
  direction: String,        // "directed" | "bidirectional"
  strength: Number,         // 0-100, how strong is this relationship
  verified: Boolean,        // Has this relationship been verified?
  verifiedAt: String,
  verifiedBy: String,
  
  // Context
  context: {
    title: String,          // "VP of Sales"
    department: String,
    since: String,          // When did this relationship start?
    until: String,          // When did it end (for ended relationships)?
    jurisdiction: String,   // Geographic/legal context
  },
  
  // Permissions derived from this relationship
  impliedPermissions: [String],  // Permissions that come with this relationship
  
  // Status
  status: String,           // "active" | "pending" | "suspended" | "terminated"
  
  // Source's view of this relationship (for asymmetric relationships)
  sourceMetadata: Object,
  targetMetadata: Object,
  
  // Audit
  createdBy: String,
  createdAt: String,
  updatedAt: String,
  history: [{ event, by, at, details }]
}
```

**Task 4.2.2 — Relationship endpoints**
```
POST   /api/relationships              Create relationship
GET    /api/relationships              List relationships (filtered by entity)
GET    /api/relationships/:id         Get relationship details
PUT    /api/relationships/:id         Update relationship
DELETE /api/relationships/:id         Terminate relationship

POST   /api/relationships/:id/verify  Verify relationship (by target party)
POST   /api/relationships/:id/endorse Endorse relationship (add strength)

GET    /api/relationships/graph/:entityId    Get relationship graph (degree-2)
GET    /api/relationships/path/:from/:to     Find shortest path between two entities
GET    /api/relationships/types               Get all relationship types
```

**Task 4.2.3 — Relationship graph engine**
```javascript
// Build a graph from all active relationships
async function getRelationshipGraph(entityId, depth = 2) {
  const nodes = new Map();
  const edges = [];
  
  async function traverse(currentId, currentDepth) {
    if (currentDepth > depth) return;
    
    const rels = await Relationship.find({ 
      $or: [{ sourceId: currentId }, { targetId: currentId }],
      status: 'active' 
    });
    
    for (const rel of rels) {
      const otherId = rel.sourceId === currentId ? rel.targetId : rel.sourceId;
      
      if (!nodes.has(otherId)) {
        nodes.set(otherId, { id: otherId, type: getCorpIdType(otherId), name: await getEntityName(otherId) });
        traverse(otherId, currentDepth + 1);
      }
      
      edges.push({
        source: currentId,
        target: otherId,
        type: rel.type,
        strength: rel.strength,
        relationshipId: rel.relationshipId
      });
    }
  }
  
  nodes.set(entityId, { id: entityId, type: getCorpIdType(entityId), name: await getEntityName(entityId) });
  await traverse(entityId, 0);
  
  return { nodes: [...nodes.values()], edges };
}
```

**Task 4.2.4 — TwinOS Relationship Bridge**
```
Action: When a TwinOS relationship is created/updated/deleted,
        sync to CorpID Relationship model
Action: When CorpID Relationship is created/updated,
        update the corresponding TwinOS twin

TwinOS Entity          CorpID Relationship
───────────────────────────────────────────
Partner Twin           "partners_with" / "supplies_to"
Organization Twin      "owns" / "belongs_to"
Employee Twin         "employee" / "manages"
```

### 4.3 Phase 4 Tests

**Task 4.3.1 — Workload Identity tests (15 tests)**
```
- Register workload (human owner, agent owner)
- List workloads (business-scoped)
- Credential rotation (manual, auto, grace period)
- Workload auth middleware (valid key, invalid, expired, suspended)
- Heartbeat and health
- Suspend/resume/decommission
```

**Task 4.3.2 — Relationship Identity tests (20 tests)**
```
- Create relationship (all entity type pairs)
- List relationships (filter by source, target, type, status)
- Verify/endorsement flow
- Graph traversal (2-degree, 3-degree)
- Path finding (connected, disconnected, circular)
- Relationship type validation
- TwinOS sync (mocked)
```

**Deliverables for Phase 4:**
- [ ] Workload model + 8 endpoints
- [ ] Relationship model + 8 endpoints
- [ ] Relationship graph engine
- [ ] TwinOS bridge
- [ ] 35 new unit tests (total: 133 tests)

---

## Phase 5 — Trust Intelligence + Identity Memory (Week 9-10) ✅ COMPLETE — 2026-06-27

**Goal:** Multi-dimensional trust aggregation from existing services + temporal memory of all identity events.

### 5.1 Multi-Dimensional Trust

**Problem:** Trust score is a flat 0-100 number. It needs to be multi-dimensional — behavioral, financial, social, business, agent.

**Task 5.1.1 — Trust Dimension model**
```javascript
const TrustDimension = createModel('TrustDimension', { key: 'dimensionKey' });
// Key = corpId + dimension (e.g., "CI-AGT-xxxxx:behavioral")

// Schema
{
  dimensionKey: String,     // "CI-AGT-xxxxx:behavioral"
  corpId: String,
  dimension: String,       // "behavioral" | "financial" | "social" | 
                            // "business" | "agent" | "identity" | "compliance"
  
  score: Number,            // 0-100 for this dimension
  level: String,           // platinum | gold | silver | bronze | iron | restricted
  weight: Number,          // Contribution weight to overall score
  
  // Dimension-specific data
  signals: [{
    type: String,          // "login_success" | "payment_on_time" | "endorsement" | etc.
    value: Number,         // +1, +5, -1, etc.
    source: String,        // "corpID" | "wallet" | "twinOS" | "sutar" | "agentOS"
    evidence: String,      // Reference to evidence (transaction ID, etc.)
    at: String
  }],
  
  lastUpdated: String,
  history: [{
    score: Number,
    at: String,
    reason: String
  }]
}

// Trust dimensions and their weights
const TRUST_DIMENSIONS = {
  identity:    { weight: 0.15, sources: ['corpID'], description: 'Identity verification level' },
  behavioral: { weight: 0.20, sources: ['corpID'], description: 'Login patterns, auth behavior' },
  financial:  { weight: 0.20, sources: ['wallet', 'sutar'], description: 'Payment history, transaction trust' },
  social:     { weight: 0.10, sources: ['twinOS', 'corpID'], description: 'Endorsements, relationship strength' },
  business:   { weight: 0.15, sources: ['sutar', 'twinOS'], description: 'B2B reputation, contract compliance' },
  agent:      { weight: 0.20, sources: ['agentOS', 'corpID'], description: 'Decision quality, delegation fulfillment' }
};

// Overall score = weighted sum of all dimensions
function computeOverallTrustScore(trustDimensions) {
  return Object.entries(trustDimensions)
    .reduce((total, [dim, data]) => 
      total + (data.score * TRUST_DIMENSIONS[dim]?.weight || 0), 0);
}
```

**Task 5.1.2 — Trust Aggregation endpoints**
```
GET  /api/trust/score/:corpId                    Get overall trust score (existing)
GET  /api/trust/score/:corpId/dimensions         Get all dimensions
GET  /api/trust/score/:corpId/dimensions/:dim    Get specific dimension
PUT  /api/trust/score/:corpId/dimensions/:dim     Update dimension (by authorized service)

POST /api/trust/score/:corpId/refresh             Recompute overall score from dimensions
GET  /api/trust/score/:corpId/history             Get full trust history (all dimensions)
GET  /api/trust/score/:corpId/signal             Get all trust signals

POST /api/trust/score/:corpId/signal             Add a trust signal (internal services only)
```

**Task 5.1.3 — Trust aggregation from existing services**
```javascript
// Trust Intelligence aggregates from:
// 1. CorpID (identity, behavioral) — direct
// 2. REZ Wallet (financial) — HTTP call to port 4004
// 3. TwinOS (social) — HTTP call to port 4705
// 4. SUTAR Contract OS (business) — HTTP call to port 4292
// 5. AgentOS (agent quality) — HTTP call to port 4802

async function aggregateTrust(corpId) {
  const dimensions = {};
  
  // 1. Identity dimension (from CorpID)
  const corpIdRecord = await TrustScore.findOne(corpId);
  dimensions.identity = { score: corpIdRecord?.score || 50, source: 'corpID' };
  
  // 2. Financial dimension (from REZ Wallet)
  try {
    const walletTrust = await fetch(`${WALLET_URL}/api/trust/${corpId}`);
    dimensions.financial = { score: walletTrust.score, source: 'wallet' };
  } catch { dimensions.financial = { score: 50, source: 'wallet', stale: true }; }
  
  // 3. Social dimension (from TwinOS endorsements)
  try {
    const endorsementCount = await fetch(`${TWINOS_URL}/api/twins/${corpId}/endorsements/count`);
    dimensions.social = { score: Math.min(100, endorsementCount * 10), source: 'twinos' };
  } catch { dimensions.social = { score: 50, source: 'twinos', stale: true }; }
  
  // 4. Business dimension (from SUTAR Contract OS)
  try {
    const contractCompliance = await fetch(`${SUTAR_URL}/api/contracts/trust/${corpId}`);
    dimensions.business = { score: contractCompliance.score, source: 'sutar' };
  } catch { dimensions.business = { score: 50, source: 'sutar', stale: true }; }
  
  // 5. Agent dimension (from AgentOS)
  if (corpId.startsWith('CI-AGT-')) {
    try {
      const agentQuality = await fetch(`${AGENTOS_URL}/api/agents/${corpId}/quality`);
      dimensions.agent = { score: agentQuality.score, source: 'agentOS' };
    } catch { dimensions.agent = { score: 50, source: 'agentOS', stale: true }; }
  }
  
  return dimensions;
}
```

### 5.2 Identity Memory

**Problem:** Trust history is a 50-entry array. CorpID has no temporal memory. MemoryOS (ports 4703, 4782-4789) has the infrastructure — it just needs to be wired.

**Task 5.2.1 — MemoryOS Integration design**
```javascript
// CorpID emits identity events to MemoryOS
const IDENTITY_EVENT_TYPES = {
  'agent.created':       'agent_passport_created',
  'agent.updated':       'agent_passport_updated',
  'agent.suspended':     'agent_passport_suspended',
  'agent.revoked':       'agent_passport_revoked',
  'delegation.created':  'delegation_granted',
  'delegation.revoked':  'delegation_revoked',
  'delegation.expired':  'delegation_expired',
  'trust.updated':       'trust_score_changed',
  'relationship.created': 'relationship_established',
  'relationship.ended':  'relationship_terminated',
  'workload.registered': 'workload_identity_registered',
  'workload.rotated':   'workload_credentials_rotated',
  'session.created':     'session_started',
  'session.terminated':  'session_ended'
};

// Example memory event
async function emitIdentityEvent(corpId, eventType, data) {
  const memoryEvent = {
    entityId: corpId,
    eventType: IDENTITY_EVENT_TYPES[eventType] || eventType,
    timestamp: new Date().toISOString(),
    data,
    source: 'corpID',
    tags: ['identity', 'audit']
  };
  
  await fetch(`${MEMORYOS_URL}/api/memory/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memoryEvent)
  });
}
```

**Task 5.2.2 — MemoryOS Integration endpoints**
```
GET  /api/identity/:corpId/memory           Query identity memory timeline
GET  /api/identity/:corpId/memory/search   Search memory by event type, date range
POST /api/identity/:corpId/memory/annotate  Add human annotation to memory
```

**Task 5.2.3 — Trust Memory Timeline**
```javascript
// When trust score changes, write to MemoryOS
async function onTrustScoreChange(corpId, oldScore, newScore, reason) {
  await emitIdentityEvent(corpId, 'trust.updated', {
    oldScore, newScore, delta: newScore - oldScore, reason
  });
  
  // Also store in local history (backup)
  await TrustScoreHistory.create({
    corpId, oldScore, newScore, delta: newScore - oldScore,
    reason, at: new Date().toISOString()
  });
}
```

### 5.3 Phase 5 Tests

**Task 5.3.1 — Trust Intelligence tests (20 tests)**
```
- Get overall score from weighted dimensions
- Update individual dimensions
- Aggregate from external services (mocked HTTP calls)
- Handle stale/missing dimensions gracefully
- Trust score refresh
- Signal addition and history
- Weight validation (must sum to 1.0)
```

**Task 5.3.2 — Identity Memory tests (10 tests)**
```
- Emit events on agent lifecycle
- Emit events on delegation lifecycle
- Emit events on relationship lifecycle
- MemoryOS HTTP calls (mocked)
- Memory query and search
- Memory annotation
```

**Deliverables for Phase 5:**
- [ ] Trust Dimension model
- [ ] 6 new trust aggregation endpoints
- [ ] Trust aggregation from 5 external services (Wallet, TwinOS, SUTAR, AgentOS)
- [ ] MemoryOS event emission
- [ ] Memory query endpoints
- [ ] 30 new unit tests (total: 163 tests)

---

## Phase 6 — Federation + Hardening (Week 11-12) ✅ COMPLETE — 2026-06-27

**Goal:** ACP protocol bridge, optional full federation (OIDC/SAML), plaintext storage fix, corpID-cloud gateway activation.

### 6.1 ACP Protocol Bridge

**Problem:** ACP messaging (port 4340) has no CorpID integration. Agents can't verify each other's identity.

**Task 6.1.1 — ACP Identity Verification middleware**
```javascript
// ACP message structure already has senderId
// CorpID adds identity verification to ACP messages

// ACP message enrichment
async function enrichACPMessage(message) {
  const { senderId } = message;
  
  // Verify sender is a valid CorpID
  const entity = await getEntity(senderId);
  if (!entity) {
    throw new Error(`Invalid CorpID in ACP message: ${senderId}`);
  }
  
  // Get trust score for reputation in negotiation
  const trust = await TrustScore.findOne(senderId);
  
  // Get delegation chain if sender is an agent
  let delegationChain = [];
  if (senderId.startsWith('CI-AGT-')) {
    delegationChain = await getDelegationChain(senderId);
  }
  
  return {
    ...message,
    sender: {
      corpId: senderId,
      type: getCorpIdType(senderId),
      name: entity.name,
      trustScore: trust?.score || 50,
      trustLevel: trust?.level || 'bronze',
      delegationChain,
      verified: true,
      verifiedAt: new Date().toISOString()
    }
  };
}
```

**Task 6.1.2 — ACP Bridge endpoints**
```
POST /api/acp/verify-sender       Verify an ACP message sender
GET  /api/acp/entity/:corpId     Get CorpID entity info for ACP context
POST /api/acp/enrich              Enrich an ACP message with CorpID data
```

**Task 6.1.3 — ACP-SUTAR integration**
```javascript
// When SUTAR Decision Engine receives an ACP negotiation,
// enrich with CorpID data for trust-based decision making

// POST /api/acp/enrich
{
  message: {
    type: "QUOTE",
    senderId: "CI-AGT-sales-bot",
    targetId: "CI-AGT-procurement-bot",
    payload: { price: 50000 }
  }
}

// Returns enriched message with sender trust, delegation chain, etc.
```

### 6.2 Optional: Full Federation (OIDC/SAML)

**Task 6.2.1 — OIDC Provider implementation**
```javascript
// CorpID acts as OIDC Provider for enterprise customers
// This allows: Google Workspace, Azure AD, Okta, Auth0, etc. SSO

// OIDC Endpoints
GET  /.well-known/openid-configuration   // OIDC discovery document
GET  /api/federation/oidc/jwks          // JSON Web Key Set
GET  /api/federation/oidc/userinfo      // Get user info (requires token)
POST /api/federation/oidc/token         // Exchange code for tokens
POST /api/federation/oidc/revoke        // Revoke token
```

**Task 6.2.2 — SAML SP implementation**
```javascript
// CorpID as SAML Service Provider
// Allows enterprise customers to use their existing IdP

POST /api/federation/saml/acs            // Assertion Consumer Service
GET  /api/federation/saml/metadata      // SP metadata XML
POST /api/federation/saml/sls           // Single Logout Service
```

**Task 6.2.3 — Verifiable Credentials (Phase 4B — deferred)**
```javascript
// W3C Verifiable Credentials
// Allows entities to present proof of their identity attributes

// Deferred to Phase 6B — requires more research
// Example: Agent presents VC proving it was delegated authority by a human
```

### 6.3 Storage Hardening

**Problem:** Data stored in plaintext JSON files. Not production-hardened.

**Task 6.3.1 — Encrypt at rest**
```javascript
// Option A: Use Node.js crypto (simplest, no new dependencies)
import { createCipheriv, createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = crypto.scryptSync(process.env.STORAGE_ENCRYPTION_KEY, 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('hex'), data: encrypted.toString('hex'), tag: tag.toString('hex') };
}

function decrypt(encrypted) {
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(encrypted.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted.data, 'hex')), decipher.final()]);
  return JSON.parse(decrypted.toString());
}

// Wrap PersistentStore with encryption
// This is a drop-in replacement — no changes to data model needed
```

**Task 6.3.2 — Audit log encryption**
```javascript
// Audit logs are the most sensitive — always encrypt
// Use separate key for audit logs (from secrets-manager port 4420)
```

### 6.4 Activate corpID-cloud Gateway

**Problem:** 21 microservices sit in `corpID-cloud/` unused.

**Task 6.4.1 — Audit what corpID-cloud already has**
```
Action: Read each service in corpID-cloud/
Action: Document what each service does vs what index.persistent.js does
Action: Identify overlap and decide what to keep
```

**Task 6.4.2 — Activate gateway incrementally**
```
Phase 6a: Activate only the non-overlapping services:
  - corpID-cloud/trust/ (advanced trust scoring)
  - corpID-cloud/audit/ (immutable audit logs)
  - corpID-cloud/consent/ (GDPR/DPDP compliance)
  
Phase 6b (Future): Activate remaining services
```

### 6.5 Phase 6 Tests

**Task 6.5.1 — ACP Bridge tests (15 tests)**
```
- Verify valid CorpID in ACP message
- Reject invalid CorpID
- Enrich message with trust score
- Enrich message with delegation chain
- ACP-SUTAR integration (mocked)
```

**Task 6.5.2 — Storage encryption tests (10 tests)**
```
- Encrypt/decrypt roundtrip
- Tamper detection (wrong key, wrong tag)
- Large payload handling
- Key derivation
```

**Deliverables for Phase 6:**
- [ ] ACP Protocol bridge
- [ ] ACP identity verification middleware
- [ ] 3 ACP bridge endpoints
- [ ] OIDC Provider (basic — discovery, JWKS, userinfo)
- [ ] SAML SP (basic — ACS, metadata)
- [ ] Storage encryption (AES-256-GCM)
- [ ] corpID-cloud audit
- [ ] 25 new unit tests (total: 188 tests)

---

## Complete Test Plan

| Phase | Tests Added | Cumulative Total | Coverage Area |
|-------|-----------|-------------------|---------------|
| Phase 1 | 0 | 43 | No behavior change |
| Phase 2 | 26 | 69 | Agent Passports |
| Phase 3 | 31 | 100 | Delegation Engine + Trust + Timeline + Federation |
| Phase 5 | 26 | 126 | Trust Intelligence + Users |
| Phase 6 | 18 | 144 | ACP Bridge + Federation |
| **Total new** | **101** | **144** | |

> **Actual test count (2026-06-28):** 134 vitest tests passing  
> Test files: `agent.test.js` (26), `delegation-trust.test.js` (31), `users-trust.test.js` (26), `auth.test.js` (18), `security-mfa-workload.test.js` (19), `federation-oidc-saml.test.js` (14)  
> **All 6 phases complete** — Delegation chain traversal, Trust dimensions, ACP enrich, OIDC/SAML federation, MemoryOS events  
> Run: `NODE_ENV=test npm test` from `corpID-service/`

### Quick Wins (Day 1 — Completed June 27-28, 2026)

All 6 phases complete with 134 tests passing:

| Phase | Features | Endpoints Added |
|-------|----------|-----------------|
| 3 | Delegation chain, issued/received lists, approve/reject, SUTAR check | 6 |
| 5 | TrustDimension model, multi-dimensional trust, MemoryOS events | 4 |
| 6 | ACP enrich, OIDC/SAML federation, SAML metadata | 10+ |

**Additional test categories needed:**
- Integration tests: CorpID ↔ AgentOS, CorpID ↔ SUTAR, CorpID ↔ MemoryOS (30 tests)
- E2E tests: Full agent lifecycle (register → delegate → transact → audit) (20 tests)
- Security tests: Auth bypass, permission escalation, delegation abuse (25 tests)

**Grand total: 219 tests (planned)**

---

## Complete Endpoint Registry

### Phase 1 (Consolidation — no new endpoints)

### Phase 2 — Agent Passport (10 new endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/agents` | CI-IND | Create agent passport |
| GET | `/api/agents` | CI-IND/AGT | List agents (business-scoped) |
| GET | `/api/agents/:agentId` | Any | Get agent details |
| PUT | `/api/agents/:agentId` | Owner/Admin | Update agent |
| DELETE | `/api/agents/:agentId` | Owner/Admin | Revoke passport |
| POST | `/api/agents/:agentId/suspend` | Owner/Admin | Suspend agent |
| POST | `/api/agents/:agentId/resume` | Owner/Admin | Resume agent |
| GET | `/api/agents/:agentId/permissions` | Any | Get effective permissions |
| POST | `/api/agents/:agentId/permissions` | Owner/Admin | Add permissions |
| POST | `/api/agents/:agentId/budget/reset` | Owner | Reset monthly budget |

### Phase 3 — Delegation Engine (10 new endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/delegations` | CI-IND/AGT | Create delegation |
| GET | `/api/delegations` | Any | List delegations |
| GET | `/api/delegations/:id` | Delegator/Delegate | Get delegation |
| PUT | `/api/delegations/:id` | Delegator | Update (scope narrowing) |
| DELETE | `/api/delegations/:id` | Delegator | Revoke delegation |
| GET | `/api/delegations/chain/:entityId` | Any | Get full chain |
| GET | `/api/delegations/issued` | Any | Delegations I issued |
| GET | `/api/delegations/received` | Any | Delegations I received |
| POST | `/api/delegations/:id/approve` | Delegate | Approve pending |
| POST | `/api/delegations/check` | Service | Check authority (SUTAR) |

### Phase 4 — Workload + Relationship (16 new endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/workloads` | CI-IND/AGT | Register workload |
| GET | `/api/workloads` | Any | List workloads |
| GET | `/api/workloads/:id` | Any | Get workload |
| PUT | `/api/workloads/:id` | Owner | Update workload |
| DELETE | `/api/workloads/:id` | Owner | Deregister |
| POST | `/api/workloads/:id/rotate` | Owner | Rotate credentials |
| POST | `/api/workloads/:id/suspend` | Owner/Admin | Suspend |
| POST | `/api/workloads/:id/resume` | Owner/Admin | Resume |
| POST | `/api/relationships` | Any | Create relationship |
| GET | `/api/relationships` | Any | List relationships |
| GET | `/api/relationships/:id` | Parties | Get relationship |
| PUT | `/api/relationships/:id` | Parties | Update relationship |
| DELETE | `/api/relationships/:id` | Parties | Terminate |
| POST | `/api/relationships/:id/verify` | Target | Verify relationship |
| POST | `/api/relationships/:id/endorse` | Source | Endorse relationship |
| GET | `/api/relationships/graph/:entityId` | Any | Relationship graph |

### Phase 5 — Trust Intelligence + Memory (8 new endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/trust/score/:corpId/dimensions` | Any | All trust dimensions |
| GET | `/api/trust/score/:corpId/dimensions/:dim` | Any | Specific dimension |
| PUT | `/api/trust/score/:corpId/dimensions/:dim` | Service | Update dimension |
| POST | `/api/trust/score/:corpId/refresh` | Any | Recompute overall score |
| GET | `/api/trust/score/:corpId/history` | Any | Full trust history |
| POST | `/api/trust/score/:corpId/signal` | Service | Add trust signal |
| GET | `/api/identity/:corpId/memory` | Any | Query identity memory |
| POST | `/api/identity/:corpId/memory/annotate` | Owner | Annotate memory |

### Phase 6 — ACP + Federation (8 new endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/acp/verify-sender` | ACP Service | Verify ACP sender |
| GET | `/api/acp/entity/:corpId` | ACP Service | Get entity for ACP |
| POST | `/api/acp/enrich` | ACP Service | Enrich ACP message |
| GET | `/.well-known/openid-configuration` | No | OIDC discovery |
| GET | `/api/federation/oidc/jwks` | No | OIDC JWKS |
| GET | `/api/federation/oidc/userinfo` | OIDC Token | Get user info |
| POST | `/api/federation/saml/acs` | IdP | SAML ACS |
| GET | `/api/federation/saml/metadata` | No | SP metadata |

**Grand total: 52 new endpoints across all phases**

---

## File Change Manifest

| Phase | File | Changes |
|-------|------|---------|
| 1 | `src/index.js` | Rename to `src/index.v2-deprecated.js` |
| 1 | `src/index.persistent.js` | Update as main entry point |
| 1 | `corpID-cloud/gateway.js` | Move to `gateway.v4-pending.js` |
| 1 | `package.json` | Update scripts, remove index.js references |
| 1 | AgentOS bridge | Add HTTP client + 2 endpoints |
| 2 | `src/index.persistent.js` | Add Agent model + 10 endpoints + middleware |
| 3 | `src/index.persistent.js` | Add Delegation model + 10 endpoints + logic |
| 4 | `src/index.persistent.js` | Add Workload model + 8 endpoints + Relationship model + 8 endpoints |
| 5 | `src/index.persistent.js` | Add TrustDimension model + MemoryOS integration + 8 endpoints |
| 6 | `src/index.persistent.js` | Add ACP bridge + OIDC/SAML + encryption layer |

---

## Rollback Plan

Each phase is independently deployable:
- Phase 1: Pure consolidation — rollback by reverting file renames
- Phase 2: Agent Passports — if broken, agents fall back to ad-hoc auth
- Phase 3: Delegation — if broken, delegation chains return `authorized: false`
- Phase 4: Workload + Relationship — additive, no breaking changes to existing entities
- Phase 5: Trust Intelligence — additive overlay on existing trust scores
- Phase 6: ACP + Federation — optional features, disabled by default

---

## Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|--------|---------|---------|---------|---------|---------|---------|
| **Tests passing** | 43 | 73 | 98 | 133 | 163 | 188 |
| **New entity types** | 0 | 1 | 1 | 2 | 0 | 0 |
| **New endpoints** | 0 | 10 | 10 | 16 | 8 | 8 |
| **Ecosystem bridges** | 1 | 1 | 1 | 1 | 4 | 2 |
| **Security fixes** | 2 | 0 | 0 | 0 | 0 | 1 |
| **External integrations** | 0 | 1 | 1 | 1 | 4 | 2 |

---

## External Service Dependencies

| Service | Port | Used In | Integration Type |
|---------|------|---------|-----------------|
| AgentOS agent-registry | 4803 | Phase 2 | HTTP (bidirectional) |
| SUTAR Decision Engine | 4290 | Phase 3 | HTTP (CorpID → SUTAR) |
| SUTAR Contract OS | 4292 | Phase 5 | HTTP (CorpID ← SUTAR) |
| REZ Wallet | 4004 | Phase 5 | HTTP (CorpID ← Wallet) |
| TwinOS Hub | 4705 | Phase 4, 5 | HTTP (bidirectional) |
| MemoryOS | 4703 | Phase 5 | HTTP (CorpID → MemoryOS) |
| ACP Messaging | 4340 | Phase 6 | HTTP (ACP → CorpID) |
| Secrets Manager | 4420 | Phase 6 | HTTP (CorpID → Secrets) |

---

## Open Questions (Require User Decision)

1. **v3 vs v4 entry point**: Use `index.persistent.js` (simpler, already wired) for Phases 1-5, activate `corpID-cloud/gateway.js` in Phase 6B. Correct?

2. **AgentOS bridge strategy**: Bridge (keep both systems, sync) vs migrate (move all agent identity to CorpID, deprecate AgentOS agent-registry). Which approach?

3. **Delegation depth limit**: Max 10 levels (prevent loops). Is this the right limit?

4. **Trust dimension weights**: The weights in the plan are defaults. Should businesses be able to customize weights per dimension?

5. **Federation scope for Phase 6**: OIDC + SAML = substantial work. Should federation be deferred to a Phase 7?

---

*CorpID 2.0 — From Identity Service to Identity OS*
*Plan saved at: `.claude/plans/corpid-2-0-complete-roadmap.md`*
