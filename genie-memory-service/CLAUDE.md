# Genie Memory OS - Developer Guide

**Version:** 2.1.0  
**Last Updated:** June 17, 2026  
**Port:** 4703

---

## Overview

Genie Memory OS is a personal intelligence platform that provides AI-powered memory and context for the RTMN ecosystem. It follows the principle **"Twins are views, not stores"** — twins are read-only views into a unified Context Graph.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GENIE MEMORY OS v2.1                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  USER INPUT → AI ORCHESTRATOR → CONTEXT ENGINE → CONTEXT GRAPH ─────────┐   │
│                                        │                                  │   │
│                      ┌─────────────────┼─────────────────┐              │   │
│                      ▼                 ▼                 ▼              │   │
│              ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │   │
│              │ 10 Twin     │   │  Timeline   │   │   Memory    │      │   │
│              │ Views       │   │    API     │   │ Intelligence │      │   │
│              │ (Read-only) │   │            │   │             │      │   │
│              └─────────────┘   └─────────────┘   └─────────────┘      │   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The 10 Genie Twins

| Twin | Purpose | Key Data |
|------|---------|----------|
| **Personal Twin** | Identity & traits | name, interests, expertise, preferences |
| **Relationship Twin** | Social network | contacts, interactions, insights |
| **Financial Twin** | Money | accounts, transactions, goals |
| **Health Twin** | Wellness | vitals, fitness, events |
| **Founder Twin** | Ventures | companies, skills, network |
| **Knowledge Twin** | Learning | bookmarks, courses, research, skills |
| **Productivity Twin** | Tasks | tasks, calendar, habits, focus patterns |
| **Communication Twin** | Messages | writing style, channels, relationships |
| **Environment Twin** | Context | devices, locations, routines |
| **AI Twin** | Settings | reasoning style, workflows, agents |

---

## Twin Service Files

| Twin | File | Lines |
|------|------|-------|
| **KnowledgeTwin** | `src/services/knowledgeTwin.ts` | 230+ |
| **ProductivityTwin** | `src/services/productivityTwin.ts` | 400+ |
| **CommunicationTwin** | `src/services/communicationTwin.ts` | 320+ |
| **EnvironmentTwin** | `src/services/environmentTwin.ts` | 200+ |
| **AITwin** | `src/services/aiTwin.ts` | 350+ |

---

## Core Services

### Context Graph

Unified knowledge graph with entities and relationships.

**Entity Types (18):**
- `person`, `company`, `project`, `goal`, `memory`, `conversation`
- `health_event`, `financial_event`, `location`, `document`, `event`, `idea`
- `habit`, `purchase`, `media`, `skill`, `product`, `account`

**Relationship Types (18):**
- `knows`, `works_at`, `founded`, `invested_in`, `collaborates_with`
- `owns`, `created`, `purchased`, `visited`, `scheduled`
- `has_skill`, `participated_in`, `part_of`, `depends_on`, `blocks`, `contributes_to`

### Personal Context Engine

Builds structured context before every AI request:

```typescript
interface StructuredContext {
  persona: { traits, communicationStyle, interests, expertise, preferences };
  situation: { timeOfDay, dayOfWeek, location };
  relationships: { primaryContacts, networkSummary };
  goals: { active, completed };
  memories: { relevance, recency };
  timeline: { today, thisWeek, thisMonth, milestones };
  metadata: { confidence, gaps, sources };
}
```

### Universal Timeline API

Unified view of all events across user's digital life.

### AI Orchestrator v2

```
User Input → Intent Parser → Planner → Context Engine → Reasoner → Verifier → Response
```

### Memory Intelligence

Semantic memory with consolidation, decay, and importance scoring.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api/context/:userId` | GET | Get structured context |
| `/api/timeline/:userId` | GET | Get timeline events |
| `/api/memory/:userId` | GET | Get memories |
| `/api/memory` | POST | Add memory |
| `/api/twin/:userId` | GET | Get all twin views |
| `/api/twin/:userId/:twinName` | GET | Get specific twin |

---

## Quick Start

```bash
cd genie-memory-service
npm install
npm start

# Health check
curl http://localhost:4703/health
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 4703 |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017 |
| `JWT_SECRET` | JWT signing secret | - |

---

## Dependencies

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT authentication
- `winston` - Logging
- `helmet` - Security headers
- `cors` - CORS middleware

---

*Genie Memory OS v2.1.0 - 10 Twins for Personal Intelligence*
