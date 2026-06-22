# LawGens - Legal AI Platform

**Legal Intelligence for Everyone - AI-Powered Legal Research, Contracts & Compliance**

> "Making legal expertise accessible to every business and individual"

**Version:** 2.0.0 | **Date:** June 12, 2026 | **Ports:** 5098-5123 | **Status:** ✅ Production Ready

---

## Overview

LawGens is a comprehensive Legal AI platform under RTNM Digital that democratizes legal services through artificial intelligence. It provides contract analysis, legal research, compliance management, and court case tracking for businesses, individuals, and legal professionals.

The platform offers three specialized applications: **LawGens Web** (general SaaS platform), **LawGens Biz** (business legal services), and **LawGens Pro** (professional dashboard for lawyers). The Contract OS provides AI-powered contract lifecycle management while the Integration API enables ecosystem connectivity.

## Architecture

```
                                    ┌─────────────────────────────────────────┐
                                    │           External Clients              │
                                    │   (Web, Mobile, Desktop, API Users)    │
                                    └──────────────────┬──────────────────────┘
                                                       │
                                       ┌───────────────┴───────────────┐
                                       ▼                               ▼
                            ┌─────────────────┐            ┌─────────────────┐
                            │  LawGens Web    │            │  LawGens Biz    │
                            │    (3001)       │            │    (3002)       │
                            │  Consumer SaaS  │            │ Business Portal │
                            └────────┬────────┘            └────────┬────────┘
                                     │                              │
                            ┌─────────┴──────────────────────────────┴────────┐
                            │              LawGens Pro (3003)                │
                            │         Professional Dashboard                  │
                            └────────────────────┬───────────────────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────────────────┐
                                    │           LawGens API Gateway           │
                                    │            (5098-5099)                  │
                                    ├─────────────────────────────────────────┤
                                    │  ┌────────────┐  ┌──────────────────┐   │
                                    │  │  Contract  │  │   Legal          │   │
                                    │  │     OS     │  │   Research API   │   │
                                    │  │   (5100)   │  │   (5101-5105)    │   │
                                    │  └────────────┘  └──────────────────┘   │
                                    │  ┌────────────┐  ┌──────────────────┐   │
                                    │  │ Compliance│  │   Court Case     │   │
                                    │  │  Manager  │  │   Tracker        │   │
                                    │  │   (5110)  │  │   (5111-5115)    │   │
                                    │  └────────────┘  └──────────────────┘   │
                                    └─────────────────────────────────────────┘
                                                   │
                           ┌───────────────────────┼───────────────────────┐
                           │                       │                       │
                           ▼                       ▼                       ▼
                    ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
                    │   HOJAI AI  │        │  RABTUL     │        │  CorpPerks  │
                    │  (Memory,  │        │  (Auth,     │        │  (Users,    │
                    │  Agents)    │        │   Wallet)   │        │   Billing)  │
                    └─────────────┘        └─────────────┘        └─────────────┘
```

## Products & Services

### Core Applications

| Application | Port | Description |
|-------------|------|-------------|
| **LawGens Web** | 3001 | Marketing + SaaS Platform for general users |
| **LawGens Biz** | 3002 | Business Legal Services portal |
| **LawGens Pro** | 3003 | Professional dashboard for legal professionals |

### Backend Services

| Service | Port Range | Description |
|---------|------------|-------------|
| **Integration API** | 5098 | Service-to-service integration endpoints |
| **LawGens API** | 5099 | Main REST API for all legal operations |
| **Contract OS** | 5100 | AI-powered contract analysis and generation |
| **Legal Research** | 5101-5105 | Case law and statute research |
| **Compliance Manager** | 5110 | Regulatory compliance tracking |
| **Court Tracker** | 5111-5115 | Case status and hearing tracking |

## Key Features

### Contract Management (Contract OS)

- **Contract Analysis** - AI-powered review of contract terms, risks, and obligations
- **Contract Generation** - Create standard contracts from templates
- **Clause Library** - Reusable legal clauses with versioning
- **Redlining** - Track and compare contract revisions
- **E-Signature Integration** - Digital signing workflow
- **Contract Types Supported**: NDA, MSA, Employment, Lease, Service Agreement, etc.

### Legal Research

- **Case Law Search** - Search judgments across Indian courts
- **Statute Lookup** - Access to legal statutes and amendments
- **Citation Analysis** - Track case citations and precedents
- **Legal drafting assistance** - AI-assisted document drafting

### Court Case Management

- **Case Tracking** - Monitor case status across courts
- **Hearing Reminders** - Get notified of upcoming hearings
- **Document Management** - Store and organize case documents
- **Timeline View** - Visual case progression tracking

### Compliance Management

- **Regulatory Calendar** - Stay updated on compliance deadlines
- **Checklist Management** - Track compliance requirements
- **Audit Trail** - Maintain records for regulatory audits

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 6.0+
- npm or yarn
- Docker (optional)

### Installation

```bash
# Navigate to LawGens directory
cd LawGens

# Install root dependencies (monorepo)
npm install

# Install app-specific dependencies
cd apps/lawgens-web
npm install

cd apps/lawgens-biz
npm install

cd apps/lawgens-pro
npm install
```

### Running Applications

```bash
# Start LawGens Web (port 3001)
cd apps/lawgens-web
npm run dev

# Start LawGens Biz (port 3002)
cd apps/lawgens-biz
npm run dev

# Start LawGens Pro (port 3003)
cd apps/lawgens-pro
npm run dev
```

### Docker Deployment

```bash
# Build Docker image for any app
docker build -t lawgens-web:latest ./apps/lawgens-web

# Run container
docker run -d \
  --name lawgens-web \
  -p 3001:3001 \
  -e NEXT_PUBLIC_API_URL=http://localhost:5099 \
  -e NEXT_PUBLIC_INTEGRATION_URL=http://localhost:5098 \
  lawgens-web:latest
```

---

## Configuration

### Environment Variables

#### LawGens Web (.env.local)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5099
NEXT_PUBLIC_INTEGRATION_URL=http://localhost:5098

# Authentication
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

#### Backend Services (.env)

```bash
# Server Configuration
PORT=5099
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lawgens

# External Services
HOJAI_AI_URL=http://localhost:4850
RABTUL_AUTH_URL=http://localhost:4002
RABTUL_WALLET_URL=http://localhost:4004

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=7d
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/logout` | User logout |
| `POST` | `/api/auth/refresh` | Refresh token |
| `POST` | `/api/auth/forgot-password` | Password reset request |
| `POST` | `/api/auth/reset-password` | Reset password |

### Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/contracts/analyze` | Analyze contract text |
| `POST` | `/api/contracts/generate` | Generate contract from template |
| `GET` | `/api/contracts/templates` | List contract templates |
| `GET` | `/api/contracts/:id` | Get contract details |
| `PUT` | `/api/contracts/:id` | Update contract |
| `DELETE` | `/api/contracts/:id` | Delete contract |
| `POST` | `/api/contracts/:id/compare` | Compare contract versions |

### Legal Research

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/research/cases` | Search case law |
| `GET` | `/api/research/cases/:id` | Get case details |
| `GET` | `/api/research/statutes` | Search statutes |
| `GET` | `/api/research/citations/:id` | Get case citations |

### Court Cases

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cases/search` | Search court cases |
| `POST` | `/api/cases/track` | Start tracking a case |
| `GET` | `/api/cases/:id` | Get case details |
| `GET` | `/api/cases/:id/hearings` | Get hearing schedule |
| `DELETE` | `/api/cases/:id` | Stop tracking case |

### Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/compliance/calendar` | Get compliance calendar |
| `POST` | `/api/compliance/checklists` | Create compliance checklist |
| `PUT` | `/api/compliance/checklists/:id` | Update checklist |
| `POST` | `/api/compliance/audit` | Generate audit report |

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/health/ready` | Kubernetes readiness |
| `GET` | `/health/live` | Kubernetes liveness |

---

## API Examples

### Analyze Contract

```bash
curl -X POST http://localhost:5099/api/contracts/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "text": "This Non-Disclosure Agreement is entered into between...",
    "type": "NDA",
    "include_risks": true,
    "include_suggestions": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "analysis_abc123",
    "contract_type": "NDA",
    "summary": "Standard mutual NDA with 2-year confidentiality period...",
    "key_clauses": [
      {
        "type": "confidentiality",
        "content": "Both parties agree to keep...",
        "risk_level": "low"
      }
    ],
    "risks": [
      {
        "clause": "Section 4.2",
        "description": "Broad definition of confidential information",
        "severity": "medium",
        "suggestion": "Consider narrowing the scope..."
      }
    ],
    "overall_score": 85,
    "recommendations": [
      "Add termination clause",
      "Specify jurisdiction"
    ]
  }
}
```

### Search Court Cases

```bash
curl -X POST http://localhost:5099/api/cases/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "copyright infringement software",
    "court": "Delhi High Court",
    "year_range": {
      "from": 2020,
      "to": 2026
    },
    "limit": 10
  }'
```

### Generate Contract

```bash
curl -X POST http://localhost:5099/api/contracts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "template": "NDA",
    "parties": [
      {
        "name": "Acme Corp",
        "type": "disclosing"
      },
      {
        "name": "Beta Inc",
        "type": "receiving"
      }
    ],
    "terms": {
      "effective_date": "2026-06-10",
      "duration_months": 24,
      "jurisdiction": "Delhi"
    }
  }'
```

---

## Directory Structure

```
LawGens/
├── apps/
│   ├── lawgens-web/           # Main SaaS Platform (Next.js)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx              # Landing page
│   │   │   │   ├── login/page.tsx        # Login
│   │   │   │   ├── signup/page.tsx       # Signup
│   │   │   │   ├── dashboard/page.tsx    # Dashboard
│   │   │   │   ├── contracts/page.tsx   # Contracts
│   │   │   │   └── cases/search/page.tsx # Case search
│   │   │   └── lib/
│   │   │       └── api.ts               # API client
│   │   └── package.json
│   ├── lawgens-biz/           # Business Portal
│   └── lawgens-pro/           # Professional Dashboard
├── contract-os/               # Contract Analysis Engine
│   ├── src/
│   │   ├── analyzer/          # Contract analysis logic
│   │   ├── generator/         # Contract generation
│   │   └── clauses/           # Clause library
│   └── package.json
├── services/
│   ├── api-gateway/           # API Gateway Service
│   ├── legal-research/        # Legal Research Service
│   └── court-tracker/        # Court Case Tracker
└── docs/                     # Documentation
```

---

## Pricing Plans

### LawGens Web

| Plan | Price | Features |
|------|-------|----------|
| **Starter** | Free | 5 contract analyses/month, basic templates |
| **Professional** | Rs. 999/month | 50 analyses/month, all templates, priority support |
| **Enterprise** | Rs. 4,999/month | Unlimited analyses, API access, dedicated support |

### LawGens Biz

| Service | Price | Description |
|---------|-------|-------------|
| Company Incorporation | Rs. 9,999 | Private Ltd, LLP, OPC |
| Trademark Registration | Rs. 4,999 | Search, application, filing |
| GST Compliance | Rs. 1,999/month | Monthly filing, returns |
| Contract Drafting | Rs. 2,999 | Custom contracts |
| Compliance Calendar | Rs. 999/month | Annual reminders |
| Legal Opinion | Rs. 5,999 | Expert legal advice |

### LawGens Pro

| Feature | Description |
|---------|-------------|
| Case Manager | Track deadlines, clients |
| Contract Builder | AI-assisted generation |
| Court Research | Judgment search |
| Billing & Invoicing | Time tracking, invoices |
| Client Portal | Secure document sharing |
| Calendar & Reminders | Hearing dates |

---

## Security Features

- **JWT Authentication** - Secure token-based auth
- **Role-Based Access** - Granular permissions
- **Data Encryption** - At-rest and in-transit
- **Audit Logging** - Complete activity tracking
- **GDPR Compliance** - Data privacy controls
- **Rate Limiting** - API abuse prevention

---

## Integration Services

LawGens provides integration endpoints for ecosystem connectivity:

### Service-to-Service (Port 5098)

```typescript
// Onboard user via integration API
POST /integration/onboard
{
  userId: string;
  email: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  metadata?: Record<string, any>;
}

// Webhook for events
POST /integration/webhook
{
  event: 'contract.created' | 'case.updated' | 'compliance.due';
  data: Record<string, any>;
}
```

---

## Port Registry

| Service | Port | Range |
|---------|------|-------|
| Integration API | 5098 | 5098-5123 (LawGens) |
| LawGens API | 5099 | 5098-5123 |
| Contract OS | 5100 | 5098-5123 |
| Legal Research | 5101-5105 | 5098-5123 |
| Compliance Manager | 5110 | 5098-5123 |
| Court Tracker | 5111-5115 | 5098-5123 |

---

## Related Products

- [HOJAI AI](/Users/rejaulkarim/Documents/ReZ%20Full%20App/HOJAI/) - AI services for contract analysis
- [RABTUL Auth](/Users/rejaulkarim/Documents/ReZ%20Full%20App/RABTUL/) - Authentication services
- [CorpPerks](/Users/rejaulkarim/Documents/ReZ%20Full%20App/CorpPerks/) - User management
- [GENIE Services](/Users/rejaulkarim/Documents/ReZ%20Full%20App/genie-memory-service/) - Personal intelligence

---

## Troubleshooting

### Common Issues

**API Connection Failed**
```
Error: ECONNREFUSED localhost:5099
```
Solution: Ensure the API server is running. Start with `npm run dev` in the services directory.

**Contract Analysis Timeout**
```
Error: Analysis request timeout
```
Solution: Try with a shorter contract text or contact support for larger documents.

**Authentication Error**
```
Error: Invalid or expired token
```
Solution: Re-authenticate by logging out and back in.

---

## Support

- **Email:** support@lawgens.app
- **Documentation:** https://docs.lawgens.app
- **API Docs:** https://api.lawgens.app/docs

---

## License

Proprietary - RTNM Digital / LawGens

---

Built with ❤️ by RTNM Digital - "Making legal expertise accessible to everyone"
