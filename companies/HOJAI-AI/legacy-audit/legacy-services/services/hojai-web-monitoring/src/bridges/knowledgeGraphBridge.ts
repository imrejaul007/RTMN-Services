/**
 * Knowledge Graph Bridge - Syncs entities to HOJAI Knowledge Graph
 */

import axios from 'axios';

export interface KGEntity {
  id: string;
  type: 'person' | 'organization' | 'location' | 'website' | 'product' | 'event';
  name: string;
  properties?: Record<string, any>;
  url?: string;
  lastScraped?: string;
}

export interface KGRelationship {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
}

export class KnowledgeGraphBridge {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.apiKey = process.env.KNOWLEDGE_GRAPH_API_KEY || 'kg-internal-key';
  }

  /**
   * Sync entities to Knowledge Graph
   */
  async syncEntities(
    entities: KGEntity[],
    relationships?: KGRelationship[]
  ): Promise<{ entitiesCreated: number; relationshipsCreated: number }> {
    let entitiesCreated = 0;
    let relationshipsCreated = 0;

    // Create entities
    for (const entity of entities) {
      try {
        await axios.post(
          `${this.baseUrl}/api/entities`,
          {
            id: entity.id,
            type: entity.type,
            name: entity.name,
            properties: {
              ...entity.properties,
              source: 'web-monitoring',
              lastScraped: entity.lastScraped || new Date().toISOString()
            },
            url: entity.url
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        entitiesCreated++;
      } catch (error: any) {
        console.warn(`Failed to create entity ${entity.id}:`, error.message);
      }
    }

    // Create relationships
    if (relationships) {
      for (const rel of relationships) {
        try {
          await axios.post(
            `${this.baseUrl}/api/relationships`,
            {
              from: rel.from,
              to: rel.to,
              type: rel.type,
              properties: rel.properties
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );
          relationshipsCreated++;
        } catch (error: any) {
          console.warn(`Failed to create relationship:`, error.message);
        }
      }
    }

    return { entitiesCreated, relationshipsCreated };
  }

  /**
   * Query entities from Knowledge Graph
   */
  async queryEntities(query: string, limit = 50): Promise<KGEntity[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/entities/search`,
        {
          params: { query, limit },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 10000
        }
      );

      return response.data.entities || [];
    } catch (error: any) {
      console.warn('KG query error:', error.message);
      return [];
    }
  }

  /**
   * Get relationships for an entity
   */
  async getRelationships(entityId: string): Promise<KGRelationship[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/entities/${entityId}/relationships`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 10000
        }
      );

      return response.data.relationships || [];
    } catch (error: any) {
      console.warn('KG relationships error:', error.message);
      return [];
    }
  }

  /**
   * Create company graph from scraped data
   */
  async createCompanyGraph(
    companyName: string,
    companyUrl: string,
    relatedData: {
      competitors?: string[];
      locations?: string[];
      products?: string[];
      news?: Array<{ title: string; url: string }>;
    }
  ): Promise<void> {
    const entities: KGEntity[] = [
      { id: `company-${companyName}`, type: 'organization', name: companyName, url: companyUrl },
 ];

    const relationships: KGRelationship[] = [];

    // Add competitors
    if (relatedData.competitors) {
      for (const competitor of relatedData.competitors) {
        entities.push({
          id: `company-${competitor}`,
          type: 'organization',
          name: competitor
        });
        relationships.push({
          from: `company-${companyName}`,
          to: `company-${competitor}`,
          type: 'COMPETES_WITH'
        });
      }
    }

    // Add locations
    if (relatedData.locations) {
      for (const location of relatedData.locations) {
        entities.push({
          id: `location-${location}`,
          type: 'location',
          name: location
        });
        relationships.push({
          from: `company-${companyName}`,
          to: `location-${location}`,
          type: 'LOCATED_IN'
        });
      }
    }

    // Add products
    if (relatedData.products) {
      for (const product of relatedData.products) {
        entities.push({
          id: `product-${product}`,
          type: 'product',
          name: product
        });
        relationships.push({
          from: `company-${companyName}`,
          to: `product-${product}`,
          type: 'SELLS'
        });
      }
    }

    // Add news as events
    if (relatedData.news) {
      for (const article of relatedData.news) {
        entities.push({
          id: `event-${Date.now()}-${Math.random()}`,
          type: 'event',
          name: article.title,
          properties: { url: article.url }
        });
        relationships.push({
          from: `company-${companyName}`,
          to: `event-${Date.now()}-${Math.random()}`,
          type: 'MENTIONED_IN'
        });
      }
    }

    await this.syncEntities(entities, relationships);
  }
}