# @hojai/core-sdk

> Unified TypeScript SDK for HOJAI AI — all 15 platform services in one SDK.

**Status:** v1.0.0 (2026-06-28) — Phase 25 complete. 15 clients, full API coverage.

## Install

```bash
npm install @hojai/core-sdk
```

## Quick Start

```typescript
import {
  AgentOSClient,
  PersonalizationClient,
  AIEconomyClient,
  PlanningEngineClient,
  MultiModalClient,
  AIOpsClient,
} from '@hojai/core-sdk';

// Initialize clients
const agentOS = new AgentOSClient();
const personalization = new PersonalizationClient();
const planning = new PlanningEngineClient();

// Use them
const agent = await agentOS.createAgent({ name: 'MyAgent', type: 'genie' });
await agentOS.startAgent(agent.id);

const plan = await planning.decomposeGoal('Research and write a report on AI trends');

const profile = await personalization.createProfile({ userId: 'user123' });
await personalization.trackPreference('user123', 'technology', 0.9);
const recs = await personalization.getRecommendations('user123', 5);
```

## All 15 Services

| Client | Port | Service |
|--------|------|---------|
| `AgentOSClient` | 4892 | Agent Operating System |
| `PersonalizationClient` | 4893 | Personalization & Recommendations |
| `AIEconomyClient` | 4894 | AI Economy & Marketplace |
| `GovernanceClient` | 4895 | Policy Governance & Compliance |
| `PlanningEngineClient` | 4896 | Goal Decomposition & DAG Execution |
| `MultiModalClient` | 4897 | Image/Audio/Video Processing & OCR |
| `AIOpsClient` | 4898 | Observability & Incident Management |
| `MemoryLifecycleClient` | 4899 | Memory TTL, Compaction, Pruning, GDPR |
| `KnowledgeRegistryClient` | 4900 | Knowledge Asset Registry & Taxonomy |
| `EventPlatformClient` | 4901 | Event Schema, Ingestion, Routing, Replay |
| `WorkflowRegistryClient` | 4902 | Workflow Template Registry |
| `TwinRegistryClient` | 4903 | Digital Twin Type & Instance Registry |
| `FineTuningClient` | 4610 | Model Fine-Tuning Pipeline |
| `EvalContinuousClient` | 4888 | Continuous Evaluation & Quality Gates |
| `AIStudioClient` | 4890 | Visual Workflow Builder & Executor |

## Configuration

```typescript
const client = new AgentOSClient({
  baseURL: 'http://localhost:4892',  // default
  apiKey: 'your-api-key',            // optional
  timeout: 10000,                    // default 10s
});
```

## Health Checks

All clients inherit `health()` and `ready()`:

```typescript
const status = await agentOS.health();
const isReady = await agentOS.ready();
```

## TypeScript

Fully typed with TypeScript. Import types from individual client files:

```typescript
import type { HojaiConfig } from '@hojai/core-sdk';
```