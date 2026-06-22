/**
 * Recommendation Service
 *
 * Unified recommendation engine that combines:
 * - REZ Mind Salon AI (churn, pricing, demand)
 * - Salon AI Beauty Advisor (service recommendations)
 * - Beauty Memory (personal history)
 * - Inventory (product recommendations)
 */

import mongoose from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../../../utils/logger.js';
import { beautyMemoryService } from './beautyMemoryService.js';
import { customerService } from './customerService.js';
import { inventoryService } from './inventoryService.js';

// Types
export interface ServiceRecommendation {
  type: 'service';
  serviceId: string;
  serviceName: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  urgency: 'now' | 'this_week' | 'this_month';
  expectedSatisfaction: number;
  estimatedPrice: number;
  estimatedDuration: number;
}

export interface ProductRecommendation {
  type: 'product';
  productId: string;
  productName: string;
  reason: string;
  inStock: boolean;
  price: number;
}

export interface RetentionRecommendation {
  type: 'retention';
  action: 'call' | 'whatsapp' | 'offer' | 'email';
  message: string;
  offer?: {
    type: 'discount' | 'points' | 'free_service';
    value: number;
    description: string;
  };
}

export interface UnifiedRecommendation {
  customerId: string;
  generatedAt: Date;
  services: ServiceRecommendation[];
  products: ProductRecommendation[];
  retention?: RetentionRecommendation;
  summary: string;
}

// Service Class
export class RecommendationService {
  private redis: RedisClientType | null = null;
  private mongoose: typeof mongoose;

  constructor() {
    this.mongoose = mongoose;
  }

  async initialize(connections: { mongoose: typeof mongoose; redis: RedisClientType | null }) {
    this.mongoose = connections.mongoose;
    this.redis = connections.redis;
    logger.info('RecommendationService initialized');
  }

  // Get unified recommendations
  async getRecommendations(
    customerId: string,
    context: 'booking' | 'checkin' | 'followup' | 'general' = 'general'
  ): Promise<UnifiedRecommendation> {
    logger.info(`Getting recommendations for customer ${customerId}, context: ${context}`);

    // Get all data sources in parallel
    const [intelligence, beautyProfile, memoryHistory] = await Promise.all([
      customerService.getCustomerIntelligence(customerId),
      beautyMemoryService.getCustomerProfile(customerId),
      beautyMemoryService.getMemoryHistory(customerId, undefined, 20)
    ]);

    const services: ServiceRecommendation[] = [];
    const products: ProductRecommendation[] = [];
    let retention: RetentionRecommendation | undefined;

    // 1. Service Recommendations based on history
    const overdueServices = this.getOverdueServices(memoryHistory);
    services.push(...overdueServices);

    // 2. Seasonal recommendations
    const seasonalServices = this.getSeasonalRecommendations();
    services.push(...seasonalServices);

    // 3. Profile-based recommendations
    if (beautyProfile) {
      if (beautyProfile.hairType === 'curly') {
        services.push(this.createServiceRec('keratin', 'medium', 'Manage your curls better'));
      }
      if (beautyProfile.scalpCondition === 'dry') {
        services.push(this.createServiceRec('scalp-treatment', 'high', 'Hydrate your dry scalp'));
      }
    }

    // 4. Product recommendations based on recent service
    const lastService = memoryHistory.serviceDetails[memoryHistory.serviceDetails.length - 1];
    if (lastService) {
      const productRecs = await inventoryService.getProductRecommendations(
        customerId,
        lastService.serviceName
      );
      products.push(...productRecs.map(p => ({
        type: 'product' as const,
        ...p,
        inStock: true,
        price: 0 // Would come from inventory
      })));
    }

    // 5. Color maintenance
    if (beautyProfile?.currentColorFormula) {
      const lastColor = memoryHistory.hairColorHistory[memoryHistory.hairColorHistory.length - 1];
      if (lastColor) {
        const daysSince = Math.floor((Date.now() - new Date(lastColor.date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 21) {
          services.push({
            type: 'service',
            serviceId: 'hair-color',
            serviceName: 'Hair Color Touch-up',
            priority: 'high',
            reason: `Color touch-up due (${daysSince} days since last color)`,
            urgency: 'now',
            expectedSatisfaction: 0.9,
            estimatedPrice: 2500,
            estimatedDuration: 120
          });
        }
      }
    }

    // 6. Retention recommendations for at-risk customers
    if (intelligence?.churnRisk === 'high') {
      retention = {
        action: 'whatsapp',
        message: `We miss you! It's been ${intelligence.visitStats.daysSinceLastVisit} days since your last visit. Book now and get 20% off your next service!`,
        offer: {
          type: 'discount',
          value: 20,
          description: '20% off your next service'
        }
      };
    } else if (intelligence?.churnRisk === 'medium') {
      retention = {
        action: 'whatsapp',
        message: `Hey! Just wanted to remind you about our new monsoon hair care treatments. Would you like to try one?`
      };
    }

    // Generate summary
    const summary = this.generateSummary(services, products, retention);

    return {
      customerId,
      generatedAt: new Date(),
      services,
      products,
      retention,
      summary
    };
  }

  // Get overdue services from history
  private getOverdueServices(memoryHistory: any): ServiceRecommendation[] {
    const now = new Date();
    const services: ServiceRecommendation[] = [];
    const serviceCounts: Record<string, { lastDate: Date; count: number }> = {};

    for (const detail of memoryHistory.serviceDetails) {
      const key = detail.serviceName.toLowerCase();
      if (!serviceCounts[key]) {
        serviceCounts[key] = { lastDate: new Date(detail.date), count: 0 };
      }
      serviceCounts[key].count++;
      if (new Date(detail.date) > serviceCounts[key].lastDate) {
        serviceCounts[key].lastDate = new Date(detail.date);
      }
    }

    const thresholds: Record<string, number> = {
      'haircut': 28,
      'hair color': 21,
      'color': 21,
      'balayage': 84,
      'keratin': 90,
      'spa': 30,
      'facial': 28
    };

    for (const [service, data] of Object.entries(serviceCounts)) {
      const threshold = thresholds[service] || 30;
      const daysSince = Math.floor((now.getTime() - data.lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince > threshold) {
        const overdueDays = daysSince - threshold;
        services.push({
          type: 'service',
          serviceId: service.replace(' ', '-'),
          serviceName: detail.serviceName,
          priority: overdueDays > 14 ? 'high' : overdueDays > 7 ? 'medium' : 'low',
          reason: `Overdue by ${overdueDays} days`,
          urgency: overdueDays > 14 ? 'now' : 'this_week',
          expectedSatisfaction: 0.85,
          estimatedPrice: 800,
          estimatedDuration: 60
        });
      }
    }

    return services;
  }

  // Get seasonal recommendations
  private getSeasonalRecommendations(): ServiceRecommendation[] {
    const month = new Date().getMonth();
    const services: ServiceRecommendation[] = [];

    // Monsoon (June-August)
    if (month >= 5 && month <= 7) {
      services.push({
        type: 'service',
        serviceId: 'scalp-treatment',
        serviceName: 'Anti-Dandruff Scalp Treatment',
        priority: 'medium',
        reason: 'Monsoon hair care - prevent dandruff and frizz',
        urgency: 'this_month',
        expectedSatisfaction: 0.8,
        estimatedPrice: 600,
        estimatedDuration: 45
      });
    }

    // Wedding season (Sept-Dec)
    if (month >= 8 && month <= 11) {
      services.push({
        type: 'service',
        serviceId: 'bridal-makeup',
        serviceName: 'Bridal Package',
        priority: 'high',
        reason: 'Wedding season - look your best!',
        urgency: 'this_month',
        expectedSatisfaction: 0.95,
        estimatedPrice: 5000,
        estimatedDuration: 180
      });
    }

    // Summer (April-June)
    if (month >= 3 && month <= 5) {
      services.push({
        type: 'service',
        serviceId: 'hair-spa',
        serviceName: 'Hair Spa with UV Protection',
        priority: 'medium',
        reason: 'Summer heat protection for your hair',
        urgency: 'this_month',
        expectedSatisfaction: 0.85,
        estimatedPrice: 800,
        estimatedDuration: 60
      });
    }

    return services;
  }

  // Create service recommendation
  private createServiceRec(
    serviceId: string,
    priority: 'high' | 'medium' | 'low',
    reason: string
  ): ServiceRecommendation {
    const serviceInfo: Record<string, { name: string; price: number; duration: number }> = {
      'keratin': { name: 'Keratin Treatment', price: 3000, duration: 90 },
      'scalp-treatment': { name: 'Scalp Treatment', price: 600, duration: 45 },
      'hair-spa': { name: 'Hair Spa', price: 800, duration: 60 }
    };

    const info = serviceInfo[serviceId] || { name: serviceId, price: 500, duration: 60 };

    return {
      type: 'service',
      serviceId,
      serviceName: info.name,
      priority,
      reason,
      urgency: 'this_week',
      expectedSatisfaction: 0.85,
      estimatedPrice: info.price,
      estimatedDuration: info.duration
    };
  }

  // Generate summary text
  private generateSummary(
    services: ServiceRecommendation[],
    products: ProductRecommendation[],
    retention?: RetentionRecommendation
  ): string {
    const parts: string[] = [];

    if (services.length > 0) {
      const highPriority = services.filter(s => s.priority === 'high');
      if (highPriority.length > 0) {
        parts.push(`${highPriority.length} service(s) recommended for you`);
      }
    }

    if (products.length > 0) {
      parts.push(`${products.length} product(s) to complement your services`);
    }

    if (retention) {
      parts.push('Special offer available for you!');
    }

    return parts.join('. ') || 'No specific recommendations at this time.';
  }
}

export const recommendationService = new RecommendationService();
