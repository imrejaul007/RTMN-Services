# RTMN Employee Twin Service

> **Version:** 1.0.0
> **Port:** 4730
> **Status:** ✅ Built - Phase 2 High Priority

---

## Overview

The Employee Twin Service provides digital twin capabilities for employees and workforce management. It maintains employee profiles, skills, performance records, health metrics, and organizational hierarchy.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Employee Profiles** | Complete employment information |
| **Skills Registry** | Skills inventory with certifications |
| **Performance Management** | Reviews, objectives, achievements |
| **Health Monitoring** | Engagement, productivity, satisfaction |
| **Org Chart** | Hierarchical organization structure |
| **Team Management** | Direct reports, manager relationships |

### Health Dimensions

| Dimension | Description |
|-----------|-------------|
| Engagement | Workplace engagement level |
| Productivity | Output and efficiency |
| Satisfaction | Job satisfaction score |
| Overall | Combined health score |

---

## API Endpoints

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees |
| GET | `/api/employees/:id` | Get employee |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees/:id/skills` | Get skills |
| POST | `/api/employees/:id/skills` | Add skill |

### Performance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees/:id/performance` | Get reviews |
| POST | `/api/employees/:id/performance` | Create review |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees/:id/health` | Get health |
| PUT | `/api/employees/:id/health` | Update health |

### Organization

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/org-chart` | Get org chart |
| GET | `/api/employees/:id/team` | Get team |
| GET | `/api/employees/:id/manager` | Get manager |

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

### Employee

```javascript
{
  id: "emp-1",
  employeeId: "RTMN-001",
  firstName: "John",
  lastName: "Smith",
  email: "john.smith@rtmn.com",
  department: "Engineering",
  title: "Senior Software Engineer",
  level: "L5",
  status: "active",
  type: "full_time",
  location: { city: "San Francisco", remote: true },
  compensation: { salary: 180000, bonus: 15 },
  hireDate: "2022-03-15",
  skills: ["JavaScript", "React", "AWS"],
  health: {
    overall: 85,
    engagement: 90,
    productivity: 88,
    satisfaction: 82
  }
}
```

### Performance

```javascript
{
  id: "perf-1",
  employeeId: "emp-1",
  period: "2025-Q1",
  score: 4.5,
  objectives: ["Ship v2.0", "Mentor team"],
  achievements: ["Reduced latency 40%"],
  status: "completed"
}
```

---

## Usage Examples

### Create Employee

```bash
curl -X POST http://localhost:4730/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@rtmn.com",
    "department": "Engineering",
    "title": "Software Engineer",
    "skills": ["Python", "Machine Learning"]
  }'
```

### Add Skill

```bash
curl -X POST http://localhost:4730/api/employees/emp-1/skills \
  -H "Content-Type: application/json" \
  -d '{"skill": "AWS", "level": "advanced", "certified": true}'
```

### Create Performance Review

```bash
curl -X POST http://localhost:4730/api/employees/emp-1/performance \
  -H "Content-Type: application/json" \
  -d '{
    "period": "2025-Q2",
    "score": 4.2,
    "objectives": ["Lead project", "Train junior devs"],
    "achievements": ["Shipped on time", "Zero bugs"]
  }'
```

### Get Org Chart

```bash
curl http://localhost:4730/api/org-chart
```

---

## Integration Points

| Service | Connection | Purpose |
|---------|------------|---------|
| **Unified Hub** | Routes employee data | Central access |
| **Workforce OS** | Employee records | HR management |
| **Sales OS** | Sales team | Account ownership |
| **Operations OS** | Task assignment | Work coordination |
| **TwinOS Hub** | Twin synchronization | State sync |
| **MemoryOS** | Employee context | Personal memory |

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/employee-twin
npm install
npm start
```

---

*Built with Phase 2 - High Priority Services*
