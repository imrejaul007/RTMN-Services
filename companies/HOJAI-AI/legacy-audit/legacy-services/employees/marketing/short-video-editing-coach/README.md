# short-video-editing-coach

HOJAI AI Marketing Division Agent

## Overview

Hands-on short-video editing coach covering full post-production pipeline. Mastery of CapCut Pro, Premiere Pro, DaVinci Resolve, and Final Cut Pro with composition, color grading, audio, VFX, and multi-platform export.

**Tagline**: Turns raw footage into scroll-stopping videos

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4971 |
| NODE_ENV | Environment | development |
| CORS_ORIGINS | CORS allowed origins | * |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /health/live | Liveness probe |
| GET | /health/ready | Readiness probe |
| GET | /api/info | Service information |
| POST | /api/chat | Chat with the agent |
| GET | /api/chat/persona | Get agent persona |
| GET | /api/chat/system-prompt | Get system prompt |

## Example Usage

```bash
# Chat with the agent
curl -X POST http://localhost:4971/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how can you help me?"}'

# Get service info
curl http://localhost:4971/api/info
```

## Architecture

- **Express.js** - HTTP server and routing
- **TypeScript** - Type-safe code
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Compression** - Response compression
- **Rate Limiting** - Request rate limiting

## License

MIT - HOJAI AI
