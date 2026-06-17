# CorpPerks - HR, Payroll & Benefits Platform

**Version:** 1.2.0  
**Last Updated:** June 16, 2026  
**Status:** ✅ **PRODUCTION READY** - 50+ Services | AI Agents | 3 Frontends

---

## Overview

CorpPerks is the comprehensive HR, payroll, and employee benefits platform of the RTMN ecosystem. It provides workforce management, payroll processing, employee perks, and AI-powered assistants connected via Layer 5 (Workforce) to all 24 Industry OS services.

---

## Services (50+ Services)

### Core Backend Services

| Service | Port | Status |
|---------|------|--------|
| restopapa (NestJS) | 8000 | ✅ Full app (auth, employees, restaurants, payments) |
| rez-corporate-service | 4030 | ✅ HRIS integrations (BambooHR, GreytHR, Zoho) |
| api-gateway | 4006 | ✅ Proxy routing, rate limiting, auth |
| corpperks-intelligence | 4135 | ✅ AI copilot, decision cards, forecasting |
| role-ai-agents | 4130 | ✅ HR, Recruiter, Trainer AI agents |
| meeting-service | 4013 | ✅ Meetings, 1-on-1s, calendar sync |
| document-service | 4014 | ✅ Document management |
| payroll-service | 4007 | ✅ Payroll processing |
| shift-service | 4010 | ✅ Shift scheduling |
| analytics-service | 4018 | ✅ HR analytics |
| compensation-service | 4019 | ✅ Salary, benefits, equity |
| push-service | 4016 | ✅ Push notifications |
| whatsapp-service | 4017 | ✅ WhatsApp notifications |

### AI Agents Service (4136) ✅

| Agent | Capabilities |
|-------|--------------|
| **HR Assistant Agent** | Policy queries, leave requests, benefits info |
| **Recruiter Agent** | Job postings, candidate screening, interview scheduling |
| **Onboarding Agent** | New hire tasks, document collection, training |
| **Compliance Agent** | Policy violations, audits, risk assessment |

### Professional Twin Marketplace (4150) ✅

| Twin Type | Features |
|-----------|----------|
| Employee Twin | Skills, experience, certifications |
| Manager Twin | Team management, performance reviews |
| Recruiter Twin | Candidate pipeline, sourcing |
| Trainer Twin | Learning paths, skill assessments |

### Frontend Applications ✅

| App | Port | Features |
|-----|------|----------|
| **PeopleOS** | 3001 | Dashboard, Employees, Leave, Attendance, Payroll, AI Chat |
| **TalentAI** | 3002 | Jobs, Candidates, Recruitment Pipeline |
| **Insight Campus** | 3003 | HR Analytics, Business Intelligence |

---

## Port Range

**4006-4020** - CorpPerks Core Services  
**4135-4136** - AI Services  
**4150** - Twin Marketplace  
**3001-3003** - Frontend Applications

---

## Features

### HR Management
- Employee records with digital twin
- Onboarding workflows with AI assistance
- Document management
- Org chart visualization

### Payroll Processing
- Salary calculation with statutory compliance
- Tax deductions (PF, ESI, TDS, GST)
- Payslip generation
- Direct deposit integration

### Benefits Administration
- Health insurance enrollment
- Wellness programs
- Employee discounts (REZ-Merchant)
- Corporate dining (Meal benefits)

### AI-Powered Features
- AI Copilot for HR queries
- Decision cards for workforce decisions
- Organizational health score
- Workforce forecasting

---

## Quick Start

```bash
# Deploy to Render
render blueprint apply render.yaml

# Docker deployment
docker-compose up -d
```

---

## Documentation

- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md) - Full company registry
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features
- [CORPPERKS-AUDIT.md](../../CORPPERKS-AUDIT.md) - Complete audit

---

## RTMN Layer 5 Integration

CorpPerks serves as Layer 5 (Workforce) of the RTMN 15-Layer Platform.

*Last Updated: June 16, 2026*
