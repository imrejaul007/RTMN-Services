# CLAUDE.md - Hojai Visual Workflow

## Project Overview

**Name:** Hojai Visual Workflow
**Type:** HOJAI Core
**Purpose:** HOJAI Visual Workflow Builder - Drag-drop nodes

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
hojai-visual-workflow/
├── src/
│   └── index.ts          # Main entry point
├── test/                  # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

**Default Port:** 4600

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Service port (default: 4600) |
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | JWT signing secret |
| REDIS_URL | No | Redis connection URL |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/templates | GET request |
| GET | /api/workflows/:id | GET request |
| GET | /api/workflows | GET request |
| GET | /api/executions/:id | GET request |
| GET | /api/executions | GET request |
| POST | /api/workflows | POST request |
| POST | /api/workflows/:id/nodes | POST request |
| POST | /api/workflows/:id/edges | POST request |
| POST | /api/workflows/:id/test | POST request |
| POST | /api/workflows/:id/deploy | POST request |
| POST | /api/workflows/:id/run | POST request |
| DELETE | /api/workflows/:workflowId/nodes/:nodeId | DELETE request |

## Health Monitoring

### Health Endpoint

**GET** `/health`

```json
{
  "status": "healthy",
  "service": "hojai-visual-workflow",
  "version": "1.0.0"
}
```

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Push notifications |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice AI |

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [ ] Unit tests written
- [ ] Integration tests written
- [x] Health endpoint implemented
- [ ] Docker support added
- [ ] Environment variables documented
- [ ] Monitoring configured
- [ ] Security audit passed

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Verify MONGODB_URI |
| Redis timeout | Verify REDIS_URL |
| JWT validation fails | Verify JWT_SECRET |
| Health check fails | Check all dependencies |

---

**Last Updated:** 2026-06-12
