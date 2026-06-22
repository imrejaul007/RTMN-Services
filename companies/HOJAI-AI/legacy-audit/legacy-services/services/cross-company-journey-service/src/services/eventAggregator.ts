import { v4 as uuidv4 } from 'uuid';
import {
  JourneyEvent,
  Company,
  EventType,
  ChannelType,
  IJourneyEvent,
  ICompany,
  IJourneyEventDocument
} from '../models/journey';
import { logger } from '../utils/logger';
import { companyRegistry } from './companyRegistry';

export interface RawEvent {
  customerId: string;
  companyId: string;
  companyName?: string;
  eventType: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referralSource?: string;
  utmParameters?: Record<string, string>;
  timestamp?: Date;
}

export interface NormalizedEvent {
  eventId: string;
  customerId: string;
  companyId: string;
  companyName: string;
  eventType: EventType;
  channel: ChannelType;
  timestamp: Date;
  metadata: Record<string, unknown>;
  properties: Record<string, unknown>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referralSource?: string;
  utmParameters?: Record<string, string>;
}

export interface EnrichedEvent extends NormalizedEvent {
  enriched: true;
  enrichedAt: Date;
  location?: {
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  deviceType?: string;
  browser?: string;
  os?: string;
  isBot?: boolean;
  isNewUser?: boolean;
  sessionNumber?: number;
  dailyEventCount?: number;
}

export interface EventAggregation {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByChannel: Record<string, number>;
  eventsByCompany: Record<string, number>;
  averageEventsPerDay: number;
  peakHour: number;
  mostActiveDay: string;
}

export class EventAggregator {
  private eventBuffer: Map<string, IJourneyEvent[]> = new Map();
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.startBufferFlush();
  }

  /**
   * Register a new company for event collection
   */
  async registerCompany(company: Partial<ICompany>): Promise<ICompany> {
    logger.info(`Registering company for event aggregation: ${company.name}`);

    // Check if company already exists
    let existingCompany = await Company.findOne({ companyId: company.companyId });

    if (existingCompany) {
      logger.warn(`Company ${company.companyId} already registered`);
      return existingCompany;
    }

    const newCompany = new Company({
      companyId: company.companyId,
      name: company.name || company.companyId,
      displayName: company.displayName || company.name || company.companyId,
      type: company.type || 'vertical_company',
      description: company.description,
      website: company.website,
      logo: company.logo,
      eventTypes: company.eventTypes || Object.values(EventType),
      channels: company.channels || Object.values(ChannelType),
      isActive: true,
      priority: company.priority || 0,
      metadata: company.metadata || {}
    });

    await newCompany.save();

    logger.info(`Company registered successfully: ${newCompany.companyId}`);

    return newCompany;
  }

  /**
   * Receive an event from a company
   */
  async receiveEvent(companyId: string, event: RawEvent): Promise<IJourneyEvent> {
    logger.debug(`Receiving event from company ${companyId}`, {
      customerId: event.customerId,
      eventType: event.eventType
    });

    // Validate company exists
    const company = await Company.findOne({ companyId });
    if (!company) {
      logger.warn(`Company ${companyId} not registered, auto-registering`);
      await this.registerCompany({ companyId, name: event.companyName || companyId });
    }

    // Normalize the event
    const normalizedEvent = await this.normalizeEvent(event, companyId);

    // Enrich the event
    const enrichedEvent = await this.enrichEvent(normalizedEvent);

    // Store the event
    await this.storeEvent(enrichedEvent);

    return enrichedEvent;
  }

  /**
   * Normalize event to standard format
   */
  async normalizeEvent(event: RawEvent, companyId?: string): Promise<NormalizedEvent> {
    const eventId = uuidv4();
    const timestamp = event.timestamp || new Date();

    // Get company info
    const company = companyId
      ? await Company.findOne({ companyId })
      : await Company.findOne({ companyId: event.companyId });

    // Map event type
    let eventType: EventType;
    const eventTypeStr = event.eventType.toLowerCase().replace(/\s+/g, '_');
    if (Object.values(EventType).includes(eventTypeStr as EventType)) {
      eventType = eventTypeStr as EventType;
    } else {
      // Default to custom if unknown type
      eventType = EventType.CUSTOM;
    }

    // Map channel
    let channel: ChannelType;
    const channelStr = (event.channel || 'api').toLowerCase().replace(/\s+/g, '_');
    if (Object.values(ChannelType).includes(channelStr as ChannelType)) {
      channel = channelStr as ChannelType;
    } else {
      channel = ChannelType.API;
    }

    const normalizedEvent: NormalizedEvent = {
      eventId,
      customerId: event.customerId,
      companyId: event.companyId || companyId || 'unknown',
      companyName: event.companyName || company?.displayName || 'Unknown',
      eventType,
      channel,
      timestamp,
      metadata: event.metadata || {},
      properties: event.properties || {},
      sessionId: event.sessionId,
      userAgent: event.userAgent,
      ipAddress: event.ipAddress,
      referralSource: event.referralSource,
      utmParameters: event.utmParameters
    };

    logger.debug(`Event normalized: ${eventId}`, {
      eventType: normalizedEvent.eventType,
      channel: normalizedEvent.channel
    });

    return normalizedEvent;
  }

  /**
   * Enrich event with additional context
   */
  async enrichEvent(event: NormalizedEvent): Promise<EnrichedEvent> {
    const enriched: EnrichedEvent = {
      ...event,
      enriched: true,
      enrichedAt: new Date()
    };

    // Parse user agent for device info
    if (event.userAgent) {
      const deviceInfo = this.parseUserAgent(event.userAgent);
      enriched.deviceType = deviceInfo.deviceType;
      enriched.browser = deviceInfo.browser;
      enriched.os = deviceInfo.os;
      enriched.isBot = deviceInfo.isBot;
    }

    // Geolocation from IP (simplified - in production use MaxMind or similar)
    if (event.ipAddress) {
      const location = await this.getLocationFromIP(event.ipAddress);
      if (location) {
        enriched.location = location;
      }
    }

    // Check if new user
    const previousEvents = await JourneyEvent.countDocuments({
      customerId: event.customerId
    });
    enriched.isNewUser = previousEvents === 0;

    // Get session number
    const sessionCount = await JourneyEvent.countDocuments({
      customerId: event.customerId,
      sessionId: event.sessionId
    });
    enriched.sessionNumber = sessionCount + 1;

    // Get daily event count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyCount = await JourneyEvent.countDocuments({
      customerId: event.customerId,
      timestamp: { $gte: today }
    });
    enriched.dailyEventCount = dailyCount + 1;

    return enriched;
  }

  /**
   * Parse user agent string
   */
  private parseUserAgent(userAgent: string): {
    deviceType: string;
    browser: string;
    os: string;
    isBot: boolean;
  } {
    const result = {
      deviceType: 'desktop',
      browser: 'unknown',
      os: 'unknown',
      isBot: false
    };

    const ua = userAgent.toLowerCase();

    // Detect bot
    if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
      result.isBot = true;
    }

    // Detect device
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      result.deviceType = 'mobile';
      if (ua.includes('tablet') || ua.includes('ipad')) {
        result.deviceType = 'tablet';
      }
    }

    // Detect browser
    if (ua.includes('chrome') && !ua.includes('edg')) result.browser = 'Chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) result.browser = 'Safari';
    else if (ua.includes('firefox')) result.browser = 'Firefox';
    else if (ua.includes('edg')) result.browser = 'Edge';
    else if (ua.includes('opera') || ua.includes('opr')) result.browser = 'Opera';

    // Detect OS
    if (ua.includes('windows')) result.os = 'Windows';
    else if (ua.includes('mac os') || ua.includes('macos')) result.os = 'macOS';
    else if (ua.includes('linux')) result.os = 'Linux';
    else if (ua.includes('android')) result.os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) result.os = 'iOS';

    return result;
  }

  /**
   * Get location from IP (simplified implementation)
   */
  private async getLocationFromIP(ipAddress: string): Promise<{
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  } | null> {
    // Skip for private/local IPs
    if (
      ipAddress.startsWith('127.') ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.16.') ||
      ipAddress === '::1' ||
      ipAddress === 'localhost'
    ) {
      return null;
    }

    // In production, integrate with MaxMind GeoIP or similar service
    // For now, return null (location enrichment would require external API)
    return null;
  }

  /**
   * Store event to database
   */
  async storeEvent(event: NormalizedEvent | EnrichedEvent): Promise<IJourneyEventDocument> {
    const journeyEvent = new JourneyEvent({
      eventId: event.eventId,
      customerId: event.customerId,
      companyId: event.companyId,
      companyName: event.companyName,
      eventType: event.eventType,
      channel: event.channel,
      timestamp: event.timestamp,
      metadata: event.metadata,
      properties: event.properties as any,
      sessionId: event.sessionId,
      userAgent: event.userAgent,
      ipAddress: event.ipAddress,
      referralSource: event.referralSource,
      utmParameters: event.utmParameters,
      enriched: 'enriched' in event ? event.enriched : false,
      enrichedAt: 'enrichedAt' in event ? event.enrichedAt : undefined,
      location: 'location' in event ? event.location : undefined
    });

    await journeyEvent.save();

    logger.debug(`Event stored: ${event.eventId}`, {
      customerId: event.customerId,
      companyId: event.companyId
    });

    return journeyEvent;
  }

  /**
   * Get events by company for a customer
   */
  async getEventsByCompany(
    customerId: string,
    companyId: string,
    options?: { limit?: number; offset?: number; startDate?: Date; endDate?: Date }
  ): Promise<IJourneyEvent[]> {
    const query: Record<string, unknown> = { customerId, companyId };

    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) (query.timestamp as Record<string, Date>).$gte = options.startDate;
      if (options.endDate) (query.timestamp as Record<string, Date>).$lte = options.endDate;
    }

    const events = await JourneyEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .lean();

    return events as unknown as IJourneyEvent[];
  }

  /**
   * Get events by type for a customer
   */
  async getEventsByType(
    customerId: string,
    eventType: EventType,
    options?: { limit?: number; offset?: number; startDate?: Date; endDate?: Date }
  ): Promise<IJourneyEvent[]> {
    const query: Record<string, unknown> = { customerId, eventType };

    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) (query.timestamp as Record<string, Date>).$gte = options.startDate;
      if (options.endDate) (query.timestamp as Record<string, Date>).$lte = options.endDate;
    }

    const events = await JourneyEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .lean();

    return events as unknown as IJourneyEvent[];
  }

  /**
   * Get events by channel for a customer
   */
  async getEventsByChannel(
    customerId: string,
    channel: ChannelType,
    options?: { limit?: number; offset?: number }
  ): Promise<IJourneyEvent[]> {
    const events = await JourneyEvent.find({ customerId, channel })
      .sort({ timestamp: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .lean();

    return events as unknown as IJourneyEvent[];
  }

  /**
   * Get event aggregation statistics
   */
  async getEventAggregation(customerId: string): Promise<EventAggregation> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await JourneyEvent.find({
      customerId,
      timestamp: { $gte: thirtyDaysAgo }
    }).lean();

    const eventsByType: Record<string, number> = {};
    const eventsByChannel: Record<string, number> = {};
    const eventsByCompany: Record<string, number> = {};
    const hourCounts: number[] = new Array(24).fill(0);
    const dayCounts: Record<string, number> = {};

    for (const event of events) {
      // Count by type
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;

      // Count by channel
      eventsByChannel[event.channel] = (eventsByChannel[event.channel] || 0) + 1;

      // Count by company
      eventsByCompany[event.companyId] = (eventsByCompany[event.companyId] || 0) + 1;

      // Count by hour
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;

      // Count by day
      const day = new Date(event.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }

    // Find peak hour
    let peakHour = 0;
    let maxHourCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = hour;
      }
    });

    // Find most active day
    let mostActiveDay = 'Monday';
    let maxDayCount = 0;
    Object.entries(dayCounts).forEach(([day, count]) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        mostActiveDay = day;
      }
    });

    const daysDiff = Math.max(1, Math.ceil((Date.now() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByChannel,
      eventsByCompany,
      averageEventsPerDay: events.length / daysDiff,
      peakHour,
      mostActiveDay
    };
  }

  /**
   * Get recent events for a customer
   */
  async getRecentEvents(customerId: string, limit: number = 10): Promise<IJourneyEvent[]> {
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return events as unknown as IJourneyEvent[];
  }

  /**
   * Delete events for a customer
   */
  async deleteEvents(customerId: string): Promise<number> {
    const result = await JourneyEvent.deleteMany({ customerId });
    logger.info(`Deleted ${result.deletedCount} events for customer ${customerId}`);
    return result.deletedCount;
  }

  /**
   * Start buffer flush interval
   */
  private startBufferFlush(): void {
    this.bufferFlushInterval = setInterval(async () => {
      await this.flushBuffer();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Flush event buffer to database
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.size === 0) return;

    const buffers = Array.from(this.eventBuffer.entries());
    this.eventBuffer.clear();

    for (const [customerId, events] of buffers) {
      if (events.length === 0) continue;

      try {
        await JourneyEvent.insertMany(events);
        logger.debug(`Flushed ${events.length} events for customer ${customerId}`);
      } catch (error) {
        logger.error(`Error flushing event buffer for customer ${customerId}`, error);
        // Re-add events to buffer on failure
        const existing = this.eventBuffer.get(customerId) || [];
        this.eventBuffer.set(customerId, [...existing, ...events]);
      }
    }
  }

  /**
   * Shutdown cleanup
   */
  async shutdown(): Promise<void> {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    await this.flushBuffer();
    logger.info('Event aggregator shutdown complete');
  }
}

export const eventAggregator = new EventAggregator();
