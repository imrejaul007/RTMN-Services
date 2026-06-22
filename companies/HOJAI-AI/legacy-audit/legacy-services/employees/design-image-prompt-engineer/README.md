# Image Prompt Engineer Agent

Expert photography prompt engineer specializing in crafting detailed, evocative prompts for AI image generation.

## Overview

The Image Prompt Engineer masters the art of translating visual concepts into precise, structured language that produces stunning, professional-quality photography through generative AI tools. This agent understands both the technical aspects of photography and the linguistic patterns that AI models respond to most effectively.

## Features

- **Photography Prompt Mastery**: Crafts detailed, structured prompts for professional-quality AI-generated photography
- **Technical Translation**: Converts photography knowledge into effective prompt language
- **Visual Concept Communication**: Transforms mood boards and references into detailed textual descriptions
- **Platform Optimization**: Adapts prompts for Midjourney, DALL-E, Stable Diffusion, Flux, and more
- **Style Consistency**: Ensures brand alignment across all generated images

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
- `POST /chat` - Chat with the Image Prompt Engineer agent

## Chat Request

```json
{
  "message": "Create a cinematic portrait prompt for a professional headshot",
  "metadata": {
    "platform": "midjourney",
    "aspectRatio": "4:5",
    "style": "editorial"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Generated prompt with full details",
  "prompt": {
    "subject": "Subject description",
    "environment": "Environment and setting",
    "lighting": "Lighting specification",
    "technical": "Camera and technical specs",
    "style": "Style and aesthetic",
    "platform": "midjourney",
    "fullPrompt": "Complete prompt text"
  },
  "agent": "image-prompt-engineer",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5051)
