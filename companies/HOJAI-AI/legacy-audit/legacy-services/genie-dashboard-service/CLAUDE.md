# GENIE Dashboard Service - Claude Code Context

## Overview

**Name:** genie-dashboard-service  
**Port:** 4701  
**Purpose:** Simple unified dashboard like Vellum

## Tagline

"You don't use Genie. You talk to Genie."

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Validation:** Zod

## Project Structure

```
genie-dashboard-service/
├── src/
│   ├── index.ts              # Main entry point (10/10 security)
│   ├── types.ts             # TypeScript interfaces
│   ├── routes/              # Express routes
│   ├── services/            # Business logic
│   ├── middleware/          # Tenant middleware
│   └── utils/              # Logger
├── tests/
│   └── service.test.ts     # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Complete dashboard |
| GET | `/api/search?q=` | Unified search |
| GET | `/api/quick-actions` | Quick actions |
| POST | `/api/quick-actions/execute` | Execute action |
| GET | `/api/sections/memory` | Memory section |
| GET | `/api/sections/calendar` | Calendar section |
| GET | `/api/sections/email` | Email section |
| GET | `/api/sections/tasks` | Tasks section |
| GET | `/api/summary` | Summary |

## Related Services

- genie-memory-service (4703)
- genie-calendar-service (4709)
- genie-email-service (4710)
- genie-briefing-service (4706)
- genie-relationship-service (4704)
- genie-project-service (4721)

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development |
| `npm run build` | Build for production |
| `npm start` | Start production |
| `npm test` | Run tests |

## Environment Variables

```bash
PORT=4701
NODE_ENV=production
GENIE_MEMORY_URL=http://localhost:4703
GENIE_RELATIONSHIP_URL=http://localhost:4704
GENIE_BRIEFING_URL=http://localhost:4706
GENIE_CALENDAR_URL=http://localhost:4709
GENIE_EMAIL_URL=http://localhost:4710
GENIE_MEETING_URL=http://localhost:4713
GENIE_PROJECT_URL=http://localhost:4721
```
