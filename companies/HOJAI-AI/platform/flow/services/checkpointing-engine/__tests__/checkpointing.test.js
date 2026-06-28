/**
 * Checkpointing Engine Tests
 * Port: 5376
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

process.env.PORT = '5376';
process.env.CHECKPOINT_DATA_DIR = path.join(__dirname, '../test-data');

const BASE_URL = 'http://localhost:5376';
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

async function waitForServer() {
  for (let i = 0; i < 20; i++) {
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
    env: { ...process.env, PORT: '5376' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const ready = await waitForServer();
  if (!ready) throw new Error('Server failed to start');
});

after(() => { if (server) server.kill(); });

const SAMPLE_STATE = {
  step: 3,
  context: { userId: 'user123', orderId: 'order456' },
  results: { step1: 'done', step2: 'done' }
};

describe('Checkpointing Engine - Health', () => {
  it('should return healthy status', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.service, 'checkpointing-engine');
  });
});

describe('Checkpointing Engine - Create Checkpoint', () => {
  it('should create a checkpoint', async () => {
    const res = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-001',
      stepIndex: 1,
      stepId: 'step_1',
      state: SAMPLE_STATE
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.checkpoint);
    assert.strictEqual(res.data.checkpoint.workflowId, 'wf-001');
    assert.ok(res.data.checkpoint.stateChecksum);
  });

  it('should require workflowId and state', async () => {
    const res = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-001'
    });

    assert.strictEqual(res.status, 400);
  });

  it('should set previous checkpoint', async () => {
    // Create first checkpoint
    const cp1 = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-chain',
      stepIndex: 1,
      state: { step: 1 }
    });

    // Create second checkpoint
    const cp2 = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-chain',
      stepIndex: 2,
      state: { step: 2 }
    });

    // Second should reference first
    assert.ok(cp2.data.checkpoint.previousCheckpointId);
  });
});

describe('Checkpointing Engine - Get Checkpoints', () => {
  it('should get all checkpoints for workflow', async () => {
    const res = await request('/api/checkpoints/workflow/wf-list');

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.checkpoints));
    assert.ok(res.data.stats);
  });

  it('should get latest checkpoint', async () => {
    // Create a checkpoint
    await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-latest',
      stepIndex: 5,
      state: { step: 5 }
    });

    const res = await request('/api/checkpoints/workflow/wf-latest/latest');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.checkpoint);
    assert.strictEqual(res.data.checkpoint.stepIndex, 5);
  });

  it('should return 404 for non-existent', async () => {
    const res = await request('/api/checkpoints/workflow/nonexistent/latest');
    assert.strictEqual(res.status, 404);
  });

  it('should get checkpoint by ID', async () => {
    const createRes = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-get',
      state: { data: 'test' }
    });

    const getRes = await request(`/api/checkpoints/${createRes.data.checkpoint.id}`);

    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.checkpoint.id, createRes.data.checkpoint.id);
  });
});

describe('Checkpointing Engine - Restore', () => {
  it('should restore from checkpoint', async () => {
    const createRes = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-restore',
      stepIndex: 3,
      stepId: 'step_3',
      state: { step: 3, data: 'restore-test' }
    });

    const restoreRes = await request(`/api/checkpoints/${createRes.data.checkpoint.id}/restore`);

    assert.strictEqual(restoreRes.status, 200);
    assert.ok(restoreRes.data.state);
    assert.strictEqual(restoreRes.data.state.step, 3);
    assert.strictEqual(restoreRes.data.state.data, 'restore-test');
  });

  it('should include step info in restore', async () => {
    const createRes = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-restore-step',
      stepIndex: 7,
      stepId: 'validate_order',
      state: { step: 7 }
    });

    const restoreRes = await request(`/api/checkpoints/${createRes.data.checkpoint.id}/restore`);

    assert.strictEqual(restoreRes.data.stepIndex, 7);
    assert.strictEqual(restoreRes.data.stepId, 'validate_order');
  });
});

describe('Checkpointing Engine - Verify', () => {
  it('should verify valid checkpoint', async () => {
    const createRes = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-verify',
      state: { data: 'verify-test' }
    });

    const verifyRes = await request(`/api/checkpoints/${createRes.data.checkpoint.id}/verify`);

    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.valid, true);
  });
});

describe('Checkpointing Engine - Incremental', () => {
  it('should create incremental checkpoint', async () => {
    const res = await request('/api/checkpoints/incremental', 'POST', {
      workflowId: 'wf-inc',
      previousState: { step: 1, data: 'same' },
      currentState: { step: 2, data: 'same' }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.checkpoint.type, 'incremental');
  });
});

describe('Checkpointing Engine - Stats', () => {
  it('should get workflow stats', async () => {
    // Create checkpoints
    await request('/api/checkpoints', 'POST', { workflowId: 'wf-stats', state: { s: 1 } });
    await request('/api/checkpoints', 'POST', { workflowId: 'wf-stats', state: { s: 2 } });

    const res = await request('/api/checkpoints/workflow/wf-stats/stats');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.stats.total >= 2);
    assert.ok(res.data.stats.byType);
  });
});

describe('Checkpointing Engine - Compare', () => {
  it('should compare two checkpoints', async () => {
    const cp1Res = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-compare',
      stepIndex: 1,
      state: { step: 1, value: 'old' }
    });

    const cp2Res = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-compare',
      stepIndex: 2,
      state: { step: 2, value: 'new' }
    });

    const compareRes = await request('/api/checkpoints/compare', 'POST', {
      checkpointId1: cp1Res.data.checkpoint.id,
      checkpointId2: cp2Res.data.checkpoint.id
    });

    assert.strictEqual(compareRes.status, 200);
    assert.ok(compareRes.data.stepDiff === 1);
  });
});

describe('Checkpointing Engine - Delete', () => {
  it('should delete checkpoint', async () => {
    const createRes = await request('/api/checkpoints', 'POST', {
      workflowId: 'wf-delete',
      state: { toDelete: true }
    });

    const deleteRes = await request(`/api/checkpoints/${createRes.data.checkpoint.id}`, 'DELETE');

    assert.strictEqual(deleteRes.status, 200);

    // Verify deleted
    const getRes = await request(`/api/checkpoints/${createRes.data.checkpoint.id}`);
    // Checkpoint should be marked as discarded
    assert.strictEqual(getRes.data.checkpoint.status, 'discarded');
  });
});
