# HROS - Human Resources Operating System

**Version:** 1.0  
**Status:** ✅ COMPLETE

---

## Current Structure

```
hros/
├── employee-twin-platform/           ✅ COMPLETE
│   └── src/index.ts                  ✅ 10 Employee Twins
├── skills-graph/                    ✅ COMPLETE
│   └── src/index.ts                  ✅ 40+ Skills, Graph, Recommendations
├── ai-workforce/                    ✅ COMPLETE
│   ├── src/index.ts               ✅ 15 AI Workers Registry
│   └── src/hrbp-agent.ts          ✅ HRBP Agent
├── corpperks-integration/             ✅ COMPLETE
│   └── src/index.ts                  ✅ Syncs CorpPerks to Twins
├── event-bus/                       ✅ COMPLETE
│   └── src/index.ts                  ✅ 50+ Employee Events
├── payroll-platform/                 ✅ NEW
│   └── src/index.ts                  ✅ Indian Payroll (PF/ESI/TDS/GST)
├── benefits-platform/                 ✅ NEW
│   └── src/index.ts                  ✅ Health/Life/Retirement/Welfare
├── time-attendance/                  ✅ NEW
│   └── src/index.ts                  ✅ Attendance/Shifts/Leave/Geo-fencing
├── recruitment-ats/                  ✅ NEW
│   └── src/index.ts                  ✅ Job Postings/Candidates/Interviews/Offers
├── performance-management/             ✅ NEW
│   └── src/index.ts                  ✅ Reviews/Goals/Feedback/Calibration
└── CLAUDE.md
```

---

## What's Built

### 1. Employee Twin Platform ✅

10 Employee Twins:
- Identity Twin
- Skill Twin
- Career Twin
- Learning Twin
- Performance Twin
- Relationship Twin
- Compensation Twin
- Wellness Twin
- Sentiment Twin
- Productivity Twin
- Aspirational Twin

### 2. Skills Graph ✅

- 40+ predefined skills
- Skill taxonomy (Technical, Leadership, Domain, Soft, Tool, Certification, Emerging)
- Skill relationships
- Career path recommendations
- AI-powered skill recommendations
- Team capability mapping
- Skill gap analysis

### 3. AI Workforce ✅ (15 Workers)

| # | Worker | Type | Status |
|---|---------|------|--------|
| 1 | CPO AI | Executive | ✅ |
| 2 | HRBP Agent | Senior | ✅ |
| 3 | Recruiter AI | Mid | ✅ |
| 4 | Payroll AI | Mid | ✅ |
| 5 | Learning Coach AI | Senior | ✅ |
| 6 | Career Coach AI | Senior | ✅ |
| 7 | Performance Coach AI | Senior | ✅ |
| 8 | Compensation Advisor AI | Principal | ✅ |
| 9 | Wellness AI | Mid | ✅ |
| 10 | Compliance AI | Principal | ✅ |
| 11 | Skills Agent AI | Mid | ✅ |
| 12 | Onboarding AI | Mid | ✅ |
| 13 | Retention AI | Senior | ✅ |
| 14 | Culture AI | Senior | ✅ |
| 15 | Workforce Planner AI | Principal | ✅ |

### 4. CorpPerks Integration ✅

Syncs existing CorpPerks services to Employee Twins:
- `backend` (4006) → Employee identity
- `payroll-service` (4738) → Compensation Twin
- `performance-service` (4729) → Performance Twin
- `lms-service` (4734) → Learning Twin
- `meeting-service` (4728) → Relationship Twin
- `shift-service` (4739) → Productivity Twin

### 5. Event Bus ✅

50+ Employee lifecycle events:
- employee.created, updated, terminated
- onboarding.started, completed, delayed
- performance.review_scheduled, completed
- learning.enrolled, completed, certificate_earned
- compensation.updated
- wellness.alert, survey_completed
- sentiment.declined, improved

### 6. Payroll Platform ✅

**Complete Indian Payroll:**
- Salary Processing (Basic/HRA/Allowances)
- Statutory Compliance:
  - PF (EPF/EPS/ERF/EDLI)
  - ESI
  - TDS
  - Professional Tax
  - LWF
- Reimbursements
- Loans & Advances
- Bank Transfers
- Payslip Generation
- Payroll Reports

### 7. Benefits Platform ✅

**Employee Benefits:**
- Health Insurance (Bronze/Gold/Platinum)
- Life Insurance
- Retirement Plans (EPF/Gratuity/NPS)
- Wellness Programs
- Perk Platform
- Claim Management
- Flexible Benefits

### 8. Time & Attendance ✅

**Attendance:**
- Clock In/Out
- Geo-fencing
- Biometric Integration
- Attendance Summary
- Late Tracking

**Shifts:**
- Regular/Night/Rotational/Flexi shifts
- Shift Scheduling
- Week-off Management

**Leave:**
- 4 Default Policies (PL/CL/SL/EL)
- Leave Applications
- Leave Balance
- Approval Workflows

**Overtime:**
- Weekday/Weekend/Holiday OT
- OT Approval

### 9. Recruitment ATS ✅

**Job Management:**
- Job Postings
- Multi-stage Pipeline
- Source Tracking

**Candidate Management:**
- Profile & Resume
- Stage Movement
- Interview Scheduling
- Ratings & Feedback
- Notes & Communication

**Offers:**
- Offer Creation
- Salary/Benefits/Equity
- Offer Lifecycle

**Analytics:**
- Hiring Funnel
- Time to Hire
- Source Effectiveness

### 10. Performance Management ✅

**Review Cycles:**
- Annual/Half-yearly/Quarterly/Probation
- Self Review
- Manager Review
- Calibration Sessions

**Goals (OKRs):**
- Goal Creation
- Progress Tracking
- Alignment

**Feedback & Recognition:**
- 360 Feedback
- Kudos & Badges
- Leaderboard

**Development:**
- Development Plans
- Focus Areas
- Learning Actions

---

## Integration Points

```
HROS
├── Employee Twin Platform (4007)
├── Skills Graph (4008)
├── AI Workforce (4009)
├── CorpPerks Integration (4010)
├── Event Bus (4011)
├── Payroll Platform (4012)
├── Benefits Platform (4013)
├── Time & Attendance (4014)
├── Recruitment ATS (4015)
└── Performance Management (4016)

Foundation
├── TwinOS (4705)
├── MemoryOS (4703)
├── AgentOS (4802)
└── SUTAR OS
```

---

## Statutory Compliance Built

| Compliance | Status | Details |
|-----------|--------|---------|
| PF (EPF/Pension) | ✅ | Employee 12%, Employer 13% |
| ESI | ✅ | Employee 0.75%, Employer 3.25% |
| TDS | ✅ | Old/New regime support |
| Professional Tax | ✅ | ₹175-200/month |
| LWF | ✅ | Employer contribution |
| Gratuity | ✅ | 4.81% of basic |

---

*Complete: July 2, 2026*
