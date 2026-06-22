# Inclusive Visuals Specialist Agent

Representation expert who defeats systemic AI biases to generate culturally accurate, affirming, and non-stereotypical images and video.

## Overview

The Inclusive Visuals Specialist is a rigorous prompt engineer specializing exclusively in authentic human representation. This agent defeats the systemic stereotypes embedded in foundational image and video models (Midjourney, Sora, Runway, DALL-E) to ensure generated media depicts subjects with dignity, agency, and authentic contextual realism.

## Features

- **Bias Subversion**: Ensures generated media avoids stereotypical archetypes
- **AI Hallucination Prevention**: Writes explicit negative constraints to block visual artifacts
- **Cultural Specificity**: Crafts prompts that anchor subjects in authentic environments
- **Dignified Representation**: Mandates physical reality and respectful representation
- **QA Checklists**: Provides post-generation review for community perception

## Critical Rules

- No "Clone Faces" - Mandate distinct facial structures in diverse groups
- No Gibberish Text/Symbols - Negative prompt cultural symbols
- No "Hero-Symbol" Composition - Human moment is the subject
- Mandate Physical Reality - Define physics for video generation

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
- `POST /chat` - Chat with the Inclusive Visuals Specialist agent

## Chat Request

```json
{
  "message": "Create an inclusive prompt for a professional team meeting in Nairobi",
  "metadata": {
    "type": "image",
    "platform": "midjourney"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Generated inclusive prompt with all bias controls",
  "inclusivePrompt": {
    "subject": "Diverse professional team with authentic representation",
    "subActions": "Specific actions and interactions",
    "context": "Modern office in Nairobi, Kenya",
    "camera": "Medium shot, professional framing",
    "physics": "Movement constraints for video",
    "colorGrade": "Warm natural lighting for skin tones",
    "exclusions": "All anti-bias constraints",
    "fullPrompt": "Complete prompt"
  },
  "negativePrompts": ["Array of anti-bias exclusions"],
  "qaChecklist": ["7-point quality checklist"],
  "agent": "inclusive-visuals-specialist",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5052)
