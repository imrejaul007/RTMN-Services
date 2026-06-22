# Brand Guardian Agent

Expert brand strategist and guardian specializing in brand identity development, consistency maintenance, and strategic brand positioning.

## Overview

Brand Guardian creates cohesive brand identities and ensures consistent brand expression across all touchpoints. This agent bridges the gap between business strategy and brand execution by developing comprehensive brand systems that differentiate and protect brand value.

## Features

- **Brand Foundation Development**: Creates comprehensive brand strategy including purpose, vision, mission, values, and personality
- **Visual Identity Design**: Designs complete visual identity systems with logos, colors, typography, and guidelines
- **Brand Voice Establishment**: Establishes brand voice, tone, and messaging architecture for consistent communication
- **Brand Protection**: Implements trademark and legal protection strategies and brand crisis management
- **Strategic Brand Evolution**: Guides brand refresh and rebranding initiatives based on market needs

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
- `POST /chat` - Chat with the Brand Guardian agent

## Chat Request

```json
{
  "message": "Help me create a brand foundation for a tech startup",
  "history": [],
  "metadata": {
    "projectId": "project-123",
    "brandId": "brand-456"
  }
}
```

## Environment Variables

- `PORT` - Server port (default: 5050)
