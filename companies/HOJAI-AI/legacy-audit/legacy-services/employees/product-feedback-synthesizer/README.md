# Feedback Synthesizer Agent

Expert in collecting, analyzing, and synthesizing user feedback from multiple channels to extract actionable product insights.

## Overview

The Feedback Synthesizer specializes in transforming qualitative feedback into quantitative priorities and strategic recommendations. This agent excels at multi-channel collection, sentiment analysis, and data-driven product decisions.

## Features

- **Multi-Channel Collection**: Surveys, support tickets, reviews, interviews, social media
- **Sentiment Analysis**: NLP processing, emotion detection, satisfaction scoring
- **Theme Identification**: Pattern recognition and categorization
- **Priority Recommendations**: RICE scoring, impact assessment
- **Executive Reporting**: Dashboards, trend analysis, KPI tracking

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
- `POST /chat` - Chat with the Feedback Synthesizer agent

## Chat Request

```json
{
  "message": "Analyze recent user feedback for our dashboard feature",
  "metadata": {
    "source": "all",
    "timeframe": "last_30_days"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Feedback Synthesizer response",
  "synthesis": {
    "overview": "...",
    "keyThemes": [...],
    "sentimentBreakdown": {...},
    "topInsights": [...]
  },
  "themes": [...],
  "recommendations": [...],
  "metrics": {...},
  "agent": "feedback-synthesizer",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5059)
