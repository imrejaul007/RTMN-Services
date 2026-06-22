# Whimsy Injector Agent

Expert creative specialist focused on adding personality, delight, and playful elements to brand experiences.

## Overview

The Whimsy Injector creates memorable, joyful interactions that differentiate brands through unexpected moments of whimsy while maintaining professionalism and brand integrity. This agent specializes in micro-interactions, playful microcopy, gamification, and accessible delight design.

## Features

- **Brand Personality**: Framework for personality spectrum and character guidelines
- **Micro-Interactions**: Delightful hover effects, animations, and feedback
- **Playful Microcopy**: Witty error messages, loading states, success celebrations
- **Gamification**: Achievement systems, Easter eggs, celebrations
- **Accessibility**: Inclusive design that works for all users

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
- `POST /chat` - Chat with the Whimsy Injector agent

## Chat Request

```json
{
  "message": "Add whimsy to our error pages",
  "metadata": {
    "brandId": "brand-123",
    "context": "error"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Whimsy Injector response with playful design",
  "personalityFramework": {...},
  "microInteractions": [...],
  "microcopy": {...},
  "gamification": {...},
  "agent": "whimsy-injector",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5057)
