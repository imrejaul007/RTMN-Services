# Sales Automation Service

**Version:** 1.0.0
**Port:** 5183
**Status:** Active

## Overview

Sales automation service handles automated follow-ups, smart lead routing, and auto escalation for the RTMN sales ecosystem.

## Features

### 1. Automated Follow-ups
- Configurable follow-up sequences
- Multi-channel outreach (email, SMS, push)
- Smart timing based on engagement patterns
- Lead nurturing workflows

### 2. Smart Routing
- Rule-based lead distribution
- Round-robin assignment
- Workload balancing
- Skill-based routing
- Priority scoring

### 3. Auto Escalation
- Response time monitoring
- Priority-based escalation
- Multi-level escalation chains
- SLA tracking
- Urgent flag detection

### 4. Workflow Triggers
- Event-driven automation
- Condition-based actions
- Time-based triggers
- Multi-step workflows

## API Endpoints

### Follow-ups
- `POST /api/followups` - Create follow-up sequence
- `GET /api/followups` - List all follow-ups
- `GET /api/followups/:id` - Get follow-up details
- `PUT /api/followups/:id` - Update follow-up
- `DELETE /api/followups/:id` - Delete follow-up
- `POST /api/followups/:id/execute` - Execute follow-up
- `POST /api/followups/:id/skip` - Skip follow-up

### Routing
- `POST /api/routing/rules` - Create routing rule
- `GET /api/routing/rules` - List routing rules
- `GET /api/routing/rules/:id` - Get rule details
- `PUT /api/routing/rules/:id` - Update rule
- `DELETE /api/routing/rules/:id` - Delete rule
- `POST /api/routing/route` - Route a lead
- `GET /api/routing/queues` - List queues

### Escalation
- `POST /api/escalations` - Create escalation rule
- `GET /api/escalations` - List escalation rules
- `GET /api/escalations/:id` - Get escalation details
- `PUT /api/escalations/:id` - Update rule
- `DELETE /api/escalations/:id` - Delete rule
- `GET /api/escalations/pending` - List pending escalations
- `POST /api/escalations/:id/resolve` - Resolve escalation

### Workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - List workflows
- `GET /api/workflows/:id` - Get workflow details
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/activate` - Activate workflow
- `POST /api/workflows/:id/deactivate` - Deactivate workflow
- `GET /api/workflows/:id/executions` - Get execution history

### Health
- `GET /health` - Health check
- `GET /api/stats` - Automation statistics

## Data Models

### FollowUp
```typescript
{
  id: string;
  leadId: string;
  type: 'email' | 'sms' | 'push' | 'call';
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  maxAttempts: number;
  sequence: number;
  template: string;
  metadata: Record<string, any>;
}
```

### RoutingRule
```typescript
{
  id: string;
  name: string;
  conditions: Condition[];
  targetQueue: string;
  priority: 'high' | 'medium' | 'low';
  active: boolean;
}
```

### EscalationRule
```typescript
{
  id: string;
  name: string;
  triggerCondition: string;
  escalationLevels: EscalationLevel[];
  responseTimeMinutes: number;
  active: boolean;
}
```

### Workflow
```typescript
{
  id: string;
  name: string;
  triggers: Trigger[];
  actions: Action[];
  active: boolean;
  executionCount: number;
}
```

## Integration

### Event Bus
- Publishes: `sales.automation.followup.sent`, `sales.automation.lead.routed`, `sales.automation.escalation.triggered`
- Subscribes: `lead.created`, `lead.updated`, `deal.stage_changed`

### Service Registry
- Registers at: `http://localhost:4399/api/services`
- Service name: `sales-automation`

## Configuration

Environment variables:
- `PORT` - Server port (default: 5183)
- `FOLLOWUP_INITIAL_DELAY_MINUTES` - Initial follow-up delay
- `ROUTING_LEAD_THRESHOLD_HIGH` - High priority threshold
- `ESCALATION_RESPONSE_TIME_MINUTES` - Response time threshold

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Start server
npm run dev

# Health check
curl http://localhost:5183/health
```
