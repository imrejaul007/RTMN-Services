/**
 * Genie Bridge - Beauty Memory Extension
 *
 * Extended Genie integration with beauty-specific memory storage
 */

import axios from 'axios';
import { logger } from '../../../utils/logger.js';

const GENIE_MEMORY_URL = process.env.GENIE_MEMORY_URL || 'http://localhost:4703';
const GENIE_BRIEFING_URL = process.env.GENIE_BRIEFING_URL || 'http://localhost:4704';

export class GenieBridge {
  private memory: axios.AxiosInstance;
  private briefing: axios.AxiosInstance;

  constructor() {
    this.memory = axios.create({
      baseURL: GENIE_MEMORY_URL,
      timeout: 10000
    });
    this.briefing = axios.create({
      baseURL: GENIE_BRIEFING_URL,
      timeout: 10000
    });
  }

  // ============ BEAUTY MEMORY STORAGE ============

  /**
   * Store beauty-related memory in Genie
   */
  async storeBeautyMemory(userId: string, memory: {
    type: 'hair_color' | 'skin_care' | 'treatment' | 'product' | 'stylist' | 'allergy';
    content: string;
    importance?: 'critical' | 'high' | 'medium' | 'low';
    metadata?: {
      serviceId?: string;
      productId?: string;
      stylistId?: string;
      date?: string;
    };
  }): Promise<boolean> {
    try {
      // Map beauty type to Genie category
      const categoryMap: Record<string, string> = {
        'hair_color': 'fact',
        'skin_care': 'fact',
        'treatment': 'event',
        'product': 'preference',
        'stylist': 'fact',
        'allergy': 'critical'
      };

      const response = await this.memory.post('/api/memories', {
        userId,
        content: `[Beauty] ${memory.content}`,
        category: categoryMap[memory.type] || 'fact',
        importance: memory.importance || 'high',
        tags: ['beauty', memory.type, 'glamai'],
        source: 'glamai',
        metadata: memory.metadata,
        emotionalTone: memory.type === 'allergy' ? 'alert' : 'neutral'
      });

      logger.info(`Stored beauty memory for ${userId}: ${memory.type}`);
      return true;
    } catch (error: any) {
      logger.warn(`Genie memory store failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Store hair color formula
   */
  async storeHairColorFormula(userId: string, data: {
    customerId: string;
    color: string;
    brand: string;
    developer?: string;
    stylistId: string;
    stylistName: string;
    date: Date;
  }): Promise<boolean> {
    return this.storeBeautyMemory(userId, {
      type: 'hair_color',
      content: `Hair color: ${data.color} by ${data.brand} (${data.developer || 'standard'}) - done by ${data.stylistName}`,
      importance: 'high',
      metadata: {
        serviceId: data.customerId,
        stylistId: data.stylistId,
        date: data.date.toISOString()
      }
    });
  }

  /**
   * Store allergy information
   */
  async storeAllergy(userId: string, data: {
    customerId: string;
    allergen: string;
    severity: 'mild' | 'severe';
    source?: string;
  }): Promise<boolean> {
    return this.storeBeautyMemory(userId, {
      type: 'allergy',
      content: `ALLERGY: ${data.allergen}${data.source ? ` (from ${data.source})` : ''} - Severity: ${data.severity}`,
      importance: 'critical',
      metadata: {
        productId: data.customerId
      }
    });
  }

  /**
   * Store product preference
   */
  async storeProductPreference(userId: string, data: {
    customerId: string;
    productName: string;
    reaction: 'loved' | 'liked' | 'neutral' | 'disliked';
    notes?: string;
  }): Promise<boolean> {
    return this.storeBeautyMemory(userId, {
      type: 'product',
      content: `Product reaction: ${data.productName} - ${data.reaction}${data.notes ? ` (${data.notes})` : ''}`,
      importance: data.reaction === 'loved' || data.reaction === 'disliked' ? 'high' : 'medium',
      metadata: {
        productId: data.customerId
      }
    });
  }

  /**
   * Store treatment record
   */
  async storeTreatment(userId: string, data: {
    customerId: string;
    treatmentName: string;
    stylistId: string;
    stylistName: string;
    date: Date;
    satisfaction?: number;
    notes?: string;
  }): Promise<boolean> {
    return this.storeBeautyMemory(userId, {
      type: 'treatment',
      content: `Treatment: ${data.treatmentName} by ${data.stylistName}${data.satisfaction ? ` - Rating: ${data.satisfaction}/5` : ''}${data.notes ? ` - Notes: ${data.notes}` : ''}`,
      importance: 'medium',
      metadata: {
        serviceId: data.customerId,
        stylistId: data.stylistId,
        date: data.date.toISOString()
      }
    });
  }

  // ============ MEMORY RETRIEVAL ============

  /**
   * Get beauty memories for user
   */
  async getBeautyMemories(userId: string, type?: string): Promise<any[]> {
    try {
      const params: any = { userId, limit: 50 };
      if (type) params.tags = `beauty,${type}`;

      const response = await this.memory.get('/api/memories', { params });
      const memories = response.data.data || [];

      // Filter to beauty memories
      return memories.filter((m: any) =>
        m.tags?.includes('beauty') || m.content?.startsWith('[Beauty]')
      );
    } catch (error: any) {
      logger.warn(`Genie memory get failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Search beauty memories
   */
  async searchBeautyMemories(userId: string, query: string): Promise<any[]> {
    try {
      const response = await this.memory.get('/api/memories/search', {
        params: { userId, query: `[Beauty] ${query}` }
      });

      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Genie memory search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get hair color history
   */
  async getHairColorHistory(userId: string): Promise<any[]> {
    const memories = await this.getBeautyMemories(userId, 'hair_color');
    return memories.filter((m: any) =>
      m.tags?.includes('hair_color') || m.content?.includes('Hair color:')
    );
  }

  /**
   * Get allergies
   */
  async getAllergies(userId: string): Promise<any[]> {
    const memories = await this.getBeautyMemories(userId, 'allergy');
    return memories.filter((m: any) =>
      m.tags?.includes('allergy') || m.content?.includes('ALLERGY:')
    );
  }

  // ============ FOLLOW-UP SCHEDULING ============

  /**
   * Schedule beauty follow-up
   */
  async scheduleFollowUp(userId: string, data: {
    type: 'rebooking' | 'product' | 'seasonal';
    message: string;
    scheduleDate: Date;
    offer?: {
      type: string;
      value: number;
      description: string;
    };
  }): Promise<string | null> {
    try {
      const response = await this.memory.post('/api/reminders', {
        userId,
        type: 'beauty_followup',
        content: data.message,
        scheduledFor: data.scheduleDate.toISOString(),
        metadata: {
          ...data,
          source: 'glamai'
        },
        priority: data.type === 'rebooking' ? 'high' : 'medium'
      });

      logger.info(`Scheduled beauty follow-up for ${userId}: ${data.type}`);
      return response.data.data?.reminderId;
    } catch (error: any) {
      logger.warn(`Follow-up scheduling failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get scheduled follow-ups
   */
  async getScheduledFollowUps(userId: string): Promise<any[]> {
    try {
      const response = await this.memory.get('/api/reminders', {
        params: { userId, type: 'beauty_followup' }
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Follow-ups lookup failed: ${error.message}`);
      return [];
    }
  }

  // ============ BRIEFING INTEGRATION ============

  /**
   * Add beauty info to briefing
   */
  async addToBriefing(userId: string, briefingData: {
    upcomingServices?: string[];
    recommendedProducts?: string[];
    reminders?: string[];
  }): Promise<boolean> {
    try {
      await this.memory.post('/api/briefing/beauty', {
        userId,
        data: briefingData
      });
      return true;
    } catch (error: any) {
      logger.warn(`Briefing update failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate beauty briefing
   */
  async generateBeautyBriefing(userId: string): Promise<{
    greeting: string;
    reminders: string[];
    recommendations: string[];
    upcoming: string[];
  }> {
    try {
      const memories = await this.getBeautyMemories(userId);
      const followUps = await this.getScheduledFollowUps(userId);

      const reminders = followUps.map((f: any) => f.content);
      const recommendations = memories
        .filter((m: any) => m.importance === 'high')
        .slice(0, 3)
        .map((m: any) => m.content);

      // Generate greeting based on recent activity
      const lastService = memories.find((m: any) => m.tags?.includes('treatment'));
      const upcoming = reminders.length > 0 ? ['Beauty follow-up scheduled'] : [];

      return {
        greeting: 'Here\'s your beauty summary!',
        reminders,
        recommendations,
        upcoming
      };
    } catch (error: any) {
      logger.warn(`Briefing generation failed: ${error.message}`);
      return {
        greeting: 'Hello!',
        reminders: [],
        recommendations: [],
        upcoming: []
      };
    }
  }

  // ============ CONVERSATION CONTEXT ============

  /**
   * Get context for beauty conversation
   */
  async getConversationContext(userId: string): Promise<{
    recentTreatments: string[];
    hairColorHistory: string[];
    allergies: string[];
    preferredProducts: string[];
  }> {
    try {
      const memories = await this.getBeautyMemories(userId);

      return {
        recentTreatments: memories
          .filter((m: any) => m.tags?.includes('treatment'))
          .slice(0, 5)
          .map((m: any) => m.content),

        hairColorHistory: memories
          .filter((m: any) => m.tags?.includes('hair_color'))
          .slice(0, 3)
          .map((m: any) => m.content),

        allergies: memories
          .filter((m: any) => m.tags?.includes('allergy'))
          .map((m: any) => m.content),

        preferredProducts: memories
          .filter((m: any) => m.tags?.includes('product') && m.content.includes('loved'))
          .map((m: any) => m.content)
      };
    } catch (error: any) {
      logger.warn(`Context lookup failed: ${error.message}`);
      return {
        recentTreatments: [],
        hairColorHistory: [],
        allergies: [],
        preferredProducts: []
      };
    }
  }

  // ============ HEALTH CHECK ============

  async healthCheck(): Promise<{ memory: boolean; briefing: boolean }> {
    const checkMemory = async (): Promise<boolean> => {
      try {
        await this.memory.get('/health', { timeout: 3000 });
        return true;
      } catch {
        return false;
      }
    };

    const checkBriefing = async (): Promise<boolean> => {
      try {
        await this.briefing.get('/health', { timeout: 3000 });
        return true;
      } catch {
        return false;
      }
    };

    const [memory, briefing] = await Promise.all([checkMemory(), checkBriefing()]);
    return { memory, briefing };
  }
}

export const genieBridge = new GenieBridge();
