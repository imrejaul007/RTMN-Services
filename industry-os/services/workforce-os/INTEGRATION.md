# RTMN Workforce OS - CorpPerks Integration Guide

**Version:** 2.0  
**Date:** June 17, 2026  
**Status:** Ready for Integration

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RTMN WORKFORCE OS v2.0                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐          ┌─────────────────────┐                │
│  │    PeopleOS         │          │     TalentAI        │                │
│  │    (Port 3001)      │          │     (Port 3002)     │                │
│  └──────────┬──────────┘          └──────────┬──────────┘                │
│             │                                  │                           │
│             │    ┌────────────────────────────┴─────────────────────┐     │
│             │    │                                                   │     │
│             ▼    ▼                                                   ▼     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   WORKFORCE OS UNIFIED API GATEWAY                   │   │
│  │                         (Port 5065)                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│             │                                                           │
│    ┌───────┴───────────────────────────────────────────────────────┐     │
│    │                                                               │     │
│    ▼                                                               ▼     │
│ ┌──────────────┐                                            ┌──────────┐ │
│ │Workforce OS  │                                            │Talent OS │ │
│ │   Core      │                                            │ (5066)   │ │
│ │  (5065)     │                                            └──────────┘ │
│ └──────┬───────┘                                                     │
│        │                                                              │
│        ├─────────────────────────────────────────────────────────┐     │
│        │                                                         │     │
│        ▼                                                         ▼     │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │  Learning OS     │  │Organization OS   │  │Workforce Intel  │  │
│ │    (5068)        │  │    (5072)        │  │    (5073)        │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    EXISTING CORPPERKS SERVICES                     │  │
│  │                                                                      │  │
│  │  CorpPerks Backend (4006) │ Payroll (4007) │ Shifts (4010)        │  │
│  │  Meeting (4013)           │ Documents (4014)│ Analytics (4018)     │  │
│  │  Role AI Agents (4130)    │ Intelligence (4135)                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                       FOUNDATION SERVICES                          │  │
│  │  CorpID (4702) │ Memory OS (4703) │ TwinOS Hub (4705) │ Event Bus │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Port Registry

| Port | Service | Purpose | Connected Apps |
|------|---------|---------|----------------|
| **5065** | Workforce OS Core | Unified HR API | PeopleOS, TalentAI |
| **5066** | Talent OS | Recruitment ATS | TalentAI |
| **5068** | Learning OS | LMS & Skills | PeopleOS |
| **5072** | Organization OS | Org Design | PeopleOS |
| **5073** | Workforce Intelligence | AI Insights | PeopleOS |

---

## API Integration Guide

### For PeopleOS (Port 3001)

Update `NEXT_PUBLIC_API_URL` to point to Workforce OS:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5065
```

### For TalentAI (Port 3002)

Update API calls to use Talent OS:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5066
```

---

## API Mapping

### Employee Endpoints

| Old Endpoint | New Endpoint | Status |
|--------------|-------------|--------|
| `GET /api/employees` | `GET /api/employees` | ✅ Migrated |
| `POST /api/employees` | `POST /api/employees` | ✅ Migrated |
| `GET /api/leave/balance/:id` | `GET /api/leave/balance/:employeeId` | ✅ Migrated |
| `POST /api/leave/request` | `POST /api/leave/request` | ✅ Migrated |
| `POST /api/attendance/checkin` | `POST /api/attendance/checkin` | ✅ Migrated |
| `GET /api/payroll/records` | `GET /api/payroll/records` | ✅ Migrated |
| `GET /api/benefits/plans` | `GET /api/benefits/plans` | ✅ Migrated |

### Recruitment Endpoints

| Old Endpoint | New Endpoint | Status |
|--------------|-------------|--------|
| `GET /api/jobs` | `GET /api/jobs` | ✅ Migrated |
| `POST /api/jobs` | `POST /api/jobs` | ✅ Migrated |
| `GET /api/candidates` | `GET /api/candidates` | ✅ Migrated |
| `POST /api/candidates` | `POST /api/candidates` | ✅ Migrated |
| `POST /api/candidates/:id/move` | `POST /api/candidates/:id/move` | ✅ Migrated |
| `GET /api/pipeline` | `GET /api/pipeline/kanban` | ✅ Enhanced |

---

## Frontend Integration Code

### Update API Service File

```javascript
// lib/api.js (PeopleOS)

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5065';

export const api = {
  // Employees
  async getEmployees(params = {}) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/api/employees?${query}`);
  },

  async getEmployee(id) {
    return fetch(`${API_BASE}/api/employees/${id}`);
  },

  async createEmployee(data) {
    return fetch(`${API_BASE}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Leave
  async getLeaveBalance(employeeId) {
    return fetch(`${API_BASE}/api/leave/balance/${employeeId}`);
  },

  async requestLeave(data) {
    return fetch(`${API_BASE}/api/leave/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Attendance
  async checkIn(data) {
    return fetch(`${API_BASE}/api/attendance/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Payroll
  async getPayrollRecords(params = {}) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/api/payroll/records?${query}`);
  },

  // Benefits
  async getBenefitsPlans() {
    return fetch(`${API_BASE}/api/benefits/plans`);
  },

  // Analytics
  async getDashboard() {
    return fetch(`${API_BASE}/api/analytics/dashboard`);
  },

  // AI Copilot
  async chatWithCopilot(message, employeeId) {
    return fetch(`${API_BASE}/api/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, employeeId })
    });
  }
};
```

### Update Recruitment API (TalentAI)

```javascript
// lib/talent-api.js (TalentAI)

const TALENT_API_BASE = 'http://localhost:5066';

export const talentApi = {
  // Jobs
  async getJobs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${TALENT_API_BASE}/api/jobs?${query}`);
  },

  async createJob(data) {
    return fetch(`${TALENT_API_BASE}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async publishJob(id) {
    return fetch(`${TALENT_API_BASE}/api/jobs/${id}/publish`, {
      method: 'POST'
    });
  },

  // Candidates
  async getCandidates(params = {}) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${TALENT_API_BASE}/api/candidates?${query}`);
  },

  async addCandidate(data) {
    return fetch(`${TALENT_API_BASE}/api/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async moveCandidate(id, stage, notes) {
    return fetch(`${TALENT_API_BASE}/api/candidates/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, notes })
    });
  },

  async scoreCandidate(id) {
    return fetch(`${TALENT_API_BASE}/api/candidates/${id}/score`, {
      method: 'POST'
    });
  },

  async scheduleInterview(id, data) {
    return fetch(`${TALENT_API_BASE}/api/candidates/${id}/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Pipeline
  async getPipelineKanban(jobId) {
    const query = jobId ? `?jobId=${jobId}` : '';
    return fetch(`${TALENT_API_BASE}/api/pipeline/kanban${query}`);
  },

  async getPipelineStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${TALENT_API_BASE}/api/pipeline/stats?${query}`);
  },

  // AI
  async aiMatch(candidateId, jobIds) {
    return fetch(`${TALENT_API_BASE}/api/ai/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, jobIds })
    });
  },

  async generateQuestions(jobId, stage) {
    return fetch(`${TALENT_API_BASE}/api/ai/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, stage })
    });
  },

  async sourcingSuggestions(jobId) {
    return fetch(`${TALENT_API_BASE}/api/ai/sourcing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    });
  }
};
```

---

## Workflow Integration

### Dual-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND APPS                             │
│                                                                 │
│   PeopleOS (3001) ◄────────────────────────────────────────┐  │
│        │                                                      │  │
│        │  Uses Workforce OS Core (5065)                      │  │
│        │  for: Employees, Leave, Attendance, Payroll         │  │
│        │                                                      │  │
│        │  Uses Workforce Intelligence (5073)                  │  │
│        │  for: HR Dashboard, AI Insights, Trends            │  │
│        │                                                      │  │
│        │  Uses Learning OS (5068)                            │  │
│        │  for: Training, Skills, Certifications             │  │
│        │                                                      │  │
│        │  Uses Organization OS (5072)                       │  │
│        │  for: Org Chart, Headcount                         │  │
│        │                                                      │  │
│   TalentAI (3002) ◄─────────────────────────────────────────┘  │
│        │                                                        │
│        │  Uses Talent OS (5066)                               │
│        │  for: Jobs, Candidates, Pipeline                    │
│        │                                                        │
│        │  Uses Workforce Intelligence (5073)                   │
│        │  for: Recruitment Analytics, Predictions             │
│        │                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## CorpPerks Backend Bridge

The Workforce OS acts as a bridge to existing CorpPerks services:

```javascript
// routes/corpperks-bridge.js

import express from 'express';
const router = express.Router();

// Proxy requests to CorpPerks services
router.get('/corpperks/:service/*', async (req, res) => {
  const { service } = req.params;
  const endpoints = {
    payroll: 'http://localhost:4007',
    shifts: 'http://localhost:4010',
    meeting: 'http://localhost:4013',
    analytics: 'http://localhost:4018'
  };

  const baseUrl = endpoints[service];
  if (!baseUrl) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const path = req.params[0];
  const url = `${baseUrl}/api/${path}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to service' });
  }
});

export default router;
```

---

## Data Synchronization

### Event Bus Integration

All Workforce OS services publish events to the Event Bus:

```javascript
// Events published by Workforce OS

const events = {
  // Employee events
  'workforce.employee.created',
  'workforce.employee.updated',
  'workforce.employee.terminated',

  // Leave events
  'workforce.leave.requested',
  'workforce.leave.approved',
  'workforce.leave.rejected',

  // Recruitment events
  'workforce.job.created',
  'workforce.job.published',
  'workforce.candidate.applied',
  'workforce.candidate.stage_changed',
  'workforce.candidate.hired',

  // Learning events
  'workforce.enrollment.created',
  'workforce.course.completed',
  'workforce.certification.earned'
};
```

---

## Testing the Integration

### 1. Start All Services

```bash
cd industry-os/services
./start-workforce-os.sh start
```

### 2. Test PeopleOS Integration

```bash
# Test Employee endpoints
curl http://localhost:5065/api/employees
curl http://localhost:5065/api/employees/EMP001
curl http://localhost:5065/api/leave/balance/EMP001

# Test Attendance
curl -X POST http://localhost:5065/api/attendance/checkin \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"EMP001"}'

# Test Analytics
curl http://localhost:5065/api/analytics/dashboard
```

### 3. Test TalentAI Integration

```bash
# Test Jobs
curl http://localhost:5066/api/jobs
curl http://localhost:5066/api/jobs/JOB001

# Test Candidates
curl http://localhost:5066/api/candidates
curl -X POST http://localhost:5066/api/candidates \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com"}'

# Test Pipeline
curl http://localhost:5066/api/pipeline/kanban
curl http://localhost:5066/api/pipeline/stats

# Test AI
curl -X POST http://localhost:5066/api/ai/match \
  -H "Content-Type: application/json" \
  -d '{"candidateId":"CAND001"}'
```

### 4. Test Workforce Intelligence

```bash
# Test Analytics
curl http://localhost:5073/api/analytics/overview
curl http://localhost:5073/api/analytics/hr-dashboard

# Test Predictions
curl http://localhost:5073/api/predictions/attrition
curl http://localhost:5073/api/predictions/flight-risk

# Test Intelligence
curl http://localhost:5073/api/intelligence/sentiment
curl http://localhost:5073/api/intelligence/skills

# Test Insights
curl http://localhost:5073/api/insights/cards
curl http://localhost:5073/api/analytics/alerts
```

---

## Deployment

### Docker Compose

```yaml
# docker-compose.workforce.yml
version: '3.8'

services:
  workforce-os:
    build: ./workforce-os
    ports:
      - "5065:5065"
    environment:
      - PORT=5065

  talent-os:
    build: ./talent-os
    ports:
      - "5066:5066"
    environment:
      - PORT=5066

  learning-os:
    build: ./learning-os
    ports:
      - "5068:5068"
    environment:
      - PORT=5068

  organization-os:
    build: ./organization-os
    ports:
      - "5072:5072"
    environment:
      - PORT=5072

  workforce-intelligence:
    build: ./workforce-intelligence
    ports:
      - "5073:5073"
    environment:
      - PORT=5073
```

### Deploy with Render

Add to `render.yaml`:

```yaml
services:
  - type: web
    name: workforce-os
    env: node
    region: singapore
    plan: starter
    buildCommand: cd workforce-os && npm install
    startCommand: cd workforce-os && npm start
    healthCheckPath: /health

  - type: web
    name: talent-os
    env: node
    region: singapore
    plan: starter
    buildCommand: cd talent-os && npm install
    startCommand: cd talent-os && npm start
    healthCheckPath: /health
```

---

## Next Steps

1. **Update PeopleOS frontend** to use Workforce OS API
2. **Update TalentAI frontend** to use Talent OS API
3. **Migrate data** from CorpPerks backend to Workforce OS
4. **Deploy** Workforce OS services to production
5. **Update DNS** to point to new services

---

*Last Updated: June 17, 2026*
