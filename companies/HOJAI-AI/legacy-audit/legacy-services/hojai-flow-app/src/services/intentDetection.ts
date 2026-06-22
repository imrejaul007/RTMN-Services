/**
 * Intent Detection Service
 *
 * Automatically detects user intent from speech/text
 * Removes manual mode selection
 */

export type FlowMode = 'flow' | 'ask' | 'remember' | 'execute' | 'delegate';

interface IntentResult {
  mode: FlowMode;
  confidence: number;
  action?: string;
  entities?: {
    contact?: string;
    merchant?: string;
    product?: string;
    time?: string;
    action?: string;
  };
  suggestions?: string[];
}

type IntentCallback = (result: IntentResult) => void;

class IntentDetector {
  private listeners: Set<IntentCallback> = new Set();
  private lastIntent: IntentResult | null = null;

  /**
   * Subscribe to intent results
   */
  onIntent(callback: IntentCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Detect intent from text
   */
  detect(text: string): IntentResult {
    const lower = text.toLowerCase().trim();

    // Analyze patterns
    const result = this.analyzePatterns(lower, text);

    // Notify listeners
    this.listeners.forEach(cb => cb(result));
    this.lastIntent = result;

    return result;
  }

  /**
   * Get last detected intent
   */
  getLastIntent(): IntentResult | null {
    return this.lastIntent;
  }

  /**
   * Analyze patterns and detect intent
   */
  private analyzePatterns(lower: string, original: string): IntentResult {
    // ==========================================
    // EXECUTE patterns (highest priority)
    // ==========================================

    // Scheduling
    if (this.matchAny(lower, [
      'schedule', 'scheduled', 'scheduling',
      'book', 'booking', 'reserve', 'reservation',
      'appointment', 'meeting', 'call'
    ])) {
      return this.createResult('execute', 0.95, 'schedule', {
        time: this.extractTime(lower),
      }, [
        'Schedule for tomorrow',
        'Schedule for next week',
        'Schedule for specific time'
      ]);
    }

    // Sending
    if (this.matchAny(lower, [
      'send', 'sending', 'sent',
      'email', 'message', 'whatsapp', 'sms',
      'notify', 'inform', 'tell'
    ])) {
      return this.createResult('execute', 0.95, 'send_message', {
        contact: this.extractContact(lower),
      }, [
        `Send to ${this.extractContact(lower) || 'recipient'}`,
        'Send now',
        'Edit message'
      ]);
    }

    // Creating
    if (this.matchAny(lower, [
      'create', 'creating', 'created', 'new',
      'make', 'make a', 'generate'
    ])) {
      const created = this.extractCreatedItem(lower);
      return this.createResult('execute', 0.90, 'create', {
        action: created,
      }, [
        `Create ${created || 'item'}`,
        'Create with default settings',
        'Cancel'
      ]);
    }

    // ==========================================
    // REMEMBER patterns
    // ==========================================

    if (this.matchAny(lower, [
      'remember', 'remind', 'reminding',
      'note', 'take note', 'keep in mind',
      'don't forget', 'never forget'
    ])) {
      return this.createResult('remember', 0.95, 'store_memory', {
        action: 'store',
      }, [
        'Remember this',
        'Remember also that...',
        'Forget this'
      ]);
    }

    // ==========================================
    // ASK patterns
    // ==========================================

    if (this.matchAny(lower, [
      'what', 'where', 'when', 'who', 'why', 'how',
      'can you tell', 'tell me', 'show me',
      'find', 'search', 'lookup', 'look up',
      'get me', 'i need', 'i want',
      '?', 'question', 'ask'
    ])) {
      return this.createResult('ask', 0.90, 'search', {
        action: 'query',
      }, [
        'Show me more',
        'Refine search',
        'Clear'
      ]);
    }

    // ==========================================
    // DELEGATE patterns
    // ==========================================

    if (this.matchAny(lower, [
      'follow up', 'followup', 'follow-up',
      'delegate', 'handle this', 'you do it',
      'take care of', 'process this',
      'automate', 'automatic'
    ])) {
      return this.createResult('delegate', 0.85, 'automate', {
        action: 'batch_process',
      }, [
        'Follow up with all',
        'Follow up with inactive',
        'Cancel'
      ]);
    }

    // ==========================================
    // FLOW patterns (default)
    // Dictation, writing, rewriting
    // ==========================================

    if (this.matchAny(lower, [
      'draft', 'drafting', 'write', 'writing',
      'compose', 'create a', 'type',
      'rewrite', 'rephrase', 'reword',
      'edit', 'update', 'modify'
    ])) {
      return this.createResult('flow', 0.85, 'draft', {
        action: 'write',
      }, [
        'Edit',
        'Regenerate',
        'Done'
      ]);
    }

    // Default to flow (dictation)
    return this.createResult('flow', 0.60, 'dictate', {
      action: 'transcribe',
    }, [
      'Send',
      'Save',
      'Edit'
    ]);
  }

  /**
   * Check if text matches any pattern
   */
  private matchAny(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  /**
   * Create result object
   */
  private createResult(
    mode: FlowMode,
    confidence: number,
    action: string,
    entities?: IntentResult['entities'],
    suggestions?: string[]
  ): IntentResult {
    return { mode, confidence, action, entities, suggestions };
  }

  /**
   * Extract time references
   */
  private extractTime(text: string): string | undefined {
    if (text.includes('tomorrow')) return 'tomorrow';
    if (text.includes('today')) return 'today';
    if (text.includes('next week')) return 'next_week';
    if (text.includes('monday')) return 'monday';
    if (text.includes('tuesday')) return 'tuesday';
    if (text.includes('wednesday')) return 'wednesday';
    if (text.includes('thursday')) return 'thursday';
    if (text.includes('friday')) return 'friday';
    if (text.includes('saturday')) return 'saturday';
    if (text.includes('sunday')) return 'sunday';
    return undefined;
  }

  /**
   * Extract contact name
   */
  private extractContact(text: string): string | undefined {
    // Look for "to X" pattern
    const toMatch = text.match(/to\s+(\w+)/i);
    if (toMatch) return toMatch[1];

    // Look for "send X" pattern
    const sendMatch = text.match(/send\s+(\w+)/i);
    if (sendMatch) return sendMatch[1];

    return undefined;
  }

  /**
   * Extract what user wants to create
   */
  private extractCreatedItem(text: string): string | undefined {
    if (text.includes('campaign')) return 'campaign';
    if (text.includes('email')) return 'email';
    if (text.includes('message')) return 'message';
    if (text.includes('meeting')) return 'meeting';
    if (text.includes('task')) return 'task';
    if (text.includes('note')) return 'note';
    if (text.includes('document')) return 'document';
    if (text.includes('report')) return 'report';
    if (text.includes('invoice')) return 'invoice';
    if (text.includes('order')) return 'order';
    if (text.includes('reminder')) return 'reminder';
    return undefined;
  }
}

export const intentDetector = new IntentDetector();
export default intentDetector;
