# CLAUDE.md - ProcurementOS

## Project Overview

**Name:** ProcurementOS
**Company:** Nexha
**Type:** Commerce & Procurement
**Port:** 4320
**Tagline:** "Smart Procurement for Hotels"

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB
- Security: Helmet, CORS, Rate Limiting, RBAC
- Auth: RABTUL JWT + Internal Token

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Service port (default: 4320) |
| MONGODB_URI | Yes | MongoDB connection |
| CORS_ORIGIN | No | CORS origins |
| RATE_LIMIT_WINDOW_MS | No | Rate limit window (default: 60000) |
| RATE_LIMIT_MAX_REQUESTS | No | Max requests per window (default: 100) |
| WEBHOOK_SECRET | No | Webhook verification |
| INTERNAL_SERVICE_TOKEN | Yes | Internal service authentication |
| STAYOWN_URL | No | StayOwn Hotel OS (default: http://localhost:3899) |

## RABTUL Integration

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | User authentication |

## RTNM Ecosystem Integration (NEW - June 2026)

### StayOwn Hotel OS Integration

ProcurementOS integrates with StayOwn Hotel OS for hotel supply procurement.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hotels/:hotelId/requirements` | GET | Get hotel supply requirements |
| `/api/hotels/:hotelId/orders` | POST | Submit hotel supply order |
| `/api/hotels/:hotelId/approved-suppliers` | GET | Get approved suppliers |
| `/api/orders/:orderId/hotel-tracking` | GET | Track hotel supply order |
| `/api/integration/stayown/status` | GET | Check StayOwn integration health |

### Connected Companies

| Company | Service | Integration Type |
|---------|---------|------------------|
| StayOwn | Hotel OS (3899) | Hotel procurement |
| REZ-Merchant | Merchant Platform | Supplier network |

## Key Features

1. **Supplier Management** - Register, verify, rate suppliers
2. **Marketplace** - Browse, compare, order products
3. **RFQ System** - Request for quotes from multiple suppliers
4. **Order Tracking** - End-to-end order lifecycle
5. **Inventory Sync** - Real-time inventory updates
6. **Hotel Requirements** - Get hotel-specific supply needs (NEW)
7. **Supply Orders** - Submit orders on behalf of hotels (NEW)
8. **Order Tracking** - Track orders for hotel operations (NEW)

## Quick Start

```bash
cd nexha/procurement-os
npm install
npm run dev
# Service runs on port 4320
```

---

**Last Updated:** 2026-06-12