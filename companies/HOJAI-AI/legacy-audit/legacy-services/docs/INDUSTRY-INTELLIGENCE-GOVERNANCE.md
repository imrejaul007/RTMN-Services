# HOJAI INDUSTRY INTELLIGENCE GOVERNANCE
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** GOVERNANCE SPEC

---

## Executive Summary

**Industry Intelligence Governance** defines the rules for how data flows between tenants and industry brains.

This is the most important governance document because:
- It protects tenant data privacy
- It enables industry-wide learning
- It ensures compliance
- It builds trust

---

## Core Principles

### 1. Data Isolation

```
Tenant Data NEVER leaves the tenant boundary in raw form.
```

### 2. Anonymous Aggregation

```
Only aggregated patterns are shared with industry brains.
```

### 3. Explicit Consent

```
Tenants must explicitly opt-in to contribute data.
```

### 4. Minimum Aggregation

```
Data must be aggregated across minimum 3 tenants.
```

### 5. Audit Everything

```
All data contributions are logged and auditable.
```

---

## The Three Zones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA ZONES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ZONE 1: TENANT ZONE                              │   │
│  │                                                                      │   │
│  │  • Raw tenant data (customer names, purchases, etc.)                  │   │
│  │  • Tenant ML models                                                │   │
│  │  • Tenant-specific predictions                                      │   │
│  │                                                                      │   │
│  │  Rules: Tenant owns everything here                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    │ Anonymous metrics ONLY                │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ZONE 2: AGGREGATION ZONE                         │   │
│  │                                                                      │   │
│  │  • Anonymized metrics (min 3 tenants)                             │   │
│  │  • Pattern extractions                                             │   │
│  │  • Model training data                                             │   │
│  │                                                                      │   │
│  │  Rules: No raw data, no PII, minimum aggregation                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    │ Industry patterns ONLY                 │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ZONE 3: INDUSTRY ZONE                            │   │
│  │                                                                      │   │
│  │  • Aggregated industry patterns                                      │   │
│  │  • Industry ML models                                               │   │
│  │  • Industry benchmarks                                              │   │
│  │                                                                      │   │
│  │  Rules: Public patterns only, no tenant attribution                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Rules

### Rule 1: Raw Data Never Leaves Tenant

```
ALLOWED:
  Tenant → Anonymized metrics → Industry Brain

NOT ALLOWED:
  Tenant → Raw customer data → Industry Brain
```

### Rule 2: Minimum Aggregation

```
Before sharing ANY metric with industry brain:
  ✓ Minimum 3 tenants must contribute
  ✓ Minimum 100 events must be aggregated
  ✓ No single tenant can contribute >50% of aggregate
```

### Rule 3: No Direct Attribution

```
Industry Brain can know:
  "50% of jewellery purchases are bridal"

Industry Brain CANNOT know:
  "XYZ Jewellery contributes 30% of bridal purchases"
```

### Rule 4: Explicit Opt-In

```
Tenants must explicitly enable data contribution.
Default is: OPTED OUT
```

---

## What Can Be Shared

### Anonymous Metrics

```typescript
// ✅ ALLOWED: Anonymous metrics
interface AllowedMetric {
  // Aggregated values
  avg_order_value_bucket: '30k-50k' | '50k-70k' | '70k-100k';
  purchase_frequency_bucket: 'weekly' | 'monthly' | 'quarterly';
  
  // Counts (minimum 3 tenants)
  conversion_rate: number;           // 0.34 (34%)
  avg_days_to_convert: number;       // 67 days
  
  // Pattern indicators
  seasonal_pattern: string[];         // ['oct', 'nov', 'mar']
  peak_hours: number[];             // [19, 20, 21]
  
  // Category tags
  category: string;                // 'jewellery'
  sub_category: string;             // 'bridal'
}
```

### Industry Patterns

```typescript
// ✅ ALLOWED: Industry patterns
interface IndustryPattern {
  // Pattern type
  pattern_type: 'conversion_timeline' | 'demand_spike' | 'retention_curve';
  
  // Pattern data
  pattern: {
    avg_value: number;
    min_value: number;
    max_value: number;
    percentiles: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
  };
  
  // Context
  context: {
    industry: string;
    geography?: string;         // 'bangalore', not customer addresses
    time_period?: string;       // 'festival_season'
    segment?: string;           // 'bridal', not customer names
  };
  
  // Quality
  quality: {
    tenant_count: number;       // >= 3
    sample_size: number;         // >= 100
    confidence: number;          // >= 0.8
  };
}
```

---

## What Cannot Be Shared

### Explicitly Prohibited

```typescript
// ❌ NEVER: Raw customer data
interface ProhibitedData {
  // Personal Identifiers
  customer_name: string;           // NEVER
  customer_phone: string;           // NEVER
  customer_email: string;          // NEVER
  customer_address: string;         // NEVER
  
  // Specific Transactions
  specific_purchase: {
    customer_id: string;           // NEVER
    item: string;                 // 'gold ring'
    price: number;                // ₹45,000
    date: Date;                   // Specific date
  };
  
  // Individual Behavior
  individual_journey: {
    customer_id: string;           // NEVER
    actions: string[];            // Sequence of actions
  };
  
  // Tenant-Specific Data
  tenant_metrics: {
    tenant_id: string;            // NEVER
    revenue: number;              // NEVER
    customer_count: number;        // NEVER
  };
}
```

### Pattern Examples

| Allowed | Not Allowed |
|---------|-------------|
| "Avg bridal conversion: 67 days" | "Customer X converted in 67 days" |
| "30% prefer gold" | "XYZ customer bought gold" |
| "Festival season: Oct-Nov-Mar" | "Rejaul purchased during Diwali" |
| "Top category: rings" | "XYZ sold 500 rings" |

---

## Aggregation Rules

### Minimum Thresholds

```typescript
interface AggregationRule {
  // Minimum tenants
  min_tenant_count: 3;
  
  // Minimum events
  min_event_count: 100;
  
  // Maximum single tenant contribution
  max_single_tenant_contribution: 0.5;  // 50%
  
  // Minimum confidence
  min_confidence: 0.8;
  
  // Time window
  aggregation_window: '7d' | '30d' | '90d';
}
```

### Aggregation Methods

```typescript
// Method 1: Average
function aggregateAverage(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Method 2: Percentile
function aggregatePercentile(values: number[], percentile: number): number {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Method 3: Bucket
function aggregateBucket(
  values: number[], 
  bucketSize: number
): Record<string, number> {
  // Returns distribution, not individual values
  const buckets: Record<string, number> = {};
  values.forEach(v => {
    const bucket = Math.floor(v / bucketSize) * bucketSize;
    buckets[`${bucket}-${bucket + bucketSize}`] = 
      (buckets[`${bucket}-${bucket + bucketSize}`] || 0) + 1;
  });
  return buckets;
}
```

---

## Tenant Contribution Process

### 1. Opt-In Flow

```
Tenant Admin Dashboard
        │
        ▼
┌─────────────────────────┐
│ Enable Industry        │
│ Contribution          │
│ (Default: OFF)       │
└──────────┬────────────┘
           │
           ▼
┌─────────────────────────┐
│ Select Data Categories  │
│ □ Purchase patterns     │
│ □ Conversion timing    │
│ □ Demand patterns      │
│ □ Customer segments   │
└──────────┬────────────┘
           │
           ▼
┌─────────────────────────┐
│ Review Consent         │
│ "Your data will be    │
│ aggregated with 2+    │
│ other tenants"         │
└──────────┬────────────┘
           │
           ▼
┌─────────────────────────┐
│ Enable Contribution    │
│ (Explicit consent)     │
└─────────────────────────┘
```

### 2. Contribution API

```typescript
interface ContributionConfig {
  tenant_id: string;
  
  // What's enabled
  enabled_categories: DataCategory[];
  
  // What's disabled
  excluded_patterns: string[];
  
  // Consent
  consent: {
    granted_at: Date;
    consent_type: 'explicit';
    approver_id: string;
  };
  
  // Frequency
  contribution_frequency: 'hourly' | 'daily' | 'weekly';
}

interface ContributionRecord {
  id: string;
  tenant_id: string;
  
  // Data sent
  category: DataCategory;
  metrics: AllowedMetric[];
  
  // Quality
  tenant_count: number;
  event_count: number;
  
  // Audit
  sent_at: Date;
  accepted: boolean;
  accepted_by_industry_brain?: string;
}
```

---

## Industry Brain Learning Rules

### Learning Cycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LEARNING CYCLE                                    │
└─────────────────────────────────────────────────────────────────────────┘

1. RECEIVE METRICS
   │
   └─► Industry Brain receives anonymized metrics from tenants
       │
       ▼
2. VALIDATE QUALITY
   │
   └─► Check: min 3 tenants, min 100 events, no anomalies
       │
       ▼
3. AGGREGATE PATTERNS
   │
   └─► Aggregate across tenants using approved methods
       │
       ▼
4. EXTRACT PATTERNS
   │
   └─► ML models extract patterns from aggregated data
       │
       ▼
5. VALIDATE PATTERNS
   │
   └─► Human review for sensitive patterns
       │
       ▼
6. PUBLISH PATTERNS
   │
   └─► Patterns available to all contributing tenants
       │
       ▼
7. FEEDBACK LOOP
   │
   └─► Tenants report pattern effectiveness
       │
       ▼ (back to step 1)
```

### Pattern Validation

```typescript
interface PatternValidation {
  // Statistical checks
  statistical: {
    is_outlier: boolean;        // Is this tenant an outlier?
    distribution_check: boolean;  // Is distribution normal?
    variance_check: boolean;      // Is variance acceptable?
  };
  
  // Privacy checks
  privacy: {
    min_tenants: boolean;       // >= 3 tenants
    max_single_contribution: boolean;  // No >50% from one tenant
    no_pii: boolean;            // No PII detected
  };
  
  // Quality checks
  quality: {
    min_sample_size: boolean;   // >= 100 events
    min_confidence: boolean;     // >= 0.8
  };
  
  // Decision
  is_valid: boolean;
  validation_errors?: string[];
}
```

---

## Consent Management

### Tenant Consent

```typescript
interface TenantConsent {
  tenant_id: string;
  
  // Overall consent
  can_contribute: boolean;
  can_receive: boolean;
  
  // Category-specific consent
  categories: {
    category: DataCategory;
    can_contribute: boolean;
    can_receive: boolean;
  }[];
  
  // Restrictions
  restrictions: {
    no_competitor_sharing: boolean;
    geographic_restriction?: string[];
    time_restriction?: string;
  };
  
  // Legal
  legal: {
    agreement_version: string;
    agreed_at: Date;
    agreement_url: string;
  };
  
  // History
  history: ConsentChange[];
}

interface ConsentChange {
  change_type: 'enabled' | 'disabled' | 'updated';
  categories_affected: DataCategory[];
  changed_by: string;
  changed_at: Date;
  reason?: string;
}
```

### Withdrawal Process

```typescript
// Tenant can withdraw consent at any time
interface ConsentWithdrawal {
  tenant_id: string;
  
  // What's withdrawn
  withdrawal_type: 'full' | 'partial';
  categories?: DataCategory[];  // If partial
  
  // Effect
  effect: {
    stop_contribution_immediately: boolean;
    remove_from_future_aggregations: boolean;
    // Historical data handling
    historical_data: 'retain_aggregated' | 'delete' | 'anonymize';
  };
  
  // Timeline
  withdrawal_processing_time: 'immediate' | '24h' | '7d';
}
```

---

## Audit & Compliance

### Audit Log

```typescript
interface IndustryIntelligenceAudit {
  id: string;
  timestamp: Date;
  
  // Actor
  actor: {
    type: 'tenant' | 'system' | 'industry_brain';
    tenant_id?: string;
    user_id?: string;
  };
  
  // Action
  action: {
    type: AuditAction;
    category?: DataCategory;
    pattern_id?: string;
  };
  
  // Data
  data: {
    metrics_sent?: AllowedMetric[];
    patterns_received?: IndustryPattern[];
    aggregation_method?: string;
  };
  
  // Compliance
  compliance: {
    min_tenants_checked: boolean;
    no_pii_checked: boolean;
    consent_verified: boolean;
  };
}

type AuditAction = 
  | 'contribution.sent'
  | 'contribution.received'
  | 'contribution.rejected'
  | 'pattern.learned'
  | 'pattern.published'
  | 'pattern.used'
  | 'consent.granted'
  | 'consent.withdrawn';
```

### Compliance Reports

```typescript
interface ComplianceReport {
  // Period
  period: {
    start: Date;
    end: Date;
  };
  
  // Contributions
  contributions: {
    total_contributions: number;
    by_category: Record<DataCategory, number>;
    by_tenant: Record<string, number>;
  };
  
  // Patterns
  patterns: {
    total_patterns: number;
    by_industry: Record<string, number>;
    new_patterns: number;
    updated_patterns: number;
  };
  
  // Quality
  quality: {
    avg_aggregation_count: number;  // Avg tenants per aggregation
    min_aggregation_violations: number;
    pii_violations: number;
  };
  
  // Consent
  consent: {
    tenants_with_consent: number;
    consent_withdrawn: number;
    consent_issues: number;
  };
}
```

---

## Data Retention

### Retention Rules

```typescript
interface RetentionRules {
  // Raw contributions (from tenants)
  raw_contributions: {
    retention_days: 30;
    // After 30 days, raw data is deleted
    // Only aggregated patterns remain
  };
  
  // Anonymized metrics
  anonymized_metrics: {
    retention_days: 365;
    // Metrics are anonymized after initial aggregation
    // Kept for pattern training
  };
  
  // Industry patterns
  industry_patterns: {
    retention_days: null;  // Indefinite
    // Patterns are valuable and don't contain PII
  };
  
  // Audit logs
  audit_logs: {
    retention_days: 2555;  // 7 years
    // Required for compliance
  };
}
```

### Deletion Process

```typescript
interface DeletionRequest {
  tenant_id: string;
  
  // What to delete
  deletion_scope: {
    raw_contributions: boolean;
    anonymized_metrics: boolean;
    derived_patterns: boolean;  // Patterns this tenant helped create
  };
  
  // Cascade to industry brains
  cascade: {
    notify_industry_brains: boolean;
    recalculate_patterns: boolean;  // Remove this tenant's contribution
  };
  
  // Verification
  verification: {
    data_deleted: boolean;
    patterns_recalculated: boolean;
    confirmation_sent: boolean;
  };
}
```

---

## Industry-Specific Rules

### Jewellery Industry

```typescript
const jewelleryRules: IndustryRules = {
  allowed_patterns: [
    'bridal_conversion_timeline',
    'festival_demand_peaks',
    'category_preferences',
    'price_range_distribution',
    'follow_up_timing',
    'seasonal_variations'
  ],
  
  disallowed_patterns: [
    'specific_purchase_history',
    'individual_customer_profiles',
    'pricing_at_tenant_level'
  ],
  
  min_tenants_for_pattern: 5,  // Jewellery needs more tenants for statistical significance
  special_considerations: [
    'Bridal vs regular purchase separation',
    'Gold vs diamond preference patterns',
    'Festival calendar awareness'
  ]
};
```

### Healthcare Industry

```typescript
const healthcareRules: IndustryRules = {
  allowed_patterns: [
    'appointment_no_show_rates',
    'treatment_demand_patterns',
    'seasonal_health_trends',
    'patient_flow_patterns',
    'appointment_duration_buckets',
    'specialty_demand'
  ],
  
  disallowed_patterns: [
    'patient_identities',
    'medical_records',
    'specific_treatments',
    'individual_health_records',
    'diagnosis_data'
  ],
  
  special_considerations: [
    'HIPAA compliance',
    'DPDP Act compliance',
    'Minimum sample sizes for rare conditions',
    'No individual patient attribution'
  ]
};
```

### Retail Industry

```typescript
const retailRules: IndustryRules = {
  allowed_patterns: [
    'basket_size_distribution',
    'repeat_purchase_frequency',
    'category_affinity',
    'promotion_response',
    'peak_shopping_hours',
    'checkout_abandonment_rates'
  ],
  
  disallowed_patterns: [
    'individual_purchase_history',
    'product_level_data',
    'customer_identities',
    'pricing_strategies'
  ],
  
  min_tenants_for_pattern: 3,
  special_considerations: [
    'Online vs offline separation',
    'Category-specific patterns',
    'Festival/seasonal awareness'
  ]
};
```

---

## API Endpoints

### Consent Management

```
# Tenant Consent
GET    /api/consent                    - Get consent status
POST   /api/consent                    - Update consent
POST   /api/consent/withdraw           - Withdraw consent

# Consent Audit
GET    /api/consent/history            - Consent history
GET    /api/consent/agreements        - Get agreement versions
```

### Contributions

```
# Tenant Contributions
POST   /api/contribute               - Send contribution
GET    /api/contribute/history        - Contribution history
GET    /api/contribute/status         - Current status

# Contribution Validation
POST   /api/contribute/validate      - Validate before sending
```

### Patterns

```
# Receive Patterns
GET    /api/patterns/:industry       - Get industry patterns
GET    /api/patterns/:industry/:type - Get specific pattern type
POST   /api/patterns/feedback        - Submit pattern feedback

# Pattern Quality
GET    /api/patterns/quality         - Pattern quality metrics
```

### Admin

```
# System
GET    /api/admin/aggregation-stats   - Aggregation statistics
GET    /api/admin/compliance-report  - Compliance report
POST   /api/admin/audit-export       - Export audit logs
```

---

## Example Flows

### Flow 1: Jewellery Tenant Contributes Data

```
1. XYZ Jewellery opts in to industry contribution
   └─► Consent granted, categories selected

2. XYZ Jewellery sends monthly metrics
   └─► Metrics: { category: 'bridal', avg_days_to_convert: 67 }
   └─► Validation: 3+ tenants, 100+ events, no PII ✓

3. Industry Brain receives and validates
   └─► Check: min tenants ✓
   └─► Check: no outliers ✓
   └─► Check: anonymized ✓

4. Industry Brain aggregates with other tenants
   └─► Aggregate: (67 + 72 + 58 + 65) / 4 = 65.5 days
   └─► Pattern: "Avg bridal conversion: 65.5 days"

5. Pattern published to all contributing tenants
   └─► XYZ Jewellery sees: "Industry avg: 65.5 days, Your avg: 67 days"
```

### Flow 2: Retail Tenant Uses Industry Pattern

```
1. ABC Retail queries Industry Brain
   └─► GET /api/patterns/retail/basket_behavior

2. Industry Brain returns patterns
   └─► Pattern: "Peak basket size: ₹1500-2000"
   └─► Pattern: "Most common add-ons: beverages, snacks"
   └─► Pattern: "Promotion response: +35% conversion"

3. ABC Retail applies insights
   └─► Bundle pricing: ₹1500 + ₹200 = ₹1650
   └─► Promotions: Offer add-ons at checkout

4. ABC Retail provides feedback
   └─► POST /api/patterns/feedback
   └─► "Promotion response +38% (vs 35% predicted)"
```

---

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 29, 2026 | Hojai AI | Initial spec |

---

## Appendix: Definitions

| Term | Definition |
|------|------------|
| **Anonymous Metric** | Data that cannot be traced back to an individual or tenant |
| **Aggregation** | Combining data from multiple tenants to hide individual contributions |
| **Pattern** | A discovered relationship or trend in the data |
| **Industry Brain** | ML system that learns patterns across tenants |
| **Consent** | Explicit permission from tenant to participate |

---

*This is the Hojai Industry Intelligence Governance Specification.*
