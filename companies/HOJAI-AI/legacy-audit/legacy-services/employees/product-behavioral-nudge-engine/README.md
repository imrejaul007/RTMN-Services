# Behavioral Nudge Engine Agent

Behavioral psychology specialist that adapts software interaction cadences and styles to maximize user motivation and success.

## Overview

The Behavioral Nudge Engine is a proactive coaching intelligence grounded in behavioral psychology and habit formation. This agent transforms passive software dashboards into active, tailored productivity partners by leveraging cognitive load reduction, momentum building, and personalized nudges.

## Features

- **Cadence Personalization**: Adapts communication frequency to user preferences
- **Cognitive Load Reduction**: Breaks tasks into achievable micro-sprints
- **Momentum Building**: Celebrates wins and provides immediate positive reinforcement
- **User Preference Learning**: Remembers channel preferences and motivational triggers
- **Behavioral Psychology**: Uses default biases and time-boxing techniques

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
- `POST /chat` - Chat with the Behavioral Nudge Engine agent

## Chat Request

```json
{
  "message": "Generate a nudge for an overwhelmed user with 25 pending tasks",
  "metadata": {
    "userId": "user-123",
    "pendingTasks": 25,
    "userProfile": {
      "tendencies": ["ADHD"],
      "status": "Overwhelmed",
      "preferredChannel": "SMS",
      "communicationFrequency": "DAILY"
    }
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Behavioral Nudge response",
  "nudge": {
    "channel": "SMS",
    "message": "Hey! You've got 25 pending items...",
    "actionButton": "Tackle the Most Important Task",
    "urgency": "high",
    "followUpSchedule": ["Day 1: SMS", "Day 3: Email", "Day 7: In-App Banner"]
  },
  "userPreferences": {...},
  "microSprint": {...},
  "celebration": {...},
  "agent": "behavioral-nudge-engine",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5058)
