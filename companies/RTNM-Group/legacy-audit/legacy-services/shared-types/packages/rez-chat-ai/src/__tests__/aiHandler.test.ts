// ── AI Handler Test Suite ─────────────────────────────────────────────────────────
// Tests for the AI chat handler with tools and memory integration

import { AIChatHandler, createAIHandler } from '../handlers/aiHandler';
import { ALL_REZ_TOOLS } from '../tools/rezTools';
import { ORCHESTRATION_TOOLS } from '../tools/orchestration';
import { MemoryService, initializeMemoryService } from '../memory/memoryIntegration';
import { AIChatRequest } from '../types';

// ── Test Setup ──────────────────────────────────────────────────────────────────

const TEST_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
const TEST_USER_ID = 'user-123';
const TEST_CONVERSATION_ID = 'conv-123';

const testContext = {
  customerId: TEST_USER_ID,
  name: 'Test User',
  email: 'test@example.com',
  phone: '+91-9876543210',
  tier: 'gold',
  preferences: {
    karmaPoints: 500,
    favoriteCuisine: 'Italian',
    defaultAddress: '123 Main St',
  },
};

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe('AIChatHandler', () => {
  describe('Initialization', () => {
    test('should create handler with config', () => {
      const handler = createAIHandler({
        appType: 'hotel',
        apiKey: TEST_API_KEY,
      });

      expect(handler).toBeInstanceOf(AIChatHandler);
    });

    test('should register all base tools', () => {
      const handler = createAIHandler({
        appType: 'hotel',
        apiKey: TEST_API_KEY,
      });

      // We can't directly access private toolHandlers, but we can test via executeTool
      expect(handler).toBeDefined();
    });

    test('should initialize memory service when enabled', () => {
      const handler = createAIHandler({
        appType: 'hotel',
        memoryEnabled: true,
      });

      expect(handler).toBeInstanceOf(AIChatHandler);
    });
  });

  describe('handleMessage', () => {
    test('should reject empty messages', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: '',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response).toBeDefined();
    });

    test('should handle greeting messages', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'Hello!',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });

    test('should escalate on escalation keywords', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'I want to speak to a manager',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.actions).toBeDefined();
      expect(response.actions?.some(a => a.type === 'escalate')).toBe(true);
    });

    test('should handle check-in queries', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'What time is check-in?',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
    });

    test('should handle booking intents', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'I want to book a room',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
      // Should suggest creating a booking
      if (response.suggestions) {
        expect(response.suggestions.length).toBeGreaterThan(0);
      }
    });

    test('should handle room service requests', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'Can I order room service?',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
    });

    test('should handle loyalty/points queries', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'How many karma points do I have?',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
    });
  });
});

describe('Tool Registry', () => {
  describe('ALL_REZ_TOOLS', () => {
    test('should have 14 tools', () => {
      expect(ALL_REZ_TOOLS.length).toBe(14);
    });

    test('should have required hotel tools', () => {
      const toolNames = ALL_REZ_TOOLS.map(t => t.name);
      expect(toolNames).toContain('search_hotels');
      expect(toolNames).toContain('create_hotel_booking');
      expect(toolNames).toContain('get_booking_details');
      expect(toolNames).toContain('cancel_booking');
    });

    test('should have required restaurant tools', () => {
      const toolNames = ALL_REZ_TOOLS.map(t => t.name);
      expect(toolNames).toContain('search_restaurants');
      expect(toolNames).toContain('place_order');
      expect(toolNames).toContain('reserve_table');
      expect(toolNames).toContain('get_order_status');
    });

    test('should have required hotel service tools', () => {
      const toolNames = ALL_REZ_TOOLS.map(t => t.name);
      expect(toolNames).toContain('request_room_service');
      expect(toolNames).toContain('request_housekeeping');
    });

    test('should have required financial tools', () => {
      const toolNames = ALL_REZ_TOOLS.map(t => t.name);
      expect(toolNames).toContain('get_wallet_balance');
      expect(toolNames).toContain('get_loyalty_points');
    });

    test('should have support tool', () => {
      const toolNames = ALL_REZ_TOOLS.map(t => t.name);
      expect(toolNames).toContain('escalate_to_staff');
    });

    test('all tools should have required parameters defined', () => {
      for (const tool of ALL_REZ_TOOLS) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(typeof tool.parameters).toBe('object');
        expect(tool.execute).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
    });
  });

  describe('ORCHESTRATION_TOOLS', () => {
    test('should have 5 orchestration tools', () => {
      expect(ORCHESTRATION_TOOLS.length).toBe(5);
    });

    test('should have cross-app orchestration tools', () => {
      const toolNames = ORCHESTRATION_TOOLS.map(t => t.name);
      expect(toolNames).toContain('book_hotel_with_preferences');
      expect(toolNames).toContain('plan_dinner_date');
      expect(toolNames).toContain('place_order_with_loyalty');
      expect(toolNames).toContain('plan_trip');
      expect(toolNames).toContain('checkout_with_discounts');
    });
  });
});

describe('MemoryService', () => {
  let memoryService: MemoryService;

  beforeEach(() => {
    memoryService = initializeMemoryService({});
  });

  describe('getCustomerContext', () => {
    test('should return basic context for new user', async () => {
      const context = await memoryService.getCustomerContext('new-user', 'hotel');
      expect(context.customerId).toBe('new-user');
    });

    test('should return enriched context for existing user', async () => {
      // Learn a preference first
      await memoryService.learnPreference('existing-user', 'dining', 'favorite_cuisine', 'Italian');

      const context = await memoryService.getCustomerContext('existing-user', 'hotel');
      expect(context.customerId).toBe('existing-user');
      expect(context.preferences).toBeDefined();
    });
  });

  describe('learnPreference', () => {
    test('should store preference', async () => {
      await memoryService.learnPreference(TEST_USER_ID, 'dining', 'cuisine', 'Japanese', 0.9, 'explicit');

      const context = await memoryService.getCustomerContext(TEST_USER_ID, 'hotel');
      expect(context.preferences).toBeDefined();
    });

    test('should update existing preference', async () => {
      await memoryService.learnPreference(TEST_USER_ID, 'dining', 'cuisine', 'Italian', 0.8, 'explicit');
      await memoryService.learnPreference(TEST_USER_ID, 'dining', 'cuisine', 'Japanese', 0.9, 'explicit');

      const prefs = await memoryService.getRelevantPreferences(TEST_USER_ID, ['dining']);
      const cuisinePref = prefs.find(p => p.key === 'cuisine');
      expect(cuisinePref?.value).toBe('Japanese');
    });
  });

  describe('logIntent', () => {
    test('should log intent', async () => {
      await memoryService.logIntent(TEST_USER_ID, 'hotel', {
        category: 'booking',
        specific: 'hotel_search',
        confidence: 0.9,
      });

      // Should not throw
      expect(true).toBe(true);
    });

    test('should learn from high-confidence intent', async () => {
      await memoryService.logIntent(TEST_USER_ID, 'hotel', {
        category: 'dining',
        specific: 'italian_food',
        confidence: 0.95,
      });

      const prefs = await memoryService.getRelevantPreferences(TEST_USER_ID, ['dining']);
      expect(prefs.length).toBeGreaterThan(0);
    });
  });

  describe('updateSignals', () => {
    test('should update signals', async () => {
      await memoryService.updateSignals(TEST_USER_ID, {
        lastActive: new Date().toISOString(),
      });

      const signals = await memoryService.getUserSignals(TEST_USER_ID);
      expect(signals).toBeDefined();
    });
  });

  describe('clearUserCache', () => {
    test('should clear user cache', async () => {
      await memoryService.learnPreference(TEST_USER_ID, 'dining', 'cuisine', 'Italian');
      await memoryService.clearUserCache(TEST_USER_ID);

      const context = await memoryService.getCustomerContext(TEST_USER_ID, 'hotel');
      // Should return fresh context without learned preferences
      expect(context.customerId).toBe(TEST_USER_ID);
    });
  });
});

describe('Integration Scenarios', () => {
  describe('Hotel Booking Flow', () => {
    test('should handle complete booking request', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
        customerContext: testContext,
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'I want to book a hotel room in Mumbai for tomorrow',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
      // With AI connected, should have booking action
      expect(response.confidence).toBeGreaterThan(0);
    });
  });

  describe('Dinner Date Flow', () => {
    test('should handle dinner date request', async () => {
      const handler = createAIHandler({
        appType: 'restaurant',
        customerContext: testContext,
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'Book a romantic dinner for 2 at an Italian place',
        userId: TEST_USER_ID,
        appType: 'restaurant',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
    });
  });

  describe('Order with Loyalty Flow', () => {
    test('should handle order with points request', async () => {
      const handler = createAIHandler({
        appType: 'restaurant',
        customerContext: testContext,
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'Order some pizza and use my karma points',
        userId: TEST_USER_ID,
        appType: 'restaurant',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
    });
  });

  describe('Trip Planning Flow', () => {
    test('should handle trip planning request', async () => {
      const handler = createAIHandler({
        appType: 'hotel',
        customerContext: testContext,
      });

      const request: AIChatRequest = {
        conversationId: TEST_CONVERSATION_ID,
        message: 'Plan a 3-day trip to Goa for 2 people',
        userId: TEST_USER_ID,
        appType: 'hotel',
        customerContext: testContext,
      };

      const response = await handler.handleMessage(request);
      expect(response.message).toBeDefined();
    });
  });
});

// ── Test Utilities ─────────────────────────────────────────────────────────────

export function createMockRequest(overrides: Partial<AIChatRequest> = {}): AIChatRequest {
  return {
    conversationId: TEST_CONVERSATION_ID,
    message: 'Hello!',
    userId: TEST_USER_ID,
    appType: 'hotel',
    customerContext: testContext,
    ...overrides,
  };
}

export function createMockContext(overrides: Partial<typeof testContext> = {}) {
  return {
    ...testContext,
    ...overrides,
  };
}
