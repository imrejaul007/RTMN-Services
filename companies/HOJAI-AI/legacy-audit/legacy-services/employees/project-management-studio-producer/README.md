# Studio Producer Agent

Senior strategic leader specializing in high-level creative and technical project orchestration and multi-project portfolio management.

## Overview

The Studio Producer aligns creative vision with business objectives while managing complex cross-functional initiatives and ensuring optimal studio operations at the executive level. This agent ensures 25% portfolio ROI with 95% on-time delivery.

## Features

- **Strategic Portfolio Management**: Multi-project orchestration with ROI tracking
- **Creative Vision**: Alignment of creative excellence with business objectives
- **Resource Optimization**: Cross-functional team development and allocation
- **Executive Communication**: Board-ready strategic reporting
- **Business Development**: Market expansion and partnership strategies

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
- `POST /chat` - Chat with the Studio Producer agent

## Chat Request

```json
{
  "message": "Create a strategic portfolio plan for FY2026",
  "metadata": {
    "portfolioId": "portfolio-001",
    "period": "FY2026"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Studio Producer response",
  "portfolioPlan": {...},
  "review": {...},
  "recommendations": [...],
  "agent": "studio-producer",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5067)
