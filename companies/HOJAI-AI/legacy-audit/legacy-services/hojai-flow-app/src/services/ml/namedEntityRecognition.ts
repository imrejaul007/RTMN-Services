/**
 * Named Entity Recognition (NER) - Custom
 *
 * Features:
 * - Indian name recognition
 * - Company/Product detection
 * - Custom entity learning
 * - Acronym expansion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NER_KEY = 'hojai_ner';

// ============================================================================
// TYPES
// ============================================================================

export interface Entity {
  text: string;
  type: 'person' | 'company' | 'product' | 'location' | 'date' | 'money' | 'custom';
  normalized?: string;
  confidence: number;
}

interface NERConfig {
  detectIndianNames: boolean;
  detectCompanies: boolean;
  detectProducts: boolean;
  customEntities: CustomEntity[];
}

interface CustomEntity {
  text: string;
  type: Entity['type'];
  expanded?: string; // For acronyms: "REZ" → "Real Estate Zone"
}

// ============================================================================
// INDIAN NAME PATTERNS
// ============================================================================

const INDIAN_FIRST_NAMES = new Set([
  // Common Indian first names
  'rahul', 'priya', 'amit', 'neha', 'vikram', 'priyanka', 'arun', 'sunita',
  'raj', 'kavita', 'sanjay', 'anita', 'deepak', 'meena', 'rajesh', 'geeta',
  'anil', 'sunita', 'ramesh', 'asha', 'vikas', 'pooja', 'ajay', 'ritu',
  'vijay', 'nikita', 'suresh', 'lata', 'akash', 'kiran', 'mahesh', 'rita',
  // More
  'gaurav', 'nisha', 'puneet', 'sonia', 'vivek', 'richa', 'ankur', 'shweta',
  'rohit', 'komal', 'manish', 'sonali', 'kapil', 'divya', 'abhishek', 'manisha',
  // South Indian
  'rajesh', 'kumar', 'suresh', 'venkat', 'srinivas', 'prakash', 'chandrashekar',
  // Muslim Indian
  'imran', 'akhtar', 'rashid', 'firoz', 'javed', 'imtiyaz', 'irfan', 'shahid',
]);

const INDIAN_LAST_NAMES = new Set([
  // North Indian
  'sharma', 'kumar', 'singh', 'gupta', 'agarwal', 'jain', 'mehta', 'patel',
  'joshi', 'mishra', 'pandey', 'tripathi', 'tiwari', 'dubey', 'verma', 'rawat',
  'singh', 'thakur', 'chaudhary', 'prasad', 'tiwari', 'dwivedi', 'trivedi',
  // South Indian
  'rao', 'naidu', 'reddy', 'iyer', 'menon', 'nair', 'pillai', 'kartha',
  'shetty', 'bhat', 'kulkarni', 'joshi', 'holla', 'dsouza',
  // Muslim Indian
  'khan', 'ansari', 'sheikh', 'pathan', 'uddin', 'hussain', 'ali', 'mirza',
  'akhtar', 'siddiqui', 'farooqi', 'qureshi', 'sayyed',
]);

// ============================================================================
// COMPANY PATTERNS
// ============================================================================

const COMMON_COMPANIES = new Set([
  'google', 'meta', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix',
  'flipkart', 'amazon', 'myntra', 'paytm', 'phonepe', 'gpay',
  'reliance', 'tata', 'infosys', 'wipro', 'tcs', 'hdfc', 'icici',
  'swiggy', 'zomato', 'ola', 'uber', 'oyo', 'cred',
  // Indian startups
  'razorpay', 'razorpay', 'freshworks', 'zoho', 'inMobi',
  'dream11', 'coinDCX', 'groww', 'chQ', 'phi',
]);

// ============================================================================
// NER CLASSIFIER
// ============================================================================

class NERService {
  private entities: Entity[] = [];
  private learnedEntities: Map<string, Entity> = new Map();
  private customEntities: CustomEntity[] = [];

  /**
   * Initialize NER
   */
  async init(): Promise<void> {
    // Load learned entities
    const stored = await AsyncStorage.getItem(NER_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      this.learnedEntities = new Map(Object.entries(data.learned || {}));
      this.customEntities = data.custom || [];
    }

    console.log('[NER] Initialized with', this.learnedEntities.size, 'learned entities');
  }

  /**
   * Extract entities from text
   */
  async extract(text: string): Promise<Entity[]> {
    await this.init();

    const entities: Entity[] = [];
    const words = text.split(/\s+/);

    // 1. Check learned entities first
    for (const [entityText, entity] of this.learnedEntities) {
      if (text.toLowerCase().includes(entityText.toLowerCase())) {
        entities.push(entity);
      }
    }

    // 2. Check custom entities (acronyms)
    for (const custom of this.customEntities) {
      if (text.includes(custom.text)) {
        entities.push({
          text: custom.text,
          type: custom.type,
          normalized: custom.expanded,
          confidence: 1.0,
        });
      }
    }

    // 3. Detect Indian names (First + Last name patterns)
    const names = this.extractIndianNames(text);
    entities.push(...names);

    // 4. Detect companies
    const companies = this.extractCompanies(text);
    entities.push(...companies);

    // 5. Detect money amounts
    const money = this.extractMoney(text);
    entities.push(...money);

    // 6. Detect dates
    const dates = this.extractDates(text);
    entities.push(...dates);

    this.entities = entities;
    return entities;
  }

  /**
   * Extract Indian names
   */
  private extractIndianNames(text: string): Entity[] {
    const entities: Entity[] = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const first = words[i]?.toLowerCase().replace(/[^a-z]/g, '');
      const last = words[i + 1]?.toLowerCase().replace(/[^a-z]/g, '');

      // Check if it's a name pattern
      if (INDIAN_FIRST_NAMES.has(first) && INDIAN_LAST_NAMES.has(last)) {
        entities.push({
          text: `${words[i]} ${words[i + 1]}`,
          type: 'person',
          confidence: 0.9,
        });
        i++; // Skip next word
      } else if (INDIAN_FIRST_NAMES.has(first)) {
        entities.push({
          text: words[i],
          type: 'person',
          confidence: 0.7,
        });
      }
    }

    // Also check for title-cased names
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    let match;
    while ((match = namePattern.exec(text)) !== null) {
      const name = match[1];
      if (!COMMON_COMPANIES.has(name.toLowerCase())) {
        entities.push({
          text: name,
          type: 'person',
          confidence: 0.6,
        });
      }
    }

    return entities;
  }

  /**
   * Extract companies
   */
  private extractCompanies(text: string): Entity[] {
    const entities: Entity[] = [];
    const lowerText = text.toLowerCase();

    for (const company of COMMON_COMPANIES) {
      if (lowerText.includes(company)) {
        entities.push({
          text: company,
          type: 'company',
          confidence: 0.95,
        });
      }
    }

    return entities;
  }

  /**
   * Extract money amounts
   */
  private extractMoney(text: string): Entity[] {
    const entities: Entity[] = [];

    // Indian Rupees
    const rupeePattern = /(?:₹|Rs\.?|Rupees?)\s*([\d,]+(?:\.\d{2})?)/gi;
    let match;
    while ((match = rupeePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'money',
        normalized: `INR ${match[1].replace(/,/g, '')}`,
        confidence: 0.95,
      });
    }

    // Plain numbers with context
    const numPattern = /([\d,]+)\s*(?:rupees?|bucks?|dollars?|INR)/gi;
    while ((match = numPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'money',
        confidence: 0.9,
      });
    }

    return entities;
  }

  /**
   * Extract dates
   */
  private extractDates(text: string): Entity[] {
    const entities: Entity[] = [];
    const lowerText = text.toLowerCase();

    // Relative dates
    if (lowerText.includes('tomorrow')) {
      entities.push({ text: 'tomorrow', type: 'date', confidence: 1.0 });
    }
    if (lowerText.includes('today')) {
      entities.push({ text: 'today', type: 'date', confidence: 1.0 });
    }
    if (lowerText.includes('next week')) {
      entities.push({ text: 'next week', type: 'date', confidence: 0.95 });
    }

    // Day names
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (lowerText.includes(day)) {
        entities.push({ text: day, type: 'date', confidence: 0.95 });
      }
    }

    return entities;
  }

  /**
   * Learn new entity
   */
  async learnEntity(text: string, type: Entity['type'], originalText?: string): Promise<void> {
    const key = originalText || text.toLowerCase();
    this.learnedEntities.set(key, {
      text,
      type,
      confidence: 1.0,
    });

    await this.persist();
  }

  /**
   * Add custom entity (acronym)
   */
  async addAcronym(acronym: string, expansion: string): Promise<void> {
    this.customEntities.push({
      text: acronym,
      type: 'custom',
      expanded: expansion,
    });

    await this.persist();
  }

  /**
   * Get entity context
   */
  getEntities(): Entity[] {
    return this.entities;
  }

  /**
   * Persist learned entities
   */
  private async persist(): Promise<void> {
    const data = {
      learned: Object.fromEntries(this.learnedEntities),
      custom: this.customEntities,
    };

    await AsyncStorage.setItem(NER_KEY, JSON.stringify(data));
  }

  /**
   * Clear learned entities
   */
  async clear(): Promise<void> {
    this.learnedEntities.clear();
    this.customEntities = [];
    await AsyncStorage.removeItem(NER_KEY);
  }

  /**
   * Get stats
   */
  getStats(): { learned: number; custom: number } {
    return {
      learned: this.learnedEntities.size,
      custom: this.customEntities.length,
    };
  }
}

export const nerService = new NERService();
export default nerService;
