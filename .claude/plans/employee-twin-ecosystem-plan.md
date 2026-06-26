# Employee Twin Ecosystem Plan
**Date:** June 26, 2026  
**Status:** Planning  
**Priority:** P0 - Strategic

---

## Executive Summary

This plan unifies **TwinOS** (digital twin infrastructure) with **CorpPerks** (canonical employee platform) to create a **Living, Learning, Executable Employee Twin** that transforms human expertise into scalable digital labor.

### Current State

| System | Status | Key Finding |
|--------|--------|-------------|
| **TwinOS** | 17 twin services | 100% CRUD, 0% learning, 0% execution |
| **CorpPerks** | 110+ services | Full HRMS, Indian compliance, 46 AI agents |
| **Port Conflict** | 4730 | OKR Service (CorpPerks) vs Employee Twin (HOJAI-AI) |
| **Duplication** | Workforce OS | 5077 duplicates CorpPerks HRMS |

### Target State

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORPPERKS (Canonical Employee Platform)      │
│                    Port 4006 - Core HRMS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              EMPLOYEE INTELLIGENCE LAYER                 │   │
│   │                                                          │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │   │
│   │   │  Employee    │  │   Twin       │  │   AI        │ │   │
│   │   │  Twin        │◄─┤  Learning    │◄─┤  Feedback   │ │   │
│   │   │  (Profile)   │  │  Engine      │  │   Loop      │ │   │
│   │   └──────────────┘  └──────┬───────┘  └─────────────┘ │   │
│   │                             │                            │   │
│   │   ┌──────────────┐  ┌──────▼───────┐  ┌─────────────┐ │   │
│   │   │  Behavior    │  │   Execution  │  │   Memory    │ │   │
│   │   │  Graph       │◄─┤   Engine     │◄─┤   Bridge    │ │   │
│   │   └──────────────┘  └──────────────┘  └─────────────┘ │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                             │                                     │
│   ┌─────────────────────────┼───────────────────────────────┐   │
│   │              CORPID (Universal Identity)                │   │
│   │              Port 4702                                   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Conflict Resolution

### 1.1 Port 4730 Conflict

| Port | Current Owner | Resolution |
|------|---------------|------------|
| **4730** | CorpPerks OKR Service | **MOVE** to port 4749 |
| **4730** | HOJAI-AI Employee Twin | **KEEP** - canonical employee intelligence |

**Action:** Update CorpPerks `okr-service` from `4730` to `4749`

### 1.2 Workforce OS Duplication

| Service | Port | Action |
|---------|------|--------|
| **industry-os/workforce-os** | 5077 | **DEPRECATE** - merge into CorpPerks |
| **CorpPerks HRMS** | 4006 | **KEEP** - canonical HRMS with Indian compliance |

**Rationale:** CorpPerks is more mature with:
- Indian statutory compliance (PF/ESI/TDS/Gratuity)
- 69-screen mobile app
- 46 AI agents
- BIZORA industry bridges

---

## Part 2: Architecture

### 2.1 New Service Structure

```
companies/HOJAI-AI/platform/twins/
├── existing/
│   ├── twinos-hub/              (4705) - Registry
│   ├── twinos-shared/          - Shared library
│   ├── twin-memory-bridge/     (4704) - Memory bindings
│   ├── employee-twin/           (4730) - Employee profiles
│   └── [other twins]/
│
└── NEW/
    ├── twin-learning-os/         (4735) - Learning engine
    ├── twin-feedback-os/        (4736) - Feedback loop & RLHF
    ├── twin-execution-os/       (4737) - Task queue & execution
    ├── twin-behavior-graph/     (4738) - Behavior patterns
    └── twin-simulation-os/      (4739) - Prediction engine

companies/CorpPerks/
├── services/
│   ├── backend/                 (4006) - Canonical HRMS
│   ├── payroll-service/         (4738) - Indian payroll
│   ├── [other 29 services]/
│   └── bridges/
│       └── twin-learning-bridge/ - Connect HRMS → Twin Learning
```

### 2.2 Data Flow

```
CORPPERKS HRMS (4006)
        │
        │ Employee actions
        │ Performance reviews
        │ Task outcomes
        │ Feedback submissions
        ▼
TWIN LEARNING BRIDGE
        │
        │ Transform → Learning events
        ▼
TWIN LEARNING OS (4735)
        │
        ├──► BEHAVIOR GRAPH (4738)
        │           │
        │           │ Store patterns
        │           ▼
        │    TWIN MEMORY BRIDGE (4704)
        │
        ├──► DECISION LEARNING
        │           │
        │           │ Why decisions made
        │           ▼
        │    EMPLOYEE TWIN (4730)
        │
        └──► FEEDBACK LOOP
                    │
                    │ Human corrections
                    ▼
             TWIN FEEDBACK OS (4736)
                    │
                    │ Update confidence
                    ▼
              TWIN EXECUTION OS (4737)
                        │
                        │ Task execution
                        ▼
                  Approved Tools
```

---

## Part 3: Service Specifications

### 3.1 Twin Learning OS (4735)

**Responsibilities:**
- Observe employee behavior
- Extract patterns
- Build behavior graph
- Learn decision rationale

**Endpoints:**
```
POST   /observe              - Record behavior event
POST   /patterns             - Extract patterns from events
GET    /patterns/:employeeId - Get employee's patterns
POST   /learn                - Trigger learning from patterns
GET    /confidence/:employeeId - Get learning confidence
```

**Data Model:**
```typescript
interface LearningEvent {
  id: string;
  employeeId: string;
  eventType: 'task' | 'decision' | 'communication' | 'approval';
  context: Record<string, any>;
  outcome?: string;
  timestamp: Date;
}

interface BehaviorPattern {
  id: string;
  employeeId: string;
  pattern: {
    triggers: string[];
    actions: string[];
    conditions: string[];
    outcomes: string[];
  };
  confidence: number;  // 0-100
  evidence: LearningEvent[];
  lastUpdated: Date;
}
```

### 3.2 Twin Feedback OS (4736)

**Responsibilities:**
- Collect human corrections
- Store RLHF data
- Update capability confidence
- Trigger model updates

**Endpoints:**
```
POST   /feedback             - Submit feedback (approve/reject/correct)
GET    /feedback/:employeeId - Get feedback history
POST   /feedback/:feedbackId/approve - Approve twin action
POST   /feedback/:feedbackId/reject  - Reject twin action
POST   /feedback/:feedbackId/correct - Provide correction
GET    /confidence/:capabilityId - Get capability confidence
POST   /rlhf/batch           - Submit batch RLHF data
```

**Data Model:**
```typescript
interface Feedback {
  id: string;
  employeeId: string;
  twinAction: {
    capability: string;
    prediction: any;
    confidence: number;
  };
  humanResponse: {
    type: 'approve' | 'reject' | 'correct' | 'explain';
    correction?: any;
    explanation?: string;
  };
  outcome: 'learned' | 'pending' | 'escalated';
  timestamp: Date;
}

interface CapabilityConfidence {
  capabilityId: string;
  baseConfidence: number;
  feedbackMultiplier: number;  // Based on approval rate
  recencyDecay: number;        // Older feedback matters less
  currentConfidence: number;
}
```

### 3.3 Twin Execution OS (4737)

**Responsibilities:**
- Task queue management
- Execute tasks on behalf of employee
- Retry logic
- Approval workflows
- Rollback capabilities

**Endpoints:**
```
POST   /tasks                 - Create task for twin
GET    /tasks/:taskId         - Get task status
POST   /tasks/:taskId/execute - Execute task
POST   /tasks/:taskId/approve - Human approval
POST   /tasks/:taskId/reject  - Human rejection
POST   /tasks/:taskId/cancel  - Cancel task
GET    /queue/:employeeId     - Get employee's task queue
POST   /tools                 - Register available tools
GET    /permissions/:employeeId - Get tool permissions
```

**Data Model:**
```typescript
interface Task {
  id: string;
  employeeId: string;
  description: string;
  capability: string;
  context: Record<string, any>;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  confidence: number;
  autoApprove: boolean;        // Based on confidence threshold
  retryCount: number;
  maxRetries: number;
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface ToolPermission {
  employeeId: string;
  tool: string;
  allowed: boolean;
  budget?: number;
  requiresApproval: boolean;
  lastUsed: Date;
}
```

### 3.4 Twin Behavior Graph (4738)

**Responsibilities:**
- Store behavioral patterns
- Relationship mapping
- Preference tracking
- Decision trees

**Endpoints:**
```
POST   /graph/node            - Add behavior node
GET    /graph/:employeeId     - Get employee's behavior graph
POST   /graph/edge            - Add relationship
GET    /graph/path/:from/:to  - Find path between behaviors
POST   /simulate/:employeeId  - Simulate behavior
```

### 3.5 Twin Simulation OS (4739)

**Responsibilities:**
- Predict employee actions
- Confidence scoring
- What-if scenarios
- Twin health metrics

**Endpoints:**
```
POST   /predict               - Predict next action
GET    /confidence/:employeeId - Get prediction confidence
POST   /whatif                - Run what-if scenario
GET    /health/:employeeId    - Get twin health score
POST   /calibrate/:employeeId - Recalibrate predictions
```

---

## Part 4: Twin Maturity Levels

| Level | Name | Capabilities | Confidence |
|-------|------|--------------|------------|
| **0** | Digital Profile | Basic employee data | N/A |
| **1** | Observer | Watches and records | N/A |
| **2** | Learner | Extracts patterns | 0-50% |
| **3** | Simulator | Predicts actions | 50-80% |
| **4** | Assistant | Suggests actions | 80-95% |
| **5** | Delegate | Performs approved tasks | 95-99% |
| **6** | Autonomous | Works independently | 99-100% |

### Confidence Thresholds

| Confidence | Action |
|------------|--------|
| 95-100% | Auto-execute (if permitted) |
| 80-95% | Request human review |
| 50-80% | Suggest only |
| Below 50% | Observe and learn |

---

## Part 5: Integration with CorpPerks

### 5.1 Twin Learning Bridge

**Location:** `companies/CorpPerks/services/bridges/twin-learning-bridge/`

**Purpose:** Connect CorpPerks HRMS events → Twin Learning OS

**Events to Capture:**
```typescript
// From CorpPerks HRMS
const learningEvents = [
  { source: 'performance-review', events: ['rating', 'feedback', 'goals'] },
  { source: 'attendance', events: ['check_in', 'check_out', 'overtime'] },
  { source: 'leave', events: ['request', 'approval', 'cancellation'] },
  { source: 'payroll', events: ['salary_change', 'bonus', 'deduction'] },
  { source: 'okr', events: ['objective_set', 'progress', 'completion'] },
  { source: 'lms', events: ['course_enrolled', 'course_completed', 'certification'] },
  { source: 'meeting', events: ['scheduled', 'conducted', 'feedback'] },
  { source: 'document', events: ['uploaded', 'signed', 'approved'] },
];
```

### 5.2 CorpPerks AI Agent Integration

**Current:** CorpPerks has 46 AI agents (L1-L4 for 10 roles)

**Enhancement:** Each agent connects to Employee Twin

```
CorpPerks AI Agent
        │
        │ Query employee context
        ▼
Employee Twin (4730)
        │
        │ Get patterns, preferences, history
        ▼
Twin Learning OS (4735)
        │
        │ Return contextual data
        ▼
Agent responds with personalized advice
```

### 5.3 CorpPerks Mobile App Enhancement

**Current:** 69 screens in `people` app

**New Screens to Add:**
```
AI Hub
├── My Twin
│   ├── Twin Dashboard        (Twin health, confidence)
│   ├── Learning Progress     (What twin learned)
│   ├── Approvals Queue       (Tasks to approve)
│   └── Feedback             (Correct my twin)
│
├── Twin Settings
│   ├── Automation Level     (L0-L6 slider)
│   ├── Tool Permissions     (What twin can do)
│   ├── Privacy Controls    (What twin sees)
│   └── Share Twin          (With manager/team)
│
└── Twin Marketplace
    ├── Browse Templates     (Pre-built twins)
    └── Publish My Twin      (Monetize expertise)
```

---

## Part 6: Implementation Roadmap

### Month 1: Foundation

| Week | Task | Deliverable |
|------|------|-------------|
| 1 | Resolve port conflicts | Port 4730 OKR → 4749 |
| 2 | Build Twin Learning Bridge | CorpPerks → Twin Learning |
| 3 | Build Twin Learning OS (4735) | Observation engine |
| 4 | Build Behavior Graph (4738) | Pattern storage |

**Test:** Twin observes 10 employees for 1 week

### Month 2: Learning Engine

| Week | Task | Deliverable |
|------|------|-------------|
| 5 | Build Twin Feedback OS (4736) | Feedback collection |
| 6 | Connect to CorpPerks feedback | Real corrections |
| 7 | Build Twin Simulation OS (4739) | Prediction engine |
| 8 | Build confidence model | 0-100 scoring |

**Test:** 100 employees correct their twin

### Month 3: Execution

| Week | Task | Deliverable |
|------|------|-------------|
| 9 | Build Twin Execution OS (4737) | Task queue |
| 10 | Build approval workflow | Human-in-loop |
| 11 | Build tool permissions | Security layer |
| 12 | Integration testing | End-to-end flow |

**Test:** Twin performs 10 approved tasks

### Month 4-6: Maturity

| Month | Focus | Deliverables |
|-------|-------|--------------|
| 4 | Dashboard | Twin health, learning metrics |
| 5 | Mobile | Twin management in People app |
| 6 | Marketplace | Twin templates and sharing |

---

## Part 7: Immediate Actions

### This Week

- [ ] Resolve port 4730 conflict (OKR → 4749)
- [ ] Deprecate Workforce OS (5077) in favor of CorpPerks
- [ ] Create twin-learning-os directory structure
- [ ] Define data models for LearningEvent and BehaviorPattern

### This Month

- [ ] Build Twin Learning OS (4735)
- [ ] Build Twin Learning Bridge
- [ ] Connect to CorpPerks HRMS events
- [ ] Test observation on 10 employees

---

## Part 8: Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Employees with twins | 100% | Count / total employees |
| Learning events captured | 10/employee/day | Events / employees / day |
| Feedback submissions | 5/employee/week | Feedback / employees / week |
| Twin confidence | 70% avg | Confidence scores |
| Tasks executed | 10/employee/week | Completed tasks |
| Automation level | 50% at L3+ | Twins at L3 or higher |

---

## Part 9: Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Privacy concerns | High | Clear opt-in, data separation |
| Wrong actions | High | Confidence thresholds, approvals |
| Employee rejection | Medium | Show value first, gradual increase |
| Data quality | Medium | Validation, feedback loop |
| Integration complexity | Low | Incremental rollout |

---

## References

- TwinOS Audit: `.claude/audits/twinos-audit-2026-06-26.md`
- CorpPerks Audit: `.claude/audits/corpperks-audit-2026-06-26.md`
- RTMN CLAUDE.md: `CLAUDE.md`
- CorpPerks: `companies/CorpPerks/`
- TwinOS: `companies/HOJAI-AI/platform/twins/`
