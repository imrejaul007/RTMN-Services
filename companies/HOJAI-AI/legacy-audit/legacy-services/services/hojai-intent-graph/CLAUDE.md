# CLAUDE.md - Intent Graph

## Project Overview

**Name:** hojai-intent-graph
**Type:** SUTAR OS - Intent Processing
**Port:** 4018
**Company:** HOJAI AI
**Part of:** SUTAR OS Phase 6 - Intent Graph
**Lines:** 352
**Status:** ✅ PRODUCTION READY

## What is Intent Graph?

Intent Graph captures, analyzes, and routes all business intents across the RTNM ecosystem. It's the entry point for autonomous agent operations.

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB/Mongoose

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4018 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection |

## Features

### 1. Intent Capture

| Feature | Description |
|---------|-------------|
| **Capture Intents** | Capture intents from various sources (chat, API, voice) |
| **Type Classification** | Classify intents into predefined types |
| **Entity Extraction** | Extract products, services, quantities from text |
| **Urgency Scoring** | Score urgency (0-100) |
| **Budget Constraints** | Track budget requirements |
| **Raw Text Storage** | Store original intent text |

### 2. Intent Types

| Type | Description |
|------|-------------|
| PROCUREMENT | Purchase intents |
| SALES | Selling intents |
| SERVICE | Service requests |
| PARTNERSHIP | Partnership inquiries |
| SUPPORT | Customer support |
| FEEDBACK | Feedback submissions |

### 3. Pattern Recognition

| Feature | Description |
|---------|-------------|
| **Keyword Learning** | Learn significant keywords from intents |
| **Pattern Storage** | Store patterns for future matching |
| **Occurrence Tracking** | Track pattern frequency |
| **Type Categorization** | Patterns tagged by intent type |

### 4. Context Enrichment

| Feature | Description |
|---------|-------------|
| **Historical Context** | Enrich with past intents |
| **Industry Context** | Add industry-specific context |
| **Agent Context** | Include agent profile data |
| **Similar Intent Matching** | Find similar past intents |
| **Recommendations** | Generate recommendations |

### 5. Intent Routing

| Feature | Description |
|---------|-------------|
| **Route to Agents** | Route to appropriate agents/services |
| **Route Tracking** | Track where intent was routed |
| **Routing Timestamp** | Record when routing occurred |

### 6. Status Tracking

| Status | Description |
|--------|-------------|
| captured | Intent just captured |
| processing | Being processed |
| enriched | Context enriched |
| routed | Routed to agent |
| completed | Completed |
| failed | Processing failed |

## API Endpoints

### Intents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/intents` | Capture new intent |
| GET | `/api/intents` | List intents (with filters) |
| GET | `/api/intents/:id` | Get intent details |
| POST | `/api/intents/:id/enrich` | Enrich intent |
| POST | `/api/intents/:id/route` | Route intent |

### Patterns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patterns` | List patterns |
| POST | `/api/patterns` | Create pattern |
| GET | `/api/patterns/:id` | Get pattern |

## Intent Schema

```typescript
interface Intent {
  intentId: string;
  type: IntentType;
  status: IntentStatus;
  rawText: string;
  entities: Entity[];
  urgency: number;          // 0-100
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  quantity?: number;
  unit?: string;
  context: {
    industry?: string;
    location?: string;
    agent?: string;
    previousIntents?: string[];
  };
  routedTo?: string;
  enriched?: {
    patterns: string[];
    similarIntents: string[];
    recommendations: string[];
  };
}
```

## Integration

### Upstream
- Chat interfaces
- Voice assistants
- API clients
- Mobile apps

### Downstream
- SUTAR Agent Network
- SUTAR Negotiation Engine
- SUTAR Discovery Engine

## Health Endpoints

- `GET /health` - Health check
- `GET /health/ready` - Readiness probe (MongoDB)

## File Structure

```
hojai-intent-graph/
├── src/
│   └── index.ts                    # Main server (all-in-one)
├── package.json
├── tsconfig.json
└── CLAUDE.md (this file)
```

## Notes

- Intent Graph is the entry point for SUTAR OS
- Captures all business intents
- Learns patterns automatically
- Routes to appropriate agents
