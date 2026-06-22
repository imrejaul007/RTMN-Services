# REZ Contract Management

**Port:** 5003

Full contract lifecycle management service with e-signatures.

## Features

- **Contract CRUD** - Create, read, update, delete contracts
- **Template System** - Pre-built templates (NDA, MSA, SOW, Employment)
- **Version Control** - Track contract revisions
- **E-Signature** - Multi-party signing with audit trail
- **Renewal Management** - Automatic renewal reminders
- **Clause Library** - Reusable standard clauses
- **PDF Generation** - Generate contracts as PDF

## Pre-built Templates

- **NDA** - Non-Disclosure Agreement
- **MSA** - Master Service Agreement
- **SOW** - Statement of Work
- **Employment** - Employment Agreement

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with MONGODB_URI and SMTP settings

# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Contracts

```bash
# List contracts
GET /contracts
GET /contracts?status=signed&type=nda

# Create contract
POST /contracts
{
  "title": "NDA with ABC Corp",
  "type": "nda",
  "templateId": "template_nda",
  "variables": {
    "partyName": "ABC Corp",
    "partyEmail": "legal@abc.com",
    "effectiveDate": "2024-01-15",
    "termMonths": 24
  }
}

# Get contract
GET /contracts/:id

# Update contract
PUT /contracts/:id

# Delete draft contract
DELETE /contracts/:id

# Generate PDF
POST /contracts/:id/generate-pdf

# Get version history
GET /contracts/:id/history
```

### Signatures

```bash
# Send for signature
POST /contracts/:id/send-for-signature
{
  "signers": [
    { "email": "alice@company.com", "name": "Alice Smith", "role": "signer" },
    { "email": "bob@partner.com", "name": "Bob Jones", "role": "signer" }
  ],
  "message": "Please review and sign the NDA"
}

# Get signature status
GET /contracts/:id/signatures

# Sign contract
POST /contracts/:id/sign
{
  "signatureData": "data:image/png;base64,..."
}

# Cancel pending signatures
DELETE /contracts/:id/signatures
```

### Templates

```bash
# List templates
GET /templates

# Get template
GET /templates/:id

# Create template
POST /templates

# Update template
PUT /templates/:id

# Render template
POST /templates/:id/render
{
  "partyName": "ABC Corp",
  "effectiveDate": "2024-01-15"
}
```

### Clauses

```bash
# List clauses
GET /clauses
GET /clauses?category=confidentiality

# Add clause
POST /clauses
{
  "title": "Standard Confidentiality",
  "category": "confidentiality",
  "content": "The Receiving Party agrees to...",
  "risk": "medium"
}

# Update clause
PUT /clauses/:id

# Delete clause
DELETE /clauses/:id
```

### Renewals

```bash
# Get upcoming renewals
GET /contracts/upcoming-renewals?days=30

# Renew contract
POST /contracts/:id/renew
{
  "newEndDate": "2026-01-15",
  "updateTerms": true
}
```

## Example Usage

### 1. Create NDA Contract
```bash
curl -X POST http://localhost:5003/contracts \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant_123" \
  -d '{
    "title": "NDA with Tech Partner",
    "type": "nda",
    "templateId": "template_nda",
    "variables": {
      "disclosingParty": "Our Company",
      "receivingParty": "Tech Partner Inc",
      "effectiveDate": "2024-01-15",
      "termMonths": 24,
      "governingLaw": "Delaware"
    }
  }'
```

### 2. Generate PDF
```bash
curl -X POST http://localhost:5003/contracts/contract_123/generate-pdf \
  -H "X-Tenant-ID: tenant_123"
```

### 3. Send for Signature
```bash
curl -X POST http://localhost:5003/contracts/contract_123/send-for-signature \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant_123" \
  -d '{
    "signers": [
      { "email": "ceo@ourcompany.com", "name": "John CEO", "role": "signer" },
      { "email": "legal@techpartner.com", "name": "Jane Legal", "role": "signer" }
    ],
    "message": "Please review and sign the attached NDA"
  }'
```

## Contract Model

```typescript
interface Contract {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  
  // Parties involved
  parties: Party[];
  
  // Content and structure
  content?: string;
  templateId?: string;
  variables: Record<string, unknown>;
  
  // Dates
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  renewalTermMonths: number;
  
  // Workflow
  currentVersion: number;
  versions: ContractVersion[];
  
  // Signatures
  signatures: Signature[];
  
  // Clauses
  terms: Clause[];
  
  // Audit
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    signedAt?: Date;
  };
}

type ContractType = 'nda' | 'msa' | 'sow' | 'employment' | 'vendor' | 'custom';
type ContractStatus = 'draft' | 'pending_signature' | 'partially_signed' | 'signed' | 'expired' | 'terminated';
```

## Template Variables

Templates support dynamic variables:

```handlebars
This {{documentType}} is entered into between {{disclosingParty}} 
("Disclosing Party") and {{receivingParty}} ("Receiving Party").

Effective Date: {{effectiveDate}}
Term: {{termMonths}} months
Governing Law: {{governingLaw}}
```

## E-Signature Flow

1. **Create Contract** → Contract created as draft
2. **Generate PDF** → Contract converted to PDF
3. **Send for Signature** → Signers receive email
4. **Sign** → Each signer signs in order
5. **Completed** → All signatures collected

## Renewal Reminders

The service sends reminders for:
- 90 days before expiration
- 60 days before expiration
- 30 days before expiration
- 7 days before expiration

Configure via environment:
```bash
RENEWAL_REMINDER_DAYS=90,60,30,7
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5003 |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/rez-contracts |
| `SMTP_HOST` | SMTP server | smtp.mailtrap.io |
| `SMTP_PORT` | SMTP port | 587 |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `FROM_EMAIL` | From email address | contracts@rez.ai |
| `APP_URL` | Frontend URL | http://localhost:5003 |
| `NODE_ENV` | Environment | development |

## Health Checks

```bash
curl http://localhost:5003/health
```

## License

MIT
