// ============================================================================
// Context Enrichment Service - Add context to intents
// ============================================================================

import { Intent } from '../index';

export interface EnrichedContext {
  userContext: UserContext;
  sessionContext: SessionContext;
  historicalContext: HistoricalContext;
  temporalContext: TemporalContext;
  deviceContext: DeviceContext;
  locationContext: LocationContext;
  weatherContext?: WeatherContext;
  businessContext: BusinessContext;
}

export interface UserContext {
  userId: string;
  userType: 'new' | 'returning' | 'vip' | 'enterprise';
  preferences: Record<string, any>;
  pastCategories: string[];
  averageOrderValue?: number;
  totalOrders: number;
  loyaltyTier?: string;
  riskScore?: number;
}

export interface SessionContext {
  sessionId: string;
  sessionStart: string;
  pageViews: number;
  searchQueries: string[];
  cartValue?: number;
  activeFilters: Record<string, any>;
  recentCategories: string[];
  timeOnSite: number;
  bounceRisk: boolean;
}

export interface HistoricalContext {
  lastIntent?: Intent;
  lastCategory?: string;
  lastSearchQuery?: string;
  conversionRate: number;
  avgSessionDuration: number;
  preferredPaymentMethod?: string;
  preferredShippingMethod?: string;
  addresses: Array<{ type: string; address: string }>;
}

export interface TemporalContext {
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  month: number;
  quarter: number;
  fiscalQuarter?: string;
}

export interface DeviceContext {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  screenWidth?: number;
  screenHeight?: number;
  isTouchDevice: boolean;
  connectionType?: string;
}

export interface LocationContext {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  locale?: string;
}

export interface WeatherContext {
  temperature?: number;
  condition?: string;
  humidity?: number;
  impactOnShopping?: 'positive' | 'negative' | 'neutral';
}

export interface BusinessContext {
  promotionActive: boolean;
  promotionDetails?: string;
  inventoryLevel?: 'in_stock' | 'low_stock' | 'out_of_stock';
  competitorActivity?: string;
  marketTrend?: 'rising' | 'falling' | 'stable';
}

export interface EnrichmentOptions {
  includeWeather?: boolean;
  includeBusiness?: boolean;
  includeHistorical?: boolean;
  depth: 'basic' | 'standard' | 'full';
}

const BUSINESS_HOURS = {
  start: 9,
  end: 21
};

const HOLIDAYS_2024 = [
  '2024-01-01', '2024-01-15', '2024-02-19', '2024-05-27', '2024-07-04',
  '2024-09-02', '2024-11-28', '2024-12-25'
];

const HOLIDAYS_2025 = [
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-05-26', '2025-07-04',
  '2025-09-01', '2025-11-27', '2025-12-25'
];

export class ContextEnricher {
  private userContexts: Map<string, UserContext>;
  private sessionContexts: Map<string, SessionContext>;
  private historicalContexts: Map<string, HistoricalContext>;
  private defaultOptions: EnrichmentOptions;

  constructor() {
    this.userContexts = new Map();
    this.sessionContexts = new Map();
    this.historicalContexts = new Map();
    this.defaultOptions = {
      includeWeather: false,
      includeBusiness: true,
      includeHistorical: true,
      depth: 'standard'
    };
  }

  /**
   * Enrich an intent with full context
   */
  enrich(intent: Intent, options?: EnrichmentOptions): EnrichedContext {
    const opts = { ...this.defaultOptions, ...options };

    return {
      userContext: this.enrichUserContext(intent),
      sessionContext: this.enrichSessionContext(intent),
      historicalContext: opts.includeHistorical ? this.enrichHistoricalContext(intent) : this.getEmptyHistoricalContext(),
      temporalContext: this.enrichTemporalContext(),
      deviceContext: this.enrichDeviceContext(intent),
      locationContext: this.enrichLocationContext(intent),
      weatherContext: opts.includeWeather ? this.enrichWeatherContext() : undefined,
      businessContext: opts.includeBusiness ? this.enrichBusinessContext(intent) : this.getEmptyBusinessContext()
    };
  }

  /**
   * Enrich with user context
   */
  enrichUserContext(intent: Intent): UserContext {
    let userContext = this.userContexts.get(intent.userId || '');

    if (!userContext) {
      userContext = this.createDefaultUserContext(intent);
    }

    // Update with current intent
    if (intent.category) {
      if (!userContext.pastCategories.includes(intent.category)) {
        userContext.pastCategories.push(intent.category);
      }
    }

    this.userContexts.set(intent.userId || '', userContext);
    return userContext;
  }

  /**
   * Enrich with session context
   */
  enrichSessionContext(intent: Intent): SessionContext {
    const sessionId = intent.sessionId || 'default';
    let sessionContext = this.sessionContexts.get(sessionId);

    if (!sessionContext) {
      sessionContext = this.createDefaultSessionContext(intent);
    }

    // Update session metrics
    sessionContext.pageViews++;
    if (intent.category) {
      sessionContext.recentCategories.push(intent.category);
      if (sessionContext.recentCategories.length > 5) {
        sessionContext.recentCategories.shift();
      }
    }

    this.sessionContexts.set(sessionId, sessionContext);
    return sessionContext;
  }

  /**
   * Enrich with historical context
   */
  enrichHistoricalContext(intent: Intent): HistoricalContext {
    const userId = intent.userId || '';
    let historicalContext = this.historicalContexts.get(userId);

    if (!historicalContext) {
      historicalContext = this.createDefaultHistoricalContext();
    }

    // Update with current intent (store only the ID to avoid circular reference)
    historicalContext.lastIntent = { id: intent.id, category: intent.category, intent: intent.intent } as any;
    historicalContext.lastCategory = intent.category;

    this.historicalContexts.set(userId, historicalContext);
    return historicalContext;
  }

  /**
   * Enrich with temporal context
   */
  enrichTemporalContext(): TemporalContext {
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();

    return {
      hourOfDay,
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday: this.isHoliday(now),
      season: this.getSeason(month),
      month,
      quarter: this.getQuarter(month),
      fiscalQuarter: this.getFiscalQuarter(now)
    };
  }

  /**
   * Enrich with device context
   */
  enrichDeviceContext(intent: Intent): DeviceContext {
    const deviceInfo = intent.context?.device || {};

    return {
      deviceType: this.detectDeviceType(deviceInfo.userAgent || ''),
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screenWidth: deviceInfo.screenWidth,
      screenHeight: deviceInfo.screenHeight,
      isTouchDevice: this.isTouchDevice(deviceInfo.userAgent || ''),
      connectionType: deviceInfo.connectionType
    };
  }

  /**
   * Enrich with location context
   */
  enrichLocationContext(intent: Intent): LocationContext {
    const locationInfo = intent.context?.location || {};

    return {
      country: locationInfo.country || 'US',
      region: locationInfo.region,
      city: locationInfo.city,
      timezone: locationInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: locationInfo.currency || 'USD',
      language: locationInfo.language || 'en',
      locale: locationInfo.locale || 'en-US'
    };
  }

  /**
   * Enrich with weather context (mock implementation)
   */
  enrichWeatherContext(): WeatherContext {
    // In production, this would call a weather API
    return {
      temperature: 72,
      condition: 'partly_cloudy',
      humidity: 45,
      impactOnShopping: 'neutral'
    };
  }

  /**
   * Enrich with business context
   */
  enrichBusinessContext(intent: Intent): BusinessContext {
    const promotionActive = intent.context?.promotionActive || false;
    const inventoryLevel = intent.context?.inventoryLevel || 'in_stock';

    return {
      promotionActive,
      promotionDetails: promotionActive ? 'Summer Sale - 20% off' : undefined,
      inventoryLevel: inventoryLevel as 'in_stock' | 'low_stock' | 'out_of_stock',
      competitorActivity: 'moderate',
      marketTrend: 'stable'
    };
  }

  /**
   * Get context for a specific user
   */
  getUserContext(userId: string): UserContext | undefined {
    return this.userContexts.get(userId);
  }

  /**
   * Get context for a specific session
   */
  getSessionContext(sessionId: string): SessionContext | undefined {
    return this.sessionContexts.get(sessionId);
  }

  /**
   * Get historical context for a user
   */
  getHistoricalContext(userId: string): HistoricalContext | undefined {
    return this.historicalContexts.get(userId);
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: Record<string, any>): void {
    const userContext = this.userContexts.get(userId);
    if (userContext) {
      userContext.preferences = { ...userContext.preferences, ...preferences };
      this.userContexts.set(userId, userContext);
    }
  }

  /**
   * Merge multiple contexts
   */
  mergeContexts(contexts: EnrichedContext[]): EnrichedContext {
    if (contexts.length === 0) {
      throw new Error('No contexts to merge');
    }

    const merged: EnrichedContext = { ...contexts[0] };

    for (let i = 1; i < contexts.length; i++) {
      const ctx = contexts[i];

      // Merge user contexts
      if (ctx.userContext) {
        merged.userContext = this.mergeUserContexts(merged.userContext, ctx.userContext);
      }

      // Merge session contexts
      if (ctx.sessionContext) {
        merged.sessionContext = this.mergeSessionContexts(merged.sessionContext, ctx.sessionContext);
      }

      // Merge historical contexts
      if (ctx.historicalContext) {
        merged.historicalContext = this.mergeHistoricalContexts(merged.historicalContext, ctx.historicalContext);
      }
    }

    return merged;
  }

  /**
   * Calculate context similarity
   */
  calculateContextSimilarity(ctx1: EnrichedContext, ctx2: EnrichedContext): number {
    let similarity = 0;
    let totalWeight = 0;

    // User type similarity
    if (ctx1.userContext?.userType === ctx2.userContext?.userType) {
      similarity += 0.2;
    }
    totalWeight += 0.2;

    // Device type similarity
    if (ctx1.deviceContext?.deviceType === ctx2.deviceContext?.deviceType) {
      similarity += 0.15;
    }
    totalWeight += 0.15;

    // Location similarity
    if (ctx1.locationContext?.country === ctx2.locationContext?.country) {
      similarity += 0.15;
    }
    totalWeight += 0.15;

    // Temporal similarity
    if (ctx1.temporalContext?.hourOfDay === ctx2.temporalContext?.hourOfDay) {
      similarity += 0.1;
    }
    totalWeight += 0.1;

    // Category overlap
    const categories1 = new Set(ctx1.userContext?.pastCategories || []);
    const categories2 = new Set(ctx2.userContext?.pastCategories || []);
    const overlap = [...categories1].filter(c => categories2.has(c)).length;
    const union = new Set([...categories1, ...categories2]).size;
    if (union > 0) {
      similarity += (overlap / union) * 0.25;
    }
    totalWeight += 0.25;

    // Business context similarity
    if (ctx1.businessContext?.promotionActive === ctx2.businessContext?.promotionActive) {
      similarity += 0.15;
    }
    totalWeight += 0.15;

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  // Private helper methods

  private createDefaultUserContext(intent: Intent): UserContext {
    return {
      userId: intent.userId || '',
      userType: 'new',
      preferences: {},
      pastCategories: intent.category ? [intent.category] : [],
      totalOrders: 0
    };
  }

  private createDefaultSessionContext(intent: Intent): SessionContext {
    return {
      sessionId: intent.sessionId || uuidv4(),
      sessionStart: new Date().toISOString(),
      pageViews: 1,
      searchQueries: [],
      activeFilters: {},
      recentCategories: intent.category ? [intent.category] : [],
      timeOnSite: 0,
      bounceRisk: false
    };
  }

  private createDefaultHistoricalContext(): HistoricalContext {
    return {
      conversionRate: 0,
      avgSessionDuration: 0,
      addresses: []
    };
  }

  private getEmptyHistoricalContext(): HistoricalContext {
    return this.createDefaultHistoricalContext();
  }

  private getEmptyBusinessContext(): BusinessContext {
    return {
      promotionActive: false,
      inventoryLevel: 'in_stock'
    };
  }

  private isHoliday(date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return [...HOLIDAYS_2024, ...HOLIDAYS_2025].includes(dateStr);
  }

  private getSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getQuarter(month: number): number {
    return Math.floor(month / 3) + 1;
  }

  private getFiscalQuarter(date: Date): string {
    const month = date.getMonth();
    const year = date.getFullYear();
    const fq = Math.floor(month / 3) + 1;
    return `FY${year}-Q${fq}`;
  }

  private detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const ua = userAgent.toLowerCase();
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/mobile|android|iphone/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private isTouchDevice(userAgent: string): boolean {
    return /mobile|android|iphone|ipad|tablet/i.test(userAgent);
  }

  private mergeUserContexts(ctx1: UserContext, ctx2: UserContext): UserContext {
    return {
      ...ctx1,
      ...ctx2,
      pastCategories: [...new Set([...ctx1.pastCategories, ...ctx2.pastCategories])],
      preferences: { ...ctx1.preferences, ...ctx2.preferences }
    };
  }

  private mergeSessionContexts(ctx1: SessionContext, ctx2: SessionContext): SessionContext {
    return {
      ...ctx1,
      ...ctx2,
      pageViews: ctx1.pageViews + ctx2.pageViews,
      recentCategories: [...new Set([...ctx1.recentCategories, ...ctx2.recentCategories])].slice(-5),
      searchQueries: [...new Set([...ctx1.searchQueries, ...ctx2.searchQueries])]
    };
  }

  private mergeHistoricalContexts(ctx1: HistoricalContext, ctx2: HistoricalContext): HistoricalContext {
    return {
      ...ctx1,
      ...ctx2,
      lastIntent: ctx2.lastIntent || ctx1.lastIntent,
      lastCategory: ctx2.lastCategory || ctx1.lastCategory,
      addresses: [...(ctx1.addresses || []), ...(ctx2.addresses || [])]
    };
  }
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export singleton instance
export const contextEnricher = new ContextEnricher();
