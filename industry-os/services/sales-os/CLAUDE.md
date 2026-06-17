# Sales OS - Documentation

**Port:** 5055  
**Status:** ✅ Production Ready  
**Version:** 1.0.0

---

## Overview

Sales OS is a unified sales intelligence platform that combines multiple RTMN services into a single, powerful sales operating system.

### Integrated Services

| Source | Service | Purpose |
|--------|---------|---------|
| REZ SalesMind | CRM & Pipeline | 10,532 lines - Full CRM, pipeline, deals |
| Services | Sales Copilot | 405 lines - AI sales assistant |
| Services | Lead Twin | 317 lines - Lead intelligence & scoring |
| Services | CRM Engine | 161 lines - Basic CRM functionality |
| Services | Executive Copilot | 404 lines - Executive dashboards |
| Services | Finance Copilot | 380 lines - Financial insights |
| Services | Marketing Copilot | 470 lines - Campaign management |
| RTNM-Group | BOA OS | Automation & workflows |
| SUTAR OS | Goals | Autonomous goal tracking |
| Memory OS | Memory | Customer memory & preferences |
| TwinOS Hub | Twins | Digital twins for leads/accounts |

---

## API Endpoints

### Core CRM

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/leads | List all leads |
| GET | /api/leads/:id | Get lead details |
| POST | /api/leads | Create lead |
| PATCH | /api/leads/:id | Update lead |
| POST | /api/leads/:id/convert | Convert lead to opportunity |
| POST | /api/leads/:id/score | Score lead |
| GET | /api/accounts | List accounts |
| GET | /api/accounts/:id | Get account details |
| POST | /api/accounts | Create account |
| GET | /api/opportunities | List opportunities/deals |
| GET | /api/opportunities/:id | Get deal details |
| POST | /api/opportunities | Create deal |
| PATCH | /api/opportunities/:id | Update deal |
| POST | /api/opportunities/:id/move | Move in pipeline |

### Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pipeline | Full pipeline view |
| GET | /api/pipeline/stages | Pipeline stages |

### Team

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sales-reps | List sales reps with metrics |
| GET | /api/sales-reps/:id | Get rep performance |

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/activities | List activities |
| POST | /api/activities | Log activity |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/:id | Update task |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/overview | Sales overview |
| GET | /api/analytics/forecast | Revenue forecast |
| GET | /api/analytics/rep-performance | Rep performance |
| GET | /api/analytics/conversion-funnel | Funnel analysis |

### AI Copilot

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/copilot/suggest | Get AI suggestions |

### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/integrations | List integrations |
| POST | /api/integrations/:id/sync | Sync integration |

### Digital Twins

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/twin/lead/:id | Lead Twin |
| GET | /api/twin/account/:id | Account Twin |

### Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/memory/:type/:id | Get entity memory |

### Goals (SUTAR)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/goals | Get sales goals |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Full dashboard data |

---

## Quick Start

```bash
cd industry-os/services/sales-os
npm install
npm start
# Server runs on http://localhost:5055
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| SALES_OS_PORT | 5055 | Server port |

---

## Architecture

```
Sales OS (Port 5055)
├── CRM Core
│   ├── Leads Management
│   ├── Accounts/Contacts
│   ├── Opportunities/Deals
│   └── Pipeline Stages
├── AI Copilots
│   ├── Sales Copilot
│   ├── Finance Copilot
│   ├── Marketing Copilot
│   └── Executive Copilot
├── Intelligence
│   ├── Lead Twin
│   ├── Account Twin
│   └── Behavior Analysis
├── Automation
│   ├── SUTAR OS Goals
│   ├── Workflow Engine
│   └── Activity Tracking
├── Memory
│   └── Memory OS Integration
└── Analytics
    ├── Forecasting
    ├── Rep Performance
    └── Conversion Funnel
```

---

## Data Model

### Lead
```json
{
  "id": "LD001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "company": "TechCorp",
  "source": "referral",
  "status": "new",
  "score": 85,
  "value": 150000
}
```

### Opportunity
```json
{
  "id": "OPP001",
  "title": "Enterprise Deal",
  "accountId": "ACC001",
  "value": 2500000,
  "stage": "proposal",
  "probability": 60,
  "closeDate": "2026-07-15",
  "ownerId": "SR001"
}
```

### Pipeline Stages
1. Lead (10%)
2. Qualified (25%)
3. Proposal (50%)
4. Negotiation (75%)
5. Closed Won (100%)
6. Closed Lost (0%)

---

## RTMN Layer Integration

Sales OS connects to all 15 RTMN Layers:

| Layer | Service | Integration |
|-------|---------|-------------|
| 1 | Intelligence | HOJAI AI, Genie |
| 2 | Customer Growth | AdBazaar CRM |
| 3 | Commerce | REZ-Merchant |
| 4 | Financial | RABTUL Finance |
| 5 | Workforce | CorpPerks HR |
| 6 | Legal | LawGens |
| 7 | Property | RisnaEstate |
| 8 | Health | RisaCare |
| 9 | Mobility | KHAIRMOVE |
| 10 | Identity | CorpID |
| 11 | Memory | MemoryOS |
| 12 | Twins | TwinOS Hub |
| 13 | Automation | FlowOS |
| 14 | Autonomous | SUTAR OS |
| 15 | Network | REZ Consumer |
