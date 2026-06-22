# CLAUDE.md - Rez Sso Service

## Project Overview

**Name:** Rez Sso Service
**Company:** LawGens
**Type:** REZ Ecosystem
**Port:** 4045

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
| PORT | No | Service port (default: 4045) |
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
