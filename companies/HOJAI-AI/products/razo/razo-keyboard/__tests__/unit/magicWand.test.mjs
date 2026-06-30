/**
 * Tests for Magic Wand - One-tap Help Me button
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const MagicWand = require('../../src/core/magicWand');

describe('MagicWand', () => {
  let magicWand;
  let mockIntentRouter;
  let mockContextEngine;
  let mockActionEngine;

  beforeEach(() => {
    mockIntentRouter = {
      detect: vi.fn().mockResolvedValue({ intent: 'order_food', confidence: 0.9 })
    };

    mockContextEngine = {
      getOrCreateSession: vi.fn().mockReturnValue({
        session: {
          id: 'session-1',
          context: {
            conversationHistory: [],
            userPreferences: { language: 'en' }
          }
        },
        created: true
      }),
      updateContext: vi.fn(),
      getSession: vi.fn().mockReturnValue({
        id: 'session-1',
        context: {
          lastMagicWandResponse: {
            intent: 'order_food',
            recommended: {
              id: 'opt1',
              actionService: 'do-app',
              endpoint: '/api/orders',
              entities: { restaurant: 'Paradise' },
              confirmationMessage: 'Order placed!'
            }
          }
        }
      })
    };

    mockActionEngine = {
      execute: vi.fn().mockResolvedValue({ success: true, orderId: '123' })
    };

    magicWand = new MagicWand({
      intentRouter: mockIntentRouter,
      contextEngine: mockContextEngine,
      actionEngine: mockActionEngine,
      logger: { info: () => {}, error: () => {} }
    });
  });

  it('should detect intent and provide magic response for order_food', async () => {
    const result = await magicWand.helpMe({
      text: 'Order my usual biryani',
      userId: 'user-1',
      sessionId: 'session-1'
    });

    expect(result.success).toBe(true);
    expect(result.intent).toBe('order_food');
    expect(result.options).toBeDefined();
    expect(result.options.length).toBeGreaterThan(0);
    expect(result.recommended).toBeDefined();
    expect(result.action).toBeTruthy(); // Primary one-tap action label
  });

  it('should return 3 hotel options for book_hotel intent', async () => {
    mockIntentRouter.detect = vi.fn().mockResolvedValue({ intent: 'book_hotel' });

    const result = await magicWand.helpMe({
      text: 'Need hotel for tomorrow',
      userId: 'user-1'
    });

    expect(result.success).toBe(true);
    expect(result.options.length).toBe(3);
    expect(result.options[0]).toHaveProperty('title');
    expect(result.options[0]).toHaveProperty('icon');
    expect(result.options[0]).toHaveProperty('price');
  });

  it('should execute recommended action on one-tap', async () => {
    const result = await magicWand.executeRecommended({
      requestId: 'req-1',
      userId: 'user-1',
      sessionId: 'session-1'
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Order placed!');
    expect(mockActionEngine.execute).toHaveBeenCalled();
  });

  it('should rank options by score (history + rating + distance)', async () => {
    const result = await magicWand.helpMe({
      text: 'Order pizza',
      userId: 'user-1'
    });

    // First option should have highest score
    expect(result.options[0].isRecommended).toBe(true);
    expect(result.options[0].score).toBeGreaterThanOrEqual(result.options[1].score);
  });

  it('should extract entities from text', async () => {
    const result = await magicWand.helpMe({
      text: 'Pay Rahul 500',
      userId: 'user-1'
    });

    expect(result.entities).toBeDefined();
    expect(result.entities.amount).toBe(500);
    expect(result.entities.recipient).toBe('Rahul');
  });

  it('should handle unknown intent gracefully', async () => {
    mockIntentRouter.detect = vi.fn().mockResolvedValue({ intent: 'unknown' });

    const result = await magicWand.helpMe({
      text: 'random gibberish text',
      userId: 'user-1'
    });

    expect(result.success).toBe(true);
    expect(result.intent).toBe('unknown');
  });

  it('should track statistics', async () => {
    await magicWand.helpMe({ text: 'Order food', userId: 'u1' });
    await magicWand.helpMe({ text: 'Book hotel', userId: 'u2' });

    const stats = magicWand.getStats();
    expect(stats.totalInvocations).toBe(2);
    expect(stats.successfulRecommendations).toBe(2);
  });

  it('should support language parameter', async () => {
    const result = await magicWand.helpMe({
      text: 'Order food',
      userId: 'user-1',
      language: 'hi'
    });

    expect(result.language).toBe('hi');
  });
});