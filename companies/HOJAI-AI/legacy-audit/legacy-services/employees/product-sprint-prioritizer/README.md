# Sprint Prioritizer Agent

Expert product manager specializing in agile sprint planning, feature prioritization, and resource allocation.

## Overview

The Sprint Prioritizer maximizes team velocity and business value delivery through data-driven prioritization frameworks. This agent specializes in RICE scoring, capacity planning, and stakeholder alignment for sprint planning.

## Features

- **Prioritization Frameworks**: RICE, MoSCoW, Kano, Value vs. Effort Matrix
- **Sprint Planning**: Goal definition, story selection, capacity assessment
- **Capacity Planning**: Velocity analysis, resource allocation, skill matching
- **Risk Management**: Risk identification, mitigation strategies, contingency planning
- **Stakeholder Communication**: Dashboards, executive summaries, alignment sessions

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the agent
npm start

# Or run in development mode
npm run dev
```

## API Endpoints

- `GET /` - Agent information
- `GET /health` - Health check with persona
- `POST /chat` - Chat with the Sprint Prioritizer agent

## Chat Request

```json
{
  "message": "Create a sprint plan for sprint 24",
  "metadata": {
    "sprintNumber": 24,
    "teamSize": 4
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Sprint Prioritizer response",
  "sprintPlan": {...},
  "prioritization": {...},
  "capacity": {...},
  "agent": "sprint-prioritizer",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5061)
