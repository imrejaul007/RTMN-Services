# CLAUDE.md - Hojai Collaboration

## Project Overview

**Name:** Hojai Collaboration
**Type:** HOJAI Core
**Purpose:** HOJAI Collaboration - Comments, reviews, team sharing

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
hojai-collaboration/
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

**Default Port:** 4598

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Service port (default: 4598) |
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
| GET | /api/users | GET request |
| GET | /api/users/:id | GET request |
| GET | /api/comments | GET request |
| GET | /api/reviews | GET request |
| GET | /api/shares | GET request |
| GET | /api/activity | GET request |
| POST | /api/comments | POST request |
| POST | /api/comments/:id/resolve | POST request |
| POST | /api/comments/:id/reply | POST request |
| POST | /api/reviews | POST request |
| POST | /api/reviews/:id/submit | POST request |
| POST | /api/reviews/:id/decision | POST request |
| POST | /api/shares | POST request |
| POST | /api/shares/:id/revoke | POST request |

## Health Monitoring

### Health Endpoint

**GET** `/health`

```json
{
  "status": "healthy",
  "service": "hojai-collaboration",
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
