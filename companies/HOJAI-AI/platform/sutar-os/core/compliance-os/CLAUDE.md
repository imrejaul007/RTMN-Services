# ComplianceOS - Port 4873

## Overview
SOC2, GDPR, DPDPA, PCI-DSS, HIPAA, ISO 27001 compliance.

## Purpose
Enterprise compliance management with multi-framework support.

## Key Features
- Multi-framework compliance tracking
- Evidence collection
- Audit trail management
- Policy enforcement
- Risk assessment
- Compliance reporting

## API Endpoints

### Frameworks
- `GET /api/frameworks` - List frameworks
- `POST /api/frameworks` - Add framework
- `GET /api/frameworks/:id` - Get details
- `PATCH /api/frameworks/:id` - Update status

### Controls
- `GET /api/controls` - List controls
- `POST /api/controls` - Add control
- `PATCH /api/controls/:id` - Update control

### Evidence
- `GET /api/evidence` - List evidence
- `POST /api/evidence` - Collect evidence

### Audits
- `GET /api/audits` - List audits
- `POST /api/audits` - Schedule audit
- `PATCH /api/audits/:id` - Update audit

### Findings
- `GET /api/findings` - List findings
- `POST /api/findings` - Create finding
- `PATCH /api/findings/:id` - Update finding

### Policies
- `GET /api/policies` - List policies
- `POST /api/policies` - Create policy

### Data Requests (GDPR/DPDPA)
- `GET /api/data-requests` - List requests
- `POST /api/data-requests` - Submit request
- `PATCH /api/data-requests/:id` - Process request

### Reports
- `GET /api/reports/compliance-summary` - Compliance overview
- `GET /api/reports/audit-trail` - Audit trail

## Supported Frameworks
- SOC2
- GDPR
- DPDPA
- PCI-DSS
- HIPAA
- ISO 27001

## Tests
Vitest tests: `__tests__/compliance-os.test.ts`

## Environment
- Port: 4873

## Startup
```bash
cd platform/sutar-os/core/compliance-os && npm run dev
```
