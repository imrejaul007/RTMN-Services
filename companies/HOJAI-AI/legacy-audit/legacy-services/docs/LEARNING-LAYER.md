# HOJAI V2 LEARNING LAYER
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** DESIGN

---

## Overview

This document defines the three-layer learning architecture for Hojai v2.

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOJAI LEARNING LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           LAYER 1: TENANT LEARNING                      │   │
│  │                                                          │   │
│  │    REZ ──────────► REZ ML Models (Private)             │   │
│  │    XYZ ──────────► XYZ ML Models (Private)             │   │
│  │    ABC ──────────► ABC ML Models (Private)             │   │
│  │                                                          │   │
│  │    Each tenant trains their own models                  │   │
│  │    Data NEVER leaves the tenant                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼ Anonymous Metrics Only           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           LAYER 2: INDUSTRY LEARNING                   │   │
│  │                                                          │   │
│  │    Jewellery ────► Jewellery Brain                     │   │
│  │    Healthcare ───► Healthcare Brain                     │   │
│  │    Hospitality ──► Hospitality Brain                    │   │
│  │                                                          │   │
│  │    Aggregated patterns only                              │   │
│  │    NO raw customer data                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼ Platform Metrics Only            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           LAYER 3: GLOBAL LEARNING                    │   │
│  │                                                          │   │
│  │    Platform-wide: Workflow optimizations                 │   │
│  │    Platform-wide: Agent behavior patterns                │   │
│  │    Platform-wide: Best practices                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Tenant Learning

### 1.1 Concept

Each tenant (REZ, XYZ Retail, ABC Hospital) has **completely private ML models** trained on their own data.

**Key Principle:**
```
Tenant Data NEVER leaves the tenant boundary.
```

---

### 1.2 What Gets Trained

| Tenant | Models Trained |
|--------|---------------|
| REZ | REZ-specific churn, LTV, recommendations |
| XYZ Retail | XYZ-specific purchase prediction, basket analysis |
| ABC Hospital | ABC-specific no-show prediction, retention |

---

### 1.3 Data Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                    REZ BOUNDARY                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  REZ Data (MongoDB)                                  │   │
│  │  • Customer data                                     │   │
│  │  • Transaction data                                  │   │
│  │  • Behavior data                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  REZ ML Training                                     │   │
│  │  • Churn model                                       │   │
│  │  • LTV model                                         │   │
│  │  • Recommendation model                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  REZ Predictions (Private API)                       │   │
│  │  • churn_probability                                 │   │
│  │  • lifetime_value                                    │   │
│  │  • next_best_action                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  DATA NEVER LEAVES THIS BOUNDARY                            │
└─────────────────────────────────────────────────────────────┘
```

---

### 1.4 Implementation

```typescript
// Tenant-specific ML training

interface TenantMLConfig {
  tenant_id: string;
  models: {
    churn: ModelConfig;
    ltv: ModelConfig;
    recommendations: ModelConfig;
  };
  training: {
    frequency: 'daily' | 'weekly' | 'monthly';
    data_window: number; // days
  };
}

// Each tenant has their own model instances
class TenantMLService {
  private tenant_id: string;
  private models: Map<string, any>;

  async train(modelType: string): Promise<void> {
    // Only access tenant-specific data
    const data = await this.getTenantData(modelType);

    // Train model
    const model = await this.trainModel(data);

    // Save to tenant-specific storage
    await this.saveModel(modelType, model);
  }

  async predict(modelType: string, userId: string): Promise<Prediction> {
    // Only use tenant-specific model
    const model = await this.getModel(modelType);

    // Predict
    return model.predict(userId);
  }
}
```

---

### 1.5 API Design

```typescript
// Tenant-scoped ML API

// POST /api/ml/train - Train tenant models
// GET /api/ml/predict/:type/:userId - Get prediction
// GET /api/ml/model/:type/info - Get model info

// Example: REZ training their churn model
POST /api/ml/train
X-Tenant-Id: rez-intelligence
X-API-Key: rez-internal-key

{
  "model": "churn",
  "data_window": 90, // days
  "features": ["order_frequency", "avg_order_value", "days_since_last"]
}
```

---

## Layer 2: Industry Learning

### 2.1 Concept

Industry Brains learn patterns **across multiple tenants** WITHOUT storing any tenant data.

**Key Principle:**
```
Only aggregated, anonymous patterns.
NO raw customer data.
```

---

### 2.2 What Gets Learned

| Industry | Patterns Learned |
|----------|------------------|
| **Jewellery** | Bridal conversion timeline, festival demand peaks, follow-up timing |
| **Healthcare** | Appointment no-show rate, treatment duration, retention curves |
| **Hospitality** | Booking lead time, cancellation rate, upsell moment |
| **Retail** | Basket size distribution, repeat purchase cycle, promotion response |

---

### 2.3 Pattern Examples

**Allowed (Anonymous Patterns):**
```typescript
// Jewellery Brain
interface JewelleryPattern {
  industry: 'jewellery';
  pattern_type: 'bridal_conversion';

  // Anonymous aggregates
  avg_days_to_convert: 67;           // 45-90 days
  conversion_rate: 0.34;             // 34%
  peak_inquiry_months: ['oct', 'nov', 'mar'];  // Festival months

  // NO customer names
  // NO customer phone numbers
  // NO specific purchase details
}

// Healthcare Brain
interface HealthcarePattern {
  industry: 'healthcare';
  pattern_type: 'no_show';

  // Anonymous aggregates
  avg_no_show_rate: 0.18;           // 18%
  no_show_by_day: { mon: 0.15, fri: 0.22 };  // Friday has higher
  no_show_by_lead_time: { same_day: 0.35, week_out: 0.12 };

  // NO patient names
  // NO patient IDs
  // NO specific appointment details
}
```

**Not Allowed (Raw Data):**
```typescript
// NEVER stored
interface Violation {
  customer_name: 'Rejaul Karim';     // ❌ NEVER
  phone: '+919876543210';           // ❌ NEVER
  purchase_history: ['gold ring'];   // ❌ NEVER
  appointment_details: 'Dr. X';     // ❌ NEVER
}
```

---

### 2.4 How Patterns Are Extracted

```
┌─────────────────────────────────────────────────────────────┐
│                   Pattern Extraction Flow                    │
│                                                              │
│  Tenant XYZ                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Raw Events                                           │   │
│  │  • Customer "Rejaul" purchased "gold ring"            │   │
│  │  • Customer "Priya" viewed "diamond necklace"          │   │
│  │  • Customer "Amit" visited 3 times                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Feature Extraction (at tenant)                      │   │
│  │  • Purchase frequency: 2/week                       │   │
│  │  • Avg order value: ₹45000                          │   │
│  │  • Days since last: 45                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Anonymous Metrics (sent to Industry Brain)          │   │
│  │  • conversion_rate: 0.34                             │   │
│  │  • avg_order_value_bucket: '40k-60k'                 │   │
│  │  • purchase_frequency_bucket: 'weekly'                │   │
│  │  • category: 'jewellery'                             │   │
│  │  • month: 'nov'                                     │   │
│  │  • tenant_id: 'xyz_jewellery' (hashed)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Jewellery Brain                                     │   │
│  │  • Aggregates across 50+ jewellery clients           │   │
│  │  • Learns: "Bridal buyers convert in 45-90 days"    │   │
│  │  • Learns: "November has 40% higher inquiries"       │   │
│  │  • NO individual customer data                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.5 Implementation

```typescript
// Industry Brain Service

interface IndustryBrainService {
  // Receive anonymous metrics
  async receiveMetrics(metrics: AnonymousMetrics): Promise<void>;

  // Aggregate patterns
  async aggregatePatterns(industry: string): Promise<IndustryPattern[]>;

  // Query patterns
  async getPatterns(industry: string, patternType: string): Promise<IndustryPattern[]>;
}

// Anonymous metrics structure
interface AnonymousMetrics {
  // NO PII
  industry: string;
  pattern_type: string;

  // Aggregated values only
  values: Record<string, number | string | string[]>;
  counts: {
    total_events: number;   // minimum 10 for aggregation
    unique_users: number;    // minimum 10
  };

  // Metadata (no PII)
  tenant_hash: string;      // hashed, not real tenant ID
  timestamp: string;
  geography?: string;        // 'bangalore', 'mumbai', not customer addresses
}

// Privacy-preserving aggregation
class PrivacyPreservingAggregator {
  async aggregate(metrics: AnonymousMetrics[]): Promise<IndustryPattern> {
    // Minimum count check
    const totalCount = metrics.reduce((sum, m) => sum + m.counts.total_events, 0);
    if (totalCount < 100) {
      throw new Error('Insufficient data for aggregation (min: 100 events)');
    }

    // Minimum tenant check
    const uniqueTenants = new Set(metrics.map(m => m.tenant_hash));
    if (uniqueTenants.size < 3) {
      throw new Error('Insufficient tenants for aggregation (min: 3)');
    }

    // Aggregate values (no individual records)
    return {
      industry: metrics[0].industry,
      pattern_type: metrics[0].pattern_type,
      avg_value: this.calculateAverage(metrics),
      percentiles: this.calculatePercentiles(metrics),
      buckets: this.createBuckets(metrics)
    };
  }
}
```

---

### 2.6 Industry Brain Ports

| Port | Service | Patterns Learned |
|------|---------|------------------|
| 4700 | Jewellery Brain | Bridal, festival, follow-up |
| 4710 | Healthcare Brain | No-show, retention, treatment |
| 4720 | Hospitality Brain | Booking, cancellation, upsell |
| 4730 | Retail Brain | Basket, repeat, conversion |
| 4740 | Education Brain | Completion, dropout, engagement |
| 4750 | Finance Brain | Payment, credit, investment |
| 4760 | Real Estate Brain | Timeline, lead, site visit |

---

### 2.7 Pattern Sharing API

```typescript
// GET /api/patterns/:industry/:patternType
// Returns aggregated patterns for a tenant to use

// Example: XYZ Jewellery wants bridal conversion insights
GET /api/patterns/jewellery/bridal_conversion
X-Tenant-Id: xyz-jewellery
X-API-Key: xyz-api-key

Response:
{
  success: true,
  data: {
    industry: 'jewellery',
    pattern_type: 'bridal_conversion',

    // XYZ's own data (private)
    xyz_conversion_rate: 0.34,
    xyz_avg_days_to_convert: 67,

    // Industry benchmark (from Jewellery Brain)
    industry_conversion_rate: 0.28,
    industry_avg_days_to_convert: 72,
    top_converting_months: ['oct', 'nov', 'mar'],

    // Recommendations
    insights: [
      'Your conversion rate is 21% above industry average',
      'Consider more follow-ups in months 2-3'
    ]
  }
}
```

---

## Layer 3: Global Learning

### 3.1 Concept

Platform-wide learning across all tenants and industries.

**Key Principle:**
```
Platform metrics, NOT tenant data.
```

---

### 3.2 What Gets Learned

| Category | Metrics Learned |
|----------|-----------------|
| **Workflow Performance** | Average completion rate, common failures, best triggers |
| **Agent Behavior** | Resolution rates, escalation rates, avg handle time |
| **Communication** | Open rates by channel, response rates, timing |
| **Platform Health** | Uptime, latency, error rates, capacity |

---

### 3.3 Global Patterns

```typescript
// Global workflow patterns
interface GlobalWorkflowPattern {
  type: 'workflow_completion';

  // Aggregated platform metrics
  avg_completion_rate: 0.85;         // 85% workflows complete
  common_failure_points: ['step_3', 'approval'];
  best_trigger_types: ['event', 'schedule'];

  // Recommendations
  improvement_tips: [
    'Add retries for external API calls',
    'Shorten approval workflows'
  ];
}

// Global agent patterns
interface GlobalAgentPattern {
  type: 'agent_resolution';

  // Aggregated across all agents
  avg_resolution_rate: 0.78;          // 78% issues resolved by agent
  avg_escalation_rate: 0.22;        // 22% escalated
  avg_handle_time_seconds: 180;      // 3 minutes

  // By agent type
  by_type: {
    support: { resolution: 0.82, escalate: 0.18 },
    sales: { resolution: 0.71, escalate: 0.29 },
    booking: { resolution: 0.89, escalate: 0.11 }
  };
}

// Global communication patterns
interface GlobalCommunicationPattern {
  type: 'channel_performance';

  // By channel
  channels: {
    whatsapp: { open_rate: 0.85, response_rate: 0.45 },
    sms: { open_rate: 0.95, response_rate: 0.12 },
    email: { open_rate: 0.25, response_rate: 0.05 },
    push: { open_rate: 0.40, response_rate: 0.08 }
  };

  // Best timing
  best_send_times: {
    whatsapp: ['10:00', '19:00'],
    sms: ['09:00', '18:00'],
    email: ['10:00', '14:00']
  };
}
```

---

### 3.4 Implementation

```typescript
// Global learning service

interface GlobalMetrics {
  workflow_metrics: {
    total_executions: number;
    completion_rate: number;
    avg_duration_seconds: number;
    failure_points: string[];
  };

  agent_metrics: {
    total_interactions: number;
    resolution_rate: number;
    escalation_rate: number;
    avg_handle_time: number;
  };

  communication_metrics: {
    total_messages: number;
    open_rates: Record<string, number>;
    response_rates: Record<string, number>;
  };

  system_metrics: {
    uptime: number;
    avg_latency_ms: number;
    error_rate: number;
  };
}

// Collect and aggregate
class GlobalLearningService {
  async collectMetrics(service: string, metrics: any): Promise<void> {
    // Store in global metrics store
    await this.storeMetrics(service, metrics);

    // Recalculate patterns daily
    await this.recalculatePatterns();
  }

  async getPatterns(): Promise<GlobalPattern[]> {
    return this.patternStore.findAll();
  }
}
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                                  │
│                                                                      │
│  ┌───────────────┐                                                 │
│  │ REZ Data      │                                                 │
│  │ (Private)     │──────► REZ ML Models ──────► REZ Predictions   │
│  │               │                                                 │
│  │               │──────► Anonymous ──────────► Industry Brain     │
│  │               │       Metrics               (Jewellery, etc.)  │
│  └───────────────┘                                                 │
│                                                                      │
│  ┌───────────────┐                                                 │
│  │ XYZ Data      │──────► XYZ ML Models ─────► XYZ Predictions   │
│  │ (Private)     │                                                 │
│  │               │──────► Anonymous ──────────► Industry Brain     │
│  │               │       Metrics               (Aggregated)      │
│  └───────────────┘                                                 │
│                                                                      │
│  ┌───────────────┐                                                 │
│  │ ABC Data      │──────► ABC ML Models ─────► ABC Predictions   │
│  │ (Private)     │                                                 │
│  │               │──────► Anonymous ──────────► Industry Brain     │
│  │               │       Metrics                                 │
│  └───────────────┘                                                 │
│                              │                                     │
│                              ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Platform Metrics ───────────────────────────────────────► │
│  │  Global Learning Service                                   │   │
│  │  • Workflow patterns                                       │   │
│  │  • Agent behavior                                          │   │
│  │  • Best practices                                          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Privacy Rules

### Strict Enforcement

| Data Type | Layer 1 | Layer 2 | Layer 3 |
|-----------|---------|---------|---------|
| Customer names | ✅ Private | ❌ Never | ❌ Never |
| Phone numbers | ✅ Private | ❌ Never | ❌ Never |
| Email addresses | ✅ Private | ❌ Never | ❌ Never |
| Purchase details | ✅ Private | ❌ Never | ❌ Never |
| Transaction amounts | ✅ Private | ⚠️ Buckets | ❌ Never |
| Location | ✅ Private | ⚠️ City only | ❌ Never |
| Behavior patterns | ✅ Private | ✅ Aggregated | ✅ Metrics |
| Workflow metrics | ✅ Private | ✅ Aggregated | ✅ Metrics |

**Legend:**
- ✅ Private = Only in tenant boundary
- ⚠️ Buckets = Aggregated into buckets (e.g., "₹40k-60k")
- ❌ Never = Never leaves tenant

---

## Compliance Considerations

### Data Minimization

1. **Minimum Aggregation:** Never aggregate less than 10 events or 3 tenants
2. **K-Anonymity:** Ensure patterns can't be reverse-engineered to individuals
3. **Differential Privacy:** Add noise to sensitive aggregations (later phase)

### Audit Trail

```typescript
// Every pattern contribution is logged
interface PatternContribution {
  id: string;
  tenant_hash: string;        // Not real tenant ID
  industry: string;
  pattern_type: string;
  values_submitted: string[]; // Field names only
  event_count: number;
  timestamp: string;

  // For compliance
  consent_verified: boolean;
  data_used_for: 'pattern_learning';
}
```

---

## Migration Plan

### Phase 1 (Day 1 - 1 month)

**Focus:** Layer 1 - Tenant Learning

- [ ] Implement tenant-scoped ML training
- [ ] Add model versioning per tenant
- [ ] Create private prediction APIs

---

### Phase 2 (Month 2 - 3)

**Focus:** Layer 2 - Industry Learning (Simple)

- [ ] Create Industry Brain services (4700-4760)
- [ ] Implement anonymous metrics collection
- [ ] Add minimum aggregation checks
- [ ] Create pattern sharing APIs

---

### Phase 3 (Month 4 - 6)

**Focus:** Layer 3 - Global Learning

- [ ] Implement platform metrics collection
- [ ] Create global pattern store
- [ ] Add best practice recommendations

---

### Phase 4 (Later)

**Focus:** Privacy Enhancements

- [ ] Implement differential privacy
- [ ] Add federated learning for industry brains
- [ ] Create privacy audit dashboard

---

*Document Version: 1.0*
*Last Updated: May 29, 2026*
