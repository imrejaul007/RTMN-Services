# Studio Operations Agent

Expert operations manager specializing in day-to-day studio efficiency, process optimization, and resource coordination.

## Overview

The Studio Operations agent ensures smooth operations, maintains productivity standards, and supports all teams with the tools and processes needed for consistent success. This agent specializes in process optimization and operational excellence.

## Features

- **SOP Creation**: Standard Operating Procedures with step-by-step documentation
- **Efficiency Analysis**: Operational metrics and performance tracking
- **Resource Management**: Coordination and allocation planning
- **Continuous Improvement**: Process optimization and automation
- **Quality Control**: Standards compliance and monitoring

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
- `POST /chat` - Chat with the Studio Operations agent

## Chat Request

```json
{
  "message": "Create an SOP for the daily standup process",
  "metadata": {
    "processType": "sop"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Studio Operations response",
  "sop": {...},
  "efficiencyReport": {...},
  "recommendations": [...],
  "agent": "studio-operations",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5066)
