# Governance Platform

The HOJAI AI Governance Platform is the universal layer that answers "may I do X to subject Y for purpose Z under controls C?" across the entire RTMN ecosystem. It is composed of four services and one shared SDK.

## Start here

1. **[PRODUCTION-READY.md](./PRODUCTION-READY.md)** — overview, design principles, what's in this release, what's not
2. **[API.md](./API.md)** — full endpoint reference for all 4 services
3. **[INTEGRATION.md](./INTEGRATION.md)** — recipes for the 10 most common integration patterns
4. **[TESTS.md](./TESTS.md)** — what we test and how to run the suite

## Services

| Service | Port | What it does |
|---|---|---|
| policy-os | 4254 | Policy registry, evaluation, composition, webhooks, analytics |
| compliance-engine | 4261 | Regulatory framework mapping (GDPR/SOC2/HIPAA/PCI-DSS/ISO27001), evidence, attestations |
| consent-engine | 4262 | User consent capture, purpose binding, withdrawal, check-before-use |
| flow-orchestrator | 4244 | Multi-step plan execution with policy integration |

## SDK

```js
import { createGovernanceClient, governance } from '@rtmn/shared/lib/governance-sdk';
```

## Source code

- `platform/flow/policy-os/`
- `platform/flow/flow-orchestrator/`
- `platform/flow/compliance-engine/`
- `platform/flow/consent-engine/`
- `shared/lib/governance-sdk.js`
