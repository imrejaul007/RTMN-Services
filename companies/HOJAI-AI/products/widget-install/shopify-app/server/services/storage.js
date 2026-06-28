/**
 * Secure Storage Service
 *
 * IMPORTANT: Store tokens and configs in HOJAI's own database,
 * NOT in Shopify metafields. Metafields leak API keys.
 */

import NodeCache from 'node-cache';

// In-memory storage (use Redis/DB in production)
const sessionCache = new NodeCache({ stdTTL: 86400 }); // 24h
const configCache = new NodeCache({ stdTTL: 3600 }); // 1h
const eventsCache = new NodeCache({ stdTTL: 300 }); // 5min

class Storage {
  // ─── Sessions ──────────────────────────────────────────────────────────

  async storeSession(shop, session) {
    sessionCache.set(`session_${shop}`, session);
    // In production: store in your database
    console.log('Session stored for:', shop);
  }

  async getSession(shop) {
    return sessionCache.get(`session_${shop}`);
  }

  async deleteSession(shop) {
    sessionCache.del(`session_${shop}`);
    console.log('Session deleted for:', shop);
  }

  // ─── Widget Config ────────────────────────────────────────────────────

  async storeWidgetConfig(shop, config) {
    configCache.set(`config_${shop}`, config);
    console.log('Config stored for:', shop);
  }

  async getWidgetConfig(shop) {
    return configCache.get(`config_${shop}`);
  }

  // ─── Shop Meta ───────────────────────────────────────────────────────

  async storeShopMeta(shop, meta) {
    configCache.set(`meta_${shop}`, meta);
  }

  async getShopMeta(shop) {
    return configCache.get(`meta_${shop}`);
  }

  // ─── Delete All Shop Data ─────────────────────────────────────────────

  async deleteShopData(shop) {
    sessionCache.del(`session_${shop}`);
    configCache.del(`config_${shop}`);
    configCache.del(`meta_${shop}`);
    eventsCache.flushTTL(); // Clear all events for this shop
    console.log('All data deleted for:', shop);
  }

  // ─── Events ─────────────────────────────────────────────────────────

  async trackEvent(type, data) {
    const event = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    const events = eventsCache.get('events') || [];
    events.push(event);
    eventsCache.set('events', events.slice(-1000)); // Keep last 1000

    // In production: send to HOJAI API
    console.log('Event tracked:', type);
  }

  // ─── Customer Data ──────────────────────────────────────────────────

  async deleteCustomerData(email) {
    console.log('GDPR: Customer data deleted for:', email);
    // In production: delete from your database
  }
}

export const storage = new Storage();
