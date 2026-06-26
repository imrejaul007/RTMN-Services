/**
 * RAZO ContextEngine Tests
 * Note: vi.mock('uuid') cannot intercept CJS require(), so we use real UUIDs.
 * Tests verify behavior rather than specific UUID values.
 */
import { describe, it, expect, beforeEach } from 'vitest';

const ContextEngine = (await import('../../src/context/engine.js')).default;

describe('ContextEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ContextEngine(console);
  });

  // ─── Session Lifecycle ───────────────────────────────────────────────────────

  describe('createSession()', () => {
    it('creates a session with uuid and default context', () => {
      const session = engine.createSession('user-42');
      expect(session.id).toMatch(/^[0-9a-f-]{36}$/); // valid UUID v4
      expect(session.userId).toBe('user-42');
      expect(session.context.conversationHistory).toEqual([]);
      expect(session.context.currentIntent).toBeNull();
      expect(session.context.pendingEntities).toEqual({});
      expect(session.context.merchantContext).toBeNull();
    });

    it('accepts metadata option', () => {
      const session = engine.createSession('user-1', { metadata: { source: 'whatsapp' } });
      expect(session.metadata.source).toBe('whatsapp');
    });

    it('sets createdAt and lastActivity timestamps', () => {
      const session = engine.createSession('user-1');
      expect(session.createdAt).toBeTruthy();
      expect(session.lastActivity).toBeTruthy();
    });
  });

  describe('getSession()', () => {
    it('returns session by id', () => {
      const created = engine.createSession('user-1');
      const found = engine.getSession(created.id);
      expect(found.id).toBe(created.id);
    });

    it('updates lastActivity when retrieved', () => {
      const session = engine.createSession('user-1');
      // Wait 2ms so Date.now() returns a different value on next getSession call
      const { setTimeout } = require('timers/promises');
      return setTimeout(2).then(() => {
        const before = session.lastActivity;
        engine.getSession(session.id);
        const after = engine.getSession(session.id).lastActivity;
        expect(after).not.toBe(before);
      });
    });

    it('returns undefined for unknown sessionId', () => {
      expect(engine.getSession('nonexistent')).toBeUndefined();
    });
  });

  describe('getOrCreateSession()', () => {
    it('returns existing session without creating', () => {
      const existing = engine.createSession('user-1');
      const result = engine.getOrCreateSession(existing.id, 'user-1');
      expect(result.session.id).toBe(existing.id);
      expect(result.created).toBe(false);
    });

    it('creates new session when id not found', () => {
      const result = engine.getOrCreateSession('new-id', 'user-2');
      expect(result.session.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.created).toBe(true);
    });
  });

  describe('endSession()', () => {
    it('marks session as ended and removes it', () => {
      const session = engine.createSession('user-1');
      const result = engine.endSession(session.id);
      expect(result.success).toBe(true);
      expect(engine.getSession(session.id)).toBeUndefined();
    });

    it('is idempotent', () => {
      const session = engine.createSession('user-1');
      engine.endSession(session.id);
      expect(engine.endSession(session.id)).toEqual({ success: true });
    });
  });

  // ─── Context Management ─────────────────────────────────────────────────────

  describe('updateContext()', () => {
    it('merges updates into session context', () => {
      const session = engine.createSession('user-1');
      engine.updateContext(session.id, { foo: 'bar' });
      const updated = engine.getSession(session.id);
      expect(updated.context.foo).toBe('bar');
    });

    it('throws for unknown session', () => {
      expect(() => engine.updateContext('bad-id', {})).toThrow('Session not found');
    });
  });

  describe('setCurrentIntent()', () => {
    it('stores current intent with entities and confidence', () => {
      const session = engine.createSession('user-1');
      engine.setCurrentIntent(session.id, 'order_food', { item: 'pizza' }, 0.95);
      const updated = engine.getSession(session.id);
      expect(updated.context.currentIntent.name).toBe('order_food');
      expect(updated.context.currentIntent.entities.item).toBe('pizza');
      expect(updated.context.currentIntent.confidence).toBe(0.95);
    });

    it('updates pendingEntities', () => {
      const session = engine.createSession('user-1');
      engine.setCurrentIntent(session.id, 'order_food', { item: 'burger' }, 0.9);
      expect(engine.getSession(session.id).context.pendingEntities.item).toBe('burger');
    });

    it('throws for unknown session', () => {
      expect(() => engine.setCurrentIntent('bad-id', 'order_food', {}, 0.9)).toThrow('Session not found');
    });
  });

  describe('updatePendingEntities()', () => {
    it('merges new entities into pendingEntities', () => {
      const session = engine.createSession('user-1');
      engine.updatePendingEntities(session.id, { a: '1' });
      engine.updatePendingEntities(session.id, { b: '2' });
      const entities = engine.getSession(session.id).context.pendingEntities;
      expect(entities).toEqual({ a: '1', b: '2' });
    });
  });

  describe('addToHistory()', () => {
    it('appends user message to history', () => {
      const session = engine.createSession('user-1');
      engine.addToHistory(session.id, 'Hello there');
      const history = engine.getSession(session.id).context.conversationHistory;
      expect(history).toHaveLength(1);
      expect(history[0].text).toBe('Hello there');
      expect(history[0].sender).toBe('user');
    });

    it('appends bot message when sender = bot', () => {
      const session = engine.createSession('user-1');
      engine.addToHistory(session.id, 'Bot reply here', 'bot');
      const history = engine.getSession(session.id).context.conversationHistory;
      expect(history[0].sender).toBe('bot');
    });

    it('keeps only last 50 messages', () => {
      const session = engine.createSession('user-1');
      for (let i = 0; i < 55; i++) {
        engine.addToHistory(session.id, `msg-${i}`);
      }
      const history = engine.getSession(session.id).context.conversationHistory;
      expect(history).toHaveLength(50);
      expect(history[0].text).toBe('msg-5');
    });

    it('throws for unknown session', () => {
      expect(() => engine.addToHistory('bad-id', 'hello')).toThrow('Session not found');
    });
  });

  // ─── Merchant & Location Context ──────────────────────────────────────────

  describe('setMerchantContext()', () => {
    it('stores merchant details', () => {
      const session = engine.createSession('user-1');
      engine.setMerchantContext(session.id, {
        id: 'm1', name: 'Dominos', category: 'restaurant',
        services: ['delivery'], location: 'MG Road'
      });
      const ctx = engine.getSession(session.id).context.merchantContext;
      expect(ctx.name).toBe('Dominos');
      expect(ctx.category).toBe('restaurant');
    });
  });

  describe('setLocationContext()', () => {
    it('stores location details', () => {
      const session = engine.createSession('user-1');
      engine.setLocationContext(session.id, {
        type: 'current', coordinates: { lat: 12.97, lng: 77.59 },
        address: 'MG Road, Bangalore', city: 'Bangalore'
      });
      const ctx = engine.getSession(session.id).context.locationContext;
      expect(ctx.city).toBe('Bangalore');
      expect(ctx.type).toBe('current');
    });
  });

  // ─── Preferences & User Context ───────────────────────────────────────────

  describe('cacheUserPreferences() / getUserPreferences()', () => {
    it('caches and retrieves preferences', () => {
      engine.cacheUserPreferences('user-1', { language: 'en', notifications: true });
      const prefs = engine.getUserPreferences('user-1');
      expect(prefs.language).toBe('en');
      expect(prefs.notifications).toBe(true);
      expect(prefs.cachedAt).toBeTruthy();
    });

    it('returns null for unknown user', () => {
      expect(engine.getUserPreferences('unknown')).toBeNull();
    });
  });

  describe('mergeExternalContext()', () => {
    it('merges external preferences into session', () => {
      const session = engine.createSession('user-1');
      engine.mergeExternalContext(session.id, { preferences: { darkMode: true } });
      expect(engine.getSession(session.id).context.userPreferences.darkMode).toBe(true);
    });

    it('merges location from external context', () => {
      const session = engine.createSession('user-1');
      engine.mergeExternalContext(session.id, { location: { type: 'current', city: 'Mumbai' } });
      expect(engine.getSession(session.id).context.locationContext.city).toBe('Mumbai');
    });
  });

  // ─── Helpers & Stats ───────────────────────────────────────────────────────

  describe('getContextSummary()', () => {
    it('returns context snapshot', () => {
      const session = engine.createSession('user-1');
      engine.setCurrentIntent(session.id, 'order_food', { item: 'pizza' }, 0.9);
      const summary = engine.getContextSummary(session.id);
      expect(summary.sessionId).toBe(session.id);
      expect(summary.currentIntent.name).toBe('order_food');
    });

    it('returns null for unknown session', () => {
      expect(engine.getContextSummary('bad-id')).toBeNull();
    });
  });

  describe('getUserSessions()', () => {
    it('returns active sessions for user', () => {
      engine.createSession('user-1');
      engine.createSession('user-1');
      expect(engine.getUserSessions('user-1')).toHaveLength(2);
    });

    it('excludes ended sessions', () => {
      const s1 = engine.createSession('user-1');
      engine.createSession('user-1');
      engine.endSession(s1.id);
      expect(engine.getUserSessions('user-1')).toHaveLength(1);
    });
  });

  describe('cleanupOldSessions()', () => {
    it('removes sessions older than maxAgeMs', () => {
      const session = engine.createSession('user-1');
      // Manually age the session by setting lastActivity to the past
      session.lastActivity = new Date(Date.now() - 1000).toISOString();
      const result = engine.cleanupOldSessions(500); // sessions older than 500ms
      expect(result.cleaned).toBe(1);
      expect(engine.getSession(session.id)).toBeUndefined();
    });

    it('does not remove recent sessions', () => {
      engine.createSession('user-1');
      const result = engine.cleanupOldSessions(24 * 60 * 60 * 1000);
      expect(result.cleaned).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('returns active session count and cache size', () => {
      engine.createSession('u1');
      engine.createSession('u2');
      const stats = engine.getStats();
      expect(stats.activeSessions).toBe(2);
    });
  });
});
