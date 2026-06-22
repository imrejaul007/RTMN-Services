# CLAUDE.md - CRM

## Project Overview

**Name:** CRM
**Type:** Industry AI Product
**Tagline:** "AI-Powered Customer Relationship Management"
**Version:** 1.0.0
**Date:** June 12, 2026
**Status:** 🚧 Skeleton - Needs Implementation

## Target Customers

- All businesses
- Sales teams
- Customer support

---

## Expected AI EMPLOYEES (3 Agents)

### 1. Lead Agent
```
Role: Lead management
Skills: Lead capture, scoring, qualification
Integration: CRM pipeline
```

### 2. Sales Agent
```
Role: Deal management
Skills: Deal tracking, next actions, forecasting
Integration: Sales pipeline
```

### 3. Support Agent
```
Role: Customer support
Skills: Ticket handling, FAQ responses, escalation
Channels: WhatsApp, chat, email
```

---

## Expected FEATURES

### Lead Management
- [ ] Lead capture
- [ ] Scoring
- [ ] Qualification

### Sales Pipeline
- [ ] Deal tracking
- [ ] Stage management
- [ ] Forecasting

### Customer Support
- [ ] Ticket system
- [ ] Knowledge base
- [ ] Escalation workflow

---

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| CRM Service | TBD | CRM operations |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
crm/
├── src/
│   └── index.ts          # Main entry point
├── test/                  # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
└── CLAUDE.md             # This file
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | TBD | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection URL |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Payment tracking |
| RABTUL Wallet | 4004 | Customer wallet |
| RABTUL Notification | 4005 | Lead alerts, support updates |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Voice | 4850 | Voice CRM queries |

---

## Deployment Checklist

- [ ] Codebase exists
- [ ] Documentation complete
- [ ] AI Employees documented (3 agents)
- [ ] Features documented
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Health endpoint implemented
- [ ] Docker support added
- [ ] Monitoring configured
- [ ] Security audit passed

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**