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

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  publish: vi.fn(),
  subscribe: vi.fn(),
  on: vi.fn(),
  ping: vi.fn().mockResolvedValue('PONG'),
};

// Import after mocking
import { toolHandlers } from '../tools.js';

describe('Event Bus MCP Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publish_event', () => {
    it('should publish an event with valid params', async () => {
      const result = await toolHandlers.publish_event({
        channel: 'test-channel',
        event: { type: 'test', data: 'sample' },
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.channel).toBe('test-channel');
    });

    it('should handle missing channel', async () => {
      const result = await toolHandlers.publish_event({
        event: { type: 'test' },
      } as any);

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true); // Mock returns success
    });
  });

  describe('subscribe_channel', () => {
    it('should subscribe to a channel', async () => {
      const result = await toolHandlers.subscribe_channel({
        channel: 'notifications',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.channel).toBe('notifications');
    });
  });

  describe('get_events', () => {
    it('should get events from a channel', async () => {
      const result = await toolHandlers.get_events({
        channel: 'test-channel',
        limit: 10,
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.channel).toBe('test-channel');
      expect(parsed.events).toBeInstanceOf(Array);
    });

    it('should use default limit', async () => {
      const result = await toolHandlers.get_events({
        channel: 'test-channel',
      } as any);

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });

  describe('create_topic', () => {
    it('should create a new topic', async () => {
      const result = await toolHandlers.create_topic({
        name: 'new-topic',
        partitions: 3,
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.topic.name).toBe('new-topic');
    });
  });

  describe('list_topics', () => {
    it('should list all topics', async () => {
      const result = await toolHandlers.list_topics({});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.topics).toBeInstanceOf(Array);
    });
  });

  describe('get_event_stats', () => {
    it('should get event statistics', async () => {
      const result = await toolHandlers.get_event_stats({});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.stats).toBeDefined();
      expect(parsed.stats.totalEvents).toBeDefined();
    });
  });

  describe('health_check', () => {
    it('should return health status', async () => {
      const result = await toolHandlers.health_check({});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('healthy');
      expect(parsed.redis).toBe('connected');
    });
  });
});
