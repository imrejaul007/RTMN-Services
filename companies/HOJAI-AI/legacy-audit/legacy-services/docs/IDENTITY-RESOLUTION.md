# HOJAI IDENTITY RESOLUTION PLATFORM
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** ARCHITECTURE SPEC

---

## Executive Summary

**Identity Resolution** is the problem of determining when multiple identifiers belong to the same person.

Example:
```
Same person has:
- Phone: +919876543210 (WhatsApp)
- Email: rejaul@gmail.com (App login)
- Device: device_abc123 (Mobile app)
- IP: 192.168.1.1 (Website)

How do we know they're the same person?
```

**Hojai Identity Resolution Platform** solves this by:

1. **Collecting** identifiers from all touchpoints
2. **Analyzing** patterns to find matches
3. **Resolving** identities into unified profiles
4. **Maintaining** identity graph over time

---

## Problem Definition

### The Identity Challenge

| Channel | Identifiers Available |
|---------|----------------------|
| WhatsApp | Phone number |
| Website | Email, Device ID, Cookie |
| Mobile App | Device ID, Email, Phone |
| POS | Phone, Email |
| Call Center | Phone |

**Problem:** Same customer uses different identifiers on different channels.

---

### Resolution Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Probabilistic** | Likely the same person | 75% confidence |
| **Rule-based** | Defined rules match | Phone + Name match |
| **Deterministic** | Confirmed match | Login from same account |
| **Verified** | Identity verified | KYC, OTP confirmation |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IDENTITY RESOLUTION PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       COLLECTION LAYER                               │   │
│  │                                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │ WhatsApp │ │ Website  │ │ Mobile   │ │   POS    │          │   │
│  │  │ Collector│ │ Collector│ │ Collector│ │ Collector│          │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       IDENTITY GRAPH                                  │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │                                                             │  │   │
│  │  │    Phone ─── Email ─── Device ─── IP ─── Cookie             │  │   │
│  │  │       │                                                │    │  │   │
│  │  │       └─────────── Same Person ───────────────┘            │  │   │
│  │  │                                                             │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│              ┌─────────────────────┼─────────────────────┐               │
│              │                     │                     │               │
│              ▼                     ▼                     ▼               │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │   RESOLUTION     │ │   MATCHING        │ │   MERGING        │      │
│  │   ENGINE        │ │   ENGINE         │ │   ENGINE        │      │
│  │                 │ │                  │ │                  │      │
│  │ • Rules         │ │ • Probabilistic  │ │ • Identity Link │      │
│  │ • ML Models     │ │ • Similarity     │ │ • Data Merge    │      │
│  │ • Confidence    │ │ • Graph Analysis │ │ • Conflict Res  │      │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Identifier Types

### 1. Primary Identifiers

Directly identify a person.

```typescript
interface PrimaryIdentifier {
  type: 'phone' | 'email' | 'account_id';
  value: string;           // e.g., "+919876543210"
  verified: boolean;
  verified_at?: Date;
  first_seen_at: Date;
  last_seen_at: Date;
}
```

| Type | Format | Verification |
|------|--------|-------------|
| **Phone** | E.164 | OTP, WhatsApp |
| **Email** | RFC 5322 | Email verification |
| **Account ID** | UUID | Login session |

---

### 2. Secondary Identifiers

Indirectly identify a person.

```typescript
interface SecondaryIdentifier {
  type: SecondaryIdentifierType;
  value: string;
  confidence: number;       // 0-1
  first_seen_at: Date;
  last_seen_at: Date;
}

type SecondaryIdentifierType = 
  | 'device_id'
  | 'device_fingerprint'
  | 'ip_address'
  | 'cookie_id'
  | 'mac_address'
  | 'browser_fingerprint'
  | 'wifi_mac';
```

| Type | Stability | Privacy |
|------|-----------|---------|
| **Device ID** | High (persistent) | Medium |
| **IP Address** | Medium (dynamic) | Low |
| **Cookie ID** | Low (can be cleared) | Low |
| **Fingerprint** | Medium | Low |

---

## Identity Graph

### Graph Structure

```typescript
interface IdentityGraph {
  // Nodes (Identifiers)
  nodes: Map<string, IdentityNode>;
  
  // Edges (Relationships)
  edges: IdentityEdge[];
}

interface IdentityNode {
  id: string;                    // Internal ID
  type: IdentifierType;
  value: string;                  // The actual identifier
  tenant_id: string;
  
  // Properties
  verified: boolean;
  primary_for?: string;           // Customer ID if primary
  
  // Stats
  seen_count: number;
  first_seen_at: Date;
  last_seen_at: Date;
  
  // Confidence
  confidence: number;              // 0-1
}

interface IdentityEdge {
  id: string;
  tenant_id: string;
  
  // Connection
  source_id: string;             // Node A
  target_id: string;              // Node B
  
  // Relationship
  type: EdgeType;
  confidence: number;              // 0-1
  
  // Evidence
  evidence: EdgeEvidence[];
  
  // Resolution
  resolved: boolean;
  resolved_at?: Date;
  resolved_by?: 'rule' | 'ml' | 'manual';
}

type IdentifierType = 
  | 'phone' 
  | 'email' 
  | 'account_id'
  | 'device_id'
  | 'ip_address'
  | 'cookie_id'
  | 'fingerprint';

type EdgeType = 
  | 'same_person'           // Direct match
  | 'likely_same_person'     // Probabilistic
  | 'possibly_same_person'  // Weak signal
  | 'same_household'        // Same address/family
  | 'same_device'           // Same physical device
  | 'same_network';         // Same IP range
```

---

## Resolution Methods

### Method 1: Deterministic (Rules)

```typescript
// Direct matches with 100% confidence

const deterministicRules: ResolutionRule[] = [
  {
    name: 'exact_phone_match',
    condition: (a, b) => 
      a.type === 'phone' && 
      b.type === 'phone' && 
      normalizePhone(a.value) === normalizePhone(b.value),
    confidence: 1.0
  },
  {
    name: 'exact_email_match',
    condition: (a, b) => 
      a.type === 'email' && 
      b.type === 'email' && 
      a.value.toLowerCase() === b.value.toLowerCase(),
    confidence: 1.0
  },
  {
    name: 'account_link',
    condition: (a, b) => 
      a.type === 'account_id' && 
      b.type === 'account_id' && 
      a.value === b.value,
    confidence: 1.0
  }
];
```

---

### Method 2: Probabilistic (ML)

```typescript
interface IdentityMatchFeatures {
  // Same phone (normalized)
  phone_exact_match: boolean;
  phone_similarity: number;        // Levenshtein distance
  
  // Same email (normalized)
  email_exact_match: boolean;
  email_domain_match: boolean;
  email_similarity: number;
  
  // Same device
  device_exact_match: boolean;
  
  // Same IP/network
  ip_exact_match: boolean;
  ip_subnet_match: boolean;       // /24 subnet
  ip_range_match: boolean;
  
  // Temporal
  time_proximity_hours: number;    // How close in time
  seen_together: boolean;         // Same session
  same_day: boolean;
  
  // Behavioral
  same_location: boolean;
  similar_browsing_pattern: boolean;
}

interface IdentityMatchPrediction {
  is_match: boolean;
  confidence: number;              // 0-1
  match_type: 'deterministic' | 'probabilistic' | 'none';
  
  // Explanation
  top_features: {
    feature: string;
    contribution: number;         // SHAP value
  }[];
  
  // Alternative
  alternatives?: {
    identity_id: string;
    confidence: number;
  }[];
}
```

---

### Method 3: Graph-Based

```typescript
interface GraphResolutionConfig {
  // Walk parameters
  max_walk_depth: number;         // Max hops to traverse
  min_confidence: number;          // Minimum edge confidence
  
  // Aggregation
  aggregation_method: 'max' | 'weighted_avg' | 'bayesian';
  
  // Filters
  exclude_types: EdgeType[];     // e.g., ['possibly_same_person']
}

interface GraphResolutionResult {
  identity_id: string;
  confidence: number;
  path: {
    nodes: IdentityNode[];
    edges: IdentityEdge[];
  }[];
  match_reason: string;
}
```

---

## Resolution Engine

### Core Algorithm

```typescript
class IdentityResolutionEngine {
  
  // Add new identifier
  async addIdentifier(
    tenant_id: string,
    type: IdentifierType,
    value: string,
    context: IdentifierContext
  ): Promise<ResolutionResult> {
    
    // 1. Check if identifier already exists
    const existing = await this.findIdentifier(tenant_id, type, value);
    
    if (existing) {
      return { action: 'EXISTS', identity_id: existing.identity_id };
    }
    
    // 2. Create new identifier node
    const node = await this.createNode(tenant_id, type, value);
    
    // 3. Find potential matches using rules
    const ruleMatches = await this.findRuleMatches(node);
    
    // 4. Find potential matches using ML
    const mlMatches = await this.findMLMatches(node);
    
    // 5. Combine matches
    const allMatches = this.combineMatches(ruleMatches, mlMatches);
    
    // 6. Resolve
    if (allMatches.length === 0) {
      // New identity
      return { action: 'NEW_IDENTITY', identity_id: await this.createIdentity(node) };
    } else {
      // Link to existing identity
      return await this.linkToIdentity(node, allMatches);
    }
  }
  
  // Merge two identities
  async mergeIdentities(
    source_id: string,
    target_id: string,
    reason: string
  ): Promise<void> {
    // 1. Validate both exist
    // 2. Calculate merge strategy (which data wins)
    // 3. Merge all nodes
    // 4. Archive source identity
    // 5. Update customer references
    // 6. Emit merge event
  }
}
```

---

### Confidence Calculation

```typescript
interface ConfidenceConfig {
  // Weights for different signals
  weights: {
    deterministic: number;       // Exact matches
    probabilistic: number;        // ML predictions
    graph: number;              // Graph traversal
    temporal: number;           // Time proximity
    behavioral: number;         // Behavior similarity
  };
  
  // Thresholds
  thresholds: {
    deterministic_match: number;     // >= 0.95
    strong_match: number;            // >= 0.80
    moderate_match: number;         // >= 0.60
    weak_match: number;             // >= 0.40
  };
}

function calculateMatchConfidence(
  matches: Match[],
  config: ConfidenceConfig
): MatchResult {
  
  let score = 0;
  let totalWeight = 0;
  
  for (const match of matches) {
    const weight = config.weights[match.type];
    score += match.confidence * weight;
    totalWeight += weight;
  }
  
  const normalizedScore = score / totalWeight;
  
  return {
    confidence: normalizedScore,
    tier: getTier(normalizedScore, config.thresholds),
    requires_review: normalizedScore < config.thresholds.strong_match
  };
}
```

---

## API Endpoints

### Identity Management

```
# Create/Update Identity
POST   /api/identities                    - Create new identity
GET    /api/identities/:id               - Get identity
PUT    /api/identities/:id               - Update identity
DELETE /api/identities/:id               - Archive identity (soft delete)

# Merge Identities
POST   /api/identities/merge            - Merge two identities
GET    /api/identities/:id/merge-history - Get merge history

# Link Identifiers
POST   /api/identities/:id/identifiers  - Add identifier to identity
DELETE /api/identities/:id/identifiers/:type/:value - Remove identifier
```

### Resolution

```
# Resolve (find identity from identifier)
POST   /api/resolve                       - Resolve by identifier
POST   /api/resolve/batch               - Batch resolve

# Match (check if two identifiers match)
POST   /api/match                         - Check if identifiers match

# Graph
GET    /api/identities/:id/graph         - Get identity graph
GET    /api/identities/:id/connections  - Get connected identities
```

### Analytics

```
GET    /api/analytics/resolution-stats   - Resolution statistics
GET    /api/analytics/match-accuracy    - Match accuracy metrics
```

---

## API Examples

### Add Identifier (Auto-Resolve)

```typescript
// Request
POST /api/identities
{
  "tenant_id": "xyz-retail",
  "identifier": {
    "type": "phone",
    "value": "+919876543210"
  },
  "context": {
    "source": "whatsapp",
    "session_id": "sess_abc123",
    "ip_address": "192.168.1.1",
    "device_id": "device_xyz789"
  }
}

// Response
{
  "success": true,
  "data": {
    "action": "LINKED",          // or "NEW_IDENTITY", "EXISTS"
    "identity_id": "id_12345",
    "confidence": 0.95,
    "match_reason": "exact_phone_match"
  }
}
```

---

### Resolve Identity

```typescript
// Request
POST /api/resolve
{
  "tenant_id": "xyz-retail",
  "identifier": {
    "type": "email",
    "value": "rejaul@gmail.com"
  }
}

// Response
{
  "success": true,
  "data": {
    "found": true,
    "identity_id": "id_12345",
    "confidence": 1.0,
    "primary_customer_id": "cust_abc",
    "identifiers": [
      { "type": "phone", "value": "+919876543210", "verified": true },
      { "type": "email", "value": "rejaul@gmail.com", "verified": true },
      { "type": "device_id", "value": "device_xyz789", "verified": false }
    ]
  }
}
```

---

### Check Match

```typescript
// Request
POST /api/match
{
  "tenant_id": "xyz-retail",
  "identifier_a": {
    "type": "phone",
    "value": "+919876543210"
  },
  "identifier_b": {
    "type": "email",
    "value": "rejaul@gmail.com"
  }
}

// Response
{
  "success": true,
  "data": {
    "is_match": true,
    "confidence": 0.87,
    "match_type": "probabilistic",
    "top_features": [
      { "feature": "email_domain_match", "contribution": 0.4 },
      { "feature": "temporal_proximity", "contribution": 0.3 },
      { "feature": "same_device", "contribution": 0.2 }
    ],
    "requires_review": false
  }
}
```

---

## Privacy & Consent

### Consent Requirements

```typescript
interface IdentityConsent {
  tenant_id: string;
  customer_id: string;
  
  // What can be linked?
  can_link_identifiers: boolean;
  
  // Sources
  consent_sources: {
    phone: 'explicit' | 'implied';
    email: 'explicit' | 'implied';
    device: 'implied';
  };
  
  // Restrictions
  restrictions: {
    no_third_party_sharing: boolean;
    no_profiling: boolean;
    data_retention_days: number;
  };
  
  // History
  granted_at: Date;
  updated_at: Date;
}
```

### Privacy Rules

| Rule | Description |
|------|-------------|
| **Explicit Consent** | Phone/email linking requires explicit opt-in |
| **Data Minimization** | Only store necessary identifiers |
| **Retention Limits** | Unverified IDs auto-expire after 90 days |
| **Right to Unlink** | Customer can unlink identifiers |
| **Audit Trail** | All linking actions are logged |

---

## Matching Rules

### Strong Matches (Auto-Approve)

```typescript
const strongMatchRules = [
  // Same verified phone
  { types: ['phone', 'phone'], condition: 'exact_match', verified: true },
  
  // Same verified email
  { types: ['email', 'email'], condition: 'exact_match', verified: true },
  
  // Same account ID
  { types: ['account_id', 'account_id'], condition: 'exact_match' },
];
```

### Moderate Matches (Review)

```typescript
const moderateMatchRules = [
  // Phone + Email same customer
  { types: ['phone', 'email'], condition: 'same_customer', confidence: 0.8 },
  
  // Device + Phone (recent session)
  { types: ['device_id', 'phone'], condition: 'recent_session', confidence: 0.75 },
  
  // Same IP range + same browser
  { types: ['ip_address', 'fingerprint'], condition: 'same_session', confidence: 0.7 },
];
```

### Weak Matches (Manual Review)

```typescript
const weakMatchRules = [
  // Similar email (typo)
  { types: ['email', 'email'], condition: 'fuzzy_match', confidence: 0.5 },
  
  // Same IP (shared network)
  { types: ['ip_address', 'ip_address'], condition: 'same_subnet', confidence: 0.4 },
];
```

---

## Graph Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         IDENTITY GRAPH EXAMPLE                            │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   IDENTITY      │
                    │   id_12345      │
                    │   (Customer)    │
                    │                 │
                    │   John Doe      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│    PHONE      │  │    EMAIL      │  │   DEVICE     │
│ +919876543210 │  │ john@xyz.com  │  │ device_abc   │
│   ✓ Verified  │  │   ✓ Verified  │  │              │
└───────────────┘  └───────────────┘  └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    EDGES        │
                    │                 │
                    │ phone↔email: 1.0│
                    │ email↔device:0.8│
                    │ phone↔device:0.7│
                    │                 │
                    │ CONNECTION:     │
                    │ SAME_PERSON     │
                    └─────────────────┘
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Resolution latency (p99) | < 50ms |
| Batch resolution (1000) | < 5s |
| Graph query (depth 3) | < 100ms |
| Match accuracy | > 95% |
| False positive rate | < 2% |

---

## Port Registry

| Service | Port | Purpose |
|---------|------|---------|
| Identity Resolution API | 4535 | Main API |
| Identity Graph DB | - | Neo4j/Redis |
| ML Matching Service | 4536 | ML inference |

---

## Integration Points

### Hojai Core

```
Identity Resolution
    │
    ├── Events ───────────► Event Bus (4510)
    │       (identity.linked, identity.merged)
    │
    ├── Memory ────────────► Memory Platform (4520)
    │       (identity resolution → customer profile)
    │
    └── Audit ─────────────► Governance (4500)
            (all linking actions logged)
```

### External Systems

```
External System ──► Collector ──► Identity Resolution
       │               │
       │               └──► Graph
       │
       └───────────────► Resolution API
```

---

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 29, 2026 | Hojai AI | Initial spec |

---

*This is the Hojai Identity Resolution Platform Specification.*
