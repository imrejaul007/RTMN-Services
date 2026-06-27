import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryOS, MemoryOSClient, MemoryConfidenceClient, MemoryContextClient } from '../../src/index';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    }),
  },
}));

describe('MemoryOS SDK', () => {
  let mockAxios: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxios = axios.create();
  });

  describe('MemoryOSClient', () => {
    it('should create a memory store response', async () => {
      const client = new MemoryOSClient({ baseUrl: 'http://localhost:4703' });
      const mockPost = vi.fn().mockResolvedValue({ data: { id: 'mem_123' } });
      (client as any).client.post = mockPost;

      const result = await client.store({
        userId: 'user_1',
        content: 'Test memory',
        type: 'note'
      });

      expect(mockPost).toHaveBeenCalledWith('/api/memories', {
        userId: 'user_1',
        content: 'Test memory',
        type: 'note'
      });
      expect(result.success).toBe(true);
    });

    it('should search memories', async () => {
      const client = new MemoryOSClient({ baseUrl: 'http://localhost:4703' });
      const mockGet = vi.fn().mockResolvedValue({
        data: { memories: [{ id: 'mem_1', content: 'test' }] }
      });
      (client as any).client.get = mockGet;

      const result = await client.search({ query: 'test', userId: 'user_1' });

      expect(mockGet).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should get memory by ID', async () => {
      const client = new MemoryOSClient({ baseUrl: 'http://localhost:4703' });
      const mockGet = vi.fn().mockResolvedValue({
        data: { id: 'mem_123', content: 'test memory' }
      });
      (client as any).client.get = mockGet;

      const result = await client.getById('mem_123');

      expect(mockGet).toHaveBeenCalledWith('/api/memories/mem_123', undefined);
      expect(result.success).toBe(true);
    });

    it('should delete a memory', async () => {
      const client = new MemoryOSClient({ baseUrl: 'http://localhost:4703' });
      const mockDelete = vi.fn().mockResolvedValue({ data: { deleted: true } });
      (client as any).client.delete = mockDelete;

      const result = await client.delete('mem_123');

      expect(mockDelete).toHaveBeenCalledWith('/api/memories/mem_123');
      expect(result.success).toBe(true);
    });
  });

  describe('MemoryConfidenceClient', () => {
    it('should get confidence score', async () => {
      const client = new MemoryConfidenceClient({ baseUrl: 'http://localhost:4152' });
      const mockGet = vi.fn().mockResolvedValue({
        data: { score: 0.85, breakdown: { base: 0.8, decay: 0.95 } }
      });
      (client as any).client.get = mockGet;

      const result = await client.getConfidence('fact_123');

      expect(mockGet).toHaveBeenCalledWith('/api/confidence/fact_123', undefined);
      expect(result.success).toBe(true);
      expect(result.data?.score).toBe(0.85);
    });

    it('should update reliability', async () => {
      const client = new MemoryConfidenceClient({ baseUrl: 'http://localhost:4152' });
      const mockPatch = vi.fn().mockResolvedValue({ data: { updated: true } });
      (client as any).client.patch = mockPatch;

      const result = await client.updateReliability('fact_123', 0.9);

      expect(mockPatch).toHaveBeenCalledWith('/api/confidence/fact_123', { reliability: 0.9 });
      expect(result.success).toBe(true);
    });
  });

  describe('MemoryContextClient', () => {
    it('should get context for query', async () => {
      const client = new MemoryContextClient({ baseUrl: 'http://localhost:4793' });
      const mockPost = vi.fn().mockResolvedValue({
        data: { context: ['memory1', 'memory2'], confidence: 0.92 }
      });
      (client as any).client.post = mockPost;

      const result = await client.getContext({ query: 'project updates', userId: 'user_1' });

      expect(mockPost).toHaveBeenCalledWith('/api/context', {
        query: 'project updates',
        userId: 'user_1'
      });
      expect(result.success).toBe(true);
    });

    it('should compose prompt from memories', async () => {
      const client = new MemoryContextClient({ baseUrl: 'http://localhost:4793' });
      const mockPost = vi.fn().mockResolvedValue({
        data: { prompt: 'Based on your memories...' }
      });
      (client as any).client.post = mockPost;

      const result = await client.composePrompt({
        query: 'what did I work on?',
        memories: ['worked on project A', 'met with team']
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Unified MemoryOS Class', () => {
    it('should instantiate all clients', () => {
      const memory = new MemoryOS({ baseUrl: 'http://localhost:4703' });

      expect(memory.memory).toBeInstanceOf(MemoryOSClient);
      expect(memory.confidence).toBeInstanceOf(MemoryConfidenceClient);
      expect(memory.context).toBeInstanceOf(MemoryContextClient);
      expect(memory.intelligence).toBeDefined();
      expect(memory.relationships).toBeDefined();
      expect(memory.governance).toBeDefined();
      expect(memory.forgetting).toBeDefined();
      expect(memory.portability).toBeDefined();
      expect(memory.truth).toBeDefined();
      expect(memory.multimodal).toBeDefined();
      expect(memory.federation).toBeDefined();
    });

    it('should use shorthand remember method', async () => {
      const memory = new MemoryOS({ baseUrl: 'http://localhost:4703' });
      const mockPost = vi.fn().mockResolvedValue({
        data: { id: 'mem_new', importance: 0.85 }
      });
      (memory.intelligence as any).client.post = mockPost;

      const result = await memory.remember('New important fact', 'user_1');

      expect(mockPost).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should use shorthand recall method', async () => {
      const memory = new MemoryOS({ baseUrl: 'http://localhost:4703' });
      const mockGet = vi.fn().mockResolvedValue({
        data: { memories: [{ id: '1', content: 'test' }] }
      });
      (memory.memory as any).client.get = mockGet;

      const result = await memory.recall('test query', 'user_1');

      expect(mockGet).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle getContext shorthand', async () => {
      const memory = new MemoryOS({ baseUrl: 'http://localhost:4703' });
      const mockPost = vi.fn().mockResolvedValue({
        data: { context: ['a', 'b'], confidence: 0.9 }
      });
      (memory.context as any).client.post = mockPost;

      const result = await memory.getContext('my query', 'user_1');

      expect(mockPost).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should delete user data via governance', async () => {
      const memory = new MemoryOS({ baseUrl: 'http://localhost:4703' });
      const mockPost = vi.fn().mockResolvedValue({ data: { deleted: 42 } });
      (memory.governance as any).client.post = mockPost;

      const result = await memory.deleteUserData('user_1', 'GDPR request');

      expect(mockPost).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should export user data', async () => {
      const memory = new MemoryOS({ baseUrl: 'http://localhost:4703' });
      const mockPost = vi.fn().mockResolvedValue({
        data: { exportId: 'exp_123', status: 'pending' }
      });
      (memory.portability as any).client.post = mockPost;

      const result = await memory.exportUserData('user_1');

      expect(mockPost).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const memory = new MemoryOS({ baseUrl: 'http://localhost:4703' });
      const mockPost = vi.fn().mockRejectedValue(new Error('Network error'));
      (memory.memory as any).client.post = mockPost;

      const result = await memory.remember('test', 'user_1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Config Options', () => {
    it('should create client with default configuration', () => {
      const client = new MemoryOSClient({});
      expect(client).toBeInstanceOf(MemoryOSClient);
    });

    it('should create client with custom base URL', () => {
      const client = new MemoryOSClient({ baseUrl: 'http://custom:3000' });
      expect(client).toBeInstanceOf(MemoryOSClient);
    });

    it('should create client with API key', () => {
      const client = new MemoryOSClient({ apiKey: 'secret123' });
      expect(client).toBeInstanceOf(MemoryOSClient);
    });

    it('should create client with custom timeout', () => {
      const client = new MemoryOSClient({ timeout: 60000 });
      expect(client).toBeInstanceOf(MemoryOSClient);
    });
  });
});
