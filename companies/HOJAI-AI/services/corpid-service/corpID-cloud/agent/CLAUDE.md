# AI Agent Identity

**Service:** AI Agent Management
**Port:** 4702 (via gateway)
**Prefix:** `/api/agents`

---

## Overview

The AI Agent Identity service manages identities for AI agents across the HOJAI AI suite. It provides capability management, trust scoring, and lifecycle management for autonomous agents.

## Features

- **Agent Profiles:** Name, type, category, version
- **11 Capabilities:** Web search, code execution, file ops, payments, etc.
- **Trust Scoring:** 0-100 score with risk levels
- **Memory Access Control:** Short-term, long-term, episodic
- **Behavior Profiles:** Personality, communication style
- **Learning Configuration:** What to learn from
- **Rate Limits:** Per-agent limits
- **API Keys:** Agent authentication
- **Interaction Tracking:** Usage and success metrics
- **Lifecycle:** Active, paused, deprecated

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/capabilities` | Get available capabilities |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents` | List my agents |
| GET | `/api/agents/:id` | Get agent details |
| GET | `/api/agents/by-agent-id/:agentId` | Get by agentId |
| PUT | `/api/agents/:id` | Update agent |
| PUT | `/api/agents/:id/trust` | Update trust score (admin) |
| POST | `/api/agents/:id/interactions` | Record interaction |
| GET | `/api/agents/:id/interactions` | Get interaction history |
| POST | `/api/agents/:id/pause` | Pause agent |
| POST | `/api/agents/:id/resume` | Resume agent |
| POST | `/api/agents/:id/deprecate` | Deprecate agent |

## Agent Types

| Type | Description |
|------|-------------|
| `assistant` | Interactive assistant (e.g., Genie) |
| `autonomous` | Self-directed agent |
| `hybrid` | Mix of assistant and autonomous |
| `webhook` | Event-driven agent |

## Categories

| Category | Use Case |
|----------|----------|
| `personal` | Personal assistants |
| `business` | Business productivity |
| `system` | System-level agents |
| `customer-service` | Customer support |

## Available Capabilities

| Capability | Risk Level | Description |
|------------|------------|-------------|
| `web-search` | Low | Search the web |
| `code-execution` | Medium | Execute code |
| `file-read` | Low | Read files |
| `file-write` | Medium | Write files |
| `email-send` | High | Send emails |
| `sms-send` | High | Send SMS |
| `payment-initiate` | Critical | Initiate payments |
| `user-data-access` | High | Access user data |
| `admin-actions` | Critical | Administrative actions |
| `memory-access` | Medium | Access memory |
| `external-api` | Medium | Call external APIs |

## Usage Example

```bash
# Create agent
curl -X POST http://localhost:4702/api/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "genie-primary",
    "name": "Genie",
    "type": "assistant",
    "category": "personal",
    "capabilities": ["web-search", "memory-access"]
  }'

# Update trust score (admin)
curl -X PUT http://localhost:4702/api/agents/AGENT_ID/trust \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 85,
    "flags": []
  }'

# Pause agent
curl -X POST http://localhost:4702/api/agents/AGENT_ID/pause \
  -H "Authorization: Bearer $TOKEN"
```

## Trust Scoring

| Score | Grade | Risk Level |
|-------|-------|------------|
| 80-100 | very_high | low |
| 60-79 | high | medium |
| 40-59 | medium | high |
| 20-39 | low | critical |
| 0-19 | very_low | critical |

## File Structure

```
agent/
├── src/
│   ├── models/
│   │   └── agent.model.js
│   └── routes/
│       └── agent.routes.js
└── CLAUDE.md
```
