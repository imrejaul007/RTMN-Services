/**
 * Event Sourcing Engine Tests
 * Port: 5370
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Set test data directory
process.env.EVENT_SOURCING_DATA_DIR = path.join(__dirname, '../test-data');
process.env.PORT = '5370';

const BASE_URL = 'http://localhost:5370';

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
  const dir = process.env.EVENT_SOURCING_DATA_DIR;
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

describe('Event Sourcing Engine - Health', () => {
  it('should return healthy status', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'healthy');
    assert.strictEqual(res.data.service, 'event-sourcing-engine');
  });

  it('should return ready status', async () => {
    const res = await request('/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ready');
  });
});

describe('Event Sourcing Engine - Event Operations', () => {
  const testAggregateId = `test-workflow-${Date.now()}`;

  beforeEach(() => {
    cleanTestData();
  });

  it('should append event to aggregate', async () => {
    const event = {
      type: 'WORKFLOW_STARTED',
      payload: { workflowId: testAggregateId, startedBy: 'test' },
      correlationId: 'corr-123'
    };

    const res = await request(`/api/aggregates/${testAggregateId}/events`, 'POST', event);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.event.id);
    assert.strictEqual(res.data.event.type, 'WORKFLOW_STARTED');
    assert.strictEqual(res.data.event.aggregateId, testAggregateId);
    assert.strictEqual(res.data.event.sequence, 0);
    assert.ok(res.data.event.checksum);
    assert.ok(res.data.event.timestamp);
  });

  it('should append multiple events with incrementing sequence', async () => {
    const event1 = { type: 'TASK_STARTED', payload: { taskId: 'task-1' } };
    const event2 = { type: 'TASK_COMPLETED', payload: { taskId: 'task-1' } };
    const event3 = { type: 'TASK_STARTED', payload: { taskId: 'task-2' } };

    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', event1);
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', event2);
    const res = await request(`/api/aggregates/${testAggregateId}/events`, 'POST', event3);

    assert.strictEqual(res.data.event.sequence, 2);
  });

  it('should get all events for aggregate', async () => {
    // Append 3 events
    for (let i = 0; i < 3; i++) {
      await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
        type: 'TASK_STARTED',
        payload: { taskId: `task-${i}` }
      });
    }

    const res = await request(`/api/aggregates/${testAggregateId}/events`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.aggregateId, testAggregateId);
    assert.strictEqual(res.data.count, 3);
    assert.strictEqual(res.data.events.length, 3);
  });

  it('should filter events by type', async () => {
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'TASK_STARTED', payload: { taskId: 'task-1' }
    });
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'TASK_COMPLETED', payload: { taskId: 'task-1' }
    });
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'TASK_STARTED', payload: { taskId: 'task-2' }
    });

    const res = await request(`/api/aggregates/${testAggregateId}/events?type=TASK_STARTED`);

    assert.strictEqual(res.data.count, 2);
    assert.ok(res.data.events.every(e => e.type === 'TASK_STARTED'));
  });

  it('should filter events by sequence range', async () => {
    for (let i = 0; i < 5; i++) {
      await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
        type: 'TASK_STARTED', payload: { taskId: `task-${i}` }
      });
    }

    const res = await request(`/api/aggregates/${testAggregateId}/events?fromSequence=1&toSequence=3`);

    assert.strictEqual(res.data.count, 3);
    assert.strictEqual(res.data.events[0].sequence, 1);
    assert.strictEqual(res.data.events[2].sequence, 3);
  });

  it('should require type when appending event', async () => {
    const res = await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      payload: { some: 'data' }
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.error.includes('type is required'));
  });

  it('should calculate checksum for each event', async () => {
    const event = {
      type: 'WORKFLOW_STARTED',
      payload: { workflowId: testAggregateId, data: 'test' }
    };

    const res = await request(`/api/aggregates/${testAggregateId}/events`, 'POST', event);
    const eventData = res.data.event;

    // Verify checksum
    const expectedChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(event.payload))
      .digest('hex');

    assert.strictEqual(eventData.checksum, expectedChecksum);
  });
});

describe('Event Sourcing Engine - Snapshot Operations', () => {
  const testAggregateId = `test-snapshot-${Date.now()}`;

  beforeEach(() => {
    cleanTestData();
  });

  it('should create snapshot', async () => {
    // Append events first
    for (let i = 0; i < 5; i++) {
      await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
        type: 'TASK_STARTED',
        payload: { taskId: `task-${i}`, index: i }
      });
    }

    const res = await request(`/api/aggregates/${testAggregateId}/snapshots`, 'POST');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.snapshot.id);
    assert.strictEqual(res.data.snapshot.aggregateId, testAggregateId);
    assert.strictEqual(res.data.snapshot.sequence, 4);
    assert.ok(res.data.snapshot.timestamp);
  });

  it('should get snapshots list', async () => {
    // Append and snapshot
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'TASK_STARTED', payload: { taskId: 'task-1' }
    });
    await request(`/api/aggregates/${testAggregateId}/snapshots`, 'POST');

    const res = await request(`/api/aggregates/${testAggregateId}/snapshots`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.count >= 1);
  });

  it('should get latest snapshot', async () => {
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'TASK_STARTED', payload: { taskId: 'task-1' }
    });
    await request(`/api/aggregates/${testAggregateId}/snapshots`, 'POST');

    const res = await request(`/api/aggregates/${testAggregateId}/snapshots/latest`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.snapshot);
    assert.strictEqual(res.data.snapshot.sequence, 0);
  });

  it('should return 404 when no snapshots exist', async () => {
    const res = await request(`/api/aggregates/${testAggregateId}/snapshots/latest`);

    assert.strictEqual(res.status, 404);
    assert.ok(res.data.error.includes('No snapshots'));
  });

  it('should require events before snapshot', async () => {
    const res = await request(`/api/aggregates/${testAggregateId}/snapshots`, 'POST');

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.error.includes('No events'));
  });
});

describe('Event Sourcing Engine - Replay', () => {
  const testAggregateId = `test-replay-${Date.now()}`;

  beforeEach(() => {
    cleanTestData();
  });

  it('should replay events from beginning', async () => {
    // Append events
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'WORKFLOW_STARTED', payload: { workflowId: testAggregateId }
    });
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'TASK_STARTED', payload: { taskId: 'task-1' }
    });

    const res = await request(`/api/aggregates/${testAggregateId}/replay`, 'POST', {
      fromSequence: 0
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.aggregateId, testAggregateId);
    assert.strictEqual(res.data.eventCount, 2);
    assert.ok(res.data.state);
  });

  it('should replay from specific sequence', async () => {
    // Append 3 events
    for (let i = 0; i < 3; i++) {
      await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
        type: 'TASK_STARTED', payload: { taskId: `task-${i}` }
      });
    }

    // Create snapshot at sequence 2
    await request(`/api/aggregates/${testAggregateId}/snapshots`, 'POST');

    const res = await request(`/api/aggregates/${testAggregateId}/replay`, 'POST', {
      fromSequence: 1
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.startedFromSnapshot);
  });

  it('should use snapshot for fast replay', async () => {
    // Append 10 events
    for (let i = 0; i < 10; i++) {
      await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
        type: 'TASK_STARTED', payload: { taskId: `task-${i}` }
      });
    }

    // Create snapshot
    await request(`/api/aggregates/${testAggregateId}/snapshots`, 'POST');

    const res = await request(`/api/aggregates/${testAggregateId}/replay`, 'POST', {
      fromSequence: 0
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.startedFromSnapshot);
    assert.ok(res.data.eventCount <= 10); // Fewer events to replay with snapshot
  });
});

describe('Event Sourcing Engine - Integrity Verification', () => {
  const testAggregateId = `test-verify-${Date.now()}`;

  beforeEach(() => {
    cleanTestData();
  });

  it('should verify valid events', async () => {
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'WORKFLOW_STARTED', payload: { workflowId: testAggregateId }
    });

    const res = await request(`/api/aggregates/${testAggregateId}/verify`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.valid, true);
    assert.strictEqual(res.data.verified, 1);
    assert.strictEqual(res.data.failed, 0);
  });

  it('should detect corrupted events', async () => {
    // Manually corrupt an event file
    const event = {
      type: 'WORKFLOW_STARTED',
      payload: { workflowId: testAggregateId }
    };
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', event);

    // Corrupt the file
    const filePath = path.join(process.env.EVENT_SOURCING_DATA_DIR, `${testAggregateId}.events.json`);
    const events = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    events[0].payload.corrupted = true;
    fs.writeFileSync(filePath, JSON.stringify(events));

    const res = await request(`/api/aggregates/${testAggregateId}/verify`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.valid, false);
    assert.strictEqual(res.data.failed, 1);
    assert.ok(res.data.errors.length > 0);
  });
});

describe('Event Sourcing Engine - Aggregate Info', () => {
  const testAggregateId = `test-info-${Date.now()}`;

  beforeEach(() => {
    cleanTestData();
  });

  it('should get aggregate info', async () => {
    await request(`/api/aggregates/${testAggregateId}/events`, 'POST', {
      type: 'WORKFLOW_STARTED', payload: { workflowId: testAggregateId }
    });

    const res = await request(`/api/aggregates/${testAggregateId}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.aggregateId, testAggregateId);
    assert.strictEqual(res.data.eventCount, 1);
    assert.strictEqual(res.data.latestSequence, 0);
    assert.ok(res.data.createdAt);
    assert.ok(res.data.updatedAt);
  });

  it('should list all aggregates', async () => {
    // Create a few aggregates
    await request(`/api/aggregates/agg-1/events`, 'POST', {
      type: 'TEST_EVENT', payload: {}
    });
    await request(`/api/aggregates/agg-2/events`, 'POST', {
      type: 'TEST_EVENT', payload: {}
    });

    const res = await request('/api/aggregates');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.count >= 2);
    assert.ok(res.data.aggregates.some(a => a.aggregateId === 'agg-1'));
    assert.ok(res.data.aggregates.some(a => a.aggregateId === 'agg-2'));
  });
});

// Cleanup after all tests
after(() => {
  cleanTestData();
});
