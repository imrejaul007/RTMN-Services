/**
 * Service Plan Service
 *
 * Generates personalized service plans for customers based on:
 * - Beauty profile (hair type, skin type, conditions)
 * - Service history
 * - Hair color formula
 * - Stylist notes
 * - Current trends and seasonal needs
 * - Budget constraints
 */

import mongoose from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../../../utils/logger.js';
import { beautyMemoryService } from './beautyMemoryService.js';
import { customerService } from './customerService.js';

// Types
export interface ServiceRecommendation {
  serviceId: string;
  serviceName: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedDuration: number;
  estimatedPrice: number;
  upsell?: {
    serviceId: string;
    serviceName: string;
    discount: number;
    reason: string;
  };
}

export interface ServicePlan {
  customerId: string;
  generatedAt: Date;
  currentServices: string[];
  recommendations: ServiceRecommendation[];
  maintenanceSchedule: {
    serviceId: string;
    serviceName: string;
    nextDue: Date;
    frequency: string;
  }[];
  seasonalConsiderations: string[];
  atHomeCare: {
    productId: string;
    productName: string;
    instructions: string;
  }[];
  totalEstimatedDuration: number;
  totalEstimatedPrice: number;
  notes: string;
}

// Maintenance schedules (in days)
const MAINTENANCE_SCHEDULE = {
  haircut: { frequency: 28, label: 'every 4 weeks' },
  'hair-color': { frequency: 21, label: 'every 3 weeks' },
  'balayage': { frequency: 84, label: 'every 12 weeks' },
  'keratin': { frequency: 90, label: 'every 3 months' },
  'hair-spa': { frequency: 30, label: 'every 4 weeks' },
  'scalp-treatment': { frequency: 21, label: 'every 3 weeks' },
  'deep-conditioning': { frequency: 14, label: 'every 2 weeks' },
  'manicure': { frequency: 14, label: 'every 2 weeks' },
  'pedicure': { frequency: 28, label: 'every 4 weeks' },
  'facial': { frequency: 28, label: 'every 4 weeks' }
};

// Service catalog (would normally come from database)
const SERVICE_CATALOG: Record<string, { name: string; duration: number; basePrice: number }> = {
  'haircut': { name: 'Haircut', duration: 45, basePrice: 500 },
  'hair-color': { name: 'Hair Color', duration: 120, basePrice: 2500 },
  'balayage': { name: 'Balayage', duration: 180, basePrice: 5000 },
  'keratin': { name: 'Keratin Treatment', duration: 90, basePrice: 3000 },
  'hair-spa': { name: 'Hair Spa', duration: 60, basePrice: 800 },
  'scalp-treatment': { name: 'Scalp Treatment', duration: 45, basePrice: 600 },
  'deep-conditioning': { name: 'Deep Conditioning', duration: 30, basePrice: 400 },
  'blowout': { name: 'Blowout/Styling', duration: 30, basePrice: 300 },
  'manicure': { name: 'Manicure', duration: 45, basePrice: 350 },
  'pedicure': { name: 'Pedicure', duration: 60, basePrice: 450 },
  'facial': { name: 'Facial', duration: 60, basePrice: 1000 },
  'bridal-makeup': { name: 'Bridal Makeup', duration: 120, basePrice: 5000 },
  'party-makeup': { name: 'Party Makeup', duration: 60, basePrice: 2000 }
};

// Upsell pairings
const UPSELL_PAIRS: Record<string, { serviceId: string; discount: number; reason: string }> = {
  'haircut': { serviceId: 'deep-conditioning', discount: 10, reason: 'Keep your hair healthy between cuts' },
  'hair-color': { serviceId: 'deep-conditioning', period: 15, reason: 'Protect your color with extra moisture' },
  'balayage': { serviceId: 'scalp-treatment', discount: 15, reason: 'Maintain your balayage with scalp health' },
  'keratin': { serviceId: 'hair-spa', discount: 10, reason: 'Extend your keratin results' },
  'facial': { serviceId: 'deep-conditioning', discount: 10, reason: 'Complete your pampering session' }
};

export class ServicePlanService {
  private redis: RedisClientType | null = null;
  private mongoose: typeof mongoose;

  constructor() {
    this.mongoose = mongoose;
  }

  async initialize(connections: { mongoose: typeof mongoose; redis: RedisClientType | null }) {
    this.mongoose = connections.mongoose;
    this.redis = connections.redis;
    logger.info('ServicePlanService initialized');
  }

  // Generate personalized service plan
  async generatePlan(
    customerId: string,
    currentServices: string[] = [],
    stylistId?: string,
    budget?: number
  ): Promise<ServicePlan> {
    logger.info(`Generating service plan for customer ${customerId}`);

    // Get customer intelligence
    const customerIntel = await customerService.getCustomerIntelligence(customerId);
    const beautyProfile = await beautyMemoryService.getCustomerProfile(customerId);
    const memoryHistory = await beautyMemoryService.getMemoryHistory(customerId);

    const recommendations: ServiceRecommendation[] = [];
    const seasonalConsiderations: string[] = [];
    const atHomeCare: ServicePlan['atHomeCare'] = [];

    // Get current date info
    const now = new Date();
    const month = now.getMonth();
    const isWeddingSeason = month >= 8 && month <= 11; // Sept-Dec
    const isSummer = month >= 4 && month <= 6; // May-July
    const isFestive = month === 9 || month === 10; // Oct-Nov (Diwali)

    // 1. Analyze service history and recommend based on overdue services
    const lastServices = memoryHistory.serviceDetails.slice(-10);
    const overdueServices = this.analyzeOverdueServices(lastServices, now);
    recommendations.push(...overdueServices);

    // 2. Add seasonal considerations
    if (isWeddingSeason) {
      seasonalConsiderations.push('Wedding season - consider bridal packages and pre-wedding treatments');
      recommendations.push(this.createSeasonalRecommendation('bridal-makeup', 'high', 'Wedding season approaching'));
    }
    if (isSummer) {
      seasonalConsiderations.push('Summer heat - protect hair from sun damage with UV treatments');
      recommendations.push(this.createSeasonalRecommendation('scalp-treatment', 'medium', 'Summer heat protection'));
    }
    if (isFestive) {
      seasonalConsiderations.push('Festive season - party makeup and hair styling in demand');
      recommendations.push(this.createSeasonalRecommendation('party-makeup', 'medium', 'Festive season'));
    }

    // 3. Add recommendations based on beauty profile
    if (beautyProfile) {
      if (beautyProfile.hairType === 'curly' || beautyProfile.hairType === 'coily') {
        recommendations.push(this.createRecommendation('keratin', 'medium', 'Smooth and manage your curls'));
      }
      if (beautyProfile.scalpCondition === 'dry') {
        recommendations.push(this.createRecommendation('scalp-treatment', 'high', 'Your scalp needs extra hydration'));
      }
      if (beautyProfile.hairTexture === 'fine') {
        recommendations.push(this.createRecommendation('deep-conditioning', 'medium', 'Add volume and body to fine hair'));
      }
    }

    // 4. Check hair color history for color maintenance
    if (beautyProfile?.currentColorFormula) {
      const lastColor = memoryHistory.hairColorHistory[memoryHistory.hairColorHistory.length - 1];
      if (lastColor) {
        const daysSinceColor = Math.floor((now.getTime() - new Date(lastColor.date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceColor > 21) {
          recommendations.push(this.createRecommendation('hair-color', 'high', `Color touch-up due (${daysSinceColor} days since last color)`));
        }
      }
    }

    // 5. Check for recent stylist notes about concerns
    const recentNotes = memoryHistory.stylistNotes.filter(n => n.category === 'concern');
    if (recentNotes.length > 0) {
      recommendations.push(this.createRecommendation('scalp-treatment', 'high', `Address stylist concern: ${recentNotes[0].content}`));
    }

    // 6. Generate maintenance schedule
    const maintenanceSchedule = this.generateMaintenanceSchedule(lastServices, now);

    // 7. Add upsells to high-priority recommendations
    for (const rec of recommendations) {
      if (rec.priority === 'high' && UPSELL_PAIRS[rec.serviceId]) {
        const upsellData = UPSELL_PAIRS[rec.serviceId];
        const upsellService = SERVICE_CATALOG[upsellData.serviceId];
        rec.upsell = {
          serviceId: upsellData.serviceId,
          serviceName: upsellService.name,
          discount: upsellData.discount,
          reason: upsellData.reason
        };
      }
    }

    // 8. Add at-home care recommendations
    if (beautyProfile?.currentColorFormula) {
      atHomeCare.push({
        productId: 'color-protect-shampoo',
        productName: 'Color Protect Shampoo',
        instructions: 'Use weekly to maintain color vibrancy'
      });
    }
    if (beautyProfile?.hairType === 'curly') {
      atHomeCare.push({
        productId: 'curl-cream',
        productName: 'Curl Defining Cream',
        instructions: 'Apply to damp hair for frizz control'
      });
    }

    // Calculate totals
    let totalDuration = 0;
    let totalPrice = 0;
    for (const rec of recommendations) {
      totalDuration += rec.estimatedDuration;
      totalPrice += rec.estimatedPrice;
      if (rec.upsell) {
        totalDuration += SERVICE_CATALOG[rec.upsell.serviceId]?.duration || 0;
        totalPrice += SERVICE_CATALOG[rec.upsell.serviceId]?.basePrice || 0;
      }
    }

    // Filter by budget if provided
    let filteredRecommendations = recommendations;
    if (budget) {
      filteredRecommendations = recommendations.filter(r => r.estimatedPrice <= budget);
    }

    // Build notes
    const notes = this.generatePlanNotes(beautyProfile, customerIntel, recommendations);

    return {
      customerId,
      generatedAt: now,
      currentServices,
      recommendations: filteredRecommendations,
      maintenanceSchedule,
      seasonalConsiderations,
      atHomeCare,
      totalEstimatedDuration: totalDuration,
      totalEstimatedPrice: totalPrice,
      notes
    };
  }

  // Analyze which services are overdue
  private analyzeOverdueServices(
    lastServices: { serviceName: string; date: Date }[],
    now: Date
  ): ServiceRecommendation[] {
    const recommendations: ServiceRecommendation[] = [];
    const serviceCounts: Record<string, { lastDate: Date; count: number }> = {};

    // Count services and find last occurrence
    for (const service of lastServices) {
      const key = service.serviceName.toLowerCase();
      if (!serviceCounts[key]) {
        serviceCounts[key] = { lastDate: new Date(service.date), count: 0 };
      }
      serviceCounts[key].count++;
      if (new Date(service.date) > serviceCounts[key].lastDate) {
        serviceCounts[key].lastDate = new Date(service.date);
      }
    }

    // Check against maintenance schedule
    for (const [serviceKey, data] of Object.entries(serviceCounts)) {
      const schedule = MAINTENANCE_SCHEDULE[serviceKey];
      if (schedule) {
        const daysSince = Math.floor((now.getTime() - data.lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > schedule.frequency) {
          const overdueDays = daysSince - schedule.frequency;
          recommendations.push({
            serviceId: serviceKey,
            serviceName: SERVICE_CATALOG[serviceKey]?.name || serviceKey,
            priority: overdueDays > 14 ? 'high' : overdueDays > 7 ? 'medium' : 'low',
            reason: `Overdue by ${overdueDays} days (scheduled ${schedule.label})`,
            estimatedDuration: SERVICE_CATALOG[serviceKey]?.duration || 60,
            estimatedPrice: SERVICE_CATALOG[serviceKey]?.basePrice || 500
          });
        }
      }
    }

    return recommendations;
  }

  // Create a recommendation
  private createRecommendation(
    serviceId: string,
    priority: ServiceRecommendation['priority'],
    reason: string
  ): ServiceRecommendation {
    const service = SERVICE_CATALOG[serviceId];
    return {
      serviceId,
      serviceName: service?.name || serviceId,
      priority,
      reason,
      estimatedDuration: service?.duration || 60,
      estimatedPrice: service?.basePrice || 500
    };
  }

  // Create seasonal recommendation
  private createSeasonalRecommendation(
    serviceId: string,
    priority: ServiceRecommendation['priority'],
    reason: string
  ): ServiceRecommendation {
    return this.createRecommendation(serviceId, priority, reason);
  }

  // Generate maintenance schedule
  private generateMaintenanceSchedule(
    lastServices: { serviceName: string; date: Date }[],
    now: Date
  ): ServicePlan['maintenanceSchedule'] {
    const schedule: ServicePlan['maintenanceSchedule'] = [];
    const serviceTypes = new Set(lastServices.map(s => s.serviceName.toLowerCase()));

    for (const serviceKey of serviceTypes) {
      const scheduleInfo = MAINTENANCE_SCHEDULE[serviceKey];
      if (scheduleInfo) {
        // Find last occurrence
        const lastOccurrence = lastServices
          .filter(s => s.serviceName.toLowerCase() === serviceKey)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (lastOccurrence) {
          const lastDate = new Date(lastOccurrence.date);
          const nextDue = new Date(lastDate.getTime() + scheduleInfo.frequency * 24 * 60 * 60 * 1000);

          schedule.push({
            serviceId: serviceKey,
            serviceName: SERVICE_CATALOG[serviceKey]?.name || serviceKey,
            nextDue,
            frequency: scheduleInfo.label
          });
        }
      }
    }

    return schedule.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
  }

  // Generate plan notes
  private generatePlanNotes(
    beautyProfile: any,
    customerIntel: any,
    recommendations: ServiceRecommendation[]
  ): string {
    const notes: string[] = [];

    if (beautyProfile?.hairType) {
      notes.push(`Hair type: ${beautyProfile.hairType}`);
    }
    if (beautyProfile?.scalpCondition) {
      notes.push(`Scalp condition: ${beautyProfile.scalpCondition}`);
    }
    if (beautyProfile?.allergies?.length) {
      notes.push(`⚠️ Allergies: ${beautyProfile.allergies.join(', ')}`);
    }

    const highPriority = recommendations.filter(r => r.priority === 'high');
    if (highPriority.length > 0) {
      notes.push(`Recommended services: ${highPriority.map(r => r.serviceName).join(', ')}`);
    }

    return notes.join(' | ');
  }
}

export const servicePlanService = new ServicePlanService();
