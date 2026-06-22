# HOJAI Prospect Context Service

## One Brain for ALL AI Agents

Every AI agent in the REZ ecosystem now has unified context about every prospect/user. When one agent interacts with a prospect, all other agents instantly know.

**Port:** 4550

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROSPECT CONTEXT HUB (Port 4550)                 │
├─────────────────────────────────────────────────────────────────────┤
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│   │ Sales Agent│  │Support Agent│  │ Voice Agent │               │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │
│          └────────────────┼────────────────┘                        │
│                           │                                         │
│                    ┌──────▼──────┐                                  │
│                    │   UNIFIED   │                                  │
│                    │   CONTEXT   │                                  │
│                    └──────┬──────┘                                  │
│                           │                                         │
│          ┌────────────────┼────────────────┐                       │
│          ▼                ▼                ▼                        │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│   │  HOJAI AI   │  │  CorpPerks  │  │  AssetMind  │               │
│   └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
cd hojai-ai/hojai-prospect-context-service
npm install
npm run dev
```

**Health Check:**
```bash
curl http://localhost:4550/health
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prospect/:id/context` | Get full prospect context |
| `GET` | `/api/prospect/:id/agent-context/:type` | Get agent-formatted context |
| `POST` | `/api/prospect/:id/context` | Update prospect context |
| `GET` | `/api/prospects/search` | Search prospects |
| `GET` | `/api/prospects/ids` | Get all prospect IDs |

---

## 🔌 SDK Usage

```typescript
import { createProspectContext } from './sdk';

const context = createProspectContext();

// Get context for any prospect
const prospect = await context.getContext('prospect-123', 'sales-agent');

// Update context after interaction
await context.recordInteraction('prospect-123', {
  source: 'sales-agent',
  type: 'chat',
  summary: 'Discussed pricing options',
  sentiment: 'positive',
  outcome: 'interested',
});

// Search prospects
const hotProspects = await context.searchProspects({ minEngagement: 70 });
```

---

## 🤖 Agent Types

| Agent | Type | Context Shared |
|-------|------|---------------|
| Sales Agent | 💼 | Full prospect history, interests, budget |
| Support Agent | 🎧 | Previous tickets, what sales promised |
| Voice Agent | 🎤 | Call history, speaking preferences |
| Marketing Agent | 📢 | Campaign interactions, segments |
| Chat Agent | 💬 | Conversation summaries |

---

## 📊 Schema

```typescript
interface ProspectContext {
  identity: {
    prospectId: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    title: string;
    location: string;
  };
  journey: {
    firstSeen: Date;
    lastSeen: Date;
    interactionCount: number;
    touchpoints: Touchpoint[];
    segments: string[];
    tags: string[];
  };
  context: {
    interests: string[];
    painPoints: string[];
    budget: string;
    timeline: string;
    history: string[];
  };
  agentMemory: {
    agentInteractions: AgentMemory[];
  };
  engagement: {
    score: number;  // 0-100
    nextAction: string;
    lastEngaged: Date;
  };
}
```

---

## 🔗 Connected Services

| Service | Port | Data Enriched |
|---------|------|--------------|
| HOJAI Memory | 4540 | Personal memories, preferences |
| HOJAI Knowledge Graph | 4786 | Entity relationships |
| CorpPerks CRM | 4748 | Customer records |
| AdBazaar CDP | 4961 | Marketing segments |
| AssetMind | 5001 | Financial profile |

---

## Features

1. **Unified Context** - Single source of truth for all prospect data
2. **Agent Memory** - Each AI agent's learnings preserved
3. **Real-time Updates** - SSE for live context changes
4. **Enrichment** - Pulls from 10+ ecosystem services
5. **Engagement Scoring** - Automatic score based on interactions
6. **Privacy Compliant** - GDPR consent tracking

---

**Built:** June 2026
**Version:** 1.0.0
**Port:** 4550