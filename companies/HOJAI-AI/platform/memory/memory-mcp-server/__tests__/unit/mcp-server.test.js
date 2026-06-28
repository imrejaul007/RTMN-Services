/**
 * Memory MCP Server Unit Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.MCP_PORT = '4890';

await import('../../src/index.js');
const { default: app } = await import('../../src/index.js');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

function url(path) { return baseUrl + path; }

describe('Memory MCP Server — Health', () => {
  it('GET /health → 200', async () => {
    const r = await fetch(url('/health'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.status, 'healthy');
    assert.equal(j.service, 'memory-mcp-server');
  });
});

describe('Memory MCP Server — Tools List', () => {
  it('POST /api/mcp/tools/list → returns tools', async () => {
    const r = await fetch(url('/api/mcp/tools/list'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-1' }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.jsonrpc, '2.0');
    assert.ok(Array.isArray(j.result.tools));
    assert.ok(j.result.tools.length > 0);
  });
});

describe('Memory MCP Server — Tool Execution', () => {
  it('POST /api/mcp/tools/execute memory_store → success', async () => {
    const r = await fetch(url('/api/mcp/tools/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-2',
        name: 'memory_store',
        arguments: {
          twinId: 'user-123',
          content: 'Test memory from MCP',
          type: 'knowledge'
        }
      }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.jsonrpc, '2.0');
    assert.ok(j.result.success);
    assert.ok(j.result.memoryId);
  });

  it('POST /api/mcp/tools/execute memory_search → returns results', async () => {
    // First store a memory
    await fetch(url('/api/mcp/tools/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'memory_store',
        arguments: { twinId: 'user-search', content: 'Searchable content' }
      }),
    });

    // Then search
    const r = await fetch(url('/api/mcp/tools/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'memory_search',
        arguments: { twinId: 'user-search', query: 'Searchable' }
      }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.jsonrpc, '2.0');
    assert.ok(Array.isArray(j.result.results));
  });

  it('POST /api/mcp/tools/execute memory_context → returns context', async () => {
    const r = await fetch(url('/api/mcp/tools/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'memory_context',
        arguments: { twinId: 'user-456' }
      }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.jsonrpc, '2.0');
    assert.ok(j.result);
  });

  it('POST /api/mcp/tools/execute unknown tool → error', async () => {
    const r = await fetch(url('/api/mcp/tools/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-3',
        name: 'unknown_tool',
        arguments: {}
      }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.jsonrpc, '2.0');
    assert.ok(j.error);
    assert.equal(j.error.code, -32601);
  });

  it('POST /api/mcp/tools/execute without name → error', async () => {
    const r = await fetch(url('/api/mcp/tools/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-4' }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.jsonrpc, '2.0');
    assert.ok(j.error);
    assert.equal(j.error.code, -32600);
  });
});

describe('Memory MCP Server — Resources', () => {
  it('GET /api/mcp/resources/memory/:twinId → returns memories', async () => {
    const r = await fetch(url('/api/mcp/resources/memory/user-resource-test'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.twinId, 'user-resource-test');
    assert.ok(Array.isArray(j.memories));
  });

  it('GET /api/mcp/resources/context/:scope/:id → returns context', async () => {
    const r = await fetch(url('/api/mcp/resources/context/department/engineering'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.scope, 'department');
    assert.equal(j.id, 'engineering');
  });
});

describe('Memory MCP Server — Knowledge Tools', () => {
  it('POST knowledge_link → creates link', async () => {
    const r = await fetch(url('/api/mcp/tools/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'knowledge_link',
        arguments: { from: 'entity-a', to: 'entity-b', relationship: 'related_to' }
      }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.result.success);
  });

  it('POST knowledge_query → returns graph', async () => {
    const r = await fetch(url('/api/mcp/tools/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'knowledge_query',
        arguments: { entity: 'entity-a', depth: 2 }
      }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.jsonrpc, '2.0');
  });
});

describe('Memory MCP Server — Batch Execution', () => {
  it('POST /api/mcp/tools/batch → executes multiple tools', async () => {
    const r = await fetch(url('/api/mcp/tools/batch'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'batch-1',
        calls: [
          { id: 'call-1', name: 'memory_store', arguments: { twinId: 'batch-user', content: 'Batch memory 1' } },
          { id: 'call-2', name: 'memory_store', arguments: { twinId: 'batch-user', content: 'Batch memory 2' } }
        ]
      }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.jsonrpc, '2.0');
    assert.ok(Array.isArray(j.result.results));
    assert.equal(j.result.results.length, 2);
  });
});

after(() => { server?.close(); });
