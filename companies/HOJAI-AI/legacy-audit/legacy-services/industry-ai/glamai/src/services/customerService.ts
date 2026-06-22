/**
 * Customer Service
 *
 * Unified customer intelligence by combining data from:
 * - Salon CRM (visit history, preferences, tier)
 * - Beauty Memory (hair color, reactions, notes)
 * - REZ Mind Salon (churn, LTV, insights)
 * - Client Beauty Twin (demographics, segments)
 */

import mongoose from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../../../utils/logger.js';
import { beautyMemoryService } from './beautyMemoryService.js';
import { salonBridge } from '../bridges/salonBridge.js';
import { mindSalonBridge } from '../bridges/mindSalonBridge.js';

// Types
export interface CustomerIntelligence {
  customerId: string;

  // Basic Info
  name: string;
  phone: string;
  email?: string;
  customerTier: 'new' | 'regular' | 'vip' | 'at-risk' | 'churned';

  // Beauty Profile
  beautyProfile: {
    hairType: string | null;
    hairTexture: string | null;
    scalpCondition: string | null;
    skinType: string | null;
    allergies: string[];
  };

  // Visit & Spending
  visitStats: {
    totalVisits: number;
    totalSpent: number;
    averageSpend: number;
    lastVisit: Date | null;
    daysSinceLastVisit: number;
    preferredServices: string[];
    preferredStylists: string[];
  };

  // Current Status
  currentColorFormula: {
    color: string;
    brand: string;
    lastColored?: Date;
  } | null;

  activeNotes: {
    category: string;
    content: string;
    stylistName: string;
    date: Date;
  }[];

  // Intelligence Scores
  churnRisk: 'high' | 'medium' | 'low';
  lifetimeValue: number;
  engagementLevel: 'minimal' | 'standard' | 'high' | 'vip';

  // Recent Activity
  recentServices: {
    serviceName: string;
    date: Date;
    stylistName: string;
    satisfaction?: number;
  }[];

  // Recommendations pending
  overdueServices: string[];

  // Metadata
  lastUpdated: Date;
  dataSource: {
    crm: boolean;
    beautyMemory: boolean;
    mindSalon: boolean;
  };
}

// Service Class
export class CustomerService {
  private redis: RedisClientType | null = null;
  private mongoose: typeof mongoose;

  constructor() {
    this.mongoose = mongoose;
  }

  async initialize(connections: { mongoose: typeof mongoose; redis: RedisClientType | null }) {
    this.mongoose = connections.mongoose;
    this.redis = connections.redis;
    logger.info('CustomerService initialized');
  }

  // Get full customer intelligence
  async getCustomerIntelligence(customerId: string): Promise<CustomerIntelligence | null> {
    logger.info(`Getting customer intelligence for ${customerId}`);

    // Try cache first
    if (this.redis) {
      const cached = await this.redis.get(`customer:intelligence:${customerId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      // Get data from multiple sources in parallel
      const [beautyProfile, memoryHistory, crmData, mindSalonInsights] = await Promise.all([
        beautyMemoryService.getCustomerProfile(customerId),
        beautyMemoryService.getMemoryHistory(customerId, undefined, 20),
        salonBridge.getCustomer(customerId).catch(() => null),
        mindSalonBridge.getCustomerInsights(customerId).catch(() => null)
      ]);

      // Build intelligence from all sources
      const intelligence = this.buildIntelligence(
        customerId,
        beautyProfile,
        memoryHistory,
        crmData,
        mindSalonInsights
      );

      // Cache for 5 minutes
      if (this.redis) {
        await this.redis.setEx(`customer:intelligence:${customerId}`, 300, JSON.stringify(intelligence));
      }

      return intelligence;
    } catch (error) {
      logger.error('Error getting customer intelligence:', error);
      return null;
    }
  }

  // Build intelligence from all sources
  private buildIntelligence(
    customerId: string,
    beautyProfile: any,
    memoryHistory: any,
    crmData: any,
    mindSalonInsights: any
  ): CustomerIntelligence {
    // Combine visit stats from all sources
    const crmVisits = crmData?.visitHistory || [];
    const memoryVisits = memoryHistory?.serviceDetails || [];
    const allVisits = [...crmVisits, ...memoryVisits];

    // Calculate visit stats
    const totalVisits = allVisits.length;
    const totalSpent = this.calculateTotalSpent(allVisits, crmData);
    const averageSpend = totalVisits > 0 ? totalSpent / totalVisits : 0;
    const lastVisit = this.getLastVisit(allVisits);
    const daysSinceLastVisit = this.getDaysSinceLastVisit(allVisits);
    const preferredServices = this.getPreferredServices(allVisits);
    const preferredStylists = this.getPreferredStylists(allVisits);

    // Get churn risk from Mind Salon or calculate
    const churnRisk = mindSalonInsights?.churnRisk || this.calculateChurnRisk(daysSinceLastVisit);

    // Get LTV from Mind Salon or calculate
    const lifetimeValue = mindSalonInsights?.lifetimeValue || this.calculateLTV(totalSpent, totalVisits);

    // Get engagement level
    const engagementLevel = this.calculateEngagementLevel(
      totalVisits,
      memoryHistory?.stylistNotes?.length || 0,
      memoryHistory?.productReactions?.length || 0
    );

    // Get current color formula
    const currentColorFormula = beautyProfile?.currentColorFormula ? {
      color: beautyProfile.currentColorFormula.color,
      brand: beautyProfile.currentColorFormula.brand,
      lastColored: memoryHistory?.hairColorHistory?.[memoryHistory.hairColorHistory.length - 1]?.date
    } : null;

    // Get active notes
    const activeNotes = (memoryHistory?.stylistNotes || []).slice(-5).map((n: any) => ({
      category: n.category,
      content: n.content,
      stylistName: n.stylistName,
      date: n.createdAt
    }));

    // Get recent services
    const recentServices = allVisits.slice(-10).map((s: any) => ({
      serviceName: s.serviceName || s.service,
      date: new Date(s.date),
      stylistName: s.stylistName || s.stylist,
      satisfaction: s.satisfaction || s.rating
    }));

    // Get overdue services
    const overdueServices = this.getOverdueServices(allVisits);

    return {
      customerId,
      name: crmData?.name || beautyProfile?.name || 'Unknown',
      phone: crmData?.phone || '',
      email: crmData?.email,
      customerTier: crmData?.customerTier || 'new',

      beautyProfile: {
        hairType: beautyProfile?.hairType || crmData?.hairType || null,
        hairTexture: beautyProfile?.hairTexture || null,
        scalpCondition: beautyProfile?.scalpCondition || null,
        skinType: beautyProfile?.skinType || crmData?.skinType || null,
        allergies: beautyProfile?.allergies || crmData?.allergies || []
      },

      visitStats: {
        totalVisits,
        totalSpent,
        averageSpend,
        lastVisit,
        daysSinceLastVisit,
        preferredServices,
        preferredStylists
      },

      currentColorFormula,

      activeNotes,

      churnRisk,
      lifetimeValue,
      engagementLevel,

      recentServices,

      overdueServices,

      lastUpdated: new Date(),

      dataSource: {
        crm: !!crmData,
        beautyMemory: !!beautyProfile,
        mindSalon: !!mindSalonInsights
      }
    };
  }

  // Calculate total spent
  private calculateTotalSpent(allVisits: any[], crmData: any): number {
    // Try CRM total first
    if (crmData?.totalSpent) {
      return crmData.totalSpent;
    }
    // Fall back to summing visits
    return allVisits.reduce((sum: number, v: any) => sum + (v.amount || v.totalAmount || 0), 0);
  }

  // Get last visit date
  private getLastVisit(allVisits: any[]): Date | null {
    if (allVisits.length === 0) return null;
    const sorted = [...allVisits].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return new Date(sorted[0].date);
  }

  // Get days since last visit
  private getDaysSinceLastVisit(allVisits: any[]): number {
    const lastVisit = this.getLastVisit(allVisits);
    if (!lastVisit) return 999;
    return Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Get preferred services
  private getPreferredServices(allVisits: any[]): string[] {
    const counts: Record<string, number> = {};
    for (const visit of allVisits) {
      const service = visit.serviceName || visit.service || 'Unknown';
      counts[service] = (counts[service] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  // Get preferred stylists
  private getPreferredStylists(allVisits: any[]): string[] {
    const counts: Record<string, number> = {};
    for (const visit of allVisits) {
      const stylist = visit.stylistName || visit.stylist;
      if (stylist) {
        counts[stylist] = (counts[stylist] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  }

  // Calculate churn risk
  private calculateChurnRisk(daysSinceLastVisit: number): 'high' | 'medium' | 'low' {
    if (daysSinceLastVisit > 60) return 'high';
    if (daysSinceLastVisit > 30) return 'medium';
    return 'low';
  }

  // Calculate lifetime value
  private calculateLTV(totalSpent: number, totalVisits: number): number {
    if (totalVisits === 0) return 0;
    const avgSpend = totalSpent / totalVisits;
    const monthlyVisits = totalVisits / 6;
    return Math.round(avgSpend * monthlyVisits * 24);
  }

  // Calculate engagement level
  private calculateEngagementLevel(
    visits: number,
    notesCount: number,
    reactionsCount: number
  ): 'minimal' | 'standard' | 'high' | 'vip' {
    const score = visits + (notesCount * 0.5) + (reactionsCount * 0.3);
    if (score >= 20) return 'vip';
    if (score >= 10) return 'high';
    if (score >= 3) return 'standard';
    return 'minimal';
  }

  // Get overdue services
  private getOverdueServices(allVisits: any[]): string[] {
    const now = new Date();
    const overdue: string[] = [];
    const serviceLastDates: Record<string, Date> = {};

    // Find last date for each service
    for (const visit of allVisits) {
      const service = (visit.serviceName || visit.service || '').toLowerCase();
      const date = new Date(visit.date);
      if (!serviceLastDates[service] || date > serviceLastDates[service]) {
        serviceLastDates[service] = date;
      }
    }

    // Check against thresholds
    const thresholds: Record<string, number> = {
      'haircut': 28,
      'hair cut': 28,
      'color': 21,
      'hair color': 21,
      'balayage': 84,
      'keratin': 90
    };

    for (const [service, lastDate] of Object.entries(serviceLastDates)) {
      const threshold = thresholds[service] || 30;
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > threshold) {
        overdue.push(service);
      }
    }

    return [...new Set(overdue)];
  }

  // Invalidate cache
  async invalidateCache(customerId: string) {
    if (this.redis) {
      await this.redis.del(`customer:intelligence:${customerId}`);
    }
  }

  // Sync beauty profile to CRM
  async syncToCRM(customerId: string): Promise<boolean> {
    try {
      const beautyProfile = await beautyMemoryService.getCustomerProfile(customerId);
      if (beautyProfile) {
        await salonBridge.syncBeautyProfileToCRM(customerId, beautyProfile);
      }
      return true;
    } catch (error) {
      logger.error('Error syncing to CRM:', error);
      return false;
    }
  }
}

export const customerService = new CustomerService();
