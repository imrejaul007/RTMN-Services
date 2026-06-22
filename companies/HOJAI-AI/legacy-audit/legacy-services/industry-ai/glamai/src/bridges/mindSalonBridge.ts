/**
 * REZ Mind Salon Bridge
 *
 * Connects GlamAI to REZ Mind Salon AI (port 4010):
 * - Recommendation Engine
 * - Pricing Engine
 * - Churn Model
 * - Demand Forecast
 * - Customer Insights
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../../utils/logger.js';

const MIND_SALON_URL = process.env.MIND_SALON_URL || 'http://localhost:4010';

export class MindSalonBridge {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: MIND_SALON_URL,
      timeout: 15000
    });
  }

  // ==================== Recommendation Engine ====================

  /**
   * Get service recommendations from Mind Salon AI
   */
  async getServiceRecommendations(customerId: string, context?: {
    hairType?: string;
    scalpCondition?: string;
    lastServices?: string[];
    budget?: number;
  }): Promise<{
    recommendations: Array<{
      serviceId: string;
      serviceName: string;
      priority: string;
      reason: string;
      estimatedPrice: number;
      upsellProbability: number;
    }>;
    maintenanceSchedule: Array<{
      serviceId: string;
      nextDue: Date;
      frequency: string;
    }>;
  }> {
    try {
      const response = await this.client.post('/api/recommendations', {
        customerId,
        ...context
      });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon recommendations failed: ${error.message}`);
      return { recommendations: [], maintenanceSchedule: [] };
    }
  }

  /**
   * Get upsell suggestions
   */
  async getUpsellSuggestions(customerId: string, currentService: string): Promise<{
    serviceId: string;
    serviceName: string;
    discount: number;
    reason: string;
    conversionProbability: number;
  }[]> {
    try {
      const response = await this.client.post('/api/upsell', {
        customerId,
        currentService
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Mind Salon upsell failed: ${error.message}`);
      return [];
    }
  }

  // ==================== Pricing Engine ====================

  /**
   * Get dynamic price for service
   */
  async getDynamicPrice(serviceId: string, options?: {
    customerId?: string;
    stylistId?: string;
    timeSlot?: string;
    loyaltyTier?: string;
  }): Promise<{
    basePrice: number;
    adjustedPrice: number;
    discount: number;
    factors: string[];
  }> {
    try {
      const response = await this.client.post('/api/pricing/calculate', {
        serviceId,
        ...options
      });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon pricing failed: ${error.message}`);
      return { basePrice: 0, adjustedPrice: 0, discount: 0, factors: [] };
    }
  }

  /**
   * Get price list for services
   */
  async getPriceList(serviceIds: string[]): Promise<Record<string, number>> {
    try {
      const response = await this.client.post('/api/pricing/list', { serviceIds });
      return response.data.data || {};
    } catch (error: any) {
      logger.warn(`Mind Salon price list failed: ${error.message}`);
      return {};
    }
  }

  // ==================== Churn Model ====================

  /**
   * Get churn prediction for customer
   */
  async getChurnPrediction(customerId: string): Promise<{
    riskLevel: 'high' | 'medium' | 'low';
    riskScore: number;
    factors: string[];
    recommendedActions: string[];
  }> {
    try {
      const response = await this.client.post('/api/churn/predict', { customerId });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon churn prediction failed: ${error.message}`);
      return {
        riskLevel: 'low',
        riskScore: 0,
        factors: [],
        recommendedActions: []
      };
    }
  }

  /**
   * Get retention recommendations
   */
  async getRetentionRecommendations(customerId: string): Promise<{
    action: 'call' | 'whatsapp' | 'offer' | 'email';
    message: string;
    offer?: {
      type: 'discount' | 'points' | 'free_service';
      value: number;
      description: string;
    };
  }> {
    try {
      const response = await this.client.post('/api/churn/retention', { customerId });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon retention failed: ${error.message}`);
      return {
        action: 'whatsapp',
        message: 'We miss you! Book your next appointment today.'
      };
    }
  }

  // ==================== Demand Forecast ====================

  /**
   * Get demand forecast for salon
   */
  async getDemandForecast(salonId: string, days: number = 7): Promise<{
    dailyForecasts: Array<{
      date: string;
      predictedBookings: number;
      peakHours: string[];
      staffingRecommendation: number;
    }>;
    trends: {
      weddingSeason: boolean;
      festiveSeason: boolean;
      monsoonSeason: boolean;
    };
  }> {
    try {
      const response = await this.client.get('/api/forecast/demand', {
        params: { salonId, days }
      });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon demand forecast failed: ${error.message}`);
      return {
        dailyForecasts: [],
        trends: { weddingSeason: false, festiveSeason: false, monsoonSeason: false }
      };
    }
  }

  /**
   * Get staffing recommendations
   */
  async getStaffingRecommendations(salonId: string, date: string): Promise<{
    requiredStaff: number;
    byRole: Record<string, number>;
    peakHours: string[];
  }> {
    try {
      const response = await this.client.get('/api/forecast/staffing', {
        params: { salonId, date }
      });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon staffing failed: ${error.message}`);
      return { requiredStaff: 0, byRole: {}, peakHours: [] };
    }
  }

  // ==================== Customer Insights ====================

  /**
   * Get customer LTV prediction
   */
  async getCustomerLTV(customerId: string): Promise<{
    predictedLTV: number;
    confidence: number;
    factors: string[];
    engagementLevel: 'minimal' | 'standard' | 'high' | 'vip';
  }> {
    try {
      const response = await this.client.post('/api/insights/ltv', { customerId });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon LTV failed: ${error.message}`);
      return { predictedLTV: 0, confidence: 0, factors: [], engagementLevel: 'minimal' };
    }
  }

  /**
   * Get customer insights summary
   */
  async getCustomerInsights(customerId: string): Promise<{
    visitFrequency: number;
    avgDaysBetweenVisits: number;
    preferredServices: string[];
    preferredStylists: string[];
    seasonalPatterns: string[];
    lifetimeValue: number;
    churnRisk: 'high' | 'medium' | 'low';
  }> {
    try {
      const response = await this.client.post('/api/insights/summary', { customerId });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon insights failed: ${error.message}`);
      return {
        visitFrequency: 0,
        avgDaysBetweenVisits: 0,
        preferredServices: [],
        preferredStylists: [],
        seasonalPatterns: [],
        lifetimeValue: 0,
        churnRisk: 'low'
      };
    }
  }

  // ==================== Hair Profile Analysis ====================

  /**
   * Analyze hair profile and get recommendations
   */
  async analyzeHairProfile(hairData: {
    hairType: string;
    hairTexture: string;
    scalpCondition: string;
    concerns?: string[];
  }): Promise<{
    profileType: string;
    recommendedServices: string[];
    recommendedProducts: string[];
    careTips: string[];
  }> {
    try {
      const response = await this.client.post('/api/hair/analyze', hairData);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon hair analysis failed: ${error.message}`);
      return {
        profileType: 'unknown',
        recommendedServices: [],
        recommendedProducts: [],
        careTips: []
      };
    }
  }

  /**
   * Get color formula recommendations
   */
  async getColorRecommendations(currentColor: string, targetColor: string, hairType: string): Promise<{
    formula: {
      color: string;
      developer: string;
      processingTime: number;
      technique: string;
    };
    aftercare: string[];
    warning?: string;
  }> {
    try {
      const response = await this.client.post('/api/color/recommend', {
        currentColor,
        targetColor,
        hairType
      });
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Mind Salon color recommendations failed: ${error.message}`);
      return {
        formula: {
          color: targetColor,
          developer: '20 Volume',
          processingTime: 30,
          technique: 'Full Color'
        },
        aftercare: ['Use color protect shampoo', 'Avoid heat for 48 hours']
      };
    }
  }

  // ==================== Health Check ====================

  /**
   * Check Mind Salon service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 3000 });
      return true;
    } catch {
      logger.warn('Mind Salon health check failed');
      return false;
    }
  }
}

export const mindSalonBridge = new MindSalonBridge();
