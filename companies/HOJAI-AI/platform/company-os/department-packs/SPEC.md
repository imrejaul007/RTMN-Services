# Department Pack - Specification

> **Version:** 1.0
> **Phase:** 2 (Weeks 7-12)
> **Location:** `platform/company-os/department-packs/`

---

## Overview

A Department Pack is a self-contained organizational unit that can be installed into any company. It includes the business logic, AI workers, policies, workflows, dashboards, and knowledge needed to run that department.

```
department-pack/
|
|-- manifest.yaml           # Pack metadata
|-- agents/                 # AI workers
|   |-- ai-cfo/
|   |   |-- manifest.yaml
|   |   |-- skills/
|   |   |-- policies/
|   |   |-- memory/
|   |   |-- twin/
|-- policies/               # Governance rules
|   |-- approval-matrix.yaml
|   |-- spending-limits.yaml
|-- workflows/              # Business processes
|   |-- invoice-processing.yaml
|   |-- budget-approval.yaml
|-- dashboards/             # Analytics views
|   |-- overview.json
|   |-- cashflow.json
|-- knowledge/              # Domain knowledge
|   |-- accounting-principles.md
|   |-- tax-rules-india.md
|-- connectors/             # External integrations
|   |-- tds.yaml
|   |-- gst.yaml
|   |-- bank-feed.yaml
```

---

## Manifest Schema

```yaml
# department-packs/finance/manifest.yaml

id: finance
name: Finance Department
version: 1.0.0
description: Complete finance and accounting department

provider:
  name: RTMN
  contact: finance@rtmn.dev

capabilities:
  - Accounting
  - Treasury Management
  - Tax Compliance
  - Budgeting
  - Financial Reporting
  - Payment Processing

aiWorkers:
  - id: ai-cfo
    name: AI Chief Financial Officer
    level: senior
    description: Leads finance department, reports to CEO
    skills:
      - financial_analysis
      - cash_flow_management
      - risk_assessment
      - investor_relations
    policies:
      - spending-limits
      - approval-matrix
    memory:
      enabled: true
      retention: 90d
      sources:
        - erp_system
        - bank_statements
        - invoices
    twin:
      type: department:finance
      updateFrequency: realtime

  - id: ai-accountant
    name: AI Accountant
    level: senior
    description: Handles day-to-day accounting
    skills:
      - bookkeeping
      - invoice_processing
      - reconciliation
      - tax_calculation
    policies:
      - invoice-validation
    memory:
      enabled: true
      retention: 180d
    twin:
      type: worker:ai-accountant

  - id: ai-treasury-manager
    name: AI Treasury Manager
    level: senior
    description: Manages cash and liquidity
    skills:
      - cash_flow_forecasting
      - investment_management
      - bank_relationship
    policies:
      - treasury-limits
    memory:
      enabled: true
      retention: 30d
    twin:
      type: worker:ai-treasury-manager

dependencies:
  required:
    - identity  # CorpID for company identification
  optional:
    - crm      # For customer payment tracking
    - procurement # For vendor payments

conflicts:
  - none

configSchema:
  currency:
    type: string
    default: INR
    enum: [INR, USD, EUR, GBP]
  
  timezone:
    type: string
    default: Asia/Kolkata
  
  fiscalYearStart:
    type: string
    default: "04-01"  # April 1st for India
  
  gstEnabled:
    type: boolean
    default: true
  
  tdsEnabled:
    type: boolean
    default: true

endpoints:
  - path: /api/finance
    description: Finance API gateway
  - path: /api/accounting
    description: Accounting endpoints
  - path: /api/treasury
    description: Treasury management

twinConfig:
  type: department:finance
  relationships:
    - type: reports_to
      target: company
    - type: has_worker
      target: ai-cfo
    - type: has_worker
      target: ai-accountant
    - type: has_worker
      target: ai-treasury-manager

healthChecks:
  - type: endpoint
    path: /health
    interval: 60s
  - type: database
    target: finance_db
    interval: 300s

migration:
  fromLegacy: finance-os
  adapterRequired: true
  dataMapping:
    accounts: accounts_map.yaml
    transactions: transactions_map.yaml
```

---

## Available Department Packs

| Pack ID | Name | AI Workers | Industry Reuse |
|---------|------|------------|----------------|
| `finance` | Finance Department | AI CFO, AI Accountant, AI Treasury Manager | 100% |
| `hr` | HR Department | AI Recruiter, AI Payroll Manager, AI Performance Coach | 100% |
| `marketing` | Marketing Department | AI CMO, AI Content Manager, AI Ads Manager | 100% |
| `sales` | Sales Department | AI SDR, AI Closer, AI Proposal Writer, AI Success Manager | 100% |
| `operations` | Operations Department | AI Ops Manager, AI Quality Manager, AI Safety Manager | 100% |
| `legal` | Legal Department | AI Legal Counsel, AI Compliance Officer | 100% |

---

## AI Worker Structure

```yaml
# department-packs/finance/agents/ai-cfo/manifest.yaml

id: ai-cfo
name: AI Chief Financial Officer
department: finance
level: senior

capabilities:
  - financial_planning
  - cash_flow_optimization
  - risk_management
  - investor_reporting
  - board_presentations
  - budget_oversight

skills:
  - name: financial_analysis
    type: analysis
    model: gpt-4
    prompt: You are an expert financial analyst...
  
  - name: cash_flow_management
    type: automation
    model: gpt-4
    prompt: Optimize cash flow while maintaining liquidity...
  
  - name: forecasting
    type: prediction
    model: gpt-4
    accuracy: 0.92

authority:
  maxTransactionValue: 100000
  requireApprovalAbove: 500000
  canApproveBudgets: true
  canFireVendors: false
  canHireStaff: false

memory:
  shortTerm:
    enabled: true
    capacity: 1000
  longTerm:
    enabled: true
    retention: 90d
    compression: true

policies:
  - id: spending-limits
    rules:
      - scope: operational
        maxAmount: 50000
        requiresApproval: false
      - scope: capital
        maxAmount: 500000
        requiresApproval: true
        approvers:
          - ai-ceo
          - human:board
  
  - id: reporting-frequency
    rules:
      - reportType: daily
        audience: ai-executive-team
      - reportType: weekly
        audience: human:executives
      - reportType: monthly
        audience: board

twin:
  id: twin_ai_cfo_{company_id}
  type: worker:ai-cfo
  updateFrequency: realtime
  dataPoints:
    - financial_health
    - cash_position
    - pending_approvals
    - active_risks
    - forecast_accuracy

integration:
  reads:
    - erp_system
    - bank_statements
    - sales_data
    - hr_data
  
  writes:
    - financial_reports
    - budgets
    - forecasts
  
  events:
    - invoice_created
    - payment_received
    - payment_made
    - budget_exceeded
```

---

## Workflow Definition

```yaml
# department-packs/finance/workflows/invoice-processing.yaml

id: invoice-processing
name: Invoice Processing Workflow
department: finance
trigger:
  type: event
  event: invoice.created

stages:
  - id: validation
    name: Validate Invoice
    actions:
      - type: ai
        worker: ai-accountant
        prompt: Validate invoice data and detect anomalies
    next:
      - on: valid
        goto: approval
      - on: invalid
        goto: rejection
  
  - id: approval
    name: Approval Routing
    actions:
      - type: condition
        rules:
          - if: amount <= 50000
            then: auto_approve
          - if: amount <= 500000
            then: cfo_approval
          - if: amount > 500000
            then: ceo_approval
    next:
      - on: auto_approve
        goto: payment
      - on: approved
        goto: payment
      - on: rejected
        goto: rejection
  
  - id: payment
    name: Payment Processing
    actions:
      - type: ai
        worker: ai-treasury-manager
        prompt: Process payment via optimal method
      - type: integration
        target: bank_system
        action: initiate_payment
    next:
      - on: success
        goto: completion
      - on: failed
        goto: retry
  
  - id: completion
    name: Record and Notify
    actions:
      - type: twin_update
        target: financial_twin
        data: payment_completed
      - type: notification
        to: vendor
        template: payment_confirmed
      - type: ledger_entry
        account: accounts_payable
  
  - id: rejection
    name: Handle Rejection
    actions:
      - type: notification
        to: requester
        template: invoice_rejected
        reason: auto_generated
  
  - id: retry
    name: Retry Payment
    actions:
      - type: delay
        duration: 1h
      - type: retry
        maxAttempts: 3
```

---

## Connector Definition

```yaml
# department-packs/finance/connectors/gst.yaml

id: gst-connector
name: GST Compliance Connector
department: finance
version: 1.0.0

provider:
  name: GSTN
  type: government
  region: India

authentication:
  type: oauth2
  config:
    clientId: ${GST_CLIENT_ID}
    clientSecret: ${GST_CLIENT_SECRET}
    scope: gst_returns, einvoice

endpoints:
  - name: file_gstr1
    method: POST
    path: /returns/gstr1
    rateLimit: 10/min
  
  - name: file_gstr3b
    method: POST
    path: /returns/gstr3b
    rateLimit: 5/min
  
  - name: verify_einvoice
    method: POST
    path: /einvoice/verify
    rateLimit: 100/min

dataMapping:
  invoice:
    gstin: invoice.supplierGstin
    invoiceNumber: invoice.number
    invoiceDate: invoice.date
    totalAmount: invoice.total
    cgst: invoice.cgstAmount
    sgst: invoice.sgstAmount
    igst: invoice.igstAmount

sync:
  frequency: daily
  time: "23:00 Asia/Kolkata"
  retryOnFailure: true
  maxRetries: 3

errorHandling:
  onAuthFailure: reauthenticate
  onRateLimit: backoff_15min
  onServerError: retry_1h
```

---

## Installation Flow

```typescript
// When installing a department pack

interface PackInstallation {
  packId: string;
  companyId: string;
  config: Record<string, unknown>;
}

// 1. Load pack manifest
const manifest = await loadPackManifest('finance');

// 2. Validate config against schema
validateConfig(manifest.configSchema, config);

// 3. Create tenant-specific endpoints
await createTenantEndpoints(manifest.endpoints, companyId);

// 4. Deploy AI workers
for (const worker of manifest.aiWorkers) {
  await deployAIWorker(worker, companyId, config);
}

// 5. Initialize policies
for (const policy of manifest.policies) {
  await initializePolicy(policy, companyId);
}

// 6. Create department twin
const twin = await createDepartmentTwin(manifest.twinConfig, companyId);

// 7. Configure connectors
for (const connector of manifest.connectors) {
  await configureConnector(connector, companyId, config);
}

// 8. Run health checks
for (const check of manifest.healthChecks) {
  await verifyHealth(check, companyId);
}

// 9. Generate manifest entry
const installed: InstalledDepartment = {
  id: manifest.id,
  packVersion: manifest.version,
  endpoint: `http://localhost:${4010 + packPortOffset}/api/${manifest.id}`,
  installedAt: new Date().toISOString(),
  config
};
```

---

## Dependencies

```json
{
  "@hojai/sutar-os": "workspace:*",
  "@hojai/memory-os": "workspace:*",
  "@hojai/twin-os": "workspace:*",
  "@hojai/policy-os": "workspace:*"
}
```

---

## Test Cases

```typescript
// __tests__/department-pack.test.ts

describe('DepartmentPack', () => {
  
  it('should install finance pack successfully', async () => {
    const result = await compositionEngine.installPack({
      packId: 'finance',
      companyId: 'test_company',
      config: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        gstEnabled: true
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.workers).toContain('ai-cfo');
    expect(result.workers).toContain('ai-accountant');
    expect(result.workers).toContain('ai-treasury-manager');
  });
  
  it('should auto-install identity dependency', async () => {
    // Finance requires identity
    const result = await compositionEngine.installPack({
      packId: 'finance',
      companyId: 'test_company',
      config: {}
    });
    
    // Should have installed identity first
    expect(result.dependencies).toContain('identity');
  });
  
  it('should validate config against schema', async () => {
    const invalidConfig = {
      currency: 'INVALID',  // Not in enum
      fiscalYearStart: '13-01'  // Invalid format
    };
    
    const result = await compositionEngine.installPack({
      packId: 'finance',
      companyId: 'test_company',
      config: invalidConfig
    });
    
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'currency' })
    );
  });
  
  it('should rollback on worker deployment failure', async () => {
    // Simulate AI worker deployment failure
    const result = await compositionEngine.installPack({
      packId: 'finance',
      companyId: 'test_company',
      config: {}
    });
    
    expect(result.success).toBe(false);
    expect(result.rollback).toBe(true);
    
    // Verify cleanup happened
    const workers = await listWorkers('test_company');
    expect(workers).toHaveLength(0);
  });
});
```