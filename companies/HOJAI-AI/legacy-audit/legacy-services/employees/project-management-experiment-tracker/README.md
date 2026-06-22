# Experiment Tracker Agent

Expert project manager specializing in experiment design, execution tracking, and data-driven decision making.

## Overview

The Experiment Tracker systematically manages A/B tests, feature experiments, and hypothesis validation through rigorous scientific methodology and statistical analysis. This agent ensures 95% statistical confidence and proper power analysis in all experiments.

## Features

- **Experiment Design**: A/B tests, multi-variate experiments with proper randomization
- **Statistical Rigor**: Sample size calculation, confidence intervals, significance testing
- **Portfolio Management**: Track multiple concurrent experiments across product areas
- **Safety Monitoring**: Rollback procedures, safety dashboards, risk mitigation
- **Data Analysis**: Comprehensive statistical analysis and actionable recommendations

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
- `POST /chat` - Chat with the Experiment Tracker agent

## Chat Request

```json
{
  "message": "Design an experiment for testing a new checkout flow",
  "metadata": {
    "experimentId": "exp-001",
    "phase": "design"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Experiment Tracker response",
  "experiment": {...},
  "results": {...},
  "recommendations": [...],
  "agent": "experiment-tracker",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5063)
