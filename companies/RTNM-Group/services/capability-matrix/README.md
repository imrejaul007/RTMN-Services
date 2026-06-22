# RTMN Capability Matrix Engine

**Port:** 3013  
**Status:** Built ✅

## What It Does

The Capability Matrix Engine provides a formal inheritance model that connects companies to Industry OS capabilities. It enables:

1. **Capability Registry** - Register and manage all capabilities across RTMN
2. **Matrix Management** - Track capabilities for any entity (company, team, agent, person)
3. **Inheritance Engine** - Model capability relationships and dependencies
4. **Propagation** - Propagate capabilities from Industry OS to companies

## Quick Start

```bash
cd core/capability-matrix
npm install
npm start
```

## API Examples

### Create a Capability

```bash
curl -X POST http://localhost:3013/api/capabilities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Restaurant POS",
    "category": "OPERATIONS",
    "industries": ["restaurant"]
  }'
```

### Get Company Matrix

```bash
curl http://localhost:3013/api/matrix/CORP-12345
```

### Propagate Industry Capabilities

```bash
curl -X POST http://localhost:3013/api/propagation/propagate \
  -H "Content-Type: application/json" \
  -d '{
    "sourceIndustryId": "restaurant-os",
    "targetCorpId": "CORP-12345"
  }'
```

## Architecture

```
Industry OS (Restaurant)
         │
         ▼
┌─────────────────────┐
│ Capability Registry │
└─────────────────────┘
         │
         ▼ (propagation)
┌─────────────────────┐
│  Company Matrix     │
│  (CORP-12345)      │
│  - POS: Advanced    │
│  - Inventory: Inter │
└─────────────────────┘
```

## Categories

- TECHNICAL
- BUSINESS
- OPERATIONS
- CREATIVE
- ANALYTICS
- SUPPORT
- HR
- LEADERSHIP
- DOMAIN

## Proficiency Levels

- BEGINNER (1)
- INTERMEDIATE (2)
- ADVANCED (3)
- EXPERT (4)

## Environment

```bash
PORT=3013
REDIS_URL=redis://localhost:6379
```

## Health Check

```bash
curl http://localhost:3013/health
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Full documentation
- [API.md](./API.md) - API reference
