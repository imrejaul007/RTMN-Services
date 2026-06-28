# CorpID v3.0 — Deduplication Audit

## Gap Analysis vs Existing Services

> **Purpose:** Identify duplicates before building new services  
> **Audited:** RTMN ecosystem (HOJAI-AI, RABTUL, REZ-Workspace, Nexha, etc.)

---

## Audit Summary

| Gap | Existing Service | Status | Action |
|-----|-----------------|--------|--------|
| 1. Verifiable Credentials + DIDs | **None** | 🔴 Missing | Build new |
| 2. Universal Entity Model | **CorpID existing + RelNode/RelEdge** | 🟡 Partial | Extend |
| 3. Identity Timeline | **corpID-cloud/timeline** + **IdentityEvent** | 🟢 Exists | Reuse |
| 4. Graph Database | **REZ-graph-service**, **knowledge-graph-os**, **nexha-partner-graph** | 🟡 Partial | Reuse + enhance |
| 5. ABAC | **SUTAR Decision Engine** (PolicyEngine) | 🟢 Exists | Reuse |
| 6. Policy-as-Code | **SUTAR Decision Engine** + **sutar-compliance** | 🟢 Exists | Reuse |
| 7. Zero Trust Runtime | **None** | 🔴 Missing | Build new |
| 8. Enterprise Lifecycle | **CorpID existing states** | 🟡 Partial | Extend |
| 9. Risk Engine | **corpID-risk-service**, **risk-detection-service**, **risk-simulation** | 🟡 Partial | Consolidate |
| 10. Developer Platform | **None** | 🔴 Missing | Build new |
| 11. Agent Reputation | **AgentOS** (basic metrics) | 🟡 Partial | Extend |
| 12. Cross-Company Federation | **Nexha FederationOS** | 🟡 Partial | Reuse |

---

## Part 1: Existing Services by Category

### 1.1 Identity & Trust

| Service | Location | Port | Purpose | Reusable For |
|---------|----------|------|---------|-------------|
| **CorpID** | `platform/identity/corpid-service` | 4702 | Universal identity OS | All gaps |
| **corpID Risk Service** | `CorpPerks/corpid/services/corpid-risk-service` | 4708 | Risk scoring | Gap 9 |
| **corpID Timeline** | `platform/identity/corpid-service/corpID-cloud/timeline` | - | Activity timeline | Gap 3 |
| **IdentityEvent Model** | `corpID` | - | Event storage | Gap 3 |

### 1.2 Policy & Compliance

| Service | Location | Port | Purpose | Reusable For |
|---------|----------|------|---------|-------------|
| **SUTAR Decision Engine** | `sutar-os/core/sutar-decision-engine` | 4290 | Policy + Risk + Ranking | Gap 5, 6 |
| **PolicyEngine** | `sutar-decision-engine/services/policyEngine.ts` | - | ABAC evaluation | Gap 5 |
| **RiskAssessment** | `sutar-decision-engine/services/riskAssessment.ts` | - | Risk scoring | Gap 9 |
| **sutar-compliance** | `sutar-os/core/sutar-compliance` | 4605 | SOC2/GDPR compliance | Gap 6 |
| **compliance-os** | `platform/compliance-os` | - | Compliance engine | Gap 6 |
| **REZ Policy Engine** | `RABTUL/REZ-policy-engine` | 4034 | Policy validation | Gap 6 |

### 1.3 Graph & Knowledge

| Service | Location | Port | Purpose | Reusable For |
|---------|----------|------|---------|-------------|
| **REZ-graph-service** | `RABTUL/REZ-graph-service` | 4001 | Commerce graph | Gap 4 |
| **knowledge-graph-os** | `REZ-Workspace/core/knowledge-graph-os` | - | Knowledge graph | Gap 4 |
| **nexha-partner-graph** | `Nexha/services/nexha-partner-graph` | 4363 | Partner relationships | Gap 4, 12 |
| **economic-graph** | `REZ-Workspace/core/economic-graph` | - | Economic entities | Gap 4 |
| **entity-resolution** | `platform/knowledge-graph/entity-resolution` | - | Entity linking | Gap 2 |
| **knowledge-graph-os** | `platform/knowledge-graph/knowledge-graph-os` | - | Graph OS | Gap 4 |

### 1.4 Federation

| Service | Location | Port | Purpose | Reusable For |
|---------|----------|------|---------|-------------|
| **Nexha FederationOS** | `Nexha/services/nexha-federation-os` | 4273 | Federation management | Gap 12 |
| **Nexha DiscoveryOS** | `Nexha/services/nexha-discovery-os` | 4272 | Capability matching | Gap 12 |
| **Nexha CapabilityOS** | `Nexha/services/nexha-capability-os` | 4270 | Capability registry | Gap 12 |
| **REZ GraphQL Federation** | `RABTUL/REZ-graphql-federation` | - | GraphQL federation | Gap 12 |

### 1.5 Webhooks

| Service | Location | Port | Purpose | Reusable For |
|---------|----------|------|---------|-------------|
| **REZ Webhook Manager** | `RABTUL/REZ-webhook-manager` | - | Webhook management | Gap 10 |
| **REZ Webhook Service** | `RABTUL/REZ-webhook-service` | - | Event delivery | Gap 10 |
| **REZ Webhook Verification** | `RABTUL/REZ-webhook-verification` | - | Signature verification | Gap 10 |

### 1.6 Risk & Simulation

| Service | Location | Port | Purpose | Reusable For |
|---------|----------|------|---------|-------------|
| **Risk Detection** | `platform/trust/risk-detection-service` | - | Anomaly detection | Gap 7, 9 |
| **Risk Simulation** | `sutar-os/simulation-os/risk-simulation` | - | Risk scenarios | Gap 9 |
| **Risk Intelligence** | `platform/flow/risk-intelligence` | - | Risk analytics | Gap 9 |

---

## Part 2: Detailed Gap Analysis

### Gap 1: Verifiable Credentials + DIDs

**Status:** 🔴 No existing service

**Search Results:**
```
❌ No W3C VC service found
❌ No DID service found
❌ No selective disclosure found
```

**Recommendation:** Build new service: `corp-vc-service`

**Required Components:**
- DID generation and management
- W3C Verifiable Credential issuance
- Credential presentation and verification
- Selective disclosure (ZK proofs)
- Cryptographic proof generation

---

### Gap 2: Universal Entity Model

**Status:** 🟡 Partial (extend existing)

**Existing:**
- CorpID has: IND, BIZ, AGT, WRK, REL types
- `RelNode` + `RelEdge` for relationships

**Missing:**
```
CI-DEV-   Device
CI-API-   API/Application
CI-TWN-   Digital Twin
CI-AST-   Asset
CI-DEP-   Department
CI-TEAM-  Team
CI-PROD-  Product
CI-CONTRACT- Contract
CI-POLICY-  Policy
CI-CERT-   Certificate
```

**Recommendation:** Extend CorpID entity types + integrate with entity-resolution service

**Existing Service to Reuse:**
- `platform/knowledge-graph/entity-resolution` — for entity linking

---

### Gap 3: Identity Timeline

**Status:** 🟢 Exists

**Existing:**
- `platform/identity/corpid-service/corpID-cloud/timeline` — Activity timeline
- `IdentityEvent` model in CorpID
- 30+ event types across 9 categories

**Existing Features:**
```
✅ 9 Event Categories
✅ 30+ Event Types
✅ Time-based queries
✅ Search
✅ Statistics
✅ Actor tracking
✅ Context capture
```

**Recommendation:** Reuse + enhance

**Enhancements Needed:**
- Human-readable timeline entries
- Timeline API (GET /api/timeline/:entityId)
- AI-generated summaries
- Timeline annotations

---

### Gap 4: Graph Database

**Status:** 🟡 Partial (multiple graph services exist)

**Existing Services:**

| Service | Strengths | Weaknesses |
|---------|-----------|------------|
| **REZ-graph-service** | Commerce graph, Cypher queries | Not AI-native |
| **knowledge-graph-os** | Entity resolution, vector search | No Cypher |
| **nexha-partner-graph** | Partner relationships | Domain-specific |
| **economic-graph** | Economic entities | Limited scope |

**Recommendation:** Consolidate or extend

**Options:**
1. **Extend REZ-graph-service** for CorpID entities
2. **Build corp-graph-service** using Neo4j
3. **Integrate with knowledge-graph-os** for AI capabilities

**Required Capabilities:**
- Cypher queries for relationship traversal
- Graph algorithms (shortest path, community detection)
- Real-time updates
- Backup/recovery

---

### Gap 5: ABAC

**Status:** 🟢 Exists

**Existing:**
- `sutar-decision-engine/services/policyEngine.ts`
- `PolicyEngine` class with rule evaluation

**Existing Features:**
```
✅ Rule-based evaluation
✅ Subject/Resource/Action matching
✅ Trust score integration
✅ Delegation chain integration
```

**Recommendation:** Reuse + extend

**Required Enhancements:**
- Attribute-based conditions (department, time, location)
- Dynamic policy evaluation API
- Policy import/export
- ABAC policy CRUD endpoints

---

### Gap 6: Policy-as-Code

**Status:** 🟢 Exists

**Existing:**
- `sutar-decision-engine/services/policyEngine.ts`
- `sutar-compliance` for SOC2/GDPR
- `REZ-policy-engine` for validation

**Recommendation:** Reuse + extend

**Existing Policy Formats:**
```yaml
# SUTAR Decision Engine format
decision_type: authorization
scope: leads:read
constraints:
  trust_score_min: 80
  delegation_chain_required: true
```

**Required Enhancements:**
- Rego/OPA-like policy language
- Policy simulation
- Policy versioning
- Policy testing framework

---

### Gap 7: Zero Trust Runtime

**Status:** 🔴 No existing service

**Search Results:**
```
❌ No continuous verification found
❌ No session trust scoring found
❌ No behavior anomaly detection for identity found
```

**Existing Partial:**
- `risk-detection-service` — anomaly detection (not identity-specific)
- `sutar-decision-engine/riskAssessment` — risk scoring

**Recommendation:** Build new service: `corp-zero-trust`

**Required Components:**
- Session trust scoring
- Continuous verification
- Behavior anomaly detection
- Device trust evaluation
- Risk-based adaptive MFA

---

### Gap 8: Enterprise Lifecycle

**Status:** 🟡 Partial (extend existing)

**Existing States in CorpID:**
```
✅ active
✅ suspended
✅ revoked
```

**Missing States:**
```
❌ invited
❌ onboarding
❌ probation
❌ transferred
❌ offboarding
❌ archived
❌ deleted
```

**Recommendation:** Extend CorpID lifecycle states

**Required Components:**
- Lifecycle transition rules
- Transition validation
- Automatic actions on transition
- Audit trail
- Transition API

---

### Gap 9: Risk Engine

**Status:** 🟡 Partial (multiple services, needs consolidation)

**Existing Services:**

| Service | Location | Strengths | Weaknesses |
|---------|----------|-----------|------------|
| **corpID Risk Service** | CorpPerks/corpid | Identity risk | Basic scoring |
| **Risk Detection** | platform/trust | Anomaly detection | Generic |
| **Risk Simulation** | simulation-os | Scenarios | Simulation only |
| **Risk Intelligence** | platform/flow | Analytics | Not real-time |
| **SUTAR RiskAssessment** | sutar-decision-engine | Decision risk | Integrated |

**Recommendation:** Consolidate into single `corp-risk-engine`

**Required Components:**
- Multi-category risk scoring (location, behavior, agent, financial, network, credential)
- Risk signal aggregation
- Real-time risk alerts
- Automated mitigation actions
- Risk history and trends

---

### Gap 10: Developer Platform

**Status:** 🔴 No existing service

**Search Results:**
```
❌ No SDK found
❌ No CLI found
❌ No Terraform provider found
```

**Existing for Webhooks:**
- `REZ-webhook-manager` — webhook management
- `REZ-webhook-service` — delivery

**Recommendation:** Build new SDK + CLI + Terraform Provider

**Required Components:**
```
SDK:
├── @hojai/corpid-sdk (npm)
├── Python SDK
└── TypeScript SDK

CLI:
├── @hojai/corpid-cli (npm)
└── bash completion

Infrastructure:
├── Terraform Provider
└── Pulumi Provider

Webhooks:
└── Reuse REZ-webhook-service
```

---

### Gap 11: Agent Reputation

**Status:** 🟡 Partial (basic metrics in AgentOS)

**Existing:**
- `AgentOS` — agent registry and capabilities
- Agent budget tracking
- Agent interaction logs

**Missing:**
```
❌ Reputation score
❌ Performance metrics
❌ Reviews and endorsements
❌ Marketplace listing
❌ Leaderboards
```

**Recommendation:** Build on top of AgentOS

**Required Components:**
- Reputation scoring algorithm
- Performance tracking
- Review/endorsement system
- Marketplace API
- Leaderboard generation

---

### Gap 12: Cross-Company Federation

**Status:** 🟡 Partial (Nexha has some)

**Existing:**
- `Nexha FederationOS` — federation management
- `Nexha DiscoveryOS` — capability matching
- `Nexha CapabilityOS` — capability registry
- `nexha-partner-graph` — partner relationships

**Missing:**
```
❌ Cross-company delegation
❌ B2B trust exchange
❌ Inter-company agent passports
❌ Bi-directional verification
```

**Recommendation:** Extend Nexha FederationOS for CorpID

**Required Components:**
- Company trust establishment
- Cross-company delegation protocol
- Agent passport verification across companies
- Multi-party audit logging

---

## Part 3: Consolidated Roadmap

### Build (New Services)

| Service | Priority | Dependencies |
|---------|----------|--------------|
| `corp-vc-service` (Gap 1) | P2 | CorpID, Crypto libs |
| `corp-zero-trust` (Gap 7) | P2 | CorpID, Risk Detection |
| `@hojai/corpid-sdk` (Gap 10) | P0 | CorpID |
| `@hojai/corpid-cli` (Gap 10) | P0 | CorpID SDK |
| `corp-risk-engine` (Gap 9) | P1 | Consolidate existing |
| `corp-reputation` (Gap 11) | P2 | AgentOS |

### Extend (Add to CorpID)

| Extension | Priority | Description |
|-----------|----------|-------------|
| Entity types (Gap 2) | P1 | DEV, API, TWN, AST, etc. |
| Timeline API (Gap 3) | P0 | Human-readable timeline |
| Lifecycle states (Gap 8) | P1 | Full enterprise lifecycle |
| Webhook endpoints (Gap 10) | P0 | Reuse REZ-webhook-service |

### Integrate (Use Existing)

| Integration | Service to Reuse | For |
|------------|-----------------|-----|
| Graph DB (Gap 4) | REZ-graph-service or build | Relationship queries |
| ABAC (Gap 5) | sutar-decision-engine/PolicyEngine | Policy evaluation |
| Policy-as-Code (Gap 6) | sutar-decision-engine | Rego-like policies |
| Federation (Gap 12) | Nexha FederationOS | Cross-company |

---

## Part 4: Port Registry

### New Services

| Service | Suggested Port | Status |
|---------|-------------|--------|
| `corp-vc-service` | 4391 | Available |
| `corp-zero-trust` | 4392 | Available |
| `corp-risk-engine` | 4393 | Available |
| `corp-reputation` | 4394 | Available |
| `@hojai/corpid-sdk` | npm | Package |
| `@hojai/corpid-cli` | npm | Package |

### Reuse Existing Ports

| Service | Current Port | Use For |
|---------|-------------|---------|
| `sutar-decision-engine` | 4290 | ABAC + Policy-as-Code |
| `corpID Risk Service` | 4708 | Risk (consolidate here) |
| `Nexha FederationOS` | 4273 | Cross-company Federation |
| `REZ-webhook-manager` | TBD | Webhooks |
| `REZ-graph-service` | 4001 | Graph DB (extend) |

---

## Part 5: Implementation Order

### Phase 1: P0 Quick Wins (1-2 weeks)

```
1. Build Timeline API (extend existing)
   └── GET /api/timeline/:entityId
   └── Timeline annotations
   └── Human-readable entries

2. Add Webhook Endpoints (reuse REZ-webhook-service)
   └── POST /api/webhooks
   └── Webhook delivery
   └── Event types

3. Build CorpID SDK (@hojai/corpid-sdk)
   └── npm package
   └── TypeScript types
   └── Full API coverage
```

### Phase 2: P0 SDK + CLI (2-3 weeks)

```
4. Build CorpID CLI (@hojai/corpid-cli)
   └── User management
   └── Agent management
   └── Delegation commands

5. Extend Entity Types (Gap 2)
   └── DEV, API, TWN, AST types
   └── Entity resolution integration

6. Extend Lifecycle States (Gap 8)
   └── invited, onboarding, offboarding
   └── Transition rules
```

### Phase 3: P1 Integration (1-2 months)

```
7. Consolidate Risk Engine (Gap 9)
   └── Merge corpID-risk-service
   └── Merge risk-detection-service
   └── Unified risk scoring

8. Graph DB Integration (Gap 4)
   └── Extend REZ-graph-service
   └── Cypher queries for CorpID
   └── Real-time updates

9. ABAC Enhancement (Gap 5)
   └── Attribute conditions
   └── Dynamic evaluation
   └── Policy import/export
```

### Phase 4: P2 Strategic (3-6 months)

```
10. Policy-as-Code Enhancement (Gap 6)
    └── Rego-like language
    └── Policy simulation
    └── Version control

11. Cross-Company Federation (Gap 12)
    └── Extend Nexha FederationOS
    └── B2B trust exchange
    └── Inter-company delegation

12. Zero Trust Runtime (Gap 7)
    └── Session trust scoring
    └── Continuous verification
    └── Behavior anomaly

13. Verifiable Credentials (Gap 1)
    └── W3C VC support
    └── DID management
    └── Selective disclosure

14. Agent Reputation (Gap 11)
    └── Reputation scoring
    └── Marketplace
    └── Leaderboards
```

---

## Part 6: Don't Build Duplicates

### Existing Services to NOT Duplicate

| Don't Build | Use Instead |
|-------------|-------------|
| Another policy engine | `sutar-decision-engine/PolicyEngine` |
| Another graph service | `REZ-graph-service` (extend) |
| Another webhook service | `REZ-webhook-manager` (reuse) |
| Another risk service | Consolidate into `corp-risk-engine` |
| Another timeline | `corpID-cloud/timeline` (extend) |
| Another compliance service | `sutar-compliance` (reuse) |

---

## Appendix: Service Mapping Table

| Gap | Build New | Extend Existing | Reuse External |
|-----|-----------|----------------|---------------|
| 1. VC/DIDs | ✅ corp-vc-service | - | - |
| 2. Universal Entity | - | ✅ CorpID types | entity-resolution |
| 3. Timeline | - | ✅ corpID-cloud/timeline | - |
| 4. Graph DB | - | - | ✅ REZ-graph-service |
| 5. ABAC | - | ✅ sutar-decision-engine | - |
| 6. Policy-as-Code | - | ✅ sutar-decision-engine | - |
| 7. Zero Trust | ✅ corp-zero-trust | - | - |
| 8. Lifecycle | - | ✅ CorpID states | - |
| 9. Risk Engine | ✅ corp-risk-engine | consolidate | - |
| 10. SDK/CLI | ✅ @hojai/corpid-sdk | - | REZ-webhook |
| 11. Reputation | ✅ corp-reputation | extend | AgentOS |
| 12. Federation | - | - | ✅ Nexha FederationOS |

---

*CorpID Deduplication Audit — Avoid building what already exists*
