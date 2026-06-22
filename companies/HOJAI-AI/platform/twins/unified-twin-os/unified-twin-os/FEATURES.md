# Unified Twin OS - Product Features Documentation

**Service:** Unified Twin OS  
**Port:** 3014  
**Location:** `core/unified-twin-os/`  
**Status:** ✅ PRODUCTION READY  
**Last Updated:** June 14, 2026

---

## Overview

The Unified Twin OS provides cross-industry digital twin federation, enabling seamless twin management across all 24 industry verticals. It supports Human, Business, Asset, Market, and Agent twin types with comprehensive relationship tracking and inheritance.

---

## Core Features

### 1. Twin Taxonomy

| Feature | Description | Status |
|---------|-------------|--------|
| **Twin Types** | Support for 5 primary twin types | ✅ |
| **Type Hierarchy** | Hierarchical type organization | ✅ |
| **Custom Types** | Industry-specific twin types | ✅ |
| **Type Validation** | Validate twin against type schema | ✅ |
| **Type Discovery** | Browse available twin types | ✅ |

### 2. Twin Types

#### HUMAN Twin Types
| Type | Description |
|------|-------------|
| **Customer** | End customers across industries |
| **Employee** | Staff members |
| **Patient** | Healthcare patients |
| **Guest** | Hotel/hospitality guests |
| **Member** | Fitness/club members |
| **Student** | Educational records |
| **Driver** | Delivery/ride drivers |

#### BUSINESS Twin Types
| Type | Description |
|------|-------------|
| **Store** | Retail stores |
| **Restaurant** | Food establishments |
| **Hotel** | Hospitality properties |
| **Clinic** | Healthcare facilities |
| **Franchise** | Franchise locations |

#### ASSET Twin Types
| Type | Description |
|------|-------------|
| **Property** | Real estate assets |
| **Vehicle** | Transport vehicles |
| **Equipment** | Machinery/equipment |
| **Inventory** | Stock items |

#### MARKET Twin Types
| Type | Description |
|------|-------------|
| **Competitor** | Market competitors |
| **Region** | Geographic markets |
| **Demand** | Demand patterns |
| **Trend** | Market trends |

#### AGENT Twin Types
| Type | Description |
|------|-------------|
| **AI_Worker** | AI agents |
| **Bot** | Automated bots |
| **Assistant** | Virtual assistants |

### 3. Twin Management

| Feature | Description | Status |
|---------|-------------|--------|
| **Twin CRUD** | Full lifecycle management | ✅ |
| **State Tracking** | Real-time state updates | ✅ |
| **Historical State** | State history and version | ✅ |
| **Twin Relationships** | Link twins together | ✅ |
| **Twin Search** | Search by type, attribute | ✅ |
| **Bulk Operations** | Create/update multiple twins | ✅ |

### 4. Federation Engine

| Feature | Description | Status |
|---------|-------------|--------|
| **Cross-Twin Queries** | Query across twin types | ✅ |
| **Federated Search** | Search all twin types | ✅ |
| **Twin Aggregation** | Aggregate twin data | ✅ |
| **Cross-Industry Linking** | Link twins across industries | ✅ |
| **Federation Cache** | Cached federated results | ✅ |

### 5. Relationship Management

| Feature | Description | Status |
|---------|-------------|--------|
| **Create Relationship** | Link two twins | ✅ |
| **Relationship Types** | Customizable relationship types | ✅ |
| **Relationship Strength** | Track connection strength | ✅ |
| **Bi-directional** | Automatic reverse links | ✅ |
| **Relationship History** | Track relationship changes | ✅ |

---

## Relationship Types

| Type | Description | Direction |
|------|-------------|-----------|
| **OWNS** | Ownership relationship | One-to-Many |
| **WORKS_AT** | Employment | Many-to-One |
| **PARTNERS_WITH** | Partnership | Many-to-Many |
| **SUPPLIES_TO** | Supply chain | Many-to-Many |
| **BELONGS_TO** | Membership | Many-to-One |
| **INTERACTS_WITH** | Interaction | Many-to-Many |
| **LOCATED_AT** | Location | Many-to-One |
| **DEPENDS_ON** | Dependency | Many-to-Many |

---

## API Endpoints

### Taxonomy

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/taxonomy` | Get full taxonomy | ✅ |
| GET | `/api/taxonomy/:type` | Get type details | ✅ |
| POST | `/api/taxonomy` | Create new type | ✅ |
| PUT | `/api/taxonomy/:type` | Update type | ✅ |

### Twin Management

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/twins` | List twins (paginated) | ✅ |
| GET | `/api/twins/:id` | Get twin by ID | ✅ |
| POST | `/api/twins` | Create twin | ✅ |
| PUT | `/api/twins/:id` | Update twin | ✅ |
| DELETE | `/api/twins/:id` | Delete twin | ✅ |
| GET | `/api/twins/:id/history` | Get state history | ✅ |
| GET | `/api/twins/:id/related` | Get related twins | ✅ |

### Federation

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/federate` | Cross-twin query | ✅ |
| POST | `/api/federate/search` | Federated search | ✅ |
| POST | `/api/federate/aggregate` | Aggregate twins | ✅ |

### Relationships

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/relationships` | Create relationship | ✅ |
| GET | `/api/relationships/:id` | Get relationship | ✅ |
| DELETE | `/api/relationships/:id` | Delete relationship | ✅ |
| GET | `/api/relationships/twin/:id` | Get twin relationships | ✅ |

---

## File Structure

```
unified-twin-os/
├── src/
│   ├── index.js              # Main entry point
│   ├── config.js            # Configuration
│   └── routes/
│       ├── taxonomy.js       # Twin taxonomy routes
│       ├── twins.js          # Twin CRUD routes
│       ├── federation.js     # Federation engine routes
│       └── relationships.js  # Relationship routes
├── package.json
├── Dockerfile
├── README.md
└── CLAUDE.md
```

---

## Quick Start

```bash
# Start service
cd core/unified-twin-os
npm install
npm start

# Health check
curl http://localhost:3014/health

# Create customer twin
curl -X POST http://localhost:3014/api/twins \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CUSTOMER",
    "name": "John Doe",
    "attributes": {
      "email": "john@example.com",
      "preferences": {
        "cuisine": "Italian",
        "budget": "medium"
      }
    }
  }'

# Create relationship
curl -X POST http://localhost:3014/api/relationships \
  -d '{
    "sourceId": "customer_123",
    "targetId": "restaurant_456",
    "type": "PREFERS",
    "strength": 0.85
  }'

# Federated search
curl -X POST http://localhost:3014/api/federate/search \
  -d '{"query": "Italian restaurant", "types": ["RESTAURANT", "STORE"]}'
```

---

## Use Cases

### 1. Customer 360
Unified view of customer across all touchpoints.

### 2. Supply Chain Tracking
Track relationships across suppliers, distributors, and retailers.

### 3. Patient Journey
Follow patient through healthcare ecosystem.

### 4. Asset Lifecycle
Track assets from creation to disposal.

---

## Integration Points

| Service | Integration | Purpose |
|---------|-------------|---------|
| CorpID | Identity linking | Link twins to CorpID |
| Memory Network | Context storage | Store twin context |
| Economic Graph | Value flows | Map twin relationships |
| Simulation OS | Twin simulation | Simulate twin scenarios |

---

*Last Updated: June 14, 2026*
