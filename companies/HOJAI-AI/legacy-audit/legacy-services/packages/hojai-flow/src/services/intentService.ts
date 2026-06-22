/**
 * Hojai Flow - Intent Detection Service
 *
 * Fast intent classification (1-10ms target)
 * Runs locally for low latency
 */

export enum IntentType {
  DICTATION = 'DICTATION',
  QUERY = 'QUERY',
  ACTION = 'ACTION',
  WORKFLOW = 'WORKFLOW',
  AGENT = 'AGENT',
  MULTI_AGENT = 'MULTI_AGENT',
  UNKNOWN = 'UNKNOWN',
}

export interface IntentResult {
  type: IntentType;
  confidence: number;
  entities: Record<string, string>;
  suggestedAction?: string;
  metadata?: Record<string, unknown>;
}

export interface IntentPattern {
  type: IntentType;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}

// Intent patterns for classification
const INTENT_PATTERNS: IntentPattern[] = [
  {
    type: IntentType.DICTATION,
    patterns: [
      /^write (an? )?(email|message|note|letter|sms)/i,
      /^create (an? )?(email|message|note|document)/i,
      /^draft/i,
      /^type/i,
      /^send.*(message|email|sms|text)/i,
    ],
    keywords: ['write', 'draft', 'type', 'create note', 'create message', 'compose'],
    weight: 1.0,
  },
  {
    type: IntentType.QUERY,
    patterns: [
      /^what (is|are|was|were|does|do|did|will|would|can|could|should)/i,
      /^how (do|does|did|is|are|was|were|can|could|would|should)/i,
      /^when (is|are|was|were|do|does|did|will|would|can)/i,
      /^where (is|are|was|were|do|does|did|will|would|can)/i,
      /^why (is|are|was|were|do|does|did|will|would|can)/i,
      /^who (is|are|was|were|do|does|did|will|would|can)/i,
      /^show (me )?(me )?(the )?(customer|order|details|information)/i,
      /^tell me (about|what|how)/i,
      /^find (me )?(the )?(customer|order|product)/i,
      /^search (for )?(customer|order|product)/i,
      /^get (me )?(the )?(customer|order|details)/i,
    ],
    keywords: ['what', 'how', 'when', 'where', 'why', 'who', 'show', 'tell', 'find', 'search', 'get', 'lookup', 'check'],
    weight: 1.0,
  },
  {
    type: IntentType.ACTION,
    patterns: [
      /^create (an? )?(order|lead|customer|contact|ticket|invoice)/i,
      /^add (a )?(new )?(customer|product|item)/i,
      /^update (the )?(customer|order|status)/i,
      /^delete (the )?(customer|order|item)/i,
      /^send (an? )?(email|message|notification)/i,
      /^schedule (a )?(meeting|call|appointment)/i,
      /^call (the )?(customer|client)/i,
      /^book (a )?(slot|appointment|table|order)/i,
      /^confirm/i,
      /^approve/i,
      /^reject/i,
      /^complete/i,
      /^start (a )?(process|workflow)/i,
    ],
    keywords: ['create', 'add', 'update', 'delete', 'remove', 'send', 'schedule', 'call', 'book', 'confirm', 'approve', 'reject', 'complete', 'start', 'do it', 'execute'],
    weight: 1.0,
  },
  {
    type: IntentType.WORKFLOW,
    patterns: [
      /^run (the )?(business|sales|marketing)?(review|report|analysis)/i,
      /^generate (a )?(report|summary|analysis)/i,
      /^create (a )?(campaign|workflow|automation)/i,
      /^schedule (a )?(report|digest|summary)/i,
      /^automate/i,
      /^set up (a )?(workflow|automation|process)/i,
      /^run (a )?(follow-?up|nurture|campaign)/i,
    ],
    keywords: ['run report', 'generate', 'create campaign', 'workflow', 'automate', 'schedule report', 'daily digest', 'weekly summary'],
    weight: 1.2,
  },
  {
    type: IntentType.AGENT,
    patterns: [
      /^have (the )?(sales|support|hr|reception)? ?agent/i,
      /^let (the )?(bot|agent|assistant) (handle|take care of|call|email|reach out)/i,
      /^assign (to|this)? ?(agent|bot)/i,
      /^transfer (to|this)? ?(agent|bot|support|agent)/i,
      /^follow up (with|on)? ?(customer|lead|client)/i,
      /^reach out (to|this)? ?(customer|lead|prospect)/i,
      /^contact (the )?(customer|lead|client)/i,
      /^handle (by)? ?(agent|support|bot)/i,
    ],
    keywords: ['agent', 'bot', 'follow up', 'reach out', 'contact', 'assign', 'transfer', 'let handle'],
    weight: 1.3,
  },
  {
    type: IntentType.MULTI_AGENT,
    patterns: [
      /^run (a )?(full|complete|comprehensive)? ?(business|company|team)? ?(review|analysis|audit)/i,
      /^coordinated? ?(effort|action|response)/i,
      /^team (up|send|dispatch)/i,
      /^deploy (multiple )?(agents|team)/i,
      /^cross.?functional (review|team|task)/i,
      /^end.?to.?end (process|solution|workflow)/i,
    ],
    keywords: ['full review', 'comprehensive', 'team review', 'multiple agents', 'cross-functional', 'end-to-end'],
    weight: 1.5,
  },
];

// Entity extraction patterns
const ENTITY_PATTERNS: Record<string, RegExp[]> = {
  customerName: [/(?:customer|client|user|person|contact)\s+(?:named|called)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i],
  orderId: [/order\s*#?\s*([A-Z0-9-]+)/i, /(?:order|PO)\s*(?:id|num|#)\s*[:\s]*([A-Z0-9-]+)/i],
  amount: [/(?:₹|rs\.?|INR|dollars?|usd)?\s*([\d,]+(?:\.\d{2})?)\s*(?:rupees?|rs\.?|dollars?|usd)?/i],
  date: [/(?:on|for|by|date)?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i, /(?:on|for|by)?\s*((?:today|tomorrow|yesterday|next\s+\w+))/i],
  email: [/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i],
  phone: [/(\+?91?\s*[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}/i],
  productName: [/(?:product|item|product)\s+(?:named|called)?\s*([A-Z][a-zA-Z0-9\s]+?)(?:\s|,|$)/i],
};

export class IntentService {
  private patterns: IntentPattern[];
  private entityPatterns: Record<string, RegExp[]>;
  private contextCache: Map<string, IntentResult>;

  constructor() {
    this.patterns = INTENT_PATTERNS;
    this.entityPatterns = ENTITY_PATTERNS;
    this.contextCache = new Map();
  }

  /**
   * Detect intent from text (target: 1-10ms)
   */
  detect(text: string, context?: Record<string, unknown>): IntentResult {
    const startTime = Date.now();
    const normalizedText = text.trim().toLowerCase();
    const originalText = text.trim();

    // Check context cache first
    const cacheKey = `${normalizedText.slice(0, 50)}:${JSON.stringify(context || {})}`;
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    // Use context hints if available
    if (context?.currentApp) {
      const contextIntent = this.detectFromContext(originalText, context);
      if (contextIntent.confidence > 0.9) {
        return contextIntent;
      }
    }

    // Pattern matching
    const scores = new Map<IntentType, number>();

    for (const pattern of this.patterns) {
      let matchScore = 0;

      // Check regex patterns
      for (const regex of pattern.patterns) {
        if (regex.test(originalText)) {
          matchScore += pattern.weight;
        }
      }

      // Check keywords
      for (const keyword of pattern.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          matchScore += pattern.weight * 0.5;
        }
      }

      if (matchScore > 0) {
        scores.set(pattern.type, matchScore);
      }
    }

    // Find best match
    let bestType: IntentType = IntentType.UNKNOWN;
    let bestScore = 0;

    for (const [type, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    // Calculate confidence
    const totalScore = Array.from(scores.values()).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? bestScore / totalScore : 0;

    // Extract entities
    const entities = this.extractEntities(originalText);

    // Generate suggested action
    const suggestedAction = this.getSuggestedAction(bestType, entities);

    const result: IntentResult = {
      type: bestType,
      confidence,
      entities,
      suggestedAction,
      metadata: {
        processingTime: Date.now() - startTime,
        scores: Object.fromEntries(scores),
      },
    };

    // Cache result
    if (this.contextCache.size > 1000) {
      // Clear oldest entries
      const firstKey = this.contextCache.keys().next().value;
      if (firstKey) this.contextCache.delete(firstKey);
    }
    this.contextCache.set(cacheKey, result);

    return result;
  }

  /**
   * Detect intent from context hints
   */
  private detectFromContext(text: string, context: Record<string, unknown>): IntentResult {
    const { currentApp, recentActions } = context;

    // If in dictation mode, prioritize dictation
    if (currentApp === 'notes' || currentApp === 'email' || currentApp === 'messages') {
      const lowerText = text.toLowerCase();
      if (/^(write|create|draft|type|compose)/i.test(text)) {
        return {
          type: IntentType.DICTATION,
          confidence: 0.95,
          entities: {},
          suggestedAction: 'open_editor',
          metadata: { contextHint: currentApp },
        };
      }
    }

    // If in CRM, prioritize query and action
    if (currentApp === 'crm' || currentApp === 'sales') {
      const lowerText = text.toLowerCase();
      if (/^(show|find|search|get|tell)/i.test(text)) {
        return {
          type: IntentType.QUERY,
          confidence: 0.9,
          entities: {},
          suggestedAction: 'search_crm',
          metadata: { contextHint: currentApp },
        };
      }
      if (/^(create|add|update|delete)/i.test(text)) {
        return {
          type: IntentType.ACTION,
          confidence: 0.9,
          entities: {},
          suggestedAction: 'crm_action',
          metadata: { contextHint: currentApp },
        };
      }
    }

    return { type: IntentType.UNKNOWN, confidence: 0, entities: {} };
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): Record<string, string> {
    const entities: Record<string, string> = {};

    for (const [entityName, patterns] of Object.entries(this.entityPatterns)) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          entities[entityName] = match[1].trim();
          break;
        }
      }
    }

    return entities;
  }

  /**
   * Get suggested action based on intent
   */
  private getSuggestedAction(type: IntentType, entities: Record<string, string>): string {
    switch (type) {
      case IntentType.DICTATION:
        return entities.email ? 'compose_email' : 'create_note';
      case IntentType.QUERY:
        return entities.customerName || entities.orderId ? 'lookup_record' : 'search';
      case IntentType.ACTION:
        return entities.customerName ? 'create_lead' : 'perform_action';
      case IntentType.WORKFLOW:
        return 'run_workflow';
      case IntentType.AGENT:
        return 'assign_to_agent';
      case IntentType.MULTI_AGENT:
        return 'coordinate_team';
      default:
        return 'clarify';
    }
  }

  /**
   * Batch intent detection
   */
  detectBatch(texts: string[], context?: Record<string, unknown>): IntentResult[] {
    return texts.map((text) => this.detect(text, context));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.contextCache.clear();
  }

  /**
   * Add custom pattern
   */
  addPattern(pattern: IntentPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Get processing stats
   */
  getStats(): { cacheSize: number; patternCount: number } {
    return {
      cacheSize: this.contextCache.size,
      patternCount: this.patterns.length,
    };
  }
}

// Singleton export
export const intentService = new IntentService();

export default intentService;
