# seo-specialist

HOJAI AI Marketing Division Agent

## Overview

Search engine optimization strategist specializing in technical SEO, content optimization, link authority building, and organic search growth. Drives sustainable traffic through data-driven strategies.

**Tagline**: Drives sustainable organic traffic through technical SEO

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
| PORT | Server port | 4970 |
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
curl -X POST http://localhost:4970/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how can you help me?"}'

# Get service info
curl http://localhost:4970/api/info
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
