# HROS - Human Resources Operating System

**Version:** 1.0  
**Status:** BUILDING

---

## Current Structure

```
hros/
├── employee-twin-platform/       ✅ Built
│   ├── src/index.ts              ✅ 10 Employee Twins
│   └── package.json
├── skills-graph/                 ✅ Built
│   ├── src/index.ts              ✅ 40+ Skills, Graph, Recommendations
│   └── package.json
├── ai-workforce/                ✅ Built
│   ├── src/index.ts             ✅ 15 AI Workers Registry
│   ├── src/hrbp-agent.ts       ✅ HRBP Agent
│   └── package.json
├── corpperks-integration/        ✅ Built
│   ├── src/index.ts             ✅ Syncs CorpPerks to Twins
│   └── package.json
├── event-bus/                   ✅ Built
│   ├── src/index.ts             ✅ 50+ Employee Events
│   └── package.json
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

---

## Still to Build (Phase 2+)

| Component | Priority | Notes |
|-----------|----------|-------|
| Onboarding Platform | P1 | CorpPerks onboarding-service integration |
| Full HRBP Agent capabilities | P1 | Deeper consultation engine |
| Retention AI | P1 | Flight risk analysis |
| Culture AI | P2 | Values, recognition, rituals |
| Global Payroll | P2 | Multi-country support |
| Benefits Marketplace | P2 | Full benefits OS |

---

## Integration Points

```
CorpPerks Backend (4006)
        │
        ▼
CorpPerks Integration
        │
        ├─► Employee Twin Platform (4007)
        ├─► Skills Graph (4008)
        ├─► AI Workforce (4009)
        │
        ▼
Event Bus (4010)
        │
        ├─► TwinOS (4705)
        ├─► MemoryOS (4703)
        └─► Department OS
```

---

*Built: July 2, 2026*
