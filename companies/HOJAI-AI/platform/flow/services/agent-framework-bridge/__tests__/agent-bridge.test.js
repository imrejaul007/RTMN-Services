/**
 * Agent Framework Bridge Tests
 * Port: 5375
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

process.env.PORT = '5375';

const BASE_URL = 'http://localhost:5375';
let server = null;

async function request(p, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(p, BASE_URL);
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname, method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', () => resolve({ status: 503, data: {} }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitForServer(maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await request('/health');
      if (res.status === 200) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

before(async () => {
  server = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '5375' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const ready = await waitForServer();
  if (!ready) throw new Error('Server failed to start');
});

after(() => { if (server) server.kill(); });

const SAMPLE_WORKFLOW = {
  nodes: [
    { id: 'start', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
    { id: 'research', type: 'service_task', position: { x: 100, y: 0 }, data: { label: 'Research Agent', role: 'Researcher' } },
    { id: 'write', type: 'service_task', position: { x: 200, y: 0 }, data: { label: 'Writer Agent', role: 'Writer' } },
    { id: 'review', type: 'human_task', position: { x: 300, y: 0 }, data: { label: 'Review' } },
    { id: 'end', type: 'terminal', position: { x: 400, y: 0 }, data: { label: 'End' } }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'research' },
    { id: 'e2', source: 'research', target: 'write' },
    { id: 'e3', source: 'write', target: 'review' },
    { id: 'e4', source: 'review', target: 'end' }
  ]
};

describe('Agent Framework Bridge - Health', () => {
  it('should return healthy status', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.service, 'agent-framework-bridge');
  });
});

describe('Agent Framework Bridge - Frameworks', () => {
  it('should list supported frameworks', async () => {
    const res = await request('/api/frameworks');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.frameworks.includes('langgraph'));
    assert.ok(res.data.frameworks.includes('crewai'));
    assert.ok(res.data.frameworks.includes('autogen'));
  });

  it('should list agent types', async () => {
    const res = await request('/api/frameworks');
    assert.ok(Array.isArray(res.data.agentTypes));
    assert.ok(res.data.agentTypes.includes('react'));
  });
});

describe('Agent Framework Bridge - Convert to Framework', () => {
  it('should convert to LangGraph', async () => {
    const res = await request('/api/convert/langgraph', 'POST', { workflow: SAMPLE_WORKFLOW });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.framework, 'langgraph');
    assert.ok(res.data.result.nodes);
    assert.ok(res.data.result.edges);
  });

  it('should convert to CrewAI', async () => {
    const res = await request('/api/convert/crewai', 'POST', { workflow: SAMPLE_WORKFLOW });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.framework, 'crewai');
    assert.ok(Array.isArray(res.data.result.agents));
    assert.ok(Array.isArray(res.data.result.tasks));
  });

  it('should convert to AutoGen', async () => {
    const res = await request('/api/convert/autogen', 'POST', { workflow: SAMPLE_WORKFLOW });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.framework, 'autogen');
    assert.ok(Array.isArray(res.data.result.agents));
    assert.ok(res.data.result.group_chat);
  });

  it('should reject invalid framework', async () => {
    const res = await request('/api/convert/invalid', 'POST', { workflow: SAMPLE_WORKFLOW });
    assert.strictEqual(res.status, 400);
  });

  it('should require workflow', async () => {
    const res = await request('/api/convert/langgraph', 'POST', {});
    assert.strictEqual(res.status, 400);
  });
});

describe('Agent Framework Bridge - Import from Framework', () => {
  it('should import from LangGraph', async () => {
    const langGraphDef = {
      nodes: { agent1: { name: 'Agent 1', type: 'TOOL_CALLER', config: {} } },
      edges: [],
      state: { messages: [] }
    };
    const res = await request('/api/import', 'POST', { definition: langGraphDef, framework: 'langgraph' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.detectedFramework);
    assert.ok(res.data.workflow.nodes);
  });

  it('should import from CrewAI', async () => {
    const crewDef = {
      agents: [
        { role: 'Researcher', goal: 'Research topics', backstory: 'Expert researcher' }
      ],
      tasks: [
        { description: 'Research task', expected_output: 'Research results' }
      ]
    };
    const res = await request('/api/import', 'POST', { definition: crewDef, framework: 'crewai' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.workflow.nodes);
  });

  it('should auto-detect framework', async () => {
    const crewDef = { agents: [], tasks: [] };
    const res = await request('/api/import', 'POST', { definition: crewDef });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.detectedFramework, 'crewai');
  });
});

describe('Agent Framework Bridge - Code Generation', () => {
  it('should generate LangGraph code', async () => {
    const res = await request('/api/generate/langgraph', 'POST', { workflow: SAMPLE_WORKFLOW });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.code.includes('langgraph'));
    assert.ok(res.data.code.includes('StateGraph'));
  });

  it('should generate CrewAI code', async () => {
    const res = await request('/api/generate/crewai', 'POST', { workflow: SAMPLE_WORKFLOW });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.code.includes('crewai'));
    assert.ok(res.data.code.includes('Agent'));
  });

  it('should generate AutoGen code', async () => {
    const res = await request('/api/generate/autogen', 'POST', { workflow: SAMPLE_WORKFLOW });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.code.includes('autogen'));
    assert.ok(res.data.code.includes('ConversableAgent'));
  });
});

describe('Agent Framework Bridge - Detection', () => {
  it('should detect LangGraph', async () => {
    const res = await request('/api/detect', 'POST', { definition: { nodes: {}, edges: [], state: {} } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.detected, 'langgraph');
  });

  it('should detect CrewAI', async () => {
    const res = await request('/api/detect', 'POST', { definition: { agents: [], tasks: [] } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.detected, 'crewai');
  });

  it('should detect AutoGen', async () => {
    const res = await request('/api/detect', 'POST', { definition: { agents: [], group_chat: {} } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.detected, 'autogen');
  });

  it('should return null for unknown', async () => {
    const res = await request('/api/detect', 'POST', { definition: { unknown: true } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.detected, null);
  });
});
