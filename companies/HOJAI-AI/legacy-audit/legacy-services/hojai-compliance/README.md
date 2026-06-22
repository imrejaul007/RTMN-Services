# HOJAI Compliance Suite

**Enterprise Compliance Framework** - GDPR, HIPAA, SOC2, CCPA, and Financial Regulations.

---

## Overview

The HOJAI Compliance Suite provides comprehensive compliance features:

### Framework Modules (src/)
- **gdpr.ts** - GDPR compliance (Article 15-22: Rights of data subjects)
- **hipaa.ts** - HIPAA compliance (Privacy, Security, Breach Notification)
- **consent.ts** - Consent management across all frameworks

### Microservices (ports 4180-4183)
- **communication-compliance-service** (4180) - Pre-send email/document validation
- **policy-engine-service** (4181) - NLP policy parsing
- **enforcement-gateway** (4182) - Real-time blocking/quarantine
- **llm-compliance-service** (4183) - AI content validation

---

## Quick Start

### Use Framework Modules

```typescript
import { 
  GDPRRequest,
  processGDPRRequest,
  HIPAA PHI Protection,
  ConsentManager
} from '@hojai/compliance';

// GDPR: Handle data subject request
const request: GDPRRequest = {
  id: uuidv4(),
  userId: 'user-123',
  type: 'access',
  status: 'pending',
  requestedAt: new Date(),
};
await processGDPRRequest(request);

// HIPAA: Check PHI access
const canAccess = await checkPHIAccess(userId, resourceId);

// Consent: Check user consent
const hasConsent = await consentManager.hasConsent(userId, 'marketing_email');
```

### Use Microservices

```bash
# Start services
cd communication-compliance-service && npm start  # Port 4180
cd policy-engine-service && npm start             # Port 4181
cd enforcement-gateway && npm start             # Port 4182
cd llm-compliance-service && npm start          # Port 4183
```

---

## Framework Modules

### GDPR Module

| Feature | Description |
|---------|-------------|
| Right to Access | Export all user data |
| Right to Rectification | Update incorrect data |
| Right to Erasure | Delete user data |
| Right to Portability | Export in JSON format |
| Data Breach Notification | 72-hour reporting |

### HIPAA Module

| Feature | Description |
|---------|-------------|
| PHI Protection | Encrypt PHI at rest/transit |
| Access Control | Role-based PHI access |
| Audit Logging | Track all PHI access |
| Breach Detection | Automatic breach detection |
| Business Associate | Third-party compliance |

### Consent Module

| Feature | Description |
|---------|-------------|
| Granular Consent | Per-purpose consent |
| Consent Withdrawal | Easy opt-out |
| Audit Trail | Complete consent history |
| Age Verification | COPPA compliance |
| Preference Management | User dashboard |

---

## Microservices

### Communication Compliance (4180)
Pre-send validation for emails, LinkedIn posts, and documents.

### Policy Engine (4181)
NLP-based policy document parsing and rule extraction.

### Enforcement Gateway (4182)
Real-time blocking, quarantine queue, and advisory modes.

### LLM Compliance (4183)
AI-generated content validation with PII detection.

---

## Version

**1.0.0** - June 2026
