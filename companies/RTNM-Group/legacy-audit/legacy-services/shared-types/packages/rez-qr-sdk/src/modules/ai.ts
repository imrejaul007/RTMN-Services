/**
 * AI Module - Recommendations, chat, and intent detection
 */

import { QRClient } from './client';
import type {
  RecommendationContext,
  Recommendation,
  AIContext,
  AIResponse,
  Intent,
} from '../types';

export class AIModule {
  private client: QRClient;
  private intentClient: QRClient;

  constructor(client: QRClient, intentUrl?: string) {
    this.client = client;
    this.intentClient = new QRClient({
      baseUrl: intentUrl || 'https://rez-intent-graph.onrender.com',
    });
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    return this.client.post('/ai/recommendations', context);
  }

  /**
   * Get room service recommendations
   */
  async getRoomRecommendations(roomId: string, timeOfDay?: string): Promise<Recommendation[]> {
    return this.client.post('/ai/recommendations/room', { roomId, timeOfDay });
  }

  /**
   * Get menu recommendations
   */
  async getMenuRecommendations(storeId: string, orderId?: string, dietaryFilters?: string[]): Promise<Recommendation[]> {
    return this.client.post('/ai/recommendations/menu', { storeId, orderId, dietaryFilters });
  }

  /**
   * Get store recommendations
   */
  async getStoreRecommendations(userId?: string, location?: { lat: number; lng: number }): Promise<Recommendation[]> {
    return this.client.post('/ai/recommendations/store', { userId, location });
  }

  /**
   * Send message to AI chat
   */
  async sendMessage(message: string, context: AIContext): Promise<AIResponse> {
    return this.client.post('/ai/chat', { message, context });
  }

  /**
   * Get quick suggestions based on context
   */
  async getSuggestions(context: AIContext): Promise<string[]> {
    return this.client.post('/ai/suggestions', { context });
  }

  /**
   * Detect user intent from message
   */
  async detectIntent(message: string, context?: AIContext): Promise<Intent> {
    return this.intentClient.post('/detect', { message, context });
  }

  /**
   * Get intent alternatives
   */
  async getIntentAlternatives(intent: Intent): Promise<Intent[]> {
    return this.intentClient.post('/alternatives', { intent });
  }

  /**
   * Get contextual upsells
   */
  async getUpsells(context: {
    source: 'room' | 'menu' | 'store';
    id: string;
    currentTotal?: number;
  }): Promise<Upsell[]> {
    return this.client.post('/ai/upsells', context);
  }

  /**
   * Get personalized offers
   */
  async getPersonalizedOffers(userId?: string, context?: Record<string, unknown>): Promise<PersonalizedOffer[]> {
    return this.client.post('/ai/offers', { userId, context });
  }

  /**
   * Analyze sentiment from text
   */
  async analyzeSentiment(text: string): Promise<{ score: number; label: 'positive' | 'neutral' | 'negative' }> {
    return this.client.post('/ai/sentiment', { text });
  }

  /**
   * Generate response for feedback
   */
  async generateFeedbackResponse(feedback: {
    type: string;
    rating: number;
    comment?: string;
  }): Promise<{ response: string; tone: string }> {
    return this.client.post('/ai/feedback-response', feedback);
  }

  /**
   * Get menu item descriptions
   */
  async generateMenuDescription(item: { name: string; ingredients?: string[] }): Promise<string> {
    return this.client.post('/ai/menu-description', item);
  }

  /**
   * Translate menu to language
   */
  async translateMenu(
    storeId: string,
    language: string
  ): Promise<{ translatedItems: TranslatedMenuItem[] }> {
    return this.client.post('/ai/translate-menu', { storeId, language });
  }

  /**
   * Get dietary recommendations
   */
  async getDietaryRecommendations(
    dietaryFilters: string[],
    excludeIngredients?: string[]
  ): Promise<string[]> {
    return this.client.post('/ai/dietary-recommendations', { dietaryFilters, excludeIngredients });
  }

  /**
   * Analyze order for dietary compliance
   */
  async analyzeOrderCompliance(
    orderItems: { itemId: string; name: string }[],
    dietaryFilters: string[]
  ): Promise<OrderComplianceResult> {
    return this.client.post('/ai/order-compliance', { orderItems, dietaryFilters });
  }

  /**
   * Get wait time estimate
   */
  async getWaitTimeEstimate(storeId: string): Promise<{ estimatedMinutes: number; isAvailable: boolean }> {
    return this.client.get(`/ai/wait-time/${storeId}`);
  }

  /**
   * Generate personalized greeting
   */
  async generateGreeting(
    context: { name?: string; timeOfDay: string; source: string }
  ): Promise<{ greeting: string; message: string }> {
    return this.client.post('/ai/greeting', context);
  }
}

export interface Upsell {
  id: string;
  type: 'addon' | 'upgrade' | 'combo' | 'promotion';
  title: string;
  description: string;
  originalPrice: number;
  offerPrice?: number;
  savings?: number;
  itemId?: string;
  image?: string;
  actionLabel: string;
}

export interface PersonalizedOffer {
  id: string;
  title: string;
  description: string;
  type: 'discount' | 'bogo' | 'cashback' | 'free_delivery';
  value: number;
  minPurchase?: number;
  code?: string;
  expiresAt?: string;
  image?: string;
  actionLabel: string;
}

export interface TranslatedMenuItem {
  itemId: string;
  originalName: string;
  translatedName: string;
  originalDescription: string;
  translatedDescription: string;
}

export interface OrderComplianceResult {
  compliant: boolean;
  issues: {
    itemId: string;
    itemName: string;
    issue: string;
    severity: 'warning' | 'error';
  }[];
  safeItems: { itemId: string; itemName: string }[];
}
