# CLAUDE.md - Supplier Agent

## Project Overview

**Name:** Supplier Agent
**Company:** hojai-ai
**Type:** L2 Specialist Employee
**Port:** 4850
**Status:** ✅ Built (June 14, 2026)

## Description

Autonomous RFQ response agent that handles supplier side of procurement.

## Tech Stack

- Node.js 18+
- Express.js
- TypeScript
- Axios

## Services Connected

| Service | Port |
|---------|------|
| Procurement Agent | 4786 |
| Nexha | 4320 |
| SUTAR | 4518 |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server (port 4850) |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4850 | Service port |
| SUPPLIER_ID | No | sup-ac-1 | Supplier ID |
| SUPPLIER_NAME | No | CoolAir Solutions | Supplier name |
| PROCUREMENT_AGENT_URL | No | http://localhost:4786 | Procurement Agent |
| NEXHA_URL | No | http://localhost:4320 | Nexha |
| SUTAR_URL | No | http://localhost:4518 | SUTAR |

## API Endpoints

### RFQ
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rfq/receive` | Receive RFQ |
| POST | `/api/rfq/auto-respond` | Auto respond |

### Quotes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes/:quoteId` | Get quote |
| GET | `/api/quotes` | List quotes |
| PUT | `/api/quotes/:quoteId/accept` | Accept quote |

### Negotiation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/negotiate` | Handle negotiation |
| GET | `/api/negotiations/:rfqId` | Get negotiation |

### Supplier
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/supplier/profile` | Get profile |
| PUT | `/api/supplier/categories` | Update categories |

## File Structure

```
supplier-agent/
├── src/
│   └── index.ts           # Main server
├── package.json
├── tsconfig.json
├── README.md
└── CLAUDE.md
```

## Story Coverage

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 11 | Supplier responds to RFQ | ✅ Working |

---

**Last Updated:** June 14, 2026
