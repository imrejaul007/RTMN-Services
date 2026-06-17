# CorpPerks - Workforce Management Platform

**Last Updated:** June 16, 2026  
**Location:** `companies/CorpPerks/`  
**Status:** ✅ **PRODUCTION READY** - 50+ Services | Full Deployment Infrastructure

---

## Overview

CorpPerks provides the workforce management suite for the RTMN ecosystem. Connected via **Layer 5 (Workforce)** to all 24 Industry OS services. Now with AI Agents, Digital Twins, and Full Frontend Applications.

---

## Core Services (17 Backend + NEW Frontends)

### Backend Services

| Service | Port | Status |
|---------|------|--------|
| restopapa (NestJS) | 8000 | ✅ |
| rez-corporate-service | 4030 | ✅ |
| api-gateway | 4006 | ✅ |
| corpperks-intelligence | 4135 | ✅ |
| role-ai-agents | 4130 | ✅ |
| meeting-service | 4013 | ✅ |
| document-service | 4014 | ✅ |
| payroll-service | 4007 | ✅ |
| shift-service | 4010 | ✅ |
| analytics-service | 4018 | ✅ |
| compensation-service | 4019 | ✅ |
| push-service | 4016 | ✅ |
| whatsapp-service | 4017 | ✅ |
| projectos-service | 4020 | ✅ |

### NEW: AI Agents Service (4136) ✅

| Agent | Capabilities |
|-------|--------------|
| HR Assistant Agent | Policy queries, leave requests, benefits info |
| Recruiter Agent | Job postings, candidate screening, interview scheduling |
| Onboarding Agent | New hire tasks, document collection, training |
| Compliance Agent | Policy violations, audits, risk assessment |

### NEW: Frontend Applications ✅

| App | Port | Features |
|-----|------|----------|
| **PeopleOS** | 3001 | Dashboard, Employees, Leave, Attendance, Payroll, AI Chat |
| **TalentAI** | 3002 | Jobs, Candidates, Recruitment Pipeline |
| **Insight Campus** | 3003 | HR Analytics, Business Intelligence |

---

## Deployment Infrastructure ✅

| File | Purpose |
|------|---------|
| `render.yaml` | Full Render deployment blueprint |
| `docker-compose.yml` | Docker containers |
| `.env.example` | Environment variables template |
| `.github/workflows/deploy.yml` | CI/CD pipeline |

---

## Database Models

| Database | Schema | Models |
|----------|--------|--------|
| PostgreSQL | `restopapa/backend/prisma/schema.prisma` | 60+ models |
| MongoDB | `models/mongodb-schemas.js` | 14 models |

---

*Last Updated: June 16, 2026*
