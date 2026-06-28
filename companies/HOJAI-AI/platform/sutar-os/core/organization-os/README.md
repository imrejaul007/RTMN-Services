# Organization OS

Organizational structure, capabilities registry, reporting lines, and delegation management.

**Port:** 4871

## Purpose

Organization OS provides a comprehensive view of organizational structure including departments, teams, roles, capabilities, and reporting relationships. It supports capability-based staffing and delegation workflows.

## Features

- Organizational chart generation
- Node management (persons, departments, teams, roles)
- Team and capability registry
- Reporting line tracking
- Delegation management with time bounds
- Capability search and matching
- Role definitions with compensation
- Org structure statistics

## API Endpoints

### Org Chart & Structure

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/org-chart` | Get full org chart tree |
| GET | `/api/structure` | Get flat structure view |

### Nodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nodes` | List nodes |
| GET | `/api/nodes/:id` | Get node details |
| POST | `/api/nodes` | Create node |
| PUT | `/api/nodes/:id` | Update node |
| DELETE | `/api/nodes/:id` | Delete node |
| GET | `/api/nodes/:id/reports` | Get direct reports |
| GET | `/api/nodes/:id/ancestors` | Get management chain |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | List teams |
| GET | `/api/teams/:id` | Get team details |
| POST | `/api/teams` | Create team |
| PUT | `/api/teams/:id` | Update team |

### Capabilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/capabilities` | List capabilities |
| GET | `/api/capabilities/search` | Search capabilities |
| POST | `/api/capabilities` | Create capability |

### Delegations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/delegations` | List delegations |
| POST | `/api/delegations` | Create delegation |
| POST | `/api/delegations/:id/revoke` | Revoke delegation |

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List roles |
| POST | `/api/roles` | Create role |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get statistics |

## Node Types

| Type | Description |
|------|-------------|
| `person` | Individual employee |
| `department` | Organizational department |
| `team` | Working team |
| `role` | Position/role definition |

## Request/Response Examples

### Create Node (Person)

```bash
curl -X POST http://localhost:4871/api/nodes \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "type": "person",
    "name": "Jane Smith",
    "title": "Senior Software Engineer",
    "email": "jane.smith@company.com",
    "parentId": "dept-eng",
    "managerId": "mgr-123"
  }'
```

### Create Team

```bash
curl -X POST http://localhost:4871/api/teams \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "name": "Platform Engineering",
    "departmentId": "dept-eng",
    "leadId": "lead-456",
    "capabilities": ["Kubernetes", "AWS", "Terraform"],
    "skills": ["CI/CD", "Monitoring"],
    "headcount": 8,
    "budget": 800000
  }'
```

### Create Capability

```bash
curl -X POST http://localhost:4871/api/capabilities \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "name": "React",
    "category": "technical",
    "level": "expert",
    "description": "React.js frontend framework",
    "certifications": ["Meta Frontend Developer"]
  }'
```

### Create Delegation

```bash
curl -X POST http://localhost:4871/api/delegations \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "fromNodeId": "ceo",
    "toNodeId": "cfo",
    "scope": ["budget_approval", "vendor_contracts"],
    "startDate": "2024-01-01",
    "endDate": "2024-06-30"
  }'
```

## Default Seed Data

### Nodes
- CEO, CTO, CFO (persons)
- Engineering, Sales, HR (departments)
- Software Engineer, Engineering Manager (roles)

### Teams
- Frontend, Backend, DevOps, Enterprise Sales

### Capabilities
- React, Node.js, Kubernetes (technical)
- Leadership (leadership)
- Enterprise Sales (business)

## Capability Categories

| Category | Description |
|----------|-------------|
| `technical` | Technical skills |
| `business` | Business skills |
| `leadership` | Leadership abilities |
| `domain` | Industry-specific knowledge |

## Capability Levels

| Level | Description |
|-------|-------------|
| `beginner` | Learning/novice |
| `intermediate` | Competent |
| `advanced` | Proficient |
| `expert` | Deep expertise |

## Role Levels

| Level | Description |
|-------|-------------|
| `individual` | Individual contributor |
| `manager` | People manager |
| `director` | Department director |
| `vp` | Vice president |
| `cxo` | Chief officer |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4871 | Service port |
| `JWT_SECRET` | - | JWT secret for authentication |

## Dependencies

- `@rtmn/shared` - Shared utilities
- `express` - HTTP framework
- `helmet` - Security headers
- `cors` - CORS support
- `zod` - Schema validation
- `uuid` - ID generation

## Commands

```bash
npm install        # Install dependencies
npm start          # Start the service
npm test           # Run tests
```
