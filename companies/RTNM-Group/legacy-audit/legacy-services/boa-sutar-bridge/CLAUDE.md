# CLAUDE.md - BOA-SUTAR Bridge

## Project Overview

**Name:** boa-sutar-bridge
**Type:** SUTAR OS - Integration Bridge
**Port:** 4110
**Company:** RTNM-Group
**Part of:** SUTAR OS Phase 6 - BOA to SUTAR Integration

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB/Mongoose
- Axios (for BOA and SUTAR integration)

## Architecture

```
BOA OS (4100)
    │
    └──► BOA-SUTAR Bridge (4110)
            │
            ├──► SUTAR GoalOS (4242)
            └──► SUTAR NegotiationOS (4191)
```

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4110 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection |
| BOA_URL | No | http://localhost:4100 | BOA OS URL |
| SUTAR_GOAL_URL | No | http://localhost:4242 | SUTAR GoalOS URL |

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| src/index.ts | ~185 | Main server |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bridge/goal` | Sync goal from BOA to SUTAR |
| GET | `/bridge/status/:executionId` | Get execution status |
| POST | `/bridge/outcome` | Report outcome to BOA |
| POST | `/bridge/progress` | Sync progress to BOA |

## Integration

### Upstream
- BOA OS (4100) - Strategic goals

### Downstream
- SUTAR GoalOS (4242) - Goal execution
- SUTAR NegotiationOS (4191) - Negotiations

## Notes

- Bridge syncs goals from BOA to SUTAR
- Syncs progress back from SUTAR to BOA
- Reports outcomes when goals complete
