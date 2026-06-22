# CLAUDE.md - Legal AI

## Project Overview

**Name:** Legal AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Legal Management"
**Version:** 1.0.0
**Date:** June 12, 2026
**Status:** 🚧 Skeleton - Needs Implementation

## Target Customers

- Law firms
- Corporate legal
- Individual lawyers

---

## Expected AI EMPLOYEES (3 Agents)

### 1. Case Manager
```
Role: Case tracking
Skills: Case file management, deadline tracking, court dates
Integration: Case management system
```

### 2. Document Assistant
```
Role: Drafting
Skills: Contract generation, document review, clause library
Integration: Document management
```

### 3. Compliance Checker
```
Role: Risk assessment
Skills: Compliance checking, regulatory analysis, risk scoring
Integration: Compliance database
```

---

## Expected FEATURES

### Case Management
- [ ] Case file management
- [ ] Deadline tracking
- [ ] Court date calendar

### Document Management
- [ ] Contract drafting
- [ ] Clause library
- [ ] E-signature

### Research
- [ ] Legal research
- [ ] Case law search
- [ ] Precedent finder

---

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Legal Service | 4510 | Legal operations |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
legal-ai/
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
| PORT | No | 4510 | Service port |
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
| RABTUL Payment | 4001 | Legal fee payments |
| RABTUL Wallet | 4004 | Client funds |
| RABTUL Notification | 4005 | Deadline reminders, case updates |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Voice | 4850 | Voice legal queries |

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