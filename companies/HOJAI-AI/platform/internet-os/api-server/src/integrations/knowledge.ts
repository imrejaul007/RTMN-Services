/**
 * Knowledge Extraction Integration
 *
 * REUSES: Knowledge Extraction Service (port 4784)
 * DO NOT build new extraction - use this bridge
 */

import axios from 'axios';
import { config } from '../config.js';

const KE_URL = config.services.knowledgeExtraction;

export interface ExtractedEntities {
  entities?: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  facts?: Array<{
    subject: string;
    predicate: string;
    object: string;
  }>;
}

export class KnowledgeIntegration {
  private token: string;

  constructor(token?: string) {
    this.token = token || config.auth.internalToken;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Extract named entities from text
   */
  async extractEntities(
    text: string,
    types?: string[],
    minConfidence = 0.5
  ): Promise<ExtractedEntities> {
    try {
      const response = await axios.post(
        `${KE_URL}/api/ner/extract`,
        {
          text,
          types: types || ['ORG', 'PERSON', 'LOCATION', 'PRODUCT', 'EMAIL', 'PHONE', 'URL'],
          minConfidence,
          includeSpans: true,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to extract entities:', error);
      return { entities: [] };
    }
  }

  /**
   * Extract facts (subject-predicate-object triples)
   */
  async extractFacts(
    text: string,
    minConfidence = 0.4,
    maxFacts = 50
  ): Promise<ExtractedEntities> {
    try {
      const response = await axios.post(
        `${KE_URL}/api/facts/extract`,
        {
          text,
          minConfidence,
          maxFacts,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to extract facts:', error);
      return { facts: [] };
    }
  }

  /**
   * Run all extraction (NER + linking + facts)
   */
  async extractAll(text: string): Promise<ExtractedEntities> {
    try {
      const response = await axios.post(
        `${KE_URL}/api/extract-all`,
        {
          text,
          options: {
            ner: { types: null, minConfidence: 0.5 },
            link: true,
            facts: { minConfidence: 0.4, maxFacts: 50 },
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to extract all:', error);
      return {};
    }
  }

  /**
   * Link entity to knowledge base
   */
  async linkEntity(
    entityText: string,
    entityType: string,
    kbId?: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${KE_URL}/api/link`,
        {
          entityText,
          entityType,
          kbId: kbId || `internet-os-${Date.now()}`,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to link entity:', error);
      return null;
    }
  }

  /**
   * Add entity to knowledge base
   */
  async addToKnowledgeBase(entity: {
    id?: string;
    canonical: string;
    type: string;
    aliases?: string[];
    properties?: Record<string, any>;
  }): Promise<any> {
    try {
      const response = await axios.post(
        `${KE_URL}/api/kb/entities`,
        {
          id: entity.id || `kb-${Date.now()}`,
          canonical: entity.canonical,
          type: entity.type,
          aliases: entity.aliases || [],
          properties: {
            ...entity.properties,
            source: 'internet-os',
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to add to KB:', error);
      throw error;
    }
  }

  /**
   * Search knowledge base
   */
  async searchKnowledgeBase(query: string, type?: string, limit = 10): Promise<any[]> {
    try {
      const params: Record<string, string> = { search: query, limit: String(limit) };
      if (type) params.type = type;

      const response = await axios.get(`${KE_URL}/api/kb/entities`, {
        params,
        headers: this.headers,
      });
      return response.data.entities || [];
    } catch (error) {
      console.error('Failed to search KB:', error);
      return [];
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getKBStats(): Promise<any> {
    try {
      const response = await axios.get(`${KE_URL}/api/kb/stats`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get KB stats:', error);
      return {};
    }
  }

  /**
   * Process scraped content - extract and store entities
   */
  async processScrapedContent(
    url: string,
    html: string,
    metadata?: Record<string, any>
  ): Promise<{
    entities: any[];
    facts: any[];
    text: string;
  }> {
    // Extract text from HTML (simple approach)
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract all
    const extracted = await this.extractAll(text);

    // Add to knowledge base
    if (extracted.entities) {
      for (const entity of extracted.entities) {
        await this.addToKnowledgeBase({
          canonical: entity.text,
          type: entity.type,
          properties: {
            confidence: entity.confidence,
            source: url,
            metadata,
          },
        });
      }
    }

    return {
      entities: extracted.entities || [],
      facts: extracted.facts || [],
      text,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${KE_URL}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let instance: KnowledgeIntegration | null = null;

export function getKnowledgeIntegration(token?: string): KnowledgeIntegration {
  if (!instance) {
    instance = new KnowledgeIntegration(token);
  }
  return instance;
}

export const knowledgeIntegration = new KnowledgeIntegration();
export default knowledgeIntegration;
