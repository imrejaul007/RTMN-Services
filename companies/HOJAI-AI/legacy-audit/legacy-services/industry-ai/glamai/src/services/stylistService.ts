/**
 * Stylist Service
 *
 * Provides stylist-facing APIs for:
 * - Today's appointments with customer context
 * - Customer beauty profile access
 * - Service plan display
 * - Note-taking during service
 */

import mongoose from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../../../utils/logger.js';
import { beautyMemoryService } from './beautyMemoryService.js';
import { customerService } from './customerService.js';

// Types
export interface StylistCustomer {
  customerId: string;
  name: string;
  phone: string;

  // Beauty Profile
  hairType: string | null;
  hairTexture: string | null;
  scalpCondition: string | null;
  skinType: string | null;
  allergies: string[];

  // Current Status
  currentColorFormula: {
    color: string;
    brand: string;
    lastColored?: Date;
  } | null;

  // Visit Info
  visitCount: number;
  daysSinceLastVisit: number;
  preferredServices: string[];

  // Recent Notes
  activeNotes: {
    category: string;
    content: string;
    date: Date;
  }[];

  // Product Preferences
  lovedProducts: string[];
  productsToAvoid: string[];
}

export interface TodayAppointment {
  appointmentId: string;
  customerId: string;
  customer: StylistCustomer;
  serviceName: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  servicePlan?: {
    recommendations: any[];
    atHomeCare: any[];
    notes: string;
  };
}

export interface StylistStats {
  stylistId: string;
  todayAppointments: number;
  completedToday: number;
  totalRevenue: number;
  averageRating: number;
  rebookingRate: number;
}

// Service Class
export class StylistService {
  private redis: RedisClientType | null = null;
  private mongoose: typeof mongoose;

  constructor() {
    this.mongoose = mongoose;
  }

  async initialize(connections: { mongoose: typeof mongoose; redis: RedisClientType | null }) {
    this.mongoose = connections.mongoose;
    this.redis = connections.redis;
    logger.info('StylistService initialized');
  }

  // Get stylist's customers
  async getStylistCustomers(stylistId: string): Promise<StylistCustomer[]> {
    logger.info(`Getting customers for stylist ${stylistId}`);

    // TODO: Get from CRM which customers prefer this stylist
    // For now, return empty array - would need CRM bridge

    return [];
  }

  // Get today's appointments with full customer context
  async getTodayAppointments(stylistId: string): Promise<TodayAppointment[]> {
    logger.info(`Getting today's appointments for stylist ${stylistId}`);

    // TODO: Get appointments from booking service
    // For now, return empty array - would need booking bridge

    return [];
  }

  // Get customer context for stylist (used during service)
  async getCustomerContext(customerId: string): Promise<StylistCustomer | null> {
    try {
      const [beautyProfile, memoryHistory, intelligence] = await Promise.all([
        beautyMemoryService.getCustomerProfile(customerId),
        beautyMemoryService.getMemoryHistory(customerId, undefined, 20),
        customerService.getCustomerIntelligence(customerId)
      ]);

      if (!intelligence) return null;

      const lovedProducts = memoryHistory.productReactions
        .filter((pr: any) => pr.reaction === 'loved')
        .map((pr: any) => pr.productName);

      const productsToAvoid = [
        ...memoryHistory.productReactions
          .filter((pr: any) => pr.reaction === 'allergic' || pr.reaction === 'disliked')
          .map((pr: any) => pr.productName),
        ...(beautyProfile?.allergies || [])
      ];

      return {
        customerId,
        name: intelligence.name || 'Unknown',
        phone: intelligence.phone || '',

        hairType: beautyProfile?.hairType || null,
        hairTexture: beautyProfile?.hairTexture || null,
        scalpCondition: beautyProfile?.scalpCondition || null,
        skinType: beautyProfile?.skinType || null,
        allergies: beautyProfile?.allergies || [],

        currentColorFormula: intelligence.currentColorFormula,

        visitCount: intelligence.visitStats.totalVisits,
        daysSinceLastVisit: intelligence.visitStats.daysSinceLastVisit,
        preferredServices: intelligence.visitStats.preferredServices,

        activeNotes: intelligence.activeNotes,

        lovedProducts,
        productsToAvoid
      };
    } catch (error) {
      logger.error('Error getting customer context:', error);
      return null;
    }
  }

  // Add note during service
  async addServiceNote(
    customerId: string,
    stylistId: string,
    stylistName: string,
    note: string,
    category: 'treatment' | 'preference' | 'allergy' | 'concern' | 'general' = 'general'
  ): Promise<void> {
    await beautyMemoryService.addStylistNote(customerId, note, stylistId, stylistName, category);
    await customerService.invalidateCache(customerId);
  }

  // Record service completion
  async recordServiceCompletion(
    customerId: string,
    stylistId: string,
    stylistName: string,
    serviceId: string,
    serviceName: string,
    products: Array<{ productId: string; productName: string; quantity: number }>,
    notes: string = '',
    satisfaction?: number
  ): Promise<void> {
    await beautyMemoryService.recordServiceDetails(
      customerId,
      serviceId,
      serviceName,
      stylistId,
      stylistName,
      products,
      notes,
      satisfaction
    );
    await customerService.invalidateCache(customerId);
  }

  // Record hair color
  async recordHairColor(
    customerId: string,
    stylistId: string,
    stylistName: string,
    colorFormula: {
      color: string;
      brand: string;
      developer: string;
      processingTime: number;
      notes: string;
    },
    serviceId?: string
  ): Promise<void> {
    await beautyMemoryService.recordHairColor(
      customerId,
      colorFormula,
      stylistId,
      stylistName,
      new Date(),
      serviceId
    );
    await customerService.invalidateCache(customerId);
  }

  // Record product reaction
  async recordProductReaction(
    customerId: string,
    productId: string,
    productName: string,
    reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | 'allergic',
    notes: string = ''
  ): Promise<void> {
    await beautyMemoryService.recordProductReaction(customerId, productId, productName, reaction, notes);
    await customerService.invalidateCache(customerId);
  }

  // Get stylist stats
  async getStylistStats(stylistId: string, date?: Date): Promise<StylistStats> {
    const targetDate = date || new Date();

    // TODO: Get from booking/POS services
    return {
      stylistId,
      todayAppointments: 0,
      completedToday: 0,
      totalRevenue: 0,
      averageRating: 0,
      rebookingRate: 0
    };
  }
}

export const stylistService = new StylistService();
