# Salar OS - Workforce Intelligence Network

**Version:** 2.0 | **Date:** June 10, 2026

---

## What is Salar OS?

**The Workforce Intelligence Network**

> "Understand what humans and AI agents know, can do, should do, and are trusted to do."

Not an HRMS. Not a workforce marketplace. **The intelligence layer that makes autonomous operations possible.**

---

## The Workforce Twin Network

The defining feature of Salar OS:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WORKFORCE TWIN NETWORK                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│  │   HUMAN TWIN    │     │   AGENT TWIN    │     │  HYBRID TWIN    │      │
│  │                 │     │                 │     │                 │      │
│  │ Skills          │     │ Capabilities    │     │ Human + Agent   │      │
│  │ Trust           │     │ Performance     │     │ Optimal ratios  │      │
│  │ Capacity        │     │ Cost            │     │ Fallback chains │      │
│  │ Goals           │     │ Reliability     │     │ Collaboration   │      │
│  │ AI Comfort      │     │ Trust           │     │                 │      │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘      │
│                                                                             │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────┐             │
│  │           WORKFORCE TWIN NETWORK                         │             │
│  │                                                          │             │
│  │  The moat: Nobody else has this.                        │             │
│  │                                                          │             │
│  │  LinkedIn has: Human profiles                           │             │
│  │  Workday has: Human records                            │             │
│  │  Glean has: Enterprise search                          │             │
│  │                                                          │             │
│  │  Salar has: Human + Agent + Hybrid Twins              │             │
│  │              All connected. All intelligent.           │             │
│  │                                                          │             │
│  └─────────────────────────────────────────────────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SALAR OS                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CAPABILITY REGISTRY                                               │   │
│  │  Maps capabilities to humans, agents, teams                        │   │
│  │  "Who can do what?"                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  WORKFORCE TWIN LAYER                                              │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │ HUMAN TWIN  │  │ AGENT TWIN  │  │ HYBRID TWIN │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ASSIGNMENT ENGINE                                                  │   │
│  │  "Who should do this?"                                            │   │
│  │                                                                      │   │
│  │  Inputs: Capability + Capacity + Trust + Cost                       │   │
│  │  Output: Human / Agent / Hybrid Team                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SUTAR BRIDGE                                                     │   │
│  │  Connects to Sutar Decision Engine                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Modules

### 1. Capability Registry

Master capability definitions mapped to workforce.

```typescript
// 50+ capabilities across 9 categories
- TECHNICAL: Python, JavaScript, ML, Cloud, Security...
- BUSINESS: Sales, Marketing, Finance, Product...
- OPERATIONS: Project Management, Supply Chain, QA...
- CREATIVE: Design, Writing, Branding...
- ANALYTICS: Data Analysis, BI, A/B Testing...
- SUPPORT: Customer Support, Technical Support...
- HR: Recruiting, Training, Performance...
- LEADERSHIP: Team Leadership, Strategy...
- DOMAIN: Healthcare, E-commerce, Hospitality...
```

### 2. Agent Twin

Digital twin for every AI agent.

```typescript
AgentTwin {
  identity:      type, version, owner, department
  capabilities:  what it can do
  performance:   tasks, success rate, quality
  trust:         human rating, automated score
  capacity:      current load, availability
  cost:          per task, per hour
  health:         status, issues, recommendations
  learning:      skills improved, patterns learned
}
```

### 3. Human Twin

Digital twin for every human employee.

```typescript
HumanTwin {
  employment:     role, department, tenure
  skills:        capabilities, levels
  performance:   tasks, quality, efficiency
  capacity:       hours, burnout risk
  aiCollaboration: comfort, delegated tasks
  agentPartners:  who they work with
  health:         status, score
}
```

### 4. Hybrid Twin

Digital twin for human-agent teams.

```typescript
HybridTeamTwin {
  composition:    humans + agents
  capabilities:  combined capability map
  performance:   hybrid vs solo metrics
  effectiveness:  optimal ratios
  patterns:      task type → optimal config
  trust:         human ↔ agent trust
  collaboration:  how well they work together
}
```

---

## API Reference

### Capability Registry

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /capabilities/init` | POST | Initialize master capabilities |
| `GET /capabilities` | GET | List all capabilities |
| `POST /mappings` | POST | Map capability to entity |
| `GET /mappings/:type/:id` | GET | Get entity capabilities |
| `POST /mappings/find` | POST | Find entities by capability |
| `GET /matrix` | GET | Workforce capability matrix |

### Agent Twin

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /agent-twin` | POST | Create agent twin |
| `GET /agent-twin/:id` | GET | Get agent twin |
| `POST /agent-twin/:id/task` | POST | Record task completion |
| `GET /agent-twin/:id/metrics` | GET | Get performance metrics |
| `POST /agent-twin/find` | POST | Find best agents for task |
| `GET /agent-twin/simulate/:id/impact` | GET | Simulate agent removal |

### Human Twin

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /human-twin` | POST | Create human twin |
| `GET /human-twin/:id` | GET | Get human twin |
| `POST /human-twin/:id/delegate` | POST | Delegate task to AI |
| `GET /human-twin` | GET | List all human twins |

### Hybrid Team Twin

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /hybrid-team` | POST | Create hybrid team |
| `POST /hybrid-team/find-optimal` | POST | Find optimal team for task |
| `POST /hybrid-team/:id/task` | POST | Assign task to team |
| `GET /network` | GET | Get Workforce Twin Network |

### Sutar Bridge

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /sutar/bridge/workforce-decision` | POST | Workforce decision request |
| `POST /sutar/bridge/outcome` | POST | Record execution outcome |
| `POST /sutar/bridge/capability-check` | POST | Check capability availability |
| `POST /sutar/bridge/simulation` | POST | Workforce simulation |

---

## Integration Architecture

```
MEMORYOS (Events)
      │
      ├── PR merged          → skill:python
      ├── Task completed      → capability:analysis
      └── Course finished     → cert:aws

      │
      ▼

CORPID ASSERTION SERVICE
      │
      ├── Assertion: skill:python, confidence: 0.72
      └── Evidence: 47 events

      │
      ▼

SALAR OS
      │
      ├── Capability Registry
      │     └── Maps: Humans → Python, Agents → Python
      │
      ├── Agent Twin
      │     └── Tracks: performance, trust, cost
      │
      ├── Human Twin
      │     └── Tracks: skills, capacity, AI comfort
      │
      ├── Hybrid Twin
      │     └── Tracks: optimal human/agent ratios
      │
      └── Assignment Engine
            └── "Who should do this?"

            │
            ▼

SUTAR DECISION ENGINE
            │
            ├── SimulationOS: What if?
            ├── GoalOS: Break down goal
            └── Execution: Do the work

            │
            ▼

OUTCOME → SALAR (Learning)
```

---

## Example: Finding Workforce for a Task

### Input

```json
{
  "task": "Build authentication feature",
  "requiredCapabilities": ["python", "security", "authentication"],
  "allowHybrid": true,
  "budget": 100
}
```

### Salar's Response

```json
{
  "recommendations": [
    {
      "type": "HYBRID",
      "humans": [
        { "corpId": "CI-IND-DEV01", "name": "John Developer", "matchScore": 0.92 }
      ],
      "agents": [
        { "corpId": "CI-AGT-AUTH01", "name": "Auth Agent", "matchScore": 0.88 }
      ],
      "estimatedCost": 45,
      "estimatedTime": "3 days"
    },
    {
      "type": "AGENT_ONLY",
      "agents": [
        { "corpId": "CI-AGT-FULL01", "name": "Full Stack Agent", "matchScore": 0.85 }
      ],
      "estimatedCost": 12,
      "estimatedTime": "1 day"
    }
  ]
}
```

---

## Environment Variables

```bash
# Salar OS
SALAR_PORT=4710
SALAR_MONGO_URI=mongodb://localhost:27017/salaros

# Sutar OS
SUTAR_DECISION_URL=http://localhost:4240

# CorpID
CORPID_SERVICE_URL=http://localhost:4702
```

---

## The Moat

> **Nobody else is building this.**

| Platform | Has |
|----------|-----|
| LinkedIn | Human profiles only |
| Workday | Human records only |
| Glean | Enterprise search only |
| **Salar** | **Human + Agent + Hybrid Twins** |

This is the defining feature of Salar OS.

---

## Related Documents

- [SALAR-OS-ARCHITECTURE.md](./SALAR-OS-ARCHITECTURE.md)
- [SALAR-SUTAR-INTEGRATION.md](./SALAR-SUTAR-INTEGRATION.md)
- [HOJAI-AI-AUDIT.md](./HOJAI-AI-AUDIT.md)
