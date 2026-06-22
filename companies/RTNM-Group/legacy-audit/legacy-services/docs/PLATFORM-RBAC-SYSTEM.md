# REZ Platform - Complete RBAC System

**Date:** May 18, 2026
**Version:** 1.0

---

## Overview

Complete role-based access control for the entire REZ ecosystem with hierarchical permissions.

---

## Role Hierarchy

```
GLOBAL LEADERSHIP
│
├── Super Admin (Full Control)
│
├── CFO (Finance)
├── CTO (Technology)
├── CMO (Marketing)
├── COO (Operations)
├── CHRO (Human Resources)
└── Chief AI Officer (AI/ML)
    │
    └── COMPANY ADMINISTRATION
        │
        ├── Company CEO (Full company control)
        ├── Company CTO (Technology)
        ├── Company CFO (Finance)
        ├── Company CMO (Marketing)
        ├── Company COO (Operations)
        ├── Company Admin (General)
        │
        └── DEPARTMENT ROLES
            ├── Department Head
            ├── Manager
            ├── Team Lead
            ├── Team Member
            └── Viewer
```

---

## Global Leadership Roles

### Super Admin
**Access:** Everything
```
Permissions: *
```
- Full ecosystem control
- User management
- Company management
- Service deployment
- Audit access

### CFO (Chief Financial Officer)
**Access:** Finance & Revenue
```
Permissions:
- finance.view, finance.revenue, finance.costs
- finance.reports, finance.budgets, finance.audit
- reports, dashboard, view.all
```

**Dashboard Widgets:**
- Total Revenue
- Revenue Trend
- Costs & Expenses
- Revenue by Company
- Budget Status
- Financial Forecasts

### CTO (Chief Technology Officer)
**Access:** Technology & Engineering
```
Permissions:
- tech.services, tech.deploy, tech.config
- tech.databases, tech.security, tech.performance
- reports, dashboard, view.all
```

**Dashboard Widgets:**
- Service Health
- Deployments
- Incidents
- System Performance
- Security Alerts
- Technical Debt

### CMO (Chief Marketing Officer)
**Access:** Marketing & Growth
```
Permissions:
- marketing.campaigns, marketing.karma, marketing.ads
- marketing.content, marketing.audiences, marketing.analytics
- reports, dashboard, view.all
```

**Dashboard Widgets:**
- Active Campaigns
- Karma Program Stats
- Ads Performance
- Audience Growth
- Marketing Funnel
- Marketing ROI

### COO (Chief Operations Officer)
**Access:** Operations & Logistics
```
Permissions:
- ops.delivery, ops.orders, ops.inventory
- ops.fulfillment, ops.warehouse, ops.logistics
- reports, dashboard, view.all
```

**Dashboard Widgets:**
- Order Volume
- Fulfillment Rate
- Delivery Metrics
- Inventory Status
- Logistics
- Warehouse Status

### CHRO (Chief Human Resources Officer)
**Access:** Human Resources
```
Permissions:
- hr.employees, hr.recruiting, hr.payroll
- hr.benefits, hr.training, hr.performance
- reports, dashboard, view.all
```

**Dashboard Widgets:**
- Headcount
- Open Positions
- Turnover Rate
- Training Programs
- Performance Reviews
- Benefits Utilization

### Chief AI Officer
**Access:** AI & Machine Learning
```
Permissions:
- ai.models, ai.training, ai.deployment
- ai.monitoring, ai.experiments, ai.data
- reports, dashboard, view.all
```

**Dashboard Widgets:**
- AI Models
- Training Jobs
- Prediction Accuracy
- A/B Experiments
- AI Performance
- Data Quality

---

## Company Administration Roles

Each company has its own admin structure:

### Company CEO
**Access:** Full control of their company
```
Permissions: company.*, view.all, reports, dashboard
```

### Company CTO
**Access:** Technology of their company
```
Permissions: tech.services, tech.config, company.analytics
```

### Company CFO
**Access:** Finance of their company
```
Permissions: finance.view, finance.revenue, company.analytics
```

### Company CMO
**Access:** Marketing of their company
```
Permissions: marketing.*, company.analytics
```

### Company COO
**Access:** Operations of their company
```
Permissions: ops.*, company.analytics
```

---

## Department Roles

| Role | Permissions | Access Level |
|------|------------|--------------|
| Department Head | reports, dashboard, view.all, support.tickets | Management |
| Manager | reports, support.tickets | Team management |
| Team Lead | support.tickets | Supervision |
| Team Member | support.tickets | Daily work |
| Viewer | (none) | Read-only |

---

## Companies Under Platform

| Company | Type | Admins |
|---------|------|--------|
| RABTUL Technologies | Infrastructure | CTO, CFO |
| REZ-Consumer | Consumer Apps | Company Admin |
| REZ-Merchant | Merchant OS | Company Admin |
| REZ-Media | Advertising | CMO |
| StayOwn-Hospitality | Hotels | Company Admin |
| CorpPerks | Enterprise HR | CHRO |

---

## API Endpoints

### Authentication
```
POST /auth/login
```

### Dashboards (Role-specific)
```
GET /api/dashboard
```

### Companies
```
GET    /api/companies         # List all
GET    /api/companies/:id     # Get one
GET    /api/companies/:id/users # Company users
```

### Finance (CFO only)
```
GET /api/finance/revenue
GET /api/finance/costs
GET /api/finance/budgets
```

### Technology (CTO only)
```
GET /api/tech/services
GET /api/tech/deployments
GET /api/tech/incidents
```

### Marketing (CMO only)
```
GET /api/marketing/campaigns
GET /api/marketing/karma
GET /api/marketing/ads
```

### Operations (COO only)
```
GET /api/ops/orders
GET /api/ops/delivery
GET /api/ops/inventory
```

### HR (CHRO only)
```
GET /api/hr/employees
GET /api/hr/hiring
GET /api/hr/training
```

### AI (CAIO only)
```
GET /api/ai/models
GET /api/ai/experiments
GET /api/ai/training
```

### Audit
```
GET /api/audit
```

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@rez.money | superadmin123 |
| CFO | cfo@rez.money | cfo123 |
| CTO | cto@rez.money | cto123 |
| CMO | cmo@rez.money | cmo123 |
| COO | coo@rez.money | coo123 |
| CHRO | chro@rez.money | chro123 |
| CAIO | caio@rez.money | chiefai123 |

---

## Company Isolation

- **Global Roles** (CFO, CTO, etc.) can view ALL companies
- **Company Roles** can ONLY view their company
- **Super Admin** has full control of everything

---

## Security

1. JWT-based authentication
2. Role-scoped permissions
3. Company isolation
4. Audit logging
5. Session expiry (24 hours)

---

## Next Steps

1. Create company-specific dashboards
2. Add more granular permissions
3. Add API rate limiting per role
4. Add SSO integration
5. Add audit log alerts
