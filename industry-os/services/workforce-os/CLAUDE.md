# RTMN Workforce OS

**Version:** 2.0  
**Port:** 5065  
**Status:** Phase 1 - Building  
**Parent:** RTMN OS (Layer 5 - Workforce)  
**Parent App:** CorpPerks (PeopleOS + TalentAI)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RTMN WORKFORCE OS v2.0                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND APPLICATIONS                              │   │
│  │                                                                      │   │
│  │   PeopleOS (3001) ◄───────────────► TalentAI (3002)                 │   │
│  │        │                                        │                    │   │
│  │        │         ┌─────────────────────────┐   │                    │   │
│  │        └────────►│    Workforce OS Core    │◄─┘                    │   │
│  │                  │        (Port 5065)      │                        │   │
│  │                  └─────────────────────────┘                        │   │
│  │                            │                                         │   │
│  │   ┌────────────────────────┼────────────────────────┐               │   │
│  │   │                        │                        │               │   │
│  │   ▼                        ▼                        ▼               │   │
│  │ CorpPerks              Talent OS               Workforce            │   │
│  │ Services               (5066)                 Intelligence         │   │
│  │ (Ports 4006-4150)                               (5073)              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Connected Services

### CorpPerks Services (Legacy - Enhanced)

| Port | Service | Integration |
|------|---------|-------------|
| 4006 | CorpPerks Backend API | Primary HR data |
| 4007 | Payroll Service | Payroll calculations |
| 4010 | Shift Service | Attendance & shifts |
| 4013 | Meeting Service | Calendar & 1-on-1s |
| 4014 | Document Service | HR documents |
| 4018 | Analytics Service | HR analytics |
| 4019 | Compensation Service | Salary & equity |
| 4020 | ProjectOS | Project assignment |
| 4130 | Role AI Agents | HR AI agents |
| 4135 | CorpPerks Intelligence | AI insights |
| 4150 | Twin Marketplace | Professional twins |
| 4968 | CorpPerks Integration | TwinOS sync |

### New Workforce OS Services

| Port | Service | Description |
|------|---------|-------------|
| 5065 | Workforce OS Core | Unified HR operations |
| 5066 | Talent OS | Enhanced recruitment ATS |
| 5067 | Employee OS | Self-service & journey |
| 5068 | Learning OS | LMS & skills |
| 5069 | Performance OS | Reviews & OKRs |
| 5070 | Benefits OS | Benefits administration |
| 5071 | Culture OS | Culture & engagement |
| 5072 | Organization OS | Org design & planning |
| 5073 | Workforce Intelligence | AI command center |

---

## API Gateway Routes

```
/api/workforce/*         → Workforce OS Core (5065)
/api/talent/*           → Talent OS (5066)
/api/employee/*         → Employee OS (5067)
/api/learning/*         → Learning OS (5068)
/api/performance/*      → Performance OS (5069)
/api/benefits/*         → Benefits OS (5070)
/api/culture/*          → Culture OS (5071)
/api/organization/*     → Organization OS (5072)
/api/intelligence/*     → Workforce Intelligence (5073)
```

---

## Database Schema Overview

### Core Entities

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Employee   │────►│  Department │────►│  Position   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                        │
       ▼                                        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Leave     │     │  Payroll    │     │  Benefits   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                        │
       ▼                                        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Attendance  │     │  Document   │     │  Training   │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Digital Twins Integration

| Twin | Source | Purpose |
|------|--------|---------|
| Employee Twin | CorpPerks (3011) | Profile & skills |
| Payroll Twin | New (3014) | Compensation |
| Leave Twin | New (3015) | Leave tracking |
| Position Twin | New (3016) | Job roles |
| Benefits Twin | New (3017) | Health & benefits |
| Performance Twin | New (3018) | Reviews & OKRs |
| Training Twin | New (3019) | Learning |
| Candidate Twin | Talent OS | Hiring pipeline |

---

## CorpPerks PeopleOS Integration

The PeopleOS frontend (Port 3001) connects to:

```
PeopleOS (3001)
      │
      ├─► CorpPerks Backend (4006) - Core data
      │
      ├─► Workforce OS Core (5065) - Enhanced features
      │       │
      │       ├─► Skills Graph API
      │       ├─► AI Suggestions
      │       └─► Workforce Intelligence
      │
      └─► CorpPerks Intelligence (4135) - AI Copilot
```

---

## CorpPerks TalentAI Integration

The TalentAI frontend (Port 3002) connects to:

```
TalentAI (3002)
      │
      ├─► CorpPerks Backend (4006) - Job data
      │
      ├─► Talent OS (5066) - Enhanced ATS
      │       │
      │       ├─► AI Interviewer
      │       ├─► Skills Matching
      │       └─► Candidate Intelligence
      │
      └─► Role AI Agents (4130) - Recruiter Agent
```

---

## AI Agents (25+)

### Operations Agents (10)
1. AI HR Assistant - Policy, leave, benefits queries
2. AI Recruiter - End-to-end hiring
3. AI Sourcer - Candidate sourcing
4. AI Interviewer - Video interviews
5. AI Payroll Officer - Payroll processing
6. AI Leave Officer - Leave management
7. AI Attendance Officer - Attendance tracking
8. AI Compliance Officer - Regulatory compliance
9. AI Benefits Advisor - Benefits guidance
10. AI Expense Auditor - Expense review

### Coach Agents (10)
11. AI Employee Assistant - Personal HR helper
12. AI Manager Coach - Leadership support
13. AI Career Coach - Career development
14. AI Learning Coach - Training guidance
15. AI Performance Coach - Performance improvement
16. AI Wellness Coach - Wellbeing support
17. AI Culture Officer - Culture building
18. AI Employee Success - Lifecycle management
19. AI Internal Mobility - Career mobility
20. AI Visa Officer - GCC compliance

### Executive Agents (5)
21. AI HR Director - Strategic decisions
22. AI Executive Advisor - C-suite support
23. AI Talent Intelligence - Market analysis
24. AI Organization Designer - Org restructuring
25. AI Workforce Planner - Future planning

---

## Implementation Phases

### Phase 1: Core Foundation (Week 1-4)
- Workforce OS Core (5065)
- Employee Records Module
- Leave Management Module
- Attendance Module
- Payroll Module
- Benefits Module
- 5 Core AI Agents
- 3 Digital Twins

### Phase 2: Talent Acquisition (Week 5-8)
- Talent OS (5066)
- Recruitment ATS
- Candidate Management
- AI Interviewer
- Skills Matching

### Phase 3: Growth & Learning (Week 9-12)
- Learning OS (5068)
- Performance OS (5069)
- Skills Graph
- Training & Certification
- OKRs & Reviews

### Phase 4: Intelligence Layer (Week 13-16)
- Workforce Intelligence (5073)
- Sentiment Intelligence
- Culture Intelligence
- HR Command Center

### Phase 5: Organization (Week 17-20)
- Organization OS (5072)
- Org Design AI
- Workforce Planning
- Succession Planning

### Phase 6: Advanced Features (Week 21-24)
- Benefits OS (5070)
- Culture OS (5071)
- Global Workforce
- Gig Management

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB |
| Cache | Redis |
| AI | OpenAI, Anthropic |
| Twins | TwinOS Hub (4705) |
| Events | REZ Event Bus (4510) |
| Auth | CorpID (4702) |
| Memory | Memory OS (4703) |

---

*Last Updated: June 17, 2026*
