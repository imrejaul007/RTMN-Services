# CLAUDE.md - SUTAR OS

## Project Overview

**Name:** SUTAR OS
**Type:** Autonomous Economic Infrastructure
**Version:** 2.0
**Status:** ✅ Production Ready - All 25 Services Built
**Company:** HOJAI AI
**Location:** `hojai-ai/hojai-sutar-os/`

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- Zod (validation)
- Docker

## Architecture

SUTAR OS follows a 12-layer canonical architecture:

```
Trigger → Intent Graph → GoalOS → Decision → Simulation → Discovery → Negotiation → Trust → Contract → Economy → Flow → Learning
```

## Services

25 microservices across 8 layers:

| Layer | Services | Ports |
|-------|----------|-------|
| Gateway | sutar-gateway | 4140 |
| Twin & Memory | sutar-twin-os, sutar-memory-bridge, sutar-agent-id, sutar-identity-os | 4142-4147 |
| Intent & Agent | sutar-intent-bus, sutar-agent-network | 4154-4155 |
| Decision | sutar-decision-engine, sutar-simulation-os, sutar-goal-os, sutar-network-learning, sutar-flow-os | 4240-4244 |
| Marketplace | sutar-marketplace, sutar-economy-os, sutar-usage-tracker, sutar-policy-os | 4250-4254 |
| Trust & Compliance | sutar-trust-engine, sutar-contract-os, sutar-negotiation-engine | 4180-4191 |
| Discovery | sutar-exploration-engine, sutar-discovery-engine, sutar-multi-agent-evaluator, sutar-reputation-aggregator, sutar-roi-calculator | 4255-4259 |
| Monitoring | sutar-monitoring | 3100 |

## Commands

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start all services |
| `cd services/<name> && npm install && npm run dev` | Run individual service |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | Service-specific | Service port |
| NODE_ENV | No | development | Environment |

## Integration

### Upstream
- HOJAI Core (4500-4590)
- RABTUL Services (4001-4005)

### Downstream
- HOJAI Memory (4520)
- Industry AI (4750-4754)

---

**Last Updated:** 2026-06-13
