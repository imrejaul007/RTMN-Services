# CLAUDE.md - RTNM-Digital

## Project Overview

**Name:** RTNM-Digital
**Type:** RTNM Ecosystem Company
**Purpose:** Part of RTNM Digital ecosystem

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| Cache | Redis |

## Integration Points

### RABTUL Services
| Service | Port | Integration |
|---------|------|-------------|
| Auth | 4002 | JWT validation |
| Payment | 4001 | Payment processing |
| Wallet | 4004 | Balance management |
| Notification | 4005 | Push notifications |

### HOJAI AI
| Service | Integration |
|---------|-------------|
| Genie | Personal AI |
| SkillNet | AI skills |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Service port |
| MONGODB_URI | Yes | MongoDB connection |
| JWT_SECRET | Yes | JWT signing |
| RABTUL_AUTH_URL | Yes | RABTUL Auth |

## Commands

| Command | Description |
|---------|-------------|
| npm install | Install dependencies |
| npm run dev | Development server |
| npm run build | Build for production |
| npm start | Production server |

## Status

- [x] Codebase exists
- [x] Documentation complete
- [x] Docker support
- [x] Production ready

---

**Last Updated:** June 12, 2026
