/**
 * Content Extractor - AI-powered content extraction
 *
 * Extracts structured data from unstructured content using LLM-based extraction
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ExtractionOptions {
  schema?: Record<string, string>;  // Field name -> description
  prompt?: string;                // Custom extraction prompt
}

export interface ExtractionResult {
  success: boolean;
  extracted: Record<string, any>;
  confidence?: number;
}

export interface Entity {
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'url' | 'email' | 'phone';
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export class ContentExtractor {
  private openaiApiKey?: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Extract structured data from content
   */
  async extract(content: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    // If OpenAI is configured, use LLM extraction
    if (this.openaiApiKey && options?.prompt) {
      return this.extractWithLLM(content, options);
    }

    // Fallback to regex-based extraction
    return this.extractWithRegex(content, options);
  }

  /**
   * Extract using LLM (OpenAI)
   */
  private async extractWithLLM(content: string, options: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a data extraction assistant. Extract structured information from the provided content.
Return a JSON object with the extracted fields. If a field is not found, use null.
Be precise and extract only what's explicitly mentioned.`
            },
            {
              role: 'user',
              content: `Extract the following from this content:\n\n${options.prompt}\n\nContent:\n${content.slice(0, 10000)}`
            }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const extracted = JSON.parse(response.data.choices[0].message.content);

      return {
        success: true,
        extracted,
        confidence: 0.85
      };
    } catch (error: any) {
      throw new Error(`LLM extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract using regex patterns
   */
  private extractWithRegex(content: string, options?: ExtractionOptions): ExtractionResult {
    const extracted: Record<string, any> = {};
    const $ = cheerio.load(content);

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = content.match(emailRegex);
    if (emails) extracted.emails = [...new Set(emails)];

    // Extract phone numbers
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = content.match(phoneRegex);
    if (phones) extracted.phones = [...new Set(phones)].slice(0, 10);

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const urls = content.match(urlRegex);
    if (urls) extracted.urls = [...new Set(urls)];

    // Extract dates
    const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi;
    const dates = content.match(dateRegex);
    if (dates) extracted.dates = [...new Set(dates)];

    // Extract money/currency
    const moneyRegex = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b(?:Rs\.?|INR|USD|EUR|GBP)\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi;
    const money = content.match(moneyRegex);
    if (money) extracted.money = [...new Set(money)];

    // Extract titles (from h1, h2, h3)
    const titles: string[] = [];
    $('h1, h2, h3, h4').each((_, el) => {
      const text = $(el).text().trim();
      if (text) titles.push(text);
    });
    if (titles.length) extracted.titles = titles;

    // Extract schema fields if provided
    if (options?.schema) {
      for (const [field, description] of Object.entries(options.schema)) {
        // Simple keyword-based extraction
        const keywords = description.toLowerCase().split(/\s+/);
        const lines = content.split('\n');

        for (const line of lines) {
          if (keywords.some(kw => line.toLowerCase().includes(kw))) {
            extracted[field] = line.replace(/^[^:]+:\s*/, '').trim();
            break;
          }
        }
      }
    }

    return {
      success: true,
      extracted
    };
  }

  /**
   * Extract named entities from content
   */
  async extractEntities(content: string, types?: string[]): Promise<Entity[]> {
    // If OpenAI is configured, use NER
    if (this.openaiApiKey) {
      return this.extractEntitiesWithLLM(content, types);
    }

    // Fallback to regex-based entity extraction
    return this.extractEntitiesWithRegex(content, types);
  }

  /**
   * Extract entities using LLM
   */
  private async extractEntitiesWithLLM(content: string, types?: string[]): Promise<Entity[]> {
    try {
      const typeList = types?.join(', ') || 'person, organization, location, date, money, url';

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Extract named entities from the text. Return a JSON array of entities with:
- type: one of ${typeList}
- value: the entity text
- start: character position start
- end: character position end

Return ONLY the JSON array, nothing else.`
            },
            {
              role: 'user',
              content: content.slice(0, 8000)
            }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = JSON.parse(response.data.choices[0].message.content);
      return result.entities || [];
    } catch (error: any) {
      throw new Error(`Entity extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract entities using regex patterns
   */
  private extractEntitiesWithRegex(content: string, types?: string[]): Entity[] {
    const entities: Entity[] = [];
    const check = (type: string) => !types || types.includes(type);

    // Extract emails
    if (check('email')) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      let match;
      while ((match = emailRegex.exec(content)) !== null) {
        entities.push({
          type: 'email',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.95
        });
      }
    }

    // Extract URLs
    if (check('url')) {
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
      let match;
      while ((match = urlRegex.exec(content)) !== null) {
        entities.push({
          type: 'url',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.95
        });
      }
    }

    // Extract phone numbers
    if (check('phone')) {
      const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      let match;
      while ((match = phoneRegex.exec(content)) !== null) {
        entities.push({
          type: 'phone',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.85
        });
      }
    }

    // Extract money amounts
    if (check('money')) {
      const moneyRegex = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b(?:Rs\.?|INR)\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
      let match;
      while ((match = moneyRegex.exec(content)) !== null) {
        entities.push({
          type: 'money',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.9
        });
      }
    }

    // Extract dates
    if (check('date')) {
      const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
      let match;
      while ((match = dateRegex.exec(content)) !== null) {
        entities.push({
          type: 'date',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8
        });
      }
    }

    return entities;
  }

  /**
   * Extract article content (clean text from HTML)
   */
  extractArticle(html: string): string {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, .advertisement, .ad, .sidebar, .comments, .social-share').remove();

    // Try to find main content
    const articleSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content'
    ];

    for (const selector of articleSelectors) {
      const content = $(selector).text().trim();
      if (content.length > 200) {
        return content.replace(/\s+/g, ' ').trim();
      }
    }

    // Fallback to body
    return $('body').text().replace(/\s+/g, ' ').trim();
  }
}
