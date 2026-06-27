import { describe, it, expect } from 'vitest';

// Intent Engine Constants
const INTENT_CATALOG: Record<string, { name: string; keywords: string[] }> = {
  search: { name: 'search', keywords: ['find', 'search', 'look up', 'where', 'what is'] },
  buy: { name: 'buy', keywords: ['buy', 'purchase', 'order', 'checkout', 'cart'] },
  cancel: { name: 'cancel', keywords: ['cancel', 'stop', 'terminate', 'unsubscribe'] },
  support: { name: 'support', keywords: ['help', 'issue', 'problem', 'support', 'broken', 'error'] },
  compare: { name: 'compare', keywords: ['compare', 'vs', 'versus', 'difference', 'better'] },
  recommend: { name: 'recommend', keywords: ['recommend', 'suggest', 'best', 'top', 'should i'] },
  track: { name: 'track', keywords: ['track', 'where is', 'status', 'shipped', 'delivery'] },
  return: { name: 'return', keywords: ['return', 'refund', 'exchange', 'send back'] },
  greet: { name: 'greet', keywords: ['hi', 'hello', 'hey', 'good morning', 'thanks'] },
};

function detectIntent(text: string): { intent: string; confidence: number; alternatives: string[] } {
  const lower = text.toLowerCase();
  const matches: { intent: string; matchedKeyword: string }[] = [];

  for (const [name, def] of Object.entries(INTENT_CATALOG)) {
    for (const kw of def.keywords) {
      const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(lower)) {
        matches.push({ intent: name, matchedKeyword: kw });
        break;
      }
    }
  }

  if (matches.length === 0) {
    return { intent: 'unknown', confidence: 0.5, alternatives: Object.keys(INTENT_CATALOG) };
  }

  return {
    intent: matches[0].intent,
    confidence: Math.min(0.99, 0.7 + matches.length * 0.05),
    alternatives: matches.slice(1).map(m => m.intent),
  };
}

describe('Intent Engine', () => {
  describe('Intent Catalog', () => {
    it('should have all expected intents', () => {
      expect(INTENT_CATALOG).toHaveProperty('search');
      expect(INTENT_CATALOG).toHaveProperty('buy');
      expect(INTENT_CATALOG).toHaveProperty('cancel');
      expect(INTENT_CATALOG).toHaveProperty('support');
      expect(INTENT_CATALOG).toHaveProperty('compare');
    });

    it('should have keywords for each intent', () => {
      Object.entries(INTENT_CATALOG).forEach(([name, def]) => {
        expect(def.keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Intent Detection - Search', () => {
    it('should detect "find" keyword', () => {
      const result = detectIntent('Find me the best restaurant');
      expect(result.intent).toBe('search');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect "search" keyword', () => {
      const result = detectIntent('Search for flights to Mumbai');
      expect(result.intent).toBe('search');
    });

    it('should detect "what is" keyword', () => {
      const result = detectIntent('What is the weather today?');
      expect(result.intent).toBe('search');
    });
  });

  describe('Intent Detection - Buy', () => {
    it('should detect "buy" keyword', () => {
      const result = detectIntent('I want to buy a new phone');
      expect(result.intent).toBe('buy');
    });

    it('should detect "order" keyword', () => {
      const result = detectIntent('Order pizza for delivery');
      expect(result.intent).toBe('buy');
    });

    it('should detect "checkout" keyword', () => {
      const result = detectIntent('Proceed to checkout');
      expect(result.intent).toBe('buy');
    });
  });

  describe('Intent Detection - Cancel', () => {
    it('should detect "cancel" keyword', () => {
      const result = detectIntent('Cancel my subscription');
      expect(result.intent).toBe('cancel');
    });

    it('should detect "terminate" keyword', () => {
      const result = detectIntent('Terminate my account');
      expect(result.intent).toBe('cancel');
    });
  });

  describe('Intent Detection - Support', () => {
    it('should detect "help" keyword', () => {
      const result = detectIntent('Help me with my order');
      expect(result.intent).toBe('support');
    });

    it('should detect "issue" keyword', () => {
      const result = detectIntent('I have an issue with my account');
      expect(result.intent).toBe('support');
    });

    it('should detect "error" keyword', () => {
      const result = detectIntent('Getting an error message');
      expect(result.intent).toBe('support');
    });
  });

  describe('Intent Detection - Compare', () => {
    it('should detect "compare" keyword', () => {
      const result = detectIntent('Compare iPhone vs Samsung');
      expect(result.intent).toBe('compare');
    });

    it('should detect "vs" keyword', () => {
      const result = detectIntent('Python vs JavaScript');
      expect(result.intent).toBe('compare');
    });
  });

  describe('Intent Detection - Recommend', () => {
    it('should detect "recommend" keyword', () => {
      const result = detectIntent('Can you recommend a good hotel?');
      expect(result.intent).toBe('recommend');
    });

    it('should detect "best" keyword', () => {
      const result = detectIntent('What is the best laptop for gaming?');
      expect(result.intent).toBe('recommend');
    });

    it('should detect "should i" phrase', () => {
      const result = detectIntent('Should I buy this car?');
      expect(result.intent).toBe('recommend');
    });
  });

  describe('Intent Detection - Track', () => {
    it('should detect "track" keyword', () => {
      const result = detectIntent('Track my order please');
      expect(result.intent).toBe('track');
    });

    it('should detect "where is" keyword', () => {
      const result = detectIntent('Where is my package?');
      expect(result.intent).toBe('track');
    });
  });

  describe('Intent Detection - Return', () => {
    it('should detect "return" keyword', () => {
      const result = detectIntent('I want to return this item');
      expect(result.intent).toBe('return');
    });

    it('should detect "refund" keyword', () => {
      const result = detectIntent('Request a refund');
      expect(result.intent).toBe('return');
    });
  });

  describe('Intent Detection - Greet', () => {
    it('should detect "hello" keyword', () => {
      const result = detectIntent('Hello, how are you?');
      expect(result.intent).toBe('greet');
    });

    it('should detect "thanks" keyword', () => {
      const result = detectIntent('Thanks for your help');
      expect(result.intent).toBe('greet');
    });
  });

  describe('Intent Detection - Unknown', () => {
    it('should return unknown for unrecognized text', () => {
      const result = detectIntent('Something completely random');
      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBe(0.5);
    });

    it('should provide alternatives for unknown intent', () => {
      const result = detectIntent('random text');
      expect(result.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should increase confidence with more matches', () => {
      const singleKeyword = detectIntent('Help me find something');
      const multiKeyword = detectIntent('Help me find and search for help');

      expect(multiKeyword.confidence).toBeGreaterThanOrEqual(singleKeyword.confidence);
    });

    it('should cap confidence at 0.99', () => {
      const result = detectIntent('Help help help help help help help help help');
      expect(result.confidence).toBeLessThanOrEqual(0.99);
    });

    it('should have minimum confidence of 0.7 for recognized intents', () => {
      const result = detectIntent('Help me please');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Case Insensitivity', () => {
    it('should detect intents regardless of case', () => {
      expect(detectIntent('HELLO').intent).toBe('greet');
      expect(detectIntent('HeLLo').intent).toBe('greet');
      expect(detectIntent('hello').intent).toBe('greet');
    });
  });

  describe('Alternatives', () => {
    it('should return alternatives when multiple intents match', () => {
      const result = detectIntent('Help me find the best option');
      expect(result.alternatives.length).toBeGreaterThanOrEqual(1);
    });

    it('should include related intents in alternatives', () => {
      const result = detectIntent('Find and compare products');
      expect(result.alternatives).toContain('compare');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = detectIntent('');
      expect(result.intent).toBe('unknown');
    });

    it('should handle special characters', () => {
      const result = detectIntent('Help!!! What is @#$ going on?');
      expect(result.intent).toBe('support');
    });

    it('should handle partial word matches', () => {
      const result = detectIntent('I want to be helped');
      expect(result.intent).toBe('support');
    });
  });
});