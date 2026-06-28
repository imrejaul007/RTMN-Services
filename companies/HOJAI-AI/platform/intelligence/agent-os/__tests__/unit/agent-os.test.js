// Agent OS unit tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import {
  validateStateTransition,
  getValidTransitions,
  isTerminalState,
  getStateInfo,
  STATES,
} from '../src/state-machine.js';
import {
  sendMessage,
  receiveMessages,
  getConversations,
  getMessageCount,
  clearMessages,
} from '../src/ipc.js';
import {
  recordHeartbeat,
  getAgentHealth,
  getStaleAgents,
  clearHeartbeat,
} from '../src/health-monitor.js';
import {
  getSandboxDir,
  writeSandboxFile,
  readSandboxFile,
  deleteSandbox,
  listSandboxes,
} from '../src/sandbox.js';

// --- HTTP test helpers ---
function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 4892,
      path,
      method,
      headers: {},
    };
    if (body) {
      const json = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(json);
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
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
const BASE = 'http://localhost:4892';

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

  it('should NOT allow idle → paused (invalid)', () => {
    expect(validateStateTransition('idle', 'paused')).toBe(false);
  });

  it('should NOT allow paused → idle (invalid)', () => {
    expect(validateStateTransition('paused', 'idle')).toBe(false);
  });

  it('should NOT allow dead → anything (terminal)', () => {
    expect(validateStateTransition('dead', 'idle')).toBe(false);
    expect(validateStateTransition('dead', 'running')).toBe(false);
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
    expect(getValidTransitions('running')).toContain('dead');
    expect(getValidTransitions('paused')).toContain('running');
    expect(getValidTransitions('stopped')).toEqual(['idle']);
  });

  it('should return state info with description', () => {
    const info = getStateInfo('running');
    expect(info.state).toBe('running');
    expect(info.isTerminal).toBe(false);
    expect(info.description).toBe('Agent is actively executing');
  });

  it('should identify terminal states', () => {
    expect(isTerminalState('dead')).toBe(true);
    expect(isTerminalState('idle')).toBe(false);
    expect(isTerminalState('running')).toBe(false);
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

// --- Sandbox Tests ---
describe('Sandbox', () => {
  const TEST_ID = 'sandbox-test-agent';

  afterAll(() => { deleteSandbox(TEST_ID); });

  it('should create sandbox directory', () => {
    const dir = getSandboxDir(TEST_ID);
    expect(dir).toContain(TEST_ID);
  });

  it('should write and read sandbox files', () => {
    writeSandboxFile(TEST_ID, 'config.json', JSON.stringify({ key: 'value' }));
    const content = readSandboxFile(TEST_ID, 'config.json');
    expect(JSON.parse(content)).toEqual({ key: 'value' });
  });

  it('should return null for missing files', () => {
    expect(readSandboxFile(TEST_ID, 'nonexistent.txt')).toBeNull();
  });

  it('should list sandbox files', () => {
    const files = listSandboxes();
    expect(files).toContain(TEST_ID);
  });
});

// --- HTTP Integration Tests ---
describe('Agent OS HTTP API', () => {
  beforeAll(async () => {
    // Import and start the server
    const mod = await import('../src/index.js');
    server = mod.default;
    // Wait for server to start
    await new Promise(r => setTimeout(r, 200));
  });

  afterAll(() => {
    if (server) server.close();
  });

  // Health
  it('GET /health should return healthy', async () => {
    const res = await httpReq('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /ready should return ready', async () => {
    const res = await httpReq('GET', '/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  // Stats
  it('GET /api/stats should return agent stats', async () => {
    const res = await httpReq('GET', '/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('byState');
  });

  // Agent CRUD
  it('POST /api/agents should create an agent', async () => {
    const res = await httpReq('POST', '/api/agents', { name: 'TestAgent', type: 'chat' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe('TestAgent');
    expect(res.body.type).toBe('chat');
    expect(res.body.state).toBe('idle');
    expect(res.body.sandboxDir).toBeTruthy();
  });

  it('GET /api/agents should list agents', async () => {
    const res = await httpReq('GET', '/api/agents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agents');
    expect(res.body).toHaveProperty('count');
  });

  it('POST /api/agents should return 400 without name', async () => {
    const res = await httpReq('POST', '/api/agents', { type: 'chat' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  // Get created agent
  let createdId;
  it('POST then GET an agent', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'GetTest', type: 'test' });
    createdId = create.body.id;
    const res = await httpReq('GET', `/api/agents/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);
  });

  // Update agent
  it('PUT /api/agents/:id should update agent', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'UpdateTest', type: 'test' });
    const id = create.body.id;
    const res = await httpReq('PUT', `/api/agents/${id}`, { name: 'UpdatedName' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('UpdatedName');
  });

  // Start agent
  it('POST /api/agents/:id/start should start agent', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'StartTest', type: 'test' });
    const id = create.body.id;
    const res = await httpReq('POST', `/api/agents/${id}/start`);
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('running');
    expect(res.body.pid).toBeTruthy();
    // Clean up
    await httpReq('POST', `/api/agents/${id}/stop`);
  });

  // Lifecycle transitions
  it('should transition idle → running → paused → running → stopped → idle', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'LifecycleTest', type: 'test' });
    const id = create.body.id;

    // Start
    await httpReq('POST', `/api/agents/${id}/start`);
    // Pause
    const pause = await httpReq('POST', `/api/agents/${id}/pause`);
    expect(pause.body.state).toBe('paused');
    // Resume
    const resume = await httpReq('POST', `/api/agents/${id}/resume`);
    expect(resume.body.state).toBe('running');
    // Stop
    const stop = await httpReq('POST', `/api/agents/${id}/stop`);
    expect(stop.body.state).toBe('stopped');
  });

  it('should return 400 for invalid transition', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'InvalidTrans', type: 'test' });
    const id = create.body.id;
    // Cannot pause from idle
    const res = await httpReq('POST', `/api/agents/${id}/pause`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid transition');
  });

  // Execute
  it('POST /api/agents/:id/execute should run task', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'ExecTest', type: 'test' });
    const id = create.body.id;
    await httpReq('POST', `/api/agents/${id}/start`);

    const res = await httpReq('POST', `/api/agents/${id}/execute`, { task: 'do something', input: {} });
    expect(res.status).toBe(200);
    expect(res.body.executionId).toBeTruthy();
    expect(res.body.agentId).toBe(id);
    expect(res.body.status).toBe('success');

    await httpReq('POST', `/api/agents/${id}/stop`);
  });

  it('POST /api/agents/:id/execute should return 400 if not running', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'ExecIdle', type: 'test' });
    const id = create.body.id;
    const res = await httpReq('POST', `/api/agents/${id}/execute`, { task: 'do something' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('idle');
  });

  // Health
  it('GET /api/agents/:id/health should return health info', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'HealthTest', type: 'test' });
    const id = create.body.id;
    const res = await httpReq('GET', `/api/agents/${id}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agentId');
    expect(res.body).toHaveProperty('state');
    expect(res.body).toHaveProperty('isAlive');
  });

  it('GET /api/agents/:id/heartbeat should record heartbeat', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'BeatTest', type: 'test' });
    const id = create.body.id;
    const res = await httpReq('GET', `/api/agents/${id}/heartbeat`);
    expect(res.status).toBe(200);
    expect(res.body.heartbeat).toBeTruthy();
  });

  // IPC
  it('POST /api/ipc/send should send a message', async () => {
    const res = await httpReq('POST', '/api/ipc/send', { from: 'a1', to: 'a2', message: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.message).toBe('hi');
  });

  it('GET /api/ipc/inbox/:agentId should return messages', async () => {
    await httpReq('POST', '/api/ipc/send', { from: 'x', to: 'inbox-test', message: 'inbox msg' });
    const res = await httpReq('GET', '/api/ipc/inbox/inbox-test');
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/ipc/conversations/:agentId should return conversations', async () => {
    const res = await httpReq('GET', '/api/ipc/conversations/test-agent');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('conversations');
  });

  // Sandbox
  it('GET /api/agents/:id/sandbox should return sandbox dir', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'SandboxTest', type: 'test' });
    const id = create.body.id;
    const res = await httpReq('GET', `/api/agents/${id}/sandbox`);
    expect(res.status).toBe(200);
    expect(res.body.sandboxDir).toBeTruthy();
  });

  // Delete
  it('DELETE /api/agents/:id should delete agent', async () => {
    const create = await httpReq('POST', '/api/agents', { name: 'DeleteTest', type: 'test' });
    const id = create.body.id;
    const res = await httpReq('DELETE', `/api/agents/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    // Verify gone
    const get = await httpReq('GET', `/api/agents/${id}`);
    expect(get.status).toBe(404);
  });

  it('GET /api/agents/:id should return 404 for unknown agent', async () => {
    const res = await httpReq('GET', '/api/agents/unknown-id-12345');
    expect(res.status).toBe(404);
  });
});