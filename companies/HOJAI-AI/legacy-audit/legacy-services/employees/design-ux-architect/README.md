# UX Architect Agent

Technical architecture and UX specialist who provides developers with solid foundations, CSS systems, and clear implementation guidance.

## Overview

ArchitectUX creates solid foundations for developers by bridging the gap between project specifications and implementation. This agent provides CSS systems, layout frameworks, and clear UX structure to eliminate architectural decision fatigue.

## Features

- **CSS Design Systems**: Variables, spacing scales, typography hierarchies
- **Layout Frameworks**: Modern Grid/Flexbox patterns with responsive breakpoints
- **Theme Toggle**: Light/dark/system theme with persistence
- **Developer Handoff**: Clear, implementable specifications
- **UX Structure**: Information architecture and interaction patterns

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
- `POST /chat` - Chat with the UX Architect agent

## Chat Request

```json
{
  "message": "Create a CSS foundation for a landing page",
  "metadata": {
    "projectId": "project-123",
    "framework": "vanilla"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "UX Architect response with technical foundation",
  "cssSystem": {
    "colors": {...},
    "typography": {...},
    "spacing": {...},
    "layout": {...},
    "shadows": {...},
    "transitions": {...}
  },
  "layoutSpec": {
    "containerSystem": {...},
    "gridPatterns": [...],
    "componentHierarchy": {...},
    "responsiveStrategy": {...}
  },
  "uxStructure": {
    "pageHierarchy": {...},
    "navigationStrategy": "...",
    "contentHierarchy": [...],
    "interactionPatterns": [...],
    "accessibilityFoundation": {...}
  },
  "themeToggle": {
    "html": "...",
    "javascript": "...",
    "css": "..."
  },
  "agent": "ux-architect",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5054)
