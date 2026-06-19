/**
 * RAZO Intent Router
 * Detects user intents from natural language input
 */

class IntentRouter {
  constructor(logger) {
    this.logger = logger;
    this.intents = this.initializeIntents();
    this.stats = { totalRequests: 0, intentCounts: {} };
  }

  initializeIntents() {
    return {
      // Commerce Intents
      order_food: {
        keywords: ['order', 'pizza', 'food', 'burger', 'meal', 'lunch', 'dinner', 'breakfast', 'delivery', 'dominos', 'zomato', 'swiggy'],
        patterns: [
          /order\s+(.+)/i,
          /book\s+(.+)/i,
          /get\s+me\s+(.+)/i,
          /i\s+want\s+(.+)/i
        ],
        entities: ['item', 'restaurant', 'quantity', 'delivery_address'],
        confidence: 0.95,
        action: 'do-app',
        endpoint: '/api/orders'
      },
      book_hotel: {
        keywords: ['hotel', 'room', 'booking', 'stay', 'accommodation', 'resort', 'guesthouse', 'airbnb'],
        patterns: [
          /book\s+(a\s+)?room\s+at\s+(.+)/i,
          /need\s+(a\s+)?hotel/i,
          /reserve\s+(.+)/i
        ],
        entities: ['hotel_name', 'check_in', 'check_out', 'guests', 'room_type'],
        confidence: 0.93,
        action: 'do-app',
        endpoint: '/api/hotel-booking'
      },
      book_appointment: {
        keywords: ['book', 'appointment', 'schedule', 'slot', 'visit', 'meeting', 'salon', 'spa', 'doctor'],
        patterns: [
          /book\s+(an?\s+)?appointment/i,
          /schedule\s+(a\s+)?(.+)/i,
          /need\s+(a\s+)?(.+)/i
        ],
        entities: ['service', 'provider', 'date', 'time'],
        confidence: 0.90,
        action: 'do-app',
        endpoint: '/api/appointments'
      },
      purchase_subscription: {
        keywords: ['subscribe', 'subscription', 'plan', 'premium', 'membership', 'monthly', 'yearly'],
        patterns: [
          /subscribe\s+to\s+(.+)/i,
          /buy\s+(.+)\s+plan/i,
          /upgrade\s+(.+)/i
        ],
        entities: ['plan_type', 'duration', 'billing_cycle'],
        confidence: 0.88,
        action: 'do-app',
        endpoint: '/api/subscriptions'
      },

      // Financial Intents
      make_payment: {
        keywords: ['pay', 'payment', 'transfer', 'send', 'rupees', '₹', 'amount', 'upi', 'neft', 'imps'],
        patterns: [
          /pay\s+(₹?\d+)\s+(to|for)\s+(.+)/i,
          /transfer\s+(₹?\d+)\s+(to|into)\s+(.+)/i,
          /send\s+(₹?\d+)\s+(to|for)\s+(.+)/i
        ],
        entities: ['amount', 'recipient', 'purpose', 'payment_method'],
        confidence: 0.96,
        action: 'sutar',
        endpoint: '/api/escrow/transfer'
      },
      track_expense: {
        keywords: ['expense', 'spent', 'expense', 'bill', 'cost', 'purchase', 'transaction'],
        patterns: [
          /log\s+(.+)\s+expense/i,
          /add\s+(.+)\s+to\s+expenses/i,
          /track\s+(.+)/i
        ],
        entities: ['amount', 'category', 'merchant', 'date'],
        confidence: 0.89,
        action: 'financial-twin',
        endpoint: '/api/expenses'
      },
      check_balance: {
        keywords: ['balance', 'account', 'available', 'funds', 'money'],
        patterns: [
          /check\s+balance/i,
          /how\s+much\s+(do\s+i\s+have|money)/i,
          /available\s+funds/i
        ],
        entities: ['account_type'],
        confidence: 0.92,
        action: 'financial-twin',
        endpoint: '/api/accounts/balance'
      },
      apply_loan: {
        keywords: ['loan', 'credit', 'borrow', 'lend', 'emi', 'interest'],
        patterns: [
          /apply\s+(for\s+)?loan/i,
          /need\s+credit/i,
          /borrow\s+(.+)/i
        ],
        entities: ['loan_type', 'amount', 'tenure'],
        confidence: 0.87,
        action: 'financial-os',
        endpoint: '/api/loans/apply'
      },

      // Communication Intents
      send_message: {
        keywords: ['send', 'message', 'text', 'whatsapp', 'sms', 'telegram', 'email'],
        patterns: [
          /send\s+(a\s+)?message\s+to\s+(.+)/i,
          /text\s+(.+)\s+(.+)/i,
          /whatsapp\s+(.+)/i
        ],
        entities: ['recipient', 'content', 'channel'],
        confidence: 0.94,
        action: 'channel',
        endpoint: '/api/message/send'
      },
      schedule_meeting: {
        keywords: ['meeting', 'schedule', 'calendar', 'book', 'appointment', 'call', 'zoom', 'google meet'],
        patterns: [
          /schedule\s+(a\s+)?meeting/i,
          /book\s+(a\s+)?(.+)\s+(call|meeting)/i,
          /set\s+up\s+(a\s+)?(.+)/i
        ],
        entities: ['title', 'attendees', 'date', 'time', 'duration', 'platform'],
        confidence: 0.91,
        action: 'calendar',
        endpoint: '/api/events'
      },

      // Information Intents
      ask_genie: {
        keywords: ['genie', 'what', 'how', 'why', 'when', 'where', 'who', 'explain', 'tell', 'find', 'search', 'help'],
        patterns: [
          /what\s+(is|are|was|were)/i,
          /how\s+(to|do|does|can|i)/i,
          /why\s+(is|are|do|does)/i,
          /hey\s+genie/i,
          /ok\s+razo/i
        ],
        entities: ['query', 'context'],
        confidence: 0.85,
        action: 'genie',
        endpoint: '/api/query'
      },
      get_status: {
        keywords: ['status', 'track', 'check', 'where', 'order', 'booking'],
        patterns: [
          /check\s+(.+)\s+status/i,
          /where\s+is\s+(.+)/i,
          /track\s+(.+)/i
        ],
        entities: ['order_id', 'type'],
        confidence: 0.88,
        action: 'do-app',
        endpoint: '/api/status'
      },
      find_service: {
        keywords: ['find', 'search', 'nearby', 'near', 'looking', 'need', 'want'],
        patterns: [
          /find\s+(.+)\s+near\s+(.+)/i,
          /search\s+for\s+(.+)/i,
          /looking\s+(for|to)\s+(.+)/i
        ],
        entities: ['service', 'location'],
        confidence: 0.86,
        action: 'discovery',
        endpoint: '/api/search'
      },
      get_recommendation: {
        keywords: ['recommend', 'suggestion', 'similar', 'also', 'try'],
        patterns: [
          /recommend\s+(.+)/i,
          /suggest\s+(.+)/i,
          /what\s+else/i,
          /similar\s+to\s+(.+)/i
        ],
        entities: ['based_on', 'preferences'],
        confidence: 0.83,
        action: 'copilot',
        endpoint: '/api/recommendations'
      },
      check_availability: {
        keywords: ['available', 'availability', 'slots', 'booked', 'open'],
        patterns: [
          /is\s+(.+)\s+available/i,
          /check\s+availability/i,
          /any\s+(.+)\s+available/i
        ],
        entities: ['service', 'date', 'time'],
        confidence: 0.89,
        action: 'industry-os',
        endpoint: '/api/availability'
      },

      // Action Intents
      track_order: {
        keywords: ['track', 'delivery', 'order', 'shipping', 'arriving', 'eta'],
        patterns: [
          /track\s+(my\s+)?order/i,
          /where\s+is\s+(my\s+)?(.+)/i,
          /delivery\s+status/i
        ],
        entities: ['order_id'],
        confidence: 0.90,
        action: 'do-app',
        endpoint: '/api/orders/track'
      },
      cancel_order: {
        keywords: ['cancel', 'stop', 'abort', 'refund'],
        patterns: [
          /cancel\s+(.+)/i,
          /stop\s+(.+)/i,
          /can\s+i\s+cancel/i
        ],
        entities: ['order_id', 'reason'],
        confidence: 0.91,
        action: 'do-app',
        endpoint: '/api/orders/cancel'
      },
      request_refund: {
        keywords: ['refund', 'money', 'return', 'cancellation'],
        patterns: [
          /refund/i,
          /get\s+(my\s+)?money\s+back/i,
          /return\s+(.+)/i
        ],
        entities: ['order_id', 'amount', 'reason'],
        confidence: 0.88,
        action: 'sutar',
        endpoint: '/api/refunds'
      },
      file_complaint: {
        keywords: ['complaint', 'issue', 'problem', 'not happy', 'disappointed', 'wrong'],
        patterns: [
          /file\s+(a\s+)?complaint/i,
          /(i\s+)?have\s+(an?\s+)?issue/i,
          /not\s+happy\s+(with|about)/i
        ],
        entities: ['order_id', 'issue_type', 'description'],
        confidence: 0.87,
        action: 'support',
        endpoint: '/api/complaints'
      },
      update_profile: {
        keywords: ['update', 'change', 'edit', 'profile', 'information', 'details'],
        patterns: [
          /update\s+(my\s+)?(.+)/i,
          /change\s+(my\s+)?(.+)/i,
          /edit\s+(my\s+)?(.+)/i
        ],
        entities: ['field', 'value'],
        confidence: 0.85,
        action: 'corpid',
        endpoint: '/api/profile'
      },

      // Miscellaneous
      get_insurance: {
        keywords: ['insurance', 'insure', 'policy', 'coverage', 'claim'],
        patterns: [
          /get\s+(.+)\s+insurance/i,
          /insurance\s+(for|on)\s+(.+)/i,
          /quote\s+(for\s+)?(.+)/i
        ],
        entities: ['insurance_type', 'coverage_amount'],
        confidence: 0.86,
        action: 'insurance-os',
        endpoint: '/api/insurance/quote'
      }
    };
  }

  /**
   * Detect intent from user input
   */
  async detect(text, userContext = {}) {
    this.stats.totalRequests++;
    const normalizedText = text.toLowerCase().trim();

    let bestMatch = {
      intent: null,
      confidence: 0,
      entities: {},
      action: null,
      endpoint: null
    };

    // Check each intent
    for (const [intentName, intent] of Object.entries(this.intents)) {
      let matchScore = 0;

      // Keyword matching
      const keywordMatches = intent.keywords.filter(keyword => normalizedText.includes(keyword));
      matchScore += keywordMatches.length * 0.2;

      // Pattern matching
      for (const pattern of intent.patterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          matchScore += 0.4;
          // Extract entities from pattern groups
          if (match.groups) {
            Object.assign(bestMatch.entities, match.groups);
          }
        }
      }

      // Boost score based on keyword matches
      if (matchScore > 0) {
        matchScore = Math.min(matchScore, 1);
        const finalConfidence = matchScore * intent.confidence;

        if (finalConfidence > bestMatch.confidence) {
          bestMatch = {
            intent: intentName,
            confidence: Math.round(finalConfidence * 100) / 100,
            entities: this.extractEntities(normalizedText, intent.entities),
            action: intent.action,
            endpoint: intent.endpoint,
            matchedKeywords: keywordMatches
          };
        }
      }
    }

    // Track stats
    if (bestMatch.intent) {
      this.stats.intentCounts[bestMatch.intent] = (this.stats.intentCounts[bestMatch.intent] || 0) + 1;
    }

    this.logger.info('Intent detected', {
      input: text.substring(0, 50),
      intent: bestMatch.intent,
      confidence: bestMatch.confidence
    });

    return bestMatch;
  }

  /**
   * Extract entities from text based on entity types
   */
  extractEntities(text, entityTypes) {
    const entities = {};

    // Amount extraction (₹, numbers with currency)
    if (entityTypes.includes('amount')) {
      const amountMatch = text.match(/(?:₹|rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d{2})?)/i);
      if (amountMatch) {
        entities.amount = amountMatch[1].replace(/,/g, '');
      }
    }

    // Date extraction
    if (entityTypes.includes('date') || entityTypes.includes('check_in') || entityTypes.includes('check_out')) {
      const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // 15/06/2024
        /(today|tomorrow|day\s+after\s+tomorrow)/i, // Relative dates
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/i  // June 15
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          if (entityTypes.includes('date')) entities.date = match[0];
          if (entityTypes.includes('check_in')) entities.check_in = match[0];
          if (entityTypes.includes('check_out')) entities.check_out = match[0];
        }
      }
    }

    // Time extraction
    if (entityTypes.includes('time') || entityTypes.includes('duration')) {
      const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        entities.time = timeMatch[0];
      }

      const durationMatch = text.match(/(\d+)\s*(hours?|minutes?|hrs?|mins?)/i);
      if (durationMatch) {
        entities.duration = `${durationMatch[1]} ${durationMatch[2]}`;
      }
    }

    // Person/Recipient name extraction
    if (entityTypes.includes('recipient') || entityTypes.includes('attendees')) {
      const recipientMatch = text.match(/(?:to|for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (recipientMatch) {
        if (entityTypes.includes('recipient')) entities.recipient = recipientMatch[1];
        if (entityTypes.includes('attendees')) entities.attendees = [recipientMatch[1]];
      }
    }

    return entities;
  }

  /**
   * Get supported intents
   */
  getIntents() {
    return Object.keys(this.intents);
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      totalRequests: this.stats.totalRequests,
      supportedIntents: Object.keys(this.intents).length,
      topIntents: Object.entries(this.stats.intentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }
}

module.exports = IntentRouter;
