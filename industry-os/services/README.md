# RTMN Workforce OS

**Version:** 2.0.0  
**Date:** June 17, 2026  
**Status:** 🚀 **DEPLOYMENT READY**

---

## Overview

RTMN Workforce OS is the world's first AI-native Workforce Operating System that combines traditional HRMS capabilities with advanced AI intelligence to automate and augment human resources operations.

### Vision

> *"Every company deserves a world-class HR department, even if they don't have one."*

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RTMN WORKFORCE OS v2.0                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    4-LAYER INTELLIGENCE ARCHITECTURE               │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │ EXECUTIVE  │  │ AUTONOMOUS  │  │ INTELLIGENCE│               │   │
│  │  │   LAYER    │  │   LAYER    │  │   LAYER     │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    OPERATIONS LAYER                          │   │   │
│  │  │  Employees │ Leave │ Attendance │ Payroll │ Benefits │ ...  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Services

| Port | Service | Description | Status |
|------|---------|-------------|--------|
| **5065** | Workforce OS Core | Unified HR API | ✅ Running |
| **5066** | Talent OS | Recruitment ATS | ✅ Running |
| **5068** | Learning OS | LMS & Skills | ✅ Running |
| **5072** | Organization OS | Org Design | ✅ Running |
| **5073** | Workforce Intelligence | AI Insights | ✅ Running |

---

## Quick Start

### Start All Services

```bash
cd industry-os/services
./start-workforce-os.sh start
```

### Test Services

```bash
./start-workforce-os.sh test
```

### Health Checks

```bash
curl http://localhost:5065/health
curl http://localhost:5066/health
curl http://localhost:5068/health
curl http://localhost:5072/health
curl http://localhost:5073/health
```

---

## API Reference

### Workforce OS Core (5065)

**Employees:**
```bash
GET  /api/employees              # List employees
GET  /api/employees/:id          # Get employee
POST /api/employees              # Create employee
```

**Leave:**
```bash
GET  /api/leave/balance/:id     # Leave balance
POST /api/leave/request         # Request leave
GET  /api/leave/requests        # List requests
```

**Attendance:**
```bash
POST /api/attendance/checkin     # Check in
POST /api/attendance/checkout    # Check out
```

**Payroll:**
```bash
GET  /api/payroll/records       # Payslips
POST /api/payroll/calculate     # Calculate
```

**AI Copilot:**
```bash
POST /api/copilot/chat          # Chat with AI
```

### Talent OS (5066)

**Jobs:**
```bash
GET  /api/jobs                  # List jobs
POST /api/jobs                  # Create job
POST /api/jobs/:id/publish      # Publish
```

**Candidates:**
```bash
GET  /api/candidates            # List candidates
POST /api/candidates             # Add candidate
POST /api/candidates/:id/move   # Move stage
POST /api/candidates/:id/score  # AI score
```

**Pipeline:**
```bash
GET  /api/pipeline/kanban       # Kanban view
GET  /api/pipeline/stats        # Analytics
```

### Learning OS (5068)

**Courses:**
```bash
GET  /api/courses              # List courses
POST /api/courses/:id/enroll   # Enroll
```

**Skills:**
```bash
GET  /api/skills/graph         # Skills graph
GET  /api/skills/:employeeId    # Employee skills
```

### Organization OS (5072)

**Org Chart:**
```bash
GET  /api/org/chart            # Org chart
GET  /api/org/health            # Org health
```

**Headcount:**
```bash
GET  /api/headcount            # Current HC
GET  /api/headcount/projections # Forecast
```

### Workforce Intelligence (5073)

**Analytics:**
```bash
GET  /api/analytics/overview    # CEO dashboard
GET  /api/analytics/hr-dashboard # HR dashboard
```

**Predictions:**
```bash
GET  /api/predictions/attrition     # Attrition
GET  /api/predictions/flight-risk  # Flight risk
GET  /api/predictions/burnout       # Burnout
```

**Intelligence:**
```bash
GET  /api/intelligence/sentiment   # Sentiment
GET  /api/intelligence/skills      # Skills graph
GET  /api/insights/cards          # AI insights
```

---

## CorpPerks Integration

### PeopleOS Frontend

PeopleOS (Port 3001) connects to Workforce OS:

```javascript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5065';
```

Update `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5065
```

### TalentAI Frontend

TalentAI (Port 3002) connects to Talent OS:

```javascript
// lib/api.ts
const TALENT_API_URL = process.env.NEXT_PUBLIC_TALENT_API_URL || 'http://localhost:5066';
```

---

## Deployment

### Render

```bash
# Create blueprint
render blueprint create --spec render.yaml

# Apply
render blueprint apply --spec render.yaml
```

### Vercel (Frontend)

```bash
# PeopleOS
cd companies/CorpPerks/peopleos
vercel --prod

# TalentAI
cd companies/CorpPerks/talentai
vercel --prod
```

---

## Features

### Core HR (15 Modules)
- [x] Employee Records
- [x] Leave Management
- [x] Attendance & Shifts
- [x] Payroll Processing
- [x] Benefits Administration
- [x] Recruitment & ATS
- [x] Training & LMS
- [x] Performance Management
- [x] Expenses
- [x] Documents
- [x] Disciplinary
- [x] Grievance
- [x] Exit Management
- [x] Organization
- [x] AI Copilot

### AI Agents (25+)
- [x] HR Assistant Agent
- [x] Recruiter Agent
- [x] Sourcer Agent
- [x] Interviewer Agent
- [x] Payroll Officer
- [x] Leave Officer
- [x] Attendance Officer
- [x] Compliance Officer
- [x] Benefits Advisor
- [x] Expense Auditor
- [x] Employee Assistant
- [x] Manager Coach
- [x] Career Coach
- [x] Learning Coach
- [x] Performance Coach
- [x] Wellness Coach
- [x] Culture Officer
- [x] Employee Success Manager
- [x] Internal Mobility Manager
- [x] Visa Officer
- [ ] HR Director Agent
- [ ] Organization Designer
- [ ] Workforce Planner
- [ ] Talent Intelligence

### Digital Twins (20)
- [x] Employee Twin
- [x] Payroll Twin
- [x] Leave Twin
- [x] Benefits Twin
- [x] Position Twin
- [x] Candidate Twin
- [x] Training Twin
- [x] Performance Twin
- [ ] Manager Twin
- [ ] Department Twin
- [ ] Contractor Twin
- [ ] Culture Twin
- [ ] Knowledge Twin
- [ ] Workforce Twin
- [ ] Organization Twin
- [ ] Skills Twin

### Intelligence Features
- [x] CEO Dashboard
- [x] HR Dashboard
- [x] Org Health Score
- [x] Attrition Prediction
- [x] Flight Risk Detection
- [x] Burnout Detection
- [x] Sentiment Analysis
- [x] Culture Intelligence
- [x] Skills Graph
- [x] AI Insights Cards
- [ ] Workforce Cost Simulator
- [ ] Organization Design AI

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Frontend | Next.js 14 |
| Database | MongoDB (production) |
| Cache | Redis (production) |
| AI | OpenAI, Anthropic |
| Auth | JWT |
| Deploy | Render, Vercel |

---

## Environment Variables

### Workforce OS

```env
PORT=5065
MONGODB_URI=mongodb://localhost:27017/rtmn-workforce
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3001
```

### Talent OS

```env
PORT=5066
WORKFORCE_OS_URL=http://localhost:5065
```

### Learning OS

```env
PORT=5068
WORKFORCE_OS_URL=http://localhost:5065
```

### Organization OS

```env
PORT=5072
WORKFORCE_OS_URL=http://localhost:5065
```

### Workforce Intelligence

```env
PORT=5073
WORKFORCE_OS_URL=http://localhost:5065
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Contributing

1. Follow the service template structure
2. Add CLAUDE.md to each service
3. Include health check endpoint (`/health`)
4. Update PORT-REGISTRY.md
5. Add to render.yaml

---

## License

MIT License - RTMN Technologies

---

*Last Updated: June 17, 2026*
