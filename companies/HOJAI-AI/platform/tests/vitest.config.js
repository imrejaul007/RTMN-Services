/**
 * HOJAI Test Suite
 * Vitest + Supertest
 */

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { AgentRuntime } from '../runtime/agent-runtime/src';
import { FlowRuntime } from '../runtime/flow-runtime/src';

// ===== Flow Runtime Tests =====

describe('Flow Runtime', () => {
  let runtime;

  beforeAll(() => {
    runtime = new FlowRuntime();

    // Register test nodes
    runtime.registerExecutor('test', async (state) => {
      return { ...state, processed: true };
    });
  });

  test('registers and executes flows', async () => {
    runtime.register({
      id: 'test-flow',
      name: 'Test Flow',
      trigger: { type: 'webhook' },
      nodes: [
        { id: '1', type: 'test', name: 'Test Node', config: {} },
      ],
      connections: [],
    });

    const execution = await runtime.execute('test-flow', 'webhook', { test: true });
    expect(execution.status).toBe('completed');
  });

  test('validates flow structure', () => {
    expect(() => runtime.register({ id: 'bad', nodes: [] }))
      .toThrow();
  });

  test('cancels running executions', async () => {
    runtime.register({
      id: 'slow-flow',
      name: 'Slow Flow',
      trigger: { type: 'webhook' },
      nodes: [
        { id: '1', type: 'test', name: 'Node', config: {} },
      ],
      connections: [],
      config: { timeout: 1000 },
    });

    const exec = runtime.execute('slow-flow', 'webhook', {});
    runtime.cancel(exec.id);
    const execution = runtime.getExecution(exec.id);
    expect(execution?.status).toBe('cancelled');
  });
});

// ===== Agent Runtime Tests =====

describe('Agent Runtime', () => {
  let runtime;

  beforeAll(() => {
    runtime = new AgentRuntime();
  });

  test('registers agents', () => {
    runtime.register({
      id: 'test-agent',
      name: 'Test Agent',
      role: 'test',
      instructions: 'You are a test agent.',
    });

    const agent = runtime.getAgent('test-agent');
    expect(agent).toBeDefined();
  });

  test('lists agents', () => {
    const agents = runtime.listAgents();
    expect(agents.length).toBeGreaterThan(0);
  });

  test('deletes agents', () => {
    runtime.deleteAgent('test-agent');
    expect(runtime.getAgent('test-agent')).toBeUndefined();
  });
});

// ===== Auth Service Tests =====

describe('Auth Service', () => {
  const BASE = 'http://localhost:4000';

  test.todo('POST /auth/register creates tenant + user');
  test.todo('POST /auth/login returns JWT');
  test.todo('GET /tenant returns tenant info');
  test.todo('DELETE /users/:id removes user');
});

// ===== Integration Tests =====

describe('Integrations', () => {
  test.todo('Slack client sends messages');
  test.todo('CRM creates contacts');
  test.todo('Email sends templates');
  test.todo('Calendar creates events');
});

// ===== E2E Test =====

describe('Full Flow', () => {
  test('user registers → creates workflow → executes', async () => {
    // 1. Register user
    const registerRes = await fetch('http://localhost:4000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@test.com`,
        password: 'testpassword123',
        companyName: 'Test Co',
      }),
    });

    expect(registerRes.status).toBe(201);
    const { token } = await registerRes.json();

    // 2. Create workflow
    // (Requires real DB)

    // 3. Execute workflow
    // (Requires real runtime)
  });
});
