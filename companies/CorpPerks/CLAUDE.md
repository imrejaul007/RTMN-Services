# CorpPerks - HR, Payroll & Benefits Platform

**Version:** 1.3.0  
**Last Updated:** June 17, 2026  
**Status:** ✅ **PRODUCTION READY** - 50+ Services | AI Agents | 3 Frontends | Layer 5 Workforce

---

## Overview

CorpPerks is the comprehensive HR, payroll, and employee benefits platform of the RTMN ecosystem. It provides workforce management, payroll processing, employee perks, and AI-powered assistants connected via **Layer 5 (Workforce)** to all 24 Industry OS services.

---

## 🚀 PRODUCTION INFRASTRUCTURE (June 2026)

### Deployment Files

| File | Purpose |
|------|---------|
| `render.yaml` | Full Render deployment blueprint (15+ services) |
| `docker-compose.yml` | Docker containers (MongoDB, PostgreSQL, Redis + services) |
| `.env.example` | Environment variables template |
| `.github/workflows/deploy.yml` | CI/CD pipeline |
| `backend/Dockerfile` | Backend container |
| `corpperks-intelligence/Dockerfile` | AI Intelligence container |
| `peopleos/Dockerfile` | PeopleOS container |
| `talentai/Dockerfile` | TalentAI container |

### Database Schemas

| File | Database | Models |
|------|---------|--------|
| `restopapa/backend/prisma/schema.prisma` | PostgreSQL | 60+ models |
| `models/mongodb-schemas.js` | MongoDB | 14 models |

---

## SERVICES (50+ Services)

### Core Backend Services (17)

| Service | Port | Lines | Status | Key Features |
|---------|------|-------|--------|-------------|
| **restopapa** | 8000 | 80 files | ✅ | Full NestJS app (auth, employees, restaurants, marketplace, payments, websockets) |
| **rez-corporate-service** | 4030 | 449 | ✅ | HRIS integrations (BambooHR, GreytHR, Zoho), GST, Razorpay, Travel (TBO) |
| **api-gateway** | 4006 | 376 | ✅ | Proxy routing, rate limiting, auth middleware |
| **corpperks-intelligence** | 4135 | 365 | ✅ | AI copilot, decision cards, health score, anomaly detection, forecasting |
| **corpID-profile-bridge** | 4101 | 303 | ✅ | CorpID identity bridge |
| **role-ai-agents** | 4130 | 302 | ✅ | HR, Recruiter, Trainer AI agents |
| **meeting-service** | 4013 | 207 | ✅ | Meetings, 1-on-1s, calendar sync, feedback |
| **document-service** | 4014 | 219 | ✅ | Document management |
| **video-service** | 4015 | 209 | ✅ | Video conferencing |
| **shift-service** | 4010 | 98 | ✅ | Shift scheduling with seed data |
| **payroll-service** | 4007 | 95 | ✅ | Payroll processing |
| **push-service** | 4016 | 131 | ✅ | Push notifications |
| **whatsapp-service** | 4017 | 103 | ✅ | WhatsApp notifications |
| **analytics-service** | 4018 | 105 | ✅ | HR analytics dashboard |
| **compensation-service** | 4019 | 111 | ✅ | Salary, benefits, equity |
| **projectos-service** | 4020 | 119 | ✅ | Project management |
| **REZ-merchant-corpperks-bridge** | 4100 | 130 | ✅ | Meal benefits integration |
| **backend** | 4006 | 90 | ✅ | Express backend |

---

## AI AGENTS (4136) ✅

### AI Agents Service

| Agent | Capabilities |
|-------|--------------|
| **HR Assistant Agent** | Policy queries, leave requests, benefits info, payroll help |
| **Recruiter Agent** | Job postings, candidate screening, interview scheduling |
| **Onboarding Agent** | New hire tasks, document collection, training coordination |
| **Compliance Agent** | Policy violations, audits, risk assessment |

### CorpPerks Intelligence Features

| Feature | Description |
|---------|-------------|
| **AI Copilot** | Natural language workforce queries |
| **Decision Cards** | AI-powered decision recommendations |
| **Health Score** | Organizational health monitoring |
| **Anomaly Detection** | Workforce anomaly detection |
| **Workforce Forecasting** | Predictive workforce analytics |

---

## PROFESSIONAL TWIN MARKETPLACE (4150) ✅

| Twin Type | Features |
|-----------|----------|
| Employee Twin | Skills, experience, certifications, integrations |
| Manager Twin | Team management, performance reviews, career coaching |
| Recruiter Twin | Candidate pipeline, sourcing, salary negotiation |
| Trainer Twin | Learning paths, skill assessments, leadership development |
| Executive Twin | Strategic decisions, OKRs, board advisory |

---

## FRONTEND APPLICATIONS ✅

### PeopleOS (Port 3001)

| Page | Features |
|------|----------|
| Dashboard | Employee stats, growth charts, pending approvals |
| Employees | Search, filter, employee list with profiles |
| Leave Management | Balance tracking, request approval workflow |
| Attendance | Daily tracking, check-in/out, work hours |
| Payroll | Salary breakdown, deductions, payslips |
| Documents | Upload, verify, categorize documents |
| AI Assistant | Chat interface with quick actions |

### TalentAI (Port 3002)

| Feature | Description |
|---------|-------------|
| Jobs | Open positions with details |
| Candidates | Applicant profiles, scores, skills |
| Pipeline | Visual recruitment funnel |

### Insight Campus (Port 3003)

| Feature | Description |
|---------|-------------|
| Analytics Dashboard | Employee metrics, trends |
| Reports | Custom reports |
| Insights | AI-powered insights |

---

## PORT RANGE

| Range | Services |
|-------|----------|
| **4006-4020** | CorpPerks Core Services |
| **4135-4136** | AI Services |
| **4150** | Twin Marketplace |
| **4100-4101** | Bridge Services |
| **3001-3003** | Frontend Applications |

---

## FEATURES

### HR Management
- Employee records with digital twin
- Onboarding workflows with AI assistance
- Document management
- Org chart visualization
- Employee directory with skills graph

### Payroll Processing
- Salary calculation with statutory compliance
- Tax deductions (PF, ESI, TDS, GST)
- Payslip generation
- Direct deposit integration
- Compliance reporting

### Benefits Administration
- Health insurance enrollment
- Wellness programs
- Retirement planning
- Stock options
- Employee discounts (REZ-Merchant)
- Corporate dining (Meal benefits)
- Commuter benefits (KHAIRMOVE)

### Attendance & Leave
- Time tracking with geo-fencing
- Leave requests with AI approval workflow
- Holiday calendar
- Shift scheduling with swap requests
- Attendance regularization

### Performance Management
- OKR tracking (integrated with GoalOS)
- Performance reviews with 360° feedback
- Continuous feedback
- Career development
- Succession planning

---

## API ENDPOINTS

### Core API (4006)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/employees
GET    /api/leave
GET    /api/attendance
GET    /api/shifts
GET    /api/users
GET    /api/departments
```

### AI Intelligence (4135)

```
GET    /health/live
GET    /health/ready
GET    /metrics
GET    /api/v1/insights/cards
POST   /api/v1/copilot/chat
GET    /api/v1/forecasts/workforce
```

### AI Agents (4136)

```
GET    /api/v1/agents
GET    /api/v1/agents/:id
POST   /api/v1/agents/chat
POST   /api/v1/agents/:id/execute
```

### Twin Marketplace (4150)

```
GET    /api/v1/twins
GET    /api/v1/twins/:id
GET    /api/v1/twins/search?q=
POST   /api/v1/twins/:id/subscribe
GET    /api/v1/twins/:id/reviews
```

### HRIS Integration (4030)

```
POST   /api/corporate/hris/connections
GET    /api/corporate/hris/connections/:companyId
POST   /api/corporate/cards/
POST   /api/corporate/gst/einvoice
POST   /api/corporate/travel/
```

---

## RTMN LAYER 5 INTEGRATION

CorpPerks serves as Layer 5 (Workforce) of the RTMN 15-Layer Platform:

| Layer | Integration |
|-------|-------------|
| Layer 1 (Intelligence) | AI Copilot for workforce decisions |
| Layer 2 (Growth) | Employee benefits, meal cards |
| Layer 3 (Commerce) | Payroll, expense management |
| Layer 4 (Financial) | CorpPerks payroll → RABTUL payments |
| Layer 5 (Workforce) | CorpPerks Core ✅ |
| Layer 6 (Legal) | Compliance, policy enforcement |
| Layer 7 (Property) | Staff housing (RisnaEstate) |
| Layer 8 (Health) | Wellness benefits (RisaCare) |
| Layer 9 (Mobility) | Commuter benefits (KHAIRMOVE) |
| Layer 10 (Identity) | Universal employee ID (CorpID) |
| Layer 11 (Memory) | Employee context memory |
| Layer 12 (Twins) | Employee digital twins |
| Layer 13 (Automation) | HR workflow automation |
| Layer 14 (Autonomous) | SUTAR goal decomposition |
| Layer 15 (Consumer) | Employee app (REZ-Consumer) |

---

## INTEGRATIONS

### HRIS Integrations

| Integration | Provider | Features |
|-------------|----------|----------|
| **BambooHR** | BambooHR API | Employee sync, org chart |
| **GreytHR** | GreytHR API | Payroll, attendance |
| **Zoho HR** | Zoho People | Employee management |

### Payment & Compliance

| Integration | Features |
|-------------|----------|
| **Razorpay** | Corporate card management |
| **GST eInvoice** | Indian GST e-invoice generation |
| **TBO Travel** | Hotel, flight booking |

### RTMN Internal

| Service | Features |
|---------|----------|
| **RABTUL** | Auth, Wallet, Payment |
| **CorpID** | Universal identity |
| **REZ-Merchant** | Meal benefits |
| **RisnaEstate** | Staff housing |
| **RisaCare** | Wellness benefits |
| **KHAIRMOVE** | Commuter benefits |

---

## QUICK START

```bash
# Start CorpPerks Backend
cd companies/CorpPerks/backend && npm start

# Start AI Intelligence
cd companies/CorpPerks/corpperks-intelligence && npm start

# Start AI Agents
cd companies/CorpPerks/ai-agents-service && npm start

# Start PeopleOS Frontend
cd companies/CorpPerks/peopleos && npm run dev

# Start TalentAI Frontend
cd companies/CorpPerks/talentai && npm run dev

# Deploy to Render
render blueprint apply render.yaml

# Docker deployment
docker-compose up -d
```

---

## HEALTH CHECKS

```bash
curl http://localhost:4006/health     # Backend
curl http://localhost:4135/health     # AI Intelligence
curl http://localhost:4136/health     # AI Agents
curl http://localhost:4150/health    # Twin Marketplace
curl http://localhost:3001           # PeopleOS (browser)
curl http://localhost:3002            # TalentAI (browser)
```

---

## DOCUMENTATION

- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md) - Full company registry
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features
- [PORT-REGISTRY.md](../../PORT-REGISTRY.md) - Port allocations
- [CORPPERKS-AUDIT.md](../../CORPPERKS-AUDIT.md) - Complete CorpPerks audit

---

## ENVIRONMENT VARIABLES

Copy `.env.example` to `.env` and configure:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/corpperks
DATABASE_URL=postgresql://postgres:password@localhost:5432/corpperks

# Auth
JWT_SECRET=your_jwt_secret

# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Integrations
BAMBOOHR_API_KEY=...
GREYTHR_API_KEY=...
RAZORPAY_KEY_ID=...
```

---

## CorpPerks - THE WORKFORCE PLATFORM FOR RTMN ECOSYSTEM

*Last Updated: June 17, 2026*
