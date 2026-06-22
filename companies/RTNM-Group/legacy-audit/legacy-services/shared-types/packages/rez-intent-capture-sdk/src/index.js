"use strict";
/**
 * @rez/intent-capture-sdk
 * Unified Intent Capture SDK for ReZ ecosystem apps
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentCapture = void 0;
exports.getEventWeight = getEventWeight;
exports.getIntentKeyPrefix = getIntentKeyPrefix;
exports.initIntentCapture = initIntentCapture;
exports.getIntentCapture = getIntentCapture;
exports.createIntentTracker = createIntentTracker;
exports.captureIntent = captureIntent;
exports.createHotelIntentCapture = createHotelIntentCapture;
exports.createRestaurantIntentCapture = createRestaurantIntentCapture;
// ── Event Weights ─────────────────────────────────────────────────────────────
const EVENT_WEIGHTS = {
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
class IntentCapture {
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.appType = config.appType;
        this.userId = config.userId;
    }
    /**
     * Set the current user
     */
    setUser(userId) {
        this.userId = userId;
    }
    /**
     * Clear the current user
     */
    clearUser() {
        this.userId = undefined;
    }
    /**
     * Capture an intent signal
     */
    async capture(params) {
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
        }
        catch (error) {
            console.error('[IntentCapture] Failed to capture intent', error);
        }
    }
    /**
     * Capture multiple intents in batch
     */
    async captureBatch(params) {
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
        }
        catch (error) {
            console.error('[IntentCapture] Failed to capture batch intents', error);
        }
    }
    /**
     * Get active intents for a user
     */
    async getActiveIntents(userId) {
        const uid = userId || this.userId;
        if (!uid) {
            console.warn('[IntentCapture] No userId provided');
            return [];
        }
        try {
            const response = await fetch(`${this.baseUrl}/api/agent/intents/${uid}`);
            if (!response.ok)
                return [];
            return await response.json();
        }
        catch {
            return [];
        }
    }
    /**
     * Get dormant intents for a user
     */
    async getDormantIntents(userId) {
        const uid = userId || this.userId;
        if (!uid) {
            console.warn('[IntentCapture] No userId provided');
            return [];
        }
        try {
            const response = await fetch(`${this.baseUrl}/api/agent/dormant/${uid}`);
            if (!response.ok)
                return [];
            return await response.json();
        }
        catch {
            return [];
        }
    }
}
exports.IntentCapture = IntentCapture;
// ── Event Helper Functions ─────────────────────────────────────────────────────
function getEventWeight(eventType) {
    return EVENT_WEIGHTS[eventType] || 0.1;
}
function getIntentKeyPrefix(category) {
    const prefixes = {
        TRAVEL: 'travel',
        DINING: 'dining',
        RETAIL: 'retail',
        HOTEL_SERVICE: 'hotel_service',
        GENERAL: 'general',
    };
    return prefixes[category] || 'general';
}
// ── React Hook (optional) ──────────────────────────────────────────────────────
let globalCapture = null;
function initIntentCapture(config) {
    globalCapture = new IntentCapture(config);
    return globalCapture;
}
function getIntentCapture() {
    return globalCapture;
}
function createIntentTracker(capture) {
    return (eventType, metadata) => {
        return (params) => {
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
async function captureIntent(params) {
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
    }
    catch (error) {
        console.error('[IntentCapture] Failed to capture intent', error);
    }
}
// ── Pre-built Event Functions ─────────────────────────────────────────────────
function createHotelIntentCapture(baseUrl, userId) {
    const capture = new IntentCapture({ baseUrl, appType: 'hotel_ota', userId });
    return {
        capture,
        setUser: capture.setUser.bind(capture),
        search: (params) => capture.capture({
            userId: params.userId,
            intentKey: `hotel_search_${params.city.toLowerCase().replace(/\s+/g, '_')}`,
            eventType: 'search',
            category: 'TRAVEL',
            metadata: { city: params.city, checkin: params.checkin, checkout: params.checkout },
        }),
        view: (params) => capture.capture({
            userId: params.userId,
            intentKey: `hotel_view_${params.hotelId}`,
            eventType: 'view',
            category: 'TRAVEL',
            metadata: { hotelId: params.hotelId, city: params.city },
        }),
        hold: (params) => capture.capture({
            userId: params.userId,
            intentKey: `hotel_hold_${params.hotelId}_${params.roomTypeId}`,
            eventType: 'hold',
            category: 'TRAVEL',
            metadata: { hotelId: params.hotelId, roomTypeId: params.roomTypeId, checkin: params.checkin, checkout: params.checkout },
        }),
        fulfill: (params) => capture.capture({
            userId: params.userId,
            intentKey: `hotel_fulfilled_${params.hotelId}`,
            eventType: 'fulfilled',
            category: 'TRAVEL',
            metadata: { hotelId: params.hotelId, bookingId: params.bookingId },
        }),
    };
}
function createRestaurantIntentCapture(baseUrl, userId) {
    const capture = new IntentCapture({ baseUrl, appType: 'restaurant', userId });
    return {
        capture,
        setUser: capture.setUser.bind(capture),
        viewStore: (params) => capture.capture({
            userId: params.userId,
            intentKey: `restaurant_view_${params.storeSlug}`,
            eventType: 'view',
            category: 'DINING',
            metadata: { storeSlug: params.storeSlug },
        }),
        addToCart: (params) => capture.capture({
            userId: params.userId,
            intentKey: `restaurant_cart_${params.storeSlug}`,
            eventType: 'cart_add',
            category: 'DINING',
            metadata: { storeSlug: params.storeSlug, itemId: params.itemId, itemName: params.itemName },
        }),
        checkout: (params) => capture.capture({
            userId: params.userId,
            intentKey: `restaurant_checkout_${params.storeSlug}`,
            eventType: 'checkout_start',
            category: 'DINING',
            metadata: { storeSlug: params.storeSlug, orderId: params.orderId },
        }),
        orderPlaced: (params) => capture.capture({
            userId: params.userId,
            intentKey: `restaurant_fulfilled_${params.storeSlug}`,
            eventType: 'fulfilled',
            category: 'DINING',
            metadata: { storeSlug: params.storeSlug, orderId: params.orderId },
        }),
    };
}
//# sourceMappingURL=index.js.map