# Memory Network - Product Features Documentation

**Service:** Memory Network  
**Port:** 3015  
**Location:** `core/memory-network/`  
**Status:** ✅ PRODUCTION READY  
**Last Updated:** June 14, 2026

---

## Overview

The Memory Network provides multi-tier memory infrastructure spanning Personal, Business, Industry, Ecosystem, and Agent memory layers. It enables federated search across tiers and automatic memory synchronization.

---

## Core Features

### 1. Memory Tiers

| Tier | Description | Use Case | Status |
|------|-------------|----------|--------|
| **PERSONAL** | Individual user memories | Personal context | ✅ |
| **BUSINESS** | Company-wide context | Enterprise memory | ✅ |
| **INDUSTRY** | Industry knowledge | Vertical insights | ✅ |
| **ECOSYSTEM** | Cross-company context | Network memory | ✅ |
| **AGENT** | AI agent memories | Agent cognition | ✅ |

### 2. Memory Operations

| Feature | Description | Status |
|---------|-------------|--------|
| **Store Memory** | Save memories with type/tier | ✅ |
| **Retrieve Memory** | Get by ID or criteria | ✅ |
| **Search Memory** | Full-text and semantic search | ✅ |
| **Update Memory** | Modify existing memories | ✅ |
| **Delete Memory** | Remove memories | ✅ |
| **Archive Memory** | Archive old memories | ✅ |

### 3. Federation Engine

| Feature | Description | Status |
|---------|-------------|--------|
| **Cross-Tier Search** | Search across all tiers | ✅ |
| **Tier Aggregation** | Aggregate from multiple tiers | ✅ |
| **Priority Resolution** | Resolve conflicts | ✅ |
| **Cache Management** | Federated result caching | ✅ |

### 4. Synchronization

| Feature | Description | Status |
|---------|-------------|--------|
| **Auto-Sync** | Automatic tier synchronization | ✅ |
| **Sync Rules** | Configurable sync rules | ✅ |
| **Sync History** | Track sync operations | ✅ |
| **Conflict Resolution** | Handle sync conflicts | ✅ |
| **Delta Sync** | Efficient incremental sync | ✅ |

### 5. Memory Types

| Type | Description | Status |
|------|-------------|--------|
| **EPISODIC** | Experiences, events | ✅ |
| **SEMANTIC** | Facts, knowledge | ✅ |
| **PROCEDURAL** | Skills, how-tos | ✅ |
| **RELATIONAL** | Connections | ✅ |

---

## API Endpoints

### Core Operations

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/memory` | Get memory | ✅ |
| POST | `/api/memory` | Store memory | ✅ |
| GET | `/api/memory/:id` | Get specific memory | ✅ |
| PUT | `/api/memory/:id` | Update memory | ✅ |
| DELETE | `/api/memory/:id` | Delete memory | ✅ |
| POST | `/api/memory/search` | Search memories | ✅ |

### Tier Operations

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/tiers` | List all tiers | ✅ |
| GET | `/api/tiers/:tier` | Get tier memories | ✅ |
| POST | `/api/tiers/:tier` | Store to tier | ✅ |
| GET | `/api/tiers/:tier/search` | Search tier | ✅ |

### Federation

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/memory/federate` | Federated search | ✅ |
| GET | `/api/memory/federate/aggregate` | Aggregate across tiers | ✅ |

### Synchronization

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/memory/sync` | Sync memories | ✅ |
| GET | `/api/memory/sync/history` | Get sync history | ✅ |
| POST | `/api/memory/sync/resolve` | Resolve conflicts | ✅ |

---

## File Structure

```
memory-network/
├── src/
│   ├── index.js              # Main entry point
│   ├── config.js            # Configuration
│   └── routes/
│       ├── memory.js         # Core memory routes
│       ├── tiers.js          # Tier operations
│       ├── federation.js      # Federation engine
│       └── sync.js           # Synchronization
├── package.json
├── Dockerfile
├── README.md
└── CLAUDE.md
```

---

## Quick Start

```bash
# Start service
cd core/memory-network
npm install
npm start

# Health check
curl http://localhost:3015/health

# Store personal memory
curl -X POST http://localhost:3015/api/memory \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "PERSONAL",
    "type": "EPISODIC",
    "content": "Customer prefers Italian cuisine",
    "tags": ["preference", "food"]
  }'

# Store business memory
curl -X POST http://localhost:3015/api/tiers/BUSINESS \
  -d '{"content": "New menu launched", "source": "restaurant_123"}'

# Federated search
curl -X POST http://localhost:3015/api/memory/federate \
  -d '{"query": "customer preferences", "tiers": ["PERSONAL", "BUSINESS"]}'
```

---

## Use Cases

### 1. Personal Assistant Memory
Store and retrieve personal context across sessions.

### 2. Enterprise Knowledge Base
Company-wide knowledge management.

### 3. AI Agent Context
Provide agents with persistent context.

### 4. Cross-Industry Insights
Aggregate knowledge across industries.

---

## Integration Points

| Service | Integration | Purpose |
|---------|-------------|---------|
| CorpID | Entity linking | Associate memories with entities |
| Genie | Personal memory | Genie AI memory layer |
| Business Copilot | Context | AI context for decisions |

---

*Last Updated: June 14, 2026*
