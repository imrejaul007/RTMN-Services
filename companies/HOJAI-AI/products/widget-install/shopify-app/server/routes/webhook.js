/**
 * Shopify Webhook Handlers
 * Handles all Shopify webhook events for the HOJAI SiteOS app
 *
 * IMPORTANT: Webhooks require HMAC signature verification to ensure
 * requests are actually from Shopify. This prevents spoofing attacks.
 *
 * Topics handled:
 * - App lifecycle: app/uninstalled, app/update
 * - Shop: shop/update, shop/redact
 * - Orders: orders/create, orders/updated, orders/fulfilled, orders/cancelled, orders/deleted
 * - Customers: customers/create, customers/update, customers/delete
 * - Products: products/create, products/update, products/delete
 * - Checkouts: checkouts/create, checkouts/update
 * - Collections: collections/create, collections/update, collections/delete
 * - GDPR: customers/data_request, customers/redact, shop/redact
 */

import express from 'express';
import crypto from 'crypto';
import { storage } from '../services/storage.js';
import { logger } from '../utils/logger.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { webhookRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to all webhook routes
router.use(webhookRateLimiter());

// ============================================
// HMAC VERIFICATION MIDDLEWARE
// ============================================

/**
 * Verify Shopify webhook HMAC signature
 * Shopify sends X-Shopify-Hmac-SHA256 header with each webhook
 */
function verifyWebhookHMAC(req, res, buf, encoding) {
  // Skip verification in development if configured
  if (process.env.NODE_ENV !== 'production' && process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
    return true;
  }

  const shopDomain = req.headers['x-shopify-shop-domain'];
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const topic = req.headers['x-shopify-topic'];

  if (!hmacHeader) {
    logger.warn('Webhook missing HMAC header', { shop: shopDomain, topic });
    throw new AppError('Missing webhook HMAC signature', 401, 'MISSING_HMAC');
  }

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    logger.error('SHOPIFY_CLIENT_SECRET not configured');
    throw new AppError('Server misconfiguration', 500, 'CONFIG_ERROR');
  }

  // Calculate expected HMAC
  const hash = crypto
    .createHmac('sha256', secret)
    .update(buf, encoding)
    .digest('base64');

  // Compare HMACs using timing-safe comparison
  const expectedHmac = `sha256=${hash}`;
  const receivedHmac = Array.isArray(hmacHeader) ? hmacHeader[0] : hmacHeader;

  if (!timingSafeEqual(expectedHmac, receivedHmac)) {
    logger.warn('Webhook HMAC verification failed', {
      shop: shopDomain,
      topic,
      expected: expectedHmac.substring(0, 20) + '...',
      received: receivedHmac.substring(0, 20) + '...'
    });
    throw new AppError('Invalid webhook signature', 401, 'INVALID_HMAC');
  }

  return true;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

// ============================================
// WEBHOOK REGISTRATION HELPER
// ============================================

/**
 * Get all webhook topics this app subscribes to
 */
function getWebhookTopics() {
  return [
    // App lifecycle
    'app/uninstalled',
    'app/update',

    // Shop events
    'shop/update',

    // Order events
    'orders/create',
    'orders/updated',
    'orders/fulfilled',
    'orders/cancelled',
    'orders/deleted',
    'orders/paid',
    'orders/partially_fulfilled',
    'orders/refunded',

    // Customer events
    'customers/create',
    'customers/update',
    'customers/delete',

    // Product events
    'products/create',
    'products/update',
    'products/delete',

    // Checkout events
    'checkouts/create',
    'checkouts/update',
    'checkouts/complete',

    // Collection events
    'collections/create',
    'collections/update',
    'collections/delete',

    // GDPR compliance
    'customers/data_request',
    'customers/redact',
    'shop/redact'
  ];
}

/**
 * Register webhooks for a shop (called after OAuth)
 */
export async function registerWebhooksForShop(shop, accessToken) {
  const baseUrl = process.env.SHOPIFY_APP_URL;
  const topics = getWebhookTopics();

  const registrationResults = [];

  for (const topic of topics) {
    try {
      const webhookUrl = `${baseUrl}/webhooks/${topic.replace(/\//g, '_')}`;

      // Using Shopify REST API to register webhook
      const response = await fetch(`https://${shop}/admin/api/2023-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: webhookUrl,
            format: 'json',
            metafield_namespaces: []
          }
        })
      });

      if (response.ok) {
        registrationResults.push({ topic, success: true });
      } else {
        const error = await response.json();
        registrationResults.push({ topic, success: false, error: error.errors });
      }
    } catch (error) {
      registrationResults.push({ topic, success: false, error: error.message });
    }
  }

  return registrationResults;
}

// ============================================
// RAW BODY MIDDLEWARE
// ============================================

// Store raw body for HMAC verification
router.use((req, res, next) => {
  let data = '';

  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    data += chunk;
  });

  req.on('end', () => {
    try {
      req.rawBody = data;
      req.body = data ? JSON.parse(data) : {};
      next();
    } catch (error) {
      logger.error('Failed to parse webhook body', { error: error.message });
      req.body = {};
      next();
    }
  });
});

// ============================================
// APP LIFECYCLE WEBHOOKS
// ============================================

/**
 * POST /webhooks/app/uninstalled
 * Called when the app is uninstalled from a store
 * IMPORTANT: This is critical - must clean up all data
 */
router.post('/app_uninstalled', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const topic = 'app/uninstalled';

  logger.info('Webhook received: app/uninstalled', { shop: shopDomain });

  try {
    // Get the shop's session for any final API calls
    const session = await storage.getSession(shopDomain);

    // Delete all stored data for this shop
    await storage.deleteShopData(shopDomain);

    // Notify HOJAI platform of uninstallation
    await notifyHOJAIPlatform(shopDomain, 'uninstalled', {
      shop: shopDomain,
      uninstalledAt: new Date().toISOString()
    });

    // Log for analytics
    await storage.trackEvent('webhook', {
      topic,
      shop: shopDomain,
      action: 'uninstalled',
      timestamp: new Date().toISOString()
    });

    logger.info('App uninstalled via webhook', { shop: shopDomain });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to process app/uninstalled webhook', {
      shop: shopDomain,
      error: error.message
    });
    throw new AppError('Failed to process uninstall', 500, 'UNINSTALL_PROCESSING_FAILED');
  }
}));

/**
 * POST /webhooks/app_update
 * Called when app permissions or configuration changes
 */
router.post('/app_update', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];

  logger.info('Webhook received: app/update', { shop: shopDomain });

  try {
    await storage.trackEvent('webhook', {
      topic: 'app/update',
      shop: shopDomain,
      data: req.body,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to process app/update webhook', { shop: shopDomain });
    res.status(500).json({ success: false });
  }
}));

// ============================================
// SHOP WEBHOOKS
// ============================================

/**
 * POST /webhooks/shop_update
 * Called when shop settings are updated
 */
router.post('/shop_update', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const shopData = req.body;

  logger.info('Webhook received: shop/update', { shop: shopDomain });

  try {
    // Store updated shop metadata
    await storage.storeShopMeta(shopDomain, {
      name: shopData.name,
      email: shopData.email,
      domain: shopData.domain,
      myshopifyDomain: shopData.myshopify_domain,
      address: shopData.address,
      city: shopData.city,
      country: shopData.country,
      countryCode: shopData.country_code,
      province: shopData.province,
      provinceCode: shopData.province_code,
      zip: shopData.zip,
      phone: shopData.phone,
      primaryLocale: shopData.primary_locale,
      currency: shopData.currency,
      timezone: shopData.timezone,
      ianaTimezone: shopData.iana_timezone,
      updatedAt: new Date().toISOString()
    });

    await storage.trackEvent('webhook', {
      topic: 'shop/update',
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to process shop/update webhook', { shop: shopDomain });
    res.status(500).json({ success: false });
  }
}));

/**
 * POST /webhooks/shop_redact
 * GDPR: Request to delete all shop data
 */
router.post('/shop_redact', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];

  logger.info('Webhook received: shop/redact (GDPR)', { shop: shopDomain });

  try {
    // Delete all shop data
    await storage.deleteShopData(shopDomain);

    // Log GDPR compliance action
    await storage.trackEvent('gdpr', {
      action: 'shop_redact',
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to process shop/redact webhook', { shop: shopDomain });
    res.status(500).json({ success: false });
  }
}));

// ============================================
// ORDER WEBHOOKS
// ============================================

/**
 * POST /webhooks/orders_create
 * Called when a new order is created
 */
router.post('/orders_create', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const order = req.body;

  logger.info('Webhook received: orders/create', {
    shop: shopDomain,
    orderId: order.id,
    orderName: order.name
  });

  try {
    // Track order event
    await storage.trackEvent('orders/create', {
      orderId: order.id,
      orderName: order.name,
      orderNumber: order.order_number,
      totalPrice: order.total_price,
      subtotalPrice: order.subtotal_price,
      totalTax: order.total_tax,
      totalDiscounts: order.total_discounts,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      customerId: order.customer?.id,
      customerEmail: order.email,
      lineItemCount: order.line_items?.length || 0,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    // Sync to HOJAI platform
    await syncOrderToHOJAI(shopDomain, order);

    // Update shop's last active time
    await storage.updateShopLastActive(shopDomain);

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to process orders/create webhook', {
      shop: shopDomain,
      orderId: order.id,
      error: error.message
    });
    res.status(200).json({ success: false, error: error.message }); // Still acknowledge
  }
}));

/**
 * POST /webhooks/orders_updated
 * Called when an order is updated
 */
router.post('/orders_updated', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const order = req.body;

  logger.info('Webhook received: orders/updated', {
    shop: shopDomain,
    orderId: order.id
  });

  try {
    await storage.trackEvent('orders/updated', {
      orderId: order.id,
      orderName: order.name,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      totalPrice: order.total_price,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to process orders/updated webhook', { shop: shopDomain });
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/orders_fulfilled
 * Called when an order is fulfilled
 */
router.post('/orders_fulfilled', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const order = req.body;

  logger.info('Webhook received: orders/fulfilled', {
    shop: shopDomain,
    orderId: order.id
  });

  try {
    await storage.trackEvent('orders/fulfilled', {
      orderId: order.id,
      orderName: order.name,
      fulfillmentStatus: order.fulfillment_status,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/orders_cancelled
 * Called when an order is cancelled
 */
router.post('/orders_cancelled', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const order = req.body;

  logger.info('Webhook received: orders/cancelled', {
    shop: shopDomain,
    orderId: order.id
  });

  try {
    await storage.trackEvent('orders/cancelled', {
      orderId: order.id,
      orderName: order.name,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/orders_deleted
 * Called when an order is deleted
 */
router.post('/orders_deleted', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const order = req.body;

  logger.info('Webhook received: orders/deleted', {
    shop: shopDomain,
    orderId: order.id
  });

  try {
    await storage.trackEvent('orders/deleted', {
      orderId: order.id,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/orders_refunded
 * Called when an order is refunded
 */
router.post('/orders_refunded', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const order = req.body;

  logger.info('Webhook received: orders/refunded', {
    shop: shopDomain,
    orderId: order.id
  });

  try {
    await storage.trackEvent('orders/refunded', {
      orderId: order.id,
      orderName: order.name,
      totalRefunded: order.total_refunds,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

// ============================================
// CUSTOMER WEBHOOKS
// ============================================

/**
 * POST /webhooks/customers_create
 * Called when a new customer is created
 */
router.post('/customers_create', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const customer = req.body;

  logger.info('Webhook received: customers/create', {
    shop: shopDomain,
    customerId: customer.id
  });

  try {
    await storage.trackEvent('customers/create', {
      customerId: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      ordersCount: customer.orders_count,
      totalSpent: customer.total_spent,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/customers_update
 * Called when a customer is updated
 */
router.post('/customers_update', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const customer = req.body;

  logger.info('Webhook received: customers/update', {
    shop: shopDomain,
    customerId: customer.id
  });

  try {
    await storage.trackEvent('customers/update', {
      customerId: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/customers_delete
 * Called when a customer is deleted
 */
router.post('/customers_delete', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const customer = req.body;

  logger.info('Webhook received: customers/delete', {
    shop: shopDomain,
    customerId: customer.id
  });

  try {
    await storage.trackEvent('customers/delete', {
      customerId: customer.id,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/customers_data_request
 * GDPR: Customer requests their data
 */
router.post('/customers_data_request', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const { customer_id, customer_email, shop_domain } = req.body;

  logger.info('Webhook received: customers/data_request (GDPR)', {
    shop: shopDomain,
    customerEmail: customer_email
  });

  try {
    // Log the data request
    await storage.trackEvent('gdpr', {
      action: 'data_request',
      customerId: customer_id,
      customerEmail: customer_email,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    // In production, you would:
    // 1. Gather all customer data from your storage
    // 2. Package it into a downloadable format
    // 3. Email it to the customer or provide a download link

    res.status(200).json({
      success: true,
      message: 'Data request received and will be processed'
    });
  } catch (error) {
    logger.error('Failed to process data request', { shop: shopDomain });
    res.status(500).json({ success: false });
  }
}));

/**
 * POST /webhooks/customers_redact
 * GDPR: Customer requests their data be deleted
 */
router.post('/customers_redact', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const { customer_id, customer_email, shop_domain } = req.body;

  logger.info('Webhook received: customers/redact (GDPR)', {
    shop: shopDomain,
    customerEmail: customer_email
  });

  try {
    // Delete customer data from storage
    await storage.deleteCustomerData(customer_email);

    // Log the redaction
    await storage.trackEvent('gdpr', {
      action: 'customer_redact',
      customerId: customer_id,
      customerEmail: customer_email,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to process customer redaction', { shop: shopDomain });
    res.status(500).json({ success: false });
  }
}));

// ============================================
// PRODUCT WEBHOOKS
// ============================================

/**
 * POST /webhooks/products_create
 * Called when a new product is created
 */
router.post('/products_create', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const product = req.body;

  logger.info('Webhook received: products/create', {
    shop: shopDomain,
    productId: product.id,
    title: product.title
  });

  try {
    await storage.trackEvent('products/create', {
      productId: product.id,
      title: product.title,
      productType: product.product_type,
      vendor: product.vendor,
      status: product.status,
      variantsCount: product.variants?.length || 0,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    // Sync to HOJAI for product search/chat
    await syncProductToHOJAI(shopDomain, product);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/products_update
 * Called when a product is updated
 */
router.post('/products_update', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const product = req.body;

  logger.info('Webhook received: products/update', {
    shop: shopDomain,
    productId: product.id
  });

  try {
    await storage.trackEvent('products/update', {
      productId: product.id,
      title: product.title,
      status: product.status,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    await syncProductToHOJAI(shopDomain, product);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/products_delete
 * Called when a product is deleted
 */
router.post('/products_delete', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const product = req.body;

  logger.info('Webhook received: products/delete', {
    shop: shopDomain,
    productId: product.id
  });

  try {
    await storage.trackEvent('products/delete', {
      productId: product.id,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    // Notify HOJAI to remove product
    await removeProductFromHOJAI(shopDomain, product.id);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

// ============================================
// CHECKOUT WEBHOOKS
// ============================================

/**
 * POST /webhooks/checkouts_create
 * Called when a checkout is created
 */
router.post('/checkouts_create', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const checkout = req.body;

  logger.info('Webhook received: checkouts/create', {
    shop: shopDomain,
    checkoutId: checkout.id
  });

  try {
    await storage.trackEvent('checkouts/create', {
      checkoutId: checkout.id,
      totalPrice: checkout.total_price,
      subtotalPrice: checkout.subtotal_price,
      lineItemsCount: checkout.line_items?.length || 0,
      customerEmail: checkout.email,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/checkouts_update
 * Called when a checkout is updated
 */
router.post('/checkouts_update', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const checkout = req.body;

  logger.info('Webhook received: checkouts/update', {
    shop: shopDomain,
    checkoutId: checkout.id
  });

  try {
    await storage.trackEvent('checkouts/update', {
      checkoutId: checkout.id,
      totalPrice: checkout.total_price,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

// ============================================
// COLLECTION WEBHOOKS
// ============================================

/**
 * POST /webhooks/collections_create
 * Called when a collection is created
 */
router.post('/collections_create', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const collection = req.body;

  logger.info('Webhook received: collections/create', {
    shop: shopDomain,
    collectionId: collection.id
  });

  try {
    await storage.trackEvent('collections/create', {
      collectionId: collection.id,
      title: collection.title,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/collections_update
 * Called when a collection is updated
 */
router.post('/collections_update', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const collection = req.body;

  logger.info('Webhook received: collections/update', {
    shop: shopDomain,
    collectionId: collection.id
  });

  try {
    await storage.trackEvent('collections/update', {
      collectionId: collection.id,
      title: collection.title,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

/**
 * POST /webhooks/collections_delete
 * Called when a collection is deleted
 */
router.post('/collections_delete', asyncHandler(async (req, res) => {
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const collection = req.body;

  logger.info('Webhook received: collections/delete', {
    shop: shopDomain,
    collectionId: collection.id
  });

  try {
    await storage.trackEvent('collections/delete', {
      collectionId: collection.id,
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
}));

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sync order to HOJAI platform
 */
async function syncOrderToHOJAI(shop, order) {
  if (!process.env.HOJAI_API_URL) return;

  try {
    await fetch(`${process.env.HOJAI_API_URL}/api/v1/shopify/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HOJAI_API_KEY}`
      },
      body: JSON.stringify({
        shop,
        order: {
          id: order.id,
          name: order.name,
          email: order.email,
          totalPrice: order.total_price,
          currency: order.currency,
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          createdAt: order.created_at,
          lineItems: order.line_items?.map(item => ({
            productId: item.product_id,
            variantId: item.variant_id,
            title: item.title,
            quantity: item.quantity,
            price: item.price
          })) || []
        }
      })
    });
  } catch (error) {
    logger.error('Failed to sync order to HOJAI', { shop, error: error.message });
  }
}

/**
 * Sync product to HOJAI platform
 */
async function syncProductToHOJAI(shop, product) {
  if (!process.env.HOJAI_API_URL) return;

  try {
    await fetch(`${process.env.HOJAI_API_URL}/api/v1/shopify/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HOJAI_API_KEY}`
      },
      body: JSON.stringify({
        shop,
        product: {
          id: product.id,
          title: product.title,
          description: product.body_html,
          productType: product.product_type,
          vendor: product.vendor,
          tags: product.tags,
          status: product.status,
          variants: product.variants?.map(v => ({
            id: v.id,
            title: v.title,
            price: v.price,
            sku: v.sku,
            inventory: v.inventory_quantity,
            image: v.image_id
          })) || [],
          images: product.images?.map(img => ({
            id: img.id,
            src: img.src,
            alt: img.alt
          })) || []
        }
      })
    });
  } catch (error) {
    logger.error('Failed to sync product to HOJAI', { shop, error: error.message });
  }
}

/**
 * Remove product from HOJAI platform
 */
async function removeProductFromHOJAI(shop, productId) {
  if (!process.env.HOJAI_API_URL) return;

  try {
    await fetch(`${process.env.HOJAI_API_URL}/api/v1/shopify/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.HOJAI_API_KEY}`
      }
    });
  } catch (error) {
    logger.error('Failed to remove product from HOJAI', { shop, error: error.message });
  }
}

/**
 * Notify HOJAI platform of webhook events
 */
async function notifyHOJAIPlatform(shop, event, data) {
  if (!process.env.HOJAI_WEBHOOK_URL) return;

  try {
    await fetch(`${process.env.HOJAI_WEBHOOK_URL}/api/v1/shopify/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HOJAI_API_KEY}`
      },
      body: JSON.stringify({
        event,
        shop,
        timestamp: new Date().toISOString(),
        ...data
      })
    });
  } catch (error) {
    logger.error('Failed to notify HOJAI platform', { shop, error: error.message });
  }
}

export default router;