/**
 * GlamAI Service
 *
 * Main orchestration service that coordinates all GlamAI components
 */

import mongoose from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../../../utils/logger.js';
import { beautyMemoryService } from './beautyMemoryService.js';
import { customerService } from './customerService.js';
import { inventoryService } from './inventoryService.js';

// Types
export interface SalonDashboard {
  salonId: string;
  timestamp: Date;

  // Today's Overview
  today: {
    appointments: number;
    completed: number;
    revenue: number;
    averageRating: number;
  };

  // Alerts
  alerts: {
    inventory: number;
    staff: number;
    customer: number;
  };

  // Top Customers
  topCustomers: {
    customerId: string;
    name: string;
    lifetimeValue: number;
    lastVisit: Date;
  }[];

  // Upcoming
  upcoming: {
    rebookings: number;
    stockReorder: number;
    staffTraining: number;
  };
}

// Service Class
export class GlamAIService {
  private redis: RedisClientType | null = null;
  private mongoose: typeof mongoose;

  constructor() {
    this.mongoose = mongoose;
  }

  async initialize(connections: { mongoose: typeof mongoose; redis: RedisClientType | null }) {
    this.mongoose = connections.mongoose;
    this.redis = connections.redis;
    logger.info('GlamAIService initialized');
  }

  // Get salon dashboard
  async getSalonDashboard(salonId: string): Promise<SalonDashboard> {
    logger.info(`Getting dashboard for salon ${salonId}`);

    // Get inventory alerts
    const inventoryAlerts = await inventoryService.getAlerts(salonId);

    // TODO: Get appointments from booking service
    // TODO: Get revenue from POS
    // TODO: Get top customers from CRM

    return {
      salonId,
      timestamp: new Date(),

      today: {
        appointments: 0,
        completed: 0,
        revenue: 0,
        averageRating: 0
      },

      alerts: {
        inventory: inventoryAlerts.length,
        staff: 0,
        customer: 0
      },

      topCustomers: [],

      upcoming: {
        rebookings: 0,
        stockReorder: inventoryAlerts.filter(a => a.priority === 'critical' || a.priority === 'high').length,
        staffTraining: 0
      }
    };
  }

  // Process customer check-in
  async processCheckin(
    customerId: string,
    salonId: string,
    qrData: string
  ): Promise<{
    success: boolean;
    customerId: string;
    customerName: string;
    beautyProfile: any;
    pendingRecommendations: any;
    lastVisit: Date | null;
    daysSinceLastVisit: number;
    message: string;
  }> {
    logger.info(`Processing check-in for customer ${customerId} at salon ${salonId}`);

    try {
      // Get customer intelligence
      const intelligence = await customerService.getCustomerIntelligence(customerId);
      const beautyProfile = await beautyMemoryService.getCustomerProfile(customerId);

      // Generate welcome message
      let message = `Welcome back, ${intelligence?.name || 'Valued Customer'}!`;

      if (intelligence?.visitStats.daysSinceLastVisit > 30) {
        message += ` It's been ${intelligence.visitStats.daysSinceLastVisit} days since your last visit. We have some great recommendations for you!`;
      } else {
        message += ' How can we help you today?';
      }

      return {
        success: true,
        customerId,
        customerName: intelligence?.name || 'Unknown',
        beautyProfile: {
          hairType: beautyProfile?.hairType,
          skinType: beautyProfile?.skinType,
          allergies: beautyProfile?.allergies || []
        },
        pendingRecommendations: intelligence?.overdueServices || [],
        lastVisit: intelligence?.visitStats.lastVisit || null,
        daysSinceLastVisit: intelligence?.visitStats.daysSinceLastVisit || 999,
        message
      };
    } catch (error) {
      logger.error('Error processing check-in:', error);
      return {
        success: false,
        customerId,
        customerName: 'Unknown',
        beautyProfile: null,
        pendingRecommendations: [],
        lastVisit: null,
        daysSinceLastVisit: 999,
        message: 'Welcome! Please check in with reception.'
      };
    }
  }
}

export const glamaService = new GlamAIService();
