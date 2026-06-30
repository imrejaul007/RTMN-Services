/**
 * Spec Extractor Module
 * Extract and normalize product specifications from various formats
 */

interface RawSpecs {
  text?: string;
  attributes?: Record<string, string>;
  ocrText?: string;
}

interface NormalizedSpecs {
  attributes: Record<string, { value: string; unit?: string; standardized: boolean }>;
  completeness: number;
  issues: string[];
}

const STANDARD_UNITS: Record<string, string[]> = {
  weight: ['g', 'kg', 'mg', 'lb', 'oz'],
  length: ['mm', 'cm', 'm', 'in', 'ft'],
  volume: ['ml', 'l', 'oz', 'gal'],
  temperature: ['c', 'f', 'k'],
};

const STANDARD_VALUES = {
  color: ['red', 'blue', 'green', 'black', 'white', 'gray', 'yellow', 'pink', 'purple', 'orange', 'brown'],
  size: ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl'],
  material: ['cotton', 'polyester', 'leather', 'plastic', 'metal', 'wood', 'glass', 'ceramic'],
};

export class SpecExtractor {
  /**
   * Extract and normalize specs
   */
  async extract(rawSpecs: RawSpecs): Promise<NormalizedSpecs> {
    const attributes: NormalizedSpecs['attributes'] = {};
    const issues: string[] = [];

    // Extract from text using NLP (mock implementation)
    if (rawSpecs.text) {
      const textSpecs = this.parseTextSpecs(rawSpecs.text);
      for (const [key, value] of Object.entries(textSpecs)) {
        attributes[key] = this.normalizeAttribute(key, value);
      }
    }

    // Direct attributes (already structured)
    if (rawSpecs.attributes) {
      for (const [key, value] of Object.entries(rawSpecs.attributes)) {
        attributes[key.toLowerCase()] = this.normalizeAttribute(key, value);
      }
    }

    // OCR extraction (mock)
    if (rawSpecs.ocrText) {
      const ocrSpecs = this.parseTextSpecs(rawSpecs.ocrText);
      for (const [key, value] of Object.entries(ocrSpecs)) {
        if (!attributes[key]) {
          attributes[key] = this.normalizeAttribute(key, value);
        }
      }
    }

    const completeness = this.calculateCompleteness(attributes);

    // Check for missing required specs
    if (completeness < 0.5) {
      issues.push('Less than 50% of specs filled in');
    }
    if (!attributes.color) issues.push('Missing color specification');
    if (!attributes.weight) issues.push('Missing weight specification');

    return {
      attributes,
      completeness,
      issues,
    };
  }

  /**
   * Parse text specs using regex patterns
   */
  private parseTextSpecs(text: string): Record<string, string> {
    const specs: Record<string, string> = {};

    // Common patterns: "Color: Red", "Weight: 500g", etc.
    const patterns = [
      { key: 'color', regex: /(?:color|colour)[\s:]+([a-z]+)/i },
      { key: 'weight', regex: /(?:weight)[\s:]+([\d.]+\s*[a-z]+)/i },
      { key: 'size', regex: /(?:size)[\s:]+([a-z0-9]+)/i },
      { key: 'material', regex: /(?:material)[\s:]+([a-z]+)/i },
      { key: 'length', regex: /(?:length)[\s:]+([\d.]+\s*[a-z]+)/i },
      { key: 'width', regex: /(?:width)[\s:]+([\d.]+\s*[a-z]+)/i },
      { key: 'height', regex: /(?:height)[\s:]+([\d.]+\s*[a-z]+)/i },
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        specs[pattern.key] = match[1].trim();
      }
    }

    return specs;
  }

  /**
   * Normalize an attribute (standardize units, values)
   */
  private normalizeAttribute(key: string, value: string): NormalizedSpecs['attributes'][string] {
    const lower = value.toLowerCase();
    const keyLower = key.toLowerCase();

    // Detect units for numeric attributes
    let unit: string | undefined;
    if (STANDARD_UNITS[keyLower]) {
      for (const u of STANDARD_UNITS[keyLower]) {
        if (lower.includes(u)) {
          unit = u;
          break;
        }
      }
    }

    // Standardize values
    let standardizedValue = value;
    if (STANDARD_VALUES[keyLower as keyof typeof STANDARD_VALUES]) {
      const standardValues = STANDARD_VALUES[keyLower as keyof typeof STANDARD_VALUES];
      const found = standardValues.find(v => lower.includes(v));
      if (found) standardizedValue = found;
    }

    // Convert weights to grams (standard)
    if (keyLower === 'weight' && unit === 'kg') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        standardizedValue = `${numValue * 1000}`;
        unit = 'g';
      }
    }

    return {
      value: standardizedValue,
      unit,
      standardized: standardizedValue === value,
    };
  }

  /**
   * Calculate spec completeness
   */
  private calculateCompleteness(attributes: Record<string, any>): number {
    const requiredFields = ['color', 'weight', 'size', 'material', 'brand'];
    let filled = 0;

    for (const field of requiredFields) {
      if (attributes[field]) filled++;
    }

    return filled / requiredFields.length;
  }
}

export default new SpecExtractor();
