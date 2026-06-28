# Background Agents

**Port:** 4792  
**Status:** ✅ Built  
**Purpose:** Background job/agent runner - schedule recurring or one-shot jobs, track run history

---

## Overview

Background Agents manages scheduled and on-demand background tasks:
- Job creation and management
- Recurring job scheduling
- Run history tracking
- Job cancellation
- Audit logging

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication
- PersistentMap storage

---

## API Endpoints

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs` | List jobs |
| GET | `/api/jobs/:id` | Get job |
| POST | `/api/jobs/:id/run` | Run job now |
| POST | `/api/jobs/:id/cancel` | Cancel job |

### Runs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/runs` | List runs |
| GET | `/api/runs/:id` | Get run |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/audit` | View audit log |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/api/health` | Detailed health |
| GET | `/ready` | Readiness |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/background-agents
npm install
npm start
```

---

## Example Usage

### Create Recurring Job
```javascript
await fetch('http://localhost:4792/api/jobs', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    name: 'daily-report',
    schedule: '0 9 * * *',  // Daily at 9 AM
    payload: {
      reportType: 'sales',
      recipients: ['team@company.com']
    }
  })
});
```

### Run Job Manually
```javascript
const run = await fetch('http://localhost:4792/api/jobs/{job-id}/run', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' }
});
```

### Cancel Job
```javascript
await fetch('http://localhost:4792/api/jobs/{job-id}/cancel', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' }
});
```

---

## Integration

| Service | Integration |
|---------|-------------|
| `agent-os` | Agent task scheduling |
| `planning-engine` | Plan execution |
| `event-platform` | Scheduled events |

---

## Related Services

- [agent-os](agent-os/) - Agent runtime
- [planning-engine](planning-engine/) - Task planning
- [event-platform](event-platform/) - Event scheduling
