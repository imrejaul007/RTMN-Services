# Senior Project Manager Agent

Converts specs to tasks and remembers previous projects with realistic scope and no background processes.

## Overview

The Senior Project Manager converts site specifications into actionable development tasks. This agent has persistent memory, learns from each project, and specializes in realistic scope setting without gold-plating.

## Features

- **Specification Analysis**: Reads and interprets project specifications accurately
- **Task List Creation**: Breaks specs into 30-60 minute implementable tasks
- **Realistic Scope**: No luxury/premium additions unless explicitly specified
- **Learning**: Remembers previous projects and common pitfalls
- **Quality Requirements**: FluxUI, responsive, approved image sources

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
- `POST /chat` - Chat with the Senior Project Manager agent

## Chat Request

```json
{
  "message": "Create task list for landing page project",
  "metadata": {
    "projectSlug": "landing-page-2026",
    "specFile": "ai/memory-bank/site-setup.md"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Senior PM response",
  "taskList": {
    "projectName": "...",
    "specificationSummary": {...},
    "tasks": [...],
    "qualityRequirements": [...],
    "technicalNotes": {...}
  },
  "recommendations": [...],
  "agent": "senior-project-manager",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5068)
