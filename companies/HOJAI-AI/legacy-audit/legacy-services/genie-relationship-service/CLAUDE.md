# genie-relationship-service - Claude Code Context

## Service Overview

**Name:** genie-relationship-service  
**Type:** Genie AI Microservice  
**Purpose:** Relationship Service

## Tagline

"You don't use Genie. You talk to Genie."

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Validation:** Zod

## Project Structure

```
genie-relationship-service/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts             # TypeScript interfaces
│   ├── routes/              # Express routes
│   ├── services/           # Business logic
│   ├── middleware/          # Express middleware
│   └── utils/             # Utilities (logger)
├── tests/
│   └── service.test.ts     # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
└── CLAUDE.md
```

## API Design

All endpoints follow this pattern:
- Headers: `X-Tenant-Id`, `X-User-Id`
- Response: `{ success, data, meta: { timestamp, requestId } }`

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development |
| `npm run build` | Build for production |
| `npm start` | Start production |
| `npm test` | Run tests |

## Health Check

```bash
curl http://localhost:3000/health
```

## Environment Variables

See `.env.example` for all configuration options.

## Related Services

- genie-memory - Personal memory
- genie-relationship - Relationships
- genie-briefing - Daily briefings
- genie-gateway - API Gateway

## Documentation

- [GENIE-COMPLETE-DOCUMENTATIONATION.md](../GENIE-COMPLETE-DOCUMENTATION.md)
- [GENIE-SERVICES-STATUS.md](../GENIE-SERVICES-STATUS.md)
