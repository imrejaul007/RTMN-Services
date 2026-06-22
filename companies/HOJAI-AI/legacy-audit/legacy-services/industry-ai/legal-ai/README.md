# Legal AI

**Location:** `industry-ai/legal-ai/`  
**Company:** HOJAI AI  
**Category:** Legal Industry  
**Type:** Industry AI Vertical  
**Status:** ✅ **TEMPLATE WITH TESTS** | **June 13, 2026**  
**Port:** 3000 (configurable)  
**Unit Tests:** 24 passing ✅

---

## Overview

This service provides AI-powered capabilities for the legal industry. It is part of the HOJAI Industry AI ecosystem, which provides privacy-preserving industry-specific intelligence.

---

## Features

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Contract Analysis** | Analyze contracts for risk and compliance | ✅ Template |
| **Case Management** | Manage legal cases and deadlines | ✅ Template |
| **Document Generation** | Generate legal documents from templates | ✅ Template |
| **Compliance** | Automated compliance checking | ✅ Template |

### Contract Analysis Features

| Feature | Description |
|---------|-------------|
| Risk Scoring | Calculate contract risk scores |
| Clause Detection | Identify missing essential clauses |
| NDA Detection | Detect non-disclosure clauses |
| Party Management | Track contract parties |
| Type Classification | NDA, Employment, Service, Lease, Sales, Partnership |

### Case Management Features

| Feature | Description |
|---------|-------------|
| Case Lifecycle | Intake → Active → Pending → Closed → Archived |
| Deadline Tracking | Track and alert on deadlines |
| Priority Scoring | Calculate case priority scores |
| Overdue Detection | Identify overdue deadlines |
| Assignment Tracking | Assign attorneys and paralegals |

### Document Generation Features

| Feature | Description |
|---------|-------------|
| Template Variables | Dynamic variable replacement |
| Variable Validation | Check for missing variables |
| Multi-format Support | Contracts, letters, motions, briefs |
| Clause Library | Reusable legal clauses |

### Compliance Features

| Feature | Description |
|---------|-------------|
| Regulation Checking | GDPR, HIPAA, SOX, PCI compliance |
| Compliance Scoring | Calculate overall compliance score |
| Report Generation | Generate compliance reports |
| Status Tracking | Compliant, Non-compliant, Needs Review |

---

## Case Types

| Type | Description |
|------|-------------|
| Civil | Civil litigation |
| Criminal | Criminal matters |
| Corporate | Corporate law |
| Intellectual Property | Patents, trademarks, copyrights |
| Employment | Employment disputes |
| Real Estate | Property law |

---

## API Endpoints

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/health/live` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |

### Info Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/info` | Service information |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Service port |
| `NODE_ENV` | No | development | Environment |
| `MONGODB_URI` | Yes | - | MongoDB connection |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `REDIS_URL` | No | localhost:6379 | Redis connection |
| `CORS_ORIGIN` | No | localhost:3000 | CORS origin |

---

## Integration Points

### HOJAI AI Services

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI Industry | 4700 | Industry intelligence |
| HOJAI HIB | 3053 | Code intelligence |
| HOJAI Memory | 4520 | Context storage |
| HOJAI Twin | 4860 | Digital twins |

### External Services

| Service | Purpose |
|---------|---------|
| LawGens | Legal services, RTMZ forensics |
| RABTUL Auth | Authentication |
| RABTUL Payment | Billing |

---

## Unit Tests (24 passing)

### Test Coverage

| Test Suite | Tests | Status |
|------------|-------|--------|
| Feature Flags | 1 | ✅ |
| Contract Analysis | 5 | ✅ |
| Case Management | 5 | ✅ |
| Document Generation | 2 | ✅ |
| Compliance | 3 | ✅ |
| Billing | 3 | ✅ |
| Health Endpoints | 3 | ✅ |
| Info Endpoint | 1 | ✅ |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/index.test.ts
```

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis
- **Testing:** Vitest
- **Logging:** Pino

---

## Related Services

### Industry AI Vertical Services

| Service | Industry | Tests |
|---------|----------|-------|
| fitness-ai | Fitness | ✅ 33 tests |
| **legal-ai** | Legal | ✅ 24 tests |
| crm | CRM | ✅ 18 tests |
| salon-ai | Commerce | Template |
| retail-ai | Commerce | Template |
| + 32 more | Various | Templates |

### HOJAI HIB Services

| Service | Description | Status |
|---------|-------------|--------|
| hib-code-intelligence | Code analysis & security | ✅ Built |
| hib-soar | Security automation | ✅ Built |

---

## Documentation

| Document | Description |
|----------|-------------|
| CLAUDE.md | Developer documentation |
| IMPLEMENTATION.md | Implementation guide |
| INTEGRATION.md | Integration guide |
| RTNM-COMPANIES-AUDIT.md | Company audit |
| RTNM-PRODUCTS-FEATURES-AUDIT.md | Product features |

---

## Reference Implementation

See `waitron` (Restaurant OS) for a complete example:
- Full MongoDB integration
- Complete API endpoints
- Production-ready structure

---

## License

Proprietary - RTNM Digital

---

**Last Updated:** June 13, 2026
