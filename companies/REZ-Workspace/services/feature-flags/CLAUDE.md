# CLAUDE.md - Rez Feature Flags

> **Migrated from `companies/AdBazaar/` to `RTMN-Group` on 2026-06-20.**
>
> Reason: core platform engine.
>
> The AdBazaar canonical-home note was removed as part of the move.


## Project Overview

**Name:** Rez Feature Flags
**Company:** AdBazaar
**Type:** REZ Ecosystem
**Port:** 4133

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB
- Redis

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
| PORT | No | Service port (default: 4133) |
| MONGODB_URI | Yes | MongoDB connection |
| JWT_SECRET | Yes | JWT signing |
| REDIS_URL | No | Redis connection |

## Integration

- RABTUL Auth (4002)
- RABTUL Payment (4001)
- RABTUL Wallet (4004)
- RABTUL Notification (4005)

---

**Last Updated:** 2026-06-12
