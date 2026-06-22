# HOJAI AI - VERSION 3.0 FINAL
**Date:** May 30, 2026 | **Status:** APPROVED FOR DEVELOPMENT

---

# APPROVAL SCORES

| Area | Score |
|------|--------|
| Architecture | 9.5/10 |
| Platform Boundaries | 9.5/10 |
| Build Sequence | 10/10 |
| Developer Clarity | 9.5/10 |
| Scalability | 9/10 |
| Enterprise Readiness | 9/10 |

---

# PART 1: THE 12 LOCKED PLATFORMS

```
HOJAI AI - LOCKED ARCHITECTURE V3.0
│
├── 1. Governance      (4501)   ✅ Built
├── 2. Event          (4510)   ✅ Built
├── 3. Data           (4590)   ⚠️  ENHANCE FIRST
├── 4. Identity       (4600)   ❌  BUILD
├── 5. Memory         (4520)   ⚠️  Enhance
├── 6. Intelligence  (4530)   ⚠️  Enhance
├── 7. Workflows      (4560)   ⚠️  Enhance
├── 8. Agents        (4550)   ⚠️  Enhance
├── 9. Communications (4570)   ⚠️  Enhance
├── 10. Hyperlocal   (4580)   ⚠️  Enhance
├── 11. Analytics    (4610)   ❌  BUILD
└── 12. Industry     (4700)   ⚠️  Enhance + Governance
```

**DO NOT ADD PLATFORM #13**

---

# PART 2: PLATFORM OWNERSHIP RULE

## Golden Rule

**Any new capability must answer:**

> **Which Platform Owns It?**

## Platform Ownership Table

| Capability | Platform | Reason |
|-----------|----------|--------|
| WhatsApp | Communications | Channel management |
| Customer Timeline | Memory | Temporal customer data |
| Churn Prediction | Intelligence | ML prediction |
| Identity Matching | Identity | Identity resolution |
| Campaign Automation | Workflows | Automation triggers |
| Support Agent | Agents | Agent type |
| Bridal Purchase Model | Industry | Industry-specific pattern |
| Customer 360 | Data | Canonical customer |
| Consent Management | Governance | Compliance |
| Event Routing | Event | Event processing |
| Footfall Prediction | Hyperlocal | Geo-specific ML |

**If it doesn't belong to one of the 12 platforms → REJECT THE DESIGN**

---

# PART 3: CANONICAL ENTITIES (11 + 3 NEW)

## Entity Hierarchy

```
hojai-data-models/
│
├── tenant.ts              ← NEW: Most important entity
├── customer.ts            ← Existing
├── merchant.ts            ← Existing
├── organization.ts        ← Existing
├── consent.ts             ← NEW: Critical for compliance
├── conversation.ts        ← Existing
├── event.ts               ← Existing
├── workflow.ts            ← Existing
├── intent.ts              ← Existing
├── knowledge.ts           ← Existing
├── location.ts           ← Existing
├── campaign.ts           ← Existing
├── agent.ts              ← Existing
└── schemas/
    └── index.ts
```

---

## 1. Tenant Entity (NEW - MOST IMPORTANT)

```typescript
// hojai-data-models/entities/tenant.ts

interface Tenant {
  // Core
  id: string;
  name: string;
  slug: string;
  
  // Classification
  type: 'rez' | 'merchant' | 'enterprise' | 'rabtul';
  industry?: Industry;
  
  // Namespace (database isolation)
  namespace: string;
  
  // Plan & Limits
  plan: 'starter' | 'professional' | 'enterprise';
  limits: TenantLimits;
  
  // Contact
  contact: {
    email: string;
    phone?: string;
    address?: Address;
  };
  
  // Branding
  logo_url?: string;
  primary_color?: string;
  
  // Settings
  settings: TenantSettings;
  
  // Status
  status: 'active' | 'suspended' | 'churned';
  
  // Billing
  billing: {
    email: string;
    cycle: 'monthly' | 'yearly';
    payment_method?: string;
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
  suspended_at?: string;
}

interface TenantLimits {
  max_users: number;
  max_api_calls: number;
  max_storage: number;
  rate_limit: number;
  max_agents: number;
  max_workflows: number;
  max_campaigns: number;
}

interface TenantSettings {
  timezone: string;
  language: string;
  date_format: string;
  currency: string;
  features: Record<string, boolean>;
}
```

---

## 2. Consent Entity (NEW - CRITICAL)

```typescript
// hojai-data-models/entities/consent.ts

interface Consent {
  // Core
  id: string;
  tenant_id: string;
  
  // Who
  customer_id: string;
  
  // What
  purpose: ConsentPurpose;
  type: 'marketing' | 'communication' | 'data_processing' | 'third_party';
  
  // Status
  granted: boolean;
  granted_at?: string;
  denied_at?: string;
  withdrawn_at?: string;
  
  // Validity
  valid_from?: string;
  expires_at?: string;
  
  // Source
  source: 'explicit' | 'implicit' | 'legal_basis';
  channel?: 'whatsapp' | 'email' | 'sms' | 'app';
  
  // Audit
  ip_address?: string;
  user_agent?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

type ConsentPurpose = 
  | 'marketing_communication'
  | 'personalized_offers'
  | 'third_party_sharing'
  | 'analytics'
  | 'ai_processing'
  | 'health_data'
  | 'financial_data'
  | 'location_tracking';

interface ConsentPreference {
  customer_id: string;
  preferences: {
    purpose: ConsentPurpose;
    granted: boolean;
    channel?: string;
  }[];
  last_updated: string;
}
```

---

## 3. Customer Entity (ENHANCED)

```typescript
// hojai-data-models/entities/customer.ts

interface Customer {
  // Core
  id: string;
  tenant_id: string;
  type: 'individual' | 'business';
  
  // Identifiers
  phone?: string;
  email?: string;
  device_ids: string[];
  external_ids: Record<string, string>;  // channel → id
  
  // Identity Resolution
  unified_identity_id?: string;  // Links across channels
  
  // Profile
  name?: string;
  avatar_url?: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Location
  current_location?: GeoPoint;
  home_location?: GeoPoint;
  work_location?: GeoPoint;
  
  // Business
  business_name?: string;
  business_type?: string;
  gstin?: string;
  
  // Metrics
  lifetime_value: number;
  order_count: number;
  avg_order_value: number;
  last_order_date?: string;
  first_interaction_at?: string;
  last_interaction_at?: string;
  
  // Risk & Engagement
  churn_risk: 'low' | 'medium' | 'high';
  engagement_score: number;
  nps_score?: number;
  
  // Segmentation
  segments: string[];
  tags: string[];
  
  // Preferences
  preferences: CustomerPreferences;
  
  // Consent
  consent_status: ConsentStatus;
  
  // Status
  status: 'active' | 'inactive' | 'blocked';
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
}

interface CustomerPreferences {
  language: string;
  notification_channel: 'whatsapp' | 'sms' | 'email' | 'app';
  communication_tone: 'formal' | 'friendly' | 'casual';
  timezone: string;
}

interface ConsentStatus {
  marketing: boolean;
  communication: boolean;
  third_party: boolean;
  data_processing: boolean;
  last_consent_update?: string;
}
```

---

## 4. Knowledge Entity (ENHANCED - GRAPH MODEL)

```typescript
// hojai-data-models/entities/knowledge.ts

interface KnowledgeNode {
  // Core
  id: string;
  tenant_id: string;
  
  // Graph Position
  type: 'concept' | 'entity' | 'fact' | 'rule';
  
  // Content
  title: string;
  content: string;
  summary?: string;
  
  // Classification
  category: string;
  subcategory?: string;
  tags: string[];
  
  // Relationships
  edges: KnowledgeEdge[];
  
  // Source
  source_type: 'manual' | 'imported' | 'ai_generated' | 'extracted';
  source_id?: string;
  
  // AI
  embedding?: number[];  // For semantic search
  
  // Usage
  usage_count: number;
  helpful_count: number;
  not_helpful_count: number;
  
  // Quality
  quality_score?: number;
  verified: boolean;
  verified_by?: string;
  
  // Status
  status: 'draft' | 'active' | 'archived' | 'pending_review';
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

interface KnowledgeEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship: KnowledgeRelationship;
  confidence: number;
  bidirectional: boolean;
}

type KnowledgeRelationship = 
  | 'is_a'
  | 'part_of'
  | 'related_to'
  | 'causes'
  | 'enables'
  | 'conflicts_with'
  | 'depends_on';

interface KnowledgeSource {
  id: string;
  tenant_id: string;
  type: 'document' | 'website' | 'api' | 'manual';
  name: string;
  url?: string;
  last_synced_at?: string;
  status: 'active' | 'syncing' | 'error';
}
```

---

## Other Entities (Previously Defined)

| Entity | Purpose |
|--------|---------|
| Merchant | Business customers |
| Organization | Stores, branches |
| Conversation | Customer interactions |
| Event | System events |
| Workflow | Automations |
| Intent | User intent tracking |
| Location | Geo data |
| Campaign | Marketing campaigns |
| Agent | AI employees |

---

# PART 4: PLATFORM BOUNDARY CORRECTIONS

## Corrected Platform Order

```
1. Governance      ← Compliance & Security
2. Event          ← Event Processing
3. Data           ← Canonical Storage
4. Identity       ← WHO before WHAT
5. Memory         ← Context building
6. Intelligence  ← Predictions
7. Workflows      ← Automation
8. Agents        ← AI Employees
9. Communications ← Channels
10. Hyperlocal   ← Geo
11. Analytics    ← Insights
12. Industry     ← Cross-tenant Learning
```

**Why Identity before Memory?**

```
You need to know WHO before building memory around them.
```

---

# PART 5: BUILD SEQUENCE (V3.0)

## Immediate Build (Weeks 1-4)

| Priority | Work | Deliverable |
|----------|------|------------|
| **#1** | Tenant Entity | hojai-data-models/tenant.ts |
| **#2** | Consent Entity | hojai-data-models/consent.ts |
| **#3** | Customer 360 Enhancement | Unified customer view |
| **#4** | Knowledge Graph Model | KnowledgeNode + KnowledgeEdge |

## Phase 2 (Weeks 5-8)

| Priority | Work | Deliverable |
|----------|------|------------|
| **#5** | Identity Platform | Resolution, Linking, Matching |
| **#6** | Memory Enhancement | Context, Timeline |
| **#7** | Workflow Enhancement | Orchestration, Actions |

## Phase 3 (Weeks 9-12)

| Priority | Work | Deliverable |
|----------|------|------------|
| **#8** | Communications Enhancement | Full WhatsApp |
| **#9** | Intelligence Enhancement | Attribution, Intent |

## Phase 4 (Weeks 13-16)

| Priority | Work | Deliverable |
|----------|------|------------|
| **#10** | Analytics Platform | BI, What-if |
| **#11** | Hyperlocal Enhancement | Geo, Demand |

## Phase 5 (Weeks 17-20)

| Priority | Work | Deliverable |
|----------|------|------------|
| **#12** | Industry Governance | Rules, Compliance |
| **#13** | Merchant AI OS | First Product |

---

# PART 6: MERCHANT AI OS - PRODUCT LAYER

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MERCHANT AI OS                                      │
│                         First Commercial Product                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CUSTOMERS MODULE                             │   │
│  │                                                                      │   │
│  │  Customer List │ Customer Profile │ Segments │ Insights            │   │
│  │                                                                      │   │
│  │  Built on: Data Platform + Identity Platform + Memory Platform      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     CONVERSATIONS MODULE                             │   │
│  │                                                                      │   │
│  │  Inbox │ AI Assistant │ Templates │ Analytics                  │   │
│  │                                                                      │   │
│  │  Built on: Communications Platform + Agents Platform                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       AI EMPLOYEES MODULE                          │   │
│  │                                                                      │   │
│  │  Builder │ Training │ Performance │ Templates                    │   │
│  │                                                                      │   │
│  │  Built on: Agents Platform + Knowledge Graph                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       MEMORY MODULE                                │   │
│  │                                                                      │   │
│  │  Customer Memory │ Business Memory │ Knowledge Base               │   │
│  │                                                                      │   │
│  │  Built on: Memory Platform + Knowledge Graph                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      WORKFLOWS MODULE                               │   │
│  │                                                                      │   │
│  │  Builder │ Automations │ Triggers │ Performance                  │   │
│  │                                                                      │   │
│  │  Built on: Workflows Platform + Event Platform                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       CAMPAIGNS MODULE                              │   │
│  │                                                                      │   │
│  │  Create │ Audience │ Content │ Performance                      │   │
│  │                                                                      │   │
│  │  Built on: Communications Platform + Workflows Platform            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ANALYTICS MODULE                               │   │
│  │                                                                      │   │
│  │  Dashboard │ Reports │ Exports │ Benchmarks                     │   │
│  │                                                                      │   │
│  │  Built on: Analytics Platform + Data Platform                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       ROI DASHBOARD                                 │   │
│  │                                                                      │   │
│  │  Revenue │ Cost Savings │ Efficiency │ Growth                   │   │
│  │                                                                      │   │
│  │  Built on: All Platforms                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Specifications

### Customers Module

```typescript
interface CustomersModule {
  // Customer List
  list(filters: CustomerFilters): Promise<CustomerList>;
  
  // Customer Profile (360 View)
  getProfile(customerId: string): Promise<Customer360>;
  
  // Segments
  getSegments(): Promise<Segment[]>;
  createSegment(config: SegmentConfig): Promise<Segment>;
  
  // Insights
  getInsights(customerId: string): Promise<CustomerInsights>;
  getBehavior(customerId: string): Promise<BehaviorPattern[]>;
  
  // Consent
  getConsent(customerId: string): Promise<ConsentStatus>;
  updateConsent(customerId: string, consent: ConsentUpdate): Promise<void>;
}

// Customer 360 View
interface Customer360 {
  customer: Customer;
  identity: UnifiedIdentity;
  conversations: ConversationSummary[];
  orders: OrderSummary[];
  memory: MemorySummary[];
  predictions: PredictionSummary;
  segments: string[];
  lifetime_value: number;
  engagement_score: number;
  risk_assessment: RiskAssessment;
}
```

### AI Employees Module

```typescript
interface AIEmployeesModule {
  // Agent Builder
  createAgent(config: AgentConfig): Promise<Agent>;
  configureAgent(agentId: string, config: AgentConfig): Promise<Agent>;
  
  // Training
  trainAgent(agentId: string, data: TrainingData): Promise<TrainingResult>;
  evaluateAgent(agentId: string): Promise<EvaluationResult>;
  
  // Performance
  getStats(agentId: string): Promise<AgentStats>;
  getConversations(agentId: string): Promise<Conversation[]>;
  
  // Knowledge
  connectKnowledgeBase(agentId: string, kbId: string): Promise<void>;
  getKnowledgeBases(): Promise<KnowledgeBase[]>;
}
```

---

# PART 7: INTELLIGENCE GOVERNANCE

## Intelligence vs Industry Governance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE GOVERNANCE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  What AI CAN Learn:                                                       │
│  ├── Aggregated patterns (avg conversion: 67 days)                      │
│  ├── Benchmarks (avg order value by category)                           │
│  ├── Workflow performance metrics                                        │
│  ├── Agent effectiveness scores                                         │
│  └── Industry-specific patterns (seasonal demand)                         │
│                                                                             │
│  What AI CANNOT Learn:                                                   │
│  ├── Raw tenant data                                                    │
│  ├── Customer identities                                                 │
│  ├── Private merchant data                                              │
│  ├── Transaction details                                                 │
│  └── Communication content                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    INDUSTRY GOVERNANCE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Industry Brain Rules:                                                    │
│  ├── Min 3 tenants for aggregation                                      │
│  ├── Min 100 events for any pattern                                     │
│  ├── No tenant > 50% of aggregate                                      │
│  ├── Tenant ID hashed (never stored raw)                                 │
│  ├── Only anonymized patterns shared                                     │
│  └── Pattern confidence scoring                                          │
│                                                                             │
│  Industry Brain Governance:                                               │
│  ├── Allowed inputs per industry                                        │
│  ├── Forbidden inputs per industry                                       │
│  ├── Learning frequency (daily/weekly/monthly)                          │
│  ├── Update approval workflow                                           │
│  ├── Auto-rollback on degradation                                      │
│  └── GDPR/PDPA compliance                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Document: hojai-intelligence-governance.md

```markdown
# Hojai Intelligence Governance

## Allowed

* Aggregated metrics (avg, min, max)
* Benchmark scores
* Pattern confidence
* Workflow performance
* Agent effectiveness

## Forbidden

* Raw customer data
* Transaction details
* Communication content
* Merchant revenue figures
* User identities

## Privacy Rules

* Min 3 tenants for any aggregation
* Min 100 events per pattern
* Max 50% from single tenant
* Tenant ID always hashed
* Pattern expiry: 90 days
```

---

# PART 8: ORGANIZATIONAL RULE

## THE ONE RULE

> **If it doesn't belong to one of the 12 platforms → REJECT THE DESIGN**

## How to Use

```
New Request: "We need a WhatsApp message service"
├── Which platform owns WhatsApp? → Communications ✅
└── APPROVE

New Request: "We need customer purchase history"
├── Which platform owns customer data? → Data ✅
└── APPROVE

New Request: "We need a new AI agent type called 'Finance Advisor'"
├── Which platform owns agents? → Agents ✅
└── APPROVE

New Request: "We need a separate 'Customer Health Score service'"
├── Which platform? → Intelligence (already has churn_risk in Customer)
└── REJECT - Add as feature to Intelligence Platform
```

---

# PART 9: FINAL CHECKLIST

## Pre-Build (This Week)

- [ ] Tenant Entity (tenant.ts)
- [ ] Consent Entity (consent.ts)
- [ ] Knowledge Graph Model (knowledge.ts)
- [ ] hojai-data-models package structure

## Phase 1 (Weeks 1-4)

- [ ] Customer 360 Enhancement
- [ ] Memory Enhancement (Context, Timeline)
- [ ] Workflow Enhancement (Orchestration, Actions)
- [ ] Governance Enhancement (Consent Management)

## Phase 2 (Weeks 5-8)

- [ ] Identity Platform (Resolution, Linking, Matching)
- [ ] Communications Enhancement (Full WhatsApp)
- [ ] Intelligence Enhancement (Attribution, Intent)

## Phase 3 (Weeks 9-12)

- [ ] Analytics Platform (BI, What-if)
- [ ] Hyperlocal Enhancement (Geo, Demand)

## Phase 4 (Weeks 13-16)

- [ ] Industry Governance
- [ ] Merchant AI OS

---

# SUMMARY

## Architecture: LOCKED

```
12 Platforms
11 Canonical Entities + 3 NEW
Merchant AI OS Product Layer
Intelligence Governance
Industry Governance
```

## Build: START NOW

```
20% Architecture
80% Implementation

Priority:
1. Tenant Entity
2. Consent Entity
3. Knowledge Graph Model
4. Customer 360
5. Identity Platform
```

## Rule: ONE

> **Any new capability must belong to one of the 12 platforms.**

---

*Document Version: 3.0*
*Last Updated: May 30, 2026*
*Status: APPROVED FOR DEVELOPMENT*
*Architecture: 9.5/10*
*Build Sequence: 10/10*

**Stop designing. Start building.**
