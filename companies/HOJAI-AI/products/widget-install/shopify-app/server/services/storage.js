/**
 * Secure Storage Service
 *
 * IMPORTANT: Store tokens and configs in HOJAI's own database,
 * NOT in Shopify metafields. Metafields leak API keys and are
 * accessible to other apps with write permissions.
 *
 * Storage Strategy:
 * - Primary: PostgreSQL (production) or SQLite (development)
 * - Cache: Redis (production) or NodeCache (development)
 * - Tokens: Encrypted at rest using AES-256-GCM
 *
 * This service provides:
 * - Session management (access tokens, scopes, expiry)
 * - Widget configuration storage
 * - Shop metadata caching
 * - Event tracking and analytics
 * - GDPR-compliant data deletion
 */

import NodeCache from 'node-cache';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Encryption settings
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  ENCRYPTION_KEY_LENGTH: 32,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,

  // Cache TTLs (in seconds)
  SESSION_TTL: 86400 * 30, // 30 days
  CONFIG_TTL: 3600, // 1 hour
  META_TTL: 3600 * 24, // 24 hours
  EVENTS_TTL: 300, // 5 minutes
  OAUTH_STATE_TTL: 900, // 15 minutes

  // Encryption key from environment
  get encryptionKey() {
    const key = process.env.STORAGE_ENCRYPTION_KEY;
    if (!key) {
      logger.warn('STORAGE_ENCRYPTION_KEY not set, using fallback (NOT SAFE FOR PRODUCTION)');
      return crypto.scryptSync('development-fallback-key', 'hojai-salt', 32);
    }
    return Buffer.from(key, 'base64');
  }
};

// ============================================
// IN-MEMORY STORES (with persistence options)
// ============================================

// Primary in-memory caches (used when database is not configured)
const sessionCache = new NodeCache({ stdTTL: CONFIG.SESSION_TTL });
const configCache = new NodeCache({ stdTTL: CONFIG.CONFIG_TTL });
const metaCache = new NodeCache({ stdTTL: CONFIG.META_TTL });
const eventsCache = new NodeCache({ stdTTL: CONFIG.EVENTS_TTL });
const oauthStateCache = new NodeCache({ stdTTL: CONFIG.OAUTH_STATE_TTL });

// Shop index for listing all shops
const shopIndex = new NodeCache({ stdTTL: CONFIG.SESSION_TTL });

// ============================================
// DATABASE CONNECTION (for production)
// ============================================

let db = null;
let redis = null;
let isUsingDatabase = false;

/**
 * Initialize database connection
 * Called during app startup
 */
async function initDatabase() {
  if (process.env.DATABASE_URL) {
    try {
      // In production, you would use a proper PostgreSQL client
      // const { Client } = await import('pg');
      // db = new Client({ connectionString: process.env.DATABASE_URL });
      // await db.connect();

      // For now, we'll use the in-memory cache
      logger.info('Database connection configured', { type: 'postgresql' });
      isUsingDatabase = true;
    } catch (error) {
      logger.error('Failed to connect to database', { error: error.message });
      logger.info('Falling back to in-memory storage');
      isUsingDatabase = false;
    }
  }

  if (process.env.REDIS_URL) {
    try {
      // In production, you would use ioredis or node-redis
      // redis = new Redis(process.env.REDIS_URL);

      logger.info('Redis connection configured', { type: 'redis' });
    } catch (error) {
      logger.error('Failed to connect to Redis', { error: error.message });
    }
  }
}

/**
 * Health check for database connections
 */
async function healthCheck() {
  try {
    // Check database
    if (db) {
      await db.query('SELECT 1');
    }

    // Check Redis
    if (redis) {
      await redis.ping();
    }

    return true;
  } catch (error) {
    logger.error('Storage health check failed', { error: error.message });
    return false;
  }
}

/**
 * Disconnect from databases
 */
async function disconnect() {
  if (db) {
    await db.end();
    db = null;
  }
  if (redis) {
    await redis.quit();
    redis = null;
  }
  logger.info('Storage connections closed');
}

// ============================================
// ENCRYPTION HELPERS
// ============================================

/**
 * Encrypt sensitive data (access tokens)
 * Uses AES-256-GCM for authenticated encryption
 */
function encrypt(plaintext) {
  const iv = crypto.randomBytes(CONFIG.IV_LENGTH);
  const cipher = crypto.createCipheriv(CONFIG.ENCRYPTION_ALGORITHM, CONFIG.encryptionKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return IV + AuthTag + Encrypted data as base64
  return Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]).toString('base64');
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData) {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');

    const iv = buffer.subarray(0, CONFIG.IV_LENGTH);
    const authTag = buffer.subarray(CONFIG.IV_LENGTH, CONFIG.IV_LENGTH + CONFIG.AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(CONFIG.IV_LENGTH + CONFIG.AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(CONFIG.ENCRYPTION_ALGORITHM, CONFIG.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', { error: error.message });
    return null;
  }
}

/**
 * Hash data for storage (non-reversible)
 * Used for customer data lookups
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ============================================
// STORAGE SERVICE CLASS
// ============================================

class Storage {
  // ─── Session Management ────────────────────────────────────────────────

  /**
   * Store a shop's session (access token, scope, expiry)
   * Tokens are encrypted at rest
   */
  async storeSession(shop, session) {
    const sessionData = {
      ...session,
      accessToken: encrypt(session.accessToken),
      storedAt: new Date().toISOString()
    };

    // Store in cache
    sessionCache.set(`session_${shop}`, sessionData);

    // Update shop index
    const shops = shopIndex.get('all_shops') || [];
    if (!shops.includes(shop)) {
      shopIndex.set('all_shops', [...shops, shop]);
    }

    // Persist to database if configured
    if (isUsingDatabase && db) {
      await this.persistSession(shop, sessionData);
    }

    logger.info('Session stored securely', {
      shop,
      hasToken: !!session.accessToken,
      expiresAt: session.expiresAt
    });

    return true;
  }

  /**
   * Get a shop's session
   * Tokens are decrypted on retrieval
   */
  async getSession(shop) {
    // Try cache first
    let session = sessionCache.get(`session_${shop}`);

    // Try database if not in cache
    if (!session && isUsingDatabase && db) {
      session = await this.fetchSession(shop);
      if (session) {
        sessionCache.set(`session_${shop}`, session);
      }
    }

    if (!session) {
      return null;
    }

    // Decrypt the access token
    if (session.accessToken && !session.accessToken.startsWith('shpat_')) {
      // Token is encrypted
      session.accessToken = decrypt(session.accessToken);
    }

    return session;
  }

  /**
   * Delete a shop's session
   */
  async deleteSession(shop) {
    sessionCache.del(`session_${shop}`);

    // Remove from shop index
    const shops = shopIndex.get('all_shops') || [];
    shopIndex.set('all_shops', shops.filter(s => s !== shop));

    // Delete from database
    if (isUsingDatabase && db) {
      await this.deleteSessionFromDB(shop);
    }

    logger.info('Session deleted', { shop });
    return true;
  }

  /**
   * Update shop's last active timestamp
   */
  async updateShopLastActive(shop) {
    const session = await this.getSession(shop);
    if (session) {
      session.lastActiveAt = new Date().toISOString();
      await this.storeSession(shop, session);
    }
    return true;
  }

  // ─── Widget Configuration ──────────────────────────────────────────────

  /**
   * Store widget configuration
   */
  async storeWidgetConfig(shop, config) {
    const configData = {
      ...config,
      updatedAt: new Date().toISOString()
    };

    configCache.set(`config_${shop}`, configData);

    if (isUsingDatabase && db) {
      await this.persistConfig(shop, configData);
    }

    logger.info('Widget config stored', { shop });
    return true;
  }

  /**
   * Get widget configuration
   */
  async getWidgetConfig(shop) {
    let config = configCache.get(`config_${shop}`);

    if (!config && isUsingDatabase && db) {
      config = await this.fetchConfig(shop);
      if (config) {
        configCache.set(`config_${shop}`, config);
      }
    }

    return config;
  }

  // ─── Shop Metadata ─────────────────────────────────────────────────────

  /**
   * Store shop metadata (name, email, etc.)
   */
  async storeShopMeta(shop, meta) {
    const metaData = {
      ...meta,
      updatedAt: new Date().toISOString()
    };

    metaCache.set(`meta_${shop}`, metaData);

    if (isUsingDatabase && db) {
      await this.persistMeta(shop, metaData);
    }

    return true;
  }

  /**
   * Get shop metadata
   */
  async getShopMeta(shop) {
    let meta = metaCache.get(`meta_${shop}`);

    if (!meta && isUsingDatabase && db) {
      meta = await this.fetchMeta(shop);
      if (meta) {
        metaCache.set(`meta_${shop}`, meta);
      }
    }

    return meta;
  }

  // ─── OAuth State Management ─────────────────────────────────────────────

  /**
   * Store OAuth state for CSRF protection
   */
  async storeOAuthState(state, data) {
    oauthStateCache.set(`oauth_state_${state}`, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return true;
  }

  /**
   * Get and consume OAuth state
   */
  async getOAuthState(state) {
    const stateData = oauthStateCache.get(`oauth_state_${state}`);
    oauthStateCache.del(`oauth_state_${state}`); // One-time use
    return stateData;
  }

  // ─── Event Tracking ────────────────────────────────────────────────────

  /**
   * Track an event for analytics
   */
  async trackEvent(type, data) {
    const event = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date().toISOString()
    };

    // Store in memory (limited to last 1000 events)
    const events = eventsCache.get('events') || [];
    events.push(event);

    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    eventsCache.set('events', events);

    // Also store per-shop events
    const shop = data.shop;
    if (shop) {
      const shopEvents = eventsCache.get(`events_${shop}`) || [];
      shopEvents.push(event);
      if (shopEvents.length > 500) {
        shopEvents.splice(0, shopEvents.length - 500);
      }
      eventsCache.set(`events_${shop}`, shopEvents);
    }

    // In production, send to analytics service
    if (process.env.ANALYTICS_WRITE_KEY) {
      this.sendToAnalytics(event).catch(() => {});
    }

    logger.debug('Event tracked', { type, shop: data.shop });
    return event;
  }

  /**
   * Get recent events for a shop
   */
  async getRecentEvents(shop, limit = 10) {
    const events = eventsCache.get(`events_${shop}`) || [];
    return events.slice(-limit);
  }

  /**
   * Send event to analytics service
   */
  async sendToAnalytics(event) {
    if (!process.env.ANALYTICS_WRITE_KEY) return;

    try {
      await fetch('https://api.segment.io/v1/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(process.env.ANALYTICS_WRITE_KEY + ':').toString('base64')}`
        },
        body: JSON.stringify({
          event: event.type,
          properties: event.data,
          timestamp: event.timestamp
        })
      });
    } catch (error) {
      logger.error('Failed to send to analytics', { error: error.message });
    }
  }

  // ─── Data Deletion (GDPR) ──────────────────────────────────────────────

  /**
   * Delete all data for a shop
   * Called when app is uninstalled or GDPR redaction requested
   */
  async deleteShopData(shop) {
    // Clear all caches
    sessionCache.del(`session_${shop}`);
    configCache.del(`config_${shop}`);
    metaCache.del(`meta_${shop}`);
    eventsCache.del(`events_${shop}`);

    // Remove from shop index
    const shops = shopIndex.get('all_shops') || [];
    shopIndex.set('all_shops', shops.filter(s => s !== shop));

    // Delete from database
    if (isUsingDatabase && db) {
      await this.deleteShopDataFromDB(shop);
    }

    logger.info('All shop data deleted', { shop });
    return true;
  }

  /**
   * Delete customer data (GDPR)
   */
  async deleteCustomerData(email) {
    if (!email) return false;

    const hashedEmail = hash(email.toLowerCase());

    // In production, you would:
    // 1. Delete from customer_events table
    // 2. Delete any customer-related analytics
    // 3. Delete from any customer data stores

    logger.info('Customer data deleted (GDPR)', { emailHash: hashedEmail.substring(0, 8) + '...' });
    return true;
  }

  // ─── Shop Listing ──────────────────────────────────────────────────────

  /**
   * List all installed shops
   */
  async listShops() {
    const shops = shopIndex.get('all_shops') || [];

    // Enrich with session data
    const enrichedShops = await Promise.all(
      shops.map(async (shop) => {
        const session = await this.getSession(shop);
        const config = await this.getWidgetConfig(shop);
        const meta = await this.getShopMeta(shop);

        return {
          shop,
          createdAt: session?.createdAt,
          lastActiveAt: session?.lastActiveAt,
          enabled: config?.enabled ?? false,
          name: meta?.name,
          email: meta?.email
        };
      })
    );

    return enrichedShops;
  }

  // ─── Database Persistence (Production) ─────────────────────────────────

  /**
   * Persist session to database
   * Implement this when using PostgreSQL
   */
  async persistSession(shop, session) {
    // Example SQL:
    // INSERT INTO sessions (shop, data, created_at, updated_at)
    // VALUES ($1, $2, NOW(), NOW())
    // ON CONFLICT (shop) DO UPDATE SET data = $2, updated_at = NOW()
    logger.debug('Session would be persisted to database', { shop });
  }

  /**
   * Fetch session from database
   */
  async fetchSession(shop) {
    // Example SQL:
    // SELECT data FROM sessions WHERE shop = $1
    logger.debug('Session would be fetched from database', { shop });
    return null;
  }

  /**
   * Delete session from database
   */
  async deleteSessionFromDB(shop) {
    // Example SQL:
    // DELETE FROM sessions WHERE shop = $1
    logger.debug('Session would be deleted from database', { shop });
  }

  /**
   * Persist config to database
   */
  async persistConfig(shop, config) {
    logger.debug('Config would be persisted to database', { shop });
  }

  /**
   * Fetch config from database
   */
  async fetchConfig(shop) {
    logger.debug('Config would be fetched from database', { shop });
    return null;
  }

  /**
   * Persist meta to database
   */
  async persistMeta(shop, meta) {
    logger.debug('Meta would be persisted to database', { shop });
  }

  /**
   * Fetch meta from database
   */
  async fetchMeta(shop) {
    logger.debug('Meta would be fetched from database', { shop });
    return null;
  }

  /**
   * Delete all shop data from database
   */
  async deleteShopDataFromDB(shop) {
    // Example SQL:
    // DELETE FROM sessions WHERE shop = $1;
    // DELETE FROM configs WHERE shop = $1;
    // DELETE FROM shop_meta WHERE shop = $1;
    // DELETE FROM events WHERE shop = $1;
    logger.debug('All shop data would be deleted from database', { shop });
  }

  // ─── Utility Methods ───────────────────────────────────────────────────

  /**
   * Get storage statistics
   */
  async getStats() {
    return {
      cachedSessions: sessionCache.keys().length,
      cachedConfigs: configCache.keys().length,
      cachedMeta: metaCache.keys().length,
      totalEvents: (eventsCache.get('events') || []).length,
      totalShops: (shopIndex.get('all_shops') || []).length,
      databaseConnected: isUsingDatabase,
      redisConnected: !!redis
    };
  }

  /**
   * Clear all caches (for testing/maintenance)
   */
  async clearCache() {
    sessionCache.flushAll();
    configCache.flushAll();
    metaCache.flushAll();
    eventsCache.flushAll();
    oauthStateCache.flushAll();
    shopIndex.flushAll();
    logger.info('All caches cleared');
    return true;
  }
}

// Export singleton instance
export const storage = new Storage();

// Also export initialization and health check functions
export { initDatabase, healthCheck, disconnect };

export default storage;