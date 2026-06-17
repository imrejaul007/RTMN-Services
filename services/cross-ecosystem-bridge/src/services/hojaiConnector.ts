/**
 * HOJAI AI Connector
 * Connects to HOJAI AI services (Genie, Memory, Agent)
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export interface HojaiUserProfile {
  userId: string;
  genieId?: string;
  name?: {
    first?: string;
    last?: string;
    full?: string;
  };
  email?: string;
  phone?: string;
  preferences?: Record<string, unknown>;
  memoryUsage?: {
    interactions: number;
    lastInteraction?: Date;
    contextLoaded?: number;
  };
  aiSettings?: {
    personality?: string;
    language?: string;
    tone?: string;
  };
}

export interface HojaiInteraction {
  userId: string;
  type: 'query' | 'command' | 'preference_update' | 'context_load';
  content: string;
  timestamp: Date;
  response?: string;
  services?: string[];
}

class HojaiConnector {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.HOJAI_API_URL || 'http://localhost:4500';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get user profile from HOJAI AI
   */
  async getUserProfile(userId: string, token?: string): Promise<HojaiUserProfile | null> {
    try {
      const response = await this.client.get(`/api/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.warn(`HOJAI getUserProfile failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user profile by Genie ID
   */
  async getUserByGenieId(genieId: string, token?: string): Promise<HojaiUserProfile | null> {
    try {
      const response = await this.client.get(`/api/genie/${genieId}/user`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.warn(`HOJAI getUserByGenieId failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user interactions summary
   */
  async getInteractionsSummary(userId: string, token?: string): Promise<{
    totalInteractions: number;
    lastInteraction?: Date;
    topServices: string[];
  } | null> {
    try {
      const response = await this.client.get(`/api/users/${userId}/interactions/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      logger.warn(`HOJAI getInteractionsSummary failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get memory context for user
   */
  async getMemoryContext(userId: string, token?: string): Promise<Record<string, unknown> | null> {
    try {
      const memoryUrl = process.env.HOJAI_MEMORY_URL || 'http://localhost:4703';
      const memoryClient = axios.create({
        baseURL: memoryUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const response = await memoryClient.get(`/api/memory/${userId}/context`);
      return response.data;
    } catch (error: any) {
      logger.warn(`HOJAI getMemoryContext failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get AI preferences for user
   */
  async getPreferences(userId: string, token?: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.client.get(`/api/users/${userId}/preferences`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      logger.warn(`HOJAI getPreferences failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Record<string, unknown>,
    token?: string
  ): Promise<boolean> {
    try {
      await this.client.patch(
        `/api/users/${userId}/preferences`,
        preferences,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`HOJAI updatePreferences failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Record interaction with Genie
   */
  async recordInteraction(interaction: HojaiInteraction, token?: string): Promise<boolean> {
    try {
      await this.client.post(
        '/api/interactions',
        interaction,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`HOJAI recordInteraction failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Query Genie AI
   */
  async queryGenie(genieId: string, query: string, context?: Record<string, unknown>): Promise<{
    response: string;
    actions?: Array<{ service: string; action: string; params?: Record<string, unknown> }>;
  } | null> {
    try {
      const genieUrl = process.env.HOJAI_GENIE_URL || 'http://localhost:4501';
      const genieClient = axios.create({
        baseURL: genieUrl,
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await genieClient.post('/api/query', {
        genieId,
        query,
        context,
      });
      return response.data;
    } catch (error: any) {
      logger.warn(`HOJAI queryGenie failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get HOJAI services status
   */
  async getServicesStatus(): Promise<Record<string, 'up' | 'down' | 'unknown'>> {
    const status: Record<string, 'up' | 'down' | 'unknown'> = {};
    const services = [
      { name: 'hojai-api', url: '/health' },
      { name: 'hojai-genie', url: '/health', base: process.env.HOJAI_GENIE_URL },
      { name: 'hojai-memory', url: '/health', base: process.env.HOJAI_MEMORY_URL },
    ];

    for (const service of services) {
      try {
        const baseUrl = service.base || this.baseUrl;
        const client = axios.create({ baseURL: baseUrl, timeout: 5000 });
        await client.get(service.url);
        status[service.name] = 'up';
      } catch {
        status[service.name] = 'down';
      }
    }

    return status;
  }

  /**
   * Search users by criteria
   */
  async searchUsers(query: string, limit: number = 20): Promise<HojaiUserProfile[]> {
    try {
      const response = await this.client.get('/api/users/search', {
        params: { q: query, limit },
      });
      return response.data.users || [];
    } catch (error: any) {
      logger.warn(`HOJAI searchUsers failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Create user in HOJAI
   */
  async createUser(userData: Partial<HojaiUserProfile>, token?: string): Promise<HojaiUserProfile | null> {
    try {
      const response = await this.client.post(
        '/api/users',
        userData,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`HOJAI createUser failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Link HOJAI user to ecosystem profile
   */
  async linkToEcosystem(
    hojaiUserId: string,
    ecosystemProfileId: string,
    token?: string
  ): Promise<boolean> {
    try {
      await this.client.post(
        `/api/users/${hojaiUserId}/link`,
        { ecosystemProfileId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`HOJAI linkToEcosystem failed: ${error.message}`);
      return false;
    }
  }
}

// Singleton instance
export const hojaiConnector = new HojaiConnector();
export default hojaiConnector;
