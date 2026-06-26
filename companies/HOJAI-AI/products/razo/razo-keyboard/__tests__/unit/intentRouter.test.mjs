/**
 * RAZO IntentRouter Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
// Note: vi.mock('uuid') cannot intercept CJS require() in the source module

// CJS default export accessed as .default after dynamic import
const IntentRouter = (await import('../../src/intents/router.js')).default;

describe('IntentRouter', () => {
  let router;

  beforeEach(() => {
    router = new IntentRouter(console);
  });

  // ─── Intent Detection ──────────────────────────────────────────────────────

  describe('detect()', () => {
    it('detects order_food intent from keyword match', async () => {
      const result = await router.detect('I want to order pizza');
      expect(result.intent).toBe('order_food');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.action).toBe('do-app');
      expect(result.endpoint).toBe('/api/orders');
    });

    it('detects order_food intent from pattern match', async () => {
      const result = await router.detect('order a burger for me');
      expect(result.intent).toBe('order_food');
      expect(result.matchedKeywords).toContain('order');
    });

    it('detects book_hotel intent', async () => {
      const result = await router.detect('I need a hotel room');
      expect(result.intent).toBe('book_hotel');
      expect(result.action).toBe('do-app');
      expect(result.endpoint).toBe('/api/hotel-booking');
    });

    it('detects make_payment intent with ₹ amount', async () => {
      const result = await router.detect('pay ₹500 to Rahul for lunch');
      expect(result.intent).toBe('make_payment');
      expect(result.action).toBe('sutar');
      expect(result.endpoint).toBe('/api/escrow/transfer');
      expect(result.entities.amount).toBe('500');
    });

    it('detects ask_genie intent from genie keyword', async () => {
      const result = await router.detect('hey genie what is the weather');
      expect(result.intent).toBe('ask_genie');
      expect(result.action).toBe('genie');
      expect(result.endpoint).toBe('/api/query');
    });

    it('detects ask_genie intent from question words', async () => {
      const result = await router.detect('what is the best restaurant nearby');
      expect(result.intent).toBe('ask_genie');
    });

    it('detects track_expense intent', async () => {
      const result = await router.detect('log 500 expense for lunch');
      expect(result.intent).toBe('track_expense');
      expect(result.action).toBe('financial-twin');
    });

    it('detects check_balance intent', async () => {
      const result = await router.detect('check my balance');
      expect(result.intent).toBe('check_balance');
      expect(result.action).toBe('financial-twin');
    });

    it('detects track_order intent', async () => {
      const result = await router.detect('track my order');
      expect(result.intent).toBe('track_order');
      expect(result.action).toBe('do-app');
    });

    it('detects send_message intent', async () => {
      const result = await router.detect('send a whatsapp message to Priya');
      expect(result.intent).toBe('send_message');
      expect(result.action).toBe('channel');
    });

    it('detects schedule_meeting intent', async () => {
      const result = await router.detect('schedule a meeting tomorrow at 3pm');
      expect(result.intent).toBe('schedule_meeting');
      expect(result.action).toBe('calendar');
    });

    it('detects find_service intent', async () => {
      const result = await router.detect('find a plumber near me');
      expect(result.intent).toBe('find_service');
      expect(result.action).toBe('discovery');
    });

    it('detects get_recommendation intent', async () => {
      const result = await router.detect('recommend a good restaurant');
      expect(result.intent).toBe('get_recommendation');
      expect(result.action).toBe('copilot');
    });

    it('returns null intent for unrecognized input', async () => {
      const result = await router.detect('asdfgh jklqwerty uioxyz');
      expect(result.intent).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('returns null intent for empty string', async () => {
      const result = await router.detect('');
      expect(result.intent).toBeNull();
    });

    it('picks highest confidence when multiple intents match', async () => {
      const result = await router.detect('book a table at the restaurant');
      expect(['order_food', 'book_appointment']).toContain(result.intent);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('accepts userContext without crashing', async () => {
      const result = await router.detect('order pizza', { userId: 'u1' });
      expect(result.intent).toBe('order_food');
    });
  });

  // ─── Entity Extraction ─────────────────────────────────────────────────────

  describe('entity extraction', () => {
    it('extracts ₹ amount', async () => {
      const result = await router.detect('pay ₹2000 for groceries');
      expect(result.entities.amount).toBe('2000');
    });

    it('extracts numeric amount without ₹', async () => {
      const result = await router.detect('transfer 500 rupees to John');
      expect(result.entities.amount).toBe('500');
    });

    it('extracts date from MM/DD/YYYY pattern', async () => {
      const result = await router.detect('schedule meeting on 15/06/2025');
      expect(result.entities.date).toBe('15/06/2025');
    });

    it('extracts time', async () => {
      const result = await router.detect('schedule meeting at 3pm');
      expect(result.entities.time).toBe('3pm');
    });

    it('extracts duration', async () => {
      const result = await router.detect('schedule a 2 hour meeting');
      expect(result.entities.duration).toMatch(/2\s+hour/);
    });

    it('extracts recipient after "to"', async () => {
      const result = await router.detect('send message to Rahul Kumar');
      // Regex captures full name; input is lowercased so recipient is lowercase
      expect(result.entities.recipient).toMatch(/rahul/);
    });
  });

  // ─── Stats Tracking ────────────────────────────────────────────────────────

  describe('stats', () => {
    it('increments totalRequests on each detect', async () => {
      await router.detect('order pizza');
      await router.detect('track order');
      expect(router.getStats().totalRequests).toBe(2);
    });

    it('tracks intent counts', async () => {
      await router.detect('order pizza');
      await router.detect('order another burger');
      expect(router.stats.intentCounts.order_food).toBe(2);
    });

    it('getIntents returns all supported intent names', () => {
      const intents = router.getIntents();
      expect(intents).toContain('order_food');
      expect(intents).toContain('make_payment');
      expect(intents).toContain('ask_genie');
      expect(intents.length).toBeGreaterThan(10);
    });

    it('getStats returns supportedIntents count', () => {
      const stats = router.getStats();
      expect(stats.supportedIntents).toBeGreaterThan(10);
    });
  });
});
