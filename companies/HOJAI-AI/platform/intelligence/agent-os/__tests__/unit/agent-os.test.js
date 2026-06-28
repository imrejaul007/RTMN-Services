// Agent OS unit tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { validateStateTransition, getValidTransitions, isTerminalState, getStateInfo, STATES } from '../../src/state-machine.js';
import { sendMessage, receiveMessages, getConversations, getMessageCount, clearMessages } from '../../src/ipc.js';
import { recordHeartbeat, getAgentHealth, getStaleAgents, clearHeartbeat } from '../../src/health-monitor.js';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4892, path, method, headers: {} };
    if (body) {
      const json = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(json);
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;

// --- State Machine Tests ---
describe('State Machine', () => {
  it('should have all 6 valid states', () => {
    expect(STATES).toHaveLength(6);
    expect(STATES).toContain('idle');
    expect(STATES).toContain('running');
    expect(STATES).toContain('paused');
    expect(STATES).toContain('stopped');
    expect(STATES).toContain('dead');
    expect(STATES).toContain('error');
  });

  it('should allow idle → running', () => {
    expect(validateStateTransition('idle', 'running')).toBe(true);
  });

  it('should allow running → paused', () => {
    expect(validateStateTransition('running', 'paused')).toBe(true);
  });

  it('should allow running → stopped', () => {
    expect(validateStateTransition('running', 'stopped')).toBe(true);
  });

  it('should allow running → dead', () => {
    expect(validateStateTransition('running', 'dead')).toBe(true);
  });

  it('should allow paused → running (resume)', () => {
    expect(validateStateTransition('paused', 'running')).toBe(true);
  });

  it('should allow stopped → idle (reset)', () => {
    expect(validateStateTransition('stopped', 'idle')).toBe(true);
  });

  it('should allow error → idle (reset)', () => {
    expect(validateStateTransition('error', 'idle')).toBe(true);
  });

  it('should NOT allow idle → paused', () => {
    expect(() => validateStateTransition('idle', 'paused')).toThrow();
  });

  it('should NOT allow paused → idle', () => {
    expect(() => validateStateTransition('paused', 'idle')).toThrow();
  });

  it('should NOT allow dead → anything (terminal)', () => {
    expect(() => validateStateTransition('dead', 'idle')).toThrow();
    expect(() => validateStateTransition('dead', 'running')).toThrow();
    expect(isTerminalState('dead')).toBe(true);
  });

  it('should throw for unknown states', () => {
    expect(() => validateStateTransition('unknown', 'running')).toThrow('Unknown state');
    expect(() => validateStateTransition('idle', 'unknown')).toThrow('Unknown state');
  });

  it('should return valid transitions for each state', () => {
    expect(getValidTransitions('idle')).toEqual(['running']);
    expect(getValidTransitions('running')).toContain('paused');
    expect(getValidTransitions('running')).toContain('stopped');
    expect(getValidTransitions('paused')).toContain('running');
    expect(getValidTransitions('stopped')).toEqual(['idle']);
  });

  it('should return state info with description', () => {
    const info = getStateInfo('running');
    expect(info.state).toBe('running');
    expect(info.isTerminal).toBe(false);
    expect(info.description).toBe('Agent is actively executing');
  });
});

// --- Health Monitor Tests ---
describe('Health Monitor', () => {
  const mockAgent = { id: 'h-test-1', name: 'Test Agent', state: 'running', pid: 12345, createdAt: new Date().toISOString() };
  beforeEach(() => { clearHeartbeat('h-test-1'); });

  it('should record heartbeat', () => {
    recordHeartbeat('h-test-1');
    const health = getAgentHealth(mockAgent);
    expect(health.isStale).toBe(false);
    expect(health.isAlive).toBe(true);
  });

  it('should detect stale agent (no heartbeat)', () => {
    const health = getAgentHealth(mockAgent);
    expect(health.isStale).toBe(true);
    expect(health.isAlive).toBe(false);
  });

  it('should get stale agents from map', () => {
    const map = new Map([['h-test-1', mockAgent]]);
    const stale = getStaleAgents(map);
    expect(stale).toContain('h-test-1');
  });

  it('should report non-stale for stopped agents', () => {
    const stopped = { ...mockAgent, state: 'stopped' };
    const health = getAgentHealth(stopped);
    expect(health.isStale).toBe(false);
    expect(health.isAlive).toBe(false);
  });
});

// --- IPC Tests ---
describe('IPC', () => {
  beforeEach(() => { clearMessages(); });

  it('should send and receive messages', () => {
    const msg = sendMessage({ from: 'agent-a', to: 'agent-b', message: 'Hello', type: 'text' });
    expect(msg.id).toBeTruthy();
    expect(msg.from).toBe('agent-a');
    expect(msg.to).toBe('agent-b');
    expect(msg.message).toBe('Hello');
    expect(msg.read).toBe(false);
    const inbox = receiveMessages('agent-b');
    expect(inbox).toHaveLength(1);
    expect(inbox[0].message).toBe('Hello');
  });

  it('should mark messages as read after receive', () => {
    sendMessage({ from: 'a', to: 'b', message: 'test' });
    const first = receiveMessages('b');
    expect(first[0].read).toBe(true);
    const second = receiveMessages('b');
    expect(second).toHaveLength(0);
  });

  it('should get conversations', () => {
    sendMessage({ from: 'alice', to: 'bob', message: 'Hi' });
    sendMessage({ from: 'bob', to: 'alice', message: 'Hey' });
    sendMessage({ from: 'alice', to: 'charlie', message: 'Hello' });
    const convos = getConversations('alice');
    expect(convos.length).toBeGreaterThanOrEqual(2);
  });

  it('should track message count', () => {
    expect(getMessageCount()).toBe(0);
    sendMessage({ from: 'a', to: 'b', message: 'msg1' });
    sendMessage({ from: 'b', to: 'a', message: 'msg2' });
    expect(getMessageCount()).toBe(2);
  });
});

// --- HTTP Integration Tests ---
describe('Agent OS HTTP API', () => {
  beforeAll(async () => {
    const mod = await import('../../src/index.js');
    server = mod.default;
    await new Promise(r => setTimeout(r, 300));
  });

  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => {
    const res = await httpReq('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /ready', async () => {
    const res = await httpReq('GET', '/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  it('GET /api/stats', async () => {
    const res = await httpReq('GET', '/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('byState');
  });

  it('POST /api/agents should create agent', async () => {
    const res = await httpReq('POST', '/api/agents', { name: 'TestAgent', type: 'chat' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe('TestAgent');
    expect(res.body.type).toBe('chat');
    expect(res.body.state).toBe('idle');
    expect(res.body.sandboxDir).toBeTruthy();
  });

  it('POST /api/agents should return 400 without name', async () => {
    const res = await httpReq('POST', '/api/agents', { type: 'chat' });
    expect(res.status).toBe(400);
  });

  it('GET /api/agents should list agents', async () => {
    const res = await httpReq('GET', '/api/agents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agents');
  });

  it('GET /api/agents/:id should return agent', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'GetTest', type: 'test' });
    const res = await httpReq('GET', `/api/agents/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(create.body.id);
  });

  it('GET /api/agents/:id should return 404 for unknown', async () => {
    const res = await httpReq('GET', '/api/agents/unknown-id-xyz');
    expect(res.status).toBe(404);
  });

  it('PUT /api/agents/:id should update', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'UpdateTest', type: 'test' });
    const res = await httpReq('PUT', `/api/agents/${create.body.id}`, { name: 'UpdatedName' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('UpdatedName');
  });

  it('POST /api/agents/:id/start should start agent', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'StartTest', type: 'test' });
    const id = create.body.id;
    const res = await httpReq('POST', `/api/agents/${id}/start`);
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('running');
    await httpReq('POST', `/api/agents/${id}/stop`);
  });

  it('lifecycle: idle→running→paused→running→stopped→idle', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'LifecycleTest', type: 'test' });
    const id = create.body.id;
    await httpReq('POST', `/api/agents/${id}/start`);
    const pause = await httpReq('POST', `/api/agents/${id}/pause`);
    expect(pause.body.state).toBe('paused');
    const resume = await httpReq('POST', `/api/agents/${id}/resume`);
    expect(resume.body.state).toBe('running');
    const stop = await httpReq('POST', `/api/agents/${id}/stop`);
    expect(stop.body.state).toBe('stopped');
  });

  it('should return 400 for invalid transition', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'InvalidTrans', type: 'test' });
    const res = await httpReq('POST', `/api/agents/${create.body.id}/pause`);
    expect(res.status).toBe(400);
  });

  it('POST /api/agents/:id/execute should run task', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'ExecTest', type: 'test' });
    const id = create.body.id;
    await httpReq('POST', `/api/agents/${id}/start`);
    const res = await httpReq('POST', `/api/agents/${id}/execute`, { task: 'do something' });
    expect(res.status).toBe(200);
    expect(res.body.executionId).toBeTruthy();
    expect(res.body.status).toBe('success');
    await httpReq('POST', `/api/agents/${id}/stop`);
  });

  it('POST /api/agents/:id/execute should return 400 if not running', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'ExecIdle', type: 'test' });
    const res = await httpReq('POST', `/api/agents/${create.body.id}/execute`, { task: 'do something' });
    expect(res.status).toBe(400);
  });

  it('GET /api/agents/:id/health', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'HealthTest', type: 'test' });
    const res = await httpReq('GET', `/api/agents/${create.body.id}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isAlive');
  });

  it('GET /api/agents/:id/heartbeat', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'BeatTest', type: 'test' });
    const res = await httpReq('GET', `/api/agents/${create.body.id}/heartbeat`);
    expect(res.status).toBe(200);
    expect(res.body.heartbeat).toBeTruthy();
  });

  it('POST /api/ipc/send', async () => {
    const res = await httpReq('POST', '/api/ipc/send', { from: 'a1', to: 'a2', message: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
  });

  it('GET /api/ipc/inbox/:agentId', async () => {
    await httpReq('POST', '/api/ipc/send', { from: 'x', to: 'inbox-test', message: 'inbox msg' });
    const res = await httpReq('GET', '/api/ipc/inbox/inbox-test');
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/ipc/conversations/:agentId', async () => {
    const res = await httpReq('GET', '/api/ipc/conversations/test-agent');
    expect(res.status).toBe(200);
  });

  it('GET /api/agents/:id/sandbox', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'SandboxTest', type: 'test' });
    const res = await httpReq('GET', `/api/agents/${create.body.id}/sandbox`);
    expect(res.status).toBe(200);
    expect(res.body.sandboxDir).toBeTruthy();
  });

  it('DELETE /api/agents/:id', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'DeleteTest', type: 'test' });
    const res = await httpReq('DELETE', `/api/agents/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
    const get = await httpReq('GET', `/api/agents/${create.body.id}`);
    expect(get.status).toBe(404);
  });
});
