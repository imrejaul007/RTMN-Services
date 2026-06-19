/**
 * HOJAI Intelligence - Intent Detection Agent
 * Detects customer intent from text input using NLP patterns and LLM
 */

import { IntentResult } from '../types';

// Common intent patterns
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  'complaint': [
    /\b(frustrat|team|bad|worst|terrible|awful|hate|disappoint)\b/i,
    /\bnot\s+(happy|satisfied|working|helped)\b/i,
    /\bwant\s+to\s+(cancel|speak\s+to\s+(manager|supervisor))\b/i,
    /\bthis\s+is\s+(unaccept|outrag)\b/i,
  ],
  'refund_request': [
    /\b(refund|money\s+back|return)\b/i,
    /\bwould\s+like\s+(my\s+)?money\s+back\b/i,
    /\bnot\s+(worth|what\s+I\s+expected)\b/i,
  ],
  'technical_support': [
    /\b(not\s+working|error|bug|crash|broken|fix|issue|problem)\b/i,
    /\bcan'?t\s+(log\s+in|access|open|use)\b/i,
    /\bneed\s+help\s+with\s+(the\s+)?(system|app|software)\b/i,
  ],
  'billing_inquiry': [
    /\b(bill|invoice|charge|payment|price|cost|fee)\b/i,
    /\bhow\s+much\b.*\bcost\b/i,
    /\bsubscription\b.*\brenew/i,
  ],
  'product_inquiry': [
    /\b(what\s+is|how\s+does|features|compare|recommend)\b/i,
    /\bdo\s+you\s+have\b/i,
    /\bpricing\s+(for|of)\b/i,
  ],
  'status_check': [
    /\b(status|track(order)?|where\s+is|delivery\s+date)\b/i,
    /\b(order|package|shipment)\s+(arriv|arrival|estimat)\b/i,
  ],
  'feedback': [
    /\b(feedback|suggest|improvement|idea|recommend)\b/i,
    /\b(love|great|excellent|amaz).*(product|service|experience)\b/i,
  ],
  'upgrade_request': [
    /\b(upgrade|premium|vip|better\s+plan)\b/i,
    /\bwant\s+(more|additional)\b.*\bfeature/i,
  ],
  'general_inquiry': [
    /\b(how\s+do|what\s+is|can\s+I|tell\s+me|explain)\b/i,
    /\binform(ation|ed)\b/i,
  ],
  'greeting': [
    /^(hi|hello|hey|good\s+(morning|afternoon|evening))/i,
    /\bhow\s+are\s+you\b/i,
  ],
  'farewell': [
    /\b(bye|goodbye|thank\s+you|that'?s\s+all|have\s+a\s+(good|nice)\s+day)\b/i,
  ],
};

// Entity extraction patterns
const ENTITY_PATTERNS: Record<string, RegExp[]> = {
  'product': [/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Pro|Max|Plus|Lite|Elite)\b/, /\b(?:product|item|plan)\s+(?:#?\s*\w+)/i],
  'order_id': [/\b(?:order|order\s+#|order\s+id|#)\s*:?\s*([A-Z0-9-]{5,})/i, /\b(?:OR|ORD)-?\d{5,}\b/i],
  'amount': [/\$[\d,]+(?:\.\d{2})?/, /\b(?:rs\.?|inr)\s*[\d,]+(?:\.\d{2})?/i],
  'date': [/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i],
  'email': [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/],
  'phone': [/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/],
};

// Suggested actions by intent
const INTENT_ACTIONS: Record<string, string[]> = {
  'complaint': ['acknowledge', 'empathize', 'escalate_to_manager', 'offer_resolution'],
  'refund_request': ['verify_purchase', 'check_policy', 'process_refund', 'offer_alternative'],
  'technical_support': ['gather_details', 'run_diagnostics', 'create_ticket', 'escalate'],
  'billing_inquiry': ['retrieve_invoice', 'explain_charges', 'verify_payment', 'send_statement'],
  'product_inquiry': ['provide_details', 'compare_options', 'offer_recommendation', 'schedule_demo'],
  'status_check': ['track_order', 'update_customer', 'notify_shipping', 'escalate_delay'],
  'feedback': ['log_feedback', 'thank_customer', 'share_with_team', 'follow_up'],
  'upgrade_request': ['present_options', 'compare_plans', 'process_upgrade', 'offer_discount'],
  'general_inquiry': ['provide_answer', 'offer_resources', 'suggest_articles'],
  'greeting': ['respond_greeting', 'offer_assistance', 'identify_customer'],
  'farewell': ['close_ticket', 'send_survey', 'log_interaction'],
};

export class IntentAgent {
  private patternWeights: Map<string, number> = new Map();

  constructor() {
    // Initialize pattern weights
    Object.keys(INTENT_PATTERNS).forEach(intent => {
      this.patternWeights.set(intent, 1.0);
    });
  }

  /**
   * Detect intent from input text
   */
  async detect(text: string, context?: Record<string, unknown>): Promise<IntentResult> {
    const normalizedText = text.toLowerCase().trim();

    // Score each intent
    const intentScores: Map<string, number> = new Map();

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      let score = 0;
      let matchCount = 0;

      for (const pattern of patterns) {
        const matches = normalizedText.match(pattern);
        if (matches) {
          matchCount += matches.length;
          score += 0.3; // Base score per pattern match
        }
      }

      // Apply context boost if available
      if (context?.channel && intent === 'technical_support' && context.channel === 'app') {
        score *= 1.2;
      }

      if (matchCount > 0) {
        // Normalize by number of patterns
        score = Math.min(score / patterns.length + (matchCount * 0.1), 1.0);
        intentScores.set(intent, score);
      }
    }

    // Sort by score
    const sortedIntents = Array.from(intentScores.entries())
      .sort((a, b) => b[1] - a[1]);

    // Extract primary intent
    const primary = sortedIntents[0] || ['general_inquiry', 0.3];
    const primaryIntent = primary[0];
    const primaryConfidence = Math.round(primary[1] * 100) / 100;

    // Extract secondary intents (top 3 excluding primary)
    const secondaryIntents = sortedIntents
      .slice(1, 4)
      .map(([intent, confidence]) => ({
        intent,
        confidence: Math.round(confidence * 100) / 100,
      }));

    // Extract entities
    const entities = this.extractEntities(text);

    // Get suggested actions
    const suggestedActions = INTENT_ACTIONS[primaryIntent] || ['provide_answer', 'offer_assistance'];

    return {
      primaryIntent,
      confidence: primaryConfidence,
      secondaryIntents,
      entities,
      suggestedActions,
    };
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): Record<string, string[]> {
    const entities: Record<string, string[]> = {};

    for (const [entityType, patterns] of Object.entries(ENTITY_PATTERNS)) {
      const matches: string[] = [];
      for (const pattern of patterns) {
        const found = text.match(pattern);
        if (found) {
          matches.push(...found.slice(1));
        }
      }
      if (matches.length > 0) {
        entities[entityType] = [...new Set(matches)];
      }
    }

    return entities;
  }

  /**
   * Update pattern weights based on feedback
   */
  updateWeights(intent: string, correct: boolean): void {
    const currentWeight = this.patternWeights.get(intent) || 1.0;
    const adjustment = correct ? 0.05 : -0.05;
    this.patternWeights.set(intent, Math.max(0.5, Math.min(1.5, currentWeight + adjustment)));
  }
}

export const intentAgent = new IntentAgent();
