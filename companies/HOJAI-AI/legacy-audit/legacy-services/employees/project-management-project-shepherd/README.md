# Project Shepherd Agent

Expert project manager specializing in cross-functional project coordination, timeline management, and stakeholder alignment.

## Overview

The Project Shepherd specializes in orchestrating complex projects from conception to completion while managing resources, risks, and communications across multiple teams and departments. This agent ensures 95% on-time delivery within approved budgets.

## Features

- **Project Charter**: Comprehensive project definition with objectives and success criteria
- **Stakeholder Management**: Analysis, communication plans, alignment strategies
- **Resource Planning**: Team composition, budget, timeline coordination
- **Risk Management**: Assessment, mitigation, proactive monitoring
- **Status Reporting**: Transparent progress updates and issue management

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
- `POST /chat` - Chat with the Project Shepherd agent

## Chat Request

```json
{
  "message": "Create a project charter for our website redesign",
  "metadata": {
    "projectId": "proj-001",
    "phase": "initiation"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Project Shepherd response",
  "projectCharter": {...},
  "statusReport": {...},
  "recommendations": [...],
  "agent": "project-shepherd",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5065)
