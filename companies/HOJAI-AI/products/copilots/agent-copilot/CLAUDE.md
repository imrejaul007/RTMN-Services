# RTMN Agent Copilot Service

> **Version:** 1.0.0
> **Port:** 4920
> **Status:** ✅ Built - Phase 2 High Priority

---

## Overview

The Agent Copilot Service provides AI orchestration for managing and coordinating AI agents across the RTMN ecosystem. It enables agent registration, task execution, workflow orchestration, and performance monitoring.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Agent Management** | Register, configure, and monitor AI agents |
| **Task Execution** | Execute tasks with specific agents |
| **Workflow Orchestration** | Chain multiple agents into workflows |
| **Skill Registry** | Manage reusable AI skills |
| **Performance Metrics** | Track agent accuracy and efficiency |
| **Cost Tracking** | Monitor cost per task |
| **Real-time Execution** | Live execution monitoring |

### Agent Categories

| Category | Purpose | Sample Agents |
|----------|---------|---------------|
| Sales | Lead scoring, deal analysis | Lead Scorer |
| Marketing | Content, campaigns | Content Generator |
| Support | Customer service | Support Bot |
| Finance | Analysis, reporting | Finance Analyzer |
| HR | Recruitment, screening | HR Recruiter |
| Operations | Optimization | Ops Optimizer |

---

## API Endpoints

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get agent details |
| POST | `/api/agents` | Register new agent |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |

### Task Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/execute` | Execute task with agent |
| GET | `/api/execute/:id` | Get execution status |
| GET | `/api/executions` | List execution history |
| POST | `/api/execute/:id/cancel` | Cancel execution |

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows` | List all workflows |
| GET | `/api/workflows/:id` | Get workflow details |
| POST | `/api/workflows` | Create workflow |
| POST | `/api/workflows/:id/execute` | Execute workflow |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List all skills |
| GET | `/api/skills/:id` | Get skill details |
| POST | `/api/skills` | Create skill |
| PUT | `/api/skills/:id` | Update skill |
| DELETE | `/api/skills/:id` | Delete skill |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics` | Get platform metrics |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## Data Model

### Agent

```javascript
{
  id: "agent-1",
  name: "Sales Lead Scorer",
  type: "ai_agent",
  category: "sales",
  description: "Scores and prioritizes sales leads",
  capabilities: ["lead_scoring", "prioritization", "intent_detection"],
  status: "active",
  performance: {
    tasksCompleted: 156,
    avgResponseTime: "1.2s",
    accuracy: 94.5
  },
  costPerTask: 0.05,
  createdAt: "2025-01-15T00:00:00.000Z"
}
```

### Workflow

```javascript
{
  id: "wf-abc123",
  name: "Lead Nurturing Flow",
  description: "Automated lead nurturing sequence",
  steps: [
    { name: "Score Lead", agentId: "agent-1" },
    { name: "Send Email", agentId: "agent-2" },
    { name: "Create Task", agentId: "system" }
  ],
  status: "active",
  executions: 45,
  avgDuration: "4.5s"
}
```

### Skill

```javascript
{
  id: "skill-1",
  name: "Natural Language Processing",
  category: "ai",
  version: "2.0",
  agents: ["agent-3"],
  status: "active"
}
```

### Execution

```javascript
{
  id: "exec-abc123",
  agentId: "agent-1",
  agentName: "Sales Lead Scorer",
  task: "score_lead",
  input: { leadId: "lead-123", source: "website" },
  priority: "normal",
  status: "completed",
  result: { score: 85, priority: "high" },
  startedAt: "2025-06-18T10:00:00.000Z",
  completedAt: "2025-06-18T10:00:01.200Z",
  duration: 1200
}
```

---

## Usage Examples

### Execute Task with Agent

```bash
curl -X POST http://localhost:4920/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-1",
    "task": "score_lead",
    "input": {
      "leadId": "lead-123",
      "email": "john@example.com",
      "company": "Acme Corp"
    },
    "priority": "high"
  }'
```

### Create Workflow

```bash
curl -X POST http://localhost:4920/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Onboarding",
    "description": "Automated customer onboarding flow",
    "steps": [
      {"name": "Welcome Email", "agentId": "agent-2"},
      {"name": "Profile Setup", "agentId": "agent-3"},
      {"name": "Create CRM Record", "agentId": "system"}
    ]
  }'
```

### Execute Workflow

```bash
curl -X POST http://localhost:4920/api/workflows/wf-abc123/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": { "customerId": "cust-123" }
  }'
```

### Register New Agent

```bash
curl -X POST http://localhost:4920/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Recommender",
    "type": "ai_agent",
    "category": "sales",
    "description": "Recommends products based on customer preferences",
    "capabilities": ["recommendation", "personalization"]
  }'
```

### Get Execution Status

```bash
curl http://localhost:4920/api/execute/exec-abc123
```

---

## Task Results by Agent Type

### Lead Scorer Results

```javascript
{
  score: 85,
  priority: "high",
  reasoning: "Based on engagement patterns and fit indicators"
}
```

### Content Generator Results

```javascript
{
  content: "Generated content for: Summer Sale Campaign",
  variants: 3,
  tone: "professional"
}
```

### Support Bot Results

```javascript
{
  response: "I understand your concern. Let me help you.",
  suggestions: ["View KB Article", "Create Ticket", "Escalate"]
}
```

### Finance Analyzer Results

```javascript
{
  insights: ["Revenue up 15%", "Cost optimization opportunity"],
  anomalies: 2,
  confidence: 0.92
}
```

---

## Integration Points

| Service | Connection | Purpose |
|---------|------------|---------|
| **Unified Hub** | Routes to agent services | Central AI orchestration |
| **Sales OS** | Lead scoring agents | Sales automation |
| **Marketing OS** | Content agents | Marketing automation |
| **Customer Success OS** | Support agents | CS automation |
| **TwinOS** | Agent twins | Agent state management |
| **MemoryOS** | Agent memory | Learning from interactions |

---

## Metrics Dashboard

| Metric | Description |
|--------|-------------|
| Total Agents | Count of registered agents |
| Active Agents | Currently active agents |
| Total Executions | All-time execution count |
| Completed | Successfully completed |
| Failed | Failed executions |
| Tasks Completed | Total tasks across all agents |
| By Category | Distribution per category |
| Top Agents | Best performing agents |

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/agent-copilot
npm install
npm start
```

---

*Built with Phase 2 - High Priority Services*
