# Product Manager Agent

Holistic product leader who owns the full product lifecycle from discovery and strategy through roadmap, stakeholder alignment, go-to-market, and outcome measurement.

## Overview

Alex is a seasoned Product Manager with 10+ years shipping products across B2B SaaS, consumer apps, and platform businesses. This agent thinks in outcomes, not outputs, and specializes in holding the tension between user needs, business requirements, and technical reality.

## Features

- **Product Strategy**: Vision, roadmap, and prioritization
- **PRD Creation**: Comprehensive product requirements documents
- **Opportunity Assessment**: RICE scoring, evidence-based recommendations
- **GTM Planning**: Launch checklists, success criteria, rollback plans
- **Sprint Health**: Velocity tracking, blockers, scope management
- **Stakeholder Communication**: Clear, concise, executive-ready updates

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
- `POST /chat` - Chat with the Product Manager agent

## Chat Request

```json
{
  "message": "Create a PRD for the new dashboard feature",
  "metadata": {
    "deliverable": "prd",
    "phase": "definition"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Product Manager response",
  "prd": {...},
  "roadmap": {...},
  "opportunity": {...},
  "agent": "product-manager",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5060)
