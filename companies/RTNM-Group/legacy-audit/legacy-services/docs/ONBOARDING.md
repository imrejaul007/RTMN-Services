# Developer Onboarding Guide

> **Version:** 1.0.0
> **Last Updated:** 2026-05-13

---

## Table of Contents

1. [Welcome](#welcome)
2. [Architecture Overview](#architecture-overview)
3. [Local Development Setup](#local-development-setup)
4. [Service Discovery](#service-discovery)
5. [Common Tasks](#common-tasks)
6. [Best Practices](#best-practices)
7. [Resources](#resources)

---

## Welcome

Welcome to the ReZ Engineering team! This guide will help you get started with our platform.

### What We Build

ReZ is a commerce OS with:
- **150+ microservices** across 9 companies
- **RTNM-Group**: Controls & Financial Layer
- **RABTUL-Technologies**: Infrastructure
- **REZ-Intelligence**: AI/ML Platform

### Your First Week

| Day | Focus |
|-----|-------|
| Day 1 | Setup, architecture overview |
| Day 2 | Explore a service |
| Day 3 | Make a small change |
| Day 4 | Code review, PR process |
| Day 5 | First contribution |

---

## Architecture Overview

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                    │
│          (Web, Mobile, Admin Dashboard)                   │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (3000)                     │
│            JWT Auth, Rate Limiting, Routing               │
└─────────┬───────────┬───────────┬───────────┬─────────────┘
          │           │           │           │
    ┌─────▼─────┐┌──▼───┐┌────▼────┐┌───▼────┐
    │  Auth     ││Capital││ Identity││ BNPL   │
    │  Service ││Service││ Service ││Service │
    │  (4002)  ││(3005) ││ (3003) ││ (3080) │
    └─────┬─────┘└───┬───┘└────┬────┘└───┬────┘
          │           │           │           │
          └───────────┴────┬────┴─────────┘
                           │
                    ┌──────▼──────┐
                    │   MongoDB   │
                    │   Redis    │
                    └─────────────┘
```

### Service Categories

| Category | Services | Port Range |
|----------|----------|------------|
| Controls | Identity, Access Control | 3000-3005 |
| Finance | Capital, BNPL, Ledger | 3005-3080 |
| Infrastructure | Auth, Payment, Wallet | 4001-4011 |
| Intelligence | AI Services | 4031-4095 |

---

## Local Development Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x | [nodejs.org](https://nodejs.org) |
| Docker | 24.x | [docker.com](https://docker.com) |
| Git | 2.x | [git-scm.com](https://git-scm.com) |

### 1. Clone Repositories

```bash
# Create workspace
mkdir ~/rez && cd ~/rez

# Clone main repositories
git clone git@github.com:RTNM-Group/REZ-platform.git
git clone git@github.com:RABTUL-Technologies/api-platform.git
git clone git@github.com:REZ-Intelligence/ai-platform.git
```

### 2. Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Required variables
cat << EOF >> .env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/rez_dev

# Redis
REDIS_URL=redis://localhost:6379

# Internal Service Tokens (for development)
INTERNAL_SERVICE_TOKENS_JSON='{"admin-panel":"dev-token","payment-service":"dev-token"}'

# JWT Secret (development only)
JWT_SECRET=dev-secret-not-for-production
EOF
```

### 3. Start Infrastructure

```bash
# Start MongoDB and Redis
docker-compose up -d mongodb redis

# Verify
docker-compose ps
curl http://localhost:27017  # Should show MongoDB info
redis-cli ping  # Should return PONG
```

### 4. Install & Build

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start a service
cd REZ-identity-service && npm run dev
```

### 5. Verify Setup

```bash
# Health check
curl http://localhost:3003/health
# {"status":"ok","service":"identity-service"}

# Run tests
npm test
```

---

## Service Discovery

### Find a Service

```bash
# List all services
ls -la RTNM-Group/

# Find by port
grep -r "PORT = " RTNM-Group/*/src/index.ts
```

### Service Ports Reference

| Service | Port | Path |
|---------|------|------|
| Identity | 3003 | `RTNM-Group/REZ-identity-service` |
| Access Control | 3000 | `RTNM-Group/REZ-access-control-service` |
| Capital | 3005 | `RTNM-Group/REZ-capital-service` |
| BNPL | 3080 | `RTNM-Group/REZ-bnpl-service` |
| Payment Links | 4018 | `RTNM-Group/rez-payment-links-service` |

### Service Communication

```bash
# Internal calls use X-Internal-Token header
curl -X POST http://localhost:3003/api/v1/identity \
  -H "X-Internal-Token: dev-token" \
  -H "Content-Type: application/json" \
  -d '{"type":"app_user","identifier":"test@example.com"}'
```

---

## Common Tasks

### 1. Create a New Service

```bash
# Use template
cp -r RTNM-Group/SOT/TEMPLATE_SERVICE my-new-service
cd my-new-service

# Update package.json
# Update service name, description, port

# Install dependencies
npm install

# Start development
npm run dev
```

### 2. Add API Endpoint

```typescript
// In src/routes/my-route.ts
router.post('/api/v1/my-resource', async (req, res) => {
  const { data } = req.body;

  // Validate input
  if (!data) {
    return res.status(400).json({ error: 'Data required' });
  }

  // Process
  const result = await myService.process(data);

  // Respond
  res.json({ success: true, result });
});
```

### 3. Add Database Model

```typescript
// In src/models/my-model.ts
import mongoose, { Schema } from 'mongoose';

const MySchema = new Schema({
  field1: { type: String, required: true },
  field2: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const MyModel = mongoose.model('MyModel', MySchema);
```

### 4. Write Tests

```typescript
// In test/my-service.test.ts
describe('MyService', () => {
  it('should process data correctly', async () => {
    const result = await myService.process({ data: 'test' });
    expect(result.success).toBe(true);
  });
});
```

### 5. Make a Pull Request

```bash
# Create branch
git checkout -b feature/my-feature

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "feat: add my feature"

# Push
git push origin feature/my-feature

# Create PR via GitHub UI
# Request review from team
```

---

## Best Practices

### Code Style

```bash
# Run lint
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format
```

### Error Handling

```typescript
// Good
try {
  const result = await service.doSomething();
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Failed to do something', { error: error.message });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}
```

### Logging

```typescript
// Use structured logging
logger.info('User action', {
  userId: user.id,
  action: 'login',
  timestamp: new Date().toISOString()
});

// Never log sensitive data
logger.error('Payment failed', {
  orderId: order.id,
  // Don't log: cardNumber, CVV, password
});
```

### Security

```typescript
// Validate input with Zod
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100)
});

// Use timing-safe comparison for secrets
import { timingSafeEqual } from 'crypto';
if (!timingSafeEqual(token, expected)) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

## Resources

### Documentation

| Resource | Link |
|----------|------|
| Architecture Docs | `RTNM-Group/SOT/ARCHITECTURE.md` |
| API Reference | `RTNM-Group/docs/openapi.yaml` |
| Security Guide | `RTNM-Group/docs/SECURITY_AUDIT.md` |
| This Guide | `RTNM-Group/docs/ONBOARDING.md` |

### Internal Links

| Resource | URL |
|----------|-----|
| CI/CD | github.com/RTNM-Group/actions |
| Monitoring | grafana.rez.money |
| Logs | kibana.rez.money |
| Incidents | status.rez.money |

### Contacts

| Role | Name | Contact |
|------|------|---------|
| Engineering Lead | [TBD] | lead@rez.money |
| Architecture | [TBD] | arch@rez.money |
| Security | [TBD] | security@rez.money |
| DevOps | [TBD] | devops@rez.money |

---

**Welcome aboard! Questions? Ask in #engineering-help Slack channel.**

---

**Document Owner:** Engineering Team
**Last Updated:** 2026-05-13
