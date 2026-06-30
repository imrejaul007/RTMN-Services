/**
 * Magic Wand - The one-tap "Help Me" button
 *
 * RAZO's signature consumer feature. One button, RAZO figures out everything.
 *
 * Examples:
 * - "Need hotel for tomorrow" → finds 3 hotels, recommends best, one-tap book
 * - "Dad's birthday next week" → 3 ideas, one-tap do all
 * - "Need medicine" → 3 pharmacies, one-tap order
 *
 * The 3 Golden Rules:
 * 1. Never make users type if tapping is possible
 * 2. Never make users think if RAZO can infer
 * 3. Never make users open another app if RAZO can execute
 */

const { v4: uuidv4 } = require('uuid');

class MagicWand {
  constructor({ intentRouter, contextEngine, actionEngine, logger }) {
    this.intentRouter = intentRouter;
    this.contextEngine = contextEngine;
    this.actionEngine = actionEngine;
    this.logger = logger;

    // Smart ranking weights
    this.weights = {
      distance: 0.3,      // closer = better
      price: 0.2,         // fits budget = better
      rating: 0.2,        // higher = better
      history: 0.2,       // user has used before = better
      availability: 0.1   // available now = better
    };

    this.stats = {
      totalInvocations: 0,
      successfulRecommendations: 0,
      oneTapCompletions: 0,
      avgOptionsShown: 0
    };
  }

  /**
   * Main entry point - "Help Me"
   * Detects intent, gathers context, finds options, recommends best
   */
  async helpMe({ text, userId, sessionId, language = 'en' }) {
    this.stats.totalInvocations++;
    const requestId = uuidv4();

    this.logger.info('MagicWand invoked', { requestId, userId, text: text?.slice(0, 50) });

    try {
      // 1. Detect intent
      const intentResult = await this.intentRouter.detect(text, userId);
      // IntentRouter returns { intent, confidence, entities, action, endpoint }
      // Some test mocks may wrap it differently - support both shapes
      const intent = intentResult.intent || intentResult.data?.intent || 'unknown';

      // 2. Get or create session
      const { session, created } = this.contextEngine.getOrCreateSession(sessionId, userId);

      // 3. Gather full context
      const context = await this._gatherContext(userId, session);

      // 4. Extract entities from text
      const entities = await this._extractEntities(text, intent, context);

      // 5. Find options (3 max)
      const options = await this._findOptions(intent, entities, context);

      // 6. Rank options
      const ranked = this._rankOptions(options, context);

      // 7. Build response with action button
      const response = this._buildResponse({
        intent,
        entities,
        ranked,
        context,
        language,
        text
      });

      // 8. Update session
      this.contextEngine.updateContext(session.id, {
        lastIntent: intent,
        lastMagicWandResponse: response
      });

      this.stats.successfulRecommendations++;
      this.stats.avgOptionsShown =
        (this.stats.avgOptionsShown * (this.stats.totalInvocations - 1) + ranked.length) /
        this.stats.totalInvocations;

      return {
        success: true,
        requestId,
        ...response
      };
    } catch (error) {
      this.logger.error('MagicWand error', { requestId, error: error.message });
      return {
        success: false,
        requestId,
        error: {
          code: 'MAGIC_WAND_FAILED',
          message: 'I could not understand that. Try rephrasing?',
          details: error.message
        }
      };
    }
  }

  /**
   * Execute the recommended action (one-tap completion)
   */
  async executeRecommended({ requestId, userId, sessionId }) {
    const session = this.contextEngine.getSession(sessionId);
    if (!session?.context?.lastMagicWandResponse) {
      return { success: false, error: { code: 'NO_PENDING', message: 'No pending action' } };
    }

    const last = session.context.lastMagicWandResponse;
    const recommended = last.recommended;

    if (!recommended) {
      return { success: false, error: { code: 'NO_RECOMMENDATION', message: 'No recommendation found' } };
    }

    this.logger.info('One-tap execution', { requestId, userId, action: recommended.action });

    try {
      const result = await this.actionEngine.execute(
        { intent: last.intent, action: recommended.actionService, endpoint: recommended.endpoint },
        recommended.entities || {},
        { userId, sessionId }
      );

      this.stats.oneTapCompletions++;

      return {
        success: true,
        requestId,
        message: recommended.confirmationMessage || 'Done!',
        result
      };
    } catch (error) {
      this.logger.error('One-tap execution failed', { requestId, error: error.message });
      return {
        success: false,
        requestId,
        error: {
          code: 'EXECUTION_FAILED',
          message: 'Could not complete the action. Please try again.',
          details: error.message
        }
      };
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────

  async _gatherContext(userId, session) {
    return {
      userId,
      sessionId: session?.id,
      timeOfDay: this._getTimeOfDay(),
      preferences: session?.context?.userPreferences || {},
      // These would come from real services in production
      location: session?.context?.locationContext || { city: 'Bangalore', lat: 12.97, lng: 77.59 },
      budget: 3000,
      language: session?.context?.userPreferences?.language || 'en',
      // Mock data that would come from TwinOS + MemoryOS
      recentOrders: [],
      favoriteRestaurants: ['Paradise Biryani', 'Empire Restaurant'],
      familyMembers: [
        { id: 'mom', name: 'Mom', relation: 'mother', language: 'hi' },
        { id: 'dad', name: 'Dad', relation: 'father', language: 'hi' }
      ]
    };
  }

  async _extractEntities(text, intent, context) {
    const entities = {};

    // Extract amount for payments
    const amountMatch = text?.match(/(\d+)\s*(rupees?|₹|rs\.?)?/i);
    if (amountMatch) {
      entities.amount = parseInt(amountMatch[1]);
    }

    // Extract recipient
    const recipientPatterns = [
      /to\s+([A-Z][a-z]+)/i,
      /for\s+([A-Z][a-z]+)/i,
      /pay\s+([A-Z][a-z]+)/i,
      /send\s+([A-Z][a-z]+)/i,
      /([A-Z][a-z]+)\s+ko\b/i  // Hinglish "Rahul ko"
    ];
    for (const pattern of recipientPatterns) {
      const match = text?.match(pattern);
      if (match) {
        entities.recipient = match[1];
        break;
      }
    }

    // Extract item (food, hotel, etc.)
    const itemPatterns = [
      /(?:order|book|need|want)\s+(?:a\s+|an\s+)?(.+?)(?:\s+from|\s+at|\s+for|\s*$)/i
    ];
    for (const pattern of itemPatterns) {
      const match = text?.match(pattern);
      if (match) {
        entities.item = match[1].trim();
        break;
      }
    }

    // Time-related
    if (text?.match(/\btonight|today|tomorrow|now|asap\b/i)) {
      entities.urgency = 'immediate';
    }

    return entities;
  }

  async _findOptions(intent, entities, context) {
    // In production, this would call the actual service to find options
    // For now, return mock options based on intent type
    const text = entities?.originalText || context?.text || '';

    const mockOptions = {
      order_food: [
        {
          id: 'opt1',
          title: 'Paradise Biryani',
          subtitle: 'You ordered 12 times · ⭐⭐⭐⭐⭐',
          icon: '🍗',
          price: 420,
          distance: 2.3,
          rating: 4.8,
          history: 12,
          available: true,
          action: 'order_food',
          actionService: 'do-app',
          endpoint: '/api/orders',
          entities: { restaurant: 'Paradise Biryani', items: ['Chicken Biryani', 'Raita', 'Gulab Jamun'] },
          confirmationMessage: 'Order placed! Arriving in 30 minutes.'
        },
        {
          id: 'opt2',
          title: 'Meghana Foods',
          subtitle: 'Famous for biryani · ⭐⭐⭐⭐',
          icon: '🍛',
          price: 380,
          distance: 3.1,
          rating: 4.5,
          history: 0,
          available: true,
          action: 'order_food',
          actionService: 'do-app',
          endpoint: '/api/orders',
          entities: { restaurant: 'Meghana Foods', items: ['Chicken Biryani'] },
          confirmationMessage: 'Order placed! Arriving in 35 minutes.'
        },
        {
          id: 'opt3',
          title: 'Behrouz Biryani',
          subtitle: 'Premium biryani · ⭐⭐⭐⭐⭐',
          icon: '🍱',
          price: 520,
          distance: 4.0,
          rating: 4.7,
          history: 0,
          available: true,
          action: 'order_food',
          actionService: 'do-app',
          endpoint: '/api/orders',
          entities: { restaurant: 'Behrouz Biryani', items: ['Chicken Biryani'] },
          confirmationMessage: 'Order placed! Arriving in 40 minutes.'
        }
      ],
      book_hotel: [
        {
          id: 'h1',
          title: 'Ginger Hotel',
          subtitle: '2.3 km away · ⭐⭐⭐',
          icon: '🏨',
          price: 2500,
          distance: 2.3,
          rating: 3.8,
          history: 0,
          available: true,
          action: 'book_hotel',
          actionService: 'do-app',
          endpoint: '/api/hotel-booking',
          entities: { hotel_name: 'Ginger Hotel', check_in: 'tomorrow', guests: 1 },
          confirmationMessage: 'Hotel booked! Confirmation sent to your WhatsApp.'
        },
        {
          id: 'h2',
          title: 'Treebo Trend',
          subtitle: '3.1 km away · ⭐⭐⭐⭐',
          icon: '🏩',
          price: 2900,
          distance: 3.1,
          rating: 4.2,
          history: 0,
          available: true,
          action: 'book_hotel',
          actionService: 'do-app',
          endpoint: '/api/hotel-booking',
          entities: { hotel_name: 'Treebo Trend', check_in: 'tomorrow', guests: 1 },
          confirmationMessage: 'Hotel booked! Confirmation sent.'
        },
        {
          id: 'h3',
          title: 'OYO Rooms',
          subtitle: '1.8 km away · ⭐⭐',
          icon: '🏨',
          price: 1800,
          distance: 1.8,
          rating: 3.5,
          history: 0,
          available: true,
          action: 'book_hotel',
          actionService: 'do-app',
          endpoint: '/api/hotel-booking',
          entities: { hotel_name: 'OYO', check_in: 'tomorrow', guests: 1 },
          confirmationMessage: 'Hotel booked!'
        }
      ],
      make_payment: [
        {
          id: 'p1',
          title: `Pay ₹${entities.amount || 500} via UPI`,
          subtitle: 'Instant · Free · Recommended',
          icon: '💸',
          price: 0,
          distance: 0,
          rating: 5.0,
          history: 50,
          available: true,
          action: 'make_payment',
          actionService: 'sutar',
          endpoint: '/api/escrow/transfer',
          entities: { amount: entities.amount || 500, recipient: entities.recipient, method: 'upi' },
          confirmationMessage: `Sent ₹${entities.amount || 500} to ${entities.recipient || 'recipient'} via UPI.`
        }
      ],
      unknown: [
        {
          id: 'help1',
          title: 'I am not sure what you need',
          subtitle: 'Try: Order food, book hotel, send money, remind me...',
          icon: '🤔',
          action: 'help',
          actionService: 'genie',
          endpoint: '/api/query',
          entities: { query: text },
          confirmationMessage: 'Here are some things I can help with.'
        }
      ]
    };

    return mockOptions[intent] || mockOptions.unknown;
  }

  _rankOptions(options, context) {
    return options.map(option => {
      let score = 0;

      // History boost (user has used this before)
      if (option.history && option.history > 0) {
        score += option.history * this.weights.history;
      }

      // Rating
      if (option.rating) {
        score += (option.rating / 5) * this.weights.rating * 10;
      }

      // Distance (closer = better)
      if (option.distance !== undefined) {
        const distanceScore = Math.max(0, 10 - option.distance) / 10;
        score += distanceScore * this.weights.distance * 10;
      }

      // Price (if budget known)
      if (option.price !== undefined && context.budget) {
        if (option.price <= context.budget) {
          score += this.weights.price * 10;
        } else {
          score -= 5; // Over budget penalty
        }
      }

      // Availability
      if (option.available) {
        score += this.weights.availability * 10;
      }

      return { ...option, score };
    }).sort((a, b) => b.score - a.score);
  }

  _buildResponse({ intent, entities, ranked, context, language, text }) {
    if (!ranked || ranked.length === 0) {
      return {
        intent,
        entities,
        originalText: text,
        text: "I couldn't find anything. Try a different request?",
        options: [],
        recommended: null,
        action: null
      };
    }

    const recommended = ranked[0];

    // Generate natural language response
    let responseText = '';
    let action = '';

    if (ranked.length === 1) {
      // Single option - just show it
      responseText = `${recommended.icon} ${recommended.title}. ${recommended.subtitle || ''}`.trim();
      action = `Confirm`;
    } else if (recommended.history && recommended.history > 0) {
      // User has history with this
      responseText = `I found ${ranked.length} options. You usually go with ${recommended.title}.`;
      action = `Order ${recommended.title.split(' ')[0]}`;
    } else {
      responseText = `I found ${ranked.length} options nearby.`;
      action = `Book Best One`;
    }

    return {
      intent,
      entities,
      originalText: text,
      text: responseText,
      options: ranked.map((opt, idx) => ({
        id: opt.id,
        rank: idx + 1,
        title: opt.title,
        subtitle: opt.subtitle,
        icon: opt.icon,
        price: opt.price,
        distance: opt.distance,
        rating: opt.rating,
        history: opt.history,
        score: opt.score,
        isRecommended: idx === 0,
        action: opt.id === recommended.id ? action : 'Choose'
      })),
      recommended: {
        id: recommended.id,
        title: recommended.title,
        icon: recommended.icon,
        actionService: recommended.actionService,
        endpoint: recommended.endpoint,
        entities: recommended.entities,
        confirmationMessage: recommended.confirmationMessage
      },
      action, // Primary one-tap button label
      primaryAction: action,
      language
    };
  }

  _getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      oneTapRate: this.stats.totalInvocations > 0
        ? (this.stats.oneTapCompletions / this.stats.totalInvocations * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

module.exports = MagicWand;