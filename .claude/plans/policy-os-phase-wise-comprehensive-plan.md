# PolicyOS Phase-Wise Comprehensive Upgrade Plan
## From 7.6/10 → 10/10 — Complete Gap Resolution

> **Document Version:** 1.0
> **Author:** Claude Code
> **Date:** June 27, 2026
> **Source:** `companies/HOJAI-AI/platform/flow/policy-os/`
> **Canonical Location:** `.claude/plans/policy-os-phase-wise-comprehensive-plan.md`

---

## Executive Summary

PolicyOS is a well-engineered ABAC + policy composition engine (7.6/10). The codebase has **47 endpoints**, **14 operators**, **AST-based safe expression evaluator**, **multi-strategy approvals**, **5 composition modes**, and **file-backed persistence with AES-256-GCM encryption**. The gaps are in **depth** — governance layers, cryptographic integrity, ecosystem integration, and operational automation.

This plan resolves every identified gap across **10 phases**, targeting **10/10** production readiness.

---

## Critical Bugs (Fix First — Before Any Phase)

These are code-level bugs that exist in the current codebase and must be fixed immediately, regardless of phase order.

### Bug 1: Webhook Test Response Uses Undefined Variable
**File:** `src/routes/webhooks.js:116`
```javascript
// BUG: result is never defined — this line always evaluates to false
res.json({ ok: result.status === 'success', delivery: entry });
```
**Fix:** Replace `result` with `ok`:
```javascript
res.json({ ok, delivery: entry });
```

### Bug 2: Template Literal Not Interpolating
**File:** `src/lib/evaluation.js:129`
```javascript
// BUG: Single quotes prevent variable interpolation
suggestions.push('Contact ${userId} to verify identity');
```
**Fix:** Use backticks:
```javascript
suggestions.push(`Contact ${userId} to verify identity`);
```

---

## Phase 0: Foundation & Integrity (Security Hardening)
### Goal: Fix existing security, storage, and architectural issues
### Priority: CRITICAL — Do before any governance work

#### P0.1: Cryptographic Audit Trail Integrity

| Item | Current | Target |
|------|---------|--------|
| Audit entries | JSONL plain text | SHA-256 hash chain per tenant |

**Implementation:**
- Add `previousHash` field to every audit entry — SHA-256 of `(previousEntry.hash + JSON.stringify(entry))`
- Add `hashAlgorithm`, `entryVersion` fields to every entry
- On startup, validate hash chain integrity. Log tamper detection.
- Add `GET /api/audit/verify` endpoint that validates the chain and returns integrity status
- Store chain metadata (firstEntryHash, entryCount, lastHash) in a separate `audit-chain.json`
- Archive daily → `archives/audit-YYYY-MM-DD.jsonl` with integrity seal

**File:** `src/services/audit-chain.js` (new)
```javascript
// New service: tamper-evident audit chain
export async function appendAuditEntry(entry, store) {
  const chainMeta = await store.get('__chain__') || { lastHash: null, count: 0 };
  const entryJson = JSON.stringify(entry);
  const hashInput = (chainMeta.lastHash || 'GENESIS') + entryJson;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  const sealedEntry = { ...entry, previousHash: chainMeta.lastHash, hash, entryVersion: 1 };
  await store.set(entry.id, sealedEntry);
  await store.set('__chain__', { lastHash: hash, count: chainMeta.count + 1 });
  return sealedEntry;
}

export async function verifyAuditChain(store) {
  // Walk chain forward, recompute each hash, compare with stored
  // Returns { valid: boolean, brokenAt?: string, checked: number }
}
```

#### P0.2: At-Rest Encryption for All Sensitive Fields

| Item | Current | Target |
|------|---------|--------|
| API keys | Stored as-is in `api-keys.json` | Encrypted with AES-256-GCM |
| Approval metadata | Stored as-is | Encrypted |
| Webhook secrets | Hashed with HMAC-SHA256 on delivery | Encrypted at rest |
| Service tokens | In-memory only | Optionally encrypted |

**Implementation:**
- Change `apiKeys` PersistentStore to use `encryptFields: ['key']`
- Change `webhooks` PersistentStore to use `encryptFields: ['secret']`
- Change `approvals` PersistentStore to use `encryptFields: ['metadata']`
- Add `PERSISTENT_STORE_KEY` env var requirement with 32-byte key generation script
- Update `scripts/generate-encryption-key.js` to produce cryptographically random keys
- Add startup warning if encryption key is not set

#### P0.3: Redis EventBus (Replace StubEventBus)

| Item | Current | Target |
|------|---------|--------|
| EventBus | `StubEventBus` (in-memory, logs to console) | Real Redis pub/sub via `@rtmn/shared` |
| Audit persistence | Appends to JSONL file only | Redis pub/sub + persistent JSONL |
| Webhook events | Via StubEventBus.publish() | Real Redis pub/sub |

**Implementation:**
- Update `src/services/events.js` to import `EventBus` from `@rtmn/shared/lib/eventbus`
- Keep `StubEventBus` as test-only (via `_setBusForTesting`)
- Add Redis connection URL via `REDIS_URL` env var
- Add connection retry with exponential backoff
- When Redis is unavailable: fall back to in-memory + JSONL write (current behavior)
- Update webhook firing to use Redis pub/sub topic `policyos:audit:*`

#### P0.4: API Key Security Hardening

| Item | Current | Target |
|------|---------|--------|
| Key format | `pk_${uuid}${uuid}` | `pk_${32-byte-random-hex}` with checksum |
| Expiry enforcement | `expiresAt` stored, not enforced on auth | Enforce in `createCustomAuth` |
| Revocation list | Not implemented | Bloom filter + persistent revoked-keys store |
| Key rotation | Not implemented | Rotation endpoint with grace period |

**Implementation:**
- Replace `generateApiKey()` with: `pk_${crypto.randomBytes(24).toString('hex')}`
- Add `revokedKeys` PersistentStore
- In `createCustomAuth`, check `revokedKeys` before accepting a key
- Add `POST /api/apikeys/:key/rotate` — generates new key, old key valid for 24h grace period
- Add `POST /api/apikeys/revoke-all` for admin

#### P0.5: JWT Algorithm Upgrade Path

| Item | Current | Target |
|------|---------|--------|
| JWT algorithm | HS256 only (symmetric) | RS256/ES256 (asymmetric) with HS256 fallback |
| Token rotation | Not implemented | Refresh token + rotation endpoint |
| Audience validation | Not implemented | `aud` claim validation against `POLICYOS_AUDIENCE` |

**Implementation:**
- Add `JWT_PUBLIC_KEY` and `JWT_PRIVATE_KEY` env vars (PEM format)
- If RS256 keys present: sign new tokens with RS256, verify with public key
- Keep HS256 as fallback for existing tokens during migration window
- Add `aud` claim validation in `verifyToken()`
- Add `POST /api/tokens/refresh` endpoint

#### P0.6: Rate Limit Per-Tenant Isolation

| Item | Current | Target |
|------|---------|--------|
| Rate limits | Global (all tenants share limit) | Per-tenant rate limits |
| Burst handling | None | Token bucket per tenant |

**Implementation:**
- Add `tenantId` extraction to all rate limiters
- Key rate limit buckets by `${tenantId}:${endpoint}` instead of just IP
- Add `POLICYOS_TENANT_RATE_LIMIT` env var (default: 100/min)
- Add `GET /api/admin/rate-limits` to inspect per-tenant usage

#### P0.7: Input Sanitization & Injection Prevention

| Item | Current | Target |
|------|---------|--------|
| Policy names | Allowed to contain any chars | Sanitize to printable ASCII + safe Unicode |
| Webhook URLs | Allowed without validation | URL validation (no `javascript:`, no internal IPs) |
| Expression length | 1000 char limit | 1000 char + sanitized (no control chars) |

**Implementation:**
- Add `sanitizePolicyId()` — alphanumeric + hyphens only, max 64 chars
- Add `validateWebhookUrl()` — must be HTTPS (except localhost in dev), no internal IP ranges
- Add `sanitizeExpression()` — strip control characters, validate charset
- Add request body scanning middleware for prototype pollution (`__proto__`, `constructor`)

---

## Phase 1: RBAC v2 — Enterprise Role Management
### Goal: From flat RBAC to hierarchical, constrained, auditable roles

### P1.1: Role Attribute Constraints

| Gap | Implementation |
|-----|----------------|
| Roles have no attribute constraints | Add `conditions` field to roles |
| No time-bound role grants | Add `validFrom` / `validUntil` to role assignments |

**Schema addition to roles:**
```javascript
{
  name: 'manager',
  description: 'Department manager',
  permissions: ['policies:read', 'policies:write'],
  scope: 'department',
  conditions: {
    // Can only exercise this role within these constraints
    'context.department': { in: ['IT', 'Operations', 'Finance'] },
    'context.environment': { eq: 'production' },
  },
  validFrom: '2026-01-01T00:00:00Z',
  validUntil: '2026-12-31T23:59:59Z',
  delegation: {
    allowed: true,
    maxDepth: 2,       // Can delegate to 2 levels
    requireApproval: true,
  },
  hierarchy: {
    inheritsFrom: ['staff'],
    priority: 50,
  },
}
```

**New endpoints:**
- `PATCH /api/roles/:role/constraints` — update role conditions
- `POST /api/roles/:role/delegate` — delegate role to another user
- `GET /api/roles/delegations` — list active delegations
- `POST /api/roles/:role/revoke-delegation/:userId` — revoke delegation
- `GET /api/roles/:role/effective-permissions/:userId` — compute inherited perms

### P1.2: Role Hierarchy & Inheritance

**Implementation:**
- Add `hierarchy.inheritsFrom[]` to roles (e.g., `manager` inherits all from `staff`)
- Implement `computeEffectivePermissions(userId)` that walks the inheritance chain
- Detect circular inheritance (throw error on cycle)
- Add `GET /api/roles/:role/hierarchy` — show inheritance tree

### P1.3: Role Overlap Detection

**Implementation:**
- Add `POST /api/roles/check-overlap` — check if two users have conflicting permissions
- Add automatic conflict detection when assigning a role to a user who already has a conflicting role
- Add `role.conflictsWith[]` — explicit conflict declarations
- Add `GET /api/admin/role-conflicts` — admin view of all active conflicts

### P1.4: Temporary Role Elevation (Break-Glass)

**Implementation:**
- Add `POST /api/roles/elevate` — temporary elevation to higher role
- Requires reason, auto-expires after configurable window (default: 1h)
- All elevation events logged to audit chain with cryptographic seal
- Requires approval from existing admin (sequential workflow)
- Webhook fired on every elevation: `role.elevated`

---

## Phase 2: ABAC v2 — Rich Attribute System
### Goal: Full attribute lifecycle, discovery, and templates

### P2.1: Attribute Discovery API

**New endpoints:**
- `GET /api/attributes` — list all attribute types available
- `GET /api/attributes/:domain` — list attributes for a domain (user, resource, action, environment, context)
- `GET /api/attributes/values/:attributePath` — list known values for an attribute

**Attribute schema:**
```javascript
{
  path: 'context.user.department',
  type: 'string',
  domain: 'user',
  allowedValues: ['IT', 'Operations', 'Finance', 'Sales', 'HR'],
  required: false,
  description: 'User department for policy matching',
  sources: ['workforce-os', 'corp-id'],
  lastUpdated: '2026-06-01T00:00:00Z',
}
```

### P2.2: Reusable Condition Templates

**New store:** `condition-templates.json`

**Schema:**
```javascript
{
  id: 'tpl-high-value-transaction',
  name: 'High Value Transaction',
  description: 'Matches transactions above threshold',
  parameters: ['threshold', 'currency'],
  template: {
    'context.amount': { gt: 'params.threshold' },
    'context.currency': { eq: 'params.currency' },
  },
  category: 'financial',
  tags: ['threshold', 'amount'],
}
```

**New endpoints:**
- `POST /api/condition-templates` — create template
- `GET /api/condition-templates` — list templates
- `POST /api/condition-templates/:id/instantiate` — fill parameters, return condition object
- `POST /api/policies/from-template` — create policy from template

### P2.3: Dynamic Attribute Policy Engine

**Implementation:**
- Add `attribute-policies.json` store — policies that govern attribute values themselves
- Example: "user.department can only be set by workforce-os"
- Add `evaluateAttributePolicy(subject, attribute, proposedValue)` function
- Prevents attribute spoofing in context objects

### P2.4: Natural Language Policy Authoring

**New endpoint:** `POST /api/policies/from-description`

**Implementation:**
- Takes a natural language description: "Block payments if trust score is below 50 unless the user is VIP"
- Calls LLM (via Genie AI or AI Intelligence) to convert to policy JSON
- Returns proposed policy for review and approval
- Add `POST /api/policies/translate` — convert policy JSON back to natural language

### P2.5: Natural Language Explanation of Decisions

**Implementation:**
- Extend `evaluatePolicy()` to return an `explanation` field
- Use LLM to generate human-readable explanation of which rule matched and why
- Add `POST /api/policies/explain` — given a policy + context, return natural language explanation
- Add `explanationFormat` param to `/api/policies/evaluate` — `brief` | `detailed` | `technical`

---

## Phase 3: ReBAC — Relationship-Based Access Control
### Goal: From 0.5/10 to 9/10 — Graph-based authorization

### P3.1: Relationship Graph Store

**New service:** `src/services/relationship-graph.js`

**Storage schema:**
```javascript
// relationships.json
{
  "subj:u-admin": [
    { rel: "IS_ADMIN_OF", obj: "org:rtmn", depth: 0, since: "2026-01-01T..." },
    { rel: "CAN_MANAGE", obj: "dept:IT", depth: 1, since: "2026-01-01T..." },
  ],
  "subj:u-manager": [
    { rel: "IS_MANAGER_OF", obj: "dept:IT", depth: 0, since: "2026-01-01T..." },
  ],
}
```

**Relationship types (initial set):**
```
IS_OWNER_OF          — direct ownership
IS_ADMIN_OF          — administrative control
IS_MANAGER_OF        — management hierarchy
CAN_MANAGE           — can manage a resource
CAN_VIEW             — read access
CAN_EDIT             — write access
CAN_DELETE           — delete access
IS_COLLEAGUE_OF      — same department
IS_PEER_OF           — same team level
REPORTS_TO           — org chart relationship
HAS_ACCESS_TO        — granted access
IS_MEMBER_OF         — team/group membership
CAN_DELEGATE         — can delegate their access
```

### P3.2: Relationship Traversal Engine

**New function:** `evaluateRelationshipPath(subject, relationship, object, maxDepth = 3)`

**Algorithm:**
1. BFS traversal from subject through relationship graph
2. Find paths up to `maxDepth` from subject to object
3. Return `{ allowed: boolean, paths: Path[], matchedRelationship: string }`

**Example:** "Can u-manager access doc-123?"
```
u-manager → IS_MANAGER_OF → dept:IT → HAS_ACCESS_TO → doc-123
u-manager → CAN_MANAGE → dept:IT → CAN_VIEW → doc-123
```

### P3.3: ReBAC Integration with Policy Evaluation

**Implementation:**
- Add `context.relationships[]` to evaluation context — precomputed relationships for the subject
- Add `evaluateRelationship(relationshipType, objectId)` in expression evaluator
- New ABAC operator: `reachable` — checks if subject can reach object via relationship graph
- Add `pol-rebac-ownership` seeded policy: "A user can access a resource if they are reachable via HAS_ACCESS_TO within 2 hops"

**New seeded policies:**
```javascript
{
  id: 'pol-rebac-ownership',
  name: 'Relationship-Based Ownership',
  category: 'security',
  priority: 95,
  rules: [
    {
      if: {
        'context.relationship': 'IS_OWNER_OF',
        'context.objectId': { exists: true },
        'context.maxDepth': { lte: 1 },
      },
      then: { allow: true, action: 'allow_ownership_access' }
    },
    {
      if: {
        'context.relationship': 'CAN_VIEW',
        'context.objectId': { exists: true },
        'context.maxDepth': { lte: 2 },
      },
      then: { allow: true, action: 'allow_relationship_access' }
    },
  ],
}
```

### P3.4: Relationship Sync with External Systems

**Implementation:**
- Add `POST /api/relationships/sync/:source` — sync relationships from external system
- Supported sources: `workforce-os` (org chart), `corp-id` (department membership), `twinos` (twin ownership)
- Background job: periodic sync every 5 minutes
- Add `GET /api/relationships/:subjectId` — list all relationships for a subject
- Add `DELETE /api/relationships/:subjectId/:relationship/:objectId` — remove a relationship

### P3.5: ReBAC Policy Composition

**Implementation:**
- Add `evaluateReBACPolicy(policy, context)` that computes relationship graph on-the-fly
- Support hybrid policies: ABAC conditions + ReBAC relationship checks
- Add `composition.rebacMode: "require_relationship"` — composition member must pass relationship check

---

## Phase 4: AI Governance — Constitutional AI Framework
### Goal: From 3/10 to 9/10 — Production AI governance

### P4.1: AI Model Registry

**New store:** `ai-models.json`

**Schema:**
```javascript
{
  id: 'gemini-2-5-pro',
  name: 'Google Gemini 2.5 Pro',
  provider: 'google',
  version: '2.5-pro',
  capabilities: ['text', 'vision', 'code', 'reasoning'],
  riskLevel: 'medium',         // low | medium | high | critical
  governanceTier: 2,            // 1=experimental, 2=standard, 3=restricted
  approvedActions: ['ai.analyze', 'ai.summarize', 'ai.classify'],
  requiresHumanReview: ['ai.decide', 'ai.recommend'],
  blockedActions: ['ai.inject_prompt', 'ai.override_policy'],
  lastAudited: '2026-06-01T00:00:00Z',
  auditFrequency: 'monthly',
  alignmentTests: {
    policyViolationRate: 0.002,   // 0.2%
    biasScore: 0.95,
    lastTestDate: '2026-06-01T00:00:00Z',
  },
}
```

**New endpoints:**
- `POST /api/ai-models` — register a model
- `GET /api/ai-models` — list models with filters
- `GET /api/ai-models/:id` — model details
- `PATCH /api/ai-models/:id` — update model (version bump, risk reassessment)
- `DELETE /api/ai-models/:id` — deprecate model
- `POST /api/ai-models/:id/audit` — run alignment tests

### P4.2: AI Output Validation Hooks

**Implementation:**
- Add `outputValidationPolicies` store
- Hook into `evaluatePolicy()` — after AI action, validate output against `outputValidationPolicies`
- Validation types: `format` (JSON/text structure), `safety` (harmful content scan), `bias` (demographic parity), `fidelity` (matches input intent)

**New seeded policies:**
```javascript
{
  id: 'pol-ai-output-validation',
  name: 'AI Output Validation',
  category: 'ai',
  priority: 100,
  rules: [
    {
      if: { 'context.action': { startsWith: 'ai.' } },
      then: {
        allow: true,
        onAllow: {
          validateOutput: true,
          validationTypes: ['safety', 'format'],
          maxToxicity: 0.1,
          blockOnValidationFailure: true,
        }
      }
    },
  ],
}
```

### P4.3: Bias & Fairness Detection

**Implementation:**
- Add `biasDetector` service with configurable fairness metrics
- Metrics: demographic parity, equalized odds, individual fairness, counterfactual fairness
- Add `POST /api/ai-models/:id/test-fairness` — run bias tests
- Store bias audit results in `ai-model-audits.json`
- If bias score drops below threshold → auto-block model actions, alert admins

### P4.4: AI Constitutional Clauses

**New store:** `ai-constitutions.json`

**Schema:**
```javascript
{
  id: 'constitution-ai-rights',
  name: 'AI Bill of Rights Alignment',
  version: 1,
  clauses: [
    {
      id: 'clause-1',
      principle: 'Do no harm',
      rule: {
        'context.action': { notIn: ['ai.inject_prompt', 'ai.override_policy', 'ai.discriminate'] },
      },
      severity: 'critical',
      enforcement: 'block',
    },
    {
      id: 'clause-2',
      principle: 'Transparent decisions',
      rule: {
        'context.aiModel.governanceTier': { gte: 2 },
      },
      severity: 'high',
      enforcement: 'require_explanation',
    },
    {
      id: 'clause-3',
      principle: 'No sensitive attribute discrimination',
      rule: {
        'context.output.demographicParityDelta': { lte: 0.05 },
      },
      severity: 'critical',
      enforcement: 'block',
    },
  ],
  violationsLog: [],
}
```

**New endpoints:**
- `POST /api/constitutions` — create constitution
- `GET /api/constitutions` — list constitutions
- `POST /api/constitutions/:id/evaluate` — check if action violates constitution
- `GET /api/constitutions/:id/violations` — list all-time violations
- `POST /api/constitutions/:id/violations/:violationId/resolve` — resolve violation

### P4.5: AI Alignment Testing Pipeline

**Implementation:**
- Add `alignment-tests.json` store with test cases per model
- Test types: `policy_violation`, `bias`, `prompt_injection`, `jailbreak`, `output_format`
- Scheduled nightly: run all alignment tests against all registered models
- Score: `alignmentScore = 1 - (failedTests / totalTests)`
- If `alignmentScore < 0.95` → model auto-flagged, notifications sent

**New endpoint:** `POST /api/ai-models/:id/run-alignment-tests`

---

## Phase 5: Agent Trust & Reputation System
### Goal: From 1/10 to 9/10 — Multi-dimensional agent trust

### P5.1: Agent Identity Registry

**New store:** `agent-identities.json`

**Schema:**
```javascript
{
  id: 'agent-payment-processor-001',
  name: 'Payment Processor Alpha',
  type: 'merchant',          // consumer | merchant | system | partner
  ownerId: 'u-admin',
  capabilities: ['payment.process', 'refund.initiate', 'fraud.detect'],
  registeredAt: '2026-01-15T10:00:00Z',
  lastActiveAt: '2026-06-27T08:00:00Z',
  status: 'active',         // active | suspended | revoked | compromised
  attestation: {
    provider: 'corp-id',
    attestationId: 'att-12345',
    verifiedAt: '2026-01-15T10:00:00Z',
  },
  revocation: {
    reason: null,
    revokedAt: null,
    revokedBy: null,
  },
}
```

**New endpoints:**
- `POST /api/agents` — register agent identity
- `GET /api/agents` — list agents
- `GET /api/agents/:id` — agent details
- `PATCH /api/agents/:id` — update agent metadata
- `POST /api/agents/:id/revoke` — revoke agent (compromised/failed)
- `GET /api/agents/:id/capabilities` — list agent capabilities

### P5.2: Multi-Dimensional Trust Scoring

**New store:** `agent-trust-scores.json`

**Trust dimensions:**
```javascript
{
  agentId: 'agent-payment-processor-001',
  overall: 87.5,
  dimensions: {
    competence: { score: 92, evidence: 150, trend: 'stable' },
    reliability: { score: 88, evidence: 500, trend: 'improving' },
    benevolence: { score: 95, evidence: 200, trend: 'stable' },
    integrity: { score: 85, evidence: 80, trend: 'declining' },
    safety: { score: 78, evidence: 50, trend: 'declining' },   // ⚠️ declining
  },
  lastUpdated: '2026-06-27T08:00:00Z',
  updateFrequency: 'hourly',
  history: [
    { date: '2026-06-26', overall: 88.2 },
    { date: '2026-06-25', overall: 89.1 },
  ],
}
```

**Scoring algorithm:**
```
overall = (competence × 0.25) + (reliability × 0.25) + (benevolence × 0.2) + (integrity × 0.2) + (safety × 0.1)
```

**Evidence types:** completed_actions, policy_violations, false_negatives, false_positives, response_times, uptime

### P5.3: Trust Engine Integration (SADA OS Bridge)

**Implementation:**
- Add `src/services/trust-engine-bridge.js`
- Call SADA OS (port 4190) for external trust verification
- Combine PolicyOS trust scores with SADA OS trust scores
- Add `context.agent.trustScore` pre-populated from Trust Engine before evaluation

**New endpoint:** `GET /api/agents/:id/trust` — full trust report with dimensions

### P5.4: Agent Capability Attestation

**Implementation:**
- Add `agent-attestations.json` store
- Agents must get their capabilities attested by a trusted party (e.g., admin, SADA OS)
- Attestation types: `self` | `admin` | `third_party` | `automated`
- Policy can require attested capabilities: `"context.agent.capabilities": { requiresAttestation: true }`

### P5.5: Trust-Based Policy Actions

**New seeded policy:**
```javascript
{
  id: 'pol-agent-trust-gating',
  name: 'Agent Trust Gating',
  category: 'security',
  priority: 99,
  rules: [
    {
      if: {
        'context.agent.overallTrust': { lt: 50 },
      },
      then: { allow: false, action: 'block_low_trust_agent' }
    },
    {
      if: {
        'context.agent.overallTrust': { lt: 70 },
        'context.action': { startsWith: 'payment.' },
      },
      then: { allow: false, action: 'require_human_approval_for_payment' }
    },
    {
      if: {
        'context.agent.status': { eq: 'suspended' },
      },
      then: { allow: false, action: 'block_suspended_agent' }
    },
    {
      if: {
        'context.agent.status': { eq: 'compromised' },
      },
      then: { allow: false, action: 'block_compromised_agent' }
    },
  ],
}
```

### P5.6: Agent Revocation & Compromise Response

**Implementation:**
- Add `POST /api/agents/:id/revoke` with reason (`compromised` | `failed_alignment` | `policy_violation`)
- Immediate: agent blocked from all policy evaluations
- Webhook fired: `agent.revoked`
- All active sessions invalidated
- Audit chain entry with cryptographic seal
- Add `GET /api/agents/:id/revocation-history`

---

## Phase 6: Memory Governance
### Goal: From 1.5/10 to 9/10 — Complete memory lifecycle governance

### P6.1: Memory Access Policies

**New store:** `memory-policies.json`

**Schema:**
```javascript
{
  id: 'mpol-employee-memory-access',
  name: 'Employee Memory Access Control',
  category: 'memory',
  priority: 90,
  rules: [
    {
      if: {
        'context.memory.type': 'employee_personal',
        'context.requester.role': 'manager',
        'context.memory.owner': { neq: 'context.requester.id' },
      },
      then: { allow: false, action: 'deny_manager_personal_memory' }
    },
    {
      if: {
        'context.memory.type': 'employee_work',
        'context.requester.role': { in: ['manager', 'admin'] },
      },
      then: { allow: true, action: 'allow_manager_work_memory' }
    },
  ],
  memoryTypes: ['employee_personal', 'employee_work', 'conversation', 'knowledge', 'preference'],
  complianceFrameworks: ['GDPR', 'CCPA'],
}
```

**New endpoints:**
- `POST /api/memory-policies` — create memory access policy
- `GET /api/memory-policies` — list memory policies
- `GET /api/memory-policies/:id` — memory policy detail
- `POST /api/memory-policies/evaluate` — evaluate memory access

### P6.2: Memory Retention Policies

**New store:** `memory-retention.json`

**Schema:**
```javascript
{
  id: 'mret-conversation-90d',
  name: 'Conversation Memory Retention',
  memoryType: 'conversation',
  retentionDays: 90,
  archivingPolicy: 'compress_after_30d',
  deletionPolicy: 'hard_delete_after_90d',
  piiHandling: 'redact_before_archive',
  exceptions: {
    legalHold: true,
    consentExtended: true,
  },
}
```

**New endpoints:**
- `POST /api/memory-retention` — create retention policy
- `GET /api/memory-retention` — list all retention policies
- `POST /api/memory-retention/evaluate-retention` — given a memory, return retention status
- `POST /api/memory-retention/expire` — mark memories for expiration
- `GET /api/memory-retention/due-for-deletion` — list memories past retention

### P6.3: PII Detection & Redaction in Memory Policies

**Implementation:**
- Add `pii-detector.js` — regex + named entity recognition for PII types
- PII types: `email`, `phone`, `ssn`, `credit_card`, `aadhar`, `ip_address`, `name`, `address`, `dob`
- Add `POST /api/memory/scan` — scan a memory for PII
- Add `POST /api/memory/redact` — redact PII from a memory
- Integrate with retention policies: auto-redact before archiving

**PII detection rules:**
```javascript
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+91[-\s]?)?[6-9]\d{9}/g,
  aadhar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ip_address: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
};
```

### P6.4: MemoryOS Integration

**Implementation:**
- Add `src/services/memory-bridge.js`
- Connect to MemoryOS (port 4703) for actual memory data
- Before evaluating memory policies, query MemoryOS for the actual memory content
- Add `POST /api/memory-governance/evaluate` — full memory governance evaluation (access + retention + PII)
- Add `GET /api/memory/:memoryId/governance-status` — comprehensive status

### P6.5: Memory Consent Management

**Implementation:**
- Add `memory-consents.json` store
- Track user consent for memory types: `consentId`, `userId`, `memoryTypes[]`, `grantedAt`, `expiresAt`, `withdrawnAt`
- Add `POST /api/memory-consents` — grant consent
- Add `DELETE /api/memory-consents/:id` — withdraw consent
- Policy engine checks consents before allowing memory access
- GDPR right-to-erasure: `POST /api/memory/forget-user/:userId` — delete all user memories, revoke all consents

---

## Phase 7: Twin Governance
### Goal: From 3/10 to 9/10 — Deep TwinOS integration

### P7.1: TwinOS Real-Time State Verification

**Critical gap:** `pol-twin-sharing` uses `context.ownerConsent` boolean — never verified against TwinOS.

**Implementation:**
- Add `src/services/twinos-bridge.js`
- Connect to TwinOS Hub (port 4705) over HTTP
- Before evaluating twin policies, query TwinOS for actual twin ownership
- Add `getTwinOwnership(twinId)` → returns `{ ownerId, sharedWith[], permissions[] }`

**Updated flow:**
```
evaluatePolicy(context)
  → if context.action.startsWith('twin.')
  → call getTwinOwnership(context.twinId)
  → set context.twinOwner = ownership.ownerId
  → set context.twinSharedWith = ownership.sharedWith
  → set context.ownerConsent = ownership.sharedWith.includes(context.requesterId)
```

### P7.2: Twin Version Governance

**New store:** `twin-version-policies.json`

**Schema:**
```javascript
{
  id: 'tvpol-customer-twin',
  name: 'Customer Twin Version Policy',
  twinType: 'customer',
  rules: [
    {
      if: { 'context.action': 'twin.update' },
      then: {
        allow: true,
        constraints: {
          maxVersions: 50,
          requireChangelog: true,
          autoArchiveAfter: 365,
        }
      }
    },
    {
      if: { 'context.action': 'twin.delete' },
      then: {
        allow: false,
        action: 'require_twin_deletion_approval',
        constraints: {
          gracePeriodDays: 30,
          requireBackup: true,
        }
      }
    },
  ],
}
```

**New endpoints:**
- `GET /api/twin-policies` — list twin version policies
- `POST /api/twin-policies` — create twin version policy
- `GET /api/twins/:twinId/versions` — list twin versions (via TwinOS)
- `POST /api/twins/:twinId/versions/:versionId/restore` — restore old version

### P7.3: Twin Access Audit Trail

**Implementation:**
- Every twin access (read/write/share/delete) logged to audit chain
- Add `GET /api/twins/:twinId/audit-log` — complete access history
- Add `GET /api/twins/:twinId/access-summary` — who has access, when last accessed
- Add `GET /api/users/:userId/twin-access-log` — all twin access by a user

### P7.4: Cross-Twin Relationship Permissions

**New store:** `twin-relationship-policies.json`

**Scenario:** "Can twin-A (customer profile) access twin-B (order history)?"

**Schema:**
```javascript
{
  id: 'trel-customer-order',
  name: 'Customer-Order Relationship Access',
  subjectTwinType: 'customer',
  objectTwinType: 'order',
  relationship: 'owns',           // owns | references | contains | parent_of
  rules: [
    {
      if: { 'context.action': 'twin.read' },
      then: {
        allow: true,
        constraints: { scope: 'own_records_only' }
      }
    },
    {
      if: { 'context.action': 'twin.share' },
      then: {
        allow: false,
        action: 'require_explicit_consent',
        constraints: { consentType: 'data_sharing' }
      }
    },
  ],
}
```

### P7.5: Twin Deletion Governance

**Implementation:**
- Soft delete for twins: `twin.delete` → status changes to `archived`, 30-day grace period
- During grace period: admin can restore
- After grace period: hard delete with cryptographic confirmation
- Legal hold: twins can be placed on legal hold (skips deletion)
- Add `POST /api/twins/:twinId/place-hold` and `POST /api/twins/:twinId/release-hold`
- Add `GET /api/twins/deletion-queue` — twins pending hard deletion

---

## Phase 8: Constitutional/AI Governance — The Top Layer
### Goal: From 0.5/10 to 9/10 — Multi-stakeholder constitutional governance

### P8.1: Constitutional Document Framework

**New store:** `constitutions.json`

**Schema:**
```javascript
{
  id: 'const-org-default',
  name: 'Default Organizational Constitution',
  version: 1,
  domain: 'organizational',    // organizational | ai | data | financial | healthcare
  clauses: [
    {
      id: 'c-001',
      type: 'ethical_boundary',
      principle: 'No discrimination',
      description: 'No AI or human decision shall discriminate based on protected characteristics',
      severity: 'critical',
      policies: ['pol-anti-discrimination', 'pol-fair-hiring'],
      reviewBoard: 'ethics-committee',
      lastReviewed: '2026-06-01T00:00:00Z',
      reviewFrequency: 'quarterly',
    },
    {
      id: 'c-002',
      type: 'human_oversight',
      principle: 'Human-in-the-loop for critical decisions',
      description: 'AI decisions with > $10,000 impact require human approval',
      severity: 'high',
      policies: ['pol-high-value-approval'],
      reviewBoard: 'leadership',
      lastReviewed: '2026-05-01T00:00:00Z',
    },
    {
      id: 'c-003',
      type: 'transparency',
      principle: 'All automated decisions explainable',
      description: 'Any denial of service must provide a reason within 24 hours',
      severity: 'medium',
      policies: ['pol-decision-explanation'],
      reviewBoard: 'legal',
      lastReviewed: '2026-04-01T00:00:00Z',
    },
  ],
  multiStakeholderApprovals: [
    { clauseType: 'ethical_boundary', requiredBoards: ['ethics-committee', 'legal'] },
    { clauseType: 'financial', requiredBoards: ['finance', 'audit'] },
  ],
  amendmentProcess: {
    proposedBy: ['admin', 'ethics-committee', 'board'],
    requiresApprovalFrom: ['ethics-committee', 'legal', 'admin'],
    votingPeriod: 14,          // days
    quorumPercent: 66,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-27T00:00:00Z',
}
```

### P8.2: Multi-Stakeholder Review Workflows

**Implementation:**
- Constitutional changes require multi-board approval
- Boards: `ethics-committee`, `legal`, `finance`, `audit`, `security`, `leadership`, `board`
- Each board has members stored in `constitutional-boards.json`
- Amendment flow: `draft → proposed → voting → approved/rejected → effective`

**New endpoints:**
- `POST /api/constitutions` — create constitution
- `GET /api/constitutions/:id` — constitution detail
- `POST /api/constitutions/:id/amend` — propose amendment
- `POST /api/constitutions/:id/vote` — cast vote
- `GET /api/constitutions/:id/votes` — vote tally
- `GET /api/constitutions/:id/status` — amendment status

### P8.3: Harm Categorization & Severity Framework

**New store:** `harm-categories.json`

**Schema:**
```javascript
{
  categories: [
    {
      id: 'harm-001',
      name: 'Financial Harm',
      severity: 'critical',
      examples: ['unauthorized_payment', 'fraud', 'money_laundering'],
      responseSLA: 'immediate',  // immediate | 1h | 24h | 7d
      escalationPath: ['admin', 'compliance', 'legal', 'regulator'],
      autoActions: ['block_transaction', 'freeze_account', 'alert_compliance'],
    },
    {
      id: 'harm-002',
      name: 'Discrimination',
      severity: 'critical',
      examples: ['bias_in_hiring', 'discriminatory_pricing', 'exclusionary_access'],
      responseSLA: 'immediate',
      escalationPath: ['ethics-committee', 'legal', 'board'],
      autoActions: ['pause_ai_model', 'alert_ethics', 'block_decision'],
    },
    {
      id: 'harm-003',
      name: 'Privacy Violation',
      severity: 'high',
      examples: ['unauthorized_data_access', 'pii_leak', 'consent_violation'],
      responseSLA: '1h',
      escalationPath: ['privacy-officer', 'legal', 'admin'],
      autoActions: ['block_access', 'alert_privacy', 'log_incident'],
    },
  ],
}
```

### P8.4: Automated Ethical Review

**Implementation:**
- Add `src/services/ethical-review-engine.js`
- Triggered on: new constitutional amendment, new AI model registration, high-severity harm events
- Runs automated checks: bias test, discrimination test, privacy impact assessment, fairness audit
- Outputs: `ethicalReviewReport` with pass/fail per clause + recommendations
- If any `critical` severity harm category triggered → immediate human review required

**New endpoint:** `POST /api/ethical-review/run` — manual trigger

### P8.5: AI Bill of Rights Alignment

**Implementation:**
- Map constitutional clauses to specific rights:
  - Right to non-discrimination → `pol-anti-discrimination`
  - Right to explanation → `pol-decision-explanation`
  - Right to human review → `pol-human-in-loop`
  - Right to data minimization → `pol-data-minimization`
  - Right to security → `pol-security-baseline`
- Add automated rights compliance check (runs weekly)
- Add `GET /api/constitutions/:id/rights-compliance` — compliance status per right

---

## Phase 9: Policy Lifecycle Automation & Operational Excellence
### Goal: Close all remaining gaps in lifecycle, composition, and API

### P9.1: Policy Automation Engine

**Implementation:**
- Add `policy-automation-rules.json` store
- Trigger types: `on_time`, `on_event`, `on_metric`, `on_approval`
- Action types: `submit_for_review`, `publish`, `archive`, `retire`, `extend`, `notify`

**Example automation rules:**
```javascript
{
  id: 'auto-retire-expired',
  name: 'Auto-retire expired policies',
  trigger: { type: 'on_time', schedule: 'daily_at_0000' },
  condition: { 'policy.effectiveUntil': { lt: 'now' }, 'policy.status': 'published' },
  action: { type: 'archive', setStatus: 'archived' },
},
{
  id: 'auto-submit-review-draft',
  name: 'Auto-submit draft for review after 7 days',
  trigger: { type: 'on_time', schedule: 'daily_at_0600' },
  condition: { 'policy.status': 'draft', 'policy.createdAt': { lt: 'now_minus_7d' } },
  action: { type: 'notify', notifyAdmins: true, message: 'Draft policy pending review' },
},
{
  id: 'auto-extend-effective',
  name: 'Auto-extend policies near expiration',
  trigger: { type: 'on_metric', metric: 'daysUntilExpiration', threshold: 14 },
  condition: { 'policy.status': 'published' },
  action: { type: 'extend', extendByDays: 30, notifyAdmins: true },
}
```

**New endpoints:**
- `POST /api/automation-rules` — create automation rule
- `GET /api/automation-rules` — list rules
- `POST /api/automation-rules/:id/test` — dry-run automation
- `POST /api/automation-rules/:id/execute` — manual trigger

### P9.2: Policy Import/Export & Templates

**Implementation:**
- Add `policy-templates.json` store
- Add `POST /api/policies/export` — export selected policies as portable JSON/YAML
- Add `POST /api/policies/import` — import policies from JSON/YAML
- Import validates: schema, policy ID uniqueness, circular composition references
- Add `POST /api/policies/clone/:id` — duplicate a policy with new ID

**Export schema:**
```javascript
{
  exportVersion: '1.0',
  exportedAt: '2026-06-27T00:00:00Z',
  policies: [/* full policy objects */],
  roles: [/* role objects referenced by policies */],
  metadata: { exportedBy: 'u-admin', purpose: 'backup' },
}
```

### P9.3: Extended Policy Composition Modes

**Implementation:**
- Add `oneOf` mode: exactly 1 policy must allow
- Add `fallback` mode: try policies in order, use first that applies
- Add `denyIf` mode: deny if this policy applies (useful for overrides)
- Add `priority` mode: highest-priority applicable policy wins

**Updated `evaluateComposition()` signature:**
```javascript
// New composition modes
const EXTENDED_MODES = ['anyOf', 'allOf', 'majority', 'oneOf', 'fallback', 'denyIf', 'priority'];

// oneOf: exactly 1 allows
allowed = allows === 1;

// fallback: first applicable policy wins
for (const mid of memberIds) {
  const mp = policies.get(mid);
  const r = evaluatePolicy(mp, context);
  if (r.allowed || r.matchedRule) return { allowed: r.allowed, fallbackPolicy: mid, memberResults };
}

// denyIf: if any member denies, entire composition denies
for (const mid of memberIds) {
  const mp = policies.get(mid);
  const r = evaluatePolicy(mp, context);
  if (!r.allowed) return { allowed: false, deniedBy: mid, memberResults };
}
return { allowed: true, memberResults };
```

### P9.4: Approval Request Queue (Full Implementation)

**Critical gap:** Approvals exist as workflow definitions, but there's no request queue with delegation, reminders, escalation.

**Implementation:**
- Enhance `approvals` store with full request lifecycle
- Add `delegation` field: `delegatedFrom`, `delegatedTo`, `reason`, `expiresAt`
- Add `reminderSchedule`: cron expression for reminders
- Add `escalationRules`: conditions + escalation targets

**Schema upgrade:**
```javascript
{
  id: 'apr-abc12345',
  policyId: 'pol-shopping-budget',
  requesterId: 'u-customer',
  resource: { type: 'purchase', id: 'pur-999', amount: 8000 },
  strategy: 'sequential',
  status: 'pending',
  requiredApprovers: [
    { id: 'u-manager', status: 'pending', delegatedTo: null, delegatedAt: null },
    { id: 'u-admin', status: 'pending', delegatedTo: null, delegatedAt: null },
  ],
  decisions: [],
  delegation: [
    { from: 'u-manager', to: 'u-admin', reason: 'OOO', expiresAt: '2026-07-01T00:00:00Z' },
  ],
  escalation: {
    rules: [
      { afterHours: 24, escalateTo: 'u-admin', notifyRequester: true },
      { afterHours: 48, escalateTo: 'board', notifyRequester: true, blockResource: true },
    ],
    currentLevel: 0,
  },
  reminders: {
    scheduled: [{ at: '2026-06-28T09:00:00Z', sent: false }],
    sent: [],
  },
  timeline: [],
  context: { /* full evaluation context snapshot */ },
  createdAt: '2026-06-27T00:00:00Z',
  updatedAt: '2026-06-27T00:00:00Z',
}
```

**New endpoints:**
- `POST /api/approvals/:id/delegation` — delegate to another approver
- `POST /api/approvals/:id/remind` — send reminder to pending approvers
- `GET /api/approvals/pending/:approverId` — approvals pending a specific approver
- `POST /api/approvals/:id/cancel` — cancel approval request
- `GET /api/approvals/overdue` — list overdue approvals
- `POST /api/approvals/escalate/:id` — manual escalation

### P9.5: Conditional Approver Routing

**Implementation:**
- Add `conditionalApprovers` to policy schema
- Rules determine which approvers are required based on context

**Schema:**
```javascript
{
  id: 'pol-high-value-purchase',
  approvals: {
    conditionalApprovers: [
      {
        if: { 'context.amount': { gt: 100000 } },
        then: { strategy: 'sequential', requiredApprovers: ['u-cfo', 'u-admin'] }
      },
      {
        if: { 'context.amount': { gt: 50000, lte: 100000 } },
        then: { strategy: 'multi', requiredApprovers: ['u-manager', 'u-director'] }
      },
      {
        if: { 'context.amount': { lte: 50000 } },
        then: { strategy: 'single', requiredApprovers: ['u-manager'] }
      },
    ],
    defaultStrategy: 'single',
    defaultApprovers: ['u-admin'],
  },
}
```

### P9.6: Policy A/B Testing

**Implementation:**
- Add `policy-experiments.json` store
- Traffic split: `experimentPolicy` vs `controlPolicy`
- Metrics tracked: allow_rate, avg_decision_time, denial_rate, user_satisfaction

**New endpoints:**
- `POST /api/experiments` — create A/B experiment
- `GET /api/experiments/:id/results` — experiment metrics
- `POST /api/experiments/:id/promote` — promote winning variant to main policy

### P9.7: Real-Time API (WebSocket / SSE)

**Implementation:**
- Add `GET /api/events/stream` — SSE endpoint for real-time policy events
- Events: `policy.updated`, `approval.created`, `approval.decided`, `agent.trust.changed`, `audit.alert`
- Add `ws://host:4254/events` — WebSocket endpoint with subscription topics
- Client subscribes to topics: `policies`, `approvals`, `audit`, `trust`, `alerts`

---

## Phase 10: Developer Experience & Ecosystem Integration
### Goal: 10/10 — Production-grade developer experience

### P10.1: OpenAPI/Swagger Auto-Generation

**Implementation:**
- Add `swagger-jsdoc` or `openapi-generator` to auto-generate OpenAPI 3.0 spec
- Generate from route definitions and JSDoc comments
- Host at `GET /api/docs` (Swagger UI)
- Host at `GET /api/openapi.json` (raw spec)
- Host at `GET /api/openapi.yaml` (YAML format)

### P10.2: Multi-Language SDK Generation

**Implementation:**
- Generate SDK clients: TypeScript, Python, Java, Go, Ruby
- Use `openapi-generator-cli` to auto-generate from OpenAPI spec
- Publish to npm: `@hojai/policy-os-sdk`
- Add `GET /api/sdk/:language` — download SDK package

### P10.3: Policy Testing Sandbox

**New endpoint:** `POST /api/sandbox/test`

**Implementation:**
- Execute `evaluatePolicy()` in isolated sandboxed context
- No side effects: no audit log, no webhook firing, no metric recording
- Returns full evaluation trace: which rules matched, evaluation time, suggestion quality
- Add `GET /api/sandbox/examples` — pre-built test scenarios

### P10.4: Compliance Report Generator

**Implementation:**
- Add `GET /api/compliance/soc2` — SOC 2 Type II report
- Add `GET /api/compliance/gdpr` — GDPR compliance report
- Add `GET /api/compliance/hipaa` — HIPAA compliance report
- Reports generated from audit chain (cryptographically sealed entries)
- Include: policy coverage, approval SLA compliance, trust scores, harm events

### P10.5: External System Integration Clients

**Implementation:**
- Add integration clients for all external systems PolicyOS depends on:
  - `src/integrations/corp-id.js` — verify user identity
  - `src/integrations/twinos.js` — query twin ownership
  - `src/integrations/memory-os.js` — query memory policies
  - `src/integrations/sada-os.js` — trust score integration
  - `src/integrations/workforce-os.js` — org chart, department membership
- Add health check per integration: `GET /api/health/integrations`
- Add circuit breaker per integration (3 failures → open, 30s half-open → retry)

### P10.6: Policy Version diff

**Implementation:**
- Add `GET /api/policies/:id/diff/:v1/:v2` — diff two policy versions
- Show: added rules, removed rules, changed conditions, changed actions
- Add `GET /api/policies/:id/history` — full version history with diffs
- Use JSON diff algorithm (RFC 6902 JSON Patch format)

### P10.7: Policy Coverage Analyzer

**Implementation:**
- Add `POST /api/analytics/coverage` — analyze action coverage
- Input: list of all possible actions in the system
- Output: which actions have policies, which are fail-closed, coverage percentage
- Identify: over-covered actions (too many policies), under-covered actions (no policies)

---

## Phase Ordering & Dependency Graph

```
Phase 0 (Critical Bugs + Security Hardening)
    ├── P0.1 Cryptographic Audit Chain ──────────────┐
    ├── P0.2 At-Rest Encryption ──────────────────────┼── All subsequent phases
    ├── P0.3 Redis EventBus ─────────────────────────┤   depend on secure
    ├── P0.4 API Key Hardening ──────────────────────┤   foundations
    ├── P0.5 JWT Upgrade ────────────────────────────┤
    ├── P0.6 Per-Tenant Rate Limits ─────────────────┤
    └── P0.7 Input Sanitization ─────────────────────┘

Phase 1 (RBAC v2) ──► Phase 2 (ABAC v2) ──► Phase 3 (ReBAC)
    │                       │                      │
    └───────────────────────┴──────────────────────┘
                          │
Phase 4 (AI Governance) ◄─┘        Phase 5 (Agent Trust)
         │                                │
         └────────────────────────────────┤
                                          │
Phase 6 (Memory Governance) ◄─────────────┘
         │
Phase 7 (Twin Governance) ──► Phase 8 (Constitutional AI)
         │                                 │
         └─────────────────────────────────┘
                          │
Phase 9 (Lifecycle Automation + Approval Queue)
                          │
Phase 10 (Developer Experience + Integration)
```

---

## File Manifest — What Changes Where

### New Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `src/services/audit-chain.js` | P0.1 | Tamper-evident hash chain |
| `src/services/relationship-graph.js` | P3.1 | ReBAC graph storage + traversal |
| `src/services/trust-engine-bridge.js` | P5.3 | SADA OS integration |
| `src/services/memory-bridge.js` | P6.4 | MemoryOS integration |
| `src/services/twinos-bridge.js` | P7.1 | TwinOS integration |
| `src/services/pii-detector.js` | P6.3 | PII detection & redaction |
| `src/services/ethical-review-engine.js` | P8.4 | Automated ethical review |
| `src/services/attribute-registry.js` | P2.1 | Attribute discovery API |
| `src/services/policy-automation-engine.js` | P9.1 | Cron-driven automation |
| `src/integrations/corp-id.js` | P10.5 | CorpID client |
| `src/integrations/sada-os.js` | P10.5 | SADA OS client |
| `src/integrations/workforce-os.js` | P10.5 | Workforce OS client |
| `scripts/generate-encryption-key.js` | P0.2 | Key generation |
| `scripts/migrate-audit-chain.js` | P0.1 | Retroactive chain sealing |

### New Data Stores (JSON files)

| Store | Phase | Purpose |
|-------|-------|---------|
| `audit-chain-meta.json` | P0.1 | Hash chain metadata |
| `ai-models.json` | P4.1 | AI model registry |
| `ai-constitutions.json` | P4.4 | AI constitutional clauses |
| `agent-identities.json` | P5.1 | Agent identity registry |
| `agent-trust-scores.json` | P5.2 | Multi-dimensional trust |
| `agent-attestations.json` | P5.4 | Capability attestations |
| `memory-policies.json` | P6.1 | Memory access policies |
| `memory-retention.json` | P6.2 | Retention schedules |
| `memory-consents.json` | P6.5 | Consent records |
| `condition-templates.json` | P2.2 | Reusable condition templates |
| `twin-version-policies.json` | P7.2 | Twin version governance |
| `twin-relationship-policies.json` | P7.4 | Cross-twin permissions |
| `constitutions.json` | P8.1 | Constitutional documents |
| `constitutional-boards.json` | P8.2 | Board memberships |
| `harm-categories.json` | P8.3 | Harm severity taxonomy |
| `policy-automation-rules.json` | P9.1 | Automation triggers |
| `policy-templates.json` | P9.2 | Policy templates |
| `policy-experiments.json` | P9.6 | A/B experiment tracking |

### Files to Modify

| File | Changes | Phase |
|------|---------|-------|
| `src/services/events.js` | Replace StubEventBus with Redis | P0.3 |
| `src/middleware/auth.js` | Expiry enforcement, revoked key check | P0.4, P0.5 |
| `src/lib/evaluation.js` | Relationship operator, template literal fix | P3, P0.Bug2 |
| `src/routes/webhooks.js` | Bug fix: `result` → `ok` | P0.Bug1 |
| `src/routes/approvals.js` | Full queue: delegation, reminders, escalation | P9.4, P9.5 |
| `src/routes/policies.js` | Import/export, clone, A/B testing, diff | P9.2, P9.6, P10.6 |
| `src/routes/analytics.js` | Coverage analyzer, compliance reports | P10.6, P10.7 |
| `src/index.js` | New stores, new routes, SSE/WebSocket, circuit breakers | All |
| `src/routes/rbac.js` | Role hierarchy, delegation, constraints | P1.1-P1.4 |
| `data/roles.json` | Add constraint/hierarchy fields | P1.1-P1.3 |
| `data/policies.json` | Add governance policies (ReBAC, Agent Trust, etc.) | P3-P8 |

---

## Test Coverage Requirements

| Phase | Tests Required | Target |
|-------|---------------|--------|
| P0 | Bug fixes, audit chain, encryption, Redis | 50 new tests |
| P1 | Role hierarchy, delegation, constraints | 30 new tests |
| P2 | Attribute discovery, templates, NL authoring | 25 new tests |
| P3 | Relationship graph, traversal, hybrid policies | 40 new tests |
| P4 | AI model registry, output validation, constitutions | 35 new tests |
| P5 | Agent trust, revocation, attestation | 30 new tests |
| P6 | Memory policies, retention, PII, consent | 30 new tests |
| P7 | TwinOS bridge, version governance, cross-twin | 30 new tests |
| P8 | Constitutional framework, multi-stakeholder | 25 new tests |
| P9 | Automation, approval queue, composition modes | 35 new tests |
| P10 | SDK, sandbox, compliance, circuit breakers | 20 new tests |
| **Total** | | **350 new tests** |

---

## Rollback Plan

Each phase is independently deployable. Rollback strategy:

| Risk Level | Mitigation |
|-----------|-----------|
| **Low** (bug fixes, tests) | Deploy directly, rollback if tests fail |
| **Medium** (new stores, new endpoints) | Feature flag via `POLICYOS_PHASE_N_ENABLED` env vars |
| **High** (schema changes, breaking API) | Backward-compatible: old clients work, new features gated |
| **Critical** (audit chain, encryption) | Parallel run: new system + old system, compare outputs for 24h |

**Feature flags per phase:**
```bash
POLICYOS_PHASE0_ENABLED=true     # Security hardening
POLICYOS_PHASE1_ENABLED=true     # RBAC v2
POLICYOS_PHASE2_ENABLED=false    # ABAC v2
POLICYOS_PHASE3_ENABLED=false    # ReBAC
POLICYOS_PHASE4_ENABLED=false    # AI Governance
POLICYOS_PHASE5_ENABLED=false    # Agent Trust
POLICYOS_PHASE6_ENABLED=false    # Memory Governance
POLICYOS_PHASE7_ENABLED=false    # Twin Governance
POLICYOS_PHASE8_ENABLED=false    # Constitutional AI
POLICYOS_PHASE9_ENABLED=false    # Lifecycle Automation
POLICYOS_PHASE10_ENABLED=false   # Developer Experience
```

---

## Environment Variables Summary

```bash
# Phase 0 — Security
POLICYOS_SERVICE_TOKEN=              # Cryptographic service token
JWT_SECRET=                         # HS256 signing secret
JWT_PRIVATE_KEY=                    # RS256 private key (PEM)
JWT_PUBLIC_KEY=                     # RS256 public key (PEM)
POLICYOS_AUDIENCE=                 # JWT audience validation
PERSISTENT_STORE_KEY=              # 32-byte AES-256-GCM key (hex or base64)
REDIS_URL=                         # Redis connection URL
POLICYOS_TENANT_RATE_LIMIT=100     # Per-tenant rate limit

# Phase 0-10 — Feature Flags
POLICYOS_PHASE0_ENABLED=true
POLICYOS_PHASE1_ENABLED=true
POLICYOS_PHASE2_ENABLED=false
POLICYOS_PHASE3_ENABLED=false
POLICYOS_PHASE4_ENABLED=false
POLICYOS_PHASE5_ENABLED=false
POLICYOS_PHASE6_ENABLED=false
POLICYOS_PHASE7_ENABLED=false
POLICYOS_PHASE8_ENABLED=false
POLICYOS_PHASE9_ENABLED=false
POLICYOS_PHASE10_ENABLED=false

# External Integrations
CORPID_URL=http://localhost:4702
SADA_OS_URL=http://localhost:4190
MEMORY_OS_URL=http://localhost:4703
TWIN_OS_URL=http://localhost:4705
WORKFORCE_OS_URL=http://localhost:5077

# LLM for NL Policy Authoring
AI_INTELLIGENCE_URL=http://localhost:4881
AI_LLM_API_KEY=
AI_LLM_MODEL=

# Operational
HOJAI_DATA_DIR=./data
LOG_LEVEL=info
NODE_ENV=production
```

---

## Success Criteria — 10/10 Production Ready

| Dimension | Metric |
|-----------|--------|
| **Security** | Zero CVEs, cryptographically sealed audit trail, all sensitive data encrypted |
| **Reliability** | 99.9% uptime, <100ms p95 evaluation latency, circuit breakers on all integrations |
| **Governance** | All 14 audit categories covered, constitutional framework in place, multi-stakeholder review |
| **Extensibility** | 60+ endpoints, OpenAPI spec, TypeScript SDK, Python SDK, policy templates |
| **Observability** | Metrics dashboard, compliance reports (SOC2/GDPR/HIPAA), policy coverage analyzer |
| **Integration** | Real-time (SSE/WebSocket), Redis pub/sub, TwinOS/MemoryOS/CorpID/SADA OS bridges |
| **Automation** | Policy lifecycle automation, approval queue with escalation, trust monitoring |
| **Compliance** | Immutable audit chain, data residency controls, PII detection, consent management |

---

*Plan Version: 1.0 — Created June 27, 2026*
*Next Review: After Phase 0 completion*
