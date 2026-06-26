# Data Sovereignty Charter

**Version:** 1.0  
**Last Updated:** June 26, 2026  
**Policy Owner:** Nexha Governance Council  
**Jurisdiction:** Global (Multi-jurisdictional)

---

## 1. Preamble & Purpose

This Data Sovereignty Charter establishes the foundational principles governing data ownership, residency, portability, and rights within the Global Nexha Federation. As an autonomous business network operating across 190+ countries, Nexha must navigate diverse regulatory frameworks including GDPR (EU), PDPA (Singapore), DPDP Act (India), CCPA (California), and countless other national data protection laws.

**Core Principle:** Every Nexha participant owns their data. The federation provides infrastructure for data exchange, but never claims ownership of participant data.

---

## 2. Data Classification Framework

### 2.1 Data Categories

| Category | Description | Examples | Sovereignty Level |
|----------|-------------|----------|------------------|
| **Personal Data** | Identifies or relates to individuals | Customer names, emails, payment info | Highest - Individual ownership |
| **Business Data** | Operational data of Nexha participants | Orders, invoices, inventory | Participant ownership |
| **Federation Data** | Network-wide operational data | Capability registry, reputation scores | Shared governance |
| **Derived Data** | AI-generated insights from raw data | Recommendations, predictions | Joint (see Section 4) |
| **Public Data** | Intentionally public information | Business listings, public catalogs | No restriction |

### 2.2 Sensitivity Tiers

```javascript
const DATA_SENSITIVITY = {
  TIER_1_PUBLIC: {
    label: "Public",
    encryption: false,
    retention: "Unlimited",
    crossBorder: true,
    consent: "Not required"
  },
  TIER_2_INTERNAL: {
    label: "Internal",
    encryption: "At-rest",
    retention: "7 years",
    crossBorder: "Allowed with notice",
    consent: "Implicit (participant agreement)"
  },
  TIER_3_CONFIDENTIAL: {
    label: "Confidential",
    encryption: "At-rest + In-transit",
    retention: "5 years",
    crossBorder: "Allowed with DPA",
    consent: "Explicit"
  },
  TIER_4_RESTRICTED: {
    label: "Restricted",
    encryption: "End-to-end, Participant-managed keys",
    retention: "1 year",
    crossBorder: "Prohibited without explicit consent",
    consent: "Explicit + Audit trail"
  },
  TIER_5_REGULATED: {
    label: "Regulated (PII/Financial/Health)",
    encryption: "Maximum + HSM",
    retention: "As required by law",
    crossBorder: "Data localization required",
    consent: "Explicit + Regulatory filing"
  }
};
```

---

## 3. Data Ownership Rights

### 3.1 Participant Data Rights (Individual Ownership)

Every Nexha participant (individual or organization) retains absolute ownership of their data with the following rights:

| Right | Description | Implementation |
|-------|-------------|----------------|
| **Right to Access** | Retrieve all data held about them | `/data/participants/{id}/export` |
| **Right to Portability** | Export data in standard formats | JSON, CSV, XML with schema |
| **Right to Erasure** | Delete data with verifiable confirmation | 30-day grace period for compliance |
| **Right to Correction** | Amend inaccurate data | Audit trail preserved |
| **Right to Restriction** | Limit processing without deletion | Processing pause flag |
| **Right to Object** | Opt-out of specific processing types | Granular consent management |
| **Right to Explainability** | Receive explanation for AI decisions | `/ai-decisions/{id}/explain` |

### 3.2 Business Data Ownership Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA OWNERSHIP MATRIX                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Data Type              │ Owner          │ Can Share With       │
│  ───────────────────────┼────────────────┼─────────────────────  │
│  Customer PII           │ Customer       │ Legal requirement    │
│  Customer Behavior     │ Business       │ Aggregated only      │
│  Transaction Records    │ Both parties   │ Either party         │
│  AI-Generated Insights │ Joint          │ Explicit consent     │
│  Reputation Scores     │ Federation     │ Public ledger        │
│  Contract Terms        │ Both parties   │ Arbitration panels    │
│  Communication Logs    │ Sender         │ Recipients + Legal    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Derived Data & AI Model Governance

### 4.1 The Derived Data Problem

When AI systems analyze raw data to generate insights (predictions, recommendations, scores), a joint ownership situation emerges. This section establishes clear rules.

### 4.2 Derived Data Ownership Rules

```javascript
const DERIVED_DATA_RULES = {
  // Rule 1: Raw data remains owned by the participant
  rawDataOwnership: {
    principle: "Input data ownership is preserved",
    implication: "Deleting raw data may invalidate derived data"
  },
  
  // Rule 2: AI model contributions are recognized
  modelContribution: {
    principle: "Federation AI models contribute to derived insights",
    implication: "Federation retains non-exclusive license to derived aggregates"
  },
  
  // Rule 3: Individual derived data belongs to the subject
  individualDerivedData: {
    principle: "Insights about an entity belong to that entity",
    implication: "Participants can request/deletion of derived personal insights"
  },
  
  // Rule 4: Aggregate insights are federation property
  aggregateInsights: {
    principle: "Statistical aggregates belong to federation",
    implication: "Individual participants cannot claim ownership of population statistics"
  }
};
```

### 4.3 AI Model Training Consent

```javascript
// Consent tiers for using participant data in AI training
const TRAINING_CONSENT_TIERS = {
  OPT_OUT: {
    label: "Opt-Out",
    default: false,
    description: "Data excluded from all training unless explicitly granted"
  },
  ANONYMIZED_ONLY: {
    label: "Anonymized Only",
    default: true,
    description: "Data used only after complete anonymization"
  },
  FEDERATION_INTERNAL: {
    label: "Federation Internal",
    default: false,
    description: "Data used for federation AI improvements only"
  },
  FULL_PARTICIPATION: {
    label: "Full Participation",
    default: false,
    description: "Data used for all AI training including external partnerships"
  }
};
```

---

## 5. Data Residency Requirements

### 5.1 Mandatory Data Localization

Certain data categories must remain within specific jurisdictions:

```javascript
const DATA_LOCALIZATION_REQUIREMENTS = {
  // European Economic Area
  EEA: {
    appliesTo: ["Personal Data", "EU Critical Infrastructure Data"],
    requirement: "Data must reside within EEA borders",
    enforcement: "GDPR Article 44-49 compliance",
    exceptions: ["Adequacy decision countries", "Standard contractual clauses"]
  },
  
  // India
  IN: {
    appliesTo: ["Sensitive Personal Data", "Financial Data", "Health Data"],
    requirement: "Data must be stored within India",
    enforcement: "DPDP Act Chapter VI compliance",
    exceptions: ["Explicit consent for transfer", "Government exemption"]
  },
  
  // China
  CN: {
    appliesTo: ["All Personal Data", "Business Data"],
    requirement: "Data must be stored within China (with exceptions)",
    enforcement: "PIPL, DSL compliance",
    exceptions: ["Cross-border transfer certification"]
  },
  
  // Russia
  RU: {
    appliesTo: ["Russian Citizens Personal Data"],
    requirement: "Data must be stored within Russia",
    enforcement: "Federal Law 152-FZ compliance"
  },
  
  // United Arab Emirates
  AE: {
    appliesTo: ["Personal Data", "Financial Records"],
    requirement: "Data localization for DIFC/ADGM special zones",
    enforcement: "DIFC Data Protection Law, ADGM Data Protection Regulations"
  }
};
```

### 5.2 Data Residency Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| **nexha-data-residency-os** | 4385 | Data residency rules engine |
| **nexha-gdpr-proxy** | 4386 | EU data subject request handler |
| **nexha-data-portal** | 4387 | Participant data management portal |

### 5.3 Cross-Border Transfer Mechanisms

```javascript
const CROSS_BORDER_TRANSFER = {
  // Legal mechanisms for transferring data across borders
  mechanisms: {
    ADEQUACY_DECISION: {
      description: "EU Commission认定 country",
      examples: ["UK", "Japan", "South Korea", "Canada"]
    },
    STANDARD_CONTRACTUAL_CLAUSES: {
      description: "Pre-approved contract terms",
      binding: "Legally binding on both parties"
    },
    BINDING_CORPORATE_RULES: {
      description: "Intra-group data transfer agreements",
     适用: "Multinational organizations"
    },
    CONSENT_BASED: {
      description: "Explicit participant consent with informed choice",
      requirements: ["Purpose disclosure", "Recipient identification", "Right to withdraw"]
    },
    NECESSITY_CONTRACT: {
      description: "Required for contract performance",
      limitations: "Only data strictly necessary for contract"
    }
  }
};
```

---

## 6. Data Portability Standards

### 6.1 Portability Formats

```javascript
const PORTABILITY_FORMATS = {
  JSON: {
    mimeType: "application/json",
    schema: "nexha-data-v1.schema.json",
    includes: ["Metadata", "Relationships", "Timestamps"]
  },
  CSV: {
    mimeType: "text/csv",
    schema: "nexha-data-v1.schema.csv",
    includes: ["Tabular data only", "No relationships"]
  },
  XML: {
    mimeType: "application/xml",
    schema: "nexha-data-v1.schema.xsd",
    includes: ["Full hierarchical data"]
  }
};
```

### 6.2 Data Export API

```bash
# Export all participant data
GET /api/data-portal/export
Authorization: Bearer <participant_token>
Query Parameters:
  - format: json|csv|xml
  - include_derived: true|false
  - date_from: ISO8601
  - date_to: ISO8601

Response:
{
  "export_id": "exp_abc123",
  "status": "processing",
  "estimated_completion": "2026-06-26T10:30:00Z",
  "download_url": "https://..."  // Available when ready
}
```

### 6.3 Data Import Compatibility

Nexha supports importing data from competitor platforms:

```javascript
const COMPETITOR_IMPORT_SCHEMAS = {
  // Schema mappings for competitor platform data imports
  shopify: {
    endpoint: "/import/shopify",
    maps: {
      customers: "participants.customers",
      orders: "commerce.orders",
      products: "commerce.products"
    }
  },
  stripe: {
    endpoint: "/import/stripe",
    maps: {
      customers: "commerce.wallet.owners",
      payments: "commerce.transactions"
    }
  },
  salesforce: {
    endpoint: "/import/salesforce",
    maps: {
      contacts: "sales.contacts",
      accounts: "sales.accounts",
      opportunities: "sales.deals"
    }
  }
};
```

---

## 7. Consent Management Framework

### 7.1 Consent Categories

```javascript
const CONSENT_CATEGORIES = {
  DATA_PROCESSING: {
    id: "data_processing",
    description: "Process my data for service provision",
    required: true,  // Cannot opt out of core service
    granularity: "per_purpose"
  },
  AI_TRAINING: {
    id: "ai_training",
    description: "Use my data to improve AI models",
    required: false,
    granularity: "per_model_type"
  },
  MARKETING: {
    id: "marketing",
    description: "Receive promotional communications",
    required: false,
    granularity: "per_channel"  // Email, SMS, Push
  },
  DATA_SHARING: {
    id: "data_sharing",
    description: "Share data with partners for better services",
    required: false,
    granularity: "per_partner_category"
  },
  CROSS_BORDER: {
    id: "cross_border",
    description: "Transfer data outside my region",
    required: "conditional",  // Required if data must cross border
    granularity: "per_destination_region"
  },
  THIRD_PARTY_INTEGRATION: {
    id: "third_party",
    description: "Connect with third-party services",
    required: false,
    granularity: "per_integration"
  }
};
```

### 7.2 Consent Storage & Verification

```javascript
// Consent record structure
const CONSENT_RECORD = {
  id: "consent_uuid",
  participant_id: "participant_uuid",
  consent_type: CONSENT_CATEGORIES.DATA_PROCESSING.id,
  granted: true,
  granted_at: "2026-06-26T10:00:00Z",
  granted_method: "click",  // click, checkbox, signature, verbal
  ip_address: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  expires_at: null,  // null = until revoked
  revoked_at: null,
  version: "1.0",  // Consent form version
  purpose: "Required for Nexha service operation"
};
```

### 7.3 Consent API Endpoints

```bash
# Get all consents for a participant
GET /api/data-portal/consents
Authorization: Bearer <participant_token>

# Grant consent
POST /api/data-portal/consents
{
  "consent_type": "ai_training",
  "granted": true,
  "metadata": {
    "purpose": "Improving product recommendations",
    "data_categories": ["purchase_history", "browsing_behavior"]
  }
}

# Revoke consent
DELETE /api/data-portal/consents/{consent_type}
Authorization: Bearer <participant_token>
```

---

## 8. Data Retention & Deletion

### 8.1 Retention Schedules

```javascript
const DATA_RETENTION = {
  // Default retention periods by category
  retentionPeriods: {
    // Financial records - longest retention (legal requirements)
    financial_transactions: { min: "7 years", max: "10 years" },
    invoices: { min: "7 years", max: "10 years" },
    tax_records: { min: "7 years", max: "10 years" },
    
    // Business data - standard retention
    orders: { min: "5 years", max: "7 years" },
    customer_communications: { min: "3 years", max: "5 years" },
    operational_logs: { min: "1 year", max: "3 years" },
    
    // Personal data - shortest retention
    session_data: { min: "90 days", max: "1 year" },
    browsing_behavior: { min: "1 year", max: "2 years" },
    marketing_preferences: { min: "Until withdrawn", max: "N/A" },
    
    // Derived/AI data
    ai_insights: { min: "Linked to source", max: "3 years after source deletion" },
    aggregated_analytics: { min: "Anonymous", max: "Perpetual" }
  },
  
  // Exceptions by jurisdiction
  jurisdictionOverrides: {
    EU: { financial_transactions: "10 years (tax authority requirement)" },
    IN: { financial_transactions: "8 years (income tax act)" },
    US: { financial_transactions: "7 years (IRS requirement)" }
  }
};
```

### 8.2 Deletion Workflow

```javascript
// Deletion request workflow
const DELETION_WORKFLOW = {
  steps: [
    {
      step: 1,
      action: "Request received",
      system: "nexha-data-portal",
      sla: "Immediate"
    },
    {
      step: 2,
      action: "Identify all linked data",
      system: "nexha-data-residency-os",
      sla: "24 hours"
    },
    {
      step: 3,
      action: "Notify linked parties (if applicable)",
      system: "nexha-data-portal",
      sla: "48 hours"
    },
    {
      step: 4,
      action: "Grace period (30 days)",
      system: "Automated",
      sla: "30 days",
      reason: "Allow reversal of accidental requests"
    },
    {
      step: 5,
      action: "Delete primary data",
      system: "Each data store",
      sla: "7 days"
    },
    {
      step: 6,
      action: "Delete derived data",
      system: "AI/Analytics systems",
      sla: "30 days"
    },
    {
      step: 7,
      action: "Verify deletion",
      system: "nexha-data-residency-os",
      sla: "7 days"
    },
    {
      step: 8,
      action: "Issue deletion certificate",
      system: "nexha-data-portal",
      sla: "Immediate"
    }
  ]
};
```

---

## 9. Security Requirements

### 9.1 Encryption Standards

```javascript
const ENCRYPTION_STANDARDS = {
  atRest: {
    algorithm: "AES-256-GCM",
    keyManagement: "HSM (Hardware Security Module)",
    keyRotation: "90 days",
    minimumKeyLength: 256
  },
  inTransit: {
    algorithm: "TLS 1.3",
    cipherSuites: [
      "TLS_AES_256_GCM_SHA384",
      "TLS_CHACHA20_POLY1305_SHA256"
    ],
    certificateType: "Minimum RSA 2048-bit or ECDSA P-256"
  },
  endToEnd: {
    algorithm: "X25519 (key exchange) + AES-256-GCM (encryption)",
    perfectForwardSecrecy: true,
    keyExchange: "Optional participant-managed keys"
  }
};
```

### 9.2 Access Control Requirements

```javascript
const ACCESS_CONTROL = {
  principle: "Zero Trust",
  requirements: [
    "All access requires authentication",
    "All access requires authorization",
    "All access is logged and auditable",
    "Least privilege principle enforced",
    "Session timeout: 30 minutes inactive",
    "MFA required for: Admin access, Data export, Consent changes"
  ],
  auditLogRetention: "7 years",
  penetrationTesting: "Annual minimum"
};
```

---

## 10. Data Breach Response

### 10.1 Breach Classification

```javascript
const BREACH_CLASSIFICATION = {
  LOW: {
    description: "No personal data exposed, or encrypted data only",
    notificationRequired: "Internal only",
    responseTime: "72 hours"
  },
  MEDIUM: {
    description: "Non-sensitive personal data exposed",
    notificationRequired: "Affected individuals + regulators",
    responseTime: "72 hours"
  },
  HIGH: {
    description: "Sensitive personal data (financial, health, government ID)",
    notificationRequired: "Affected + Regulators + Federation",
    responseTime: "24 hours"
  },
  CRITICAL: {
    description: "Large-scale breach (>1000 individuals or critical infrastructure)",
    notificationRequired: "All + Law enforcement",
    responseTime: "4 hours"
  }
};
```

### 10.2 Breach Response Workflow

```javascript
const BREACH_RESPONSE = {
  detection: {
    sources: ["Automated monitoring", "User report", "Third-party notification"],
    escalationPath: "Security team → CISO → CEO → Board (if critical)"
  },
  containment: {
    immediate: ["Isolate affected systems", "Preserve evidence", "Block attack vector"],
    shortTerm: ["Patching", "Password reset", "Enhanced monitoring"]
  },
  notification: {
    affectedIndividuals: {
      timeline: "72 hours (GDPR), 24 hours (critical)",
      content: ["What happened", "What data", "What we're doing", "What they can do"]
    },
    regulators: {
      timeline: "72 hours (GDPR), 24 hours (critical)",
      content: ["Nature of breach", "Categories/numbers affected", "Likely consequences", "Measures taken"]
    }
  },
  remediation: {
    phases: ["Root cause analysis", "System hardening", "Compensation review", "Process improvement"]
  }
};
```

---

## 11. Governance & Enforcement

### 11.1 Data Protection Officer (DPO) Role

| Responsibility | Description |
|----------------|-------------|
| **Compliance Oversight** | Ensure adherence to all data protection regulations |
| **Policy Development** | Create and maintain data governance policies |
| **Training** | Ensure all participants understand data rights |
| **Incident Response** | Lead breach investigations and notifications |
| **Regulator Liaison** | Interface with data protection authorities |

### 11.2 Audit Requirements

```javascript
const AUDIT_REQUIREMENTS = {
  internal: {
    frequency: "Quarterly",
    scope: ["Access logs", "Consent records", "Retention compliance", "Security controls"],
    reportTo: "Data Protection Committee"
  },
  external: {
    frequency: "Annual",
    standard: "ISO 27001 / SOC 2 Type II",
    scope: ["Technical security", "Process compliance", "Policy adherence"],
    reportTo: "Federation Board + Public summary"
  },
  participantRights: {
    frequency: "On-demand",
    scope: "Specific participant data",
    reportTo: "Requesting participant"
  }
};
```

### 11.3 Penalties for Non-Compliance

```javascript
const NON_COMPLIANCE_PENALTIES = {
  // Within Nexha Federation
  federationPenalties: {
    minor_violation: {
      action: "Warning + remediation plan",
      gracePeriod: "30 days"
    },
    moderate_violation: {
      action: "Suspended from data-sharing network",
      conditions: "Compliance audit before reinstatement"
    },
    severe_violation: {
      action: "Expulsion from federation",
      conditions: "Data export required within 30 days"
    }
  },
  
  // External regulatory penalties (passed through)
  regulatoryPenalties: {
    note: "Federation assists but does not pay participant regulatory fines",
    support: ["Legal guidance", "Compliance tools", "Audit preparation"]
  }
};
```

---

## 12. API Reference

### 12.1 Data Sovereignty Endpoints

```bash
# Check data residency for a participant
GET /api/data-residency/participants/{id}
Response: {
  "participant_id": "uuid",
  "jurisdiction": "EU",
  "data_location": "Frankfurt, Germany",
  "compliance_status": "compliant",
  "last_audit": "2026-06-01"
}

# Verify data deletion
GET /api/data-portal/deletion-requests/{request_id}/status
Response: {
  "request_id": "uuid",
  "status": "completed",
  "deleted_items": 47,
  "deletion_certificate": "https://..."
}

# Consent status
GET /api/data-portal/consents/{participant_id}
Response: {
  "participant_id": "uuid",
  "consents": [
    {
      "type": "data_processing",
      "granted": true,
      "granted_at": "2026-01-01",
      "expires_at": null
    },
    // ...
  ]
}
```

---

## 13. Implementation Timeline

| Phase | Description | Target Date |
|-------|-------------|-------------|
| **Phase 1** | Core data sovereignty infrastructure | Q3 2026 |
| **Phase 2** | GDPR compliance implementation | Q3 2026 |
| **Phase 3** | Multi-jurisdiction rollout | Q4 2026 |
| **Phase 4** | Full audit and certification | Q1 2027 |

---

## 14. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Data Subject** | The individual whose data is being processed |
| **Data Controller** | Entity determining purposes/means of processing |
| **Data Processor** | Entity processing data on behalf of controller |
| **Personal Data** | Any information relating to identified/identifiable person |
| **Sensitive Data** | Special categories (health, financial, biometric, etc.) |
| **Data Portability** | Right to receive data in machine-readable format |

### B. Regulatory References

| Regulation | Jurisdiction | Key Requirements |
|------------|--------------|------------------|
| GDPR | European Union | Data subject rights, lawful basis, DPO |
| PDPA | Singapore | Consent, purpose limitation, data accuracy |
| DPDP Act | India | Consent, purpose limitation, data fiduciary |
| CCPA/CPRA | California | Right to know, delete, opt-out of sale |
| LGPD | Brazil | Consent, data subject rights, DPO |
| POPIA | South Africa | Lawful processing, security safeguards |
| PIPL | China | Consent, data localization, security |

### C. Contact

For questions about this Data Sovereignty Charter:
- **Data Protection Officer:** dpo@nexha.io
- **Compliance Team:** compliance@nexha.io
- **Incident Reports:** security@nexha.io

---

**Document Control**
- Version: 1.0
- Approved by: Nexha Governance Council
- Review Date: December 26, 2026
- Classification: Public
