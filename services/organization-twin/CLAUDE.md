# Organization Twin Service

**Port:** 4888  
**Purpose:** Manages company structure, departments, branches, employees, policies, SLAs, assets, and business hours

## Overview

The Organization Twin service provides a comprehensive multi-tenant solution for managing organizational hierarchies, employee structures, business policies, and SLA configurations across multiple companies.

## Features

- **Multi-tenant Support:** Complete isolation via `tenantId`
- **Hierarchical Structure:** Organization → Departments → Employees
- **Branch Management:** Warehouses, stores, offices with specific configurations
- **Business Hours:** Configurable hours per branch (supports exceptions)
- **Policy Management:** Refund, cancellation, shipping policies
- **SLA Configuration:** Priority-based response and resolution times
- **Asset Tracking:** Organization-owned assets

## Data Models

### Organization
Main entity representing a company with:
- Basic info (name, type, industry, registration)
- Contact details
- Settings and metadata
- Hierarchy support (parent/child organizations)

### Department
Organizational units within an organization:
- Name, code, description
- Parent department (hierarchical)
- Manager reference
- Budget information

### Branch
Physical or logical locations:
- Type: warehouse, store, office, franchise, pop-up
- Address and contact
- Capacity and amenities
- Associated department

### Employee
Staff members linked via employeeId:
- Personal and contact information
- Department and branch assignment
- Role and reporting structure
- Employment details

### Policy
Business policies and rules:
- Type: refund, cancellation, shipping, privacy, terms, custom
- Rules and conditions (JSON)
- Effective dates
- Applies to: global, department, branch, product-category

### BusinessHours
Operating hours configuration:
- Regular schedule (day-by-day)
- Holiday exceptions
- Special hours
- Branch-specific

### SLAPolicy
Service Level Agreements:
- Priority levels (critical, high, medium, low)
- Response time (first response)
- Resolution time
- Escalation rules

## API Endpoints

### Organization Routes
```
GET    /api/organizations              - List all organizations (tenant-scoped)
POST   /api/organizations              - Create organization
GET    /api/organizations/:id          - Get organization by ID
PUT    /api/organizations/:id          - Update organization
DELETE /api/organizations/:id          - Delete organization
GET    /api/organizations/:id/tree     - Get organization hierarchy tree
```

### Department Routes
```
GET    /api/departments                - List departments (tenant/org-scoped)
POST   /api/departments                - Create department
GET    /api/departments/:id            - Get department by ID
PUT    /api/departments/:id            - Update department
DELETE /api/departments/:id            - Delete department
GET    /api/departments/:id/tree       - Get department subtree
```

### Branch Routes
```
GET    /api/branches                   - List branches
POST   /api/branches                   - Create branch
GET    /api/branches/:id               - Get branch by ID
PUT    /api/branches/:id               - Update branch
DELETE /api/branches/:id               - Delete branch
GET    /api/branches/:id/hours         - Get branch business hours
PUT    /api/branches/:id/hours         - Update branch business hours
```

### Employee Routes
```
GET    /api/employees                  - List employees
POST   /api/employees                  - Create employee
GET    /api/employees/:id              - Get employee by ID
PUT    /api/employees/:id              - Update employee
DELETE /api/employees/:id             - Delete employee
GET    /api/employees/:id/subordinates - Get reporting chain
```

### Policy Routes
```
GET    /api/policies                   - List policies
POST   /api/policies                   - Create policy
GET    /api/policies/:id               - Get policy by ID
PUT    /api/policies/:id               - Update policy
DELETE /api/policies/:id              - Delete policy
GET    /api/policies/type/:type        - Get policies by type
```

### SLA Routes
```
GET    /api/sla                        - List SLA policies
POST   /api/sla                        - Create SLA policy
GET    /api/sla/:id                    - Get SLA policy
PUT    /api/sla/:id                    - Update SLA policy
DELETE /api/sla/:id                    - Delete SLA policy
GET    /api/sla/priority/:priority      - Get SLA by priority
```

### Insights Routes
```
GET    /api/insights                   - Get organization insights
GET    /api/insights/org/:id           - Get specific org insights
```

## Usage

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm run build && npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4888 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/organization_twin |
| JWT_SECRET | JWT signing secret | - |

## Health Check

```bash
curl http://localhost:4888/health
```

## Multi-Tenant Isolation

All endpoints accept an optional `tenantId` header:
```
X-Tenant-ID: tenant-123
```

When provided, all queries are scoped to that tenant. If not provided, returns data for all tenants (admin access).

## Service Connection

This service can be integrated with other RTMN services:

- **CorpID (4702):** Employee identity verification
- **TwinOS Hub (4705):** Sync organization twin data
- **Event Bus (4510):** Publish organization events
- **Decision Engine (4240):** Policy-based decisions

## License

RTMN Proprietary - All Rights Reserved
