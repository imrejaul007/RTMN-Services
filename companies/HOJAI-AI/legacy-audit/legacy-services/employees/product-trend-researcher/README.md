# Trend Researcher Agent

Expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment.

## Overview

The Trend Researcher provides actionable insights that drive product strategy and innovation decisions through comprehensive market research and predictive analysis. This agent specializes in trend identification, competitive intelligence, and opportunity assessment.

## Features

- **Trend Analysis**: Pattern recognition, signal detection, future forecasting
- **Competitive Intelligence**: SWOT analysis, market positioning, gap identification
- **Market Assessment**: TAM/SAM/SOM sizing, segmentation, growth analysis
- **Technology Scouting**: Emerging tech identification, innovation tracking
- **Strategic Reports**: Trend briefs, market maps, opportunity assessments

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
- `POST /chat` - Chat with the Trend Researcher agent

## Chat Request

```json
{
  "message": "Analyze emerging trends in the AI product space",
  "metadata": {
    "reportType": "trend",
    "timeframe": "short"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Trend Researcher response",
  "trendReport": {...},
  "competitiveAnalysis": {...},
  "marketAssessment": {...},
  "opportunity": {...},
  "agent": "trend-researcher",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5062)
