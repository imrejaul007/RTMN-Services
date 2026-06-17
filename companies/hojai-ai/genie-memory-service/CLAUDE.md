# Genie Memory OS - Developer Guide

**Version:** 2.1.0  
**Last Updated:** June 17, 2026  
**Port:** 4703

---

## Overview

Genie Memory OS is a personal intelligence platform that provides AI-powered memory and context for the RTMN ecosystem. It follows the principle **"Twins are views, not stores"** — twins are read-only views into a unified Context Graph.

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
| **Productivity Twin** | Tasks | tasks, habits, focus patterns |
| **Communication Twin** | Messages | writing style, channels, relationships |
| **Environment Twin** | Context | devices, locations, routines |
| **AI Twin** | Settings | reasoning style, workflows, agents |

---

## Twin Service Files

| Twin | File |
|------|------|
| **KnowledgeTwin** | `src/services/knowledgeTwin.ts` |
| **ProductivityTwin** | `src/services/productivityTwin.ts` |
| **CommunicationTwin** | `src/services/communicationTwin.ts` |
| **EnvironmentTwin** | `src/services/environmentTwin.ts` |
| **AITwin** | `src/services/aiTwin.ts` |

---

## Core Services

| Service | File | Purpose |
|---------|------|---------|
| Context Graph | `src/services/contextGraph.ts` | Unified knowledge graph (18 entities, 18 relationships) |
| Context Engine | `src/services/contextEngine.ts` | Structured context building |
| Timeline API | `src/services/timeline.ts` | Universal timeline |
| AI Orchestrator | `src/services/aiOrchestrator.ts` | Intent handling |
| Memory Intelligence | `src/services/memoryIntelligence.ts` | Semantic memory |
| Event Bus | `src/services/eventBus.ts` | Pub/Sub |

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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/context/:userId` | GET | Get structured context |
| `/api/timeline/:userId` | GET | Get timeline |
| `/api/memory/:userId` | GET | Get memories |
| `/api/twin/:userId` | GET | Get all twins |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Service port (default: 4703) |
| `MONGODB_URI` | MongoDB connection |
| `JWT_SECRET` | JWT signing secret |

---

*Genie Memory OS v2.1.0 - 10 Twins for Personal Intelligence*
