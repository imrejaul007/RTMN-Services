// ============================================================================
// Entity Extraction Service - Extract entities from intents
// ============================================================================

import { Intent } from '../index';

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  normalizedValue: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export type EntityType =
  | 'product'
  | 'brand'
  | 'price'
  | 'quantity'
  | 'color'
  | 'size'
  | 'location'
  | 'person'
  | 'organization'
  | 'date'
  | 'time'
  | 'duration'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'percentage'
  | 'dimension'
  | 'category'
  | 'model'
  | 'sku';

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  primaryEntity?: ExtractedEntity;
  relatedEntities: ExtractedEntity[];
  missingEntities: string[];
  entityCount: number;
  confidence: number;
}

export interface EntityPattern {
  type: EntityType;
  patterns: RegExp[];
  keywords?: string[];
  normalize?: (value: string) => string;
}

const ENTITY_PATTERNS: EntityPattern[] = [
  {
    type: 'product',
    patterns: [
      /\b(laptop|computer|phone|smartphone|tablet|watch|headphones|earbuds|speaker|camera|monitor|keyboard|mouse)\b/gi,
      /\b(shirt|dress|pants|jeans|jacket|coat|shoes|sneakers|boots|sandals|hat|scarf|gloves)\b/gi,
      /\b(book|chair|table|desk|lamp|shelf|cabinet|sofa|bed|mattress|pillow)\b/gi
    ],
    keywords: ['product', 'item', 'thing', 'product']
  },
  {
    type: 'brand',
    patterns: [
      /\b(apple|samsung|sony|lg|dell|hp|lenovo|asus|acer|msi|gigabyte)\b/gi,
      /\b(nike|adidas|puma|reebok|under armour|gucci|prada|zara|h&m|uniqlo)\b/gi,
      /\b(amazon|google|microsoft|intel|nvidia|amd|qualcomm|mediatek)\b/gi
    ]
  },
  {
    type: 'price',
    patterns: [
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|usd|rs|inr)/gi,
      /(?:price|cost|worth|value)\s*(?:of)?\s*\$?\s*(\d+)/gi
    ],
    normalize: (v) => v.replace(/[$,]/g, '')
  },
  {
    type: 'quantity',
    patterns: [
      /\b(\d+)\s*(?:items?|pieces?|units?|pcs|pieces|boxes?|packs?|sets?|pairs?)\b/gi,
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|a dozen)\b/gi,
      /\b(\d+)\s*(?:of|each)\b/gi
    ],
    keywords: ['quantity', 'count', 'number', 'how many']
  },
  {
    type: 'color',
    patterns: [
      /\b(red|blue|green|black|white|yellow|orange|purple|pink|brown|gray|grey|navy|beige|teal|maroon|olive|burgundy|gold|silver)\b/gi
    ],
    keywords: ['color', 'colour', 'shade', 'hue']
  },
  {
    type: 'size',
    patterns: [
      /\b(xs|sm|md|lg|xl|xxl|small|medium|large|extra\s*large)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(?:inch|in|cm|centimeter|mm|millimeter|foot|feet)\b/gi
    ],
    keywords: ['size', 'dimension', 'measure']
  },
  {
    type: 'location',
    patterns: [
      /\b(in|at|from|to|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/g
    ],
    keywords: ['location', 'where', 'city', 'state', 'country', 'store']
  },
  {
    type: 'date',
    patterns: [
      /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/g,
      /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/g,
      /\b(today|tomorrow|yesterday|next\s+week|last\s+week|this\s+month)\b/gi,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi
    ],
    keywords: ['date', 'when', 'schedule', 'delivery']
  },
  {
    type: 'time',
    patterns: [
      /\b(\d{1,2}:\d{2}(?:\s*(?:am|pm|AM|PM))?)\b/g,
      /\b(\d{1,2})\s*(?:o'?clock)\b/gi,
      /\b(morning|afternoon|evening|night|noon|midnight)\b/gi
    ],
    keywords: ['time', 'when', 'schedule', 'hours']
  },
  {
    type: 'duration',
    patterns: [
      /\b(\d+)\s*(?:days?|weeks?|months?|hours?|minutes?|mins?)\b/gi,
      /\b(\d+)\s*(?:day|week|month|hour|minute|min)\s*(?:from|after|before)\b/gi
    ],
    keywords: ['duration', 'how long', 'timeframe', 'period']
  },
  {
    type: 'email',
    patterns: [
      /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g
    ],
    keywords: ['email', 'mail', 'address']
  },
  {
    type: 'phone',
    patterns: [
      /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      /\b(\d{10})\b/g
    ],
    keywords: ['phone', 'call', 'number', 'mobile', 'tel']
  },
  {
    type: 'url',
    patterns: [
      /\b(https?:\/\/[^\s]+)/gi,
      /\b(www\.[^\s]+)/gi
    ],
    keywords: ['url', 'link', 'website', 'site']
  },
  {
    type: 'currency',
    patterns: [
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      /(?:usd|dollars?|eur|euros?|gbp|pounds?|jpy|yens?|inr|rs|cny|yuan)\b/gi
    ],
    keywords: ['currency', 'money', 'price']
  },
  {
    type: 'percentage',
    patterns: [
      /(\d+(?:\.\d+)?)\s*%/g,
      /\b(\d+(?:\.\d+)?)\s*(?:percent|percentage)\b/gi
    ],
    keywords: ['percent', 'percentage', 'discount', 'off']
  },
  {
    type: 'dimension',
    patterns: [
      /\b(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(?:inch|in|cm|mm)?\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(?:inch|in|cm|mm)?\b/gi
    ],
    keywords: ['dimension', 'size', 'measurements']
  },
  {
    type: 'category',
    patterns: [
      /\b(electronics|clothing|fashion|home|furniture|books|sports|outdoors|toys|beauty|health|grocery)\b/gi
    ],
    keywords: ['category', 'type', 'kind', 'sort']
  },
  {
    type: 'model',
    patterns: [
      /\b([A-Z]{2,3}[-_]?\d{3,4}[A-Z]?)\b/g,
      /\b(model\s*[A-Z]?\d+)\b/gi,
      /\b(iPhone\s*\d+|Galaxy\s*\w+|Pixel\s*\d+|Surface\s*\w+)\b/gi
    ],
    keywords: ['model', 'version', 'series']
  },
  {
    type: 'sku',
    patterns: [
      /\b(SKU[-_]?\d{5,})\b/gi,
      /\b([A-Z]{3}[-_]?\d{5,})\b/gi
    ],
    keywords: ['sku', 'product id', 'item number']
  }
];

const NUMBER_WORDS: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'a dozen': 12, 'dozen': 12
};

export class EntityExtractor {
  private patterns: EntityPattern[];
  private customPatterns: Map<EntityType, EntityPattern>;
  private entityCache: Map<string, EntityExtractionResult>;

  constructor() {
    this.patterns = [...ENTITY_PATTERNS];
    this.customPatterns = new Map();
    this.entityCache = new Map();
  }

  /**
   * Extract all entities from text
   */
  extract(text: string, intent?: Intent): EntityExtractionResult {
    const cacheKey = `${text}:${intent?.id || 'none'}`;
    const cached = this.entityCache.get(cacheKey);
    if (cached) return cached;

    const entities: ExtractedEntity[] = [];

    // Extract using patterns
    for (const pattern of this.patterns) {
      const extracted = this.extractWithPattern(text, pattern);
      entities.push(...extracted);
    }

    // Extract using custom patterns
    this.customPatterns.forEach((pattern) => {
      const extracted = this.extractWithPattern(text, pattern);
      entities.push(...extracted);
    });

    // Deduplicate and sort by position
    const uniqueEntities = this.deduplicateEntities(entities);
    uniqueEntities.sort((a, b) => a.startIndex - b.startIndex);

    // Identify primary entity
    const primaryEntity = this.identifyPrimaryEntity(uniqueEntities, intent);

    // Find related entities
    const relatedEntities = this.findRelatedEntities(uniqueEntities, primaryEntity);

    // Identify missing entities based on intent
    const missingEntities = this.identifyMissingEntities(uniqueEntities, intent);

    const result: EntityExtractionResult = {
      entities: uniqueEntities,
      primaryEntity,
      relatedEntities,
      missingEntities,
      entityCount: uniqueEntities.length,
      confidence: this.calculateConfidence(uniqueEntities)
    };

    // Cache result
    this.entityCache.set(cacheKey, result);

    return result;
  }

  /**
   * Extract entities of a specific type
   */
  extractByType(text: string, type: EntityType): ExtractedEntity[] {
    const result = this.extract(text);
    return result.entities.filter(e => e.type === type);
  }

  /**
   * Add custom entity pattern
   */
  addPattern(pattern: EntityPattern): void {
    this.customPatterns.set(pattern.type, pattern);
    this.entityCache.clear();
  }

  /**
   * Get supported entity types
   */
  getSupportedTypes(): EntityType[] {
    const types = new Set(this.patterns.map(p => p.type));
    this.customPatterns.forEach((_, type) => types.add(type));
    return Array.from(types);
  }

  /**
   * Batch extract entities
   */
  batchExtract(texts: string[]): EntityExtractionResult[] {
    return texts.map(text => this.extract(text));
  }

  /**
   * Normalize entity value
   */
  normalizeEntity(entity: ExtractedEntity): string {
    if (entity.normalizedValue) {
      return entity.normalizedValue;
    }

    let value = entity.value;

    // Apply type-specific normalization
    const pattern = this.patterns.find(p => p.type === entity.type);
    if (pattern?.normalize) {
      value = pattern.normalize(value);
    }

    // Convert number words
    const lowerValue = value.toLowerCase();
    if (NUMBER_WORDS[lowerValue]) {
      value = String(NUMBER_WORDS[lowerValue]);
    }

    return value;
  }

  /**
   * Merge entities from multiple sources
   */
  mergeEntities(results: EntityExtractionResult[]): EntityExtractionResult {
    const allEntities: ExtractedEntity[] = [];

    for (const result of results) {
      allEntities.push(...result.entities);
    }

    const uniqueEntities = this.deduplicateEntities(allEntities);
    const primaryEntity = this.identifyPrimaryEntity(uniqueEntities);
    const relatedEntities = this.findRelatedEntities(uniqueEntities, primaryEntity);
    const missingEntities = [...new Set(results.flatMap(r => r.missingEntities))];

    return {
      entities: uniqueEntities,
      primaryEntity,
      relatedEntities,
      missingEntities,
      entityCount: uniqueEntities.length,
      confidence: this.calculateConfidence(uniqueEntities)
    };
  }

  /**
   * Validate extracted entities
   */
  validateEntities(entities: ExtractedEntity[]): { valid: ExtractedEntity[]; invalid: ExtractedEntity[] } {
    const valid: ExtractedEntity[] = [];
    const invalid: ExtractedEntity[] = [];

    for (const entity of entities) {
      if (this.isValidEntity(entity)) {
        valid.push(entity);
      } else {
        invalid.push(entity);
      }
    }

    return { valid, invalid };
  }

  // Private helper methods

  private extractWithPattern(text: string, pattern: EntityPattern): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const regex of pattern.patterns) {
      let match;
      const regexCopy = new RegExp(regex.source, regex.flags);

      while ((match = regexCopy.exec(text)) !== null) {
        const value = match[0];
        const startIndex = match.index;
        const endIndex = startIndex + value.length;

        // Skip if overlapping with existing entity
        const overlaps = entities.some(e =>
          (startIndex >= e.startIndex && startIndex < e.endIndex) ||
          (endIndex > e.startIndex && endIndex <= e.endIndex)
        );

        if (!overlaps) {
          let normalizedValue = value;
          if (pattern.normalize) {
            normalizedValue = pattern.normalize(value);
          }

          entities.push({
            type: pattern.type,
            value,
            normalizedValue,
            confidence: this.calculateEntityConfidence(value, pattern),
            startIndex,
            endIndex
          });
        }
      }
    }

    return entities;
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Map<string, ExtractedEntity>();

    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = seen.get(key);

      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }

    return Array.from(seen.values());
  }

  private identifyPrimaryEntity(entities: ExtractedEntity[], intent?: Intent): ExtractedEntity | undefined {
    if (entities.length === 0) return undefined;

    // If intent is provided, use intent category to prioritize
    if (intent?.category) {
      const categoryEntityType = this.mapCategoryToEntityType(intent.category);
      const categoryEntity = entities.find(e => e.type === categoryEntityType);
      if (categoryEntity) return categoryEntity;
    }

    // Otherwise, prioritize by entity type hierarchy
    const typePriority: EntityType[] = ['product', 'brand', 'price', 'category', 'model', 'sku'];

    for (const type of typePriority) {
      const entity = entities.find(e => e.type === type);
      if (entity) return entity;
    }

    // Return first entity
    return entities[0];
  }

  private findRelatedEntities(entities: ExtractedEntity[], primary?: ExtractedEntity): ExtractedEntity[] {
    if (!primary || entities.length <= 1) return [];

    return entities.filter(e =>
      e.type !== primary.type &&
      e.startIndex >= primary.startIndex - 50 &&
      e.endIndex <= primary.endIndex + 50
    );
  }

  private identifyMissingEntities(entities: ExtractedEntity[], intent?: Intent): string[] {
    const missing: string[] = [];
    const entityTypes = new Set(entities.map(e => e.type));

    // Based on intent category, suggest missing entities
    if (intent?.category) {
      const expectedEntities = this.getExpectedEntitiesForCategory(intent.category);

      for (const expected of expectedEntities) {
        if (!entityTypes.has(expected)) {
          missing.push(expected);
        }
      }
    }

    return missing;
  }

  private calculateConfidence(entities: ExtractedEntity[]): number {
    if (entities.length === 0) return 0;

    const totalConfidence = entities.reduce((sum, e) => sum + e.confidence, 0);
    return totalConfidence / entities.length;
  }

  private calculateEntityConfidence(value: string, pattern: EntityPattern): number {
    let confidence = 0.7;

    // Higher confidence for longer matches
    if (value.length > 3) confidence += 0.1;

    // Higher confidence if keyword context is present
    if (pattern.keywords) {
      confidence += 0.1;
    }

    // Higher confidence for pattern matches with specific formats
    if (/^\d+[\d,]*(\.\d+)?$/.test(value)) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private mapCategoryToEntityType(category: string): EntityType {
    const mapping: Record<string, EntityType> = {
      browse: 'product',
      search: 'product',
      compare: 'product',
      cart: 'product',
      purchase: 'price',
      support: 'product',
      negotiation: 'price',
      contract: 'organization'
    };

    return mapping[category] || 'product';
  }

  private getExpectedEntitiesForCategory(category: string): EntityType[] {
    const mappings: Record<string, EntityType[]> = {
      browse: ['product', 'category'],
      search: ['product', 'brand', 'category'],
      compare: ['product', 'brand', 'model'],
      cart: ['product', 'quantity', 'color', 'size'],
      purchase: ['product', 'price', 'quantity', 'location'],
      support: ['product', 'model', 'sku'],
      negotiation: ['price', 'product', 'percentage'],
      contract: ['organization', 'date', 'location']
    };

    return mappings[category] || [];
  }

  private isValidEntity(entity: ExtractedEntity): boolean {
    // Basic validation rules
    if (entity.confidence < 0.3) return false;
    if (entity.value.length < 1) return false;
    if (entity.startIndex < 0 || entity.endIndex <= entity.startIndex) return false;

    // Type-specific validation
    switch (entity.type) {
      case 'price':
        return /^\d+/.test(entity.normalizedValue);
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entity.value);
      case 'phone':
        return entity.value.replace(/\D/g, '').length >= 10;
      case 'url':
        return /^https?:\/\//.test(entity.value) || /^www\./.test(entity.value);
      default:
        return true;
    }
  }
}

// Export singleton instance
export const entityExtractor = new EntityExtractor();
