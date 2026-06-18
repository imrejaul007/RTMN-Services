# RTMN Operating System - Master Documentation

**Version:** 3.0  
**Date:** June 18, 2026  
**Status:** 🚀 **ALL SERVICES RUNNING**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Finance OS](#finance-os)
3. [Workforce OS](#workforce-os)
4. [Sales OS](#sales-os)
5. [Operations OS](#operations-os) ← **NEW with Process Learning**
6. [Talent OS](#talent-os)
7. [Learning OS](#learning-os)
8. [24 Industry OS](#24-industry-os)
9. [Foundation Services](#foundation-services)
10. [Integration Guide](#integration-guide)
11. [API Reference](#api-reference)
12. [Deployment](#deployment)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              RTMN OPERATING SYSTEM v3.0                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐         │
│  │                         FINANCE OS (Port 4801)                              │         │
│  │   • Accounting  • AR/AP  • Treasury  • Budgets  • Tax  • Audit               │         │
│  │   • AI Copilot • 24 Industry Connections                                │         │
│  └───────────────────────────────────────────────────────────────────────────────┘         │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐         │
│  │                     WORKFORCE OS (Port 5077)                              │         │
│  │   • Employees  • Payroll  • Attendance  • Benefits  • Performance              │         │
│  │   • Leave  • Training  • Documents  • Finance Sync                         │         │
│  └───────────────────────────────────────────────────────────────────────────────┘         │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐         │
│  │                        SALES OS (Port 5055)                               │         │
│  │   • CRM  • Pipeline  • 22 AI Agents  • Leads  • Deals                       │         │
│  │   • Customer Success  • CPQ  • Contracts                                 │         │
│  └───────────────────────────────────────────────────────────────────────────────┘         │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐         │
│  │                   OPERATIONS OS (Port 5250) ← NEW                          │         │
│  │   • AI COO  • 21 Modules  • 23 AI Agents  • 10 Digital Twins              │         │
│  │   • Process Learning: OBSERVE → LEARN → AUTOMATE                         │         │
│  └───────────────────────────────────────────────────────────────────────────────┘         │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐         │
│  │                   24 INDUSTRY OS (Ports 5010-5240)                       │         │
│  │   Restaurant  • Healthcare  • Hotel  • Retail  • Legal  • Education           │         │
│  │   Sales  • Automotive  • Beauty  • Fitness  • RealEstate  • Manufacturing   │         │
│  │   Government  • Travel  • Entertainment  • Construction  • Transport  • Energy │
│  └───────────────────────────────────────────────────────────────────────────────┘         │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐         │
│  │              FOUNDATION SERVICES (Ports 4702-4705)                         │         │
│  │   CorpID  • Memory OS  • TwinOS Hub  • Event Bus  • Goal OS                  │         │
│  └───────────────────────────────────────────────────────────────────────────────┘         │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Finance OS (Port 4801)

### Features

| Module | Description |
|--------|-------------|
| **Accounting** | Chart of Accounts, Journal Entries, Trial Balance |
| **AR** | Invoices, Collections, Aging |
| **AP** | Bills, Payments |
| **Treasury** | Cash Position, Banks |
| **Budgets** | Department Budgets |
| **Tax** | GST/TDS |
| **Audit** | Fraud Detection |
| **AI Copilot** | Natural Language Finance Q&A |
| **24 Industry Integration** | Sync revenue/expenses from all industry OS |

### API Endpoints

```
GET  /health                       Health
GET  /api/dashboard/overview       CEO Dashboard
POST /api/copilot/chat            AI Finance Q&A
GET  /api/industries/health        24 Industry Status
GET  /api/chart-of-accounts       Chart of Accounts
```

---

## Workforce OS (Port 5077)

### Features

| Module | Description |
|--------|-------------|
| **Employees** | Profiles, Documents |
| **Payroll** | Salary, Bank Upload |
| **Attendance** | Check-in/out |
| **Leave** | Requests, Approvals |
| **Benefits** | Health, Insurance |
| **Performance** | Reviews |
| **Training** | Courses |
| **Finance Sync** | Journal Entries |

### API Endpoints

```
GET  /api/employees               Employee Directory
POST /api/payroll/process/:month   Run Payroll
POST /api/attendance/checkin       Check In
GET  /api/leave/balance/:id      Leave Balance
```

---

## Sales OS (Port 5055)

### Features

| Module | Description |
|--------|-------------|
| **CRM** | Leads, Accounts, Contacts |
| **Pipeline** | Deals, Stages |
| **Customer Success** | Health Scores, NPS |
| **CPQ** | Products, Quotes |
| **Contracts** | Contract Management |
| **Activities** | Tasks, Meetings, Calls |
| **Commissions** | Plans, SPIFFs |
| **22 AI Agents** | Full AI Sales Team |

### 22 AI Agents

| Agent | Purpose |
|-------|---------|
| Lead Scoring Agent | Score leads |
| Deal Prediction Agent | Predict close probability |
| Email Composer Agent | Write emails |
| Meeting Scheduler Agent | Schedule meetings |
| Proposal Generator Agent | Generate proposals |
| And 17 more... | Full AI Sales Team |

### API Endpoints

```
GET  /api/crm/leads              Leads
GET  /api/crm/opportunities      Deals
GET  /api/pipeline/kanban        Pipeline
POST /api/copilot/chat           AI Assistant
```

---

## Operations OS (Port 5250)

> **"AI that understands your business—not just your prompts."**

### Positioning

Not just workflow automation like competitors (Asana, Monday, ClickUp, Flowscope).

**This is a complete Business Intelligence Operating System:**

```
Observe Employees
        ↓
Learn Processes
        ↓
Build Workflow
        ↓
Create Department Twin
        ↓
Create Company Twin
        ↓
Predict Bottlenecks
        ↓
Optimize Processes
        ↓
Execute Automatically
        ↓
Coordinate Multiple AI Agents
        ↓
Learn Continuously
```

### ALL 21 MODULES

| # | Module | Status | Description |
|---|--------|--------|-------------|
| 1 | **Command Center** | ✅ | Single dashboard, Health Score |
| 2 | **Process OS** | ✅ | Process Builder, Library |
| 3 | **Workflow OS** | ✅ | Triggers, Automation |
| 4 | **Project OS** | ✅ | Projects, Budgets |
| 5 | **Task OS** | ✅ | Tasks, Subtasks |
| 6 | **SOP OS** | ✅ | Standard Operating Procedures |
| 7 | **Approval OS** | ✅ | All Approval Types |
| 8 | **Resource OS** | ✅ | Resources, Booking |
| 9 | **Incident OS** | ✅ | Severity, SLA |
| 10 | **Risk OS** | ✅ | Risk Tracking |
| 11 | **Analytics OS** | ✅ | KPIs, Metrics |
| 12 | **Delivery OS** | ✅ | Customer Delivery |
| 13 | **Planning OS** | ✅ | Strategic Plans |
| 14 | **PMO OS** | ✅ | Portfolio Management |
| 15 | **Quality OS** | ✅ | Audits, CAPA |
| 16 | **Change Management** | ✅ | Change Tracking |
| 17 | **Knowledge OS** | ✅ | Policies, SOPs |
| 18 | **Capacity OS** | ✅ | Resource Capacity |
| 19 | **Automation OS** | ✅ | Workflow Automation |
| 20 | **Process Learning OS** | ✅ | **Observe → Learn → Automate** |
| 21 | **AI Operations Brain** | ✅ | AI COO |

### 23 AI AGENTS

| Category | Agents |
|----------|--------|
| **Planning** | AI Planner, AI Scheduler, AI Roadmap Manager |
| **Projects** | AI Project Manager, AI PMO Officer, AI Delivery Manager |
| **Workflows** | AI Workflow Designer, AI Process Optimizer, AI Automation Engineer |
| **Operations** | AI Operations Manager (Chief AI COO), AI Capacity Planner, AI Resource Planner, AI Quality Manager, AI Incident Manager, AI Risk Manager, AI Compliance Coordinator, AI SOP Manager, AI Performance Analyst, AI Continuous Improvement Manager, AI Change Manager, AI Service Delivery Manager, AI Operations Analyst |

### 10 DIGITAL TWINS

| Twin | Purpose |
|------|---------|
| Process Twin | Process health |
| Project Twin | Project status |
| Task Twin | Task tracking |
| Resource Twin | Resource capacity |
| Incident Twin | Incident management |
| Risk Twin | Risk analysis |
| Delivery Twin | Delivery tracking |
| Team Twin | Team performance |
| Department Twin | Department metrics |
| **Operations Twin** | **AI COO Twin** |

### PROCESS LEARNING - Observe → Learn → Automate

```
1️⃣ OBSERVE - Watch employee actions
   POST /api/learning/observe
   {
     "entityId": "INVOICE_APPROVAL",
     "step": "Manager Review",
     "action": "click_approve",
     "duration": 30000,
     "outcome": "success"
   }

2️⃣ LEARN - Build process patterns
   POST /api/learning/learn/:processId
   → Analyzes observations
   → Identifies patterns
   → Calculates confidence (50-95%)

3️⃣ AUTOMATE - Create AI agents
   POST /api/learning/automate/:processId
   → Creates automation
   → Enables auto-execution
```

### 10 INDUSTRY WORKFLOWS

| Industry | Workflows |
|----------|----------|
| Hospitality | Check-in, Check-out, Room Service, Housekeeping |
| Restaurant | Reservation, Order, Settlement, Complaints |
| Healthcare | Registration, Appointment, Lab, Emergency |
| Retail | POS, Returns, Restock |
| Manufacturing | Production, QC, Maintenance |
| Education | Enrollment, Exams |
| IT Services | Tickets, Deployment, Access |
| General | Onboarding, Purchase, Invoice |

### Competitor Positioning

| Capability | Flowscope | Monday/Asana | **Operations OS** |
|------------|----------|--------------|-------------------|
| Learn workflows | ✅ | ❌ | ✅ |
| AI automation | ✅ | ✅ | ✅ |
| Process automation | ✅ | ✅ | ✅ |
| Long-term memory | ❌ | ❌ | ✅ |
| Digital Twins | ❌ | ❌ | ✅ |
| Personal AI | ❌ | ❌ | ✅ |
| Multi-agent | Partial | ❌ | ✅ 23 agents |
| Cross-company | ❌ | ❌ | ✅ |
| **Observe → Learn → Automate** | Partial | ❌ | ✅ Complete |

### API Endpoints

```bash
# Command Center
curl http://localhost:5250/api/command-center

# Process Learning
curl -X POST http://localhost:5250/api/learning/observe \
  -d '{"entityId": "PROC001", "step": "Submit", "outcome": "success"}'
curl -X POST http://localhost:5250/api/learning/learn/PROC001
curl -X POST http://localhost:5250/api/learning/automate/PROC001

# AI Analysis
curl -X POST http://localhost:5250/api/ai/analyze \
  -d '{"message": "What is our operations health?"}'

# Projects
curl http://localhost:5250/api/projects
curl http://localhost:5250/api/tasks
curl http://localhost:5250/api/incidents
```

---

## Talent OS (Port 5066)

### Features

- ✅ Job Postings
- ✅ Candidate Management
- ✅ Pipeline/Kanban
- ✅ Interview Scheduling
- ✅ Offer Letters
- ✅ Source Analytics

### API Endpoints

```
GET  /api/jobs                    Jobs
POST /api/jobs                    Create Job
GET  /api/candidates              Candidates
POST /api/candidates              Add Candidate
GET  /api/pipeline/kanban         Pipeline View
```

---

## Learning OS (Port 5068)

### Features

- ✅ Course Management
- ✅ Enrollments
- ✅ Skills Graph
- ✅ Certifications
- ✅ Assessments

### API Endpoints

```
GET  /api/courses                   Courses
POST /api/courses/:id/enroll         Enroll
GET  /api/skills/graph              Skills Matrix
GET  /api/certifications            Certs
```

---

## 24 Industry OS

| # | Industry | Port | # | Industry | Port |
|---|----------|------|---|----------|------|
| 1 | Restaurant | 5010 | 13 | Gaming | 5120 |
| 2 | Healthcare | 5020 | 14 | Government | 5130 |
| 3 | Hotel | 5025 | 15 | HomeServices | 5140 |
| 4 | Retail | 5030 | 16 | Manufacturing | 5150 |
| 5 | Legal | 5035 | 17 | NonProfit | 5160 |
| 6 | Hospitality | 5050 | 18 | Professional | 5170 |
| 7 | Sales | 5055 | 19 | Sports | 5180 |
| 8 | Education | 5060 | 20 | Travel | 5190 |
| 9 | Automotive | 5080 | 21 | Entertainment | 5200 |
| 10 | Beauty | 5090 | 22 | Construction | 5210 |
| 11 | Fitness | 5110 | 23 | RealEstate | 5230 |
| 12 | Energy | 5100 | 24 | Transport | 5240 |

---

## Foundation Services

| Service | Port | Purpose |
|---------|------|---------|
| CorpID | 4702 | Universal Identity |
| Memory OS | 4703 | Context Memory |
| TwinOS Hub | 4705 | Digital Twins |
| Event Bus | 4510 | Pub/Sub |
| Goal OS | 4242 | OKRs |

---

## Integration Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           FINANCE OS (4801)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Accounting   │ │     AR       │ │     AP       │ │  Treasury  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│    WORKFORCE OS    │  │      SALES OS       │  │   OPERATIONS OS    │
│       (5077)       │  │       (5055)       │  │      (5250)        │
│                    │  │                     │  │                    │
│  Payroll ──────► JE│  │  Deal Won ────► PRJ│  │  Observe ───────► │
│  Benefits ────► EXP│  │  Leads ───────► Pipeline │  │  Learn ─────────► │
│  Training ────► INV│  │  Revenue ────► AR │  │  Automate ───────► │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
                                                                       │
         ┌────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│              24 INDUSTRY OS                  │
│    Restaurant  Healthcare  Hotel  Retail    │
│    Legal  Education  Sales  Automotive     │
│    Beauty  Fitness  RealEstate  ...        │
└─────────────────────────────────────────────┘
```

---

## API Reference

### Finance OS (Port 4801)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Service health |
| GET | /api/dashboard/overview | CEO dashboard |
| POST | /api/copilot/chat | AI Q&A |
| GET | /api/industries/health | All industry status |

### Workforce OS (Port 5077)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Service health |
| GET | /api/employees | Employee list |
| POST | /api/payroll/process | Run payroll |

### Sales OS (Port 5055)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Service health |
| GET | /api/crm/leads | Leads |
| GET | /api/pipeline/kanban | Pipeline |

### Operations OS (Port 5250)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Service health |
| GET | /api/command-center | Command Center |
| POST | /api/learning/observe | Observe action |
| POST | /api/learning/learn/:id | Learn process |
| POST | /api/learning/automate/:id | Automate |
| POST | /api/ai/analyze | AI Analysis |

---

## Deployment

### Local

```bash
# Finance
cd industry-os/services/finance-os && npm start

# Workforce
cd industry-os/services/workforce-os && npm start

# Sales
cd industry-os/services/sales-os && npm start

# Operations
cd industry-os/services/operations-os && npm start
```

### Health Checks

```bash
curl http://localhost:4801/health    # Finance
curl http://localhost:5077/health    # Workforce
curl http://localhost:5055/health    # Sales
curl http://localhost:5250/health    # Operations
```

---

## Documentation Files

| File | Description |
|------|-------------|
| `FINAL-DOCUMENTATION.md` | Complete system docs |
| `MASTER-DOCUMENTATION.md` | This file |
| `QUICK-REFERENCE.md` | Port map |
| `INTEGRATION-GUIDE.md` | Industry sync |
| `FINANCE-AUDIT.md` | Finance features |
| `PLAN-FINANCE-OS.md` | Finance roadmap |
| `WORKFORCE-FINANCE-COMPARISON.md` | Feature comparison |
| `operations-os/CLAUDE.md` | Operations OS detailed docs |

---

## Status

| Service | Port | Status | Modules |
|---------|------|--------|---------|
| Finance OS | 4801 | ✅ | GL, AR, AP, Treasury, Tax, Audit |
| Workforce OS | 5077 | ✅ | HR, Payroll, Attendance |
| Sales OS | 5055 | ✅ | CRM, Pipeline, 22 AI Agents |
| Operations OS | 5250 | ✅ | 21 Modules, 23 AI Agents, Process Learning |
| Talent OS | 5066 | ✅ | ATS, Jobs |
| Learning OS | 5068 | ✅ | LMS |
| 24 Industry OS | 5010-5240 | ✅ | Industry-specific |
| Foundation | 4702-4705 | ✅ | Auth, Memory, Twins |

**Total: 30+ Services Running**

---

## What Makes RTMN Different

| Layer | Traditional Tools | RTMN OS |
|-------|-----------------|---------|
| Tasks | ✅ | ✅ |
| Projects | ✅ | ✅ |
| Workflows | ✅ | ✅ |
| SOPs | Partial | ✅ |
| Resources | Partial | ✅ |
| Quality | Rare | ✅ |
| Risk | Rare | ✅ |
| AI Optimization | Basic | ✅ |
| Long-term Memory | ❌ | ✅ |
| Digital Twins | ❌ | ✅ |
| Multi-agent | ❌ | ✅ |
| **Observe → Learn → Automate** | ❌ | ✅ |
| Cross-Department | ❌ | ✅ |
| AI COO | ❌ | ✅ |
| Autonomous Execution | ❌ | ✅ |

---

## Positioning Statement

> **"The AI Operating System that learns your entire business, builds digital twins, remembers every interaction, and deploys AI agents to run operations autonomously."**

Not just "workflow automation."

**This is the Business Intelligence Operating System.**

---

*Last Updated: June 18, 2026*
