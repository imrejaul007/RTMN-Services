import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// Mock storage for tests
const checkpoints = new Map();
const snapshots = new Map();

const createMockStorage = () => {
  return {
    checkpoints: new Map(),
    snapshots: new Map(),

    async saveCheckpoint(checkpoint) {
      this.checkpoints.set(checkpoint.id, { ...checkpoint });
      return true;
    },

    async getCheckpoint(id) {
      return this.checkpoints.get(id) || null;
    },

    async deleteCheckpoint(id) {
      return this.checkpoints.delete(id);
    },

    async listCheckpoints(workflowId) {
      return Array.from(this.checkpoints.values())
        .filter(c => c.workflowId === workflowId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },

    async saveSnapshot(snapshot) {
      this.snapshots.set(snapshot.id, { ...snapshot });
      return true;
    },

    async getSnapshot(id) {
      return this.snapshots.get(id) || null;
    },

    async deleteSnapshot(id) {
      return this.snapshots.delete(id);
    }
  };
};

const storage = createMockStorage();

// Simple implementation for testing
const createCheckpointingEngine = (storage) => {
  const generateChecksum = (data) => {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  };

  return {
    async createCheckpoint(workflowId, state, metadata = {}) {
      const checkpoint = {
        id: crypto.randomUUID(),
        workflowId,
        version: (metadata.version || 1),
        state: { ...state },
        metadata: { ...metadata },
        checksum: generateChecksum(state),
        createdAt: Date.now(),
        parentId: metadata.parentId || null,
        incremental: false
      };

      await storage.saveCheckpoint(checkpoint);
      return checkpoint;
    },

    async createIncrementalCheckpoint(workflowId, baseCheckpointId, deltaState, metadata = {}) {
      const baseCheckpoint = await storage.getCheckpoint(baseCheckpointId);
      if (!baseCheckpoint) {
        throw new Error('Base checkpoint not found');
      }

      const fullState = { ...baseCheckpoint.state, ...deltaState };
      const checkpoint = {
        id: crypto.randomUUID(),
        workflowId,
        version: baseCheckpoint.version + 1,
        state: fullState,
        delta: deltaState,
        metadata: { ...metadata },
        checksum: generateChecksum(fullState),
        createdAt: Date.now(),
        parentId: baseCheckpointId,
        incremental: true
      };

      await storage.saveCheckpoint(checkpoint);
      return checkpoint;
    },

    async restoreFromCheckpoint(checkpointId) {
      const checkpoint = await storage.getCheckpoint(checkpointId);
      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }

      if (checkpoint.incremental && checkpoint.parentId) {
        const parentState = await this.restoreFromCheckpoint(checkpoint.parentId);
        return { ...parentState, ...checkpoint.delta };
      }

      return checkpoint.state;
    },

    async verifyCheckpoint(checkpointId) {
      const checkpoint = await storage.getCheckpoint(checkpointId);
      if (!checkpoint) {
        return { valid: false, error: 'Checkpoint not found' };
      }

      const currentChecksum = generateChecksum(checkpoint.state);
      const isValid = currentChecksum === checkpoint.checksum;

      return {
        valid: isValid,
        expected: checkpoint.checksum,
        actual: currentChecksum,
        checkpoint
      };
    },

    async listCheckpoints(workflowId, options = {}) {
      let checkpoints = await storage.listCheckpoints(workflowId);

      if (options.includeDeleted) {
        // Return all including deleted
      } else {
        checkpoints = checkpoints.filter(c => !c.deletedAt);
      }

      if (options.limit) {
        checkpoints = checkpoints.slice(0, options.limit);
      }

      return checkpoints;
    },

    async deleteCheckpoint(checkpointId) {
      const checkpoint = await storage.getCheckpoint(checkpointId);
      if (checkpoint) {
        checkpoint.deletedAt = Date.now();
        await storage.saveCheckpoint(checkpoint);
        return true;
      }
      return false;
    },

    async compareCheckpoints(checkpointId1, checkpointId2) {
      const cp1 = await storage.getCheckpoint(checkpointId1);
      const cp2 = await storage.getCheckpoint(checkpointId2);

      if (!cp1 || !cp2) {
        throw new Error('One or both checkpoints not found');
      }

      const state1 = await this.restoreFromCheckpoint(checkpointId1);
      const state2 = await this.restoreFromCheckpoint(checkpointId2);

      const differences = [];
      const allKeys = new Set([...Object.keys(state1), ...Object.keys(state2)]);

      for (const key of allKeys) {
        if (JSON.stringify(state1[key]) !== JSON.stringify(state2[key])) {
          differences.push({
            key,
            value1: state1[key],
            value2: state2[key]
          });
        }
      }

      return {
        checkpoint1: checkpointId1,
        checkpoint2: checkpointId2,
        differences,
        identical: differences.length === 0
      };
    },

    async pruneOldCheckpoints(workflowId, maxCheckpoints = 10) {
      const checkpoints = await storage.listCheckpoints(workflowId);

      if (checkpoints.length <= maxCheckpoints) {
        return { pruned: 0, remaining: checkpoints.length };
      }

      const toDelete = checkpoints.slice(maxCheckpoints);
      let pruned = 0;

      for (const cp of toDelete) {
        await this.deleteCheckpoint(cp.id);
        pruned++;
      }

      return {
        pruned,
        remaining: checkpoints.length - pruned
      };
    },

    async getLatestCheckpoint(workflowId) {
      const checkpointList = await storage.listCheckpoints(workflowId);
      return checkpointList[0] || null;
    },

    async getCheckpointChain(checkpointId) {
      const chain = [];
      let currentId = checkpointId;

      while (currentId) {
        const checkpoint = await storage.getCheckpoint(currentId);
        if (!checkpoint) break;

        chain.push(checkpoint);
        currentId = checkpoint.parentId;
      }

      return chain.reverse();
    }
  };
};

describe('CheckpointingEngine', () => {
  let engine;

  beforeEach(() => {
    storage.checkpoints.clear();
    storage.snapshots.clear();
    engine = createCheckpointingEngine(storage);
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint with state', async () => {
      const workflowId = 'workflow-1';
      const state = { step: 1, data: 'test' };

      const checkpoint = await engine.createCheckpoint(workflowId, state);

      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.workflowId).toBe(workflowId);
      expect(checkpoint.state).toEqual(state);
      expect(checkpoint.checksum).toBeDefined();
      expect(checkpoint.version).toBe(1);
    });

    it('should generate unique ID for each checkpoint', async () => {
      const state = { data: 'test' };

      const cp1 = await engine.createCheckpoint('wf-1', state);
      const cp2 = await engine.createCheckpoint('wf-1', state);

      expect(cp1.id).not.toBe(cp2.id);
    });

    it('should handle complex nested state', async () => {
      const complexState = {
        user: { name: 'John', profile: { age: 30 } },
        items: [1, 2, 3],
        metadata: { created: new Date().toISOString() }
      };

      const checkpoint = await engine.createCheckpoint('wf-1', complexState);

      expect(checkpoint.state).toEqual(complexState);
      expect(checkpoint.checksum).toBeDefined();
    });
  });

  describe('createIncrementalCheckpoint', () => {
    it('should create incremental checkpoint with delta', async () => {
      const workflowId = 'workflow-1';
      const initialState = { step: 1, count: 0 };

      const base = await engine.createCheckpoint(workflowId, initialState);
      const delta = { step: 2, count: 1 };

      const incremental = await engine.createIncrementalCheckpoint(
        workflowId, base.id, delta
      );

      expect(incremental.incremental).toBe(true);
      expect(incremental.delta).toEqual(delta);
      expect(incremental.version).toBe(base.version + 1);
      expect(incremental.parentId).toBe(base.id);
    });

    it('should throw error for non-existent base checkpoint', async () => {
      await expect(
        engine.createIncrementalCheckpoint('wf-1', 'non-existent', { step: 2 })
      ).rejects.toThrow('Base checkpoint not found');
    });

    it('should correctly restore state from incremental checkpoints', async () => {
      const workflowId = 'workflow-1';

      const cp1 = await engine.createCheckpoint(workflowId, { step: 1, data: 'A' });
      const cp2 = await engine.createIncrementalCheckpoint(
        workflowId, cp1.id, { step: 2, data: 'B' }
      );
      const cp3 = await engine.createIncrementalCheckpoint(
        workflowId, cp2.id, { step: 3, data: 'C' }
      );

      const restored = await engine.restoreFromCheckpoint(cp3.id);

      expect(restored.step).toBe(3);
      expect(restored.data).toBe('C');
    });
  });

  describe('restoreFromCheckpoint', () => {
    it('should restore full state from base checkpoint', async () => {
      const workflowId = 'workflow-1';
      const state = { step: 5, result: { value: 42 } };

      const checkpoint = await engine.createCheckpoint(workflowId, state);
      const restored = await engine.restoreFromCheckpoint(checkpoint.id);

      expect(restored).toEqual(state);
    });

    it('should throw error for non-existent checkpoint', async () => {
      await expect(
        engine.restoreFromCheckpoint('non-existent')
      ).rejects.toThrow('Checkpoint not found');
    });

    it('should correctly merge chain of incremental checkpoints', async () => {
      const workflowId = 'workflow-1';

      const cp1 = await engine.createCheckpoint(workflowId, { a: 1 });
      const cp2 = await engine.createIncrementalCheckpoint(workflowId, cp1.id, { b: 2 });
      const cp3 = await engine.createIncrementalCheckpoint(workflowId, cp2.id, { c: 3 });

      const restored = await engine.restoreFromCheckpoint(cp3.id);

      expect(restored).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('verifyCheckpoint', () => {
    it('should return valid for unmodified checkpoint', async () => {
      const state = { data: 'unchanged' };
      const checkpoint = await engine.createCheckpoint('wf-1', state);

      const result = await engine.verifyCheckpoint(checkpoint.id);

      expect(result.valid).toBe(true);
      expect(result.expected).toBe(result.actual);
    });

    it('should detect modification when state changes', async () => {
      const state = { data: 'original' };
      const checkpoint = await engine.createCheckpoint('wf-1', state);

      // Simulate state modification
      checkpoint.state.data = 'modified';
      await storage.saveCheckpoint(checkpoint);

      const result = await engine.verifyCheckpoint(checkpoint.id);

      expect(result.valid).toBe(false);
      expect(result.expected).not.toBe(result.actual);
    });

    it('should return error for non-existent checkpoint', async () => {
      const result = await engine.verifyCheckpoint('non-existent');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Checkpoint not found');
    });
  });

  describe('listCheckpoints', () => {
    it('should list checkpoints for workflow in reverse chronological order', async () => {
      const workflowId = 'workflow-1';

      const cp1 = await engine.createCheckpoint(workflowId, { v: 1 });
      await new Promise(r => setTimeout(r, 10));
      const cp2 = await engine.createCheckpoint(workflowId, { v: 2 });
      await new Promise(r => setTimeout(r, 10));
      const cp3 = await engine.createCheckpoint(workflowId, { v: 3 });

      const checkpoints = await engine.listCheckpoints(workflowId);

      expect(checkpoints.length).toBe(3);
      // Check ordering by verifying the state values
      expect(checkpoints[0].state.v).toBe(3); // Most recent first
      expect(checkpoints[2].state.v).toBe(1);
    });

    it('should only list checkpoints for specified workflow', async () => {
      await engine.createCheckpoint('wf-1', { v: 1 });
      await engine.createCheckpoint('wf-1', { v: 2 });
      await engine.createCheckpoint('wf-2', { v: 3 });

      const wf1Checkpoints = await engine.listCheckpoints('wf-1');
      expect(wf1Checkpoints.length).toBe(2);
    });

    it('should respect limit option', async () => {
      const workflowId = 'workflow-1';

      for (let i = 1; i <= 5; i++) {
        await engine.createCheckpoint(workflowId, { v: i });
      }

      const checkpoints = await engine.listCheckpoints(workflowId, { limit: 3 });

      expect(checkpoints.length).toBe(3);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should soft delete checkpoint', async () => {
      const checkpoint = await engine.createCheckpoint('wf-1', { data: 'test' });

      const result = await engine.deleteCheckpoint(checkpoint.id);

      expect(result).toBe(true);

      const listed = await engine.listCheckpoints('wf-1');
      expect(listed.find(c => c.id === checkpoint.id)).toBeUndefined();
    });

    it('should return false for non-existent checkpoint', async () => {
      const result = await engine.deleteCheckpoint('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('compareCheckpoints', () => {
    it('should identify differences between checkpoints', async () => {
      const workflowId = 'workflow-1';

      const cp1 = await engine.createCheckpoint(workflowId, { a: 1, b: 2 });
      const cp2 = await engine.createCheckpoint(workflowId, { a: 1, b: 3, c: 4 });

      const comparison = await engine.compareCheckpoints(cp1.id, cp2.id);

      expect(comparison.identical).toBe(false);
      expect(comparison.differences.length).toBe(2);
      expect(comparison.differences.find(d => d.key === 'b')).toBeDefined();
      expect(comparison.differences.find(d => d.key === 'c')).toBeDefined();
    });

    it('should report identical checkpoints', async () => {
      const workflowId = 'workflow-1';
      const state = { data: 'same' };

      const cp1 = await engine.createCheckpoint(workflowId, state);
      const cp2 = await engine.createCheckpoint(workflowId, state);

      const comparison = await engine.compareCheckpoints(cp1.id, cp2.id);

      expect(comparison.identical).toBe(true);
      expect(comparison.differences).toEqual([]);
    });
  });

  describe('pruneOldCheckpoints', () => {
    it('should prune checkpoints exceeding maxCheckpoints', async () => {
      const workflowId = 'workflow-1';

      for (let i = 1; i <= 15; i++) {
        await engine.createCheckpoint(workflowId, { v: i });
      }

      const result = await engine.pruneOldCheckpoints(workflowId, 10);

      expect(result.pruned).toBe(5);
      expect(result.remaining).toBe(10);
    });

    it('should not prune when under maxCheckpoints', async () => {
      const workflowId = 'workflow-1';

      for (let i = 1; i <= 5; i++) {
        await engine.createCheckpoint(workflowId, { v: i });
      }

      const result = await engine.pruneOldCheckpoints(workflowId, 10);

      expect(result.pruned).toBe(0);
      expect(result.remaining).toBe(5);
    });
  });

  describe('getLatestCheckpoint', () => {
    it('should return most recent checkpoint', async () => {
      const workflowId = 'workflow-1';

      const cp1 = await engine.createCheckpoint(workflowId, { v: 1 });
      await new Promise(r => setTimeout(r, 10));
      const cp2 = await engine.createCheckpoint(workflowId, { v: 2 });
      await new Promise(r => setTimeout(r, 10));
      const cp3 = await engine.createCheckpoint(workflowId, { v: 3 });

      const latest = await engine.getLatestCheckpoint(workflowId);

      expect(latest.state.v).toBe(3); // Most recent checkpoint has v: 3
    });

    it('should return null for workflow with no checkpoints', async () => {
      const latest = await engine.getLatestCheckpoint('non-existent');

      expect(latest).toBeNull();
    });
  });

  describe('getCheckpointChain', () => {
    it('should return complete ancestry chain', async () => {
      const workflowId = 'workflow-1';

      const cp1 = await engine.createCheckpoint(workflowId, { step: 1 });
      const cp2 = await engine.createIncrementalCheckpoint(workflowId, cp1.id, { step: 2 });
      const cp3 = await engine.createIncrementalCheckpoint(workflowId, cp2.id, { step: 3 });

      const chain = await engine.getCheckpointChain(cp3.id);

      expect(chain.length).toBe(3);
      expect(chain[0].id).toBe(cp1.id);
      expect(chain[1].id).toBe(cp2.id);
      expect(chain[2].id).toBe(cp3.id);
    });
  });
});