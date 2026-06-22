/**
 * TwinOS Bridge - Beauty Twin Sync
 *
 * Connects GlamAI Beauty Memory to TwinOS Hub
 * Syncs beauty profiles to TwinOS for graph relationships
 */

import axios from 'axios';
import { logger } from '../../../utils/logger.js';

const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4142';
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';

export class TwinBridge {
  private twinOS: axios.AxiosInstance;
  private corpId: axios.AxiosInstance;

  constructor() {
    this.twinOS = axios.create({
      baseURL: TWINOS_URL,
      timeout: 10000
    });
    this.corpId = axios.create({
      baseURL: CORPID_URL,
      timeout: 10000
    });
  }

  // ============ BEAUTY TWIN OPERATIONS ============

  /**
   * Create or update Beauty Twin in TwinOS
   */
  async syncBeautyTwin(customerId: string, beautyProfile: any): Promise<boolean> {
    try {
      const twinData = {
        entityId: customerId,
        entityType: 'customer',
        twinType: 'beauty',
        industry: 'beauty',
        data: {
          hairType: beautyProfile.hairType,
          hairTexture: beautyProfile.hairTexture,
          scalpCondition: beautyProfile.scalpCondition,
          skinType: beautyProfile.skinType,
          allergies: beautyProfile.allergies || [],
          currentColorFormula: beautyProfile.currentColorFormula,
          lastUpdated: new Date().toISOString()
        },
        relationships: [
          { type: 'VISITS', targetId: beautyProfile.salonId || 'default-salon' },
          { type: 'RECEIVES_SERVICE_FROM', targetId: beautyProfile.preferredStylistId }
        ].filter(r => r.targetId)
      };

      await this.twinOS.post('/api/twins/beauty', twinData);
      logger.info(`Synced Beauty Twin for customer ${customerId}`);
      return true;
    } catch (error: any) {
      logger.warn(`Beauty Twin sync failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get Beauty Twin from TwinOS
   */
  async getBeautyTwin(customerId: string): Promise<any | null> {
    try {
      const response = await this.twinOS.get(`/api/twins/beauty/${customerId}`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Beauty Twin lookup failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Add relationship to Beauty Twin
   */
  async addBeautyTwinRelationship(
    customerId: string,
    relationshipType: string,
    targetId: string
  ): Promise<boolean> {
    try {
      await this.twinOS.post(`/api/twins/beauty/${customerId}/relationships`, {
        type: relationshipType,
        targetId
      });
      return true;
    } catch (error: any) {
      logger.warn(`Failed to add relationship: ${error.message}`);
      return false;
    }
  }

  // ============ GRAPH OPERATIONS ============

  /**
   * Query Beauty Graph
   */
  async queryBeautyGraph(query: {
    type?: 'customer' | 'stylist' | 'product';
    relationships?: string[];
    depth?: number;
  }): Promise<any[]> {
    try {
      const response = await this.twinOS.post('/api/graph/query', {
        industry: 'beauty',
        ...query
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Graph query failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get customers with similar beauty profiles
   */
  async findSimilarCustomers(customerId: string): Promise<any[]> {
    try {
      const response = await this.twinOS.get(`/api/twins/beauty/${customerId}/similar`);
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Similar customers lookup failed: ${error.message}`);
      return [];
    }
  }

  // ============ HAIR COLOR TWIN ============

  /**
   * Sync hair color history to TwinOS
   */
  async syncHairColorTwin(customerId: string, colorData: {
    color: string;
    brand: string;
    stylistId: string;
    date: Date;
  }): Promise<boolean> {
    try {
      await this.twinOS.post(`/api/twins/beauty/${customerId}/hair-color`, {
        color: colorData.color,
        brand: colorData.brand,
        stylistId: colorData.stylistId,
        date: colorData.date,
        lastUpdated: new Date().toISOString()
      });
      return true;
    } catch (error: any) {
      logger.warn(`Hair Color Twin sync failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get hair color formula from TwinOS
   */
  async getHairColorFormula(customerId: string): Promise<any | null> {
    try {
      const response = await this.twinOS.get(`/api/twins/beauty/${customerId}/hair-color`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Hair Color lookup failed: ${error.message}`);
      return null;
    }
  }

  // ============ STYLIST TWIN ============

  /**
   * Get Stylist Twin from TwinOS
   */
  async getStylistTwin(stylistId: string): Promise<any | null> {
    try {
      const response = await this.twinOS.get(`/api/twins/beauty/stylist/${stylistId}`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Stylist Twin lookup failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get customers for stylist
   */
  async getStylistCustomers(stylistId: string): Promise<any[]> {
    try {
      const response = await this.twinOS.get(`/api/twins/beauty/stylist/${stylistId}/customers`);
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Stylist customers lookup failed: ${error.message}`);
      return [];
    }
  }

  // ============ PRODUCT TWIN ============

  /**
   * Get Product Twin from TwinOS
   */
  async getProductTwin(productId: string): Promise<any | null> {
    try {
      const response = await this.twinOS.get(`/api/twins/beauty/product/${productId}`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Product Twin lookup failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get products recommended for customer
   */
  async getRecommendedProducts(customerId: string): Promise<any[]> {
    try {
      const response = await this.twinOS.get(`/api/twins/beauty/${customerId}/recommended-products`);
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Recommended products lookup failed: ${error.message}`);
      return [];
    }
  }

  // ============ HEALTH CHECK ============

  async healthCheck(): Promise<boolean> {
    try {
      await this.twinOS.get('/health', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const twinBridge = new TwinBridge();
