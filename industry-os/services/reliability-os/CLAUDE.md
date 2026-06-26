# Reliability OS

**Port:** 5274  
**Status:** ✅ Built (June 26, 2026)

Reliability Engineering Platform: Chaos engineering, SLO tracking, incident management, health checks, and resilience testing.

## AI Agents (3)

| Agent | Purpose |
|-------|---------|
| Chaos Engineer Agent | Experiment design, blast radius analysis, hypothesis testing |
| SLO Tracker Agent | SLO monitoring, error budget calculation, burn rate alerts |
| Incident Responder | Incident detection, runbook execution, post-mortem generation |

## Key Features

- **Chaos Engineering**: Experiment catalog, automated injection, safety guards
- **SLO Management**: SLO definitions, error budgets, burn rate alerts
- **Incident Management**: Detection, escalation, runbooks, post-mortems
- **Health Checks**: Endpoint monitoring, dependency checks, circuit breakers
- **Resilience Testing**: Load testing, failover validation, recovery verification

## Endpoints

```
POST /api/experiments              # Create experiment
GET  /api/experiments             # List experiments
POST /api/experiments/:id/run    # Run experiment
GET  /api/slos                    # List SLOs
POST /api/slos                    # Create SLO
GET  /api/slos/:id/budget        # Error budget
POST /api/incidents               # Create incident
GET  /api/incidents               # List incidents
POST /api/health-checks           # Register check
GET  /api/health-checks/:id     # Check status
```

## Start

```bash
cd industry-os/services/reliability-os
npm start
# http://localhost:5274/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
