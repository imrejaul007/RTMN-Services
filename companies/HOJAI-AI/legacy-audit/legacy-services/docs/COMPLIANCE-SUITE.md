# HOJAI Compliance Suite

**ZeroDrift AI Compliance Firewall** - Enterprise-grade financial compliance for AI agents.

---

## Overview

The HOJAI Compliance Suite provides comprehensive pre-send validation and ongoing monitoring for AI-powered communications. It ensures regulatory compliance across SEC, FINRA, RBI, and internal company policies.

### Key Features

- **Pre-send Validation**: Block compliance violations before they happen
- **Real-time Monitoring**: Continuous surveillance of AI-generated content
- **Agent Governance**: Permission-based control over AI actions
- **Audit Trail**: Complete logging for regulatory audits
- **Multi-framework Support**: SEC, FINRA, RBI, Company Policies

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HOJAI Compliance Suite                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│  │   Email      │     │   LinkedIn   │     │  Document    │       │
│  │   Client    │     │   Post       │     │  Upload      │       │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘       │
│         │                    │                    │                 │
│         └────────────────────┼────────────────────┘                 │
│                              ▼                                      │
│                   ┌────────────────────┐                           │
│                   │  Enforcement       │                           │
│                   │  Gateway (4182)   │                           │
│                   └────────┬─────────┘                           │
│                            │                                       │
│    ┌───────────────────────┼───────────────────────┐               │
│    │                       │                       │               │
│    ▼                       ▼                       ▼               │
│ ┌──────────┐      ┌──────────────┐      ┌────────────────┐        │
│ │Comm      │      │ LLM          │      │ Agent          │        │
│ │Compliant │      │ Compliance   │      │ Governance     │        │
│ │(4180)    │      │ (4183)       │      │ (4184)         │        │
│ └─────┬────┘      └──────┬───────┘      └───────┬────────┘        │
│       │                   │                      │                 │
│       └───────────────────┼──────────────────────┘                 │
│                           ▼                                        │
│                   ┌──────────────┐                                 │
│                   │ Policy       │                                 │
│                   │ Engine (4181)│                                 │
│                   └──────────────┘                                 │
│                                                                     │
│                           ▼                                         │
│                   ┌──────────────┐                                 │
│                   │ Audit Trail │                                 │
│                   │ (4185)       │                                 │
│                   └──────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Services

### 1. Communication Compliance Service (Port 4180)

**Purpose**: Pre-send validation of all outbound communications

**Features**:
- Email validation with attachment scanning
- LinkedIn post compliance checking
- Document compliance review
- Real-time rule-based matching
- Multi-regulation support (SEC, FINRA, RBI)

**Endpoints**:
```
POST /api/validate/email      - Validate email before sending
POST /api/validate/linkedin   - Validate LinkedIn post
POST /api/validate/document   - Validate document content
GET  /api/rules              - List all compliance rules
POST /api/rules              - Add custom rule
GET  /api/stats              - Get validation statistics
```

### 2. Policy Engine Service (Port 4181)

**Purpose**: Convert policy documents into machine-readable rules

**Features**:
- NLP-based policy parsing
- Automatic rule extraction
- Machine-readable rule generation
- Policy version management
- Compliance checking against policies

**Endpoints**:
```
POST /api/policies/parse          - Parse policy document
GET  /api/policies               - List all policies
GET  /api/policies/:id           - Get policy details
GET  /api/policies/:id/rules     - Get extracted rules
POST /api/compliance/check       - Check content against policies
```

### 3. Enforcement Gateway (Port 4182)

**Purpose**: Real-time enforcement of compliance decisions

**Features**:
- Blocking mode (immediate rejection)
- Advisory mode (warnings only)
- Audit mode (log only)
- Quarantine queue for manual review
- Circuit breaker for fault tolerance

**Endpoints**:
```
POST /api/enforce/pre-send    - Pre-send validation
POST /api/enforce/review      - Submit for manual review
GET  /api/enforce/quarantine  - Get quarantine queue
POST /api/enforce/approve     - Approve quarantined item
POST /api/enforce/reject      - Reject quarantined item
GET  /api/enforce/mode        - Get current enforcement mode
POST /api/enforce/mode        - Set enforcement mode
```

### 4. LLM Compliance Service (Port 4183)

**Purpose**: Validate AI-generated content before output

**Features**:
- PII detection and masking
- Tone analysis
- Regulatory compliance checking
- Content sanitization
- Rewrite suggestions

**Endpoints**:
```
POST /api/llm/validate      - Full content validation
POST /api/llm/pii           - PII detection
POST /api/llm/tone          - Tone analysis
POST /api/llm/sanitize      - Content sanitization
POST /api/llm/rewrite       - Suggest compliant rewrite
GET  /api/llm/stats         - Validation statistics
```

### 5. Agent Governance Service (Port 4184)

**Purpose**: Control AI agent permissions and actions

**Features**:
- Permission-based access control
- Rate limiting per agent
- Time-window restrictions
- Data access boundaries
- Human-in-the-loop approval workflow

**Endpoints**:
```
POST /api/permissions/check        - Check action permission
POST /api/permissions             - Grant permission
POST /api/permissions/revoke      - Revoke permission
GET  /api/agents                  - List registered agents
POST /api/agents                  - Register new agent
POST /api/agents/:id/boundaries  - Set agent boundaries
GET  /api/approvals              - Get approval queue
POST /api/approvals/request      - Request approval
POST /api/approvals/approve      - Approve request
POST /api/approvals/reject       - Reject request
```

### 6. Audit Trail Service (Port 4185)

**Purpose**: Complete compliance logging and reporting

**Features**:
- Real-time event logging
- Query and filtering
- Compliance reports generation
- Violation trend analysis
- Export to CSV/JSON/PDF

**Endpoints**:
```
POST /api/audit/log           - Log compliance event
POST /api/audit/query         - Query audit logs
GET  /api/audit/:id           - Get specific log entry
GET  /api/audit/user/:id      - Get user activity
POST /api/audit/summary       - Get compliance summary
POST /api/audit/report        - Generate report
POST /api/audit/export        - Export logs
GET  /api/audit/dashboard     - Dashboard statistics
```

---

## Regulatory Coverage

### Privacy Frameworks

| Framework | Region | Features |
|-----------|--------|---------|
| **GDPR** | EU | Right to access, rectification, erasure, portability |
| **HIPAA** | US | PHI protection, access control, breach notification |
| **SOC2** | Global | Security, Availability, Processing Integrity, Confidentiality |
| **CCPA** | California | Right to Know, Delete, Opt-Out, Non-Discrimination |
| **PIPL** | China | Cross-border transfer, consent, automated decisions |

### Financial Regulations

### SEC (Securities and Exchange Commission)

| Rule | Description | Patterns Detected |
|------|-------------|-------------------|
| Rule 10b-5 | Insider trading | MNPI, trading recommendations |
| Rule 17a-4 | Books & records | Record destruction, falsification |
| Reg FD | Fair disclosure | Selective disclosure |
| Rule 207 | Research analyst | Independence violations |

### FINRA (Financial Industry Regulatory Authority)

| Rule | Description | Patterns Detected |
|------|-------------|-------------------|
| Rule 3110 | Supervision | Bypass, unapproved activity |
| Rule 3120 | Supervisory system | Testing bypass |
| Rule 2210 | Communications | Unapproved ads, misleading claims |
| Rule 4511 | Books & records | Incomplete records |
| Rule 2090 | Know your customer | KYC bypass, suitability |

### RBI (Reserve Bank of India)

| Regulation | Description | Patterns Detected |
|------------|-------------|-------------------|
| KYC | Customer identification | Unverified customers |
| AML/CFT | Anti-money laundering | Suspicious transactions, structuring |
| Digital Lending | Lending guidelines | Unauthorized lending, excessive rates |
| NBFC | NBFC compliance | Prudential norm violations |

### Company Policies

| Category | Description |
|----------|-------------|
| Data Privacy | PII handling, GDPR, HIPAA |
| Communications | Internal/external comms |
| Conflicts | Conflict of interest |
| Information Security | Credential sharing, phishing |

---

## Quick Start

### Using Docker Compose

```bash
# Start all compliance services
docker-compose -f docker-compose.compliance.yml up -d

# Check service health
curl http://localhost:4180/health  # Communication
curl http://localhost:4181/health  # Policy
curl http://localhost:4182/health  # Enforcement
curl http://localhost:4183/health  # LLM
curl http://localhost:4184/health  # Agent
curl http://localhost:4185/health  # Audit
```

### Using Framework Modules

```typescript
import {
  // Privacy Frameworks
  GDPRRequest,
  processGDPRRequest,
  HIPAA,
  SOC2Compliance,
  CCPATypeCompliance,
  PIPLCompliance,

  // Consent Management
  ConsentManager,
  ConsentType
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

// SOC2: Check control status
const soc2 = new SOC2Compliance();
soc2.registerControl('CC6.1', TrustServiceCriteria.SECURITY, 'Access controls');
const status = soc2.getControlStatus('CC6.1');

// CCPA: Process opt-out
const ccpa = new CCPATypeCompliance();
ccpa.processOptOut(requestId);

// PIPL: Handle data subject request
const pipl = new PIPLCompliance();
await pipl.handleDataSubjectRequest(userId, PIPLRight.DELETION);
```

### Using the SDK

```typescript
import { ComplianceClient } from 'compliance-sdk';

// Initialize client
const client = new ComplianceClient({
  communicationCompliance: 'http://localhost:4180',
  enforcementGateway: 'http://localhost:4182',
  auditTrail: 'http://localhost:4185',
});

// Validate email
const result = await client.communication.validateEmail({
  to: 'client@example.com',
  subject: 'Q3 Financial Summary',
  body: 'Your portfolio has returned 12% this quarter.',
});

if (!result.canSend) {
  console.log('Blocked:', result.violations);
  return;
}

// Log to audit trail
await client.audit.log({
  eventType: 'MESSAGE_SENT',
  userId: 'user123',
  action: 'email_sent',
  outcome: result.passed ? 'SUCCESS' : 'BLOCKED',
  violations: result.violations,
});
```

### Using React Hooks

```tsx
import { useComplianceCheck, useAuditLog } from 'compliance-sdk/react';

function EmailForm() {
  const { validate, result, loading } = useComplianceCheck('email');

  const handleSend = async (email) => {
    const check = await validate(email);
    if (check.canSend) {
      sendEmail(email);
      logEvent({ action: 'email_sent', outcome: 'SUCCESS' });
    } else {
      showViolations(check.violations);
    }
  };

  return (
    <form onSubmit={handleSend}>
      {/* email fields */}
    </form>
  );
}
```

---

## Configuration

### Environment Variables

```bash
# Service URLs
COMMUNICATION_COMPLIANCE_URL=http://localhost:4180
POLICY_ENGINE_URL=http://localhost:4181
ENFORCEMENT_GATEWAY_URL=http://localhost:4182
LLM_COMPLIANCE_URL=http://localhost:4183
AGENT_GOVERNANCE_URL=http://localhost:4184
AUDIT_TRAIL_URL=http://localhost:4185

# Authentication
COMPLIANCE_API_KEY=your-api-key

# Timeouts (ms)
COMPLIANCE_TIMEOUT=30000
```

### Enforcement Modes

| Mode | Behavior |
|------|----------|
| `blocking` | Immediately reject non-compliant content |
| `advisory` | Allow but warn, log all checks |
| `audit` | Allow all, log for review |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | June 2026 | Initial release |

---

**License**: MIT
**Author**: HOJAI AI
