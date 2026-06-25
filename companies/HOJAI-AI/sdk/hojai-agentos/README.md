# @hojai/agentos — AgentOS TypeScript SDK

> TypeScript client for HOJAI Agent Operating System. Manage AI employee lifecycle: create, deploy, pause, resume, heartbeat, version snapshots, and capability-based search.

## Install

```bash
npm install @hojai/agentos
```

## Quick Start

```ts
import { AgentOS } from '@hojai/agentos';

const agentos = new AgentOS({ baseUrl: 'http://localhost:7300' });

// Create an agent
const agent = await agentos.registry.create({
  name: 'Genie Research',
  type: 'genie',
  owner: 'acme-corp',
  capabilities: ['web-search', 'pdf-parse', 'synthesis'],
});

// Deploy it
await agentos.registry.deploy(agent);

// Execute a task
const result = await agentos.execution.execute({
  agentId: agent.id,
  task: 'Research the latest AI trends in healthcare',
});

// Poll until done
const done = await agentos.execution.waitForCompletion(result.executionId);
console.log(done.result);
```

## Sub-clients

All sub-clients can be imported standalone for tree-shaking:

```ts
import { AgentRegistryClient } from '@hojai/agentos/registry';
import { AgentOrchestratorClient } from '@hojai/agentos/orchestrator';
import { AgentExecutionClient } from '@hojai/agentos/execution';
```

### AgentRegistryClient — Lifecycle Management

```ts
const registry = new AgentRegistryClient();

// Create
const agent = await registry.create({ name: 'My Agent', type: 'genie', owner: 'me' });

// List with filters
const active = await registry.list({ status: 'active', capability: 'web-search' });

// Lifecycle
await registry.deploy({ name: 'My Agent', type: 'genie', owner: 'me' });
await registry.pause(agent.id);
await registry.resume(agent.id);
await registry.heartbeat(agent.id);

// Version snapshots
const versions = await registry.getVersions(agent.id);
await registry.snapshot(agent.id); // tagged release
```

### AgentOrchestratorClient — Multi-Agent Workflows

```ts
const orch = new AgentOrchestratorClient();

// Build a sequential plan (each step waits for the previous)
const seqPlan = orch.sequential('Research Pipeline', [
  { id: 'fetch', name: 'Fetch Data', agentId: 'agt_1' },
  { id: 'parse', name: 'Parse', agentId: 'agt_2' },
  { id: 'store', name: 'Store', agentId: 'agt_3' },
]);

// Build a parallel plan (all steps run concurrently)
const parPlan = orch.parallel('Parallel Research', [
  { name: 'Web Search', agentId: 'agt_1' },
  { name: 'PDF Parse', agentId: 'agt_2' },
  { name: 'API Query', agentId: 'agt_3' },
]);

// Fan-out: trigger → parallel workers
const fanPlan = orch.fanOut('Price Compare', { name: 'Collect URLs', agentId: 'agt_1' }, [
  { name: 'Check Flipkart', agentId: 'agt_2' },
  { name: 'Check Amazon', agentId: 'agt_3' },
]);

// Create + run
const plan = await orch.createPlan(seqPlan);
await orch.startPlan(plan.planId);

// Lifecycle
await orch.pausePlan(plan.planId);
await orch.resumePlan(plan.planId);
await orch.cancelPlan(plan.planId);
```

### AgentExecutionClient — Task Execution

```ts
const exec = new AgentExecutionClient();

// Submit task
const result = await exec.execute({
  agentId: 'agt_1234',
  task: 'Summarize the Q3 earnings report',
  input: { file: 'earnings-q3.pdf' },
  timeout: 60_000,
  priority: 'high',
});

// Poll for completion
const done = await exec.waitForCompletion(result.executionId, 2000, 120_000);
if (done.status === 'completed') console.log(done.result);

// List executions for an agent
const history = await exec.listExecutions('agt_1234');
```

## Configuration

```ts
new AgentOS({
  baseUrl: 'http://localhost:7300',   // AgentOS Hub URL (default: http://localhost:7300)
  registryPort: 4803,                // agent-registry port
  orchestratorPort: 4812,            // agent-orchestrator port
  executionPort: 4804,               // agent-execution-engine port
  observabilityPort: 4810,           // agent-observability port
  apiKey: 'your-internal-token',    // Auth token
  timeout: 30_000,                   // Request timeout ms (default: 30000)
  retries: 3,                        // Retry attempts (default: 3)
});
```

## Auto-Registration

When an AI Employee is installed, it can self-register with AgentOS:

```ts
// In the AI Employee's install handler
await agentos.registerFromEmployee({
  id: 'emp_research',
  slug: 'genie-research',
  name: 'Genie Research',
  category: 'research',
  capabilities: ['web-search', 'pdf-parse', 'synthesis'],
  tags: ['research', 'ai'],
  serviceUrl: 'http://localhost:4740',
  port: 4740,
  version: '1.0.0',
  pricing: { model: 'usage', perCall: 0.5 },
  status: 'available',
  visionAgent: true,
  visionRole: 'research',
  notes: 'Deep research agent with web + PDF + citation synthesis',
});
```

## Error Handling

```ts
import { AgentOS } from '@hojai/agentos';
import {
  AgentOSError,
  AgentNotFoundError,
  AgentValidationError,
  AgentLifecycleError,
} from '@hojai/agentos/errors';

try {
  await registry.get('agt_nonexistent');
} catch (err) {
  if (err instanceof AgentNotFoundError) {
    console.log('Agent not found:', err.message);
  } else if (err instanceof AgentValidationError) {
    console.log('Invalid input:', err.message);
  } else if (err instanceof AgentOSError) {
    console.log(`AgentOS error ${err.statusCode}:`, err.message);
  }
}
```

## API Reference

### AgentOSConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `baseUrl` | string | `http://localhost:7300` | AgentOS Hub base URL |
| `registryPort` | number | `4803` | agent-registry port |
| `orchestratorPort` | number | `4812` | agent-orchestrator port |
| `executionPort` | number | `4804` | agent-execution-engine port |
| `observabilityPort` | number | `4810` | agent-observability port |
| `apiKey` | string | `''` | Bearer token for auth |
| `timeout` | number | `30000` | Request timeout in ms |
| `retries` | number | `3` | Retry attempts on failure |

### AgentStatus

```ts
type AgentStatus = 'draft' | 'active' | 'paused' | 'retired';
```

### AgentType

```ts
type AgentType = 'genie' | 'merchant' | 'system' | 'partner' | 'custom';
```
