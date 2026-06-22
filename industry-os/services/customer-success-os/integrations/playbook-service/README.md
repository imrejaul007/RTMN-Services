# Customer Success Playbook Service

Automated CS playbooks and triggers for AdBazaar.

## Overview

This service manages customer success playbooks, automated triggers, and execution workflows to drive consistent CS outcomes.

## Features

- **Playbook Management**: Create, edit, activate/deactivate playbooks
- **Trigger System**: Automated triggers based on customer events
- **Multi-Action Workflows**: Email, notifications, tasks, webhooks, alerts
- **Conditional Logic**: Action conditions and branching
- **Execution Tracking**: Complete audit trail of playbook executions

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/playbooks` | Create playbook |
| GET | `/api/playbooks/:id` | Get playbook |
| PUT | `/api/playbooks/:id` | Update playbook |
| POST | `/api/playbooks/:id/trigger` | Trigger playbook |
| POST | `/api/playbooks/executions/:triggerId` | Execute playbook |
| GET | `/api/playbooks/:id/executions` | Get executions |
| GET | `/api/playbooks` | Get all playbooks |

## Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Full health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |
| GET | `/metrics` | Prometheus metrics |

## Port

**Port: 5080**