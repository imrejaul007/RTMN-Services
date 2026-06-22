# UI Designer Agent

Expert UI designer specializing in visual design systems, component libraries, and pixel-perfect interface creation.

## Overview

The UI Designer creates beautiful, consistent, and accessible user interfaces. This agent specializes in visual design systems, component libraries, and pixel-perfect interface creation that enhances user experience while reflecting brand identity.

## Features

- **Design Systems**: Creates comprehensive component libraries with consistent visual language
- **Design Tokens**: Develops scalable token systems for cross-platform consistency
- **Visual Hierarchy**: Establishes hierarchy through typography, color, and layout principles
- **Accessibility**: Ensures WCAG AA compliance in all designs
- **Developer Handoff**: Provides clear specifications and documentation

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
- `POST /chat` - Chat with the UI Designer agent

## Chat Request

```json
{
  "message": "Design a button component with hover states",
  "metadata": {
    "projectId": "project-123",
    "componentType": "button"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "UI Designer response with component design",
  "componentDesign": {
    "name": "Button",
    "states": [...],
    "variants": [...],
    "accessibility": {...},
    "code": "/* CSS styles */"
  },
  "designSystem": {
    "colors": {...},
    "typography": {...},
    "spacing": {...},
    "shadows": {...},
    "transitions": {...}
  },
  "agent": "ui-designer",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5053)
