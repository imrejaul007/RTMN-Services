/**
 * @hojai/agentos — Unit tests.
 * Run with: npm test
 */

import { describe, it } from 'node:test';
import { equal, ok } from 'node:assert';

// ─── Types ───────────────────────────────────────────────────────────────────

import type {
  AgentSummary,
  CreateAgentOptions,
  UpdateAgentOptions,
  ExecutionRequest,
  ExecutionResult,
  AgentOSConfig,
  OrchestrationPlan,
} from '../types.js';

describe('types', () => {
  it('AgentSummary has required fields', () => {
    const a: AgentSummary = {
      id: 'agt_1234',
      name: 'Genie Research',
      version: '1.0.0',
      type: 'genie',
      status: 'active',
      owner: 'acme-corp',
      capabilities: ['web-search', 'pdf-parse'],
      tools: [],
      skills: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      lastHeartbeat: '2026-01-01T00:00:00Z',
      expired: false,
    };
    equal(a.id, 'agt_1234');
    equal(a.type, 'genie');
    equal(a.status, 'active');
    equal(a.capabilities.includes('web-search'), true);
  });

  it('CreateAgentOptions requires name/type/owner', () => {
    const opts: CreateAgentOptions = {
      name: 'Test Agent',
      type: 'genie',
      owner: 'test-owner',
      capabilities: ['data-fetch'],
    };
    equal(opts.name, 'Test Agent');
    equal(opts.type, 'genie');
  });

  it('ExecutionRequest is well-typed', () => {
    const req: ExecutionRequest = {
      agentId: 'agt_1234',
      task: 'Research AI trends',
      input: { depth: 'deep' },
      timeout: 30000,
      priority: 'high',
    };
    equal(req.agentId, 'agt_1234');
    equal(req.task, 'Research AI trends');
    equal(req.priority, 'high');
  });

  it('AgentOSConfig has sensible defaults', () => {
    const cfg: AgentOSConfig = {};
    equal(cfg.baseUrl, undefined);
    equal(cfg.timeout, undefined);
    equal(cfg.retries, undefined);
  });

  it('OrchestrationPlan shape', () => {
    const plan: OrchestrationPlan = {
      planId: 'plan_abc',
      agentId: 'agt_1234',
      steps: [
        {
          stepId: 'step_0',
          agentId: 'agt_1234',
          task: 'Fetch data',
          dependsOn: [],
          status: 'pending',
        },
      ],
      status: 'planned',
    };
    equal(plan.planId, 'plan_abc');
    equal(plan.steps.length, 1);
  });
});

// ─── Errors ──────────────────────────────────────────────────────────────────

import {
  AgentOSError,
  AgentNotFoundError,
  AgentValidationError,
  AgentConflictError,
  AgentLifecycleError,
  AgentTimeoutError,
  AgentOSConnectionError,
} from '../errors.js';

describe('errors', () => {
  it('AgentOSError has code + statusCode', () => {
    const err = new AgentOSError('something went wrong', 'SOME_CODE', 500);
    equal(err.message, 'something went wrong');
    equal(err.code, 'SOME_CODE');
    equal(err.statusCode, 500);
    ok(err instanceof Error);
  });

  it('AgentNotFoundError carries agentId in message', () => {
    const err = new AgentNotFoundError('agt_999');
    equal(err.message, 'Agent not found: agt_999');
    equal(err.code, 'AGENT_NOT_FOUND');
    equal(err.statusCode, 404);
  });

  it('AgentValidationError formats array details', () => {
    const err = new AgentValidationError(['field x required', 'field y must be string']);
    equal(err.code, 'VALIDATION_ERROR');
    equal(err.statusCode, 400);
    ok(err.message.includes('field x required'));
  });

  it('AgentLifecycleError formats action + reason', () => {
    const err = new AgentLifecycleError('agt_123', 'pause', 'agent is retired');
    equal(err.code, 'LIFECYCLE_ERROR');
    equal(err.statusCode, 422);
    equal(err.message, 'Cannot pause agent agt_123: agent is retired');
  });

  it('AgentTimeoutError formats timeout', () => {
    const err = new AgentTimeoutError('agt_123', 30000);
    equal(err.code, 'TIMEOUT');
    equal(err.statusCode, 408);
    equal(err.message, 'Agent agt_123 heartbeat timeout after 30000ms');
  });

  it('AgentOSConnectionError includes URL', () => {
    const err = new AgentOSConnectionError('http://localhost:9999', new Error('ECONNREFUSED'));
    equal(err.code, 'CONNECTION_ERROR');
    equal(err.message, 'Cannot connect to AgentOS at http://localhost:9999');
  });
});

// ─── Client ─────────────────────────────────────────────────────────────────

import { AgentOSClient } from '../client.js';

describe('AgentOSClient', () => {
  it('resolves URLs correctly', () => {
    const c = new AgentOSClient({ baseUrl: 'http://localhost:7300' });
    equal(c.url(4803, '/api/agents'), 'http://localhost:7300:4803/api/agents');
    equal(c.url(4803, 'api/agents'), 'http://localhost:7300:4803/api/agents');
  });

  it('removes trailing slash from baseUrl', () => {
    const c = new AgentOSClient({ baseUrl: 'http://localhost:7300/' });
    equal(c.baseUrl, 'http://localhost:7300');
    equal(c.url(4803, '/api/agents'), 'http://localhost:7300:4803/api/agents');
  });

  it('applies custom timeout and retries', () => {
    const c = new AgentOSClient({ timeout: 60_000, retries: 5 });
    equal(c.timeout, 60_000);
    equal(c.retries, 5);
  });

  it('ping returns boolean (does not throw)', () => {
    const c = new AgentOSClient({ baseUrl: 'http://localhost:99999' });
    // Without a server, ping returns false — it never throws
    c.ping(99999).then((ok_) => equal(ok_, false));
  });
});

// ─── Orchestrator workflow builders ───────────────────────────────────────────

import { AgentOrchestratorClient } from '../orchestrator.js';

describe('AgentOrchestratorClient builders', () => {
  const oc = new AgentOrchestratorClient();

  it('sequential: adds correct dependsOn', () => {
    const plan = oc.sequential('Test Seq', [
      { name: 'Fetch', agentId: 'agt_1' },
      { name: 'Parse', agentId: 'agt_2' },
      { name: 'Store', agentId: 'agt_3' },
    ]);
    equal(plan.name, 'Test Seq');
    equal(plan.steps.length, 3);
    equal(plan.steps[0].dependsOn?.length === 0, true); // first has empty deps
    equal(plan.steps[1].dependsOn?.includes('step_0'), true); // depends on step_0
    equal(plan.steps[2].dependsOn?.includes('step_1'), true); // depends on step_1
  });

  it('sequential: preserves user-provided IDs', () => {
    const plan = oc.sequential('Named', [
      { id: 'fetch', name: 'Fetch', agentId: 'agt_1' },
      { id: 'parse', name: 'Parse', agentId: 'agt_2' },
    ]);
    equal(plan.steps[0].id, 'fetch');
    equal(plan.steps[1].dependsOn?.includes('fetch'), true);
  });

  it('parallel: all steps have empty dependsOn', () => {
    const plan = oc.parallel('Parallel Test', [
      { name: 'A', agentId: 'agt_1' },
      { name: 'B', agentId: 'agt_2' },
    ]);
    equal(plan.steps.every((s) => s.dependsOn?.length === 0), true);
  });

  it('fanOut: workers depend on trigger', () => {
    const plan = oc.fanOut(
      'Fan Out',
      { id: 'trigger', name: 'Trigger', agentId: 'agt_1' },
      [
        { name: 'Worker A', agentId: 'agt_2' },
        { name: 'Worker B', agentId: 'agt_3' },
      ]
    );
    equal(plan.steps.length, 3);
    const trigger = plan.steps[0];
    equal(trigger.id, 'trigger');
    equal(trigger.dependsOn?.length, 0);
    for (const w of plan.steps.slice(1)) {
      equal(w.dependsOn?.includes('trigger'), true);
    }
  });

  it('pipeline is alias for sequential', () => {
    const p1 = oc.pipeline('Pipe', [{ name: 'Step', agentId: 'agt_1' }]);
    const p2 = oc.sequential('Seq', [{ name: 'Step', agentId: 'agt_1' }]);
    equal(p1.steps.length, p2.steps.length);
    equal(p1.description, p2.description);
  });

  it('fanIn: aggregator depends on all workers', () => {
    const plan = oc.fanIn(
      'Fan In',
      [
        { name: 'Worker A', agentId: 'agt_1' },
        { name: 'Worker B', agentId: 'agt_2' },
      ],
      { name: 'Aggregator', agentId: 'agt_3' }
    );
    equal(plan.steps.length, 3);
    const agg = plan.steps[2];
    equal(agg.dependsOn?.includes(plan.steps[0].id!), true);
    equal(agg.dependsOn?.includes(plan.steps[1].id!), true);
  });
});

// ─── Registry client (mock — no server needed) ────────────────────────────────

import { AgentRegistryClient } from '../registry.js';

describe('AgentRegistryClient', () => {
  it('instantiates with default ports', () => {
    const rc = new AgentRegistryClient();
    // Just verify it doesn't throw
    ok(rc != null);
  });

  it('instantiates with custom config', () => {
    const rc = new AgentRegistryClient({
      baseUrl: 'http://custom:9000',
      registryPort: 9999,
      executionPort: 9998,
      observabilityPort: 9997,
      timeout: 15_000,
    });
    ok(rc != null);
  });
});

// ─── Execution client (mock — no server needed) ─────────────────────────────

import { AgentExecutionClient } from '../execution.js';

describe('AgentExecutionClient', () => {
  it('instantiates with default port', () => {
    const ec = new AgentExecutionClient();
    ok(ec != null);
  });

  it('instantiates with custom config', () => {
    const ec = new AgentExecutionClient({
      baseUrl: 'http://custom:9000',
      executionPort: 9998,
    });
    ok(ec != null);
  });
});
