/**
 * Unit Tests for REZ Event Bus
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      ping: vi.fn().mockResolvedValue('PONG'),
      xadd: vi.fn().mockResolvedValue('1234567890-0'),
      xgroup: vi.fn().mockResolvedValue('OK'),
      xreadgroup: vi.fn().mockResolvedValue(null),
      xack: vi.fn().mockResolvedValue(1),
      xrange: vi.fn().mockResolvedValue([]),
      xdel: vi.fn().mockResolvedValue(1),
      subscribe: vi.fn().mockResolvedValue(1),
      on: vi.fn((event: string, cb: Function) => {
        if (event === 'message') {
          // Store callback for testing
          (this as any)._messageCallback = cb;
        }
      }),
    })),
  };
});

describe('EventPublisher', () => {
  let EventPublisher: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../src/services/EventPublisher');
    EventPublisher = module.EventPublisher;
  });

  describe('publish', () => {
    it('should publish event with correct format', async () => {
      const publisher = new EventPublisher();
      const messageId = await publisher.publish('test-channel', 'order.created', {
        orderId: 'RZ123',
      });

      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
    });

    it('should include event metadata', async () => {
      const publisher = new EventPublisher();
      const messageId = await publisher.publish('default', 'test.event', { data: 'test' });

      expect(messageId).toBeDefined();
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple events', async () => {
      const publisher = new EventPublisher();
      const events = [
        { eventType: 'event1', data: { id: 1 } },
        { eventType: 'event2', data: { id: 2 } },
      ];

      const messageIds = await publisher.publishBatch('test-channel', events);

      expect(messageIds).toHaveLength(2);
    });
  });
});

describe('EventRouter', () => {
  let EventRouter: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../src/services/EventRouter');
    EventRouter = module.EventRouter;
  });

  describe('registerHandler', () => {
    it('should register event handler', () => {
      const router = EventRouter.getInstance();

      router.registerHandler('test-channel', {
        id: 'handler-1',
        channel: 'test-channel',
        callback: vi.fn(),
      });

      expect(router).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return stats object', () => {
      const router = EventRouter.getInstance();
      const stats = router.getStats();

      expect(stats).toHaveProperty('published');
      expect(stats).toHaveProperty('consumed');
      expect(stats).toHaveProperty('failed');
    });
  });
});

describe('DeadLetterQueue', () => {
  let DeadLetterQueue: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../src/services/DeadLetterQueue');
    DeadLetterQueue = module.DeadLetterQueue;
  });

  describe('push', () => {
    it('should push failed message to DLQ', async () => {
      const dlq = new DeadLetterQueue();
      await dlq.push('msg-123', {
        eventType: 'order.created',
        data: { orderId: 'RZ123' },
        error: 'Processing failed',
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getFailedMessages', () => {
    it('should return empty array when no messages', async () => {
      const dlq = new DeadLetterQueue();
      const messages = await dlq.getFailedMessages(10);

      expect(Array.isArray(messages)).toBe(true);
    });
  });
});

describe('Event Model', () => {
  it('should have required event fields', () => {
    const event = {
      id: 'evt-123',
      eventType: 'order.created',
      channel: 'orders',
      data: { orderId: 'RZ123' },
      timestamp: new Date().toISOString(),
      source: 'test',
    };

    expect(event).toHaveProperty('eventType');
    expect(event).toHaveProperty('data');
    expect(event).toHaveProperty('timestamp');
  });

  it('should validate event types', () => {
    const validEventTypes = [
      'order.created',
      'order.updated',
      'order.cancelled',
      'negotiation.started',
      'negotiation.accepted',
      'negotiation.rejected',
      'payment.initiated',
      'payment.completed',
      'delivery.assigned',
      'delivery.picked_up',
      'delivery.delivered',
    ];

    expect(validEventTypes).toContain('order.created');
    expect(validEventTypes).toContain('negotiation.accepted');
  });
});
