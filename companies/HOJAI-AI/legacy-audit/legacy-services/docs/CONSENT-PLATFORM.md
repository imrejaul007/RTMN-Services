# HOJAI CONSENT PLATFORM
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** ARCHITECTURE SPEC

---

## Executive Summary

**Consent Platform** manages customer permissions for data usage across Hojai.

This is critical because:
- REZ Intelligence touches **health, finance, employment, mobility** data
- GDPR, DPDP Act, HIPAA require explicit consent management
- Customers must control their data

**Consent Platform** provides:
- Centralized consent management
- Data usage policies
- Consent verification
- Audit trails
- Revocation handling

---

## Why Consent Matters

### Data Types Handled by Hojai

| Industry | Data Types | Regulation |
|----------|------------|------------|
| **Healthcare** | Medical records, symptoms | HIPAA, DPDP |
| **Finance** | Transactions, credit history | DPDP, PCI-DSS |
| **Employment** | Salary, performance | Labor laws |
| **Mobility** | Location, travel patterns | DPDP |
| **Retail** | Purchase history | DPDP |

### Consequences Without Consent

| Violation | Penalty |
|-----------|---------|
| GDPR | Up to 4% global revenue |
| DPDP Act (India) | Up to ₹250 crore |
| HIPAA | Up to $1.5 million/violation |
| Customer Trust | Permanent loss |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONSENT PLATFORM                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       CONSENT MANAGEMENT                              │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │   Consent    │  │   Policy     │  │   Preference │        │   │
│  │  │   Registry   │  │   Engine     │  │   Center     │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       CONSENT VERIFICATION                            │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │   Consent    │  │    Data      │  │   Usage      │        │   │
│  │  │   Gateway    │  │   Scoper     │  │   Enforcer   │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       AUDIT & COMPLIANCE                             │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │   Audit      │  │   Breach     │  │   Reports    │        │   │
│  │  │   Logger     │  │   Detector   │  │   Generator  │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Consent Purpose

Why data is being collected/used.

```typescript
interface ConsentPurpose {
  id: string;
  code: string;                   // 'marketing', 'profiling'
  name: string;                   // 'Marketing Communications'
  description: string;
  
  // Requirements
  requires_explicit_consent: boolean;  // Can't be implied
  can_use_implied: boolean;           // Can use implied consent
  
  // Data types affected
  data_categories: DataCategory[];
  
  // Third parties
  allows_third_party_sharing: boolean;
  third_party_purposes?: string[];
  
  // Retention
  retention_days?: number;           // How long to keep
  
  // UI
  ui_label: string;
  ui_description: string;
}
```

### 2. Predefined Purposes

```typescript
const CONSENT_PURPOSES: ConsentPurpose[] = [
  {
    id: 'marketing',
    code: 'marketing',
    name: 'Marketing Communications',
    description: 'Send promotional messages and offers',
    requires_explicit_consent: true,
    can_use_implied: false,
    data_categories: ['contact_info', 'preferences'],
    allows_third_party_sharing: false
  },
  {
    id: 'personalization',
    code: 'personalization',
    name: 'Personalized Experience',
    description: 'Tailor recommendations and content',
    requires_explicit_consent: false,
    can_use_implied: true,
    data_categories: ['behavior', 'preferences'],
    allows_third_party_sharing: false
  },
  {
    id: 'profiling',
    code: 'profiling',
    name: 'Profiling & Analytics',
    description: 'Create profiles for predictions',
    requires_explicit_consent: true,
    can_use_implied: false,
    data_categories: ['behavior', 'transactions'],
    allows_third_party_sharing: false
  },
  {
    id: 'third_party_sharing',
    code: 'third_party_sharing',
    name: 'Share with Partners',
    description: 'Share data with third-party partners',
    requires_explicit_consent: true,
    can_use_implied: false,
    data_categories: ['contact_info'],
    allows_third_party_sharing: true,
    third_party_purposes: ['marketing', 'analytics']
  },
  {
    id: 'health_analysis',
    code: 'health_analysis',
    name: 'Health Analysis',
    description: 'Analyze health data for recommendations',
    requires_explicit_consent: true,
    can_use_implied: false,
    data_categories: ['health_data'],
    allows_third_party_sharing: false
  },
  {
    id: 'location_tracking',
    code: 'location_tracking',
    name: 'Location Tracking',
    description: 'Track location for delivery/services',
    requires_explicit_consent: true,
    can_use_implied: false,
    data_categories: ['location'],
    allows_third_party_sharing: false
  }
];
```

---

### 3. Data Categories

```typescript
type DataCategory = 
  | 'contact_info'      // Name, phone, email
  | 'location'         // GPS, address
  | 'behavior'          // Browsing, clicks
  | 'transactions'      // Purchases, payments
  | 'health_data'       // Medical, fitness
  | 'financial_data'    // Income, credit
  | 'employment_data'   // Job, salary
  | 'biometric_data'    // Fingerprint, face
  | 'device_data'       // Device ID, IP
  | 'social_data';      // Friends, activity

interface DataCategoryConfig {
  category: DataCategory;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  
  // Regulations
  regulations: string[];         // ['GDPR', 'DPDP', 'HIPAA']
  
  // Requirements
  requires_consent: boolean;
  consent_type: 'explicit' | 'implicit';
  can_be_aggregated: boolean;    // Can use anonymized
  
  // Retention
  default_retention_days: number;
  max_retention_days: number;
  
  // Third party
  can_share_with_third_party: boolean;
}
```

---

### 4. Consent Record

```typescript
interface ConsentRecord {
  // Identity
  id: string;
  customer_id: string;
  tenant_id: string;
  
  // Consent Details
  purpose_id: string;
  purpose_code: string;
  
  // Status
  granted: boolean;              // true = opt-in, false = opt-out
  consent_type: ConsentType;
  
  // Source
  source: ConsentSource;
  proof?: ConsentProof;
  
  // Validity
  granted_at: Date;
  expires_at?: Date;
  revoked_at?: Date;
  
  // Scope
  scope?: ConsentScope;
  
  // Metadata
  ip_address?: string;
  user_agent?: string;
  collected_by?: string;          // User ID who collected
}

type ConsentType = 
  | 'explicit'     // Checkbox, OTP, signature
  | 'implicit'    // Continued use, opt-out model
  | 'automatic';  // System-generated

type ConsentSource =
  | 'checkbox'           // Online form
  | 'sms_reply'         // SMS confirmation
  | 'email_click'       // Email link
  | ' verbal'           // Phone/in-person
  | 'continued_use'     // Using service implies consent
  | 'form_signature'    // Physical/digital form
  | 'legal_basis';      // Legal obligation (no consent needed)

interface ConsentProof {
  type: 'checkbox' | 'sms' | 'email' | 'signature' | 'recording';
  value: string;                  // The actual proof
  metadata?: Record<string, any>;  // Additional context
}

interface ConsentScope {
  // What specifically is consented
  data_categories: DataCategory[];
  
  // Processing activities
  activities: string[];           // 'analysis', 'storage', 'sharing'
  
  // Third parties (if applicable)
  third_party_ids?: string[];
  
  // Geographic scope
  regions?: string[];             // ['IN', 'US', 'EU']
}
```

---

## Consent Management

### 1. Consent Registry

Central store of all consent records.

```typescript
interface ConsentRegistry {
  
  // Check if customer has consent
  async hasConsent(
    customerId: string,
    purposeId: string
  ): Promise<boolean> {
    const record = await this.getConsentRecord(customerId, purposeId);
    return record?.granted === true && !this.isExpired(record);
  }
  
  // Get full consent status
  async getConsentStatus(customerId: string): Promise<ConsentStatus> {
    const records = await this.getAllRecords(customerId);
    return {
      customer_id: customerId,
      consents: records,
      summary: this.generateSummary(records)
    };
  }
  
  // Grant consent
  async grantConsent(
    customerId: string,
    purposeId: string,
    proof: ConsentProof
  ): Promise<ConsentRecord> {
    // 1. Validate purpose exists
    // 2. Create consent record
    // 3. Emit consent.granted event
    // 4. Return record
  }
  
  // Revoke consent
  async revokeConsent(
    customerId: string,
    purposeId: string,
    reason?: string
  ): Promise<void> {
    // 1. Find record
    // 2. Update to revoked
    // 3. Emit consent.revoked event
    // 4. Trigger data cleanup if needed
  }
}
```

---

### 2. Policy Engine

Evaluates consent requirements.

```typescript
interface PolicyEngine {
  
  // Check if action is allowed
  async canPerform(
    customerId: string,
    action: DataAction
  ): Promise<PolicyDecision> {
    
    // 1. Identify required consent
    const required = this.getRequiredConsent(action);
    
    // 2. Check customer consent
    const hasConsent = await this.consentRegistry.hasConsent(
      customerId, 
      required.purposeId
    );
    
    // 3. Check legal basis
    const legalBasis = await this.getLegalBasis(action);
    
    // 4. Generate decision
    return {
      allowed: hasConsent || !!legalBasis,
      reason: hasConsent 
        ? 'consent_granted' 
        : legalBasis 
          ? `legal_basis:${legalBasis}`
          : 'consent_required',
      required_consent: required,
      legal_basis: legalBasis
    };
  }
  
  // Get required consent for action
  getRequiredConsent(action: DataAction): RequiredConsent {
    // Based on action type and data category
  }
}

interface PolicyDecision {
  allowed: boolean;
  reason: string;
  required_consent?: RequiredConsent;
  legal_basis?: string;
  remediation?: string[];  // What to do if not allowed
}

interface DataAction {
  type: 'collect' | 'process' | 'store' | 'share' | 'delete';
  data_category: DataCategory;
  purpose_id: string;
  third_parties?: string[];
  retention_days?: number;
}
```

---

### 3. Preference Center

Customer-facing consent management.

```typescript
interface PreferenceCenter {
  
  // Get customer's preference center data
  async getPreferences(customerId: string): Promise<CustomerPreferences> {
    const status = await this.consentRegistry.getConsentStatus(customerId);
    const purposes = await this.getAllPurposes();
    
    return {
      customer_id: customerId,
      preferences: purposes.map(p => ({
        ...p,
        granted: status.consents.find(c => c.purpose_id === p.id)?.granted
      }))
    };
  }
  
  // Update preferences
  async updatePreferences(
    customerId: string,
    updates: PreferenceUpdate[]
  ): Promise<void> {
    for (const update of updates) {
      if (update.granted) {
        await this.consentRegistry.grantConsent(customerId, update.purpose_id, {
          type: 'checkbox',
          value: 'customer_preference_center'
        });
      } else {
        await this.consentRegistry.revokeConsent(customerId, update.purpose_id);
      }
    }
  }
  
  // Export all data
  async exportData(customerId: string): Promise<ExportData> {
    // Return all data held for customer
  }
  
  // Delete all data (right to erasure)
  async deleteAllData(customerId: string): Promise<DeletionReceipt> {
    // 1. Verify identity
    // 2. Delete from all systems
    // 3. Emit deletion events
    // 4. Generate receipt
  }
}
```

---

## Consent Verification

### 1. Consent Gateway

Middleware for checking consent.

```typescript
// Express middleware
const consentMiddleware = (purposeId: string) => {
  return async (req, res, next) => {
    const customerId = req.headers['x-customer-id'];
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CUSTOMER_ID' }
      });
    }
    
    const decision = await policyEngine.canPerform(customerId, {
      type: 'process',
      data_category: 'contact_info', // or whatever applies
      purpose_id: purposeId
    });
    
    if (!decision.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: `Consent required for: ${purposeId}`,
          remediation: decision.remediation
        }
      });
    }
    
    req.consentDecision = decision;
    next();
  };
};

// Usage
app.post('/api/send-marketing',
  consentMiddleware('marketing'),
  (req, res) => {
    // Proceed with marketing
  }
);
```

---

### 2. Data Scoper

Scopes data based on consent.

```typescript
class DataScoper {
  
  // Scope data response based on consent
  async scopeData<T>(
    customerId: string,
    data: T,
    scope: DataScope
  ): Promise<T> {
    const status = await this.consentRegistry.getConsentStatus(customerId);
    
    // Remove fields customer hasn't consented to
    return this.removeDisallowedFields(data, status);
  }
  
  // Scope query based on consent
  scopeQuery<T>(query: T, status: ConsentStatus): T {
    // Add consent-based filters to database queries
    const consentFilters = this.buildConsentFilters(status);
    return { ...query, filters: consentFilters };
  }
}
```

---

### 3. Usage Enforcer

Monitors and blocks unauthorized use.

```typescript
class UsageEnforcer {
  
  // Before processing
  async enforce(
    customerId: string,
    action: DataAction
  ): Promise<void> {
    const decision = await this.policyEngine.canPerform(customerId, action);
    
    if (!decision.allowed) {
      // Log violation attempt
      await this.auditLogger.log({
        type: 'consent_violation',
        customer_id: customerId,
        action,
        decision,
        blocked: true
      });
      
      throw new ConsentViolationError(decision);
    }
  }
  
  // Periodic audit
  async auditUsage(): Promise<AuditReport> {
    // Check all data processing in last period
    // Flag violations
    // Generate report
  }
}
```

---

## Audit & Compliance

### 1. Audit Logger

```typescript
interface ConsentAuditLog {
  id: string;
  timestamp: Date;
  
  // Who
  customer_id: string;
  tenant_id: string;
  
  // What
  action: AuditAction;
  
  // Details
  purpose_id?: string;
  data_categories?: DataCategory[];
  proof?: ConsentProof;
  
  // Outcome
  granted?: boolean;
  revoked?: boolean;
  violation?: boolean;
  
  // Context
  ip_address?: string;
  user_agent?: string;
  performed_by?: string;  // User/system
}

type AuditAction =
  | 'consent.granted'
  | 'consent.revoked'
  | 'consent.expired'
  | 'consent.checked'
  | 'consent.violation'
  | 'data.accessed'
  | 'data.deleted'
  | 'data.exported'
  | 'policy.evaluated';
```

---

### 2. Compliance Reports

```typescript
interface ComplianceReport {
  // Consent metrics
  consent_metrics: {
    total_customers: number;
    marketing_consent_rate: number;
    profiling_consent_rate: number;
    overall_consent_rate: number;
  };
  
  // Violations
  violations: {
    total: number;
    by_type: Record<string, number>;
    customers_affected: number;
  };
  
  // Data requests
  data_requests: {
    exports: number;
    deletions: number;
    access_requests: number;
  };
  
  // Third party sharing
  third_party_sharing: {
    total_shares: number;
    customers_affected: number;
    purposes: string[];
  };
}
```

---

### 3. Consent Receipt

```typescript
interface ConsentReceipt {
  receipt_id: string;
  customer_id: string;
  tenant_id: string;
  
  // Consent details
  consents: {
    purpose: string;
    granted: boolean;
    granted_at: Date;
    source: ConsentSource;
    expires_at?: Date;
  }[];
  
  // Customer data summary
  data_held: {
    category: DataCategory;
    last_updated: Date;
  }[];
  
  // Third parties
  third_parties: {
    name: string;
    purpose: string;
    data_shared: DataCategory[];
  }[];
  
  // Legal
  legal_entity: string;
  jurisdiction: string;
  generated_at: Date;
  
  // Proof
  digital_signature?: string;
}
```

---

## API Endpoints

### Consent Management

```
# Customer Consent
GET    /api/consents                    - Get all customer consents
POST   /api/consents                    - Grant consent
DELETE /api/consents/:purposeId        - Revoke consent

# Preference Center
GET    /api/preferences                 - Get preference center
PUT    /api/preferences                 - Update preferences

# Data Rights
POST   /api/data/export               - Export customer data
POST   /api/data/delete               - Delete all data
GET    /api/data/receipt/:receiptId   - Get consent receipt
```

### Verification

```
# Check consent (internal)
POST   /api/verify/can-perform        - Check if action allowed
POST   /api/verify/batch              - Batch verification

# Policy
GET    /api/policies                  - Get all policies
GET    /api/policies/:purposeId       - Get policy details
```

### Admin

```
# Consent Collection
POST   /api/admin/consents/collect    - Collect consent (staff)
GET    /api/admin/consents/history    - Collection history

# Audit
GET    /api/audit/logs               - Audit logs
GET    /api/audit/compliance         - Compliance report
POST   /api/audit/export             - Export audit data
```

---

## Integration with Other Platforms

### Hojai Core

```
Consent Platform
    │
    ├──► Event Bus ──────────────────► All services
    │       (consent.granted, consent.revoked)
    │
    ├──► Memory Platform ────────────► Customer memory
    │       (consent status in customer profile)
    │
    ├──► Governance ────────────────► Policy engine
    │       (global consent policies)
    │
    └──► Analytics ─────────────────► Audit reports
            (consent metrics)
```

### Industry Intelligence

```
Industry Brain
    │
    ├──► Consent Check ─────────────► Consent Platform
    │       (Can we use this data for learning?)
    │
    ├──► Anonymous Only ────────────► Consent Platform
    │       (Only pattern aggregations)
    │
    └──► Audit ────────────────────► Consent Platform
            (Log all data access)
```

---

## Privacy Rules

### Data Processing Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONSENT HIERARCHY                                     │
└─────────────────────────────────────────────────────────────────────────┘

Level 1: CRITICAL DATA (Health, Biometric, Financial)
│
├─ Requires EXPLICIT consent
├─ Cannot use implied consent
├─ Cannot be shared with third parties
├─ Requires encryption at rest
└─ Audit required for all access

Level 2: SENSITIVE DATA (Location, Employment, Social)
│
├─ Requires explicit consent
├─ Can use implied for basic services
├─ Limited third-party sharing
└─ Retention limits apply

Level 3: STANDARD DATA (Contact, Behavior, Transactions)
│
├─ Can use implied consent
├─ Third-party sharing with notice
└─ Standard retention
```

---

## Industry-Specific Rules

### Healthcare

```typescript
const healthcareRules: IndustryRule[] = [
  {
    data_category: 'health_data',
    requirements: {
      consent: 'explicit',
      encryption: 'required',
      retention: 'minimum_necessary',
      audit: 'all_access'
    },
    restrictions: [
      'no_third_party_marketing',
      'no_employer_access',
      'no_insurance_sharing_without_consent'
    ]
  }
];
```

### Finance

```typescript
const financeRules: IndustryRule[] = [
  {
    data_category: 'financial_data',
    requirements: {
      consent: 'explicit',
      encryption: 'required',
      retention: 'regulatory_requirement',
      audit: 'all_access'
    },
    restrictions: [
      'no_unauthorized_third_party',
      'credit_score_not_shared_without_consent'
    ]
  }
];
```

---

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 29, 2026 | Hojai AI | Initial spec |

---

*This is the Hojai Consent Platform Specification.*
