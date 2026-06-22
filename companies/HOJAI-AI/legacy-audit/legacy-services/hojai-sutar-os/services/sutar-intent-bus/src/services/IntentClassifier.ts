// ============================================================================
// Intent Classification Service - ML-based intent recognition
// ============================================================================

import { IntentCategory } from '../index';

export interface ClassificationResult {
  category: IntentCategory;
  confidence: number;
  subIntents: string[];
  alternativeCategories: Array<{ category: IntentCategory; confidence: number }>;
  reasoning: string;
  keywords: string[];
  embeddings?: number[];
}

interface IntentPattern {
  keywords: string[];
  category: IntentCategory;
  weight: number;
  examples: string[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    keywords: ['browse', 'view', 'look', 'show', 'see', 'explore', 'discover', 'check', 'find'],
    category: 'browse',
    weight: 1.0,
    examples: ['I want to browse products', 'Show me the latest items', 'View my dashboard']
  },
  {
    keywords: ['search', 'find', 'look for', 'seek', 'locate', 'query', 'filter', 'sort'],
    category: 'search',
    weight: 1.0,
    examples: ['Search for laptops', 'Find me a red dress', 'Look for wireless headphones']
  },
  {
    keywords: ['compare', 'versus', 'vs', 'difference', 'versus', 'between', 'versus', 'alternatives'],
    category: 'compare',
    weight: 1.0,
    examples: ['Compare iPhone vs Samsung', 'What is the difference between these', 'Which is better']
  },
  {
    keywords: ['cart', 'add', 'basket', 'put', 'include', 'wishlist', 'save', 'favorite'],
    category: 'cart',
    weight: 1.0,
    examples: ['Add to cart', 'Put this in my basket', 'Save to wishlist']
  },
  {
    keywords: ['buy', 'purchase', 'order', 'checkout', 'pay', 'get', 'acquire', 'transaction'],
    category: 'purchase',
    weight: 1.0,
    examples: ['Buy now', 'Proceed to checkout', 'I want to purchase this']
  },
  {
    keywords: ['help', 'support', 'assist', 'question', 'issue', 'problem', 'contact', 'service'],
    category: 'support',
    weight: 1.0,
    examples: ['I need help', 'Customer support', 'I have a question']
  },
  {
    keywords: ['negotiate', 'price', 'discount', 'offer', 'bargain', 'deal', 'reduce', 'lower'],
    category: 'negotiation',
    weight: 1.0,
    examples: ['Can you give me a discount', 'Negotiate the price', 'I want a better deal']
  },
  {
    keywords: ['contract', 'agreement', 'terms', 'legal', 'sign', 'signing', 'document', 'policy'],
    category: 'contract',
    weight: 1.0,
    examples: ['Sign the contract', 'Terms and conditions', 'Legal agreement']
  }
];

const NEGATION_WORDS = ['not', 'no', 'never', 'dont', "don't", 'without', 'none', 'neither'];
const INTENSIFIERS = ['very', 'really', 'extremely', 'absolutely', 'completely', 'totally'];
const QUERY_WORDS = ['what', 'which', 'who', 'where', 'when', 'why', 'how', 'can', 'could', 'would'];

export class IntentClassifier {
  private patterns: IntentPattern[];
  private customPatterns: Map<string, IntentPattern>;
  private modelWeights: Map<IntentCategory, number>;
  private trainingData: Array<{ text: string; category: IntentCategory }>;
  private isTrained: boolean;

  constructor() {
    this.patterns = [...INTENT_PATTERNS];
    this.customPatterns = new Map();
    this.modelWeights = new Map();
    this.trainingData = [];
    this.isTrained = false;
    this.initializeDefaultWeights();
  }

  private initializeDefaultWeights(): void {
    this.patterns.forEach(p => this.modelWeights.set(p.category, p.weight));
  }

  /**
   * Classify an intent string into a category
   */
  classify(text: string, context?: Record<string, any>): ClassificationResult {
    const normalizedText = this.normalizeText(text);
    const words = normalizedText.split(/\s+/);
    const keywordMatches = this.extractKeywords(normalizedText);
    const scores = this.calculateCategoryScores(keywordMatches, words, context);
    const topCategory = this.getTopCategory(scores);
    const alternatives = this.getAlternatives(scores, topCategory);

    return {
      category: topCategory,
      confidence: scores.get(topCategory) || 0,
      subIntents: this.extractSubIntents(normalizedText),
      alternativeCategories: alternatives,
      reasoning: this.generateReasoning(topCategory, keywordMatches, scores),
      keywords: keywordMatches
    };
  }

  /**
   * Classify with ML-style embeddings (simplified TF-IDF approach)
   */
  classifyWithEmbeddings(text: string, context?: Record<string, any>): ClassificationResult {
    const result = this.classify(text, context);
    result.embeddings = this.generateEmbeddings(text);
    return result;
  }

  /**
   * Train the classifier with labeled data
   */
  train(trainingData: Array<{ text: string; category: IntentCategory }>): void {
    this.trainingData = trainingData;
    this.updateWeightsFromTraining();
    this.isTrained = true;
  }

  /**
   * Add custom pattern for classification
   */
  addPattern(pattern: IntentPattern): void {
    this.customPatterns.set(pattern.category, pattern);
    this.patterns.push(pattern);
  }

  /**
   * Get classification confidence threshold
   */
  getConfidenceThreshold(): number {
    return 0.5;
  }

  /**
   * Set minimum confidence threshold
   */
  setConfidenceThreshold(threshold: number): void {
    // Store threshold for validation
  }

  /**
   * Batch classify multiple intents
   */
  batchClassify(texts: string[]): ClassificationResult[] {
    return texts.map(text => this.classify(text));
  }

  /**
   * Learn from user feedback
   */
  learnFromFeedback(text: string, correctCategory: IntentCategory): void {
    const result = this.classify(text);
    if (result.category !== correctCategory) {
      this.trainingData.push({ text, category: correctCategory });
      this.updateWeightsFromTraining();
    }
  }

  /**
   * Get supported categories
   */
  getSupportedCategories(): IntentCategory[] {
    return [...new Set(this.patterns.map(p => p.category))];
  }

  /**
   * Extract entities from intent text
   */
  extractEntities(text: string): Record<string, any> {
    const entities: Record<string, any> = {};
    const normalizedText = this.normalizeText(text);

    // Extract product mentions
    entities.products = this.extractProductMentions(normalizedText);

    // Extract brand names
    entities.brands = this.extractBrandMentions(normalizedText);

    // Extract price ranges
    entities.priceRange = this.extractPriceRange(normalizedText);

    // Extract colors
    entities.colors = this.extractColorMentions(normalizedText);

    // Extract quantities
    entities.quantities = this.extractQuantities(normalizedText);

    // Extract time references
    entities.timeReferences = this.extractTimeReferences(normalizedText);

    // Extract locations
    entities.locations = this.extractLocationMentions(normalizedText);

    return entities;
  }

  // Private helper methods

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractKeywords(text: string): string[] {
    const words = text.split(/\s+/);
    const keywords: string[] = [];

    for (const pattern of this.patterns) {
      for (const keyword of pattern.keywords) {
        if (words.includes(keyword)) {
          keywords.push(keyword);
        }
      }
    }

    return [...new Set(keywords)];
  }

  private calculateCategoryScores(
    keywords: string[],
    words: string[],
    context?: Record<string, any>
  ): Map<IntentCategory, number> {
    const scores = new Map<IntentCategory, number>();

    for (const pattern of this.patterns) {
      let score = 0;
      let matchCount = 0;

      for (const keyword of pattern.keywords) {
        if (keywords.includes(keyword)) {
          matchCount++;
          score += pattern.weight;
        }
      }

      // Normalize by number of keywords
      if (matchCount > 0) {
        score = score / pattern.keywords.length;
      }

      // Context boost
      if (context?.lastCategory === pattern.category) {
        score *= 1.2;
      }

      scores.set(pattern.category, score);
    }

    return scores;
  }

  private getTopCategory(scores: Map<IntentCategory, number>): IntentCategory {
    let maxScore = 0;
    let topCategory: IntentCategory = 'browse';

    scores.forEach((score, category) => {
      if (score > maxScore) {
        maxScore = score;
        topCategory = category;
      }
    });

    return topCategory;
  }

  private getAlternatives(
    scores: Map<IntentCategory, number>,
    topCategory: IntentCategory
  ): Array<{ category: IntentCategory; confidence: number }> {
    const alternatives: Array<{ category: IntentCategory; confidence: number }> = [];

    scores.forEach((score, category) => {
      if (category !== topCategory && score > 0.1) {
        alternatives.push({ category, confidence: score });
      }
    });

    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  private extractSubIntents(text: string): string[] {
    const subIntents: string[] = [];
    const words = text.split(/\s+/);

    // Check for query patterns
    if (QUERY_WORDS.some(q => words.includes(q))) {
      subIntents.push('query');
    }

    // Check for action patterns
    if (words.some(w => ['want', 'need', 'looking', 'trying'].includes(w))) {
      subIntents.push('action_request');
    }

    // Check for negation
    if (NEGATION_WORDS.some(n => words.includes(n))) {
      subIntents.push('negation');
    }

    // Check for comparison
    if (words.some(w => ['vs', 'versus', 'compare', 'difference'].includes(w))) {
      subIntents.push('comparison');
    }

    return subIntents;
  }

  private generateReasoning(
    category: IntentCategory,
    keywords: string[],
    scores: Map<IntentCategory, number>
  ): string {
    const score = scores.get(category) || 0;
    const pattern = this.patterns.find(p => p.category === category);

    if (pattern && keywords.length > 0) {
      return `Matched keywords: ${keywords.join(', ')} for category '${category}' with confidence ${(score * 100).toFixed(1)}%`;
    }

    return `Inferred category '${category}' based on context with confidence ${(score * 100).toFixed(1)}%`;
  }

  private generateEmbeddings(text: string): number[] {
    // Simplified TF-IDF-like embedding
    const words = text.toLowerCase().split(/\s+/);
    const embedding: number[] = [];

    for (const pattern of this.patterns) {
      let weight = 0;
      for (const keyword of pattern.keywords) {
        if (words.includes(keyword)) {
          weight += 1;
        }
      }
      embedding.push(weight / Math.max(words.length, 1));
    }

    return embedding;
  }

  private updateWeightsFromTraining(): void {
    const categoryCounts = new Map<IntentCategory, number>();

    for (const item of this.trainingData) {
      const count = categoryCounts.get(item.category) || 0;
      categoryCounts.set(item.category, count + 1);
    }

    categoryCounts.forEach((count, category) => {
      const weight = Math.min(count / Math.max(this.trainingData.length, 1) * 2, 2.0);
      this.modelWeights.set(category, weight);
    });
  }

  private extractProductMentions(text: string): string[] {
    const products: string[] = [];
    const productPatterns = [
      /\b(laptop|computer|phone|tablet|watch|headphones|earbuds)\b/gi,
      /\b(shirt|dress|pants|shoes|jacket|hat)\b/gi,
      /\b(book|chair|table|desk|lamp)\b/gi
    ];

    for (const pattern of productPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        products.push(...matches);
      }
    }

    return [...new Set(products.map(p => p.toLowerCase()))];
  }

  private extractBrandMentions(text: string): string[] {
    const brands = [
      'apple', 'samsung', 'sony', 'lg', 'dell', 'hp', 'lenovo', 'asus',
      'nike', 'adidas', 'puma', 'gucci', 'prada', 'zara', 'h&m',
      'amazon', 'google', 'microsoft', 'intel', 'nvidia'
    ];

    return brands.filter(brand => text.includes(brand));
  }

  private extractPriceRange(text: string): { min?: number; max?: number } | null {
    const pricePattern = /\$?(\d+)(?:\s*-\s*\$?(\d+))?/g;
    const matches = text.match(pricePattern);

    if (matches && matches.length > 0) {
      const parts = matches[0].replace('$', '').split('-');
      return {
        min: parseInt(parts[0]),
        max: parts[1] ? parseInt(parts[1]) : undefined
      };
    }

    return null;
  }

  private extractColorMentions(text: string): string[] {
    const colors = [
      'red', 'blue', 'green', 'black', 'white', 'yellow', 'orange',
      'purple', 'pink', 'brown', 'gray', 'grey', 'navy', 'beige'
    ];

    return colors.filter(color => text.includes(color));
  }

  private extractQuantities(text: string): number[] {
    const quantityPattern = /\b(\d+)\s*(items?|pieces?|units?|pcs|pieces)\b/gi;
    const matches: number[] = [];
    let match;

    while ((match = quantityPattern.exec(text)) !== null) {
      matches.push(parseInt(match[1]));
    }

    return matches;
  }

  private extractTimeReferences(text: string): string[] {
    const timeRefs: string[] = [];
    const timePatterns = [
      /\b(today|tomorrow|yesterday|this week|next week|this month)\b/gi,
      /\b(morning|afternoon|evening|night)\b/gi,
      /\b(\d+)\s*(days?|weeks?|months?|hours?)\b/gi
    ];

    for (const pattern of timePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        timeRefs.push(...matches);
      }
    }

    return [...new Set(timeRefs)];
  }

  private extractLocationMentions(text: string): string[] {
    const locations: string[] = [];
    const locationPatterns = [
      /\b(in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
      /\b(store|shop|location|warehouse)\b/gi
    ];

    for (const pattern of locationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        locations.push(...matches);
      }
    }

    return [...new Set(locations)];
  }
}

// Export singleton instance
export const intentClassifier = new IntentClassifier();
