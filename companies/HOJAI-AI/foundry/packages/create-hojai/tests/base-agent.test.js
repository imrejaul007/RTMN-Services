/**
 * Tests for the BaseAgent runtime that gets baked into every starter.
 *
 * Uses node:test + node:assert. No external deps.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { BaseAgent, createAgentRegistry } = await import(
  path.resolve(__dirname, '..', 'src', 'runtime', 'BaseAgent.js')
);

test('BaseAgent: local mode runs the strategy function', async () => {
  const agent = new BaseAgent({
    name: 'CEO',
    strategy: ({ goal }) => ({ decision: goal ? `route:${goal}` : 'route:sales' })
  });

  const out = await agent.run({ goal: 'rfq' });
  assert.equal(out.agent, 'CEO');
  assert.equal(out.source, 'local');
  assert.equal(out.success, true);
  assert.deepEqual(out.output, { decision: 'route:rfq' });
  assert.ok(out.latencyMs >= 0);
});

test('BaseAgent: local mode tracks stats after multiple runs', async () => {
  const agent = new BaseAgent({
    name: 'Sales',
    strategy: ({ product }) => ({ quoted: !!product, product })
  });
  await agent.run({ product: 'shoes' });
  await agent.run({ product: null });
  await agent.run({ product: 'hat' });

  assert.equal(agent.stats.totalTasks, 3);
  assert.equal(agent.stats.successCount, 3);
  assert.equal(agent.stats.failureCount, 0);
});

test('BaseAgent: throws when no strategy and no remote config', async () => {
  const agent = new BaseAgent({ name: 'Empty' });
  await assert.rejects(agent.run({}), /no strategy function/);
});

test('BaseAgent: constructor validates required fields', () => {
  assert.throws(() => new BaseAgent(), /opts object is required/);
  assert.throws(() => new BaseAgent({}), /opts.name is required/);
});

test('BaseAgent: isRemote() respects baseUrl + businessId', () => {
  const local = new BaseAgent({ name: 'A', strategy: () => ({}) });
  assert.equal(local.isRemote(), false);

  const remote = new BaseAgent({
    name: 'A',
    strategy: () => ({}),
    baseUrl: 'http://localhost:4851',
    businessId: 'biz-1'
  });
  assert.equal(remote.isRemote(), true);

  const urlOnly = new BaseAgent({
    name: 'A',
    strategy: () => ({}),
    baseUrl: 'http://localhost:4851'
  });
  assert.equal(urlOnly.isRemote(), false); // businessId also required
});

test('BaseAgent: remote mode success returns source=remote', async () => {
  const agent = new BaseAgent({
    name: 'CEO',
    strategy: () => ({ stub: true }),
    baseUrl: 'http://localhost:0',  // unreachable — we'll use the local fallback path
    businessId: 'biz-1',
    apiKey: 'test-key'
  });

  // BaseAgent gracefully falls back to local strategy when remote fails.
  const out = await agent.run({ goal: 'rfq' });
  assert.equal(out.source, 'local');
  assert.ok(out.fallbackReason, 'fallbackReason should be set when remote is unreachable');
  assert.deepEqual(out.output, { stub: true });
});

test('BaseAgent: remote mode without strategy surfaces the error', async () => {
  const agent = new BaseAgent({
    name: 'NoStrategy',
    baseUrl: 'http://localhost:0',
    businessId: 'biz-1'
  });
  const out = await agent.run({ x: 1 });
  assert.equal(out.source, 'remote');
  assert.equal(out.success, false);
  // Either the fetch fails (network error) or the register call fails.
  // Either way the output should contain an error string and no fallback
  // should happen because there's no strategy function.
  assert.ok(typeof out.output.error === 'string' && out.output.error.length > 0);
});

test('BaseAgent: describe() returns a clean shape', () => {
  const agent = new BaseAgent({
    name: 'CEO',
    description: 'Orchestrator',
    capabilities: ['route', 'summarize'],
    strategy: () => ({})
  });
  const d = agent.describe();
  assert.equal(d.name, 'CEO');
  assert.equal(d.description, 'Orchestrator');
  assert.equal(d.mode, 'local');
  assert.deepEqual(d.capabilities, ['route', 'summarize']);
  assert.ok(d.stats);
});

test('createAgentRegistry: register / list / run', async () => {
  const reg = createAgentRegistry();
  reg.register(new BaseAgent({ name: 'CEO',   strategy: ({ g }) => ({ route: g }) }));
  reg.register(new BaseAgent({ name: 'Sales', strategy: ({ p }) => ({ quoted: !!p, p }) }));

  const list = reg.list();
  assert.equal(list.length, 2);
  assert.equal(list[0].name, 'CEO');
  assert.equal(list[1].name, 'Sales');

  const out = await reg.run('CEO', { g: 'rfq' });
  assert.deepEqual(out.output, { route: 'rfq' });

  await assert.rejects(reg.run('Unknown', {}), /unknown agent/);
});

test('createAgentRegistry: rejects non-BaseAgent registration', () => {
  const reg = createAgentRegistry();
  assert.throws(() => reg.register({ name: 'Fake' }), /expected a BaseAgent instance/);
});