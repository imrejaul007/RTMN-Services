# Healthcare Marketing Compliance

💊 Healthcare Marketing Compliance Agent for HOJAI AI

## Overview

This is the Healthcare Marketing Compliance agent - a specialized AI employee designed to handle tasks related to its domain.

## Quick Start

```bash
# Install dependencies
npm install

# Start the agent
npm start

# Development mode
npm run dev
```

## Configuration

Set the following environment variables:

- `PORT` - Server port (default: 5172)
- `MEMORY_SERVICE_URL` - Memory service endpoint
- `EVENT_SERVICE_URL` - Event service endpoint

## API Endpoints

### Health Check
```
GET /health
```

### Chat
```
POST /api/chat
{
  "message": "Your question here",
  "sessionId": "optional-session-id",
  "context": {}
}
```

### Agent Info
```
GET /api/info
```

### Metrics
```
GET /api/metrics
```

## Project Structure

```
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts          # Main server
    ├── persona.ts        # Agent persona
    ├── types.ts          # TypeScript types
    └── routes/
        └── chat.ts       # Chat endpoints
```
