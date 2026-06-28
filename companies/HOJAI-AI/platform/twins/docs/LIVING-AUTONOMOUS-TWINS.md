# TwinOS Living Autonomous Twins — Complete Architecture
**Version:** 1.0  
**Date:** June 28, 2026

---

## Overview

TwinOS has evolved from a **registry-centric digital twin platform** to a **Living Autonomous Twins** platform with integrated intelligence, learning, and execution capabilities.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CorpID (4702)                                       │
│                         Universal Identity + Consent                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            MemoryOS (26 services)                                   │
│                                                                                  │
│  Episodic · Semantic · Procedural · Working ← NEW                                │
│  Social · Emotional · Organizational                                              │
│                                                                                  │
│  MemoryOS (4703) · Confidence (4152) · Context (4793) · Intelligence (4786)     │
│  Learning Engine (4788) · Temporal (4784) · Relationships (4790)                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TwinOS Hub (4705)                                       │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │              Intelligence Layer Endpoints (v3.1)                        │   │
│  │                                                                   │   │
│  │  GET  /api/intelligence/services         — List services             │   │
│  │  POST /api/intelligence/analyze/:twinId  — Full analysis            │   │
│  │  GET  /api/intelligence/behavior/:twinId — Behavior profile         │   │
│  │  GET  /api/intelligence/working-memory/:twinId — Working memory     │   │
│  │  GET  /api/intelligence/procedural/:twinId — Skills/workflows       │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Core Registry · Identity · Relationships · Context · Lifecycle · Timeline         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  Intelligence     │     │  Commerce Twins   │     │  Employee Twins   │
│  ─────────────    │     │  ─────────────   │     │  ─────────────   │
│                   │     │                   │     │                   │
│  Orchestrator 4715│     │  Customer  4895   │     │  Employee  4730  │
│  Behavior    4718 │     │  Order     4885   │     │  Learning   4735  │
│  Learning    4735 │     │  Wallet    4896   │     │  Feedback   4736  │
│  Execution   4737 │     │  Payment   4886   │     │  Execution  4737  │
│                   │     │                   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Memory Extensions (NEW)                                      │
│                                                                                  │
│  twin-working-memory (4724)  — Short-term context, priority queue                │
│  memory-procedural (4725)   — Skills, workflows, habits, routines                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## New Services Added (June 28, 2026)

### 1. Twin Intelligence Orchestrator (4715)

**Purpose:** Unified orchestration layer connecting all intelligence services

**Features:**
- Coordinates reasoning, prediction, behavior, learning
- Unified twin analysis
- Cross-twin reasoning
- Learning loop management

**Endpoints:**
```
POST /api/orchestrator/analyze     — Full twin analysis
POST /api/orchestrator/reason      — Cross-twin reasoning
POST /api/orchestrator/learn       — Record learning
POST /api/orchestrator/predict    — Generate predictions
GET  /api/orchestrator/services   — Service health
```

**Tests:** 20 passing

---

### 2. Twin Behavior Model (4718)

**Purpose:** Behavior learning and pattern detection

**Features:**
- Pattern capture and detection
- Preference learning
- Anomaly detection
- Routine identification
- Personality modeling
- Communication style analysis

**Endpoints:**
```
POST /api/behavior/observe          — Record behavior event
GET  /api/behavior/profile/:twinId — Get behavior profile
POST /api/behavior/patterns       — Detect patterns
POST /api/behavior/anomalies      — Detect anomalies
POST /api/behavior/preferences    — Learn preferences
```

**Tests:** 20 passing

---

### 3. Twin Working Memory (4724)

**Purpose:** Short-term context for digital twins

**Features:**
- Priority-based memory items
- TTL expiration (default 30 min)
- FIFO stack for pending items
- Focus tracking

**Endpoints:**
```
POST /api/working/:twinId          — Set context
GET  /api/working/:twinId          — Get context
POST /api/working/:twinId/push    — Push item
POST /api/working/:twinId/pop     — Pop item
DELETE /api/working/:twinId        — Clear memory
```

**Tests:** 7 passing

---

### 4. Memory Procedural (4725)

**Purpose:** Skills, workflows, habits, routines

**Features:**
- Skill tracking with mastery levels
- Workflow definitions
- Habit tracking with streaks
- Routine management

**Endpoints:**
```
GET  /api/procedural/:twinId/skills     — List skills
POST /api/procedural/:twinId/workflows  — Create workflow
POST /api/procedural/:twinId/habits     — Create habit
POST /api/procedural/:twinId/routines   — Create routine
GET  /api/procedural/:twinId/summary   — Get summary
```

**Tests:** 8 passing

---

## TwinOS Hub Intelligence Endpoints (v3.1)

### GET /api/intelligence/services
Returns list of configured intelligence services.

```json
{
  "success": true,
  "services": [
    { "name": "orchestrator", "url": "http://localhost:4715", "status": "configured" },
    { "name": "behavior", "url": "http://localhost:4718", "status": "configured" },
    ...
  ],
  "count": 6
}
```

### POST /api/intelligence/analyze/:twinId
Full twin analysis via Intelligence Orchestrator.

```json
{
  "success": true,
  "twinId": "employee-123",
  "analysis": {
    "intelligence": {
      "behavior": { "patterns": [...], "preferences": {...} },
      "predictions": { "churnRisk": 0.15, "ltvScore": 12500 },
      "reasoning": { "recentDecisions": [...] },
      "learning": { "skills": [...], "gaps": [...] }
    },
    "recommendations": [...],
    "confidence": 0.82
  }
}
```

### GET /api/intelligence/behavior/:twinId
Get behavior profile from Behavior Model.

### GET /api/intelligence/working-memory/:twinId
Get working memory state.

### GET /api/intelligence/procedural/:twinId
Get skills, workflows, and habits.

---

## Service Ports

| Service | Port | Category |
|---------|------|----------|
| **TwinOS Hub** | 4705 | Core |
| MemoryOS | 4703 | Foundation |
| CorpID | 4702 | Identity |
| **Intelligence Orchestrator** | 4715 | Intelligence (NEW) |
| **Behavior Model** | 4718 | Intelligence (NEW) |
| **Working Memory** | 4724 | Memory (NEW) |
| **Procedural Memory** | 4725 | Memory (NEW) |
| Employee Twin | 4730 | People |
| Twin Learning OS | 4735 | Employee |
| Twin Feedback OS | 4736 | Employee |
| Twin Execution OS | 4737 | Employee |
| Customer Twin | 4895 | Commerce |
| Order Twin | 4885 | Commerce |
| Wallet Twin | 4896 | Commerce |

---

## Startup Script

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins

# Start all 15 TwinOS services
./start-all.sh start

# Check status
./start-all.sh status

# View logs
./start-all.sh logs

# Stop
./start-all.sh stop
```

---

## Test Summary

| Service | Tests |
|---------|-------|
| twin-intelligence-orchestrator | 20 ✅ |
| twin-behavior-model | 20 ✅ |
| twin-working-memory | 7 ✅ |
| memory-procedural | 8 ✅ |
| **Total** | **55 ✅** |

---

## Files Changed

| File | Change |
|------|--------|
| `twinos-hub/src/index.js` | Added INTELLIGENCE_SERVICES + 5 new endpoints |
| `twinos-hub/src/index.js` | Added Intelligence Twin definitions to TWIN_DEFINITIONS |
| `start-all.sh` | Updated to include 15 services |
| `twin-intelligence-orchestrator/` | NEW service |
| `twin-behavior-model/` | NEW service |
| `twin-working-memory/` | NEW service |
| `memory-procedural/` | NEW service |

---

## Next Steps

1. **Wire to TwinOS Hub** — Services already wired via `/api/intelligence/*` endpoints
2. **Add tests** — Integration tests for intelligence layer
3. **Documentation** — API docs for all endpoints
4. **Monitoring** — Health dashboards for intelligence services

---

*Version 1.0 — June 28, 2026*
