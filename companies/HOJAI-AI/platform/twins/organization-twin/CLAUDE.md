# RTMN Organization Twin Service

> **Version:** 1.0.0
> **Port:** 4710
> **Status:** ✅ Built - Phase 2 High Priority

---

## Overview

The Organization Twin Service provides digital twin capabilities for companies and organizations. It maintains real-time state synchronization, tracks health metrics, KPIs, departments, and organizational relationships.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Organization Profiles** | Complete company information and branding |
| **Department Management** | Organizational structure and headcount |
| **Health Monitoring** | Financial, operational, customer, employee health |
| **KPI Tracking** | Revenue, customers, growth metrics |
| **Relationship Mapping** | Vendor, partner, subsidiary relationships |
| **Comparison Analytics** | Compare organizations side-by-side |
| **Sync Events** | Audit trail for all changes |

### Health Dimensions

| Dimension | Description |
|-----------|-------------|
| Financial | Revenue, profitability, cash flow |
| Operational | Process efficiency, productivity |
| Customer | Satisfaction, retention, NPS |
| Employee | Engagement, satisfaction, turnover |

---

## API Endpoints

### Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List all organizations |
| GET | `/api/organizations/:id` | Get organization |
| POST | `/api/organizations` | Create organization |
| PUT | `/api/organizations/:id` | Update organization |
| DELETE | `/api/organizations/:id` | Delete organization |

### Departments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations/:id/departments` | List departments |
| POST | `/api/organizations/:id/departments` | Create department |

### Health & KPIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations/:id/health` | Get health metrics |
| PUT | `/api/organizations/:id/health` | Update health |
| GET | `/api/organizations/:id/kpis` | Get KPIs |
| PUT | `/api/organizations/:id/kpis` | Update KPIs |

### Relationships

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations/:id/relationships` | Get relationships |
| POST | `/api/organizations/:id/relationships` | Create relationship |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations/:id/sync` | Get sync history |
| POST | `/api/organizations/:id/sync` | Trigger sync |

### Comparison

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compare` | Compare organizations |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/statistics` | Get platform stats |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## Data Model

### Organization

```javascript
{
  id: "org-1",
  name: "Acme Corporation",
  legalName: "Acme Corporation Inc.",
  type: "enterprise",
  industry: "Technology",
  size: "enterprise",
  website: "https://acme.example.com",
  headquarters: { city: "San Francisco", state: "CA", country: "USA" },
  status: "active",
  branding: { primaryColor: "#0066CC", logo: "acme-logo.png" },
  health: {
    overall: 85,
    financial: 90,
    operational: 80,
    customer: 85,
    employee: 88
  },
  kpis: {
    revenue: 50000000,
    employees: 500,
    customers: 1000,
    growth: 25
  }
}
```

### Department

```javascript
{
  id: "dept-1",
  orgId: "org-1",
  name: "Engineering",
  headcount: 150,
  budget: 5000000,
  status: "active"
}
```

---

## Usage Examples

### Create Organization

```bash
curl -X POST http://localhost:4710/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NewTech Inc",
    "type": "startup",
    "industry": "SaaS",
    "size": "small",
    "headquarters": { "city": "Austin", "state": "TX", "country": "USA" }
  }'
```

### Update Health

```bash
curl -X PUT http://localhost:4710/api/organizations/org-1/health \
  -H "Content-Type: application/json" \
  -d '{"overall": 88, "financial": 92, "operational": 85}'
```

### Compare Organizations

```bash
curl -X POST http://localhost:4710/api/compare \
  -H "Content-Type: application/json" \
  -d '{"organizationIds": ["org-1", "org-2"]}'
```

---

## Integration Points

| Service | Connection | Purpose |
|---------|------------|---------|
| **Unified Hub** | Routes organization data | Central access |
| **Sales OS** | Account management | Customer organizations |
| **Procurement OS** | Supplier organizations | Vendor management |
| **Workforce OS** | Employee organizations | Company structure |
| **TwinOS Hub** | Twin synchronization | State sync |
| **MemoryOS** | Historical data | Org memory |

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/organization-twin
npm install
npm start
```

---

*Built with Phase 2 - High Priority Services*
