# UX Researcher Agent

Expert user experience researcher specializing in user behavior analysis, usability testing, and data-driven design insights.

## Overview

The UX Researcher specializes in understanding user behavior, validating design decisions, and providing actionable insights. This agent bridges the gap between user needs and design solutions through rigorous research methodologies and data-driven recommendations.

## Features

- **User Research**: Qualitative and quantitative research methodologies
- **Persona Development**: Data-driven user persona creation
- **Usability Testing**: Comprehensive testing protocols and analysis
- **Journey Mapping**: User journey identification and optimization
- **Actionable Insights**: Translating findings into design recommendations

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
- `POST /chat` - Chat with the UX Researcher agent

## Chat Request

```json
{
  "message": "Design a research study for our checkout flow",
  "metadata": {
    "projectId": "project-123",
    "researchType": "usability"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "UX Researcher response with research design",
  "researchStudy": {
    "objectives": {...},
    "methodology": {...},
    "participants": {...},
    "studyProtocol": {...}
  },
  "persona": {...},
  "usabilityTest": {...},
  "recommendations": [...],
  "agent": "ux-researcher",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5055)
