# Workforce OS v1.0.0

**Version:** 1.0.0  
**Port:** 5077  
**Status:** ✅ **RUNNING**

---

## Overview

Workforce OS is a comprehensive human resources management system (HRIS) that provides employee management, recruitment, time & attendance, payroll, performance management, and learning & development. It connects horizontally to all 24 Industry Operating Systems for unified workforce management.

## Core Modules

| Module | Description | Endpoints |
|--------|-------------|-----------|
| **Employees** | Employee records, profiles, documents | CRUD, search, departments |
| **Departments** | Org structure, teams, hierarchy | CRUD, tree view, headcount |
| **Recruitment** | Job postings, applications, hiring | Post jobs, apply, hire |
| **Attendance** | Time tracking, clock in/out, shifts | Check in/out, reports |
| **Leave** | PTO, sick leave, requests, approvals | Request, approve, calendar |
| **Payroll** | Salary, deductions, payments | Process, calculate, reports |
| **Performance** | Reviews, goals, feedback, OKRs | Create, submit, approve |
| **Learning** | Training, courses, certifications | Enroll, complete, track |
| **Benefits** | Health, retirement, perks | Enroll, manage |
| **Expenses** | Reimbursements, approvals | Submit, approve, process |
| **Policies** | HR policies, compliance | CRUD, acknowledge |

## AI Agents (10 HR Agents)

| Agent | Purpose |
|-------|---------|
| **Resume Screening Agent** | Analyze resumes, score candidates |
| **Interview Scheduling Agent** | Find slots, send invites |
| **Leave Approval Agent** | Auto-approve or route requests |
| **Payroll Processing Agent** | Calculate and process payroll |
| **Performance Analyzer** | Generate review insights |
| **Skill Gap Analyzer** | Identify training needs |
| **Compliance Checker** | Ensure policy adherence |
| **Attrition Predictor** | Flag at-risk employees |
| **Org Chart Optimizer** | Suggest structure improvements |
| **Benefits Advisor** | Recommend benefit packages |

## Industry Bridges (24 Connections)

Workforce OS connects to all Industry OS for unified HR:

| Industry | Port | Industry | Port |
|----------|------|----------|------|
| Restaurant OS | 5010 | Manufacturing OS | 5150 |
| Hotel OS | 5025 | NonProfit OS | 5160 |
| Healthcare OS | 5020 | Professional OS | 5170 |
| Retail OS | 5030 | Sports OS | 5180 |
| Legal OS | 5035 | Travel OS | 5190 |
| Education OS | 5060 | Entertainment OS | 5200 |
| Sales OS | 5055 | Construction OS | 5210 |
| Automotive OS | 5080 | Financial OS | 5220 |
| Beauty OS | 5090 | RealEstate OS | 5230 |
| Fashion OS | 5095 | Transport OS | 5240 |
| Fitness OS | 5110 | Energy OS | 5260 |
| Gaming OS | 5120 | Exhibition OS | 5270 |
| Government OS | 5130 | | |
| HomeServices OS | 5140 | | |

## RTMN Ecosystem Integration

| Service | Port | Integration |
|---------|------|-------------|
| **CorpID** | 4702 | Universal employee identity |
| **Memory OS** | 4703 | Employee preferences |
| **TwinOS Hub** | 4705 | Employee digital twins |
| **Sales OS** | 5055 | Sales team management |
| **Marketing OS** | 5500 | Marketing team |
| **Finance OS** | 4801 | Payroll integration |

## Quick Start

```bash
cd industry-os/services/workforce-os
npm install
npm start
# Runs on http://localhost:5077
```

## Health Check

```bash
curl http://localhost:5077/health
```

## API Endpoints

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/employees | List employees |
| POST | /api/employees | Create employee |
| GET | /api/employees/:id | Get employee |
| PUT | /api/employees/:id | Update employee |

### Departments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/departments | List departments |
| POST | /api/departments | Create department |
| GET | /api/departments/:id/tree | Org tree |

### Recruitment
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/jobs | List openings |
| POST | /api/jobs | Post job |
| GET | /api/applications | List applications |
| POST | /api/applications | Apply |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/attendance/checkin | Clock in |
| POST | /api/attendance/checkout | Clock out |
| GET | /api/attendance/:empId | Employee attendance |
| GET | /api/attendance/shifts | Shift schedule |

### Leave
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/leave | List requests |
| POST | /api/leave/request | Submit request |
| POST | /api/leave/:id/approve | Approve |
| GET | /api/leave/balance/:empId | Leave balance |

### Payroll
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/payroll | List records |
| POST | /api/payroll/process | Process payroll |
| GET | /api/payroll/:empId | Employee payroll |

### Performance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/performance/reviews | List reviews |
| POST | /api/performance/reviews | Create review |
| GET | /api/goals | List goals |
| POST | /api/goals | Set goal |

### Learning
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/courses | List courses |
| POST | /api/enrollments | Enroll |
| GET | /api/certifications | List certs |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/expenses | List claims |
| POST | /api/expenses | Submit expense |
| POST | /api/expenses/:id/approve | Approve |

### AI Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ai-agents/status | Agent status |
| POST | /api/ai-agents/screen-resume | Screen resume |
| POST | /api/ai-agents/schedule-interview | Schedule interview |
| POST | /api/ai-agents/analyze-performance | Performance analysis |

### Industry Bridges
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/industry-bridges | List connections |
| GET | /api/industry-bridges/:industry/staff | Industry staffing |

---

*Workforce OS - Unified HR Management for All Industries*
