# Agent Twin

Digital twin service for AI agent management within RTMN.

## Overview

Agent Twin manages AI agent profiles, performance metrics, activities, and karma scoring.

## Quick Start

```bash
cd services/agent-twin
npm install
npm run build
npm start
```

## API Endpoints

### Agents
- `GET /api/agents` - List agents
- `GET /api/agents/:id` - Get agent
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Activities
- `POST /api/activities` - Log activity
- `GET /api/activities` - List activities

### Performance
- `GET /api/performance/:agentId` - Get agent performance

## Port

**3011** - Agent Twin Port
