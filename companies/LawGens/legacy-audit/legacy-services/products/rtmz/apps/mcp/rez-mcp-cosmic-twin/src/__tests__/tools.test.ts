import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocking
import { toolHandlers } from '../tools.js';

describe('Cosmic Twin MCP Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create_twin', () => {
    it('should create a new digital twin', async () => {
      const result = await toolHandlers.create_twin({
        name: 'Test Twin',
        type: 'person',
        attributes: { age: 30, city: 'Mumbai' },
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.twin).toBeDefined();
      expect(parsed.twin.name).toBe('Test Twin');
    });

    it('should generate unique ID', async () => {
      const result1 = await toolHandlers.create_twin({
        name: 'Twin 1',
        type: 'company',
        attributes: {},
      });
      const result2 = await toolHandlers.create_twin({
        name: 'Twin 2',
        type: 'company',
        attributes: {},
      });

      const parsed1 = JSON.parse(result1.content[0].text);
      const parsed2 = JSON.parse(result2.content[0].text);

      expect(parsed1.twin.id).not.toBe(parsed2.twin.id);
    });
  });

  describe('get_twin_state', () => {
    it('should get twin state', async () => {
      const result = await toolHandlers.get_twin_state({
        twinId: 'twin-123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.twin).toBeDefined();
    });
  });

  describe('update_twin', () => {
    it('should update twin attributes', async () => {
      const result = await toolHandlers.update_twin({
        twinId: 'twin-123',
        attributes: { status: 'active', score: 95 },
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.twin.attributes.status).toBe('active');
    });
  });

  describe('delete_twin', () => {
    it('should delete a twin', async () => {
      const result = await toolHandlers.delete_twin({
        twinId: 'twin-123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });

  describe('list_twins', () => {
    it('should list all twins', async () => {
      const result = await toolHandlers.list_twins({});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.twins).toBeInstanceOf(Array);
    });

    it('should filter by type', async () => {
      const result = await toolHandlers.list_twins({
        type: 'person',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.twins).toBeInstanceOf(Array);
    });
  });

  describe('get_twin_history', () => {
    it('should get twin history', async () => {
      const result = await toolHandlers.get_twin_history({
        twinId: 'twin-123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.history).toBeInstanceOf(Array);
    });
  });

  describe('add_relationship', () => {
    it('should add relationship between twins', async () => {
      const result = await toolHandlers.add_relationship({
        sourceId: 'twin-1',
        targetId: 'twin-2',
        type: 'knows',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });

  describe('create_snapshot', () => {
    it('should create twin snapshot', async () => {
      const result = await toolHandlers.create_snapshot({
        twinId: 'twin-123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.snapshot).toBeDefined();
    });
  });

  describe('restore_snapshot', () => {
    it('should restore from snapshot', async () => {
      const result = await toolHandlers.restore_snapshot({
        snapshotId: 'snap-123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });

  describe('simulate_twin', () => {
    it('should run simulation', async () => {
      const result = await toolHandlers.simulate_twin({
        twinId: 'twin-123',
        simulationType: 'growth',
        duration: 30,
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.simulation).toBeDefined();
    });
  });
});
