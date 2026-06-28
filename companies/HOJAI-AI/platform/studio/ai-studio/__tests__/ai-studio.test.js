import { describe, it, expect, beforeEach } from 'vitest';
import { APP } from '../src/index.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

function resetData() {
  for (const f of ['workflows.json', 'workflow_versions.json', 'executions.json']) {
    const p = path.join(DATA_DIR, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const server = APP.listen(0, () => {
      const { port } = server.address();
      const options = { hostname: 'localhost', port, path: reqPath, method, headers: {} };
      if (body) options.headers['Content-Type'] = 'application/json';
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('ai-studio API', () => {
  beforeEach(() => { resetData(); });

  it('GET /health returns ok', async () => {
    const res = await request('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/workflows creates workflow', async () => {
    const wf = {
      name: 'Test Workflow',
      description: 'A test',
      nodes: [
        { id: 'n1', type: 'trigger', data: { event: 'manual' }, position: { x: 0, y: 0 } },
        { id: 'n2', type: 'output', data: { format: 'json' }, position: { x: 100, y: 0 } }
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }]
    };
    const res = await request('POST', '/api/workflows', wf);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Test Workflow');
    expect(res.body.version).toBe('1.0.0');
  });

  it('GET /api/workflows lists workflows', async () => {
    await request('POST', '/api/workflows', { name: 'WF1', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] });
    const res = await request('GET', '/api/workflows');
    expect(res.status).toBe(200);
    expect(res.body.workflows.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/workflows/:id returns workflow', async () => {
    const created = await request('POST', '/api/workflows', { name: 'Get Test', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] });
    const res = await request('GET', `/api/workflows/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Get Test');
  });

  it('GET /api/workflows/:id returns 404 for unknown id', async () => {
    const res = await request('GET', '/api/workflows/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('PUT /api/workflows/:id updates workflow', async () => {
    const created = await request('POST', '/api/workflows', { name: 'Old Name', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] });
    const res = await request('PUT', `/api/workflows/${created.body.id}`, { name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('DELETE /api/workflows/:id deletes workflow', async () => {
    const created = await request('POST', '/api/workflows', { name: 'Delete Me', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] });
    const res = await request('DELETE', `/api/workflows/${created.body.id}`);
    expect(res.status).toBe(200);
  });

  it('POST /api/workflows/:id/execute runs workflow', async () => {
    const created = await request('POST', '/api/workflows', {
      name: 'Exec Test',
      nodes: [
        { id: 'n1', type: 'trigger', data: { event: 'manual' } },
        { id: 'n2', type: 'output', data: { format: 'json' } }
      ],
      edges: [{ source: 'n1', target: 'n2' }]
    });
    const res = await request('POST', `/api/workflows/${created.body.id}/execute`);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('completed');
    expect(res.body.totalSteps).toBe(2);
  });

  it('GET /api/executions/:id returns execution', async () => {
    const created = await request('POST', '/api/workflows', { name: 'Ex', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] });
    const exec = await request('POST', `/api/workflows/${created.body.id}/execute`);
    const res = await request('GET', `/api/executions/${exec.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(exec.body.id);
  });

  it('GET /api/executions/:id returns 404 for unknown', async () => {
    const res = await request('GET', '/api/executions/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('POST /api/validate returns no errors for valid workflow', async () => {
    const wf = { name: 'Valid', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] };
    const res = await request('POST', '/api/validate', { workflow: wf });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.errors).toHaveLength(0);
  });

  it('POST /api/validate catches missing trigger', async () => {
    const wf = { name: 'No Trigger', nodes: [{ id: 'n1', type: 'output', data: { format: 'json' } }], edges: [] };
    const res = await request('POST', '/api/validate', { workflow: wf });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.some(e => e.includes('trigger'))).toBe(true);
  });

  it('POST /api/validate catches missing output', async () => {
    const wf = { name: 'No Output', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }], edges: [] };
    const res = await request('POST', '/api/validate', { workflow: wf });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.some(e => e.includes('output'))).toBe(true);
  });

  it('POST /api/validate catches duplicate node id', async () => {
    const wf = { name: 'Dup', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n1', type: 'output', data: { format: 'json' } }], edges: [] };
    const res = await request('POST', '/api/validate', { workflow: wf });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  it('POST /api/validate catches unknown node type', async () => {
    const wf = { name: 'Bad Type', nodes: [{ id: 'n1', type: 'unknown-type', data: {} }, { id: 'n2', type: 'trigger', data: { event: 'manual' } }, { id: 'n3', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n2', target: 'n3' }] };
    const res = await request('POST', '/api/validate', { workflow: wf });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.some(e => e.includes('invalid node type'))).toBe(true);
  });

  it('GET /api/workflows/:id/export exports as JSON', async () => {
    const created = await request('POST', '/api/workflows', { name: 'Export Test', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] });
    const res = await request('GET', `/api/workflows/${created.body.id}/export?format=json`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Export Test');
  });

  it('GET /api/workflows/:id/export exports as JS code', async () => {
    const created = await request('POST', '/api/workflows', { name: 'Code Export', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] });
    const res = await request('GET', `/api/workflows/${created.body.id}/export?format=code`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('Code Export');
    expect(res.body).toContain('WorkflowExecutor');
  });

  it('GET /api/workflows/:id/history returns executions', async () => {
    const created = await request('POST', '/api/workflows', { name: 'Hist', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }] });
    await request('POST', `/api/workflows/${created.body.id}/execute`);
    const res = await request('GET', `/api/workflows/${created.body.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.executions.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/workflows without name returns 400', async () => {
    const res = await request('POST', '/api/workflows', { nodes: [] });
    expect(res.status).toBe(400);
  });

  it('llm-call node executes correctly', async () => {
    const wf = { name: 'LLM Test', nodes: [{ id: 'n1', type: 'trigger', data: { event: 'manual' } }, { id: 'n2', type: 'llm-call', data: { model: 'claude-3-5-sonnet', prompt: 'Hello' } }, { id: 'n3', type: 'output', data: { format: 'json' } }], edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }] };
    const created = await request('POST', '/api/workflows', wf);
    const res = await request('POST', `/api/workflows/${created.body.id}/execute`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('completed');
    expect(res.body.results.n2.type).toBe('llm-call');
    expect(res.body.results.n2.simulated).toBe(true);
  });
});
