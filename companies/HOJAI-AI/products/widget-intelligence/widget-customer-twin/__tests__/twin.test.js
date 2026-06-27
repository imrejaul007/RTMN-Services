/**
 * Widget Customer Twin - Tests
 */

import { jest } from '@jest/globals';

// Mock stores
const mockTwinsStore = new Map();
const mockSignalHistoryStore = new Map();

jest.unstable_mockModule('../src/index.js', () => ({
  twinsStore: mockTwinsStore,
  signalHistoryStore: mockSignalHistoryStore,
  createEmptyTwin: jest.fn((visitorId) => ({
    visitorId,
    identity: { identified: false },
    behavior: { visitCount: 0 },
    signals: { leadScore: 0 },
    predictive: {},
    consent: {},
    metadata: { createdAt: Date.now() },
  })),
  getTwin: jest.fn((visitorId) => {
    if (!mockTwinsStore.has(visitorId)) {
      mockTwinsStore.set(visitorId, {
        visitorId,
        identity: { identified: false, name: null, email: null },
        behavior: { visitCount: 0, pagesViewed: [], purchases: [], totalSpent: 0 },
        signals: { leadScore: 0, intentLevel: 'browsing', churnRisk: 'active', ltv: 0 },
        predictive: { nextBestAction: null },
        consent: { marketing: false, whatsapp: false },
        metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      });
    }
    return mockTwinsStore.get(visitorId);
  }),
  identifyVisitor: jest.fn((visitorId, data) => {
    const twin = mockTwinsStore.get(visitorId) || {};
    twin.identity = { ...twin.identity, ...data, identified: !!data.email || !!data.phone };
    return twin;
  }),
  recordSignal: jest.fn((visitorId, signalData) => {
    if (!mockSignalHistoryStore.has(visitorId)) {
      mockSignalHistoryStore.set(visitorId, []);
    }
    mockSignalHistoryStore.get(visitorId).push({ ...signalData, timestamp: Date.now() });
    const twin = mockTwinsStore.get(visitorId) || {};
    twin.signals = { ...twin.signals, leadScore: (twin.signals?.leadScore || 0) + 10 };
    return twin;
  }),
}));

describe('Widget Customer Twin', () => {
  beforeEach(() => {
    mockTwinsStore.clear();
    mockSignalHistoryStore.clear();
  });

  describe('Twin Creation', () => {
    test('should create empty twin for new visitor', async () => {
      const { getTwin } = await import('../src/index.js');

      const twin = getTwin('new-visitor-123');
      expect(twin).toBeDefined();
      expect(twin.visitorId).toBe('new-visitor-123');
    });

    test('should return existing twin for known visitor', async () => {
      const { getTwin } = await import('../src/index.js');

      const twin1 = getTwin('visitor-123');
      twin1.identity.name = 'John Doe';

      const twin2 = getTwin('visitor-123');
      expect(twin2.identity.name).toBe('John Doe');
    });
  });

  describe('Visitor Identification', () => {
    test('should identify visitor with email', async () => {
      const { getTwin, identifyVisitor } = await import('../src/index.js');

      getTwin('visitor-123');
      const twin = identifyVisitor('visitor-123', {
        email: 'john@example.com',
        name: 'John Doe',
      });

      expect(twin.identity.email).toBe('john@example.com');
      expect(twin.identity.name).toBe('John Doe');
      expect(twin.identity.identified).toBe(true);
    });

    test('should not mark as identified without email or phone', async () => {
      const { getTwin, identifyVisitor } = await import('../src/index.js');

      getTwin('visitor-123');
      const twin = identifyVisitor('visitor-123', { name: 'John' });

      expect(twin.identity.identified).toBe(false);
    });
  });

  describe('Signal Recording', () => {
    test('should record page view signal', async () => {
      const { getTwin, recordSignal } = await import('../src/index.js');

      getTwin('visitor-123');
      const twin = recordSignal('visitor-123', {
        type: 'page_view',
        pageId: '/products/widget',
      });

      expect(mockSignalHistoryStore.get('visitor-123')).toHaveLength(1);
      expect(twin.signals.leadScore).toBe(10);
    });

    test('should accumulate lead score from multiple signals', async () => {
      const { getTwin, recordSignal } = await import('../src/index.js');

      getTwin('visitor-123');
      recordSignal('visitor-123', { type: 'page_view' });
      recordSignal('visitor-123', { type: 'product_view' });
      const twin = recordSignal('visitor-123', { type: 'add_to_cart' });

      expect(mockSignalHistoryStore.get('visitor-123')).toHaveLength(3);
      expect(twin.signals.leadScore).toBe(30);
    });
  });

  describe('Intent Level', () => {
    test('should classify low intent correctly', async () => {
      const { getTwin, recordSignal } = await import('../src/index.js');

      getTwin('visitor-123');
      recordSignal('visitor-123', { type: 'page_view' });
      recordSignal('visitor-123', { type: 'page_view' });
      const twin = recordSignal('visitor-123', { type: 'page_view' });

      expect(twin.signals.intentLevel).toBe('browsing');
    });
  });
});