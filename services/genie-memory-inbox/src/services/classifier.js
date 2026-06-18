/**
 * Genie Memory Classifier
 *
 * AI-powered auto-classification of memories into Twins.
 * Maps memories to: Personal, Health, Financial, Relationship, etc.
 */

class MemoryClassifier {
  constructor(config = {}) {
    this.twinEndpoint = config.twinEndpoint || 'http://localhost:4705';
    this.memoryOsEndpoint = config.memoryOsEndpoint || 'http://localhost:4703';

    // Classification rules based on keywords
    this.classificationRules = {
      health: {
        keywords: ['health', 'doctor', 'medicine', 'hospital', 'checkup', 'blood', 'prescription',
          'workout', 'gym', 'exercise', 'run', 'walk', 'sleep', 'headache', 'fever', 'cold',
          'diet', 'weight', 'bmi', 'heart', 'bp', 'sugar', 'vitamin', 'appointment', 'clinic'],
        twinType: 'health',
        confidence: 0.85
      },
      finance: {
        keywords: ['payment', 'invoice', 'bill', 'expense', 'income', 'salary', 'money', 'bank',
          'upi', 'transaction', 'transfer', 'loan', 'emi', 'investment', 'stock', 'mutual fund',
          'insurance', 'tax', 'gst', 'receipt', 'debit', 'credit', 'balance', 'account'],
        twinType: 'financial',
        confidence: 0.85
      },
      personal: {
        keywords: ['personal', 'diary', 'note', 'thought', 'idea', 'feeling', 'remember',
          'goal', 'dream', 'resolution', 'birthday', 'anniversary', 'family', 'friend'],
        twinType: 'personal',
        confidence: 0.80
      },
      work: {
        keywords: ['meeting', 'project', 'deadline', 'client', 'presentation', 'report',
          'email', 'call', 'conference', 'interview', 'pitch', 'proposal', 'contract',
          'team', 'manager', 'office', 'colleague', 'stakeholder', 'kpi', 'revenue'],
        twinType: 'business',
        confidence: 0.80
      },
      travel: {
        keywords: ['flight', 'hotel', 'booking', 'trip', 'travel', 'vacation', 'holiday',
          'visa', 'passport', 'tour', 'destination', 'airbnb', 'reservation', 'checkin',
          'checkout', 'luggage', 'ticket', 'itinerary', 'dubai', 'mumbai', 'delhi', 'bangalore'],
        twinType: 'personal',
        confidence: 0.85
      },
      relationship: {
        keywords: ['friend', 'family', 'mom', 'dad', 'wife', 'husband', 'son', 'daughter',
          'brother', 'sister', 'call', 'meet', 'birthday', 'anniversary', 'gift', 'wish',
          'congratulations', 'sorry', 'thank you', 'love', 'miss'],
        twinType: 'relationship',
        confidence: 0.85
      },
      reminder: {
        keywords: ['remind', 'todo', 'task', 'schedule', 'appointment', 'deadline',
          'don't forget', 'remember to', 'must', 'should', 'need to', 'action item'],
        twinType: 'personal',
        confidence: 0.90,
        isActionable: true
      },
      expense: {
        keywords: ['₹', 'rupees', 'paid', 'cost', 'price', 'bought', 'purchased', 'spent',
          'amount', 'debit', 'credit', 'transaction', 'order', 'delivery', 'fee', 'charge'],
        twinType: 'financial',
        confidence: 0.90,
        isActionable: true
      },
      important: {
        keywords: ['important', 'urgent', 'critical', 'priority', 'asap', 'emergency',
          'flagged', 'starred', 'save', 'keep', 'remember'],
        twinType: 'personal',
        confidence: 0.95,
        priority: 'high'
      }
    };

    // Category suggestions
    this.categorySuggestions = {
      health: ['health'],
      finance: ['finance'],
      travel: ['travel'],
      relationship: ['family', 'personal'],
      work: ['work'],
      important: ['important', 'work']
    };

    // Action detection patterns
    this.actionPatterns = [
      { pattern: /remind\s+me/i, action: 'reminder' },
      { pattern: /call\s+(\w+)/i, action: 'call', extract: (m) => m[1] },
      { pattern: /buy\s+(.+)/i, action: 'purchase', extract: (m) => m[1] },
      { pattern: /send\s+(.+)/i, action: 'send' },
      { pattern: /book\s+(.+)/i, action: 'booking' },
      { pattern: /schedule\s+(.+)/i, action: 'schedule' },
      { pattern: /meeting\s+with\s+(.+)/i, action: 'meeting' },
      { pattern: /pay\s+(₹?\d+)/i, action: 'payment' }
    ];
  }

  /**
   * Classify a memory and suggest Twin/tags/category
   */
  classify(text, options = {}) {
    const { type = 'text', metadata = {} } = options;
    const textLower = text.toLowerCase();

    let bestMatch = null;
    let highestScore = 0;

    // Check each classification rule
    for (const [ruleName, rule] of Object.entries(this.classificationRules)) {
      let score = 0;
      let matchedKeywords = [];

      // Count keyword matches
      for (const keyword of rule.keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      }

      // Calculate confidence
      if (score > 0) {
        const keywordScore = Math.min(score / rule.keywords.length, 1);
        const confidence = rule.confidence * (0.5 + 0.5 * keywordScore);

        if (confidence > highestScore) {
          highestScore = confidence;
          bestMatch = {
            twinType: rule.twinType,
            category: this.categorySuggestions[ruleName]?.[0] || ruleName,
            confidence: Math.round(confidence * 100) / 100,
            matchedKeywords,
            priority: rule.priority || 'normal',
            isActionable: rule.isActionable || false
          };
        }
      }
    }

    // Check for action patterns
    const actions = this.detectActions(text);

    // Extract entities
    const entities = this.extractEntities(text);

    // Generate tags
    const tags = this.generateTags(text, bestMatch);

    // Suggest title
    const title = this.generateTitle(text, type);

    // Determine memory category
    let category = 'personal';
    if (bestMatch) {
      category = bestMatch.category;
    }
    if (metadata.category) {
      category = metadata.category;
    }

    return {
      twinType: bestMatch?.twinType || 'personal',
      category,
      confidence: bestMatch?.confidence || 0.5,
      priority: bestMatch?.priority || 'normal',
      isActionable: bestMatch?.isActionable || actions.length > 0,
      actions,
      entities,
      tags,
      title,
      summary: this.generateSummary(text, type)
    };
  }

  /**
   * Detect action items from text
   */
  detectActions(text) {
    const actions = [];

    for (const { pattern, action } of this.actionPatterns) {
      const match = text.match(pattern);
      if (match) {
        actions.push({
          type: action,
          raw: match[0],
          extracted: match.slice(1)
        });
      }
    }

    return actions;
  }

  /**
   * Extract entities (dates, amounts, people, places)
   */
  extractEntities(text) {
    const entities = {
      dates: [],
      amounts: [],
      people: [],
      places: []
    };

    // Extract dates
    const datePatterns = [
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,  // 15/06/2024
      /\b(today|tomorrow|yesterday|next week|next month)\b/gi,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/gi
    ];

    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        entities.dates.push(...matches);
      }
    }

    // Extract amounts (Indian format)
    const amountPattern = /₹?\s*[\d,]+(?:\.\d{2})?(?:\s*(?:rupees?|rs\.?))?/gi;
    const amounts = text.match(amountPattern);
    if (amounts) {
      entities.amounts = amounts.map(a => a.replace(/[^\d.]/g, ''));
    }

    // Extract people (simple heuristic)
    const afterCall = text.match(/call\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (afterCall) {
      entities.people.push(afterCall[1]);
    }

    // Extract places
    const places = ['home', 'office', 'mumbai', 'delhi', 'bangalore', 'dubai', 'new york', 'london'];
    for (const place of places) {
      if (textLower.includes(place)) {
        entities.places.push(place);
      }
    }

    return entities;
  }

  /**
   * Generate tags based on content
   */
  generateTags(text, classification) {
    const tags = new Set();

    // Add classification tag
    if (classification?.category) {
      tags.add(classification.category);
    }

    // Add keyword-based tags
    const textLower = text.toLowerCase();

    if (/important|urgent|priority/.test(textLower)) tags.add('important');
    if (/follow-up|followup/.test(textLower)) tags.add('follow-up');
    if (/waiting|pending/.test(textLower)) tags.add('waiting');
    if (/idea|thought|concept/.test(textLower)) tags.add('ideas');
    if (/reference|info/.test(textLower)) tags.add('reference');
    if (/review|check/.test(textLower)) tags.add('review');
    if (/meeting|call|conference/.test(textLower)) tags.add('meeting');
    if (/project|task|deadline/.test(textLower)) tags.add('project');

    // Add people mentions as tags
    const personPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    const people = text.match(personPattern);
    if (people) {
      people.slice(0, 3).forEach(p => {
        if (p.length > 2 && p.length < 20) {
          tags.add(p.toLowerCase());
        }
      });
    }

    return Array.from(tags).slice(0, 10);
  }

  /**
   * Generate a title for the memory
   */
  generateTitle(text, type) {
    if (type === 'voice') {
      // For voice, take first meaningful words
      const words = text.split(/\s+/).slice(0, 8);
      return words.join(' ') + (text.split(/\s+/).length > 8 ? '...' : '');
    }

    if (type === 'link') {
      // Extract domain or page title
      const urlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
      if (urlMatch) {
        return urlMatch[1];
      }
    }

    if (type === 'image') {
      return 'Image capture';
    }

    if (text.length <= 100) {
      return text;
    }

    // Truncate long text
    return text.substring(0, 100).trim() + '...';
  }

  /**
   * Generate summary
   */
  generateSummary(text, type) {
    if (text.length <= 200) {
      return text;
    }

    return text.substring(0, 200).trim() + '...';
  }

  /**
   * Batch classify multiple memories
   */
  classifyBatch(items) {
    return items.map(item => ({
      ...item,
      classification: this.classify(item.text || item.content, { type: item.type })
    }));
  }

  /**
   * Re-classify and update twin
   */
  async syncWithTwin(memory, twinEndpoint) {
    const endpoint = twinEndpoint || this.twinEndpoint;

    // In production, this would call the actual Twin API
    try {
      // Simulated Twin sync
      return {
        success: true,
        twinType: memory.classification?.twinType,
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Twin sync failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = MemoryClassifier;
