/**
 * @rez/intent-capture-sdk
 * Unified Intent Capture SDK for ReZ ecosystem apps
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppType = 'hotel_ota' | 'restaurant' | 'retail' | 'hotel_guest';
export type EventType = 'search' | 'view' | 'wishlist' | 'cart_add' | 'hold' | 'checkout_start' | 'fulfilled' | 'abandoned';
export type Category = 'TRAVEL' | 'DINING' | 'RETAIL' | 'HOTEL_SERVICE' | 'GENERAL';

export interface CaptureParams {
  userId?: string;
  intentKey: string;
  eventType: EventType;
  category: Category;
  metadata?: Record<string, unknown>;
}

export interface IntentConfig {
  baseUrl: string;
  appType: AppType;
  userId?: string;
}

export interface ActiveIntent {
  id: string;
  intentKey: string;
  category: string;
  confidence: number;
  status: string;
  lastSeenAt: string;
}

export interface DormantIntent {
  id: string;
  intentKey: string;
  category: string;
  revivalScore: number;
  daysDormant: number;
}

// ── Event Weights ─────────────────────────────────────────────────────────────

const EVENT_WEIGHTS: Record<EventType, number> = {
  search: 0.15,
  view: 0.10,
  wishlist: 0.25,
  cart_add: 0.30,
  hold: 0.35,
  checkout_start: 0.40,
  fulfilled: 1.0,
  abandoned: -0.2,
};

// ── Intent Capture Class ──────────────────────────────────────────────────────

export class IntentCapture {
  private baseUrl: string;
  private appType: AppType;
  private userId?: string;

  constructor(config: IntentConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.appType = config.appType;
    this.userId = config.userId;
  }

  /**
   * Set the current user
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Clear the current user
   */
  clearUser(): void {
    this.userId = undefined;
  }

  /**
   * Capture an intent signal
   */
  async capture(params: CaptureParams): Promise<void> {
    const userId = params.userId || this.userId;
    if (!userId) {
      console.warn('[IntentCapture] No userId provided, skipping capture');
      return;
    }

    const payload = {
      userId,
      appType: this.appType,
      intentKey: params.intentKey,
      eventType: params.eventType,
      category: params.category,
      metadata: params.metadata,
    };

    try {
      await fetch(`${this.baseUrl}/api/intent/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('[IntentCapture] Failed to capture intent', error);
    }
  }

  /**
   * Capture multiple intents in batch
   */
  async captureBatch(params: CaptureParams[]): Promise<void> {
    const userId = this.userId;
    if (!userId) {
      console.warn('[IntentCapture] No userId provided, skipping batch capture');
      return;
    }

    const payload = params.map(p => ({
      userId,
      appType: this.appType,
      intentKey: p.intentKey,
      eventType: p.eventType,
      category: p.category,
      metadata: p.metadata,
    }));

    try {
      await fetch(`${this.baseUrl}/api/intent/capture-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: payload }),
      });
    } catch (error) {
      console.error('[IntentCapture] Failed to capture batch intents', error);
    }
  }

  /**
   * Get active intents for a user
   */
  async getActiveIntents(userId?: string): Promise<ActiveIntent[]> {
    const uid = userId || this.userId;
    if (!uid) {
      console.warn('[IntentCapture] No userId provided');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/agent/intents/${uid}`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }

  /**
   * Get dormant intents for a user
   */
  async getDormantIntents(userId?: string): Promise<DormantIntent[]> {
    const uid = userId || this.userId;
    if (!uid) {
      console.warn('[IntentCapture] No userId provided');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/agent/dormant/${uid}`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }
}

// ── Event Helper Functions ─────────────────────────────────────────────────────

export function getEventWeight(eventType: EventType): number {
  return EVENT_WEIGHTS[eventType] || 0.1;
}

export function getIntentKeyPrefix(category: Category): string {
  const prefixes: Record<Category, string> = {
    TRAVEL: 'travel',
    DINING: 'dining',
    RETAIL: 'retail',
    HOTEL_SERVICE: 'hotel_service',
    GENERAL: 'general',
  };
  return prefixes[category] || 'general';
}

// ── React Hook (optional) ──────────────────────────────────────────────────────

let globalCapture: IntentCapture | null = null;

export function initIntentCapture(config: IntentConfig): IntentCapture {
  globalCapture = new IntentCapture(config);
  return globalCapture;
}

export function getIntentCapture(): IntentCapture | null {
  return globalCapture;
}

export function createIntentTracker(capture: IntentCapture) {
  return (eventType: EventType, metadata?: Record<string, unknown>) => {
    return (params: { userId?: string; intentKey?: string; category?: Category }) => {
      capture.capture({
        userId: params.userId,
        intentKey: params.intentKey || `intent_${eventType}_${Date.now()}`,
        eventType,
        category: params.category || 'GENERAL',
        metadata,
      });
    };
  };
}

// ── Standalone captureIntent function ─────────────────────────────────────────────

/**
 * Convenience wrapper for fire-and-forget intent capture.
 * Reads INTENT_CAPTURE_URL from environment variable.
 * Falls back to INTENT_GRAPH_URL for backward compatibility.
 *
 * @param params - Intent capture parameters
 * @param params.userId - User ID (required)
 * @param params.appType - Application type (required)
 * @param params.eventType - Event type (required)
 * @param params.intentKey - Intent key (required)
 * @param params.category - Category (required)
 * @param params.metadata - Optional metadata
 */
export async function captureIntent(params: {
  userId: string;
  appType: AppType;
  eventType: EventType;
  intentKey: string;
  category: Category;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const baseUrl = process.env.INTENT_CAPTURE_URL || process.env.INTENT_GRAPH_URL;
  if (!baseUrl) {
    console.warn('[IntentCapture] No INTENT_CAPTURE_URL or INTENT_GRAPH_URL set, skipping capture');
    return;
  }

  if (!params.userId) {
    console.warn('[IntentCapture] No userId provided, skipping capture');
    return;
  }

  try {
    await fetch(`${baseUrl}/api/intent/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId,
        appType: params.appType,
        intentKey: params.intentKey,
        eventType: params.eventType,
        category: params.category,
        metadata: params.metadata || {},
      }),
    });
  } catch (error) {
    console.error('[IntentCapture] Failed to capture intent', error);
  }
}

// ── Pre-built Event Functions ─────────────────────────────────────────────────

export function createHotelIntentCapture(baseUrl: string, userId?: string) {
  const capture = new IntentCapture({ baseUrl, appType: 'hotel_ota', userId });
  return {
    capture,
    setUser: capture.setUser.bind(capture),
    search: (params: { userId?: string; city: string; checkin: string; checkout: string }) =>
      capture.capture({
        userId: params.userId,
        intentKey: `hotel_search_${params.city.toLowerCase().replace(/\s+/g, '_')}`,
        eventType: 'search',
        category: 'TRAVEL',
        metadata: { city: params.city, checkin: params.checkin, checkout: params.checkout },
      }),
    view: (params: { userId?: string; hotelId: string; city?: string }) =>
      capture.capture({
        userId: params.userId,
        intentKey: `hotel_view_${params.hotelId}`,
        eventType: 'view',
        category: 'TRAVEL',
        metadata: { hotelId: params.hotelId, city: params.city },
      }),
    hold: (params: { userId?: string; hotelId: string; roomTypeId: string; checkin: string; checkout: string }) =>
      capture.capture({
        userId: params.userId,
        intentKey: `hotel_hold_${params.hotelId}_${params.roomTypeId}`,
        eventType: 'hold',
        category: 'TRAVEL',
        metadata: { hotelId: params.hotelId, roomTypeId: params.roomTypeId, checkin: params.checkin, checkout: params.checkout },
      }),
    fulfill: (params: { userId?: string; hotelId: string; bookingId: string }) =>
      capture.capture({
        userId: params.userId,
        intentKey: `hotel_fulfilled_${params.hotelId}`,
        eventType: 'fulfilled',
        category: 'TRAVEL',
        metadata: { hotelId: params.hotelId, bookingId: params.bookingId },
      }),
  };
}

export function createRestaurantIntentCapture(baseUrl: string, userId?: string) {
  const capture = new IntentCapture({ baseUrl, appType: 'restaurant', userId });
  return {
    capture,
    setUser: capture.setUser.bind(capture),
    viewStore: (params: { userId?: string; storeSlug: string }) =>
      capture.capture({
        userId: params.userId,
        intentKey: `restaurant_view_${params.storeSlug}`,
        eventType: 'view',
        category: 'DINING',
        metadata: { storeSlug: params.storeSlug },
      }),
    addToCart: (params: { userId?: string; storeSlug: string; itemId: string; itemName: string }) =>
      capture.capture({
        userId: params.userId,
        intentKey: `restaurant_cart_${params.storeSlug}`,
        eventType: 'cart_add',
        category: 'DINING',
        metadata: { storeSlug: params.storeSlug, itemId: params.itemId, itemName: params.itemName },
      }),
    checkout: (params: { userId?: string; storeSlug: string; orderId: string }) =>
      capture.capture({
        userId: params.userId,
        intentKey: `restaurant_checkout_${params.storeSlug}`,
        eventType: 'checkout_start',
        category: 'DINING',
        metadata: { storeSlug: params.storeSlug, orderId: params.orderId },
      }),
    orderPlaced: (params: { userId?: string; storeSlug: string; orderId: string }) =>
      capture.capture({
        userId: params.userId,
        intentKey: `restaurant_fulfilled_${params.storeSlug}`,
        eventType: 'fulfilled',
        category: 'DINING',
        metadata: { storeSlug: params.storeSlug, orderId: params.orderId },
      }),
  };
}
