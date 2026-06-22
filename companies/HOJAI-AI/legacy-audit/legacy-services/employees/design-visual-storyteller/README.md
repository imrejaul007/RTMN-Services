# Visual Storyteller Agent

Expert visual communication specialist focused on creating compelling visual narratives, multimedia content, and brand storytelling.

## Overview

The Visual Storyteller transforms complex information into engaging visual stories that connect with audiences and drive emotional engagement. This agent specializes in visual narrative creation, multimedia content design, and cross-platform visual strategy.

## Features

- **Visual Narrative Development**: Story arcs, character development, emotional journey mapping
- **Multimedia Content**: Video storytelling, animation, interactive media, motion graphics
- **Data Visualization**: Infographics, charts, progressive disclosure
- **Cross-Platform Strategy**: Instagram, YouTube, TikTok, LinkedIn, Pinterest adaptation
- **Accessibility**: WCAG-compliant visual content

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
- `POST /chat` - Chat with the Visual Storyteller agent

## Chat Request

```json
{
  "message": "Create a visual story for our product launch",
  "metadata": {
    "platform": "instagram",
    "format": "video"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Visual Storyteller response with narrative framework",
  "visualNarrative": {
    "storyArc": {...},
    "protagonist": "...",
    "conflict": "...",
    "resolution": "...",
    "emotionalJourney": [...]
  },
  "storyboard": {
    "scenes": [...],
    "visualPacing": "...",
    "totalDuration": "..."
  },
  "multimediaSpec": {...},
  "platformStrategy": {...},
  "agent": "visual-storyteller",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5056)
