// Customer Memory Service - Cross-business customer intelligence

import { v4 as uuidv4 } from 'uuid';
import mongoose, { Schema, Model } from 'mongoose';
import {
  CustomerMemory,
  MemoryEvent,
  CrossDomainLink,
  CustomerJourney,
  JourneyEvent,
  JourneyPattern,
} from '../models/customerMemory.js';
import { logger } from '../utils/logger.js';

// MongoDB Schemas
const CustomerMemorySchema = new Schema({
  customerId: { type: String, required: true, unique: true },
  company: { type: String, required: true },

  identity: {
    name: String,
    phone: String,
    email: String,
    avatar: String,
    registeredAt: Date,
  },

  value: {
    lifetimeValue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    refundRate: { type: Number, default: 0 },
  },

  engagement: {
    lastActiveDate: Date,
    preferredChannel: { type: String, default: 'inapp' },
    pushOptIn: { type: Boolean, default: true },
    emailOptIn: { type: Boolean, default: true },
    preferredLanguage: { type: String, default: 'en' },
  },

  support: {
    totalTickets: { type: Number, default: 0 },
    openTickets: { type: Number, default: 0 },
    avgResolutionTime: { type: Number, default: 0 },
    lastTicketDate: Date,
    satisfactionScore: Number,
  },

  risk: {
    churnProbability: { type: Number, default: 0 },
    fraudScore: { type: Number, default: 0 },
    refundRiskScore: { type: Number, default: 0 },
    vipStatus: { type: Boolean, default: false },
    flaggedStatus: { type: Boolean, default: false },
  },

  loyalty: {
    tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    points: { type: Number, default: 0 },
    pointsValue: { type: Number, default: 0 },
    memberSince: Date,
  },

  lastUpdated: { type: Date, default: Date.now },
});

const MemoryEventSchema = new Schema({
  id: { type: String, required: true, unique: true },
  customerId: { type: String, required: true, index: true },
  company: { type: String, required: true },
  date: { type: Date, required: true },
  category: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  orderId: String,
  ticketId: String,
  transactionId: String,
  sentiment: Number,
  resolution: String,
  resolutionTime: Number,
  channel: String,
  agentId: String,
  metadata: Schema.Types.Mixed,
});

const CrossDomainLinkSchema = new Schema({
  id: { type: String, required: true, unique: true },
  sourceId: { type: String, required: true },
  sourceType: { type: String, required: true },
  sourceCompany: { type: String, required: true },
  targetId: { type: String, required: true },
  targetType: { type: String, required: true },
  targetCompany: { type: String, required: true },
  relationship: { type: String, required: true },
  linkedAt: { type: Date, default: Date.now },
  linkedBy: String,
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
});

const JourneyEventSchema = new Schema({
  id: { type: String, required: true, unique: true },
  customerId: { type: String, required: true, index: true },
  date: { type: Date, required: true },
  domain: { type: String, required: true },
  eventType: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  value: Number,
  sentiment: Number,
  resolved: { type: Boolean, default: false },
  resolution: String,
  relatedEvents: [String],
  orderId: String,
  ticketId: String,
});

// Models
let CustomerMemoryModel: Model<any>;
let MemoryEventModel: Model<any>;
let CrossDomainLinkModel: Model<any>;
let JourneyEventModel: Model<any>;

export class CustomerMemoryService {
  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    try {
      CustomerMemoryModel = mongoose.model('CustomerMemory', CustomerMemorySchema) || mongoose.models.CustomerMemory;
      MemoryEventModel = mongoose.model('MemoryEvent', MemoryEventSchema) || mongoose.models.MemoryEvent;
      CrossDomainLinkModel = mongoose.model('CrossDomainLink', CrossDomainLinkSchema) || mongoose.models.CrossDomainLink;
      JourneyEventModel = mongoose.model('JourneyEvent', JourneyEventSchema) || mongoose.models.JourneyEvent;
    } catch {
      CustomerMemoryModel = mongoose.model('CustomerMemory', CustomerMemorySchema);
      MemoryEventModel = mongoose.model('MemoryEvent', MemoryEventSchema);
      CrossDomainLinkModel = mongoose.model('CrossDomainLink', CrossDomainLinkSchema);
      JourneyEventModel = mongoose.model('JourneyEvent', JourneyEventSchema);
    }
  }

  /**
   * Get or create customer memory
   */
  async getOrCreateCustomerMemory(customerId: string, company: string): Promise<CustomerMemory> {
    let memory = await CustomerMemoryModel.findOne({ customerId, company }).lean();

    if (!memory) {
      memory = await CustomerMemoryModel.create({
        customerId,
        company,
        loyalty: { memberSince: new Date() },
        lastUpdated: new Date(),
      });
    }

    return memory as CustomerMemory;
  }

  /**
   * Add memory event
   */
  async addMemoryEvent(event: Omit<MemoryEvent, 'id'>): Promise<MemoryEvent> {
    const id = `mem_event_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    await MemoryEventModel.create({ ...event, id });

    // Update customer memory metrics
    await this.updateCustomerMetrics(event.customerId, event.company, event);

    logger.info(`Memory event added`, { id, customerId: event.customerId, category: event.category });

    return { ...event, id };
  }

  /**
   * Update customer metrics based on event
   */
  private async updateCustomerMetrics(customerId: string, company: string, event: MemoryEvent) {
    const updates: any = { lastUpdated: new Date() };

    if (event.category === 'order') {
      updates['value.totalOrders'] = 1;
      if (event.value) {
        updates['value.totalSpent'] = event.value;
      }
    } else if (event.category === 'support') {
      updates['support.totalTickets'] = 1;
      if (event.resolutionTime) {
        updates['support.avgResolutionTime'] = event.resolutionTime;
      }
    } else if (event.category === 'refund') {
      updates['value.refundRate'] = 1;
    }

    await CustomerMemoryModel.updateOne({ customerId, company }, { $inc: updates });
  }

  /**
   * Get customer journey
   */
  async getCustomerJourney(customerId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    domains?: string[];
    limit?: number;
  }): Promise<CustomerJourney> {
    const query: any = { customerId };

    if (options?.startDate || options?.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = options.startDate;
      if (options.endDate) query.date.$lte = options.endDate;
    }

    if (options?.domains) {
      query.domain = { $in: options.domains };
    }

    const events = await JourneyEventModel
      .find(query)
      .sort({ date: -1 })
      .limit(options?.limit || 100)
      .lean();

    // Calculate summary
    const summary = this.calculateJourneySummary(events as JourneyEvent[]);

    // Detect patterns
    const patterns = this.detectJourneyPatterns(events as JourneyEvent[]);

    return {
      customerId,
      events: events as JourneyEvent[],
      summary,
      patterns,
      predictions: {},
      lastUpdated: new Date(),
    };
  }

  /**
   * Add journey event (cross-domain)
   */
  async addJourneyEvent(event: Omit<JourneyEvent, 'id'>): Promise<JourneyEvent> {
    const id = `journey_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    await JourneyEventModel.create({ ...event, id });

    logger.info(`Journey event added`, { id, customerId: event.customerId, domain: event.domain });

    return { ...event, id };
  }

  /**
   * Link cross-domain accounts
   */
  async linkCrossDomain(link: Omit<CrossDomainLink, 'id' | 'linkedAt'>): Promise<CrossDomainLink> {
    const id = `link_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    await CrossDomainLinkModel.create({ ...link, id, linkedAt: new Date() });

    logger.info(`Cross-domain link created`, { id, sourceId: link.sourceId, targetId: link.targetId });

    return { ...link, id, linkedAt: new Date() };
  }

  /**
   * Get linked accounts
   */
  async getLinkedAccounts(customerId: string): Promise<CrossDomainLink[]> {
    return CrossDomainLinkModel
      .find({
        $or: [
          { sourceId: customerId },
          { targetId: customerId },
        ],
      })
      .lean() as any;
  }

  /**
   * Calculate journey summary
   */
  private calculateJourneySummary(events: JourneyEvent[]) {
    const commerceEvents = events.filter(e => e.domain === 'commerce');
    const supportEvents = events.filter(e => e.domain === 'support');

    return {
      totalInteractions: events.length,
      totalOrders: commerceEvents.filter(e => e.eventType === 'order').length,
      totalSpent: commerceEvents.reduce((sum, e) => sum + (e.value || 0), 0),
      totalTickets: supportEvents.length,
      avgSatisfaction: events.reduce((sum, e) => sum + (e.sentiment || 0), 0) / (events.length || 1),
      journeyDuration: events.length > 0
        ? Math.round((new Date().getTime() - new Date(events[events.length - 1].date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    };
  }

  /**
   * Detect journey patterns
   */
  private detectJourneyPatterns(events: JourneyEvent[]): JourneyPattern[] {
    const patterns: JourneyPattern[] = [];

    // Check for high-value customer
    const totalSpent = events
      .filter(e => e.domain === 'commerce')
      .reduce((sum, e) => sum + (e.value || 0), 0);

    if (totalSpent > 10000) {
      patterns.push({
        type: 'value',
        name: 'High-Value Customer',
        description: 'Customer has spent over ₹10,000',
        confidence: 0.9,
        detectedAt: new Date(),
        evidence: [`Total spent: ₹${totalSpent}`],
      });
    }

    // Check for frequent support
    const supportCount = events.filter(e => e.domain === 'support').length;
    if (supportCount > 3) {
      patterns.push({
        type: 'support',
        name: 'Frequent Support',
        description: 'Customer contacts support frequently',
        confidence: 0.8,
        detectedAt: new Date(),
        evidence: [`Support tickets: ${supportCount}`],
      });
    }

    return patterns;
  }

  /**
   * Get unified profile across domains
   */
  async getUnifiedProfile(customerId: string): Promise<{
    memory: CustomerMemory;
    linkedAccounts: CrossDomainLink[];
    journey: CustomerJourney;
  }> {
    // Get all links
    const links = await this.getLinkedAccounts(customerId);

    // Collect all customer IDs
    const allCustomerIds = new Set([customerId]);
    links.forEach(link => {
      allCustomerIds.add(link.sourceId);
      allCustomerIds.add(link.targetId);
    });

    // Get memories for all linked accounts
    const memories = await Promise.all(
      Array.from(allCustomerIds).map(id =>
        CustomerMemoryModel.findOne({ customerId: id }).lean()
      )
    );

    // Get full journey
    const journey = await this.getCustomerJourney(customerId);

    // Combine memories
    const primaryMemory = memories.find(m => m?.customerId === customerId) as CustomerMemory | undefined;

    return {
      memory: primaryMemory || {
        customerId,
        company: 'unified',
        lastUpdated: new Date(),
      } as CustomerMemory,
      linkedAccounts: links,
      journey,
    };
  }
}

export const customerMemoryService = new CustomerMemoryService();
