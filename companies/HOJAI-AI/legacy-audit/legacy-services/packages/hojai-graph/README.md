# @hojai/graph

**HOJAI Unified Graph - Single API for All Entities**

---

## Overview

Single API for all entity relationships. Connects humans, AI employees, customers, merchants, and more. Now with enhanced company-specific features, AI-powered entity extraction, and advanced graph analytics.

## Features

- **31 entity types** (15 original + 16 company-specific)
- **27 relationship types** (14 original + 13 company-specific)
- Graph traversal and ego networks
- AI employee tracking
- Company knowledge management (policies, SOPs, contracts)
- Goal and OKR tracking
- Competitor analysis
- Advanced graph analytics (subgraph, path finding, influence analysis)
- AI-powered features (entity extraction, auto-linking, similarity analysis)
- Entity health and network analysis

## Quick Start

```bash
npm install @hojai/graph
npm run dev
```

```typescript
import { HojaiGraph } from '@hojai/graph';

const graph = new HojaiGraph({
  port: 4810,
  mongodb: 'mongodb://localhost:27017/hojai-graph'
});

await graph.start();
```

## Entity Types

### Core Entities (15)

| Type | Description |
|------|-------------|
| human | Human employees |
| ai_employee | AI workers |
| customer | Customers |
| merchant | Merchants |
| supplier | Suppliers |
| organization | Companies |
| department | Departments |
| team | Teams |
| product | Products |
| service | Services |
| document | Documents |
| workflow | Workflows |
| task | Tasks |
| meeting | Meetings |
| project | Projects |

### Company-Specific Entities (16)

| Type | Description |
|------|-------------|
| company_policy | Company policies and guidelines |
| sop | Standard Operating Procedures |
| contract | Contracts and agreements |
| roadmap | Product/strategy roadmaps |
| decision | Decisions made |
| goal | Goals and objectives |
| okr | Objectives and Key Results |
| milestone | Milestones |
| product_feature | Product features |
| competitor | Competitors |
| investor | Investors |
| brand | Brands |
| campaign | Marketing campaigns |
| meeting_note | Meeting notes |
| action_item | Action items |

## Relationship Types

### Core Relationships (14)

| Type | Description |
|------|-------------|
| works_with | Collaboration |
| reports_to | Hierarchy |
| manages | Management |
| created | Creation |
| owns | Ownership |
| member_of | Membership |
| depends_on | Dependencies |
| collaborates_with | Collaboration |
| supersedes | Replacement |
| related_to | General relationship |
| approved | Approval |
| referred | Referral |
| purchased | Purchase |
| sold | Sale |

### Company-Specific Relationships (13)

| Type | Description |
|------|-------------|
| aligned_to | Strategic alignment |
| supports | Support relationship |
| blocks | Blocking relationship |
| escalated_to | Escalation |
| reported_by | Reporting |
| owned_by | Ownership |
| deadline_of | Deadline association |
| budgets_for | Budget allocation |
| sponsors | Sponsorship |
| mentors | Mentorship |
| delegates_to | Delegation |
| challenges | Challenge |
| validates | Validation |
| duplicates | Duplication |

## API Routes

### Node Operations
- `POST /api/nodes` - Create entity
- `POST /api/nodes/batch` - Batch create entities
- `GET /api/nodes/:entityType/:entityId` - Get entity
- `GET /api/nodes` - Search entities
- `PATCH /api/nodes/:entityType/:entityId` - Update entity
- `DELETE /api/nodes/:entityType/:entityId` - Delete entity

### Relationship Operations
- `POST /api/relationships` - Create relationship
- `POST /api/relationships/batch` - Batch create relationships
- `GET /api/relationships/:entityType/:entityId` - Get relationships
- `DELETE /api/relationships/:edgeId` - Delete relationship

### Graph Operations
- `POST /api/graph/traverse` - Traverse graph
- `GET /api/graph/ego/:entityType/:entityId` - Get ego network
- `POST /api/graph/subgraph` - Get subgraph for entity cluster
- `POST /api/graph/path` - Find shortest path between entities
- `POST /api/graph/influence` - Influence/impact analysis
- `POST /api/graph/cascade` - Cascade impact analysis
- `POST /api/graph/similarity` - Find similar entities

### Company Knowledge
- `POST /api/company/policies` - Add company policy
- `GET /api/company/policies` - List policies
- `POST /api/company/sops` - Add SOP
- `GET /api/company/sops` - List SOPs
- `POST /api/company/contracts` - Add contract
- `GET /api/company/contracts` - List contracts

### Goals & OKRs
- `POST /api/goals` - Create goal
- `GET /api/goals` - List goals
- `POST /api/goals/:id/align` - Align goal to strategy
- `POST /api/okrs` - Create OKR
- `GET /api/okrs` - List OKRs

### Competitors
- `POST /api/competitors` - Add competitor
- `GET /api/competitors` - List competitors
- `POST /api/competitors/:id/products` - Link competitor product
- `GET /api/competitors/:id/analysis` - Competitive analysis

### AI-Powered
- `POST /api/extract` - Extract entities from text
- `POST /api/link` - Auto-link related entities
- `POST /api/suggest` - Suggest relationships
- `POST /api/analyze` - Analyze entity health/network

### AI Employees
- `POST /api/ai-employees` - Register AI employee
- `GET /api/ai-employees/team/:department` - Get AI team

## AI Features

### Entity Extraction
Extract entities from unstructured text with confidence scoring:
```json
POST /api/extract
{
  "text": "The CEO announced a new product launch on Q2",
  "entityTypes": ["human", "product", "goal"],
  "linkToExisting": true
}
```

### Influence Analysis
Identify key entities and calculate influence scores:
```json
POST /api/graph/influence
{
  "entityId": "employee_123",
  "entityType": "human",
  "depth": 3,
  "direction": "both"
}
```

### Cascade Impact Analysis
What breaks if this entity fails:
```json
POST /api/graph/cascade
{
  "entityId": "project_alpha",
  "entityType": "project",
  "maxDepth": 3
}
```

### Similarity Analysis
Find similar entities by profile or neighbors:
```json
POST /api/graph/similarity
{
  "entityId": "product_123",
  "entityType": "product",
  "limit": 5,
  "similarityCriteria": "both"
}
```

### Entity Health Analysis
```json
POST /api/analyze
{
  "entityId": "employee_123",
  "entityType": "human",
  "analysisType": "both"
}
```

## Schema Updates

### Node Schema
- `confidenceScore`: AI extraction confidence (0-1)
- `extractedFrom`: Source of AI extraction
- `validFrom`: Temporal validity start
- `validTo`: Temporal validity end
- `status`: Entity status (active, inactive, archived, draft)

### Edge Schema
- `confidenceScore`: AI extraction confidence (0-1)
- `validFrom`: Temporal validity start
- `validTo`: Temporal validity end
- `status`: Edge status (active, inactive, archived)

## API Examples

### Create Entity
```typescript
await graph.nodes.create({
  entityId: 'ai_sdr_001',
  entityType: 'ai_employee',
  name: 'AI Sales Rep',
  properties: { role: 'SDR', department: 'Sales' }
});
```

### Create Relationship
```typescript
await graph.relationships.create({
  sourceId: 'ai_sdr_001',
  sourceType: 'ai_employee',
  targetId: 'ai_ae_001',
  targetType: 'ai_employee',
  relationship: 'works_with'
});
```

### Traverse Graph
```typescript
const network = await graph.traverse({
  sourceId: 'employee_123',
  sourceType: 'human',
  depth: 3
});
```

### Create Company Policy
```typescript
await fetch('/api/company/policies', {
  method: 'POST',
  body: JSON.stringify({
    entityId: 'policy_hr_001',
    name: 'Remote Work Policy',
    category: 'hr',
    effectiveDate: '2024-01-01'
  })
});
```

### Create Goal with Alignment
```typescript
// Create goal
await fetch('/api/goals', {
  method: 'POST',
  body: JSON.stringify({
    entityId: 'goal_2024_001',
    name: 'Increase Revenue by 50%',
    type: 'company',
    priority: 'critical',
    targetDate: '2024-12-31'
  })
});

// Align to strategy
await fetch('/api/goals/goal_2024_001/align', {
  method: 'POST',
  body: JSON.stringify({
    strategyId: 'strategy_2024',
    strategyType: 'goal',
    alignmentType: 'aligned_to'
  })
});
```

---

**Port:** 4810
**Status:** Production Ready
**Version:** 2.0.0
