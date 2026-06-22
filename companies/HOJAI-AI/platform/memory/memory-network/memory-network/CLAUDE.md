# RTMN Memory Network

**Version:** 1.0.0  
**Updated:** June 14, 2026  
**Status:** ✅ BUILT  
**Port:** 3015

## Overview

The Memory Network provides hierarchical memory architecture for RTMN, enabling Personal/Business/Industry/Ecosystem/Agent memory with federation and synchronization.

## Memory Tiers

| Tier | Level | Description | Example |
|------|-------|-------------|---------|
| Personal | 1 | Individual user memories | User preferences, conversation history |
| Business | 2 | Company-wide context | Company policies, team knowledge |
| Industry | 3 | Industry knowledge | Best practices, market trends |
| Ecosystem | 4 | Cross-company context | Cross-industry patterns, network insights |
| Agent | 5 | AI agent memories | Agent capabilities, learned skills |

## Hierarchy Flow

```
personal → business → industry → ecosystem → agent
```

## Key Features

### 1. Tier-Specific Memory
- Personal memory (user-specific)
- Business memory (company-wide)
- Industry memory (shared within industry)
- Ecosystem memory (RTMN-wide)
- Agent memory (AI agent memories)

### 2. Memory Types
| Type | Description |
|------|-------------|
| episodic | Events and experiences |
| semantic | Facts and knowledge |
| procedural | Skills and processes |
| relational | Relationships and connections |

### 3. Privacy Levels
| Level | Access |
|-------|--------|
| private | Only owner |
| team | Team members |
| company | Company-wide |
| industry | Industry-wide |
| public | Everyone |

### 4. Federation
- Cross-tier search
- Context aggregation
- Related memory discovery

### 5. Synchronization
- Tier-to-tier sync
- Auto-sync rules
- Sync history tracking

## File Structure

```
core/memory-network/
├── package.json
├── src/
│   ├── index.js
│   └── routes/
│       ├── memory.js
│       ├── tiers.js
│       ├── federation.js
│       └── sync.js
```

## Quick Start

```bash
cd core/memory-network
npm install
npm start
```

## API Endpoints

### Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/memory/:tier` | Store memory |
| GET | `/api/memory/:ownerId` | Get memories |
| GET | `/api/memory/memory/:id` | Get by ID |
| PUT | `/api/memory/memory/:id` | Update |
| DELETE | `/api/memory/memory/:id` | Delete |
| POST | `/api/memory/search` | Search |
| GET | `/api/memory/stats/:ownerId` | Statistics |

### Tiers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tiers` | Get hierarchy |
| POST | `/api/tiers/personal` | Personal memory |
| POST | `/api/tiers/business` | Business memory |
| POST | `/api/tiers/industry` | Industry memory |
| POST | `/api/tiers/ecosystem` | Ecosystem memory |
| POST | `/api/tiers/agent` | Agent memory |
| POST | `/api/tiers/propagate` | Propagate up |

### Federation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/federation/search` | Cross-tier search |
| GET | `/api/federation/context/:ownerId` | Get context |
| POST | `/api/federation/aggregate` | Aggregate |
| GET | `/api/federation/related/:memoryId` | Related |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync` | Sync memory |
| POST | `/api/sync/bulk` | Bulk sync |
| GET | `/api/sync/history/:ownerId` | Sync history |
| DELETE | `/api/sync/revert/:id` | Revert |
| POST | `/api/sync/auto` | Auto-sync |

## Environment

```
PORT=3015
REDIS_URL=redis://localhost:6379
```
