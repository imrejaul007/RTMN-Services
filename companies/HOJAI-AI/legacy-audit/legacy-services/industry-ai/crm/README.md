# CRM - Customer Relationship Management

**Location:** `industry-ai/crm/`  
**Company:** HOJAI AI  
**Category:** Team/Sales  
**Type:** Industry AI Vertical  
**Status:** ✅ **TEMPLATE WITH TESTS** | **June 13, 2026**  
**Port:** 3000 (configurable)  
**Unit Tests:** 18 passing ✅

---

## Overview

This service provides AI-powered Customer Relationship Management capabilities. It is part of the HOJAI Industry AI ecosystem, which provides privacy-preserving industry-specific intelligence.

---

## Features

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Lead Management** | Capture, score, and qualify leads | ✅ Template |
| **Contact Management** | Store and manage customer contacts | ✅ Template |
| **Deal Tracking** | Track sales pipeline and deals | ✅ Template |
| **Task Management** | Manage sales tasks and follow-ups | ✅ Template |
| **Email Integration** | Email tracking and templates | ✅ Template |
| **Analytics** | Sales analytics and reporting | ✅ Template |

### Lead Management Features

| Feature | Description |
|---------|-------------|
| Lead Scoring | Score leads based on source, engagement |
| Temperature Classification | Cold, Warm, Hot leads |
| Stage Progression | New → Contacted → Qualified → Proposal → Negotiation → Won/Lost |
| Source Attribution | Website, Referral, Social, Event, Partner, Cold Call |
| Stale Lead Detection | Identify leads not updated in 7+ days |
| Campaign Tracking | Track leads by campaign |

### Contact Management Features

| Feature | Description |
|---------|-------------|
| Contact Profiles | Name, email, phone, company, title |
| Status Tracking | Lead, Prospect, Customer, Churned, Inactive |
| Tags & Segmentation | Custom tags for targeted campaigns |
| Source Tracking | Track how contacts were acquired |
| Last Contacted | Track communication history |
| Lifetime Value | Track customer revenue |

### Deal Tracking Features

| Feature | Description |
|---------|-------------|
| Deal Pipeline | Visual pipeline view |
| Stage Management | Qualification → Discovery → Proposal → Negotiation → Closed |
| Value Tracking | Track deal amounts |
| Probability Scoring | Win probability by stage |
| Weighted Value | Probability × Value for pipeline value |
| Revenue Forecasting | Best/Expected/Worst case scenarios |
| Deal Velocity | Track time to close |

### Task Management Features

| Feature | Description |
|---------|-------------|
| Task Types | Call, Email, Meeting, Follow-up, Demo, Proposal |
| Priority Levels | Low, Medium, High, Urgent |
| Due Date Tracking | Track task deadlines |
| Overdue Detection | Alert on overdue tasks |
| Related Entity | Link tasks to contacts, leads, deals |
| Assignment | Assign to team members |

---

## Lead Stages

| Stage | Description | Probability |
|-------|-------------|-------------|
| New | Newly captured lead | 10% |
| Contacted | Initial contact made | 20% |
| Qualified | Lead qualified | 40% |
| Proposal | Proposal sent | 60% |
| Negotiation | In negotiation | 80% |
| Closed Won | Deal won | 100% |
| Closed Lost | Deal lost | 0% |

---

## Analytics

### Key Metrics

| Metric | Formula |
|--------|---------|
| Conversion Rate | (Customers / Leads) × 100 |
| Customer Lifetime Value | Avg Purchase × Frequency × Lifespan |
| NPS Score | (Promoters - Detractors) / Total × 100 |
| Revenue per Customer | Total Revenue / Customers |
| Pipeline Value | Sum of open deal values |

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

### RABTUL Services (Core)

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | Authentication |
| RABTUL Payment | 4001 | Payments |
| RABTUL Wallet | 4004 | Balance |
| RABTUL Notification | 4005 | Notifications |

### HOJAI AI Services

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI Industry | 4700 | Industry intelligence |
| HOJAI Memory | 4520 | Context storage |
| HOJAI Twin | 4860 | Digital twins |
| HOJAI Intelligence | 4530 | ML predictions |

---

## Unit Tests (18 passing)

### Test Coverage

| Test Suite | Tests | Status |
|------------|-------|--------|
| Feature Flags | 1 | ✅ |
| Contact Management | 5 | ✅ |
| Lead Management | 2 | ✅ |
| Deal Tracking | 3 | ✅ |
| Task Management | 2 | ✅ |
| Analytics | 3 | ✅ |
| Health Endpoints | 3 | ✅ |

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
| legal-ai | Legal | ✅ 24 tests |
| **crm** | CRM | ✅ 18 tests |
| salon-ai | Commerce | Template |
| retail-ai | Commerce | Template |
| + 32 more | Various | Templates |

### Related HOJAI Services

| Service | Description | Status |
|---------|-------------|--------|
| HOJAI Industry | Industry intelligence | ✅ Built |
| HOJAI Intelligence | ML predictions | ✅ Built |
| HOJAI Twin | Digital twins | ✅ Built |

---

## Documentation

| Document | Description |
|----------|-------------|
| CLAUDE.md | Developer documentation |
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
