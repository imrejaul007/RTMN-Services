# TwinOS Hub - Digital Twins Orchestrator

**Version:** 3.0.0  
**Port:** 4705  
**Status:** ✅ RUNNING | **June 19, 2026**  
**Upgrade:** v2.0.0 → v3.0.0 — Full HOJAI 3-pillar spec compliance

---

## Overview

TwinOS Hub is the central orchestrator for all **Digital Twins** in the RTMN ecosystem. It manages Personal, Financial, Health, Relationship, and 70+ other twin types across 15 categories, and now provides the complete HOJAI 3-pillar "Digital Representation & Identity" feature set: identity, profile, context, state, lifecycle, timeline, goals, knowledge references, collaboration, simulation, and analytics.

TwinOS is one of the **3 foundational pillars of HOJAI AI**:
- **TwinOS** = Digital Representation & Identity Layer ("What am I?")
- **MemoryOS** = Knowledge & Experience Layer ("What do I know?")
- **SkillOS** = Capability Layer ("What can I do?")

---

## What's New in v3.0

The v3.0 release closes all gaps against the HOJAI 3-pillar TwinOS spec. All 13 spec features are now implemented.

### Feature Coverage (HOJAI Spec vs Implementation)

| # | Feature (HOJAI Spec) | Status | Implementation |
|---|----------------------|--------|----------------|
| 1 | Universal Twin Management | ✅ | 70 canonical twins across 15 categories |
| 2 | Twin Identity (TwinID, CorpID, Namespace, Tenant, etc.) | ✅ | `twinIdentity` Map + `/api/twins/:id/identity` |
| 3 | Twin Profile (basicInfo, attributes, configuration, properties, dynamicFields, tags, labels) | ✅ | `twinProfiles` Map + `/api/twins/:id/profile` |
| 4 | Twin Relationship Graph (owns, belongs_to, manages, ...) | ✅ | `twinRelationships` Map + `/api/relationships` + `/api/relationships/graph/:twinId` |
| 5 | Twin Context Engine (Home, Office, Working, Driving, ...) | ✅ | `twinContexts` Map + `/api/twins/:id/context` |
| 6 | Twin State Engine (active, idle, busy, suspended, deleted, archived, pending) | ✅ | `twinLifecycles` Map + `/api/twins/:id/lifecycle` |
| 7 | Twin Lifecycle (Create, Activate, Update, Merge, Split, Archive, Restore, Delete) | ✅ | CRUD + `/api/twins/:id/archive` + `/restore` + `/merge` + `/split` |
| 8 | Twin Timeline (Created, Updated, Actions, Decisions, Events, State changes) | ✅ | `twinTimelines` Map + `/api/twins/:id/timeline` (GET + POST) |
| 9 | Twin Goals (Objectives, KPIs, Mission, Targets, Preferences) | ✅ | `twinGoals` Map + `/api/twins/:id/goals` (GET, POST, PATCH, DELETE) |
| 10 | Twin Knowledge References (Memory, Documents, Policies, Skills, Workflows) | ✅ | `twinKnowledgeRefs` Map + `/api/twins/:id/knowledge` |
| 11 | Twin Collaboration (Person↔Person, Person↔Business, Business↔Business, AI↔AI, Asset↔Business) | ✅ | `twinCollaborations` Map + `/api/twins/:id/collaborations` |
| 12 | Twin Simulation (Future state, Impact, Growth, Decision outcome) | ✅ | `twinSimulations` Map + `/api/twins/:id/simulate` |
| 13 | Twin Analytics (Activity, Growth, Usage, Relationship health) | ✅ | `twinAnalytics` Map + `/api/twins/:id/analytics` + `/api/analytics` |

**13/13 features complete — 100% of HOJAI 3-pillar spec met.**

---

## Architecture

```
services/twinos-hub/
├── src/
│   └── index.js              # Twin orchestration v3.0 (in-memory)
├── package.json
├── docs/
│   ├── TWINOS_ARCHITECTURE.md
│   └── README.md
└── CLAUDE.md
```

### In-Memory Data Stores (v3.0)

| Store | Purpose |
|-------|---------|
| `twinRegistry` | Master twin records (CRUD) |
| `twinStates` | Runtime state data blob |
| `twinRelationships` | Edges in the relationship graph |
| `twinIdentity` | TwinID, CorpID link, entityType, namespace, tenant, ownership |
| `twinProfiles` | basicInfo, attributes, configuration, properties, dynamicFields, tags, labels |
| `twinContexts` | Current context (Home, Office, ...) + history |
| `twinLifecycles` | State machine (active/idle/busy/suspended/deleted/archived/pending) + history |
| `twinTimelines` | Append-only event log (created, updated, action, decision, event, state_change, ...) |
| `twinGoals` | Objectives, KPIs, mission, targets, preferences, deadline |
| `twinKnowledgeRefs` | Links to memory / documents / policies / skills / workflows / knowledge_objects |
| `twinCollaborations` | Person↔Person, Person↔Business, Business↔Business, AI↔AI, Asset↔Business |
| `twinSimulations` | What-if scenarios with impact, growth, decisionOutcome |
| `twinAnalytics` | Per-twin activity, growth, usage, relationshipHealth |
| `mergeLog` | Tracks which twins were merged into which |
| `syncEvents` | Sync history (from v2) |
| `businessRegistry` | Business scoping (from v2) |
| `users` / `sessions` | Auth (from v2) |

---

## Twin Types

### Core Twins (5)

| Twin | ID Pattern | Data Tracked |
|------|------------|--------------|
| Personal Twin | `personal_{userId}` | Profile, preferences, goals, timeline |
| Financial Twin | `financial_{userId}` | Accounts, transactions, budgets, net worth |
| Health Twin | `health_{userId}` | Vitals, activity, sleep, mood, medications |
| Relationship Twin | `relationship_{userId}` | People, interactions, intimacy, trust scores |
| Founder Twin | `founder_{userId}` | Ventures, KPIs, customers, team, decisions |

### Specialized Twins (70+ across 15 categories)

Foundation, Commerce, People, AI/Memory, Hospitality, Healthcare, Finance, Marketing, Operations, Real Estate, HR, Event, Travel, Business, Personal.

See `docs/TWINOS_ARCHITECTURE.md` for the full registry.

---

## API Endpoints

All endpoints prefixed with `/api/...`. Auth: `requireAuth` (JWT) or `optionalAuth`. Writes use `strictLimiter`. The hub runs on port **4705** in-memory.

### Twin CRUD (preserved from v2)
```
POST   /api/twins                     # Create twin (now also seeds v3.0 sub-stores)
GET    /api/twins                     # List twins (filter: category, type, status, service, search, businessId)
GET    /api/twins/:id                 # Get twin (with state + relationships)
PUT    /api/twins/:id                 # Update twin metadata
DELETE /api/twins/:id                 # Unregister twin
GET    /api/twins/:id/state           # Get runtime state
PUT    /api/twins/:id/state           # Update runtime state
```

### v3.0: Twin Identity
```
GET    /api/twins/:id/identity        # Identity block (TwinID, CorpID link, entityType, namespace, tenant, ownership)
PUT    /api/twins/:id/identity        # Update identity fields
```

### v3.0: Twin Profile
```
GET    /api/twins/:id/profile         # basicInfo, attributes, configuration, properties, dynamicFields, tags, labels
PUT    /api/twins/:id/profile         # Replace or merge (body: { ..., merge: true })
```

### v3.0: Twin Context Engine
```
GET    /api/twins/:id/context         # Current context (Home/Office/Working/Driving/...) + history
PUT    /api/twins/:id/context         # Set context (body: { context, reason? })
```
Valid contexts: `home, office, shopping, working, vacation, driving, meeting, emergency, online, offline, unknown`

### v3.0: Twin Lifecycle / State Engine
```
GET    /api/twins/:id/lifecycle       # Current state + transition history
PUT    /api/twins/:id/lifecycle       # Transition state (body: { state, reason? })
POST   /api/twins/:id/archive         # Soft-delete (archive)
POST   /api/twins/:id/restore         # Restore from archived/suspended to active
POST   /api/twins/:targetId/merge     # Merge N source twins INTO target
POST   /api/twins/:id/split           # Split into N new twins
```
Valid states: `active, idle, busy, suspended, deleted, archived, pending`

### v3.0: Twin Timeline
```
GET    /api/twins/:id/timeline        # List events (filter: ?type=created,updated&limit=50)
POST   /api/twins/:id/timeline        # Append manual event (type, payload)
```
Valid event types: `created, updated, action, decision, event, state_change, sync, context_change, goal_change, collaboration, merge, split, archive, restore, delete`

### v3.0: Twin Goals
```
GET    /api/twins/:id/goals           # List goals
POST   /api/twins/:id/goals           # Create goal (objective, kpis[], targets, preferences, deadline)
PATCH  /api/twins/:id/goals/:goalId   # Update goal (progress, kpis, status, etc.)
DELETE /api/twins/:id/goals/:goalId   # Delete goal
```

### v3.0: Twin Knowledge References
```
GET    /api/twins/:id/knowledge       # List knowledge refs (filter: ?kind=memory,document)
POST   /api/twins/:id/knowledge       # Link a knowledge object (kind, refId, refType?, refService?, label?)
DELETE /api/twins/:id/knowledge/:refId  # Unlink
```
Valid kinds: `memory, document, policy, skill, workflow, knowledge_object`

### v3.0: Twin Collaboration
```
GET    /api/twins/:id/collaborations          # List collaborations (filter: ?kind=person-person)
POST   /api/twins/:id/collaborations          # Add collaboration (partnerTwinId, kind, metadata?)
DELETE /api/twins/:id/collaborations/:collabId  # Remove
```
Valid kinds: `person-person, person-business, business-business, ai-ai, asset-business, person-asset`
(Mirrors are auto-created on the partner side.)

### v3.0: Twin Simulation
```
POST   /api/twins/:id/simulate        # Run what-if (body: { scenario, parameters?, horizonDays? })
GET    /api/twins/:id/simulations     # List simulations
```

### v3.0: Twin Analytics
```
GET    /api/twins/:id/analytics       # Per-twin analytics (activity, growth, usage, relationshipHealth, ...)
GET    /api/analytics                 # Hub-wide analytics rollup
```

### v3.0: Relationship Graph (extended)
```
GET    /api/relationships             # List (existing)
POST   /api/relationships             # Create (existing)
PUT    /api/relationships/:id         # Update type/metadata
DELETE /api/relationships/:id         # Delete (existing)
GET    /api/relationships/graph/:twinId  # BFS walk (depth, type filter)
GET    /api/relationships/types       # Valid type vocabulary
```

### Sync (preserved from v2)
```
POST   /api/sync/:id
POST   /api/sync
GET    /api/sync/history
```

### Stats & Discovery (preserved from v2)
```
GET    /api/stats
GET    /api/categories
GET    /api/services
```

### Health
```
GET    /health
GET    /ready
```

---

## Example Usage

### Create a twin (now seeds v3.0 sub-stores)
```bash
curl -X POST http://localhost:4705/api/twins \
  -H "Content-Type: application/json" \
  -d '{
    "id": "person.alice",
    "name": "Alice",
    "service": "user-twin",
    "type": "person",
    "category": "people",
    "attributes": { "age": 30, "city": "Mumbai" },
    "tags": ["vip", "premium"]
  }'
```

### Set context, add a goal, run a simulation
```bash
# Context
curl -X PUT http://localhost:4705/api/twins/person.alice/context \
  -H "Content-Type: application/json" \
  -d '{ "context": "working", "reason": "started work day" }'

# Goal
curl -X POST http://localhost:4705/api/twins/person.alice/goals \
  -H "Content-Type: application/json" \
  -d '{ "objective": "Run 5km daily", "kpis": [{ "name": "runs", "target": 30, "current": 0 }] }'

# Simulate
curl -X POST http://localhost:4705/api/twins/person.alice/simulate \
  -H "Content-Type: application/json" \
  -d '{ "scenario": "double running frequency", "horizonDays": 30 }'
```

### Walk the relationship graph
```bash
curl 'http://localhost:4705/api/relationships/graph/person.alice?depth=2'
```

### Per-twin analytics
```bash
curl http://localhost:4705/api/twins/person.alice/analytics
```

---

## Environment Variables

```env
PORT=4705
```

---

## Quick Start

```bash
cd services/twinos-hub
npm install
npm start

# Health check (returns v3.0 with feature list and stats)
curl http://localhost:4705/health
```

---

*Last Updated: June 19, 2026*  
*RTMN TwinOS Platform v3.0.0 — Full HOJAI 3-pillar spec compliance*
