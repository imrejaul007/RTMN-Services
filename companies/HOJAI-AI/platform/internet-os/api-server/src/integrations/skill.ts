/**
 * SkillOS Integration
 *
 * REUSES: SkillOS (port 4743)
 * DO NOT build new skill registry - use this bridge
 */

import axios from 'axios';
import { config } from '../config.js';

const SKILL_OS_URL = config.services.skillOs;

export interface SkillDefinition {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  version?: string;
  author?: string;
}

export interface SkillExecution {
  skillId: string;
  inputs: Record<string, any>;
}

export class SkillIntegration {
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
   * Register a scraping actor as a skill
   */
  async registerSkill(skill: SkillDefinition): Promise<any> {
    try {
      const response = await axios.post(
        `${SKILL_OS_URL}/api/skills`,
        {
          name: skill.name,
          description: skill.description,
          category: skill.category || 'web_scraping',
          tags: skill.tags || ['internet-os', 'scraping'],
          inputs: skill.inputs || {
            type: 'object',
            properties: {
              query: { type: 'string' },
              location: { type: 'string' },
              limit: { type: 'number' },
            },
          },
          outputs: skill.outputs || {
            type: 'object',
            properties: {
              data: { type: 'array' },
              count: { type: 'number' },
            },
          },
          version: skill.version || '1.0.0',
          author: skill.author || 'internet-os',
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to register skill:', error);
      throw error;
    }
  }

  /**
   * Register all actors as skills
   */
  async registerAllActorsAsSkills(): Promise<void> {
    const actors = [
      {
        name: 'google-maps-scraper',
        description: 'Extract business information from Google Maps',
        category: 'web_scraping',
        tags: ['maps', 'business', 'location', 'google'],
      },
      {
        name: 'zomato-scraper',
        description: 'Scrape restaurant data from Zomato',
        category: 'web_scraping',
        tags: ['restaurant', 'zomato', 'food', 'india'],
      },
      {
        name: 'airbnb-scraper',
        description: 'Extract property listings from Airbnb',
        category: 'web_scraping',
        tags: ['airbnb', 'property', 'vacation', 'rental'],
      },
      {
        name: 'linkedin-scraper',
        description: 'Extract professional profile data from LinkedIn',
        category: 'web_scraping',
        tags: ['linkedin', 'professional', 'jobs', 'hr'],
      },
      {
        name: 'news-scraper',
        description: 'Aggregate news articles',
        category: 'web_scraping',
        tags: ['news', 'media', 'current-affairs'],
      },
      {
        name: 'company-intel-scraper',
        description: 'Company intelligence and research',
        category: 'web_scraping',
        tags: ['company', 'business', 'intelligence', 'research'],
      },
      {
        name: 'justdial-scraper',
        description: 'Local business search via JustDial',
        category: 'web_scraping',
        tags: ['justdial', 'local', 'india', 'business'],
      },
    ];

    for (const actor of actors) {
      try {
        await this.registerSkill(actor);
        console.log(`Registered skill: ${actor.name}`);
      } catch (error) {
        console.error(`Failed to register skill: ${actor.name}`, error);
      }
    }
  }

  /**
   * List all skills
   */
  async listSkills(category?: string): Promise<any[]> {
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;

      const response = await axios.get(`${SKILL_OS_URL}/api/skills`, {
        params,
        headers: this.headers,
      });
      return response.data.skills || [];
    } catch (error) {
      console.error('Failed to list skills:', error);
      return [];
    }
  }

  /**
   * Get skill details
   */
  async getSkill(skillId: string): Promise<any> {
    try {
      const response = await axios.get(`${SKILL_OS_URL}/api/skills/${skillId}`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to get skill ${skillId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a skill
   */
  async executeSkill(skillId: string, inputs: Record<string, any>): Promise<any> {
    try {
      const response = await axios.post(
        `${SKILL_OS_URL}/api/skills/${skillId}/execute`,
        { inputs },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to execute skill ${skillId}:`, error);
      throw error;
    }
  }

  /**
   * Update a skill
   */
  async updateSkill(skillId: string, updates: Partial<SkillDefinition>): Promise<any> {
    try {
      const response = await axios.put(
        `${SKILL_OS_URL}/api/skills/${skillId}`,
        updates,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update skill ${skillId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a skill
   */
  async deleteSkill(skillId: string): Promise<void> {
    try {
      await axios.delete(`${SKILL_OS_URL}/api/skills/${skillId}`, {
        headers: this.headers,
      });
    } catch (error) {
      console.error(`Failed to delete skill ${skillId}:`, error);
    }
  }

  /**
   * Semantic search for skills
   */
  async searchSkills(query: string, limit = 10): Promise<any[]> {
    try {
      const response = await axios.get(`${SKILL_OS_URL}/api/discover/semantic`, {
        params: { q: query, limit },
        headers: this.headers,
      });
      return response.data.skills || [];
    } catch (error) {
      console.error('Failed to search skills:', error);
      return [];
    }
  }

  /**
   * Get skill categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await axios.get(`${SKILL_OS_URL}/api/skills/categories`, {
        headers: this.headers,
      });
      return response.data.categories || [];
    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }

  /**
   * Compose multiple skills into a workflow
   */
  async composeSkills(
    goal: string,
    skillIds: string[],
    input: Record<string, any>
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${SKILL_OS_URL}/api/skills/compose`,
        {
          goal,
          skills: skillIds,
          input,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to compose skills:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${SKILL_OS_URL}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let instance: SkillIntegration | null = null;

export function getSkillIntegration(token?: string): SkillIntegration {
  if (!instance) {
    instance = new SkillIntegration(token);
  }
  return instance;
}

export const skillIntegration = new SkillIntegration();
export default skillIntegration;
