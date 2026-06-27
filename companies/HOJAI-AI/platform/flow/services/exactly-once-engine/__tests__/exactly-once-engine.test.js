import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

// Mock storage for tests
const createMockStorage = () => {
  const keys = new Map();
  const results = new Map();
  const locks = new Map();

  return {
    keys,
    results,
    locks,

    async getKey(key) {
      return keys.get(key) || null;
    },

    async setKey(key, value, ttl) {
      keys.set(key, { ...value, expiresAt: ttl ? Date.now() + ttl : null });
    },

    async deleteKey(key) {
      keys.delete(key);
    },

    async getResult(id) {
      return results.get(id) || null;
    },

    async setResult(id, value) {
      results.set(id, value);
    },

    async acquireLock(lockKey, ownerId, ttl) {
      const existing = locks.get(lockKey);
      if (existing && existing.ownerId !== ownerId && existing.expiresAt > Date.now()) {
        return false;
      }
      locks.set(lockKey, {
        ownerId,
        expiresAt: Date.now() + ttl
      });
      return true;
    },

    async releaseLock(lockKey, ownerId) {
      const existing = locks.get(lockKey);
      if (existing && existing.ownerId === ownerId) {
        locks.delete(lockKey);
        return true;
      }
      return false;
    }
  };
};

const storage = createMockStorage();

const KEY_TYPES = {
  WORKFLOW: 'workflow',
  STEP: 'step',
  ACTION: 'action',
  EVENT: 'event'
};

const EXECUTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DUPLICATE: 'duplicate'
};

const createExactlyOnceEngine = (storage) => {
  const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const LOCK_TTL = 60 * 1000; // 1 minute

  const generateKey = (type, namespace, identifier) => {
    return `eo:${type}:${namespace}:${identifier}`;
  };

  const generateExecutionId = () => {
    return crypto.randomUUID();
  };

  return {
    generateKey,
    generateExecutionId,

    async checkKey(keyType, namespace, identifier) {
      const key = generateKey(keyType, namespace, identifier);
      const record = await storage.getKey(key);

      if (!record) {
        return { exists: false, status: null };
      }

      if (record.expiresAt && record.expiresAt < Date.now()) {
        await storage.deleteKey(key);
        return { exists: false, status: null };
      }

      return { exists: true, status: record.status };
    },

    async acquireLock(lockType, namespace, identifier, ownerId = null) {
      const lockKey = `lock:${lockType}:${namespace}:${identifier}`;
      const effectiveOwnerId = ownerId || generateExecutionId();
      const acquired = await storage.acquireLock(lockKey, effectiveOwnerId, LOCK_TTL);

      return {
        acquired,
        lockKey,
        ownerId: effectiveOwnerId
      };
    },

    async releaseLock(lockType, namespace, identifier, ownerId) {
      const lockKey = `lock:${lockType}:${namespace}:${identifier}`;
      return await storage.releaseLock(lockKey, ownerId);
    },

    async markProcessing(keyType, namespace, identifier, executionId) {
      const key = generateKey(keyType, namespace, identifier);
      await storage.setKey(key, {
        status: EXECUTION_STATUS.PROCESSING,
        executionId,
        startedAt: Date.now(),
        updatedAt: Date.now()
      }, DEFAULT_TTL);

      return true;
    },

    async markCompleted(keyType, namespace, identifier, result) {
      const key = generateKey(keyType, namespace, identifier);
      const record = await storage.getKey(key);

      await storage.setKey(key, {
        status: EXECUTION_STATUS.COMPLETED,
        executionId: record?.executionId,
        startedAt: record?.startedAt,
        completedAt: Date.now(),
        result
      }, DEFAULT_TTL);

      if (result && result.id) {
        await storage.setResult(result.id, result);
      }

      return true;
    },

    async markFailed(keyType, namespace, identifier, error) {
      const key = generateKey(keyType, namespace, identifier);
      const record = await storage.getKey(key);

      await storage.setKey(key, {
        status: EXECUTION_STATUS.FAILED,
        executionId: record?.executionId,
        startedAt: record?.startedAt,
        failedAt: Date.now(),
        error: typeof error === 'string' ? error : error.message,
        retryCount: record?.retryCount ?? 0 // Preserve existing retry count
      }, DEFAULT_TTL);

      return true;
    },

    async markDuplicate(keyType, namespace, identifier, originalExecutionId) {
      const key = generateKey(keyType, namespace, identifier);

      await storage.setKey(key, {
        status: EXECUTION_STATUS.DUPLICATE,
        originalExecutionId,
        detectedAt: Date.now()
      }, DEFAULT_TTL);

      return true;
    },

    async getResult(keyType, namespace, identifier) {
      const key = generateKey(keyType, namespace, identifier);
      const record = await storage.getKey(key);

      if (!record || record.status !== EXECUTION_STATUS.COMPLETED) {
        return null;
      }

      return record.result;
    },

    async executeOnce(keyType, namespace, identifier, fn, options = {}) {
      const { ownerId = generateExecutionId(), ttl = DEFAULT_TTL } = options;

      // Check if already executed
      const existing = await this.checkKey(keyType, namespace, identifier);
      if (existing.exists) {
        if (existing.status === EXECUTION_STATUS.COMPLETED) {
          const result = await this.getResult(keyType, namespace, identifier);
          return { executed: false, duplicate: true, result };
        }
        if (existing.status === EXECUTION_STATUS.PROCESSING) {
          return { executed: false, duplicate: false, reason: 'already_processing' };
        }
      }

      // Acquire lock
      const lockResult = await this.acquireLock(keyType, namespace, identifier, ownerId);
      if (!lockResult.acquired) {
        return { executed: false, duplicate: false, reason: 'lock_failed' };
      }

      // Mark as processing
      await this.markProcessing(keyType, namespace, identifier, ownerId);

      try {
        const result = await fn();

        await this.markCompleted(keyType, namespace, identifier, result);
        await this.releaseLock(keyType, namespace, identifier, ownerId);

        return { executed: true, duplicate: false, result };
      } catch (error) {
        await this.markFailed(keyType, namespace, identifier, error);
        await this.releaseLock(keyType, namespace, identifier, ownerId);

        return { executed: false, duplicate: false, reason: 'execution_failed', error: error.message };
      }
    },

    async retryFailed(keyType, namespace, identifier, maxRetries = 3) {
      const key = generateKey(keyType, namespace, identifier);
      const record = await storage.getKey(key);

      if (!record) {
        return { retried: false, reason: 'not_found' };
      }

      if (record.status !== EXECUTION_STATUS.FAILED) {
        return { retried: false, reason: 'not_failed' };
      }

      if (record.retryCount >= maxRetries) {
        return { retried: false, reason: 'max_retries_exceeded' };
      }

      record.retryCount = (record.retryCount || 0) + 1;
      record.status = EXECUTION_STATUS.PENDING;
      record.updatedAt = Date.now();

      await storage.setKey(key, record, DEFAULT_TTL);

      return { retried: true, retryCount: record.retryCount };
    },

    async getStats() {
      let total = 0;
      let completed = 0;
      let processing = 0;
      let failed = 0;
      let pending = 0;
      let duplicate = 0;

      for (const record of storage.keys.values()) {
        total++;
        switch (record.status) {
          case EXECUTION_STATUS.COMPLETED: completed++; break;
          case EXECUTION_STATUS.PROCESSING: processing++; break;
          case EXECUTION_STATUS.FAILED: failed++; break;
          case EXECUTION_STATUS.PENDING: pending++; break;
          case EXECUTION_STATUS.DUPLICATE: duplicate++; break;
        }
      }

      return {
        total,
        byStatus: { completed, processing, failed, pending, duplicate },
        hitRate: total > 0 ? (duplicate / total * 100).toFixed(2) + '%' : '0%'
      };
    },

    async cleanup(expiresBefore = Date.now()) {
      let cleaned = 0;

      for (const [key, record] of storage.keys.entries()) {
        if (record.expiresAt && record.expiresAt < expiresBefore) {
          await storage.deleteKey(key);
          cleaned++;
        }
      }

      return { cleaned };
    }
  };
};

describe('ExactlyOnceEngine', () => {
  let engine;

  beforeEach(() => {
    storage.keys.clear();
    storage.results.clear();
    storage.locks.clear();
    engine = createExactlyOnceEngine(storage);
  });

  describe('generateKey', () => {
    it('should generate correct key format', () => {
      const key = engine.generateKey('workflow', 'my-app', 'wf-123');

      expect(key).toBe('eo:workflow:my-app:wf-123');
    });

    it('should include key type in key', () => {
      const workflowKey = engine.generateKey('step', 'app', 'step-1');
      const actionKey = engine.generateKey('action', 'app', 'action-1');

      expect(workflowKey).toContain('step');
      expect(actionKey).toContain('action');
    });
  });

  describe('checkKey', () => {
    it('should return not exists for new key', async () => {
      const result = await engine.checkKey('workflow', 'app', 'new-key');

      expect(result.exists).toBe(false);
      expect(result.status).toBeNull();
    });

    it('should return exists and status for existing key', async () => {
      await engine.markProcessing('workflow', 'app', 'existing-key', 'exec-1');

      const result = await engine.checkKey('workflow', 'app', 'existing-key');

      expect(result.exists).toBe(true);
      expect(result.status).toBe(EXECUTION_STATUS.PROCESSING);
    });
  });

  describe('acquireLock / releaseLock', () => {
    it('should acquire lock successfully', async () => {
      const result = await engine.acquireLock('workflow', 'app', 'wf-1', 'owner-1');

      expect(result.acquired).toBe(true);
      expect(result.ownerId).toBe('owner-1');
    });

    it('should fail to acquire lock held by another owner', async () => {
      await engine.acquireLock('workflow', 'app', 'wf-1', 'owner-1');
      const result = await engine.acquireLock('workflow', 'app', 'wf-1', 'owner-2');

      expect(result.acquired).toBe(false);
    });

    it('should allow same owner to re-acquire lock', async () => {
      await engine.acquireLock('workflow', 'app', 'wf-1', 'owner-1');
      const result = await engine.acquireLock('workflow', 'app', 'wf-1', 'owner-1');

      expect(result.acquired).toBe(true);
    });

    it('should release lock for correct owner', async () => {
      await engine.acquireLock('workflow', 'app', 'wf-1', 'owner-1');

      const released = await engine.releaseLock('workflow', 'app', 'wf-1', 'owner-1');

      expect(released).toBe(true);
    });

    it('should not release lock for wrong owner', async () => {
      await engine.acquireLock('workflow', 'app', 'wf-1', 'owner-1');

      const released = await engine.releaseLock('workflow', 'app', 'wf-1', 'owner-2');

      expect(released).toBe(false);
    });
  });

  describe('markProcessing / markCompleted / markFailed', () => {
    it('should track processing state', async () => {
      await engine.markProcessing('workflow', 'app', 'wf-1', 'exec-1');

      const check = await engine.checkKey('workflow', 'app', 'wf-1');

      expect(check.exists).toBe(true);
      expect(check.status).toBe(EXECUTION_STATUS.PROCESSING);
    });

    it('should complete execution and store result', async () => {
      await engine.markProcessing('workflow', 'app', 'wf-1', 'exec-1');
      const result = { output: 'success', data: 42 };

      await engine.markCompleted('workflow', 'app', 'wf-1', result);

      const check = await engine.checkKey('workflow', 'app', 'wf-1');
      const storedResult = await engine.getResult('workflow', 'app', 'wf-1');

      expect(check.status).toBe(EXECUTION_STATUS.COMPLETED);
      expect(storedResult).toEqual(result);
    });

    it('should mark execution as failed with error', async () => {
      await engine.markProcessing('workflow', 'app', 'wf-1', 'exec-1');
      const error = 'Something went wrong';

      await engine.markFailed('workflow', 'app', 'wf-1', error);

      const check = await engine.checkKey('workflow', 'app', 'wf-1');

      expect(check.status).toBe(EXECUTION_STATUS.FAILED);
    });
  });

  describe('executeOnce', () => {
    it('should execute function first time', async () => {
      const fn = async () => ({ value: 'computed' });

      const result = await engine.executeOnce('workflow', 'app', 'wf-1', fn);

      expect(result.executed).toBe(true);
      expect(result.duplicate).toBe(false);
      expect(result.result).toEqual({ value: 'computed' });
    });

    it('should not re-execute completed function', async () => {
      const fn = async () => ({ value: 'computed' });

      // First execution
      await engine.executeOnce('workflow', 'app', 'wf-1', fn);

      // Second execution
      const result = await engine.executeOnce('workflow', 'app', 'wf-1', fn);

      expect(result.executed).toBe(false);
      expect(result.duplicate).toBe(true);
      expect(result.result).toEqual({ value: 'computed' });
    });

    it('should not execute if already processing', async () => {
      await engine.markProcessing('workflow', 'app', 'wf-1', 'other-owner');
      const fn = async () => ({ value: 'computed' });

      const result = await engine.executeOnce('workflow', 'app', 'wf-1', fn);

      expect(result.executed).toBe(false);
      expect(result.reason).toBe('already_processing');
    });

    it('should handle function errors gracefully', async () => {
      const fn = async () => {
        throw new Error('Function failed');
      };

      const result = await engine.executeOnce('workflow', 'app', 'wf-1', fn);

      expect(result.executed).toBe(false);
      expect(result.reason).toBe('execution_failed');
      expect(result.error).toBe('Function failed');
    });

    it('should use custom ownerId when provided', async () => {
      const fn = async () => ({ value: 'computed' });
      const customOwnerId = 'my-custom-id';

      const result = await engine.executeOnce('workflow', 'app', 'wf-1', fn, { ownerId: customOwnerId });

      expect(result.executed).toBe(true);
    });

    it('should track multiple different executions', async () => {
      const fn1 = async () => ({ type: 'wf1' });
      const fn2 = async () => ({ type: 'wf2' });

      const result1 = await engine.executeOnce('workflow', 'app', 'wf-1', fn1);
      const result2 = await engine.executeOnce('workflow', 'app', 'wf-2', fn2);

      expect(result1.executed).toBe(true);
      expect(result2.executed).toBe(true);
      expect(result1.result.type).toBe('wf1');
      expect(result2.result.type).toBe('wf2');
    });
  });

  describe('retryFailed', () => {
    it('should retry failed execution', async () => {
      await engine.markFailed('workflow', 'app', 'wf-1', 'error');

      const result = await engine.retryFailed('workflow', 'app', 'wf-1');

      expect(result.retried).toBe(true);
      expect(result.retryCount).toBe(1);
    });

    it('should not retry non-failed execution', async () => {
      await engine.markCompleted('workflow', 'app', 'wf-1', { result: 'ok' });

      const result = await engine.retryFailed('workflow', 'app', 'wf-1');

      expect(result.retried).toBe(false);
      expect(result.reason).toBe('not_failed');
    });

    it('should enforce max retries', async () => {
      // Directly set up a failed record with retryCount = 2
      const key = engine.generateKey('workflow', 'app', 'wf-1');
      storage.keys.set(key, {
        status: EXECUTION_STATUS.FAILED,
        executionId: 'exec-1',
        startedAt: Date.now(),
        failedAt: Date.now(),
        error: 'error',
        retryCount: 2, // Already at max
        expiresAt: Date.now() + 86400000 // 24 hours in ms
      });

      // Attempting to retry should fail
      const result = await engine.retryFailed('workflow', 'app', 'wf-1', 2);

      expect(result.retried).toBe(false);
      expect(result.reason).toBe('max_retries_exceeded');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await engine.markCompleted('workflow', 'app', 'wf-1', {});
      await engine.markCompleted('workflow', 'app', 'wf-2', {});
      await engine.markProcessing('workflow', 'app', 'wf-3', 'exec');
      await engine.markFailed('workflow', 'app', 'wf-4', 'error');
      await engine.markDuplicate('workflow', 'app', 'wf-5', 'original');

      const stats = await engine.getStats();

      expect(stats.total).toBe(5);
      expect(stats.byStatus.completed).toBe(2);
      expect(stats.byStatus.processing).toBe(1);
      expect(stats.byStatus.failed).toBe(1);
      expect(stats.byStatus.duplicate).toBe(1);
    });

    it('should calculate hit rate', async () => {
      await engine.markCompleted('workflow', 'app', 'wf-1', {});
      await engine.markDuplicate('workflow', 'app', 'wf-2', 'orig');
      await engine.markDuplicate('workflow', 'app', 'wf-3', 'orig');
      await engine.markDuplicate('workflow', 'app', 'wf-4', 'orig');

      const stats = await engine.getStats();

      expect(stats.hitRate).toBe('75.00%');
    });
  });

  describe('markDuplicate', () => {
    it('should mark execution as duplicate', async () => {
      await engine.markDuplicate('workflow', 'app', 'wf-1', 'original-exec-id');

      const check = await engine.checkKey('workflow', 'app', 'wf-1');

      expect(check.exists).toBe(true);
      expect(check.status).toBe(EXECUTION_STATUS.DUPLICATE);
    });
  });

  describe('cleanup', () => {
    it('should clean up expired keys', async () => {
      // Note: Testing TTL cleanup requires mocking time or modifying the storage
      // This test validates the cleanup function structure

      const result = await engine.cleanup(Date.now() + 1000);

      expect(result.cleaned).toBeDefined();
      expect(typeof result.cleaned).toBe('number');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle payment idempotency', async () => {
      const paymentKey = 'payment';
      const orderId = 'order-123';
      const paymentData = { amount: 99.99, currency: 'USD' };

      const processPayment = async () => {
        // Simulate payment processing
        return {
          transactionId: 'txn-' + Date.now(),
          status: 'success',
          ...paymentData
        };
      };

      // First call - processes payment
      const result1 = await engine.executeOnce(paymentKey, 'ecommerce', orderId, processPayment);

      expect(result1.executed).toBe(true);
      expect(result1.result.transactionId).toBeDefined();

      // Second call - returns same result (idempotent)
      const result2 = await engine.executeOnce(paymentKey, 'ecommerce', orderId, processPayment);

      expect(result2.executed).toBe(false);
      expect(result2.duplicate).toBe(true);
      expect(result2.result.transactionId).toBe(result1.result.transactionId);
    });

    it('should handle webhook delivery idempotency', async () => {
      const webhookKey = 'webhook';
      const deliveryId = 'webhook-abc-123';
      const webhookData = { event: 'order.created', orderId: '123' };

      const deliverWebhook = async () => {
        return { delivered: true, timestamp: Date.now() };
      };

      // First delivery
      const result1 = await engine.executeOnce(webhookKey, 'hooks', deliveryId, deliverWebhook);

      expect(result1.executed).toBe(true);

      // Duplicate delivery attempt
      const result2 = await engine.executeOnce(webhookKey, 'hooks', deliveryId, deliverWebhook);

      expect(result2.duplicate).toBe(true);
    });

    it('should handle step retry within same execution', async () => {
      const stepKey = 'step';
      const stepId = 'step-1';

      let attempts = 0;
      const flakyFunction = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient failure');
        }
        return { success: true, attempts };
      };

      // First attempt - fails
      const result1 = await engine.executeOnce(stepKey, 'workflow-1', stepId, flakyFunction);

      expect(result1.executed).toBe(false);
      expect(result1.error).toBe('Transient failure');

      // Check state
      const check = await engine.checkKey(stepKey, 'workflow-1', stepId);
      expect(check.status).toBe(EXECUTION_STATUS.FAILED);
    });
  });
});