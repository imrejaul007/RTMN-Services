# HROS (Human Resources Operating System) - Complete Upgrade Plan

**Version:** 1.0  
**Date:** July 1, 2026  
**Status:** PLANNED

---

## Executive Summary

### Target: World-Class HROS
```
Workday + SAP SuccessFactors + Rippling + Darwinbox + Deel + Lattice + CultureAmp + Eightfold + BetterUp + Visier
=
HROS (Human Resources Operating System)

Differentiator: Employee Twins + Skills Graph + MemoryOS + AI Workforce
```

### Current State vs Target

| Component | Current | Target | Gap |
|-----------|----------|---------|-----|
| **Industry OS (Workforce)** | ✅ Basic | 14 Platforms | Build 13 more |
| **CorpPerks Backend** | ✅ 8 services | 15 platforms | Build 7 more |
| **Employee Twins | ❌ Not built | 10 twins | Build all |
| **AI Workers | ⚠️ 2 defined | 15 workers | Add 13 more |
| **Skills Graph | ❌ Basic | Full graph | Expand |
| **Screen parity | ❌ 0 screens | 220 screens | Build all |
| **Workflows | ⚠️ Basic | 1,000+ | Build all |
| **Database schema | ⚠️ Basic | Enterprise | Expand |

---

## Part 1: Current Assets Inventory

### 1.1 CorpPerks Backend Services (8 main + support)

| Service | Port | Modules | Status |
|---------|------|---------|---------|
| `backend` | 4006 | Employees, Departments, Leave, Attendance | ✅ Production |
| `payroll-service` | 4738 | Indian Payroll (PF/ESI/TDS/Gratuity/LWF) | ✅ Production |
| `meeting-service` | 4728 | 1:1 Meetings, Calendar | ✅ Production |
| `performance-service` | 4729 | Reviews, Goals, Feedback | ✅ Production |
| `okr-service` | 4749 | OKR Tracking | ✅ Production |
| `onboarding-service` | 4732 | Employee Onboarding | ✅ Production |
| `exit-service` | 4733 | Offboarding, Clearance | ✅ Production |
| `lms-service` | 4734 | Courses, Enrollments, Certificates | ✅ Production |
| `shift-service` | 4739 | Shift Scheduling | ✅ Production |
| `compensation-service` | 4740 | Salary Bands, Increments, Bonus | ✅ Production |
| `document-service` | 4741 | Templates, E-signatures | ✅ Production |
| `corp-crm-service` | 4742 | Candidate CRM, Nurturing | ✅ Production |
| `talent-acquisition-service` | 4743 | Job Openings, Applications | ✅ Production |
| `corp-support-service` | 4744 | Tickets, Helpdesk | ✅ Production |
| `corp-billing-service` | 4745 | Subscription Billing | ✅ Production |
| `corp-workforce-intelligence` | 4710 | Workforce Analytics | ✅ Production |

### 1.2 Industry OS Workforce OS

| Module | Status | Details |
|--------|---------|---------|
| Employee Management | ✅ Built | Basic CRUD, profiles |
| Department Management | ✅ Built | Structure, reporting |
| Position Management | ✅ Built | Roles, hierarchy |
| Attendance | ✅ Built | Clock in/out, tracking |
| Leave Management | ✅ Built | Approvals, policies |
| Payroll | ✅ Built | Processing, payslips |
| Performance | ✅ Built | Reviews, ratings |
| Learning | ✅ Built | Courses, certifications |
| Recruitment | ✅ Built | Jobs, applications |
| Reports | ✅ Built | Basic analytics |

### 1.3 AI Workers (Currently 2 defined)

| Worker | Department | Status |
|--------|------------|--------|
| AI Recruiter | HR | ⚠️ Defined |
| AI Payroll Manager | HR | ⚠️ Defined |
| (Need 13 more) | HR | ❌ Missing |

### 1.4 Missing Critical Components

| Component | Priority | Days to Build |
|-----------|----------|---------------|
| Employee Twins | P0 | 20 days |
| Skills Graph | P0 | 15 days |
| Performance Twins | P0 | 10 days |
| Workforce Intelligence | P0 | 15 days |
| 220 Screen Inventory | P1 | 60 days |
| 1,000+ Workflows | P1 | 90 days |
| 15 AI Workers | P1 | 30 days |
| Database Schema | P1 | 40 days |

---

## Part 2: HROS Target Architecture

### 14-Platform Model

```
HROS
├── 1. Core HR Platform
├── 2. Talent Acquisition Platform
├── 3. Onboarding Platform
├── 4. Performance Management Platform
├── 5. Learning & Development Platform
├── 6. Workforce Management Platform
├── 7. Payroll & Compensation Platform
├── 8. Benefits Platform
├── 9. Employee Experience Platform
├── 10. Organization & Leadership Platform
├── 11. Global Workforce Platform
├── 12. People Intelligence Platform
├── 13. Employee Twin Platform (MOAT)
└── 14. AI HR Workforce
```

---

## Part 3: Gap Analysis

### Platform-by-Platform Current vs Target

| Platform | Current | Target | Gap |
|----------|---------|--------|-----|
| **1. Core HR** | 60% | 100% | Add 10+ twins, events, APIs |
| **2. Talent Acquisition** | 70% | 100% | AI agents, CRM expansion |
| **3. Onboarding** | 50% | 100% | Digital twins, automations |
| **4. Performance** | 40% | 100% | 360 reviews, calibration |
| **5. Learning** | 50% | 100% | AI coach, paths |
| **6. Workforce Mgmt** | 70% | 100% | AI scheduling |
| **7. Payroll** | 80% | 100% | Multi-country |
| **8. Benefits** | 30% | 100% | Full benefits marketplace |
| **9. Experience** | 20% | 100% | Pulse surveys, burnout detection |
| **10. Organization** | 40% | 100% | Org simulation |
| **11. Global Workforce** | 10% | 100% | EOR, contractors |
| **12. People Intelligence** | 30% | 100% | Predictive analytics |
| **13. Employee Twins** | 0% | 100% | Build all twins |
| **14. AI Workforce** | 10% | 100% | Add 13 workers |

---

## Part 4: Employee Twin Platform (MOAT)

### Target: 10 Employee Twins

```
Employee Twin Platform
├── Identity Twin
│   └── Personal info, government IDs, documents
├── Skill Twin
│   └── Skills, certifications, assessments
├── Career Twin
│   └── Aspirations, mobility, succession
├── Learning Twin
│   └── Courses, progress, recommendations
├── Performance Twin
│   └── Reviews, goals, ratings
├── Relationship Twin
│   └── Managers, peers, mentors
├── Compensation Twin
│   └── Salary, benefits, equity
├── Wellness Twin
│   └── Health, burnout, leave patterns
├── Sentiment Twin
│   └── Pulse surveys, feedback
└── Productivity Twin
    └── Work patterns, collaboration
```

### Twin Data Schema

```typescript
// Skill Twin Example
interface SkillTwin {
  employeeId: string;
  
  skills: {
    technical: Skill[];
    soft: Skill[];
    leadership: Skill[];
    domain: Skill[];
  };
  
  certifications: {
    name: string;
    issuedBy: string;
    expiryDate?: Date;
    verified: boolean;
  }[];
  
  assessments: {
    skill: string;
    score: number;
    date: Date;
  }[];
  
  growth: {
    trajectory: 'accelerating' | 'stable' | 'declining';
    nextRoles: string[];
    recommendedLearning: string[];
  };
  
  lastUpdated: Date;
  confidence: number;
}
```

---

## Part 5: AI Workforce Target (15 Workers)

### Current State: 2 Workers

| Worker | Current | Target |
|--------|----------|---------|
| AI Recruiter | Basic | Advanced |
| AI Payroll Manager | Basic | Advanced |

### Target AI Workers (15)

| # | AI Worker | Responsibilities | Priority |
|---|---------|-----------------|----------|
| 1 | Recruiter AI | Source, rank, schedule, offer | P0 |
| 2 | Payroll AI | Process, audit, anomaly | P0 |
| 3 | HRBP AI | Employee relations, policies | P0 |
| 4 | Learning Coach AI | Recommend courses, paths | P1 |
| 5 | Career Coach AI | Career planning, mobility | P1 |
| 6 | Performance Coach AI | Reviews, calibration | P1 |
| 7 | Compensation Advisor AI | Bands, benchmarking | P1 |
| 8 | Benefits Advisor AI | Plan selection | P2 |
| 9 | Workforce Planner AI | Headcount, forecasting | P1 |
| 10 | Organization Designer AI | Restructuring, simulation | P2 |
| 11 | Compliance AI | Policies, audits | P0 |
| 12 | Employee Support AI | Helpdesk, Q&A | P1 |
| 13 | Interview AI | Scorecards, scheduling | P0 |
| 14 | Retention AI | Risk detection, wins | P1 |
| 15 | Culture AI | Sentiment, engagement | P2 |

---

## Part 6: Screen Inventory (220 Screens)

### Platform Breakdown

| Platform | Screens | Priority |
|----------|---------|----------|
| Core HR | 25 | P0 |
| Talent Acquisition | 30 | P0 |
| Onboarding | 15 | P1 |
| Performance | 20 | P1 |
| Learning | 20 | P1 |
| Workforce Mgmt | 20 | P1 |
| Payroll & Benefits | 25 | P1 |
| Employee Experience | 15 | P2 |
| Organization | 15 | P2 |
| Global Workforce | 10 | P2 |
| People Intelligence | 15 | P1 |
| Employee Twins | 10 | P0 |
| **Total** | **220** | |

---

## Part 7: Workflow Catalog Target (1,000+)

### Category Breakdown

| Category | Workflows | Priority |
|----------|-----------|----------|
| Joiner | 100 | P0 |
| Employee Lifecycle | 150 | P0 |
| Performance | 100 | P1 |
| Learning | 80 | P1 |
| Payroll | 120 | P0 |
| Leave & Attendance | 80 | P1 |
| Offboarding | 70 | P1 |
| Compliance | 50 | P0 |
| Recognition | 60 | P2 |
| Global Workforce | 50 | P2 |
| Organization | 70 | P2 |
| Engagement | 80 | P2 |
| **Total** | **940+** | |

---

## Part 8: Phase-Wise Build Plan

### Phase 1: Foundation (Weeks 1-4)

| # | Deliverable | Days | Owner |
|---|-------------|------|-------|
| 1.1 | Employee Twin Platform schema | 10 | Backend |
| 1.2 | Skills Graph expansion | 8 | Backend |
| 1.3 | Event Bus for HROS | 5 | Backend |
| 1.4 | AI Worker: HRBP AI | 5 | AI Team |
| 1.5 | AI Worker: Compliance AI | 5 | AI Team |
| 1.6 | Integration with CorpPerks backend | 5 | DevOps |

**Deliverable:** Employee Twin Platform ready

### Phase 2: Core HR Expansion (Weeks 5-8)

| # | Deliverable | Days | Priority |
|---|-------------|------|----------|
| 2.1 | Employee Profile screens (25) | 10 | P0 |
| 2.2 | Organization Chart screens | 5 | P0 |
| 2.3 | Document Management | 5 | P1 |
| 2.4 | Self-Service Portal | 5 | P0 |
| 2.5 | AI Worker: Interview AI | 5 | P0 |
| 2.6 | Workflow Builder | 5 | P1 |

**Deliverable:** Core HR Platform 80% complete

### Phase 3: Talent Acquisition (Weeks 9-12)

| # | Deliverable | Days | Priority |
|---|-------------|------|----------|
| 3.1 | ATS expansion (30 screens) | 12 | P0 |
| 3.2 | Candidate CRM | 5 | P0 |
| 3.3 | Interview scheduling | 5 | P0 |
| 3.4 | AI Recruiter expansion | 5 | P0 |
| 3.5 | Background verification | 3 | P1 |
| 3.6 | Offer management | 5 | P1 |

**Deliverable:** Talent Acquisition Platform complete

### Phase 4: Onboarding & Performance (Weeks 13-16)

| # | Deliverable | Days | Priority |
|---|-------------|------|----------|
| 4.1 | Onboarding portal (15 screens) | 8 | P0 |
| 4.2 | Preboarding workflows | 5 | P0 |
| 4.3 | Performance 360 reviews | 5 | P1 |
| 4.4 | Goals & OKRs expansion | 5 | P0 |
| 4.5 | Calibration workflows | 4 | P1 |
| 4.6 | Succession planning | 4 | P1 |

**Deliverable:** Onboarding + Performance Platform complete

### Phase 5: Learning & Workforce (Weeks 17-20)

| # | Deliverable | Days | Priority |
|---|-------------|------|----------|
| 5.1 | LMS expansion (20 screens) | 8 | P1 |
| 5.2 | AI Learning Coach | 5 | P1 |
| 5.3 | Shift scheduling AI | 5 | P0 |
| 5.4 | Attendance automation | 4 | P0 |
| 5.5 | Leave management AI | 4 | P1 |
| 5.6 | Capacity planning | 4 | P1 |

**Deliverable:** Learning + Workforce Platform complete

### Phase 6: Payroll & Benefits (Weeks 21-24)

| # | Deliverable | Days | Priority |
|---|-------------|------|----------|
| 6.1 | Multi-country payroll | 8 | P0 |
| 6.2 | Benefits marketplace | 5 | P1 |
| 6.3 | AI Compensation Advisor | 5 | P1 |
| 6.4 | Payroll automation (120 workflows) | 8 | P0 |
| 6.5 | Global payroll connectors | 5 | P1 |

**Deliverable:** Payroll Platform enterprise-grade

### Phase 7: Experience & Intelligence (Weeks 25-28)

| # | Deliverable | Days | Priority |
|---|-------------|------|----------|
| 7.1 | Pulse surveys | 5 | P1 |
| 7.2 | Burnout detection | 5 | P1 |
| 7.3 | Recognition workflows | 5 | P2 |
| 7.4 | AI Retention Advisor | 5 | P1 |
| 7.5 | People Analytics dashboards | 5 | P1 |
| 7.6 | Organization simulation | 5 | P2 |

**Deliverable:** Experience Platform + Intelligence ready

### Phase 8: Global & AI Workforce (Weeks 29-32)

| # | Deliverable | Days | Priority |
|---|-------------|------|----------|
| 8.1 | EOR workflows | 8 | P2 |
| 8.2 | Contractor management | 5 | P2 |
| 8.3 | AI Culture Agent | 5 | P2 |
| 8.4 | AI Support Agent | 5 | P1 |
| 8.5 | Global workforce analytics | 4 | P2 |
| 8.6 | Integration testing | 5 | P0 |

**Deliverable:** Global Workforce Platform + Full AI Workforce

---

## Part 9: Database Schema Target

### Core Tables (100+)

```sql
-- HROS Core Schema
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  employee_number VARCHAR(20) UNIQUE,
  personal_info JSONB,
  employment_info JSONB,
  status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE employee_twins (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees,
  twin_type VARCHAR(50),
  data JSONB,
  confidence FLOAT,
  last_updated TIMESTAMP
);

CREATE TABLE skills (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees,
  skill_name VARCHAR(100),
  proficiency_level INT,
  verified BOOLEAN,
  verified_by UUID,
  verified_at TIMESTAMP
);

CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees,
  reviewer_id UUID,
  period VARCHAR(20),
  ratings JSONB,
  goals JSONB,
  status VARCHAR(20)
);

CREATE TABLE learning_enrollments (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees,
  course_id UUID,
  progress INT,
  status VARCHAR(20),
  completed_at TIMESTAMP
);

-- Skills Graph
CREATE TABLE skill_graph (
  id UUID PRIMARY KEY,
  skill_name VARCHAR(100),
  category VARCHAR(50),
  related_skills UUID[],
  growth_demand JSONB
);

-- Events
CREATE TABLE hros_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100),
  employee_id UUID,
  payload JSONB,
  emitted_at TIMESTAMP
);
```

---

## Part 10: API Contracts

```typescript
// HROS API Domains
const API_DOMAINS = {
  '/api/hr/employees': 'Core HR',
  '/api/hr/organizations': 'Org Management',
  '/api/hr/documents': 'Documents',
  '/api/hr/workflows': 'Workflows',
  '/api/recruitment': 'Talent Acquisition',
  '/api/onboarding': 'Onboarding',
  '/api/performance': 'Performance',
  '/api/learning': 'Learning',
  '/api/workforce': 'Workforce Mgmt',
  '/api/payroll': 'Payroll',
  '/api/benefits': 'Benefits',
  '/api/experience': 'Employee Experience',
  '/api/analytics': 'People Intelligence',
  '/api/twins': 'Employee Twins',
  '/api/agents': 'AI Workforce',
};
```

---

## Part 11: Integration Points

### With CorpPerks Backend

```
HROS
├── /api/employees → corpperks-backend:4006
├── /api/payroll → payroll-service:4738
├── /api/meetings → meeting-service:4728
├── /api/performance → performance-service:4729
├── /api/okrs → okr-service:4749
├── /api/onboarding → onboarding-service:4732
├── /api/exit → exit-service:4733
├── /api/learning → lms-service:4734
├── /api/shifts → shift-service:4739
├── /api/compensation → compensation-service:4740
└── /api/documents → document-service:4741
```

### Cross-Department OS

```
HROS ↔ FinanceOS
  Promotion → Salary update
  Termination → Final payroll

HROS ↔ OperationsOS
  Headcount → Capacity planning
  Workforce → Shift scheduling

HROS ↔ LegalOS
  Contracts → Compliance checks
  Policies → Policy updates

HROS ↔ CorpID
  Identity → Universal identity
  Sessions → Auth
```

---

## Part 12: Success Metrics

| Metric | Target |
|--------|---------|
| Employee Twins | 10/10 |
| AI Workers | 15/15 |
| Screen Coverage | 220/220 |
| Workflow Coverage | 1,000+ |
| Database Tables | 100+ |
| API Endpoints | 500+ |
| Integration Tests | 200+ |
| E2E Tests | 50+ |
| Uptime | 99.9% |

---

## Part 13: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-------------|
| Skills Graph complexity | High | Medium | Phased approach |
| Multi-country payroll | High | High | Partner integration |
| AI workforce accuracy | Medium | High | Human-in-loop initially |
| Legacy CorpPerks migration | Medium | High | Parallel run |
| Data privacy/GDPR | Low | Critical | Privacy by design |

---

## Appendix: File Structure Target

```
companies/HOJAI-AI/platform/hros/
├── core-hr-platform/
│   ├── employee-management/
│   ├── organization/
│   ├── position-management/
│   └── documents/
├── talent-acquisition/
│   ├── ats/
│   ├── crm/
│   └── hiring-workflows/
├── onboarding-platform/
├── performance-platform/
├── learning-platform/
├── workforce-platform/
├── payroll-platform/
├── benefits-platform/
├── experience-platform/
├── organization-platform/
├── global-workforce/
├── people-intelligence/
├── employee-twins/
│   ├── identity-twin/
│   ├── skill-twin/
│   ├── career-twin/
│   └── wellness-twin/
└── ai-workforce/
    ├── recruiter-ai/
    ├── hrbp-ai/
    └── learning-coach-ai/
```

---

## Next Actions

### This Week
1. Review HROS upgrade plan
2. Assign Phase 1 team
3. Start Employee Twin schema design

### This Month
1. Complete Phase 1 (Foundation)
2. Integrate CorpPerks with Industry OS
3. Deploy Phase 2 (Core HR screens)

### This Quarter
1. Complete Phases 1-4
2. Launch Beta to internal users
3. Begin Phase 5-8 planning

---

*Plan Version: 1.0*
*Created: July 1, 2026*
*Duration: 32 weeks*
