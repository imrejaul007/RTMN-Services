# RTMN Unified Twin Architecture

**Version:** 1.0.0  
**Updated:** June 14, 2026  
**Status:** ✅ BUILT  
**Port:** 3014

## Overview

The Unified Twin Architecture provides a canonical taxonomy for all digital twins across RTMN, enabling cross-industry queries and unified entity management.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Unified Twin Architecture                          │
│                        Port: 3014                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │  Human  │ │Business │ │  Asset  │ │  Market │ │  Agent  │ │
│  │  Twin   │ │  Twin   │ │  Twin   │ │  Twin   │ │  Twin   │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Federation Engine                               │
│  Cross-type queries, relationship graphs, path finding          │
└─────────────────────────────────────────────────────────────────┘
```

## Twin Taxonomy

### Core Types

| Type | Description | Subtypes |
|------|-------------|----------|
| HUMAN | Human entities | Customer, Employee, Patient, Guest, Member, User |
| BUSINESS | Business entities | Store, Restaurant, Hotel, Clinic, Salon, Gym, Office, Warehouse |
| ASSET | Physical assets | Property, Vehicle, Equipment, Inventory, Machine |
| MARKET | Market entities | Competitor, Region, Demand, Supply, Trend |
| AGENT | AI agents | AI Worker, AI Manager, AI Specialist |
| RELATIONSHIP | Connections | OWNS, WORKS_AT, CUSTOMER_OF, PARTNER, SUPPLIER, COMPETES_WITH |

### Inheritance Model

```
RTMN Ecosystem
├── Human Twin
│   ├── Customer Twin
│   ├── Employee Twin
│   └── Patient Twin
├── Business Twin
│   ├── Restaurant Twin
│   ├── Hotel Twin
│   └── Store Twin
├── Asset Twin
│   ├── Property Twin
│   ├── Vehicle Twin
│   └── Equipment Twin
├── Market Twin
│   ├── Competitor Twin
│   └── Region Twin
└── Agent Twin
    └── AI Worker Twin
```

## Key Features

### 1. Unified Taxonomy
- Single source of truth for twin types
- Standardized subtypes
- Inheritance hierarchies

### 2. Cross-Type Federation
- Search across all twin types
- Unified query interface
- Type-filtered results

### 3. Relationship Graph
- Create relationships between twins
- Graph traversal
- Path finding
- Centrality analysis

### 4. Inheritance Model
- Parent-child twin relationships
- Data inheritance
- Type hierarchies

## File Structure

```
core/unified-twin-os/
├── package.json
├── src/
│   ├── index.js                 # Main entry point
│   └── routes/
│       ├── taxonomy.js          # Taxonomy management
│       ├── twins.js             # Twin CRUD
│       └── federation.js        # Cross-twin queries
└── README.md
```

## Quick Start

```bash
cd core/unified-twin-os
npm install
npm start
```

## API Endpoints

### Taxonomy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/taxonomy` | Get complete taxonomy |
| GET | `/api/taxonomy/types` | Get twin types |
| GET | `/api/taxonomy/types/:type/subtypes` | Get subtypes |
| GET | `/api/taxonomy/relationships` | Get relationship types |
| GET | `/api/taxonomy/stats` | Taxonomy statistics |
| GET | `/api/taxonomy/hierarchy` | Get hierarchy |

### Twins

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/twins` | Create twin |
| GET | `/api/twins/:id` | Get twin |
| PUT | `/api/twins/:id` | Update twin |
| DELETE | `/api/twins/:id` | Delete twin |
| GET | `/api/twins/type/:type` | Get by type |
| GET | `/api/twins/subtype/:subtype` | Get by subtype |
| GET | `/api/twins/industry/:industry` | Get by industry |
| POST | `/api/twins/search` | Search twins |
| GET | `/api/twins/:id/related` | Get related twins |
| POST | `/api/twins/:id/relationships` | Add relationship |

### Federation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/relationships/federate` | Federated search |
| GET | `/api/relationships/graph/:id` | Get relationship graph |
| POST | `/api/relationships/types` | Create relationship type |
| GET | `/api/relationships/types` | Get all types |
| GET | `/api/relationships/type/:type` | Get by type |
| GET | `/api/relationships/path/:from/:to` | Find path |
| GET | `/api/relationships/analyze/:id` | Analyze network |

## Usage Examples

### Create a Human Twin

```javascript
POST /api/twins
{
  "name": "John Doe",
  "type": "human",
  "subtype": "customer",
  "industry": "restaurant",
  "data": {
    "email": "john@example.com",
    "preferences": ["italian", "spicy"]
  }
}
```

### Create a Business Twin

```javascript
POST /api/twins
{
  "name": "Pizza Palace",
  "type": "business",
  "subtype": "restaurant",
  "industry": "restaurant",
  "data": {
    "location": "123 Main St",
    "seats": 50
  }
}
```

### Create Relationship

```javascript
POST /api/twins/twin_customer_123/relationships
{
  "targetTwinId": "twin_restaurant_456",
  "relationshipType": "CUSTOMER_OF"
}
```

### Federated Search

```javascript
POST /api/relationships/federate
{
  "query": "pizza",
  "types": ["human", "business"],
  "filters": {
    "industry": "restaurant"
  }
}
```

## Integration Points

| Service | Port | Integration |
|---------|------|-------------|
| TwinOS Hub | 3011 | Extended from existing |
| MemoryOS | 4703 | Twin memory |
| AgentOS Hub | 3010 | Agent twins |
| Redis | 6379 | Data storage |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3014 | Service port |
| REDIS_URL | redis://localhost:6379 | Redis connection |
