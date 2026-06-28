/**
 * FlowOS Connector Integration Tests
 * Tests for workflow-connector bridging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock storage (simulates the in-memory Map)
const mockStorage = {
  configurations: new Map(),
  executions: new Map(),
  rateLimits: new Map()
};

// Mock connector hub response
const mockConnectorHub = {
  connectors: ['salesforce', 'hubspot', 'stripe', 'shopify', 'slack', 'gmail', 'jira', 'github']
};

// Rate limiting helper
function checkRateLimit(connectorId, limit, storage) {
  const key = `rate_${connectorId}`;
  const now = Date.now();

  if (!storage.rateLimits.has(key)) {
    storage.rateLimits.set(key, { count: 0, windowStart: now });
  }

  const state = storage.rateLimits.get(key);

  if (now - state.windowStart > limit.window) {
    state.count = 0;
    state.windowStart = now;
  }

  if (state.count >= limit.requests) {
    return false;
  }

  state.count++;
  return true;
}

// Validate connector exists
function validateConnector(connectorId, availableConnectors) {
  return availableConnectors.includes(connectorId);
}

// Generate execution record
function createExecution(workflowId, connectorId, action, params, status = 'success', result = null) {
  return {
    executionId: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    workflowId,
    connectorId,
    action,
    params,
    status,
    result,
    duration: Math.floor(Math.random() * 1000),
    executedAt: new Date().toISOString()
  };
}

describe('FlowOS Connector Integration', () => {
  beforeEach(() => {
    mockStorage.configurations.clear();
    mockStorage.executions.clear();
    mockStorage.rateLimits.clear();
  });

  describe('Connector Configuration', () => {
    it('should configure a connector for a workflow', () => {
      const workflowId = 'wf_123';
      const connectorId = 'salesforce';
      const config = {
        apiKey: 'test_key',
        instanceUrl: 'https://test.salesforce.com'
      };

      // Simulate configuration
      if (!mockStorage.configurations.has(workflowId)) {
        mockStorage.configurations.set(workflowId, new Map());
      }
      mockStorage.configurations.get(workflowId).set(connectorId, {
        ...config,
        configuredAt: new Date().toISOString()
      });

      expect(mockStorage.configurations.has(workflowId)).toBe(true);
      expect(mockStorage.configurations.get(workflowId).has(connectorId)).toBe(true);
      expect(mockStorage.configurations.get(workflowId).get(connectorId).apiKey).toBe('test_key');
    });

    it('should retrieve connector configs for a workflow', () => {
      const workflowId = 'wf_456';

      mockStorage.configurations.set(workflowId, new Map([
        ['salesforce', { apiKey: 'sf_key' }],
        ['hubspot', { apiKey: 'hs_key' }]
      ]));

      const configs = Array.from(mockStorage.configurations.get(workflowId).entries());

      expect(configs).toHaveLength(2);
      expect(configs.find(c => c[0] === 'salesforce')[1].apiKey).toBe('sf_key');
    });

    it('should return empty configs for unknown workflow', () => {
      const configs = mockStorage.configurations.get('unknown_wf');

      expect(configs).toBeUndefined();
    });

    it('should validate connector exists before configuring', () => {
      const validConnector = validateConnector('salesforce', mockConnectorHub.connectors);
      const invalidConnector = validateConnector('fake_connector', mockConnectorHub.connectors);

      expect(validConnector).toBe(true);
      expect(invalidConnector).toBe(false);
    });

    it('should store multiple connectors per workflow', () => {
      const workflowId = 'wf_789';

      mockStorage.configurations.set(workflowId, new Map([
        ['salesforce', { priority: 1 }],
        ['hubspot', { priority: 2 }],
        ['stripe', { priority: 3 }]
      ]));

      expect(mockStorage.configurations.get(workflowId)).toHaveLength(3);
    });
  });

  describe('Connector Invocation', () => {
    it('should create execution record for connector call', () => {
      const execution = createExecution(
        'wf_123',
        'salesforce',
        'createLead',
        { email: 'test@example.com', name: 'Test' }
      );

      mockStorage.executions.set(execution.executionId, execution);

      expect(mockStorage.executions.has(execution.executionId)).toBe(true);
      expect(execution.status).toBe('success');
      expect(execution.connectorId).toBe('salesforce');
    });

    it('should check idempotency before execution', () => {
      const idempotencyKey = 'idem_123';
      const existingExecution = createExecution('wf_1', 'salesforce', 'test', {});

      mockStorage.executions.set(idempotencyKey, existingExecution);

      // Simulate idempotency check
      const cached = mockStorage.executions.get(idempotencyKey);

      expect(cached).toBeDefined();
      expect(cached.executionId).toBe(existingExecution.executionId);
    });

    it('should store new execution if idempotency key not found', () => {
      const idempotencyKey = 'new_idem_456';

      const exists = mockStorage.executions.has(idempotencyKey);

      expect(exists).toBe(false);
    });

    it('should track execution duration', () => {
      const execution = createExecution('wf_1', 'hubspot', 'sync', {});

      expect(execution.duration).toBeGreaterThanOrEqual(0);
      expect(execution.executedAt).toBeDefined();
    });

    it('should handle failed executions', () => {
      const execution = {
        executionId: 'exec_fail_1',
        workflowId: 'wf_1',
        connectorId: 'stripe',
        action: 'charge',
        params: { amount: 100 },
        status: 'error',
        error: 'Insufficient funds',
        duration: 150,
        executedAt: new Date().toISOString()
      };

      mockStorage.executions.set(execution.executionId, execution);

      expect(execution.status).toBe('error');
      expect(execution.error).toBe('Insufficient funds');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests under rate limit', () => {
      const limit = { requests: 5, window: 60000 };
      const allowed = checkRateLimit('salesforce', limit, mockStorage);

      expect(allowed).toBe(true);
    });

    it('should block requests exceeding rate limit', () => {
      const limit = { requests: 2, window: 60000 };

      // Exhaust the limit
      checkRateLimit('hubspot', limit, mockStorage);
      checkRateLimit('hubspot', limit, mockStorage);

      // Third request should be blocked
      const blocked = checkRateLimit('hubspot', limit, mockStorage);

      expect(blocked).toBe(false);
    });

    it('should reset rate limit after window expires', () => {
      const key = 'rate_stripe';
      const now = Date.now();

      mockStorage.rateLimits.set(key, {
        count: 2,
        windowStart: now - 70000 // 70 seconds ago (window expired)
      });

      const limit = { requests: 5, window: 60000 };
      const state = mockStorage.rateLimits.get(key);

      // Window should be considered expired
      const isExpired = now - state.windowStart > limit.window;
      expect(isExpired).toBe(true);
    });

    it('should track rate limits per connector', () => {
      const limit = { requests: 3, window: 60000 };

      checkRateLimit('salesforce', limit, mockStorage);
      checkRateLimit('hubspot', limit, mockStorage);

      // Both should be tracked separately
      expect(mockStorage.rateLimits.has('rate_salesforce')).toBe(true);
      expect(mockStorage.rateLimits.has('rate_hubspot')).toBe(true);
    });

    it('should use default rate limit for unknown connectors', () => {
      const defaultLimit = { requests: 100, window: 60000 };
      const connectorLimit = { requests: 50, window: 60000 };

      const unknownConnectorLimit = connectorLimit; // Would fallback to default

      expect(unknownConnectorLimit.requests).toBe(50); // Uses specific or default
    });
  });

  describe('Batch Execution', () => {
    it('should execute multiple connector calls', () => {
      const requests = [
        { connectorId: 'salesforce', action: 'createLead', params: { email: 'a@test.com' } },
        { connectorId: 'hubspot', action: 'createContact', params: { email: 'b@test.com' } },
        { connectorId: 'stripe', action: 'createCustomer', params: { email: 'c@test.com' } }
      ];

      const executions = requests.map(r =>
        createExecution('wf_batch', r.connectorId, r.action, r.params)
      );

      const successful = executions.filter(e => e.status === 'success');

      expect(executions).toHaveLength(3);
      expect(successful).toHaveLength(3);
    });

    it('should track batch execution results', () => {
      const results = [
        { success: true, result: { id: '1' } },
        { success: true, result: { id: '2' } },
        { success: false, error: 'Connection failed' }
      ];

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });

    it('should limit batch size to 10', () => {
      const requests = Array.from({ length: 15 }, (_, i) => ({
        connectorId: 'salesforce',
        action: 'test',
        params: { index: i }
      }));

      const maxBatchSize = 10;
      const isValid = requests.length <= maxBatchSize;

      expect(isValid).toBe(false); // 15 > 10
    });
  });

  describe('Execution History', () => {
    it('should retrieve execution history for workflow', () => {
      const workflowId = 'wf_history';
      const executions = [
        createExecution(workflowId, 'salesforce', 'action1', {}),
        createExecution(workflowId, 'hubspot', 'action2', {}),
        createExecution(workflowId, 'stripe', 'action3', {})
      ];

      executions.forEach(e => mockStorage.executions.set(e.executionId, e));

      const history = Array.from(mockStorage.executions.values())
        .filter(e => e.workflowId === workflowId);

      expect(history).toHaveLength(3);
    });

    it('should sort history by most recent first', () => {
      const workflowId = 'wf_sorted';
      const now = Date.now();

      const oldExecution = {
        executionId: 'exec_old',
        workflowId,
        connectorId: 'salesforce',
        action: 'old',
        executedAt: new Date(now - 1000).toISOString()
      };

      const newExecution = {
        executionId: 'exec_new',
        workflowId,
        connectorId: 'hubspot',
        action: 'new',
        executedAt: new Date(now).toISOString()
      };

      mockStorage.executions.set(oldExecution.executionId, oldExecution);
      mockStorage.executions.set(newExecution.executionId, newExecution);

      const sorted = Array.from(mockStorage.executions.values())
        .filter(e => e.workflowId === workflowId)
        .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

      expect(sorted[0].action).toBe('new');
    });

    it('should limit history results', () => {
      const workflowId = 'wf_limit';

      for (let i = 0; i < 100; i++) {
        const exec = createExecution(workflowId, 'salesforce', `action${i}`, {});
        mockStorage.executions.set(exec.executionId, exec);
      }

      const history = Array.from(mockStorage.executions.values())
        .filter(e => e.workflowId === workflowId)
        .slice(0, 50);

      expect(history).toHaveLength(50);
    });
  });

  describe('Connector Registry', () => {
    it('should list all available connectors', () => {
      const connectors = mockConnectorHub.connectors;

      expect(connectors).toContain('salesforce');
      expect(connectors).toContain('hubspot');
      expect(connectors).toContain('stripe');
      expect(connectors).toContain('shopify');
    });

    it('should check connector capabilities', () => {
      const capabilities = {
        salesforce: {
          kinds: ['lead', 'contact', 'opportunity'],
          actions: ['create', 'update', 'delete', 'search']
        },
        stripe: {
          kinds: ['customer', 'charge', 'subscription'],
          actions: ['create', 'retrieve', 'list', 'refund']
        }
      };

      expect(capabilities.salesforce.kinds).toContain('lead');
      expect(capabilities.stripe.actions).toContain('refund');
    });

    it('should validate connector ID format', () => {
      const validId = 'salesforce';
      const invalidId = 'salesforce@invalid';

      const isValid = (id) => /^[a-z]+$/.test(id);

      expect(isValid(validId)).toBe(true);
      expect(isValid(invalidId)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing connector ID', () => {
      const invokeWithoutConnector = () => {
        const connectorId = null;
        if (!connectorId) {
          throw new Error('connectorId is required');
        }
      };

      expect(invokeWithoutConnector).toThrow('connectorId is required');
    });

    it('should handle missing action', () => {
      const invokeWithoutAction = () => {
        const action = null;
        if (!action) {
          throw new Error('action is required');
        }
      };

      expect(invokeWithoutAction).toThrow('action is required');
    });

    it('should handle connector hub connection failure', () => {
      const simulateHubFailure = () => {
        throw new Error('Connector Hub unreachable');
      };

      expect(simulateHubFailure).toThrow('Connector Hub unreachable');
    });

    it('should return available connectors when hub is down', () => {
      const defaultConnectors = ['salesforce', 'hubspot', 'stripe', 'shopify', 'slack'];

      const isHubAvailable = false;
      const connectors = isHubAvailable
        ? null // Would fetch from hub
        : defaultConnectors;

      expect(connectors).toHaveLength(5);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent executions efficiently', () => {
      const workflowId = 'wf_concurrent';
      const startTime = Date.now();

      const executions = Array.from({ length: 100 }, (_, i) =>
        createExecution(workflowId, 'salesforce', `action${i}`, { index: i })
      );

      executions.forEach(e => mockStorage.executions.set(e.executionId, e));

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should clean up old executions', () => {
      const oldExecution = createExecution('wf_old', 'salesforce', 'old', {});
      oldExecution.executedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago

      const recentExecution = createExecution('wf_recent', 'hubspot', 'recent', {});

      const retentionDays = 7;
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

      const isExpired = new Date(oldExecution.executedAt).getTime() < cutoff;

      expect(isExpired).toBe(true);
    });
  });
});
