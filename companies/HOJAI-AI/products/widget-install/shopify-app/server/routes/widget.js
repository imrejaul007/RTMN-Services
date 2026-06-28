/**
 * Widget Configuration API
 * Complete API for managing HOJAI widget settings per shop
 *
 * Endpoints:
 * - GET /api/widget/config/:shop - Get widget configuration
 * - PUT /api/widget/config/:shop - Update widget configuration
 * - GET /api/widget/products/:shop - Get shop products
 * - GET /api/widget/orders/:shop - Get shop orders
 * - GET /api/widget/customer/:shop - Get customer info
 * - GET /api/widget/dashboard/:shop - Get dashboard stats
 * - POST /api/widget/preview/:shop - Preview widget with custom settings
 * - GET /api/widget/install/:shop - Get installation script
 */

import express from 'express';
import { storage } from '../services/storage.js';
import { logger } from '../utils/logger.js';
import { AppError, asyncHandler, validationError } from '../middleware/errorHandler.js';
import { strictRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply stricter rate limiting to configuration endpoints
router.use('/config', strictRateLimiter());

/**
 * Validate shop domain
 */
function validateShopDomain(shop) {
  if (!shop) {
    return { valid: false, error: 'Shop domain is required' };
  }

  const normalizedShop = shop.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

  const validPatterns = [
    /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/,
    /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.shopify\.com$/
  ];

  for (const pattern of validPatterns) {
    if (pattern.test(normalizedShop)) {
      return { valid: true, shop: normalizedShop };
    }
  }

  return { valid: false, error: 'Invalid shop domain' };
}

/**
 * Default widget configuration
 */
function getDefaultConfig(shop) {
  return {
    shop,
    apiKey: process.env.HOJAI_API_KEY,
    companyId: shop,
    enabled: true,
    color: '#3B82F6',
    position: 'bottom-right',
    greeting: 'Hi! How can I help you today?',
    features: {
      chat: true,
      voice: false,
      products: true,
      cart: true,
      search: true,
      support: true,
      recommendations: true,
      orderTracking: true,
      faq: true,
      liveChat: false
    },
    appearance: {
      showOnPages: ['all'],
      excludeUrls: [],
      customCss: '',
      customFont: 'Inter',
      borderRadius: 12,
      shadow: true,
      compactMode: false,
      darkMode: 'auto'
    },
    behavior: {
      showOnExitIntent: false,
      showOnScrollPercent: 0,
      autoOpenDelay: 0,
      showOncePerSession: true,
      showAfterNPages: 0,
      soundEnabled: false,
      notificationBadge: true
    },
    content: {
      welcomeMessage: 'Hi there! I\'m your AI assistant. How can I help you today?',
      offlineMessage: 'We\'re currently offline. Leave a message and we\'ll get back to you!',
      searchPlaceholder: 'Search products...',
      quickReplies: [
        'Track my order',
        'Product recommendations',
        'Return or exchange',
        'Contact support'
      ]
    },
    integration: {
      shopify: {
        enabled: true,
        syncProducts: true,
        syncOrders: true,
        syncCustomers: true
      },
      hojai: {
        companyId: shop,
        apiKey: process.env.HOJAI_API_KEY,
        platformUrl: process.env.HOJAI_PLATFORM_URL || 'https://api.hojai.ai'
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ============================================
// WIDGET CONFIGURATION ENDPOINTS
// ============================================

/**
 * GET /api/widget/config/:shop
 * Get widget configuration for a shop
 */
router.get('/config/:shop', asyncHandler(async (req, res) => {
  const { shop } = req.params;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  try {
    // Check if shop is authenticated
    const session = await storage.getSession(shop);
    if (!session) {
      throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    // Get or create default config
    let config = await storage.getWidgetConfig(shop);

    if (!config) {
      config = getDefaultConfig(shop);
      await storage.storeWidgetConfig(shop, config);
    }

    // Return config without sensitive data
    res.json({
      success: true,
      data: {
        shop: config.shop,
        enabled: config.enabled,
        color: config.color,
        position: config.position,
        greeting: config.greeting,
        features: config.features,
        appearance: config.appearance,
        behavior: config.behavior,
        content: config.content,
        integration: {
          hojai: {
            companyId: config.integration?.hojai?.companyId,
            platformUrl: config.integration?.hojai?.platformUrl
          }
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get widget config', { shop, error: error.message });
    throw error;
  }
}));

/**
 * PUT /api/widget/config/:shop
 * Update widget configuration
 */
router.put('/config/:shop', asyncHandler(async (req, res) => {
  const { shop } = req.params;
  const updates = req.body;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  // Check if shop is authenticated
  const session = await storage.getSession(shop);
  if (!session) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  try {
    // Get existing config or create default
    let config = await storage.getWidgetConfig(shop);
    const isNew = !config;

    if (!config) {
      config = getDefaultConfig(shop);
    }

    // Validate and apply updates
    const allowedFields = [
      'enabled', 'color', 'position', 'greeting',
      'features', 'appearance', 'behavior', 'content'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        // Deep merge for nested objects
        if (typeof updates[field] === 'object' && updates[field] !== null) {
          config[field] = { ...config[field], ...updates[field] };
        } else {
          config[field] = updates[field];
        }
      }
    }

    // Update timestamp
    config.updatedAt = new Date().toISOString();

    // Save config
    await storage.storeWidgetConfig(shop, config);

    // Track configuration change
    await storage.trackEvent('widget/config_updated', {
      shop,
      changes: Object.keys(updates),
      timestamp: config.updatedAt
    });

    logger.info('Widget config updated', { shop, changes: Object.keys(updates) });

    res.json({
      success: true,
      data: config,
      message: isNew ? 'Configuration created' : 'Configuration updated'
    });
  } catch (error) {
    logger.error('Failed to update widget config', { shop, error: error.message });
    throw new AppError('Failed to update configuration', 500, 'CONFIG_UPDATE_FAILED');
  }
}));

/**
 * POST /api/widget/config/:shop/reset
 * Reset widget configuration to defaults
 */
router.post('/config/:shop/reset', asyncHandler(async (req, res) => {
  const { shop } = req.params;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  const session = await storage.getSession(shop);
  if (!session) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  // Reset to default config
  const defaultConfig = getDefaultConfig(shop);
  await storage.storeWidgetConfig(shop, defaultConfig);

  logger.info('Widget config reset to defaults', { shop });

  res.json({
    success: true,
    data: defaultConfig,
    message: 'Configuration reset to defaults'
  });
}));

// ============================================
// PRODUCTS ENDPOINTS
// ============================================

/**
 * GET /api/widget/products/:shop
 * Get products from Shopify store
 */
router.get('/products/:shop', asyncHandler(async (req, res) => {
  const { shop } = req.params;
  const { limit = 50, page = 1, cursor, search, productType, vendor, status } = req.query;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  const session = await storage.getSession(shop);
  if (!session?.accessToken) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  try {
    // Build GraphQL query for products
    const query = `
      query GetProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          edges {
            node {
              id
              title
              description
              descriptionHtml
              productType
              vendor
              tags
              status
              createdAt
              updatedAt
              featuredImage {
                id
                url
                altText
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    price
                    compareAtPrice
                    sku
                    barcode
                    inventoryQuantity
                    image {
                      url
                    }
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    // Build query string for filtering
    let queryString = [];
    if (search) queryString.push(`title:*${search}*`);
    if (productType) queryString.push(`product_type:${productType}`);
    if (vendor) queryString.push(`vendor:${vendor}`);
    if (status) queryString.push(`status:${status}`);

    const variables = {
      first: Math.min(parseInt(limit), 250),
      after: cursor || null,
      query: queryString.join(' AND ') || null
    };

    // Make GraphQL request to Shopify
    const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new AppError('Failed to fetch products from Shopify', 502, 'SHOPIFY_API_ERROR');
    }

    const result = await response.json();

    if (result.errors) {
      logger.error('Shopify GraphQL errors', { shop, errors: result.errors });
      throw new AppError('Shopify API error: ' + result.errors[0].message, 500, 'SHOPIFY_GQL_ERROR');
    }

    const { products } = result.data;

    res.json({
      success: true,
      data: {
        products: products.edges.map(edge => ({
          ...edge.node,
          cursor: edge.cursor
        })),
        pageInfo: products.pageInfo,
        total: products.edges.length
      }
    });
  } catch (error) {
    logger.error('Failed to get products', { shop, error: error.message });
    throw error;
  }
}));

/**
 * GET /api/widget/products/:shop/:productId
 * Get single product details
 */
router.get('/products/:shop/:productId', asyncHandler(async (req, res) => {
  const { shop, productId } = req.params;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  const session = await storage.getSession(shop);
  if (!session?.accessToken) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  try {
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          descriptionHtml
          productType
          vendor
          tags
          status
          createdAt
          updatedAt
          featuredImage {
            id
            url
            altText
          }
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                sku
                barcode
                inventoryQuantity
                weight
                weightUnit
                image {
                  url
                }
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          options {
            id
            name
            values
          }
          collections(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken
      },
      body: JSON.stringify({
        query,
        variables: { id: `gid://shopify/Product/${productId}` }
      })
    });

    const result = await response.json();

    if (result.errors || !result.data?.product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: result.data.product
    });
  } catch (error) {
    logger.error('Failed to get product', { shop, productId, error: error.message });
    throw error;
  }
}));

// ============================================
// ORDERS ENDPOINTS
// ============================================

/**
 * GET /api/widget/orders/:shop
 * Get orders from Shopify store
 */
router.get('/orders/:shop', asyncHandler(async (req, res) => {
  const { shop } = req.params;
  const { limit = 50, page = 1, status, financialStatus, fulfillmentStatus } = req.query;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  const session = await storage.getSession(shop);
  if (!session?.accessToken) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  try {
    const query = `
      query GetOrders($first: Int!, $after: String, $query: String) {
        orders(first: $first, after: $after, query: $query) {
          edges {
            node {
              id
              name
              orderNumber
              email
              createdAt
              updatedAt
              totalPrice {
                amount
                currencyCode
              }
              subtotalPrice {
                amount
                currencyCode
              }
              totalTax {
                amount
                currencyCode
              }
              totalDiscounts {
                amount
                currencyCode
              }
              financialStatus
              fulfillmentStatus
              customer {
                id
                email
                firstName
                lastName
              }
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    originalUnitPrice {
                      amount
                    }
                    variant {
                      id
                      title
                      image {
                        url
                      }
                    }
                  }
                }
              }
              shippingAddress {
                address1
                city
                province
                country
                zip
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    let queryString = [];
    if (status) queryString.push(`status:${status}`);
    if (financialStatus) queryString.push(`financial_status:${financialStatus}`);
    if (fulfillmentStatus) queryString.push(`fulfillment_status:${fulfillmentStatus}`);

    const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken
      },
      body: JSON.stringify({
        query,
        variables: {
          first: Math.min(parseInt(limit), 250),
          query: queryString.join(' AND ') || 'status:any'
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      throw new AppError('Failed to fetch orders', 500, 'SHOPIFY_GQL_ERROR');
    }

    res.json({
      success: true,
      data: {
        orders: result.data.orders.edges.map(e => ({ ...e.node, cursor: e.cursor })),
        pageInfo: result.data.orders.pageInfo
      }
    });
  } catch (error) {
    logger.error('Failed to get orders', { shop, error: error.message });
    throw error;
  }
}));

/**
 * GET /api/widget/orders/:shop/:orderId
 * Get single order details
 */
router.get('/orders/:shop/:orderId', asyncHandler(async (req, res) => {
  const { shop, orderId } = req.params;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  const session = await storage.getSession(shop);
  if (!session?.accessToken) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  try {
    const query = `
      query GetOrder($id: ID!) {
        order(id: $id) {
          id
          name
          orderNumber
          email
          phone
          createdAt
          updatedAt
          totalPrice { amount currencyCode }
          subtotalPrice { amount currencyCode }
          totalTax { amount currencyCode }
          totalDiscounts { amount currencyCode }
          totalReceived { amount currencyCode }
          totalRefunded { amount currencyCode }
          financialStatus
          fulfillmentStatus
          note
          noteAttributes { name value }
          customer {
            id
            email
            firstName
            lastName
            phone
            ordersCount
            totalSpent
          }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                quantityFulfilled
                originalUnitPrice { amount currencyCode }
                discountedUnitPrice { amount currencyCode }
                variant {
                  id
                  title
                  image { url }
                  product { id title }
                }
              }
            }
          }
          shippingAddress {
            firstName lastName address1 address2 city province country zip phone
          }
          billingAddress {
            firstName lastName address1 address2 city province country zip phone
          }
          fulfillments {
            id
            status
            createdAt
            trackingCompany
            trackingNumber
            trackingUrl
          }
          refunds {
            id
            createdAt
            note
            totalRefunded { amount currencyCode }
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken
      },
      body: JSON.stringify({
        query,
        variables: { id: `gid://shopify/Order/${orderId}` }
      })
    });

    const result = await response.json();

    if (result.errors || !result.data?.order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: result.data.order
    });
  } catch (error) {
    logger.error('Failed to get order', { shop, orderId, error: error.message });
    throw error;
  }
}));

// ============================================
// CUSTOMER ENDPOINTS
// ============================================

/**
 * GET /api/widget/customer/:shop
 * Get customer by email
 */
router.get('/customer/:shop', asyncHandler(async (req, res) => {
  const { shop } = req.params;
  const { email, customerId } = req.query;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  const session = await storage.getSession(shop);
  if (!session?.accessToken) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  if (!email && !customerId) {
    throw validationError('Email or customerId is required');
  }

  try {
    let query, variables;

    if (customerId) {
      query = `
        query GetCustomer($id: ID!) {
          customer(id: $id) {
            id
            email
            firstName
            lastName
            phone
            acceptsMarketing
            createdAt
            updatedAt
            ordersCount
            totalSpent
            tags
            note
            addresses {
              id
              firstName lastName address1 city province country zip phone
            }
            defaultAddress {
              id
              firstName lastName address1 city province country zip phone
            }
            orders(first: 5, sortKey: CREATED_AT, reverse: true) {
              edges {
                node {
                  id
                  name
                  createdAt
                  totalPrice { amount currencyCode }
                  financialStatus
                  fulfillmentStatus
                }
              }
            }
          }
        }
      `;
      variables = { id: `gid://shopify/Customer/${customerId}` };
    } else {
      query = `
        query GetCustomerByEmail($email: String!) {
          customers(first: 1, query: $email) {
            edges {
              node {
                id
                email
                firstName
                lastName
                phone
                acceptsMarketing
                createdAt
                ordersCount
                totalSpent
                orders(first: 5, sortKey: CREATED_AT, reverse: true) {
                  edges {
                    node {
                      id
                      name
                      createdAt
                      totalPrice { amount currencyCode }
                      financialStatus
                      fulfillmentStatus
                    }
                  }
                }
              }
            }
          }
        }
      `;
      variables = { email: `email:${email}` };
    }

    const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken
      },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();

    let customer = null;
    if (customerId) {
      customer = result.data?.customer;
    } else {
      customer = result.data?.customers?.edges?.[0]?.node;
    }

    if (!customer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    logger.error('Failed to get customer', { shop, error: error.message });
    throw error;
  }
}));

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

/**
 * GET /api/widget/dashboard/:shop
 * Get dashboard statistics for a shop
 */
router.get('/dashboard/:shop', asyncHandler(async (req, res) => {
  const { shop } = req.params;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  const session = await storage.getSession(shop);
  if (!session?.accessToken) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  try {
    // Get shop info
    const shopQuery = `
      query {
        shop {
          id
          name
          email
          domain
          myshopifyDomain
        }
      }
    `;

    // Get stats
    const statsQuery = `
      query {
        ordersCount: orders(first: 1, query: "created_at:>2024-01-01") {
          edges {
            node {
              id
            }
          }
        }
        productsCount: products(first: 1) {
          edges {
            node { id }
          }
        }
        customersCount: customers(first: 1) {
          edges {
            node { id }
          }
        }
      }
    `;

    const [shopRes, statsRes] = await Promise.all([
      fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken
        },
        body: JSON.stringify({ query: shopQuery })
      }),
      fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken
        },
        body: JSON.stringify({ query: statsQuery })
      })
    ]);

    const shopData = await shopRes.json();
    const statsData = await statsRes.json();

    // Get recent activity from storage
    const recentEvents = await storage.getRecentEvents(shop, 10);

    // Get widget config
    const config = await storage.getWidgetConfig(shop);

    res.json({
      success: true,
      data: {
        shop: shopData.data?.shop,
        widget: {
          enabled: config?.enabled ?? false,
          color: config?.color,
          position: config?.position
        },
        recentActivity: recentEvents,
        installedAt: session.createdAt,
        lastActive: session.lastActiveAt
      }
    });
  } catch (error) {
    logger.error('Failed to get dashboard data', { shop, error: error.message });
    throw error;
  }
}));

// ============================================
// INSTALLATION ENDPOINT
// ============================================

/**
 * GET /api/widget/install/:shop
 * Get widget installation script
 */
router.get('/install/:shop', asyncHandler(async (req, res) => {
  const { shop } = req.params;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  const session = await storage.getSession(shop);
  if (!session?.accessToken) {
    throw new AppError('Shop not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  const config = await storage.getWidgetConfig(shop);

  // Generate installation script
  const installScript = `
<!-- HOJAI SiteOS Widget -->
<!-- Generated: ${new Date().toISOString()} -->
<script>
(function() {
  'use strict';

  // Widget configuration
  window.HOJAI_CONFIG = {
    apiKey: '${config?.apiKey || process.env.HOJAI_API_KEY}',
    companyId: '${shop}',
    widgetUrl: '${process.env.HOJAI_WIDGET_URL || 'https://cdn.hojai.ai/widget.js'}',
    color: '${config?.color || '#3B82F6'}',
    position: '${config?.position || 'bottom-right'}',
    greeting: '${(config?.greeting || 'Hi! How can I help you?').replace(/'/g, "\\'")}',
    features: ${JSON.stringify(config?.features || {})},
    appearance: ${JSON.stringify(config?.appearance || {})},
    behavior: ${JSON.stringify(config?.behavior || {})}
  };

  // Load widget script
  var script = document.createElement('script');
  script.src = window.HOJAI_CONFIG.widgetUrl;
  script.async = true;
  script.dataset.config = JSON.stringify(window.HOJAI_CONFIG);

  script.onload = function() {
    if (window.HojaiWidget && window.HOJAI_CONFIG.apiKey) {
      window.HojaiWidget.init(window.HOJAI_CONFIG);
    }
  };

  script.onerror = function() {
    console.warn('HOJAI Widget failed to load. Check your configuration.');
  };

  document.head.appendChild(script);

  // Preload widget CSS
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = window.HOJAI_CONFIG.widgetUrl.replace('.js', '.css');
  document.head.appendChild(link);
})();
</script>
<!-- End HOJAI SiteOS Widget -->
`.trim();

  res.json({
    success: true,
    data: {
      script: installScript,
      config: {
        apiKey: config?.apiKey ? '***' + config.apiKey.slice(-4) : null,
        companyId: shop,
        color: config?.color,
        position: config?.position,
        enabled: config?.enabled
      }
    }
  });
}));

/**
 * POST /api/widget/preview/:shop
 * Preview widget with custom settings
 */
router.post('/preview/:shop', asyncHandler(async (req, res) => {
  const { shop } = req.params;
  const previewConfig = req.body;

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  // Return preview HTML with custom settings
  const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>HOJAI Widget Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; background: #f6f9fc; }
    .preview-container { max-width: 400px; margin: 0 auto; position: relative; height: 600px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .preview-header { padding: 16px; border-bottom: 1px solid #eee; }
    .preview-header h3 { margin: 0; font-size: 16px; }
    .preview-body { padding: 16px; height: calc(100% - 60px); overflow: auto; }
    .widget-bubble { position: absolute; ${previewConfig.position === 'bottom-left' ? 'left: 20px' : 'right: 20px'}; bottom: 20px; background: ${previewConfig.color || '#3B82F6'}; color: white; padding: 12px 16px; border-radius: ${previewConfig.appearance?.borderRadius || 12}px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 280px; cursor: pointer; }
    .widget-bubble:hover { transform: scale(1.02); }
    .widget-icon { display: inline-block; width: 24px; height: 24px; background: white; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-header">
      <h3>Widget Preview</h3>
    </div>
    <div class="preview-body">
      <p style="color: #666;">Your widget will appear in this position on your store.</p>
    </div>
    <div class="widget-bubble">
      <span class="widget-icon"></span>
      ${previewConfig.greeting || 'Hi! How can I help you?'}
    </div>
  </div>
</body>
</html>
`.trim();

  res.json({
    success: true,
    data: {
      html: previewHtml,
      config: previewConfig
    }
  });
}));

export default router;