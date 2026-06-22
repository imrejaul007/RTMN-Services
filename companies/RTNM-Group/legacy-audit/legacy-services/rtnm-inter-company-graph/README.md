# RTNM Inter-Company Graph Service

> Inter-Company Graph service for RTNM Economic Network. Maps relationships between the 22 RTNM companies: who pays whom, who provides what, who consumes what.

## Overview

This service provides a comprehensive graph database of all RTNM ecosystem companies and their relationships. It enables:

- Company registry with trust scores and revenue data
- Relationship mapping (pays, receives, provides, consumes, owns, licenses, integrates, supports)
- Money flow analysis
- Path finding between companies
- Full economic network graph visualization

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTNM INTER-COMPANY GRAPH                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   HOJAI-AI │  │   RABTUL    │  │      REZ-Intelligence    │ │
│  │  (AI Brain)│  │  (Payment)  │  │     (Intent Graph)       │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │   Company   │                              │
│                    │    Nodes    │                              │
│                    │   (22+ )   │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │  Company    │                              │
│                    │    Edges    │                              │
│                    │ (Relationships)│                            │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## RTNM Companies (22 Companies)

| Company | Role | Type |
|---------|------|------|
| HOJAI-AI | AI Company - Memory, Agents, Knowledge | holding |
| RABTUL-Technologies | Money Movement | subsidiary |
| REZ-Intelligence | AI/ML Platform | subsidiary |
| REZ-Consumer | B2C Consumer Apps | subsidiary |
| KHAIRMOVE | Mobility + Airport | subsidiary |
| AXOM | Social + Entertainment | subsidiary |
| AdBazaar | Marketing + DOOH | subsidiary |
| REZ-Merchant | Industry OS | subsidiary |
| REZ-Move | Relocation & Living | subsidiary |
| RIDZA | Money Intelligence | subsidiary |
| LawGens | Legal AI | partner |
| AssetMind | Financial Intelligence | partner |
| RisaCare | Healthcare OS | partner |
| CorpPerks | HRMS Platform | partner |
| StayOwn-Hospitality | Hotel Management | partner |
| RTNM-Group | Platform Administration | holding |
| RisnaEstate | Real Estate Platform | partner |
| REZ-Workspace | Business Operating System | subsidiary |
| Hotel OTA | Hotel Channel Integration | partner |
| RABTUL-SaaS | SaaS Products | subsidiary |
| RTNM-Digital | Digital Services | subsidiary |
| Nexha | Commerce Network OS | partner |

## Relationship Types

| Type | Description | Money Flow |
|------|-------------|------------|
| `pays` | Company A pays Company B | Outgoing from A |
| `receives` | Company A receives from B | Incoming to A |
| `provides` | Company A provides service to B | Value from A |
| `consumes` | Company A consumes from B | Value from B |
| `owns` | Company A owns B | Equity relationship |
| `licenses` | Company A licenses to B | Royalties |
| `integrates` | Companies integrate | Technical |
| `supports` | Company A supports B | Support services |

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm or yarn

### Installation

```bash
# Clone the repository
cd RTNM-Group/rtnm-inter-company-graph

# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration

Create a `.env` file:

```env
PORT=6001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rtnm_intercompany_graph
LOG_LEVEL=info
LOG_FORMAT=json
CORS_ORIGIN=*
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### Docker

```bash
# Build image
docker build -t rtnm-inter-company-graph .

# Run container
docker run -d -p 6001:6001 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/rtnm_intercompany_graph \
  rtnm-inter-company-graph
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "6001:6001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rtnm_intercompany_graph
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## API Reference

### Health Checks

```
GET /health         - Basic health check
GET /health/ready   - Readiness check (includes MongoDB)
GET /health/live    - Liveness check
```

### Company Nodes

#### Add Company
```http
POST /api/nodes
Content-Type: application/json

{
  "corpId": "hojai-ai",
  "name": "HOJAI-AI",
  "type": "holding",
  "role": "AI Company",
  "trustScore": 95,
  "monthlyRevenue": 10000000,
  "employees": 500,
  "properties": {
    "industry": "Artificial Intelligence",
    "sector": "Technology"
  },
  "tags": ["ai", "memory", "agents"]
}
```

#### Get Company
```http
GET /api/nodes/:corpId
```

#### List Companies
```http
GET /api/nodes?type=subsidiary&status=active
GET /api/nodes?tags=ai,payments
```

#### Update Company
```http
PUT /api/nodes/:corpId
Content-Type: application/json

{
  "trustScore": 98,
  "monthlyRevenue": 15000000
}
```

#### Delete Company
```http
DELETE /api/nodes/:corpId
```

### Relationship Edges

#### Add Relationship
```http
POST /api/edges
Content-Type: application/json

{
  "sourceId": "rez-consumer",
  "targetId": "rabtul-technologies",
  "relationship": "pays",
  "direction": "unidirectional",
  "properties": {
    "monthlyVolume": 500000,
    "paymentTerms": "Net 30",
    "creditLimit": 1000000
  }
}
```

#### Get Relationships
```http
GET /api/relationships/:corpId
```

#### Update Relationship
```http
PUT /api/edges/:edgeId
Content-Type: application/json

{
  "properties": {
    "monthlyVolume": 750000
  }
}
```

#### Delete Relationship
```http
DELETE /api/edges/:edgeId
```

### Money Flow

#### Get Money Flow
```http
GET /api/flow/:corpId
```

Response:
```json
{
  "success": true,
  "data": {
    "corpId": "rez-consumer",
    "name": "REZ-Consumer",
    "totalIncoming": 2000000,
    "totalOutgoing": 1500000,
    "netFlow": 500000,
    "incoming": [
      {
        "fromCorpId": "hojai-ai",
        "fromName": "HOJAI-AI",
        "relationship": "receives",
        "volume": 2000000
      }
    ],
    "outgoing": [
      {
        "toCorpId": "rabtul-technologies",
        "toName": "RABTUL-Technologies",
        "relationship": "pays",
        "volume": 1500000
      }
    ]
  }
}
```

### Graph Operations

#### Get Full Graph
```http
GET /api/graph
```

#### Find Path
```http
GET /api/path/:fromId/:toId
```

Example: `GET /api/path/hojai-ai/risnaestate`

Response:
```json
{
  "success": true,
  "data": {
    "exists": true,
    "path": [
      { "corpId": "hojai-ai", "name": "HOJAI-AI", "relationship": "start" },
      { "corpId": "rez-consumer", "name": "REZ-Consumer", "relationship": "owns" },
      { "corpId": "risnaestate", "name": "RisnaEstate", "relationship": "integrates" }
    ],
    "hops": 2
  }
}
```

#### Get Statistics
```http
GET /api/statistics
```

## Service Data

### Port Assignment

| Service | Port | Description |
|---------|------|-------------|
| rtnm-inter-company-graph | 6001 | Inter-Company Graph |

### Database

- Database: `rtnm_intercompany_graph`
- Collections:
  - `companynodes` - Company entity records
  - `companyedges` - Relationship edges

## Development

### Project Structure

```
rtnm-inter-company-graph/
├── src/
│   ├── config/
│   │   └── index.ts          # Configuration
│   ├── models/
│   │   └── intercompany.model.ts  # Mongoose models
│   ├── services/
│   │   └── intercompany.service.ts  # Business logic
│   ├── routes/
│   │   └── intercompany.routes.ts  # Express routes
│   ├── utils/
│   │   └── logger.ts         # Winston logger
│   └── index.ts              # App entry point
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # Build TypeScript
npm run start    # Start production server
npm run test     # Run tests
npm run lint     # Run linter
npm run clean    # Clean build artifacts
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- --testNamePattern="addCompany"
```

## Ecosystem Integration

### Connected Services

| Service | Connection | Purpose |
|---------|------------|---------|
| HOJAI-AI | Memory Platform | AI company relationships |
| RABTUL | Auth, Wallet | Payment tracking |
| REZ-Intelligence | Intent Graph | Company intelligence |

### Event Bus

The service can emit events for:

- `company.created` - When a new company is added
- `company.updated` - When company data changes
- `company.deleted` - When a company is removed
- `relationship.created` - When a relationship is added
- `relationship.updated` - When a relationship changes

## License

MIT License - See LICENSE file for details

## Version

- Version: 1.0.0
- Last Updated: June 2026
