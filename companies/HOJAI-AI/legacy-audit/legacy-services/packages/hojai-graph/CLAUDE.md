# CLAUDE.md - Hojai Graph

## Project Overview

**Name:** Hojai Graph
**Company:** hojai-ai
**Type:** HOJAI AI Graph Service
**Port:** 4810
**Version:** 2.0.0

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB
- Redis
- JWT Authentication
- Zod validation

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Service port (default: 4810) |
| MONGODB_URI | Yes | MongoDB connection |
| JWT_SECRET | Yes | JWT signing |
| REDIS_URL | No | Redis connection |
| CORS_ORIGIN | No | CORS allowed origins |

## Entity Types (31 total)

### Core Entities (15)
- human - Human employees
- ai_employee - AI workers
- customer - Customers
- merchant - Merchants
- supplier - Suppliers
- organization - Companies
- department - Departments
- team - Teams
- product - Products
- service - Services
- document - Documents
- workflow - Workflows
- task - Tasks
- meeting - Meetings
- project - Projects

### Company-Specific Entities (16)
- company_policy - Company policies
- sop - Standard Operating Procedures
- contract - Contracts
- roadmap - Roadmaps
- decision - Decisions
- goal - Goals
- okr - OKRs
- milestone - Milestones
- product_feature - Product features
- competitor - Competitors
- investor - Investors
- brand - Brands
- campaign - Marketing campaigns
- meeting_note - Meeting notes
- action_item - Action items

## Relationship Types (27 total)

### Core Relationships (14)
- works_with, reports_to, owns, created, approved, referred, purchased, sold, manages, member_of, depends_on, collaborates_with, supersedes, related_to

### Company-Specific Relationships (13)
- aligned_to, supports, blocks, escalated_to, reported_by, owned_by, deadline_of, budgets_for, sponsors, mentors, delegates_to, challenges, validates, duplicates

## API Routes

### Node Operations
- `POST /api/nodes` - Create entity
- `POST /api/nodes/batch` - Batch create
- `GET /api/nodes/:entityType/:entityId` - Get entity
- `GET /api/nodes` - Search entities
- `PATCH /api/nodes/:entityType/:entityId` - Update entity
- `DELETE /api/nodes/:entityType/:entityId` - Delete entity

### Relationship Operations
- `POST /api/relationships` - Create relationship
- `POST /api/relationships/batch` - Batch create
- `GET /api/relationships/:entityType/:entityId` - Get relationships
- `DELETE /api/relationships/:edgeId` - Delete relationship

### Graph Operations
- `POST /api/graph/traverse` - Traverse graph
- `GET /api/graph/ego/:entityType/:entityId` - Get ego network
- `POST /api/graph/subgraph` - Get subgraph cluster
- `POST /api/graph/path` - Find shortest path
- `POST /api/graph/influence` - Influence analysis
- `POST /api/graph/cascade` - Cascade impact
- `POST /api/graph/similarity` - Find similar entities

### Company Knowledge
- `POST /api/company/policies` - Add policy
- `GET /api/company/policies` - List policies
- `POST /api/company/sops` - Add SOP
- `GET /api/company/sops` - List SOPs
- `POST /api/company/contracts` - Add contract
- `GET /api/company/contracts` - List contracts

### Goals & OKRs
- `POST /api/goals` - Create goal
- `GET /api/goals` - List goals
- `POST /api/goals/:id/align` - Align goal
- `POST /api/okrs` - Create OKR
- `GET /api/okrs` - List OKRs

### Competitors
- `POST /api/competitors` - Add competitor
- `GET /api/competitors` - List competitors
- `POST /api/competitors/:id/products` - Link product
- `GET /api/competitors/:id/analysis` - Analysis

### AI-Powered
- `POST /api/extract` - Extract entities
- `POST /api/link` - Auto-link entities
- `POST /api/suggest` - Suggest relationships
- `POST /api/analyze` - Analyze health/network

### AI Employees
- `POST /api/ai-employees` - Register AI
- `GET /api/ai-employees/team/:department` - Get team

## AI Features

1. **Entity Extraction** - Extract entities from unstructured text
2. **Influence Analysis** - Calculate influence scores and paths
3. **Cascade Impact Analysis** - What breaks if entity fails
4. **Similarity Analysis** - Find similar entities by profile/neighbors
5. **Entity Health Analysis** - Network and health scoring

## Schema Fields

### Node
- confidenceScore (0-1) - AI extraction confidence
- extractedFrom - Source of extraction
- validFrom/validTo - Temporal validity
- status - active/inactive/archived/draft

### Edge
- confidenceScore (0-1) - AI extraction confidence
- validFrom/validTo - Temporal validity
- status - active/inactive/archived

## Integration

- RABTUL Auth (4002)
- RABTUL Payment (4001)
- RABTUL Wallet (4004)
- RABTUL Notification (4005)

---

**Last Updated:** 2026-06-12
