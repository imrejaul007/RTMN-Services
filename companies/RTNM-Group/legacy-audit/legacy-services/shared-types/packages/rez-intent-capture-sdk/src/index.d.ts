/**
 * @rez/intent-capture-sdk
 * Unified Intent Capture SDK for ReZ ecosystem apps
 */
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
export declare class IntentCapture {
    private baseUrl;
    private appType;
    private userId?;
    constructor(config: IntentConfig);
    /**
     * Set the current user
     */
    setUser(userId: string): void;
    /**
     * Clear the current user
     */
    clearUser(): void;
    /**
     * Capture an intent signal
     */
    capture(params: CaptureParams): Promise<void>;
    /**
     * Capture multiple intents in batch
     */
    captureBatch(params: CaptureParams[]): Promise<void>;
    /**
     * Get active intents for a user
     */
    getActiveIntents(userId?: string): Promise<ActiveIntent[]>;
    /**
     * Get dormant intents for a user
     */
    getDormantIntents(userId?: string): Promise<DormantIntent[]>;
}
export declare function getEventWeight(eventType: EventType): number;
export declare function getIntentKeyPrefix(category: Category): string;
export declare function initIntentCapture(config: IntentConfig): IntentCapture;
export declare function getIntentCapture(): IntentCapture | null;
export declare function createIntentTracker(capture: IntentCapture): (eventType: EventType, metadata?: Record<string, unknown>) => (params: {
    userId?: string;
    intentKey?: string;
    category?: Category;
}) => void;
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
export declare function captureIntent(params: {
    userId: string;
    appType: AppType;
    eventType: EventType;
    intentKey: string;
    category: Category;
    metadata?: Record<string, unknown>;
}): Promise<void>;
export declare function createHotelIntentCapture(baseUrl: string, userId?: string): {
    capture: IntentCapture;
    setUser: (userId: string) => void;
    search: (params: {
        userId?: string;
        city: string;
        checkin: string;
        checkout: string;
    }) => Promise<void>;
    view: (params: {
        userId?: string;
        hotelId: string;
        city?: string;
    }) => Promise<void>;
    hold: (params: {
        userId?: string;
        hotelId: string;
        roomTypeId: string;
        checkin: string;
        checkout: string;
    }) => Promise<void>;
    fulfill: (params: {
        userId?: string;
        hotelId: string;
        bookingId: string;
    }) => Promise<void>;
};
export declare function createRestaurantIntentCapture(baseUrl: string, userId?: string): {
    capture: IntentCapture;
    setUser: (userId: string) => void;
    viewStore: (params: {
        userId?: string;
        storeSlug: string;
    }) => Promise<void>;
    addToCart: (params: {
        userId?: string;
        storeSlug: string;
        itemId: string;
        itemName: string;
    }) => Promise<void>;
    checkout: (params: {
        userId?: string;
        storeSlug: string;
        orderId: string;
    }) => Promise<void>;
    orderPlaced: (params: {
        userId?: string;
        storeSlug: string;
        orderId: string;
    }) => Promise<void>;
};
//# sourceMappingURL=index.d.ts.map