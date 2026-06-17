# CorpPerks - Workforce Management Platform

**Version:** 1.3.0  
**Last Updated:** June 17, 2026  
**Location:** `companies/CorpPerks/`  
**Status:** ✅ **PRODUCTION READY** - 50+ Services | AI Agents | 3 Frontends

---

## Overview

CorpPerks provides the workforce management suite for the RTMN ecosystem. Connected via **Layer 5 (Workforce)** to all 24 Industry OS services. Now with AI Agents, Digital Twins, and Full Frontend Applications.

---

## CORE SERVICES (17 Backend + 3 Frontends)

### Backend Services

| Service | Port | Lines | Status |
|---------|------|-------|--------|
| restopapa (NestJS) | 8000 | 80 files | ✅ |
| rez-corporate-service | 4030 | 449 | ✅ |
| api-gateway | 4006 | 376 | ✅ |
| corpperks-intelligence | 4135 | 365 | ✅ |
| corpID-profile-bridge | 4101 | 303 | ✅ |
| role-ai-agents | 4130 | 302 | ✅ |
| meeting-service | 4013 | 207 | ✅ |
| document-service | 4014 | 219 | ✅ |
| video-service | 4015 | 209 | ✅ |
| shift-service | 4010 | 98 | ✅ |
| payroll-service | 4007 | 95 | ✅ |
| push-service | 4016 | 131 | ✅ |
| whatsapp-service | 4017 | 103 | ✅ |
| analytics-service | 4018 | 105 | ✅ |
| compensation-service | 4019 | 111 | ✅ |
| projectos-service | 4020 | 119 | ✅ |
| REZ-merchant-corpperks-bridge | 4100 | 130 | ✅ |
| backend | 4006 | 90 | ✅ |

---

## AI SERVICES ✅

### AI Agents Service (4136)

| Agent | Capabilities |
|-------|--------------|
| **HR Assistant Agent** | Policy queries, leave requests, benefits info, payroll help |
| **Recruiter Agent** | Job postings, candidate screening, interview scheduling |
| **Onboarding Agent** | New hire tasks, document collection, training coordination |
| **Compliance Agent** | Policy violations, audits, risk assessment |

### CorpPerks Intelligence (4135)

| Feature | Description |
|---------|-------------|
| AI Copilot | Natural language workforce queries |
| Decision Cards | AI-powered decision recommendations |
| Health Score | Organizational health monitoring |
| Anomaly Detection | Workforce anomaly detection |
| Workforce Forecasting | Predictive workforce analytics |

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

## DEPLOYMENT INFRASTRUCTURE ✅

| File | Purpose |
|------|---------|
| `render.yaml` | Full Render deployment blueprint (15 services) |
| `docker-compose.yml` | Docker containers |
| `.env.example` | Environment variables template |
| `.github/workflows/deploy.yml` | CI/CD pipeline |

### Dockerfiles

| Service | File |
|---------|------|
| Backend | `backend/Dockerfile` |
| Intelligence | `corpperks-intelligence/Dockerfile` |
| PeopleOS | `peopleos/Dockerfile` |
| TalentAI | `talentai/Dockerfile` |

---

## DATABASE MODELS

### PostgreSQL (Prisma)

| Schema File | Models |
|------------|--------|
| `restopapa/backend/prisma/schema.prisma` | 60+ models |

Models include: User, Employee, Restaurant, Department, Shift, Attendance, LeaveRequest, Order, Product, Vendor, Job, Discussion, Meeting, Document, Notification

### MongoDB (Mongoose)

| Schema File | Models |
|------------|--------|
| `models/mongodb-schemas.js` | 14 models |

Models include: User, Company, Employee, Attendance, LeaveBalance, LeaveRequest, Shift, ShiftAssignment, Payroll, PerformanceReview, OKR, Document, Expense, Notification

---

## FEATURES LIST

### HR Management
- Employee records with digital twin
- Onboarding workflows with AI assistance
- Document management
- Org chart visualization
- Employee directory with skills graph
- Performance reviews (360°)
- Succession planning

### Payroll Processing
- Salary calculation with statutory compliance
- Tax deductions (PF, ESI, TDS, GST)
- Payslip generation
- Direct deposit integration
- Compliance reporting
- Reimbursement processing
- Salary advances

### Benefits Administration
- Health insurance enrollment
- Wellness programs
- Retirement planning
- Stock options management
- Employee discounts (REZ-Merchant)
- Corporate dining (Meal benefits)
- Commuter benefits (KHAIRMOVE)

### Attendance & Leave
- Time tracking with geo-fencing
- Leave requests with AI approval workflow
- Holiday calendar
- Shift scheduling with swap requests
- Attendance regularization
- Overtime management
- Work from home tracking

### Performance Management
- OKR tracking (integrated with GoalOS)
- Performance reviews with 360° feedback
- Continuous feedback system
- Career development planning
- Succession planning
- Goal decomposition

### Recruitment & Talent
- Job posting management
- Candidate screening (AI-powered)
- Interview scheduling
- Offer letter generation
- Background verification
- Talent pool management

### Communication & Collaboration
- Meeting scheduling
- 1-on-1 meetings
- Team announcements
- Document sharing
- Video conferencing
- Push notifications
- WhatsApp notifications

### Analytics & Reporting
- HR analytics dashboard
- Employee trends
- Attendance reports
- Payroll reports
- Custom report builder
- AI-powered insights

---

## INTEGRATIONS

### HRIS Integrations

| Integration | Features |
|-------------|----------|
| BambooHR | Employee sync, org chart |
| GreytHR | Payroll, attendance |
| Zoho HR | Employee management |

### Payment & Compliance

| Integration | Features |
|-------------|----------|
| Razorpay | Corporate card management |
| GST eInvoice | Indian GST e-invoice generation |
| TBO Travel | Hotel, flight booking |

### RTMN Internal

| Service | Features |
|---------|----------|
| RABTUL | Auth, Wallet, Payment |
| CorpID | Universal identity |
| REZ-Merchant | Meal benefits |
| RisnaEstate | Staff housing |
| RisaCare | Wellness benefits |
| KHAIRMOVE | Commuter benefits |

---

## RTMN LAYER 5 (WORKFORCE)

CorpPerks serves as Layer 5 of the RTMN 15-Layer Platform:

```
Layer 1 (Intelligence)   → AI Copilot
Layer 2 (Growth)        → Employee Benefits
Layer 3 (Commerce)      → Payroll Integration
Layer 4 (Financial)     → Expense Management
Layer 5 (Workforce)     → CorpPerks Core ✅
Layer 6 (Legal)         → Compliance
Layer 7 (Property)      → Staff Housing
Layer 8 (Health)        → Wellness Benefits
Layer 9 (Mobility)      → Commuter Benefits
Layer 10 (Identity)       → CorpID Integration
Layer 11 (Memory)         → Employee Memory
Layer 12 (Twins)         → Employee Twins
Layer 13 (Automation)    → HR Workflows
Layer 14 (Autonomous)     → SUTAR Goals
Layer 15 (Consumer)        → Employee App
```

---

## QUICK START

```bash
# Deploy to Render
render blueprint apply render.yaml

# Docker deployment
docker-compose up -d

# Frontend (Vercel)
cd peopleos && vercel --prod
cd talentai && vercel --prod
```

---

## HEALTH CHECKS

```bash
curl http://localhost:4006/health     # Backend
curl http://localhost:4135/health   # AI Intelligence
curl http://localhost:4136/health  # AI Agents
curl http://localhost:4150/health  # Twin Marketplace
```

---

*Last Updated: June 17, 2026*
