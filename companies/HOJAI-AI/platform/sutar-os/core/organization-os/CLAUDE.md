# OrganizationOS - Port 4871

## Overview
Hierarchy, reporting lines, delegations, org charts.

## Purpose
Manages organizational structure and reporting relationships.

## Key Features
- Org chart
- Reporting lines
- Delegations
- Succession planning
- Role definitions

## API Endpoints

### Nodes
- `GET /api/nodes` - List nodes
- `POST /api/nodes` - Create node
- `GET /api/org-chart` - Get org chart
- `GET /api/nodes/:id/reports` - Direct reports

### Delegations
- `POST /api/delegations` - Create delegation

## Node Types
- `person` - Individual
- `department` - Department
- `team` - Team
- `role` - Position

## Tests
Vitest tests: `__tests__/organization-os.test.ts`

## Environment
- Port: 4871

## Startup
```bash
cd platform/sutar-os/core/organization-os && npm run dev
```
