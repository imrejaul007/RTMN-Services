# RTMN OS - Quick Reference Card

**Updated:** June 18, 2026  
**Status:** 🚀 30+ Services Running

---

## CORE BUSINESS OS

| Port | Service | Purpose | Modules |
|------|---------|---------|---------|
| **4801** | Finance OS | Accounting, Payroll, GL | GL, AR, AP, Treasury, Tax, AI Copilot, 24 Industry |
| **5077** | Workforce OS | Employees, HR | Employees, Payroll, Attendance, Leave, Benefits |
| **5055** | Sales OS | CRM, Pipeline | Leads, Deals, 22 AI Agents |
| **5035** | **Legal OS** | Contracts, Compliance | Contracts, Compliance, Documents, AI Twin |
| **5250** | **Operations OS** | **AI COO** | **21 Modules, 23 AI Agents, Observe→Learn→Automate** |

---

## OPERATIONS OS (Port 5250) - NEW

### 21 Modules
```
Command Center | Process OS | Workflow OS | Project OS | Task OS
SOP OS | Approval OS | Resource OS | Incident OS | Risk OS
Analytics | Delivery | Planning | PMO | Quality
Change Mgmt | Knowledge | Capacity | Automation | Process Learning | AI Brain
```

### 23 AI Agents
```
Planning: AI Planner, AI Scheduler, AI Roadmap Manager
Projects: AI PM, AI PMO Officer, AI Delivery Manager
Workflows: AI Workflow Designer, AI Process Optimizer, AI Automation Engineer
Operations: AI COO, AI Capacity Planner, AI Risk Manager, AI Quality Manager, AI Incident Manager, AI Compliance Coordinator, AI SOP Manager, AI Performance Analyst, AI Continuous Improvement Manager, AI Change Manager, AI Service Delivery Manager, AI Operations Analyst
```

### 10 Digital Twins
```
Process | Project | Task | Resource | Incident
Risk | Delivery | Team | Department | Operations
```

### Process Learning: Observe → Learn → Automate
```
1. Observe: POST /api/learning/observe
2. Learn: POST /api/learning/learn/:id
3. Automate: POST /api/learning/automate/:id
```

---

## FINANCE OS (Port 4801)

```bash
curl http://localhost:4801/health
curl http://localhost:4801/api/dashboard/overview
curl http://localhost:4801/api/industries/health
curl -X POST http://localhost:4801/api/copilot/chat -d '{"message": "Cash?"}'
```

---

## WORKFORCE OS (Port 5077)

```bash
curl http://localhost:5077/health
curl http://localhost:5077/api/employees
curl -X POST http://localhost:5077/api/payroll/process/2026-06
```

---

## SALES OS (Port 5055)

```bash
curl http://localhost:5055/health
curl http://localhost:5055/api/crm/leads
curl http://localhost:5055/api/pipeline/kanban
curl -X POST http://localhost:5055/api/copilot/chat -d '{"message": "Pipeline?"}'
```

---

## LEGAL OS (Port 5035)

```bash
curl http://localhost:5035/health
curl http://localhost:5035/api/contracts
curl http://localhost:5035/api/compliance
curl http://localhost:5035/api/documents
curl http://localhost:5035/api/twin
curl -X POST http://localhost:5035/api/ai/analyze -d '{"query": "contracts"}'
```

---

## OPERATIONS OS (Port 5250)

```bash
# Health
curl http://localhost:5250/health

# Command Center
curl http://localhost:5250/api/command-center

# Process Learning
curl -X POST http://localhost:5250/api/learning/observe \
  -H "Content-Type: application/json" \
  -d '{"entityId": "PROC001", "step": "Submit", "action": "click", "outcome": "success"}'

curl -X POST http://localhost:5250/api/learning/learn/PROC001

curl -X POST http://localhost:5250/api/learning/automate/PROC001

# AI Analysis
curl -X POST http://localhost:5250/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "Operations health?"}'

# Projects & Tasks
curl http://localhost:5250/api/projects
curl http://localhost:5250/api/tasks
curl http://localhost:5250/api/incidents
curl http://localhost:5250/api/risks

# AI Agents
curl http://localhost:5250/api/ai/agents

# Digital Twins
curl http://localhost:5250/api/twins

# Industry Workflows
curl http://localhost:5250/api/workflows/industries
curl http://localhost:5250/api/workflows/industry/hospitality
```

---

## 24 INDUSTRY OS

| Port | Industry | Port | Industry |
|------|----------|------|----------|
| 5010 | Restaurant | 5120 | Gaming |
| 5020 | Healthcare | 5130 | Government |
| 5025 | Hotel | 5140 | HomeServices |
| 5030 | Retail | 5150 | Manufacturing |
| 5035 | Legal | 5160 | NonProfit |
| 5050 | Hospitality | 5170 | Professional |
| 5055 | Sales | 5180 | Sports |
| 5060 | Education | 5190 | Travel |
| 5080 | Automotive | 5200 | Entertainment |
| 5090 | Beauty | 5210 | Construction |
| 5100 | Energy | 5220 | Financial |
| 5110 | Fitness | 5230 | RealEstate |
| | | 5240 | Transport |

---

## FOUNDATION

| Port | Service | Port | Service |
|------|---------|------|---------|
| 4702 | CorpID | 4242 | Goal OS |
| 4703 | Memory OS | 4510 | Event Bus |
| 4705 | TwinOS Hub | 4000 | GraphQL |

---

## INTEGRATION FLOW

```
Sales (Deal Won) ──► Operations ──► Create Project
                           │
                           ├──► Workforce (Team)
                           ├──► Finance (Budget)
                           └──► Industry OS (Execute)
```

---

## COMPETITOR POSITIONING

| Capability | Monday | Asana | Flowscope | **RTMN** |
|------------|--------|-------|-----------|----------|
| Tasks | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ |
| Workflows | ✅ | Partial | ✅ | ✅ |
| AI Agents | ❌ | ❌ | ✅ | ✅ **23** |
| Digital Twins | ❌ | ❌ | ❌ | ✅ **10** |
| Memory | ❌ | ❌ | ❌ | ✅ |
| **Observe→Learn→Automate** | ❌ | ❌ | Partial | ✅ **Complete** |

---

## POSITIONING

> **"The AI Operating System that learns your entire business, builds digital twins, remembers every interaction, and deploys AI agents to run operations autonomously."**

---

*RTMN OS v3.0 - June 2026*
