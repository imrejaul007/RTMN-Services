/**
 * @hojai/razor SDK v2 Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Razor } from '../index.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
    status: 200,
  }) as unknown as Response;
}

describe('Razor SDK v2', () => {
  let razor: Razor;

  beforeEach(() => {
    vi.clearAllMocks();
    razor = new Razor({ baseUrl: 'http://localhost:4299' });
  });

  describe('constructor', () => {
    it('should initialize all clients', () => {
      expect(razor.magic).toBeDefined();
      expect(razor.emotion).toBeDefined();
      expect(razor.voice).toBeDefined();
      expect(razor.i18n).toBeDefined();
      expect(razor.family).toBeDefined();
      expect(razor.pay).toBeDefined();
      expect(razor.life).toBeDefined();
      expect(razor.founder).toBeDefined();
      expect(razor.negotiation).toBeDefined();
      expect(razor.photo).toBeDefined();
      expect(razor.memory).toBeDefined();
      expect(razor.modes).toBeDefined();
    });
  });

  describe('MagicWandClient', () => {
    it('should call /api/magic/help', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        intent: 'order_food',
        text: 'Found 3 options',
        options: [],
        recommended: { id: 'opt1', title: 'Paradise', icon: '🍗' },
        action: 'Order Paradise'
      }));

      const result = await razor.magic.help({ text: 'Order pizza', userId: 'user-1' });

      expect(result.success).toBe(true);
      expect(result.intent).toBe('order_food');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4299/api/magic/help',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call /api/magic/execute', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      await razor.magic.execute({ actionId: 'opt1', userId: 'user-1' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4299/api/magic/execute',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('EmotionClient', () => {
    it('should call /api/emotion/analyze', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        emotion: 'anger',
        intensity: 0.8,
        buttons: []
      }));

      const result = await razor.emotion.analyze({ message: 'This is RIDICULOUS!!' });

      expect(result.emotion).toBe('anger');
      expect(result.intensity).toBe(0.8);
    });
  });

  describe('VoiceClient', () => {
    it('should call /api/voice/stt', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        text: 'Order pizza'
      }));

      const result = await razor.voice.stt({ audio: 'base64audio' });

      expect(result.text).toBe('Order pizza');
    });

    it('should call /api/voice/tts', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        audio: 'base64audio'
      }));

      const result = await razor.voice.tts({ text: 'Hello' });

      expect(result.audio).toBeDefined();
    });

    it('should start voice session', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ sessionId: 'session-123' }));

      const result = await razor.voice.startSession('user-1');

      expect(result.sessionId).toBe('session-123');
    });
  });

  describe('I18nClient', () => {
    it('should detect language', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        language: 'hi',
        confidence: 0.95
      }));

      const result = await razor.i18n.detect('नमस्ते');

      expect(result.language).toBe('hi');
    });

    it('should translate text', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        translated: 'Hello'
      }));

      const result = await razor.i18n.translate({
        text: 'नमस्ते',
        targetLanguage: 'en'
      });

      expect(result.translated).toBe('Hello');
    });

    it('should get greeting', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        greeting: 'Good morning',
        language: 'en',
        timeOfDay: 'morning'
      }));

      const result = await razor.i18n.greeting({ language: 'en' });

      expect(result.greeting).toBe('Good morning');
      expect(result.timeOfDay).toBe('morning');
    });
  });

  describe('FamilyClient', () => {
    it('should generate family reply', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        relationship: 'mother',
        replies: ['हाँ माँ, मैं आ रहा हूँ।'],
        actions: []
      }));

      const result = await razor.family.reply({
        message: 'When are you coming?',
        userId: 'user-1'
      });

      expect(result.relationship).toBe('mother');
      expect(result.replies.length).toBeGreaterThan(0);
    });
  });

  describe('PayClient', () => {
    it('should process voice payment', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        recipient: 'Rahul',
        amount: 500,
        status: 'pending'
      }));

      const result = await razor.pay.voice({
        text: 'Send Rahul 500',
        userId: 'user-1'
      });

      expect(result.recipient).toBe('Rahul');
      expect(result.amount).toBe(500);
    });

    it('should get recent recipients', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        recipients: [{ id: 'r1', name: 'Rahul', lastAmount: 500 }]
      }));

      const result = await razor.pay.recent('user-1');

      expect(result.recipients.length).toBe(1);
      expect(result.recipients[0].name).toBe('Rahul');
    });
  });

  describe('LifeClient', () => {
    it('should get proactive suggestions', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        suggestions: [
          { id: 's1', category: 'travel', title: 'Flight tomorrow', urgency: 'high' }
        ],
        todayCount: 1,
        maxPerDay: 3
      }));

      const result = await razor.life.check({ userId: 'user-1' });

      expect(result.suggestions.length).toBe(1);
      expect(result.todayCount).toBe(1);
    });

    it('should snooze suggestion', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const result = await razor.life.snooze('s1', 24);

      expect(result.success).toBe(true);
    });
  });

  describe('FounderClient', () => {
    it('should generate investor content', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        content: 'Excited to share our progress...',
        metadata: { audience: 'investor', tone: 'confident' }
      }));

      const result = await razor.founder.generate({
        text: 'Weekly metrics',
        audience: 'investor',
        tone: 'confident'
      });

      expect(result.content).toContain('progress');
      expect(result.metadata.audience).toBe('investor');
    });

    it('should get templates', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        templates: [{ id: 'metrics_update', label: '📊 Metrics Update' }]
      }));

      const result = await razor.founder.templates('investor');

      expect(result.templates.length).toBe(1);
    });
  });

  describe('NegotiationClient', () => {
    it('should start negotiation', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        negotiationId: 'neg-123',
        currentOffer: 850,
        sellerPrice: 1000,
        round: 1,
        maxRounds: 5
      }));

      const result = await razor.negotiation.start({
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      expect(result.negotiationId).toBe('neg-123');
      expect(result.currentOffer).toBe(850);
    });

    it('should counter offer', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        status: 'countered',
        sellerCounterOffer: 900
      }));

      const result = await razor.negotiation.counter({
        negotiationId: 'neg-123',
        yourOffer: 850
      });

      expect(result.status).toBe('countered');
      expect(result.sellerCounterOffer).toBe(900);
    });

    it('should accept offer', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        finalPrice: 900,
        discountPercent: 10
      }));

      const result = await razor.negotiation.accept('neg-123');

      expect(result.finalPrice).toBe(900);
      expect(result.discountPercent).toBe(10);
    });
  });

  describe('PhotoClient', () => {
    it('should analyze receipt photo', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        type: 'receipt',
        data: { total: 386, store: 'Dominos' },
        summary: 'Total: ₹386',
        actions: []
      }));

      const result = await razor.photo.analyze({
        imageData: 'base64data',
        photoType: 'receipt'
      });

      expect(result.type).toBe('receipt');
      expect(result.data.total).toBe(386);
    });

    it('should analyze business card', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        type: 'business_card',
        data: { name: 'John Doe', title: 'Engineer' },
        summary: 'John Doe - Engineer',
        actions: []
      }));

      const result = await razor.photo.analyze({
        imageData: 'base64data',
        photoType: 'business_card'
      });

      expect(result.data.name).toBe('John Doe');
    });
  });

  describe('MemoryClient', () => {
    it('should get user context', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        context: { preferences: { language: 'en' } }
      }));

      const result = await razor.memory.getContext('user-1');

      expect(result.context.preferences.language).toBe('en');
    });

    it('should save context', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const result = await razor.memory.saveContext('user-1', { lastMessage: 'Hello' });

      expect(result.success).toBe(true);
    });

    it('should get preferences', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        preferences: { language: 'hi', tone: 'friendly' }
      }));

      const result = await razor.memory.preferences('user-1');

      expect(result.preferences.language).toBe('hi');
    });

    it('should get customer twin', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        twin: { ltv: 50000, segment: 'premium' }
      }));

      const result = await razor.memory.getCustomerTwin('user-1');

      expect(result.twin.ltv).toBe(50000);
    });

    it('should search memory', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        results: [{ type: 'conversation', text: 'Pizza order' }]
      }));

      const result = await razor.memory.search('user-1', 'pizza');

      expect(result.results.length).toBe(1);
    });
  });

  describe('ModesClient', () => {
    it('should get mom mode buttons', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        buttons: [
          { id: 'call_family', icon: '📞', label: 'Call Family' },
          { id: 'reply', icon: '💬', label: 'Reply' }
        ],
        tagline: 'Simple. Fast. Helpful.'
      }));

      const result = await razor.modes.momMode();

      expect(result.buttons.length).toBeGreaterThan(0);
      expect(result.tagline).toBeDefined();
    });

    it('should get action labels', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        actions: {
          god_mode: {
            consumer: { icon: '✨', label: 'Help Me' },
            advanced: { icon: '🧠', label: 'God Mode' }
          }
        }
      }));

      const result = await razor.modes.actions();

      expect(result.actions.god_mode.consumer.label).toBe('Help Me');
    });
  });
});
