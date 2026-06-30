# CompanyOS Pipeline — Complete Documentation
**Version:** 1.0
**Date:** June 30, 2026
**Status:** ✅ ALL P0 AND P1 ITEMS BUILT

---

## What Was Built

| Component | Port | Status | Purpose |
|-----------|------|--------|---------|
| **Intent Engine** | 4011 | ✅ COMPLETE | Natural language → Goals → Workers |
| **Worker Registry** | 4012 | ✅ COMPLETE | Unified Human/AI/Contractor/Partner |
| **Department Runtime** | 4013 | ✅ COMPLETE | Departments as functional units |
| **ITSM Suite** | 4014 | ✅ COMPLETE | Tickets, Problems, Changes, Catalog |

---

## The Intent Pipeline Flow

```
USER INPUT
    │
    ▼
┌─────────────────────────────────────────────┐
│         INTENT ENGINE (Port 4011)           │
│                                             │
│  1. CLASSIFY (keyword + LLM fallback)        │
│     "Hire a sales manager" → hire_workforce │
│                                             │
│  2. EXTRACT ENTITIES                        │
│     role=sales manager, department=sales    │
│                                             │
│  3. DECOMPOSE GOALS                         │
│     goal: create_worker                     │
│                                             │
│  4. ROUTE TO WORKERS                        │
│     → Worker Registry                       │
│     → Salar OS (capabilities)               │
│                                             │
│  5. CREATE EXECUTION PLAN                  │
│     steps: [Hire via HR Manager]            │
│                                             │
│  6. EXECUTE                                │
│     → SUTAR Decision Engine                 │
└─────────────────────────────────────────────┘
```

---

## Intent Engine (Port 4011)

### Capabilities

| Intent | Description | Example |
|--------|-------------|---------|
| `hire_workforce` | Hire employees/AI | "Hire a sales manager" |
| `deploy_agent` | Deploy AI agent | "Deploy the marketing agent" |
| `purchase_marketplace` | Buy from BLR | "Buy an AI accountant" |
| `create_department` | Create department | "Create a data science team" |
| `analyze_performance` | Generate reports | "Show sales metrics" |
| `create_ticket` | Create support ticket | "Report an issue" |
| `workflow_execute` | Run workflows | "Run the onboarding flow" |
| `query_knowledge` | Query knowledge base | "What's our refund policy?" |
| `financial_action` | Financial operations | "Create an invoice" |
| `general_chat` | General conversation | "Hi, how are you?" |

### Endpoints

```bash
# Classify intent
POST /api/intent/classify
{
  "text": "Hire a sales manager for marketing",
  "use_llm": false
}

# Full pipeline (classify → extract → decompose → route → plan → execute)
POST /api/intent/process
{
  "text": "Hire a sales manager",
  "execute": true
}

# Get catalog
GET /api/intent/catalog

# Health check
GET /api/intent/health
```

### Response Example

```json
{
  "success": true,
  "data": {
    "input": "Hire a sales manager",
    "intent": {
      "intent": "hire_workforce",
      "confidence": 0.75,
      "explanation": "Matched keywords: hire"
    },
    "entities": [
      { "name": "role", "value": "sales manager", "confidence": 0.85 }
    ],
    "goals": [
      {
        "id": "goal_123_0",
        "type": "hire",
        "action": "create_worker",
        "status": "pending"
      }
    ],
    "plan": {
      "planId": "plan_123",
      "steps": [
        { "step": 1, "action": "create_worker", "worker": "HR Manager" }
      ]
    }
  }
}
```

---

## Worker Registry (Port 4012)

### Worker Types

| Type | Description | Ownership |
|------|-------------|-----------|
| `HUMAN` | Human employees | Self |
| `AI` | AI agents/workers | Company |
| `CONTRACTOR` | Freelancers | Self |
| `PARTNER` | External partners | Partner |

### Pre-seeded Workers

| Worker ID | Name | Department | Capabilities |
|-----------|------|------------|--------------|
| `HR-MANAGER-001` | HR Manager | Human Resources | Recruitment, Onboarding, Performance |
| `CFO-AGENT-001` | CFO Agent | Finance | Financial Analysis, Budgeting, Forecasting |
| `MARKETING-AGENT-001` | Marketing Agent | Marketing | SEO, Content, Social Media, Email |
| `SUPPORT-AGENT-001` | Support Agent | Customer Success | Ticketing, Chat, Complaints |
| `SALES-AGENT-001` | Sales Agent | Sales | Lead Qualification, Proposals, CRM |

### Endpoints

```bash
# List all workers
GET /api/workers?department=Finance&status=active

# Get single worker
GET /api/workers/CFO-AGENT-001

# Create worker
POST /api/workers
{
  "type": "AI",
  "name": "Data Analyst",
  "role": "Data Analyst",
  "department": "Analytics",
  "capabilities": ["data_analysis", "sql", "visualization"]
}

# Search by capabilities
POST /api/workers/search
{
  "capabilities": ["finance", "accounting"],
  "limit": 5
}

# Update worker
PATCH /api/workers/CFO-AGENT-001
{
  "status": "active",
  "trustScore": 0.95
}

# Get departments
GET /api/departments

# Statistics
GET /api/stats
```

### Worker Model

```json
{
  "workerId": "CFO-AGENT-001",
  "type": "AI",
  "name": "CFO Agent",
  "role": "Chief Financial Officer",
  "department": "Finance",
  "companyId": "default",
  "corpId": "corp-cfo-001",
  "capabilities": ["financial_analysis", "budgeting", "forecasting"],
  "skills": ["financial_modeling", "gaap_compliance"],
  "status": "active",
  "ownership": "company",
  "compensation": { "type": "subscription", "amount": 10000, "currency": "INR" },
  "trustScore": 0.9,
  "trustLevel": "PLATINUM",
  "capacity": {
    "maxHoursPerWeek": 168,
    "currentHoursPerWeek": 0,
    "maxConcurrentTasks": 20,
    "currentTasks": 0
  }
}
```

---

## Department Runtime (Port 4013)

### Pre-seeded Departments

| Department | Workers | Budget | Capabilities |
|------------|---------|--------|--------------|
| Human Resources | HR Manager | ₹100K | Recruitment, Training |
| Finance | CFO Agent | ₹500K | Accounting, Planning |
| Marketing | Marketing Agent | ₹200K | Campaigns, Analytics |
| Sales | Sales Agent | ₹150K | CRM, Proposals |
| Customer Success | Support Agent | ₹100K | Support, Retention |

### Endpoints

```bash
# List departments
GET /api/departments?status=active

# Get department
GET /api/departments/DEPT-FINANCE-001

# Create department
POST /api/departments
{
  "name": "Data Science",
  "capabilities": ["ml", "ai", "analytics"]
}

# Add worker to department
POST /api/departments/DEPT-FINANCE-001/workers
{
  "workerId": "ANALYST-001",
  "type": "AI"
}

# Add goal to department
POST /api/departments/DEPT-FINANCE-001/goals
{
  "name": "Q4 Financial Report",
  "dueDate": "2026-12-31",
  "assignedWorkers": ["CFO-AGENT-001"]
}

# Allocate budget
POST /api/departments/DEPT-FINANCE-001/budget/allocate
{ "amount": 50000 }

# Record spending
POST /api/departments/DEPT-FINANCE-001/budget/spend
{ "amount": 5000, "description": "Cloud infrastructure" }

# Execute task
POST /api/departments/DEPT-FINANCE-001/execute
{
  "task": "Generate monthly P&L report",
  "priority": "high"
}

# Statistics
GET /api/stats
```

---

## ITSM Suite (Port 4014)

### Pre-seeded Service Catalog

| Item | Category | SLA | Approval Required |
|------|----------|-----|------------------|
| New Laptop | Hardware | 48h | Yes (IT Manager) |
| Software Access | Access | 24h | Yes (IT Manager) |
| Password Reset | Self-Service | 1h | No |
| Leave Request | HR | 24h | Yes (HR Manager) |
| Server Access | Access | 48h | Yes (IT Manager, CTO) |

### Endpoints

```bash
# === SERVICE CATALOG ===
GET /api/catalog?category=IT
GET /api/catalog?type=access

# Request catalog item
POST /api/catalog/request
{
  "catalogItemId": "CAT-001",
  "requester": "john@company.com",
  "formData": {
    "employee_name": "John Doe",
    "department": "Engineering",
    "laptop_type": "MacBook Pro",
    "justification": "New hire"
  }
}

# === TICKETS ===
GET /api/tickets?category=it&status=open
GET /api/tickets/:id

# Create ticket
POST /api/tickets
{
  "title": "Cannot login to system",
  "description": "Getting 403 error",
  "category": "it",
  "priority": "high",
  "createdBy": "john@company.com"
}

# Update ticket
PATCH /api/tickets/TKT-12345678
{
  "status": "resolved",
  "assignedTo": "support@company.com"
}

# Add comment
POST /api/tickets/TKT-12345678/comments
{
  "author": "support@company.com",
  "text": "Issue resolved, password reset"
}

# === PROBLEMS ===
GET /api/problems?status=open

# Create problem (links multiple incidents)
POST /api/problems
{
  "title": "Multiple login failures",
  "description": "Users cannot login",
  "incidentIds": ["TKT-001", "TKT-002", "TKT-003"],
  "priority": "high",
  "createdBy": "support@company.com"
}

# Update problem
PATCH /api/problems/PRB-12345678
{
  "status": "identified",
  "rootCause": "LDAP server timeout",
  "workaround": "Use backup auth server"
}

# === CHANGES ===
GET /api/changes?status=draft

# Create change
POST /api/changes
{
  "title": "Database upgrade v2.1",
  "description": "Upgrade PostgreSQL to 16.0",
  "type": "normal",
  "risk": "high",
  "impact": "high",
  "implementationPlan": "Maintenance window 2-4 AM",
  "rollbackPlan": "Restore from backup",
  "approvers": ["CTO", "IT Manager"],
  "createdBy": "devops@company.com"
}

# Approve/reject change
POST /api/changes/CHG-12345678/approve
{
  "approver": "CTO",
  "approved": true,
  "comment": "Approved for weekend window"
}

# Statistics
GET /api/stats
```

### ITSM Statistics Response

```json
{
  "success": true,
  "data": {
    "tickets": {
      "total": 150,
      "open": 23,
      "pending": 8,
      "resolved": 100,
      "slaBreached": 5
    },
    "problems": {
      "total": 12,
      "open": 3,
      "investigating": 2,
      "resolved": 7
    },
    "changes": {
      "total": 8,
      "draft": 2,
      "approved": 3,
      "implemented": 2,
      "rejected": 1
    },
    "catalog": {
      "total": 15,
      "active": 12
    }
  }
}
```

---

## Complete Service Port Map

| Service | Port | Version | Purpose |
|---------|------|---------|---------|
| **CompanyOS Core** |
| Control Plane | 4010 | 1.0.0 | Company management |
| Intent Engine | 4011 | 1.0.0 | NLP → Goals |
| Worker Registry | 4012 | 1.0.0 | Unified workers |
| Department Runtime | 4013 | 1.0.0 | Department execution |
| ITSM Suite | 4014 | 1.0.0 | Tickets/Problems/Changes |
| **Foundation** |
| CorpID | 4702 | - | Universal identity |
| MemoryOS | 4703 | - | Persistent memory |
| TwinOS | 4705 | - | Digital twins |
| **Trust & Governance** |
| SADA OS | 4190 | - | Trust source |
| **Workforce** |
| Salar OS | 4710 | - | Workforce registry |
| **Agent Runtime** |
| AgentOS Gateway | 4802 | - | Agent platform |
| Agent Identity Bridge | 4810 | - | CorpID/TwinOS bridge |
| **SUTAR OS** |
| SUTAR Decision | 4240 | - | Decision engine |
| SUTAR Economy | 4294 | - | Economy |
| **Marketplace** |
| BLR Discovery | 4256 | - | Search |
| BLR Marketplace | 4255 | - | Listings |

---

## Example Flows

### Flow 1: "Hire an AI accountant"

```bash
# Step 1: Classify intent
curl -X POST http://localhost:4011/api/intent/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Hire an AI accountant for finance"}'

# Response:
# intent: hire_workforce
# entities: role=accountant, department=finance
# goals: [create_worker]
# assigned: HR Manager
# plan: Hire accountant via HR

# Step 2: Create the worker
curl -X POST http://localhost:4012/api/workers \
  -H "Content-Type: application/json" \
  -d '{
    "type": "AI",
    "name": "Accountant Agent",
    "role": "Accountant",
    "department": "Finance",
    "capabilities": ["accounting", "bookkeeping", "tax"]
  }'

# Step 3: Add to department
curl -X POST http://localhost:4013/api/departments/DEPT-FINANCE-001/workers \
  -H "Content-Type: application/json" \
  -d '{"workerId": "WRK-ACCT-001", "type": "AI"}'
```

### Flow 2: "Create a support ticket"

```bash
# Create ticket
curl -X POST http://localhost:4014/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cannot access dashboard",
    "description": "Getting 403 Forbidden",
    "category": "it",
    "priority": "high",
    "createdBy": "user@company.com"
  }'

# Add comment
curl -X POST http://localhost:4014/api/tickets/TKT-12345678/comments \
  -H "Content-Type: application/json" \
  -d '{
    "author": "support@company.com",
    "text": "Investigating the issue"
  }'

# Resolve ticket
curl -X PATCH http://localhost:4014/api/tickets/TKT-12345678 \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'
```

### Flow 3: "Create a change request"

```bash
# Create change
curl -X POST http://localhost:4014/api/changes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Upgrade database to v16",
    "description": "PostgreSQL 16 upgrade",
    "type": "normal",
    "risk": "medium",
    "impact": "medium",
    "implementationPlan": "Drain connections, upgrade, restart",
    "rollbackPlan": "Restore from snapshot",
    "approvers": ["CTO", "DBA"],
    "createdBy": "devops@company.com"
  }'

# CTO approves
curl -X POST http://localhost:4014/api/changes/CHG-12345678/approve \
  -H "Content-Type: application/json" \
  -d '{"approver": "CTO", "approved": true}'

# DBA approves
curl -X POST http://localhost:4014/api/changes/CHG-12345678/approve \
  -H "Content-Type: application/json" \
  -d '{"approver": "DBA", "approved": true}'

# Change is now approved
```

---

## Startup

```bash
# Start CompanyOS Pipeline
cd companies/HOJAI-AI/platform/company-os

# Start Intent Engine
cd intent-engine && node src/index.js &

# Start Worker Registry
cd ../worker-registry && node src/index.js &

# Start Department Runtime
cd ../department-runtime && node src/index.js &

# Start ITSM Suite
cd ../services/itsm && node src/index.js &
```

---

## Testing

```bash
# Test Intent Engine
curl -X POST http://localhost:4011/api/intent/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "Hire a sales manager"}'

# Test Worker Registry
curl http://localhost:4012/api/stats

# Test Department Runtime
curl http://localhost:4013/api/stats

# Test ITSM
curl http://localhost:4014/api/stats
```

---

## What's Next

| Priority | Item | Effort |
|----------|------|--------|
| P1 | E2E Tests | 1 week |
| P1 | API Documentation (OpenAPI) | 1 week |
| P2 | Dashboard UI | 2 weeks |
| P2 | Webhook integrations | 1 week |
| P3 | ML-based intent classification | 2 weeks |
| P3 | Autonomous department learning | 3 weeks |

---

*Document Version: 1.0 | Last Updated: June 30, 2026*
