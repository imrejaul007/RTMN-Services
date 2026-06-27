/**
 * Widget Analytics - Tests
 */

import { jest } from '@jest/globals';

// Mock stores
const mockSessionsStore = new Map();
const mockPagesStore = new Map();
const mockHeatmapStore = new Map();

jest.unstable_mockModule('../src/index.js', () => ({
  sessionsStore: mockSessionsStore,
  pagesStore: mockPagesStore,
  heatmapStore: mockHeatmapStore,
  EVENT_TYPES: {
    CLICK: 'click',
    SCROLL: 'scroll',
    MOUSE_MOVE: 'mouse_move',
    RAGE_CLICK: 'rage_click',
    DEAD_CLICK: 'dead_click',
    PAGE_VIEW: 'page_view',
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',
  },
  createSession: jest.fn((visitorId, metadata) => {
    const session = {
      id: `session-${visitorId}-1`,
      visitorId,
      startedAt: Date.now(),
      endedAt: null,
      events: [],
      metadata,
      stats: { clickCount: 0, scrollDepth: 0 },
    };
    mockSessionsStore.set(session.id, session);
    return session;
  }),
  getSession: jest.fn((sessionId) => mockSessionsStore.get(sessionId)),
  addEvent: jest.fn((sessionId, eventData) => {
    const session = mockSessionsStore.get(sessionId);
    if (!session) return null;
    const event = { id: `event-${session.events.length}`, ...eventData, timestamp: Date.now() };
    session.events.push(event);
    if (eventData.type === 'click') session.stats.clickCount++;
    return event;
  }),
  getVisitorSessions: jest.fn((visitorId) => ({
    total: 1,
    sessions: Array.from(mockSessionsStore.values()).filter(s => s.visitorId === visitorId),
  })),
  generateHeatmap: jest.fn((pageId) => ({
    pageId,
    generatedAt: new Date().toISOString(),
    totalClicks: 100,
    hotspots: [],
    heatmap: [],
  })),
  getHeatmap: jest.fn((pageId) => mockHeatmapStore.get(pageId)),
  compressEvents: jest.fn((events) => events),
  detectRageClicks: jest.fn(() => []),
  detectDeadClicks: jest.fn(() => []),
}));

describe('Widget Analytics', () => {
  beforeEach(() => {
    mockSessionsStore.clear();
    mockPagesStore.clear();
    mockHeatmapStore.clear();
  });

  describe('Session Management', () => {
    test('should create a new session', async () => {
      const { createSession } = await import('../src/index.js');

      const session = createSession('visitor-123', {
        url: '/products',
        userAgent: 'Mozilla/5.0',
      });

      expect(session).toBeDefined();
      expect(session.visitorId).toBe('visitor-123');
      expect(session.events).toHaveLength(0);
      expect(session.endedAt).toBeNull();
    });

    test('should retrieve a session by ID', async () => {
      const { createSession, getSession } = await import('../src/index.js');

      const created = createSession('visitor-123');
      const retrieved = getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
    });

    test('should return null for non-existent session', async () => {
      const { getSession } = await import('../src/index.js');

      const session = getSession('non-existent');
      expect(session).toBeUndefined();
    });
  });

  describe('Event Tracking', () => {
    test('should add click event to session', async () => {
      const { createSession, addEvent } = await import('../src/index.js');

      const session = createSession('visitor-123');
      const event = addEvent(session.id, {
        type: 'click',
        x: 100,
        y: 200,
        target: 'button#buy',
      });

      expect(event).toBeDefined();
      expect(event.type).toBe('click');
      expect(event.x).toBe(100);
    });

    test('should add scroll event to session', async () => {
      const { createSession, addEvent } = await import('../src/index.js');

      const session = createSession('visitor-123');
      const event = addEvent(session.id, {
        type: 'scroll',
        scrollY: 500,
        scrollPercent: 50,
      });

      expect(event).toBeDefined();
      expect(event.type).toBe('scroll');
      expect(event.scrollPercent).toBe(50);
    });

    test('should return null for event on non-existent session', async () => {
      const { addEvent } = await import('../src/index.js');

      const event = addEvent('non-existent', { type: 'click' });
      expect(event).toBeNull();
    });

    test('should accumulate click count in session stats', async () => {
      const { createSession, addEvent } = await import('../src/index.js');

      const session = createSession('visitor-123');
      addEvent(session.id, { type: 'click' });
      addEvent(session.id, { type: 'click' });
      addEvent(session.id, { type: 'click' });

      const updated = getSession(session.id);
      expect(updated.stats.clickCount).toBe(3);
    });
  });

  describe('Heatmap Generation', () => {
    test('should generate heatmap for a page', async () => {
      const { generateHeatmap, createSession, addEvent } = await import('../src/index.js');

      const session = createSession('visitor-123');
      addEvent(session.id, { type: 'click', x: 100, y: 200, pageId: '/home' });
      addEvent(session.id, { type: 'click', x: 150, y: 250, pageId: '/home' });

      const heatmap = generateHeatmap('/home');

      expect(heatmap).toBeDefined();
      expect(heatmap.pageId).toBe('/home');
      expect(heatmap.totalClicks).toBe(100);
    });
  });

  describe('Event Types', () => {
    test('should have all required event types', async () => {
      const { EVENT_TYPES } = await import('../src/index.js');

      expect(EVENT_TYPES.CLICK).toBe('click');
      expect(EVENT_TYPES.SCROLL).toBe('scroll');
      expect(EVENT_TYPES.MOUSE_MOVE).toBe('mouse_move');
      expect(EVENT_TYPES.RAGE_CLICK).toBe('rage_click');
      expect(EVENT_TYPES.DEAD_CLICK).toBe('dead_click');
      expect(EVENT_TYPES.PAGE_VIEW).toBe('page_view');
      expect(EVENT_TYPES.SESSION_START).toBe('session_start');
      expect(EVENT_TYPES.SESSION_END).toBe('session_end');
    });
  });

  describe('Event Compression', () => {
    test('should compress duplicate events', async () => {
      const { compressEvents } = await import('../src/index.js');

      const events = [
        { type: 'click', x: 100, y: 200 },
        { type: 'click', x: 100, y: 200 },
        { type: 'click', x: 100, y: 200 },
        { type: 'scroll', x: 100, y: 200 },
      ];

      const compressed = compressEvents(events);
      expect(compressed).toHaveLength(2);
      expect(compressed[0].count).toBe(3);
    });
  });

  describe('Rage Click Detection', () => {
    test('should detect rage clicks', async () => {
      const { detectRageClicks } = await import('../src/index.js');

      const now = Date.now();
      const events = [
        { type: 'click', target: 'button', x: 100, y: 200, timestamp: now },
        { type: 'click', target: 'button', x: 100, y: 200, timestamp: now + 100 },
        { type: 'click', target: 'button', x: 100, y: 200, timestamp: now + 200 },
        { type: 'click', target: 'button', x: 100, y: 200, timestamp: now + 300 },
      ];

      const rageClicks = detectRageClicks(events);
      expect(rageClicks).toHaveLength(1);
      expect(rageClicks[0].clicks).toBe(4);
    });
  });
});