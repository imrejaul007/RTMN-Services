# HOJAI AI Platform

> **Version:** 5.15  
> **Date:** June 28, 2026  
> **Status:** 41/41 phases complete ✅

## Quick Start

```bash
# Start all 15 platform services
docker-compose up -d

# Run smoke tests
./smoke-test.sh

# Start individual service
cd platform/intelligence/agent-os && npm start
```

## 15 Platform Services

| Service | Port | Phase | Description |
|---------|------|-------|-------------|
| Agent OS | 4892 | 11/32 | Production agent runtime with 6-state lifecycle |
| Personalization | 4893 | 21 | User profiles, affinity tracking, recommendations |
| AI Economy | 4894 | 22 | Marketplace listings, pricing, wallets |
| Governance | 4895 | 23 | Policy engine, audit trail, compliance |
| Planning Engine | 4896 | 14 | DAG validation, goal decomposition |
| Multi-Modal | 4897 | 27 | Image/audio/video, OCR, transcription |
| AIOps | 4898 | 26 | Metrics, alerts, incidents, dashboards |
| Memory Lifecycle | 4899 | 39 | TTL, compaction, pruning, GDPR |
| Knowledge Registry | 4900 | 36 | Asset CRUD, versioning, taxonomy |
| Event Platform | 4901 | 37 | Schema registry, ingestion, routing, replay |
| Workflow Registry | 4902 | 34 | Template registry, versioning, categories |
| Twin Registry | 4903 | 35 | Twin types, instances, relationships |
| Tenant Isolation | 4904 | 24 | Multi-region, data residency, failover |
| Fine-Tuning | 4610 | 30 | Training jobs, checkpoints, deployment |
| Eval Continuous | 4888 | 4/31 | Continuous eval, baselines, quality gates |
| AI Studio | 4890 | 38 | Visual workflow builder, DAG executor |

## TypeScript SDK

```bash
npm install @hojai/core-sdk
```

```typescript
import { AgentOSClient, PlanningEngineClient } from '@hojai/core-sdk';

const agentOS = new AgentOSClient();
const agent = await agentOS.createAgent({ name: 'MyAgent', type: 'genie' });
await agentOS.startAgent(agent.id);
```

See [sdk/hojai-core-sdk/](sdk/hojai-core-sdk/) for all 15 clients.

## Testing

```bash
# All services (run from platform root)
find . -name "vitest.config.js" -exec sh -c 'cd $(dirname {}) && npm test' \;

# Smoke test
./smoke-test.sh

# Individual service
cd platform/intelligence/agent-os && npm test
```

## CI/CD

GitHub Actions: [.github/workflows/test.yml](.github/workflows/test.yml)

- Node 20 + 22 matrix
- npm ci + npm test
- Docker build for all 15 services
- docker-compose integration test

## Architecture

```
HOJAI AI Platform
├── Agent OS (4892)       ├── Personalization (4893)
├── AI Economy (4894)       ├── Governance (4895)
├── Planning Engine (4896)  ├── Multi-Modal (4897)
├── AIOps (4898)           ├── Memory Lifecycle (4899)
├── Knowledge Registry (4900) ├── Event Platform (4901)
├── Workflow Registry (4902) ├── Twin Registry (4903)
├── Tenant Isolation (4904) ├── Fine-Tuning (4610)
└── AI Studio (4890)        └── Eval Continuous (4888)
```

## Contributing

1. Branch: `git checkout -b feat/my-feature`
2. Add tests for new endpoints
3. Run smoke test: `./smoke-test.sh`
4. PR to `feat/killer-30min-demo`
