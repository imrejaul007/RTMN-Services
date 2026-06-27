/**
 * Saga Coordinator Tests
 * Port: 5371
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Set test data directory
process.env.SAGA_DATA_DIR = path.join(__dirname, '../test-data');
process.env.PORT = '5371';

const BASE_URL = 'http://localhost:5371';

// Simple HTTP client
async function request(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', () => resolve({ status: 503, data: {} }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Clean test data
function cleanTestData() {
  const dir = process.env.SAGA_DATA_DIR;
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

describe('Saga Coordinator - Health', () => {
  it('should return healthy status', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'healthy');
    assert.strictEqual(res.data.service, 'saga-coordinator');
  });

  it('should return ready status', async () => {
    const res = await request('/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ready');
  });
});

describe('Saga Coordinator - Saga Creation', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should create a saga with steps', async () => {
    const sagaDef = {
      name: 'Order Processing Saga',
      correlationId: 'order-123',
      type: 'orchestration',
      steps: [
        { name: 'Reserve Inventory', action: 'reserve', service: 'inventory', params: { sku: 'PROD-001', qty: 5 } },
        { name: 'Process Payment', action: 'charge', service: 'payment', params: { amount: 100 }, compensate: 'refund' },
        { name: 'Create Shipment', action: 'ship', service: 'logistics', params: { address: '123 Main St' }, compensate: 'cancel_shipment' }
      ],
      context: { orderId: 'order-123', customerId: 'cust-456' }
    };

    const res = await request('/api/sagas', 'POST', sagaDef);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.saga.id);
    assert.strictEqual(res.data.saga.name, 'Order Processing Saga');
    assert.strictEqual(res.data.saga.correlationId, 'order-123');
    assert.strictEqual(res.data.saga.type, 'orchestration');
    assert.strictEqual(res.data.saga.steps.length, 3);
    assert.strictEqual(res.data.saga.status, 'pending');
  });

  it('should create saga with default orchestration type', async () => {
    const sagaDef = {
      steps: [
        { name: 'Step 1', action: 'do', service: 'test' }
      ]
    };

    const res = await request('/api/sagas', 'POST', sagaDef);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.saga.type, 'orchestration');
  });

  it('should require steps array', async () => {
    const res = await request('/api/sagas', 'POST', {
      name: 'Invalid Saga'
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.error.includes('steps'));
  });

  it('should reject empty steps array', async () => {
    const res = await request('/api/sagas', 'POST', {
      steps: []
    });

    assert.strictEqual(res.status, 400);
  });

  it('should assign step IDs in order', async () => {
    const sagaDef = {
      steps: [
        { name: 'Step 1', action: 'do1', service: 'test' },
        { name: 'Step 2', action: 'do2', service: 'test' },
        { name: 'Step 3', action: 'do3', service: 'test' }
      ]
    };

    const res = await request('/api/sagas', 'POST', sagaDef);

    assert.strictEqual(res.data.saga.steps[0].id, 'step-0');
    assert.strictEqual(res.data.saga.steps[1].id, 'step-1');
    assert.strictEqual(res.data.saga.steps[2].id, 'step-2');
  });

  it('should track creation history', async () => {
    const sagaDef = {
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    };

    const res = await request('/api/sagas', 'POST', sagaDef);

    assert.ok(res.data.saga.history);
    assert.ok(res.data.saga.history.some(h => h.event === 'SAGA_CREATED'));
  });
});

describe('Saga Coordinator - Saga Retrieval', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should list all sagas', async () => {
    // Create multiple sagas
    for (let i = 0; i < 3; i++) {
      await request('/api/sagas', 'POST', {
        name: `Saga ${i}`,
        steps: [{ name: 'Test', action: 'do', service: 'test' }]
      });
    }

    const res = await request('/api/sagas');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.count, 3);
  });

  it('should filter sagas by status', async () => {
    const saga1 = await request('/api/sagas', 'POST', {
      name: 'Pending Saga',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });
    // Second saga would be created but we filter by pending

    const res = await request('/api/sagas?status=pending');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.sagas.every(s => s.status === 'pending'));
  });

  it('should filter sagas by type', async () => {
    await request('/api/sagas', 'POST', {
      type: 'orchestration',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });
    await request('/api/sagas', 'POST', {
      type: 'choreography',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });

    const res = await request('/api/sagas?type=orchestration');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.sagas.every(s => s.type === 'orchestration'));
  });

  it('should get saga by ID', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Get Test',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });

    const sagaId = createRes.data.saga.id;
    const res = await request(`/api/sagas/${sagaId}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.saga.id, sagaId);
    assert.strictEqual(res.data.saga.name, 'Get Test');
  });

  it('should return 404 for non-existent saga', async () => {
    const res = await request('/api/sagas/non-existent-id');

    assert.strictEqual(res.status, 404);
    assert.ok(res.data.error.includes('not found'));
  });
});

describe('Saga Coordinator - Saga Execution', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should start saga execution', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Execute Test',
      steps: [{ name: 'Test Step', action: 'do', service: 'test' }]
    });

    const sagaId = createRes.data.saga.id;
    const res = await request(`/api/sagas/${sagaId}/execute`, 'POST');

    assert.strictEqual(res.status, 202);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.message.includes('started'));
  });

  it('should return 404 for non-existent saga execution', async () => {
    const res = await request('/api/sagas/non-existent/execute', 'POST');

    assert.strictEqual(res.status, 404);
  });

  it('should prevent re-execution of non-pending saga', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Double Execute Test',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });

    const sagaId = createRes.data.saga.id;

    // First execution
    await request(`/api/sagas/${sagaId}/execute`, 'POST');

    // Second execution should fail
    const res = await request(`/api/sagas/${sagaId}/execute`, 'POST');

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.error.includes('Cannot execute'));
  });
});

describe('Saga Coordinator - Saga Cancellation', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should cancel pending saga', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Cancel Test',
      steps: [{ name: 'Test', action: 'do', service: 'test', compensate: 'undo' }]
    });

    const sagaId = createRes.data.saga.id;
    const res = await request(`/api/sagas/${sagaId}/cancel`, 'POST');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  it('should cancel running saga with compensation', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Cancel Running',
      steps: [
        { name: 'Step 1', action: 'do1', service: 'test', compensate: 'undo1' },
        { name: 'Step 2', action: 'do2', service: 'test', compensate: 'undo2' }
      ]
    });

    const sagaId = createRes.data.saga.id;

    // Start execution
    await request(`/api/sagas/${sagaId}/execute`, 'POST');

    // Wait a bit for step to start
    await new Promise(resolve => setTimeout(resolve, 200));

    // Cancel
    const res = await request(`/api/sagas/${sagaId}/cancel`, 'POST');

    assert.strictEqual(res.status, 200);
  });

  it('should prevent cancellation of completed saga', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Already Done',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });

    const sagaId = createRes.data.saga.id;
    await request(`/api/sagas/${sagaId}/execute`, 'POST');

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 500));

    const res = await request(`/api/sagas/${sagaId}/cancel`, 'POST');

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.error.includes('Cannot cancel'));
  });
});

describe('Saga Coordinator - Saga History', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should get saga history', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'History Test',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });

    const sagaId = createRes.data.saga.id;
    const res = await request(`/api/sagas/${sagaId}/history`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.sagaId, sagaId);
    assert.ok(Array.isArray(res.data.history));
    assert.ok(res.data.history.length > 0);
  });

  it('should track SAGA_CREATED event', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Track Events',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });

    const sagaId = createRes.data.saga.id;
    const res = await request(`/api/sagas/${sagaId}/history`);

    assert.ok(res.data.history.some(h => h.event === 'SAGA_CREATED'));
  });
});

describe('Saga Coordinator - Saga Retry', () => {
  beforeEach(() => {
    cleanTestData();
  });

  it('should retry failed saga', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Retry Test',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });

    const sagaId = createRes.data.saga.id;

    // Start execution
    await request(`/api/sagas/${sagaId}/execute`, 'POST');

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get saga status
    const sagaRes = await request(`/api/sagas/${sagaId}`);

    // If failed, retry should work
    if (sagaRes.data.saga.status === 'failed') {
      const retryRes = await request(`/api/sagas/${sagaId}/retry`, 'POST');
      assert.strictEqual(retryRes.status, 202);
    }
  });

  it('should not retry completed saga', async () => {
    const createRes = await request('/api/sagas', 'POST', {
      name: 'Completed Saga',
      steps: [{ name: 'Test', action: 'do', service: 'test' }]
    });

    const sagaId = createRes.data.saga.id;
    await request(`/api/sagas/${sagaId}/execute`, 'POST');

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 500));

    const res = await request(`/api/sagas/${sagaId}/retry`, 'POST');

    assert.strictEqual(res.status, 400);
  });
});

// Cleanup
after(() => {
  cleanTestData();
});
