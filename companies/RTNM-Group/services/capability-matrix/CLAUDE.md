# Capability Matrix Engine

**Version:** 1.0.0  
**Updated:** June 14, 2026  
**Status:** ✅ BUILT  
**Port:** 3013

## Overview

The RTMN Capability Matrix Engine provides a formal inheritance model that connects companies to Industry OS capabilities. It enables capabilities to propagate from Industry OS to individual company instances, creating a unified capability framework.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Capability Matrix Engine                        │
│                         Port: 3013                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Capability  │  │    Matrix    │  │    Inheritance       │  │
│  │   Registry   │  │  Management  │  │      Engine         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Propagation Engine                             │
│  Industry OS ──────────────────────────────────────────> Company │
└─────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Capability Categories

| Category | Description |
|----------|-------------|
| TECHNICAL | Software, hardware, infrastructure skills |
| BUSINESS | Business strategy, operations, management |
| OPERATIONS | Process optimization, logistics, supply chain |
| CREATIVE | Design, content, marketing creative |
| ANALYTICS | Data analysis, reporting, insights |
| SUPPORT | Customer service, technical support |
| HR | Human resources, recruiting, training |
| LEADERSHIP | Executive, management, strategy |
| DOMAIN | Industry-specific knowledge |

### Proficiency Levels

| Level | Value | Description |
|-------|-------|-------------|
| BEGINNER | 1 | Basic understanding |
| INTERMEDIATE | 2 | Working knowledge |
| ADVANCED | 3 | Expert usage |
| EXPERT | 4 | Master level |

### Entity Types

| Type | Description |
|------|-------------|
| HUMAN | Individual employees |
| AGENT | AI agents |
| TEAM | Team groups |
| ORGANIZATION | Companies/organizations |

### Source Types

| Type | Description |
|------|-------------|
| INDUSTRY | From Industry OS |
| COMPANY | Company-specific |
| PRODUCT | From product |
| SERVICE | From service |

## Key Features

### 1. Capability Registry
- Register and manage capabilities
- Category-based organization
- Industry tagging
- Prerequisite tracking
- Related capability linking

### 2. Matrix Management
- Add capabilities to company matrix
- Track proficiency levels
- Category-based views
- Entity comparison
- Summary statistics

### 3. Inheritance Engine
- Capability relationship chains
- Parent-child relationships
- Prerequisite tracking
- Capability distance calculation
- Hierarchy visualization

### 4. Propagation Engine
- Industry → Company propagation
- Template-based propagation
- Bulk propagation
- Propagation history
- Revert capabilities

## File Structure

```
core/capability-matrix/
├── package.json
├── src/
│   ├── index.js                 # Main entry point
│   └── routes/
│       ├── capability.js         # Capability CRUD
│       ├── matrix.js            # Matrix management
│       ├── inheritance.js        # Inheritance engine
│       └── propagation.js       # Propagation engine
└── README.md
```

## Quick Start

```bash
# Install dependencies
cd core/capability-matrix
npm install

# Start service
npm start

# Development mode
npm run dev
```

## API Endpoints

### Capabilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/capabilities` | List all capabilities |
| GET | `/api/capabilities/:id` | Get capability |
| POST | `/api/capabilities` | Create capability |
| PUT | `/api/capabilities/:id` | Update capability |
| DELETE | `/api/capabilities/:id` | Delete capability |
| GET | `/api/capabilities/category/:category` | By category |
| GET | `/api/capabilities/industry/:industry` | By industry |
| GET | `/api/capabilities/meta/proficiency-levels` | Proficiency levels |
| GET | `/api/capabilities/meta/categories` | Categories |

### Matrix

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matrix/:corpId` | Get matrix for entity |
| POST | `/api/matrix/:corpId` | Add capability to matrix |
| PUT | `/api/matrix/:corpId/:capabilityId` | Update proficiency |
| DELETE | `/api/matrix/:corpId/:capabilityId` | Remove from matrix |
| GET | `/api/matrix/:corpId/summary` | Matrix summary |
| POST | `/api/matrix/compare` | Compare two matrices |

### Inheritance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inheritance/:capabilityId` | Get inheritance chain |
| POST | `/api/inheritance/link` | Create relationship |
| DELETE | `/api/inheritance/link` | Remove relationship |
| GET | `/api/inheritance/source/:sourceId` | By source |
| GET | `/api/inheritance/hierarchy/:category` | Category hierarchy |
| GET | `/api/inheritance/distance/:capA/:capB` | Distance between caps |

### Propagation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/propagation/propagate` | Propagate capabilities |
| GET | `/api/propagation/history/:corpId` | Propagation history |
| POST | `/api/propagation/bulk` | Bulk propagation |
| DELETE | `/api/propagation/revert` | Revert propagation |
| GET | `/api/propagation/templates` | Propagation templates |
| POST | `/api/propagation/apply-template` | Apply template |

## Usage Examples

### Create a Capability

```javascript
POST /api/capabilities
{
  "name": "Restaurant POS",
  "category": "OPERATIONS",
  "description": "Point of sale operations for restaurants",
  "difficulty": "INTERMEDIATE",
  "industries": ["restaurant"],
  "source": "INDUSTRY",
  "sourceId": "restaurant-os"
}
```

### Add Capability to Company Matrix

```javascript
POST /api/matrix/CORP-12345
{
  "capabilityId": "cap_abc123",
  "proficiency": "ADVANCED"
}
```

### Propagate from Industry to Company

```javascript
POST /api/propagation/propagate
{
  "sourceIndustryId": "restaurant-os",
  "targetCorpId": "CORP-12345",
  "proficiency": "INTERMEDIATE",
  "propagateRelated": true
}
```

### Compare Two Companies

```javascript
POST /api/matrix/compare
{
  "corpIdA": "CORP-12345",
  "corpIdB": "CORP-67890"
}
```

## Integration Points

### Connected Services

| Service | Port | Integration |
|---------|------|-------------|
| CorpPerks | - | Uses capabilityRegistry.ts |
| TwinOS Hub | 3011 | Twin capabilities |
| AgentOS Hub | 3010 | Agent capabilities |
| Redis | 6379 | Data storage |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3013 | Service port |
| REDIS_URL | redis://localhost:6379 | Redis connection |

## Testing

```bash
# Run tests
npm test
```

## Related Documentation

- [RTMN Architecture](../RTMN-MASTER-ARCHITECTURE.md)
- [Capability Matrix Integration](./INTEGRATION.md)
- [API Reference](./API.md)
